/**
 * NeuroSymbolic Agent — GynAI Doctor Chatbot
 *
 * TRUE CQRS + NeuroSymbolic design:
 *  - Gemini is used ONLY as a translator (NL → Cypher) and formatter (data → text)
 *  - ALL facts come exclusively from Neo4j graph traversal — never from LLM training data
 *  - Generic / off-topic queries are rejected before any Cypher is generated
 *  - Zero-result queries return a canned message — Gemini is NOT called to fill in the gap
 *
 * Pipeline:
 *  Phase 0 → Intent gate        (patient-data query vs off-topic — rule-based, fast)
 *  Phase 1 → Cypher generation  (Gemini translates NL → Cypher, produces no medical facts)
 *  Phase 2 → Neo4j execution    (symbolic graph traversal, deterministic)
 *  Phase 3 → Synthesis          (Gemini formats the graph data it was given — nothing else)
 *
 * Optimisations:
 *  - Rate limiter: max 12 Gemini calls/min (free tier is 15 RPM — keeps headroom)
 *  - Token budget: graph results capped at ~4 000 chars before synthesis
 *  - Conversation history: only last 2 exchanges sent to reduce tokens
 *  - Intent gate is fully rule-based — no Gemini call wasted on classification
 */

import { GoogleGenAI } from "@google/genai";
import { getSession } from "../neo4j.js";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Gemini client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }
  return new GoogleGenAI({ apiKey });
}

function cleanResponse(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // ***bold italic***
    .replace(/\*\*(.*?)\*\*/g, '$1')       // **bold**
    .replace(/\*(.*?)\*/g, '$1')           // *italic*
    .replace(/#{1,6}\s+/g, '')             // ## headings
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')) // `code`
    .replace(/^\s*[-•]\s+/gm, '• ')        // normalise bullet points
    .replace(/\n{3,}/g, '\n\n')            // collapse excess blank lines
    .trim();
}

async function callGemini(prompt, retries = 3) {
  await rateLimiter.acquire();
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.1, maxOutputTokens: 1024 },
    });
    return cleanResponse(response.text);
  } catch (err) {
    const msg = err.message || "";
    const isRetryable = msg.includes("429") || msg.includes("503") || msg.includes("UNAVAILABLE");
    if (retries > 0 && isRetryable) {
      const wait = msg.includes("503") ? 8000 : 5000;
      console.log(`⏳ Gemini ${msg.includes("503") ? "503" : "429"} — retrying in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      return callGemini(prompt, retries - 1);
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter — sliding window, max 12 calls/min (Gemini free tier = 15 RPM)
// ─────────────────────────────────────────────────────────────────────────────

const rateLimiter = (() => {
  const MAX_CALLS = 9; // gemini-2.5-flash free tier = 10 RPM, keep headroom
  const WINDOW_MS = 60_000;
  const timestamps = [];

  return {
    async acquire() {
      const now = Date.now();
      // Remove timestamps outside the window
      while (timestamps.length && timestamps[0] <= now - WINDOW_MS) timestamps.shift();

      if (timestamps.length >= MAX_CALLS) {
        // Wait until the oldest call falls out of the window
        const wait = WINDOW_MS - (now - timestamps[0]) + 50;
        console.log(`⏳ Gemini rate limit reached — waiting ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        timestamps.shift();
      }
      timestamps.push(Date.now());
    },
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 — Intent Gate (fully rule-based, zero Gemini calls)
// Short-circuits off-topic queries before any LLM or DB work happens.
// ─────────────────────────────────────────────────────────────────────────────

const OFF_TOPIC_RESPONSE =
  `I can only answer questions about patient records in your database.\n\n` +
  `I cannot answer general medical questions, provide definitions, or offer clinical advice.\n\n` +
  `Examples of what I can answer:\n` +
  `• "Show all patients in their second trimester"\n` +
  `• "Which patients have a family history of thalassemia?"\n` +
  `• "Full report on [Patient Name]"\n` +
  `• "How many patients have gestational diabetes?"\n` +
  `• "List patients with previous C-sections"`;

function classifyIntent(query) {
  const q = query.trim().toLowerCase();

  // Greetings / chit-chat
  if (q.length < 8 || /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|good|great|sure)\b/.test(q)) {
    return "off_topic";
  }

  // Generic medical / educational patterns
  const genericPatterns = [
    /^(what is|what are|how does|how do|why does|why do|explain|define|describe|tell me about|what causes|what happens)\b/,
    /^(give me (a |an )?(tip|advice|recommendation|suggestion|overview|summary))\b/,
    /^(how (should|can|do) (i|doctors?|a doctor) (treat|manage|handle))\b/,
    /^(what (treatment|medication|drug|therapy|procedure|symptom))\b/,
    /^(is it normal|is this normal|should i)\b/,
  ];
  if (genericPatterns.some(re => re.test(q))) return "off_topic";

  // Patient-data keywords → in scope
  const patientKeywords = /\b(patient|patients|trimester|pregnant|pregnancy|gravida|parity|lmp|edd|cousin marriage|family history|thalassemia|diabetes|hypertension|htn|c-section|caesarean|report on|diagnosis|condition|record|history|who|list|show|find|all|count|how many|which|bp|blood pressure|weight|age|antenatal)\b/;
  if (patientKeywords.test(q)) return "patient_query";

  // Default: attempt as patient query (Cypher will return 0 results for nonsense)
  return "patient_query";
}

