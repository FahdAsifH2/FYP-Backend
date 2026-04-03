/**
 * NeuroSymbolic Agent — GynAI Doctor Chatbot
 *
 * TRUE CQRS + NeuroSymbolic design:
 *  - LLM is ONLY used as a translator (NL → Cypher) and a formatter (data → readable text)
 *  - ALL facts come exclusively from Neo4j graph traversal — never from LLM training data
 *  - Generic / off-topic queries are rejected before any Cypher is generated
 *  - Zero-result queries return a canned message — LLM is NOT called to fill in the gap
 *
 * Pipeline:
 *  Phase 0 → Intent classification (patient-data query vs off-topic)
 *  Phase 1 → Cypher generation (LLM translates NL → Cypher, no data returned here)
 *  Phase 2 → Symbolic execution on Neo4j (graph traversal, zero hallucination possible)
 *  Phase 3 → Synthesis ONLY if results exist (LLM formats data it was given, cannot add to it)
 */

import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "../neo4j.js";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// LLM Abstraction — Ollama primary, Gemini fallback
// ─────────────────────────────────────────────────────────────────────────────

let _ollamaAvailable = null;
let _ollamaLastCheck = 0;
const OLLAMA_CACHE_TTL_MS = 30000; // re-check every 30s instead of caching forever

async function checkOllamaAvailable() {
  const now = Date.now();
  if (_ollamaAvailable !== null && (now - _ollamaLastCheck) < OLLAMA_CACHE_TTL_MS) {
    return _ollamaAvailable;
  }
  try {
    const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    await axios.get(`${base}/api/tags`, { timeout: 3000 });
    _ollamaAvailable = true;
    _ollamaLastCheck = now;
    console.log("🦙 Ollama detected");
  } catch {
    _ollamaAvailable = false;
    _ollamaLastCheck = now;
    console.log("⚠️  Ollama not reachable at", process.env.OLLAMA_BASE_URL || "http://localhost:11434");
  }
  return _ollamaAvailable;
}

async function callOllama(prompt) {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";
  const response = await axios.post(
    `${base}/api/generate`,
    { model, prompt, stream: false },
    { timeout: 60000 }
  );
  return response.data.response;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in .env");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callLLM(prompt) {
  const useOllama = await checkOllamaAvailable();
  if (!useOllama) {
    throw new Error("Ollama is not reachable. Make sure Ollama is running on this machine (ollama serve).");
  }
  return await callOllama(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 — Intent Gate
// Classifies whether the query is asking about patient records.
// If not, we short-circuit immediately — no Cypher generated, no LLM synthesis.
// ─────────────────────────────────────────────────────────────────────────────

const OFF_TOPIC_RESPONSE = `I can only answer questions about patient records in your database.

I cannot answer general medical questions, provide definitions, or offer clinical advice.

Here are questions I can answer:
• "Show all patients in their second trimester"
• "Which patients have a family history of thalassemia?"
• "Full report on [Patient Name]"
• "How many patients have gestational diabetes?"
• "List patients with previous C-sections"`;

async function classifyIntent(query) {
  // Fast rule-based pass first — avoids an LLM round-trip for obvious cases
  const trimmed = query.trim().toLowerCase();

  // Short greetings / chit-chat
  if (trimmed.length < 8 || /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye)/.test(trimmed)) {
    return "off_topic";
  }

  // Clearly generic medical / educational patterns (no patient-data intent)
  const genericPatterns = [
    /^(what is|what are|how does|how do|why does|why do|explain|define|describe|tell me about|can you explain|what causes|what happens)/i,
    /^(give me (a |an )?(tip|advice|recommendation|suggestion|overview|summary of the condition))/i,
    /^(how (should|can|do) (i|doctors|a doctor) treat)/i,
    /^(what (treatment|medication|drug|therapy|procedure))/i,
  ];
  if (genericPatterns.some((re) => re.test(trimmed))) {
    return "off_topic";
  }

  // Contains patient-data keywords → definitely in scope
  const patientKeywords = /\b(patient|patients|trimester|pregnant|pregnancy|gravida|parity|lmp|edd|cousin marriage|family history|thalassemia|diabetes|hypertension|htn|c-section|caesarean|report on|diagnosis|condition|record|history|who|list|show|find|all|count|how many|which)\b/i;
  if (patientKeywords.test(trimmed)) {
    return "patient_query";
  }

  // Ambiguous — ask the LLM to classify with a tight prompt
  const prompt = `You are a query classifier for a medical patient-record database chatbot.

Classify the query below as either:
- "patient_query": asking about specific patients, their records, conditions, history, statistics, or reports from a patient database
- "off_topic": asking general medical questions, definitions, treatments, or anything not about retrieving patient records

Query: "${query}"

Respond with ONLY valid JSON, no other text: {"intent": "patient_query"} or {"intent": "off_topic"}`;

  try {
    const raw = await callLLM(prompt);
    const match = raw.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.intent === "off_topic" || parsed.intent === "patient_query") {
        return parsed.intent;
      }
    }
  } catch (err) {
    console.warn("Intent classification failed, defaulting to patient_query:", err.message);
  }

  // Fail open — treat as patient query; Cypher will return 0 results for nonsense
  return "patient_query";
}

