/**
 * Neo4j Sync Service — CQRS Command Side
 * Syncs patient data from PostgreSQL antenatal cards into the Neo4j graph.
 *
 * Called after every successful SubmitAntenatalform write.
 */
import { getSession } from "../neo4j.js";

/**
 * Calculate trimester from LMP date string.
 * @param {string} lmpStr - LMP date as string (e.g. "2025-11-01" or "01/11/2025")
 * @returns {"first"|"second"|"third"|"unknown"}
 */
function calculateTrimester(lmpStr) {
  if (!lmpStr) return "unknown";
  try {
    // Handle both ISO (YYYY-MM-DD) and slash formats (DD/MM/YYYY)
    let lmpDate;
    if (lmpStr.includes("/")) {
      const [d, m, y] = lmpStr.split("/");
      lmpDate = new Date(`${y}-${m}-${d}`);
    } else {
      lmpDate = new Date(lmpStr);
    }
    if (isNaN(lmpDate.getTime())) return "unknown";
    const weeks = (Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
    if (weeks < 13) return "first";
    if (weeks <= 26) return "second";
    return "third";
  } catch {
    return "unknown";
  }
}

/**
 * Build list of Condition node names from the card's medical history booleans.
 */
function extractConditions(card) {
  const conditions = [];
  if (card.medical_dm) conditions.push("DM");
  if (card.medical_htn) conditions.push("HTN");
  if (card.medical_thyroid) conditions.push("Thyroid");
  if (card.pco) conditions.push("PCO");
  if (card.drug_allergy) conditions.push("DrugAllergy");
  if (card.chicken_pox) conditions.push("ChickenPox");
  return conditions;
}

/**
 * Build list of FamilyHistory node types from the card's family history booleans.
 */
function extractFamilyHistory(card) {
  const history = [];
  if (card.family_dm) history.push("DM");
  if (card.family_htn) history.push("HTN");
  if (card.family_cancer) history.push("Cancer");
  if (card.family_twins) history.push("Twins");
  if (card.family_special_child) history.push("SpecialChild");
  if (card.family_thalassemia) history.push("Thalassemia");
  return history;
}

/**
 * Parse free-text risk factors into an array of strings.
 */
function extractRiskFactors(riskFactorsText) {
  if (!riskFactorsText) return [];
  return riskFactorsText
    .split(/[,;\/\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/**
 * Upsert a patient and all their associated nodes/relationships into Neo4j.
 *
 * @param {object} card - Row from antenatal_cards (flat PostgreSQL row)
 * @param {Array}  obstetricHistory - Rows from obstetric_history for this card
 * @param {number|null} doctorId - Authenticated doctor's user ID (optional)
 * @param {string|null} doctorName - Doctor's name (optional)
 */
export async function syncPatientToNeo4j(card, obstetricHistory = [], doctorId = null, doctorName = null) {
  const session = getSession();
  try {
    const trimester = calculateTrimester(card.lmp);
    const conditions = extractConditions(card);
    const familyHistory = extractFamilyHistory(card);
    const riskFactors = extractRiskFactors(card.risk_factors);

    // 1. MERGE Patient node
    await session.run(
      `MERGE (p:Patient {pgId: $pgId})
       SET p.name           = $name,
           p.age            = $age,
           p.bloodGroup     = $bloodGroup,
           p.cousinMarriage = $cousinMarriage,
           p.lmp            = $lmp,
           p.edd            = $edd,
           p.trimester      = $trimester,
           p.bp             = $bp,
           p.weight         = $weight,
           p.height         = $height,
           p.riskFactors    = $riskFactors,
           p.diagnosis      = $diagnosis,
           p.plan           = $plan,
           p.complaints     = $complaints,
           p.edema          = $edema,
           p.pallor         = $pallor,
           p.updatedAt      = datetime()`,
      {
        pgId: String(card.id),
        name: card.patient_name || "Unknown",
        age: card.age ? Number(card.age) : null,
        bloodGroup: card.blood_group || null,
        cousinMarriage: card.cousin_marriage === true,
        lmp: card.lmp || null,
        edd: card.edd || null,
        trimester,
        bp: card.bp || null,
        weight: card.weight || null,
        height: card.height || null,
        riskFactors: card.risk_factors || null,
        diagnosis: card.diagnosis || null,
        plan: card.plan || null,
        complaints: card.complaints || null,
        edema: card.edema || null,
        pallor: card.pallor || null,
      }
    );

    // 2. MERGE Doctor node + MANAGES relationship (if doctor provided)
    if (doctorId) {
      await session.run(
        `MERGE (d:Doctor {pgId: $doctorId})
         SET d.name = $doctorName
         WITH d
         MATCH (p:Patient {pgId: $pgId})
         MERGE (d)-[:MANAGES]->(p)`,
        {
          doctorId: String(doctorId),
          doctorName: doctorName || "Unknown Doctor",
          pgId: String(card.id),
        }
      );
    }

    // 3. Condition nodes
    for (const condName of conditions) {
      await session.run(
        `MATCH (p:Patient {pgId: $pgId})
         MERGE (c:Condition {name: $name})
         MERGE (p)-[:HAS_CONDITION]->(c)`,
        { pgId: String(card.id), name: condName }
      );
    }

    // 4. Family history nodes
    for (const histType of familyHistory) {
      await session.run(
        `MATCH (p:Patient {pgId: $pgId})
         MERGE (fh:FamilyHistory {type: $type})
         MERGE (p)-[:HAS_FAMILY_HISTORY]->(fh)`,
        { pgId: String(card.id), type: histType }
      );
    }

    // 5. Risk factor nodes
    for (const rf of riskFactors) {
      await session.run(
        `MATCH (p:Patient {pgId: $pgId})
         MERGE (r:RiskFactor {name: $name})
         MERGE (p)-[:HAS_RISK]->(r)`,
        { pgId: String(card.id), name: rf }
      );
    }

    // 6. Obstetric history nodes (delete + re-create to keep in sync)
    await session.run(
      `MATCH (p:Patient {pgId: $pgId})-[r:HAS_OBSTETRIC_HISTORY]->(oh:ObstetricRecord)
       DELETE r, oh`,
      { pgId: String(card.id) }
    );

    for (const obs of obstetricHistory) {
      await session.run(
        `MATCH (p:Patient {pgId: $pgId})
         CREATE (oh:ObstetricRecord {
           year:           $year,
           term:           $term,
           modeOfDelivery: $mod,
           complications:  $complications,
           gender:         $gender,
           weight:         $weight,
           status:         $status
         })
         CREATE (p)-[:HAS_OBSTETRIC_HISTORY]->(oh)`,
        {
          pgId: String(card.id),
          year: obs.years ? Number(obs.years) : null,
          term: obs.term ? Number(obs.term) : null,
          mod: obs.mod || null,
          complications: obs.complications || null,
          gender: obs.gender || null,
          weight: obs.weight ? Number(obs.weight) : null,
          status: obs.status || null,
        }
      );
    }

    console.log(`✅ Neo4j synced patient: ${card.patient_name} (pgId: ${card.id})`);
  } catch (err) {
    // Non-fatal: log but don't crash the HTTP request
    console.error(`⚠️  Neo4j sync failed for patient ${card.id}:`, err.message);
  } finally {
    await session.close();
  }
}