// ─────────────────────────────────────────────────────────────────────────────
// Neo4j Schema + Few-Shot Examples (injected into Cypher prompt only)
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_CONTEXT = `
GRAPH SCHEMA:
Nodes:
- (:Patient {pgId, name, age, bloodGroup, cousinMarriage, lmp, edd, trimester, bp, weight, height, riskFactors, diagnosis, plan, complaints, edema, pallor})
  trimester: "first"|"second"|"third"|"unknown"   cousinMarriage: true|false
- (:Doctor {pgId, name})
- (:Condition {name})        values: "DM","HTN","Thyroid","PCO","DrugAllergy","ChickenPox"
- (:FamilyHistory {type})    values: "DM","HTN","Cancer","Twins","SpecialChild","Thalassemia"
- (:RiskFactor {name})       free-text
- (:ObstetricRecord {year, term, modeOfDelivery, complications, gender, weight, status})

Relationships:
(:Doctor)-[:MANAGES]->(:Patient)
(:Patient)-[:HAS_CONDITION]->(:Condition)
(:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory)
(:Patient)-[:HAS_RISK]->(:RiskFactor)
(:Patient)-[:HAS_OBSTETRIC_HISTORY]->(:ObstetricRecord)

SCOPING: always scope to doctor first:
  MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient)
fallbackCypher: same query without doctor scope for fresh installs.
`;

const CYPHER_EXAMPLES = `
EXAMPLES:
Q:"second trimester cousin marriage" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient) WHERE p.trimester='second' AND p.cousinMarriage=true RETURN p","fallbackCypher":"MATCH (p:Patient) WHERE p.trimester='second' AND p.cousinMarriage=true RETURN p"}
Q:"family history thalassemia" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory {type:'Thalassemia'}) RETURN p","fallbackCypher":"MATCH (p:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory {type:'Thalassemia'}) RETURN p"}
Q:"full report Ayesha" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient) WHERE toLower(p.name) CONTAINS 'ayesha' OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c) OPTIONAL MATCH (p)-[:HAS_FAMILY_HISTORY]->(fh) OPTIONAL MATCH (p)-[:HAS_OBSTETRIC_HISTORY]->(oh) RETURN p, collect(DISTINCT c) AS conditions, collect(DISTINCT fh) AS familyHistory, collect(DISTINCT oh) AS obstetricHistory","fallbackCypher":"MATCH (p:Patient) WHERE toLower(p.name) CONTAINS 'ayesha' OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c) OPTIONAL MATCH (p)-[:HAS_FAMILY_HISTORY]->(fh) OPTIONAL MATCH (p)-[:HAS_OBSTETRIC_HISTORY]->(oh) RETURN p, collect(DISTINCT c) AS conditions, collect(DISTINCT fh) AS familyHistory, collect(DISTINCT oh) AS obstetricHistory"}
Q:"how many patients have diabetes" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient)-[:HAS_CONDITION]->(:Condition {name:'DM'}) RETURN count(p) AS count","fallbackCypher":"MATCH (p:Patient)-[:HAS_CONDITION]->(:Condition {name:'DM'}) RETURN count(p) AS count"}
Q:"hypertension third trimester" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient)-[:HAS_CONDITION]->(:Condition {name:'HTN'}) WHERE p.trimester='third' RETURN p","fallbackCypher":"MATCH (p:Patient)-[:HAS_CONDITION]->(:Condition {name:'HTN'}) WHERE p.trimester='third' RETURN p"}
Q:"previous c-section" → {"cypher":"MATCH (d:Doctor {pgId:$doctorId})-[:MANAGES]->(p:Patient)-[:HAS_OBSTETRIC_HISTORY]->(oh) WHERE toLower(oh.modeOfDelivery) CONTAINS 'c-section' OR toLower(oh.modeOfDelivery) CONTAINS 'caesarean' OR toLower(oh.modeOfDelivery) CONTAINS 'cs' RETURN DISTINCT p","fallbackCypher":"MATCH (p:Patient)-[:HAS_OBSTETRIC_HISTORY]->(oh) WHERE toLower(oh.modeOfDelivery) CONTAINS 'c-section' OR toLower(oh.modeOfDelivery) CONTAINS 'caesarean' OR toLower(oh.modeOfDelivery) CONTAINS 'cs' RETURN DISTINCT p"}
`;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Cypher Generation (Gemini as translator only, no medical facts here)
// ─────────────────────────────────────────────────────────────────────────────