// ─────────────────────────────────────────────────────────────────────────────
// Neo4j Schema Context (injected into Cypher-generation prompt only)
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_CONTEXT = `
NEO4J GRAPH SCHEMA:

NODE TYPES:
- (:Patient {pgId, name, age, bloodGroup, cousinMarriage, lmp, edd, trimester, bp, weight, height, riskFactors, diagnosis, plan, complaints, edema, pallor})
  trimester values: "first" | "second" | "third" | "unknown"
  cousinMarriage: true | false
- (:Doctor {pgId, name})
- (:Condition {name})  — possible values: "DM", "HTN", "Thyroid", "PCO", "DrugAllergy", "ChickenPox"
- (:FamilyHistory {type}) — possible values: "DM", "HTN", "Cancer", "Twins", "SpecialChild", "Thalassemia"
- (:RiskFactor {name})   — free-text risk factor strings
- (:ObstetricRecord {year, term, modeOfDelivery, complications, gender, weight, status})

RELATIONSHIPS:
- (:Doctor)-[:MANAGES]->(:Patient)
- (:Patient)-[:HAS_CONDITION]->(:Condition)
- (:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory)
- (:Patient)-[:HAS_RISK]->(:RiskFactor)
- (:Patient)-[:HAS_OBSTETRIC_HISTORY]->(:ObstetricRecord)

SCOPING RULE:
Always scope queries to the requesting doctor using:
  MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient)
If no Doctor node exists yet (fresh install), query patients without doctor scoping:
  MATCH (p:Patient)
`;