async function generateCypher(userQuery) {
  // Compact prompt — minimise tokens while keeping accuracy
  const prompt =
    `You are a Neo4j Cypher translator for a maternal health patient-record system.\n` +
    `Convert the question into Cypher. Return ONLY JSON, no markdown.\n\n` +
    `${SCHEMA_CONTEXT}\n${CYPHER_EXAMPLES}\n` +
    `Question: "${userQuery}"\nJSON:`;

  const raw = await callGemini(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid JSON for Cypher generation");

  const parsed = JSON.parse(match[0]);
  return {
    cypher: parsed.cypher,
    fallbackCypher: parsed.fallbackCypher || parsed.cypher,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Symbolic Execution on Neo4j (deterministic, no LLM)
// ─────────────────────────────────────────────────────────────────────────────

function serializeNeo4jResults(records) {
  return records.map(record => {
    const obj = {};
    record.keys.forEach(key => {
      const val = record.get(key);
      if (val && typeof val === "object" && val.properties) {
        obj[key] = val.properties;
      } else if (Array.isArray(val)) {
        obj[key] = val.map(v => (v && typeof v === "object" && v.properties ? v.properties : v));
      } else if (val && typeof val === "object" && val.low !== undefined) {
        obj[key] = val.toNumber ? val.toNumber() : val.low;
      } else {
        obj[key] = val;
      }
    });
    return obj;
  });
}

async function executeCypher(cypher, fallbackCypher, doctorId) {
  const session = getSession();
  try {
    let result = await session.run(cypher, { doctorId: String(doctorId) });
    if (result.records.length === 0 && fallbackCypher && fallbackCypher !== cypher) {
      result = await session.run(fallbackCypher, {});
    }
    return serializeNeo4jResults(result.records);
  } finally {
    await session.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Synthesis (Gemini formats graph data — cannot add to it)
// Only called when graphResults.length > 0.
// Token optimisation: graph data capped at 4 000 chars; history limited to 2 turns.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RESULT_CHARS = 4000;
const MAX_HISTORY_TURNS = 2;

function truncateResults(data) {
  const json = JSON.stringify(data, null, 1);
  if (json.length <= MAX_RESULT_CHARS) return json;
  // Trim to budget and signal truncation
  return json.slice(0, MAX_RESULT_CHARS) + "\n... [results truncated for length]";
}

async function synthesizeResponse(userQuery, graphResults, conversationHistory = []) {
  const history = conversationHistory
    .slice(-(MAX_HISTORY_TURNS * 2))
    .map(m => `${m.role === "user" ? "Doctor" : "AI"}: ${m.content}`)
    .join("\n");

  const prompt =
    `You are GynAI, a read-only patient record display system.\n` +
    `RULES (non-negotiable):\n` +
    `1. Report ONLY what is in the GRAPH DATA below — nothing else.\n` +
    `2. Never add medical knowledge, advice, definitions, or inferred values.\n` +
    `3. Missing fields → say "not recorded". Never guess.\n` +
    `4. Never mention Neo4j, Cypher, or graph database.\n` +
    `5. Use plain text only — no markdown, no asterisks, no bold, no bullet symbols, no headings.\n\n` +
    (history ? `Recent conversation:\n${history}\n\n` : "") +
    `Doctor asked: "${userQuery}"\n\n` +
    `GRAPH DATA (sole source of truth):\n${truncateResults(graphResults)}\n\n` +
    `Format response clinically:\n` +
    `- Lists: name, age, trimester, key conditions\n` +
    `- Single patient: sections (Demographics, Vitals, Medical History, Family History, Obstetric History, Plan)\n` +
    `- Counts: state number, list patients if available\n` +
    `Report:`;

  return await callGemini(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NeuroSymbolic CQRS pipeline — query side only.
 * Gemini = translator + formatter. Neo4j = sole knowledge source.
 */
export async function runNeuroSymbolicAgent(userQuery, doctorId, conversationHistory = []) {
  // Phase 0 — Intent gate (rule-based, no Gemini call)
  if (classifyIntent(userQuery) === "off_topic") {
    console.log("🚫 Off-topic query rejected:", userQuery);
    return { response: OFF_TOPIC_RESPONSE, resultsCount: 0, llmUsed: "gemini", offTopic: true };
  }

  // Phase 1 — Gemini translates NL → Cypher
  const { cypher, fallbackCypher } = await generateCypher(userQuery);
  console.log("🔍 Cypher:", cypher);

  // Phase 2 — Symbolic Neo4j traversal
  const graphResults = await executeCypher(cypher, fallbackCypher, doctorId);
  console.log(`📊 Neo4j: ${graphResults.length} result(s)`);

  // Phase 3a — Zero results: canned response, no Gemini call
  if (graphResults.length === 0) {
    return {
      response: "No patients in your records match that criteria.\n\nTry rephrasing — check condition names (DM, HTN, Thyroid, PCO), use partial patient names, or broaden the filter.",
      resultsCount: 0,
      llmUsed: "gemini",
    };
  }

  // Phase 3b — Gemini formats the graph data
  const response = await synthesizeResponse(userQuery, graphResults, conversationHistory);
  return { response, resultsCount: graphResults.length, llmUsed: "gemini" };
}