const CYPHER_EXAMPLES = `
EXAMPLES (natural language → Cypher):

Q: "all patients in second trimester with cousin marriage"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient) WHERE p.trimester = 'second' AND p.cousinMarriage = true RETURN p","fallbackCypher":"MATCH (p:Patient) WHERE p.trimester = 'second' AND p.cousinMarriage = true RETURN p"}

Q: "patients with family history of thalassemia"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory {type: 'Thalassemia'}) RETURN p","fallbackCypher":"MATCH (p:Patient)-[:HAS_FAMILY_HISTORY]->(:FamilyHistory {type: 'Thalassemia'}) RETURN p"}

Q: "full report on Ayesha Khan"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient) WHERE toLower(p.name) CONTAINS toLower('Ayesha Khan') OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Condition) OPTIONAL MATCH (p)-[:HAS_FAMILY_HISTORY]->(fh:FamilyHistory) OPTIONAL MATCH (p)-[:HAS_OBSTETRIC_HISTORY]->(oh:ObstetricRecord) RETURN p, collect(DISTINCT c) as conditions, collect(DISTINCT fh) as familyHistory, collect(DISTINCT oh) as obstetricHistory","fallbackCypher":"MATCH (p:Patient) WHERE toLower(p.name) CONTAINS toLower('Ayesha Khan') OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Condition) OPTIONAL MATCH (p)-[:HAS_FAMILY_HISTORY]->(fh:FamilyHistory) OPTIONAL MATCH (p)-[:HAS_OBSTETRIC_HISTORY]->(oh:ObstetricRecord) RETURN p, collect(DISTINCT c) as conditions, collect(DISTINCT fh) as familyHistory, collect(DISTINCT oh) as obstetricHistory"}

Q: "how many patients have diabetes"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient)-[:HAS_CONDITION]->(:Condition {name: 'DM'}) RETURN count(p) as count","fallbackCypher":"MATCH (p:Patient)-[:HAS_CONDITION]->(:Condition {name: 'DM'}) RETURN count(p) as count"}

Q: "list all high risk patients with hypertension in third trimester"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient)-[:HAS_CONDITION]->(:Condition {name: 'HTN'}) WHERE p.trimester = 'third' RETURN p","fallbackCypher":"MATCH (p:Patient)-[:HAS_CONDITION]->(:Condition {name: 'HTN'}) WHERE p.trimester = 'third' RETURN p"}

Q: "patients with previous c-section"
A: {"cypher":"MATCH (d:Doctor {pgId: $doctorId})-[:MANAGES]->(p:Patient)-[:HAS_OBSTETRIC_HISTORY]->(oh:ObstetricRecord) WHERE toLower(oh.modeOfDelivery) CONTAINS 'c-section' OR toLower(oh.modeOfDelivery) CONTAINS 'caesarean' OR toLower(oh.modeOfDelivery) CONTAINS 'cs' RETURN DISTINCT p","fallbackCypher":"MATCH (p:Patient)-[:HAS_OBSTETRIC_HISTORY]->(oh:ObstetricRecord) WHERE toLower(oh.modeOfDelivery) CONTAINS 'c-section' OR toLower(oh.modeOfDelivery) CONTAINS 'caesarean' OR toLower(oh.modeOfDelivery) CONTAINS 'cs' RETURN DISTINCT p"}
`;

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Cypher Generation
// LLM role here: TRANSLATOR only. It maps natural language to a graph query.
// It does not produce any medical facts at this stage.
// ─────────────────────────────────────────────────────────────────────────────

async function generateCypher(userQuery, doctorId) {
  const prompt = `You are a Neo4j Cypher query translator for GynAI, a maternal health patient-record system.
Your ONLY task is to convert the doctor's question into a valid Cypher query against the schema below.
You do NOT answer the question — you produce a query that will retrieve the answer from the database.

${SCHEMA_CONTEXT}

${CYPHER_EXAMPLES}

INSTRUCTIONS:
- Return ONLY valid JSON. No markdown fences, no explanation text outside JSON.
- Always include both "cypher" (doctor-scoped with $doctorId parameter) and "fallbackCypher" (unscoped) fields.
- For name lookups, use toLower() CONTAINS for fuzzy matching.
- Dates are stored as strings (lmp, edd).

Doctor's question: "${userQuery}"

JSON response:`;

  const raw = await callLLM(prompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON for Cypher generation");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    cypher: parsed.cypher,
    fallbackCypher: parsed.fallbackCypher || parsed.cypher,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Symbolic Execution on Neo4j
// Pure graph traversal — deterministic, no LLM involved.
// ─────────────────────────────────────────────────────────────────────────────

function serializeNeo4jResults(records) {
  return records.map((record) => {
    const obj = {};
    record.keys.forEach((key) => {
      const val = record.get(key);
      if (val && typeof val === "object" && val.properties) {
        obj[key] = val.properties;
      } else if (Array.isArray(val)) {
        obj[key] = val.map((v) =>
          v && typeof v === "object" && v.properties ? v.properties : v
        );
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
// PHASE 3 — Synthesis (ONLY called when graphResults.length > 0)
// LLM role here: FORMATTER only. It receives the raw graph data and presents it.
// The prompt explicitly forbids adding any information not in the results.
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeResponse(userQuery, graphResults, conversationHistory = []) {
  const historyText = conversationHistory.length
    ? `\nPREVIOUS CONVERSATION (for context only — do not use to answer the current question):\n${conversationHistory
        .slice(-4)
        .map((m) => `${m.role === "user" ? "Doctor" : "Assistant"}: ${m.content}`)
        .join("\n")}\n`
    : "";

  const prompt = `You are GynAI, a read-only patient record retrieval system for obstetricians.

CRITICAL RULES — you must follow all of these without exception:
1. You may ONLY report information that is explicitly present in the GRAPH DATA section below.
2. You must NEVER add medical knowledge, clinical advice, definitions, or explanations from your training data.
3. You must NEVER infer, assume, or supplement any data that is not in the results.
4. You must NEVER answer general medical questions — your only function is presenting patient records.
5. If a field is null or missing in the data, say "not recorded" — do not guess or fill in typical values.
6. Do NOT mention "graph database", "Neo4j", "Cypher", or any technical implementation detail.

Doctor's question: "${userQuery}"
${historyText}
GRAPH DATA (this is the only source of truth — report only what is here):
${JSON.stringify(graphResults, null, 2)}

Format the above data into a clear, clinically organized response:
- For patient lists: show name, age, trimester, and key conditions found in the data.
- For single patient reports: organize into sections (Demographics, Vitals, Medical History, Family History, Obstetric History, Plan) using only fields present in the data.
- For count queries: state the number and list the patients if available in the data.

Response (data only — no additions, no clinical commentary beyond what the data shows):`;

  return await callLLM(prompt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full NeuroSymbolic CQRS pipeline for a doctor's query.
 *
 * Query side only — reads from Neo4j graph, never writes.
 * LLM is used as a translator and formatter, never as a knowledge source.
 *
 * @param {string} userQuery - Natural language question from the doctor
 * @param {string|number} doctorId - Authenticated doctor's user ID (from JWT)
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @returns {object} { response, resultsCount, llmUsed }
 */
export async function runNeuroSymbolicAgent(userQuery, doctorId, conversationHistory = []) {
  const llmUsed = (await checkOllamaAvailable()) ? "ollama" : "gemini";

  // ── Phase 0: Intent gate — reject off-topic queries immediately ──────────
  const intent = await classifyIntent(userQuery);
  if (intent === "off_topic") {
    console.log("🚫 Off-topic query rejected:", userQuery);
    return {
      response: OFF_TOPIC_RESPONSE,
      resultsCount: 0,
      llmUsed,
      offTopic: true,
    };
  }

  // ── Phase 1: LLM translates NL → Cypher (no data produced here) ─────────
  const { cypher, fallbackCypher } = await generateCypher(userQuery, doctorId);
  console.log("🔍 Generated Cypher:", cypher);

  // ── Phase 2: Symbolic graph traversal on Neo4j ───────────────────────────
  const graphResults = await executeCypher(cypher, fallbackCypher, doctorId);
  console.log(`📊 Neo4j returned ${graphResults.length} result(s)`);

  // ── Phase 3: Zero results → canned response (no LLM call) ────────────────
  if (graphResults.length === 0) {
    return {
      response: "No patients in your records match that criteria.\n\nTry rephrasing — for example, use partial names, check condition spellings (DM, HTN, Thyroid, PCO), or broaden the trimester filter.",
      resultsCount: 0,
      llmUsed,
    };
  }

  // ── Phase 3: Results exist → LLM formats the graph data only ────────────
  const response = await synthesizeResponse(userQuery, graphResults, conversationHistory);

  return {
    response,
    resultsCount: graphResults.length,
    llmUsed,
  };
}
