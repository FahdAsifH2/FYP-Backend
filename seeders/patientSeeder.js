/**
 * Patient Seeder — Normalized Schema
 *
 * Writes to: antenatal_card_patientinfo, medical_information, family_history,
 *            medical_history, gynae_history, vitals, obstetric_history
 *
 * Also syncs ALL existing patients (A001-A020) + new patients (A021-A032) to Neo4j.
 *
 * Usage: node seeders/patientSeeder.js
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { syncPatientToNeo4j } from "../services/neo4jSyncService.js";
import { testNeo4jConnection, closeNeo4jDriver } from "../neo4j.js";

dotenv.config();
const sql = neon(process.env.DATABASE_URL);

// ─────────────────────────────────────────────
// Seed data — 12 new patients (A021 – A032)
// Trimester guide (relative to 2026-04-03):
//   1st: LMP 6–12 weeks ago  → 2026-01-09 – 2026-02-20
//   2nd: LMP 14–25 weeks ago → 2025-10-20 – 2026-01-02
//   3rd: LMP 27–38 weeks ago → 2025-07-04 – 2025-09-25
// ─────────────────────────────────────────────
const NEW_PATIENTS = [
  // ── 1ST TRIMESTER ─────────────────────────────────────────────────
  {
    id: "A021",
    name: "Fatima Malik",
    dob: "2000-03-15",
    cousinMarriage: true,
    bloodGroup: "B+",
    formDate: "2026-02-07",
    // medical_information
    lmp: "2026-02-06", edd: "2026-11-13",
    complaints: "Morning sickness, fatigue",
    riskFactors: "Cousin marriage, family hypertension",
    medications: null, surgicalHistory: null,
    diagnosis: "G1P0 — 8 weeks gestation",
    plan: "Booking bloods, NT scan at 12 weeks",
    // vitals
    height: "157cm", weight: "62kg", bp: "120/80",
    pallor: "None", thyroidNormal: true, edema: "Absent",
    // family_history
    famDm: false, famHtn: true, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    // medical_history
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    // gynae_history
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    // obstetric
    obstetric: [],
  },
  {
    id: "A022",
    name: "Zara Ahmed",
    dob: "1997-07-20",
    cousinMarriage: false,
    bloodGroup: "A+",
    formDate: "2026-01-31",
    lmp: "2026-01-30", edd: "2026-11-06",
    complaints: "Nausea, breast tenderness",
    riskFactors: "Family diabetes, thalassemia carrier",
    medications: null, surgicalHistory: null,
    diagnosis: "G2P1 — 9 weeks gestation",
    plan: "CBC, HbA1c, thalassemia screen",
    height: "162cm", weight: "70kg", bp: "118/76",
    pallor: "None", thyroidNormal: true, edema: "Absent",
    famDm: true, famHtn: false, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: true,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [{ years: 2023, term: 38, mod: "SVD", complications: "None", gender: "F", weight: 2900, status: "Alive" }],
  },
  {
    id: "A023",
    name: "Sana Qureshi",
    dob: "1994-11-03",
    cousinMarriage: false,
    bloodGroup: "O-",
    formDate: "2026-02-14",
    lmp: "2026-02-13", edd: "2026-11-20",
    complaints: "Ankle swelling, headaches",
    riskFactors: "Previous C-section, chronic hypertension",
    medications: "Labetalol 100mg", surgicalHistory: "2x lower segment C-section",
    diagnosis: "G3P2 — 7 weeks gestation, chronic HTN",
    plan: "Monitor BP daily, anti-hypertensive review",
    height: "155cm", weight: "78kg", bp: "145/95",
    pallor: "Mild", thyroidNormal: true, edema: "Present",
    famDm: false, famHtn: true, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: true,
    medHtn: true, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: true, contraception: false,
    obstetric: [
      { years: 2019, term: 37, mod: "C-Section", complications: "Placenta previa", gender: "M", weight: 3100, status: "Alive" },
      { years: 2022, term: 39, mod: "C-Section", complications: "None", gender: "F", weight: 3400, status: "Alive" },
    ],
  },
  {
    id: "A024",
    name: "Nadia Iqbal",
    dob: "2002-01-10",
    cousinMarriage: false,
    bloodGroup: "AB+",
    formDate: "2026-02-21",
    lmp: "2026-02-20", edd: "2026-11-27",
    complaints: "PCOS history, difficulty conceiving",
    riskFactors: "PCOS, irregular cycles, IVF conception",
    medications: "Progesterone 400mg", surgicalHistory: null,
    diagnosis: "G1P0 — 6 weeks gestation (IVF)",
    plan: "Early viability scan, progesterone support, close monitoring",
    height: "160cm", weight: "75kg", bp: "110/70",
    pallor: "None", thyroidNormal: true, edema: "Absent",
    famDm: false, famHtn: false, famCancer: false,
    famTwins: true, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: false, irregular: true, pco: true,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [],
  },
  // ── 2ND TRIMESTER ─────────────────────────────────────────────────
  {
    id: "A025",
    name: "Ayesha Tariq",
    dob: "1998-04-22",
    cousinMarriage: true,
    bloodGroup: "B-",
    formDate: "2025-12-01",
    lmp: "2025-11-27", edd: "2026-09-03",
    complaints: "Gestational diabetes, excessive thirst, polyuria",
    riskFactors: "Cousin marriage, GDM, thalassemia family history",
    medications: "Metformin 500mg", surgicalHistory: null,
    diagnosis: "G2P1 — 18 weeks gestation, GDM",
    plan: "Dietitian referral, GDM monitoring, thalassemia screen for both parents",
    height: "158cm", weight: "80kg", bp: "125/82",
    pallor: "None", thyroidNormal: true, edema: "Mild",
    famDm: true, famHtn: false, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: true,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: true, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [{ years: 2022, term: 40, mod: "SVD", complications: "None", gender: "M", weight: 3500, status: "Alive" }],
  },
  {
    id: "A026",
    name: "Maria Hussain",
    dob: "1992-09-14",
    cousinMarriage: false,
    bloodGroup: "A-",
    formDate: "2025-12-05",
    lmp: "2025-12-04", edd: "2026-09-10",
    complaints: "Mild hypertension, back pain, advanced maternal age",
    riskFactors: "Advanced maternal age, family cancer, PIH risk",
    medications: "Aspirin 75mg", surgicalHistory: null,
    diagnosis: "G1P0 — 17 weeks gestation",
    plan: "Anomaly scan, BP monitoring, aspirin prophylaxis, AMA counselling",
    height: "165cm", weight: "72kg", bp: "140/90",
    pallor: "None", thyroidNormal: true, edema: "Absent",
    famDm: false, famHtn: true, famCancer: true,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: true, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: true, contraception: false,
    obstetric: [],
  },
  {
    id: "A027",
    name: "Rabia Butt",
    dob: "1999-02-18",
    cousinMarriage: true,
    bloodGroup: "O+",
    formDate: "2025-12-12",
    lmp: "2025-12-11", edd: "2026-09-17",
    complaints: "Fatigue, hair loss, weight gain, hypothyroidism",
    riskFactors: "Cousin marriage, hypothyroidism, family DM",
    medications: "Levothyroxine 75mcg", surgicalHistory: null,
    diagnosis: "G3P2 — 16 weeks, hypothyroidism",
    plan: "TFTs monthly, levothyroxine dose review, GDM screen at 24 weeks",
    height: "156cm", weight: "85kg", bp: "115/75",
    pallor: "None", thyroidNormal: false, edema: "Absent",
    famDm: true, famHtn: false, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: true, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [
      { years: 2020, term: 38, mod: "SVD", complications: "None", gender: "M", weight: 3200, status: "Alive" },
      { years: 2023, term: 37, mod: "SVD", complications: "PPH", gender: "F", weight: 2800, status: "Alive" },
    ],
  },
  {
    id: "A028",
    name: "Amna Shahid",
    dob: "1995-06-30",
    cousinMarriage: false,
    bloodGroup: "B+",
    formDate: "2025-11-21",
    lmp: "2025-11-20", edd: "2026-08-27",
    complaints: "Symphysis pubis pain, insomnia, grand multipara",
    riskFactors: "Grand multipara, family hypertension",
    medications: "Iron supplements", surgicalHistory: "1x C-section (2019)",
    diagnosis: "G4P3 — 19 weeks gestation",
    plan: "Physiotherapy referral, iron supplements, plan for delivery mode",
    height: "163cm", weight: "77kg", bp: "130/85",
    pallor: "Mild", thyroidNormal: true, edema: "Absent",
    famDm: false, famHtn: true, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: true, contraception: false,
    obstetric: [
      { years: 2017, term: 39, mod: "SVD", complications: "None", gender: "M", weight: 3600, status: "Alive" },
      { years: 2019, term: 38, mod: "C-Section", complications: "Foetal distress", gender: "M", weight: 3300, status: "Alive" },
      { years: 2022, term: 40, mod: "VBAC", complications: "None", gender: "F", weight: 3700, status: "Alive" },
    ],
  },
  // ── 3RD TRIMESTER ─────────────────────────────────────────────────
  {
    id: "A029",
    name: "Hina Baig",
    dob: "1996-12-05",
    cousinMarriage: false,
    bloodGroup: "A+",
    formDate: "2025-09-19",
    lmp: "2025-09-18", edd: "2026-06-25",
    complaints: "Reduced foetal movements, anxiety",
    riskFactors: "Family history of special child, drug allergy",
    medications: "Folic acid", surgicalHistory: null,
    diagnosis: "G2P1 — 28 weeks gestation",
    plan: "CTG monitoring, 28-week scan done, growth scan at 34 weeks",
    height: "159cm", weight: "82kg", bp: "122/78",
    pallor: "None", thyroidNormal: true, edema: "Absent",
    famDm: false, famHtn: false, famCancer: false,
    famTwins: false, famSpecialChild: true, famThalassemia: false,
    drugAllergy: true, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [{ years: 2021, term: 41, mod: "SVD", complications: "None", gender: "M", weight: 3800, status: "Alive" }],
  },
  {
    id: "A030",
    name: "Saima Riaz",
    dob: "1991-03-18",
    cousinMarriage: false,
    bloodGroup: "O+",
    formDate: "2025-08-29",
    lmp: "2025-08-28", edd: "2026-06-04",
    complaints: "Oedema, hypertension, polyuria, pre-eclampsia risk",
    riskFactors: "Advanced maternal age, GDM, HTN, family twin history",
    medications: "Metformin, Labetalol, Aspirin", surgicalHistory: "2x C-section",
    diagnosis: "G3P2 — 31 weeks gestation, pre-eclampsia risk",
    plan: "Strict BP monitoring twice daily, anti-hypertensives, HDU review if BP rises",
    height: "161cm", weight: "90kg", bp: "155/100",
    pallor: "None", thyroidNormal: true, edema: "Severe",
    famDm: true, famHtn: true, famCancer: false,
    famTwins: true, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: true, medDm: true, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [
      { years: 2016, term: 36, mod: "C-Section", complications: "Pre-eclampsia", gender: "F", weight: 2500, status: "Alive" },
      { years: 2019, term: 38, mod: "C-Section", complications: "None", gender: "M", weight: 3000, status: "Alive" },
    ],
  },
  {
    id: "A031",
    name: "Uzma Farooq",
    dob: "2004-08-14",
    cousinMarriage: false,
    bloodGroup: "B+",
    formDate: "2025-09-12",
    lmp: "2025-09-11", edd: "2026-06-18",
    complaints: "Anaemia, breathlessness, pallor",
    riskFactors: "Thalassemia family history, iron deficiency anaemia",
    medications: "Iron infusion", surgicalHistory: null,
    diagnosis: "G1P0 — 29 weeks gestation, severe anaemia",
    plan: "Iron infusion, 34-week growth scan, thalassemia counselling for couple",
    height: "153cm", weight: "55kg", bp: "105/68",
    pallor: "Severe", thyroidNormal: true, edema: "Absent",
    famDm: false, famHtn: false, famCancer: false,
    famTwins: false, famSpecialChild: false, famThalassemia: true,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: false, contraception: false,
    obstetric: [],
  },
  {
    id: "A032",
    name: "Bushra Malik",
    dob: "1988-01-22",
    cousinMarriage: true,
    bloodGroup: "AB-",
    formDate: "2025-07-18",
    lmp: "2025-07-17", edd: "2026-04-23",
    complaints: "Pelvic pressure, varicose veins, fatigue, near-term",
    riskFactors: "Advanced maternal age, 2 previous C-sections, family cancer, cousin marriage",
    medications: "Iron, Calcium, low-dose aspirin", surgicalHistory: "2x lower segment C-section",
    diagnosis: "G5P4 — 37 weeks gestation, high risk",
    plan: "Elective C-section planning, pre-op bloods, anaesthesia review, neonatology standby",
    height: "154cm", weight: "88kg", bp: "135/88",
    pallor: "Mild", thyroidNormal: true, edema: "Present",
    famDm: false, famHtn: false, famCancer: true,
    famTwins: false, famSpecialChild: false, famThalassemia: false,
    drugAllergy: false, chickenPox: false,
    medHtn: false, medDm: false, medThyroid: false, medOthers: false,
    regular: true, irregular: false, pco: false,
    hirsutism: false, papSmear: true, contraception: false,
    obstetric: [
      { years: 2010, term: 40, mod: "SVD", complications: "None", gender: "M", weight: 3500, status: "Alive" },
      { years: 2013, term: 38, mod: "C-Section", complications: "Placenta accreta", gender: "F", weight: 2900, status: "Alive" },
      { years: 2017, term: 39, mod: "C-Section", complications: "None", gender: "M", weight: 3200, status: "Alive" },
      { years: 2020, term: 40, mod: "C-Section", complications: "None", gender: "F", weight: 3400, status: "Alive" },
    ],
  },
];

// ─────────────────────────────────────────────
// Insert into normalized tables
// ─────────────────────────────────────────────
async function insertNormalizedPatient(p) {
  await sql`
    INSERT INTO antenatal_card_patientinfo (antenatal_id, patient_name, dob, cousin_marriage, blood_group, form_date)
    VALUES (${p.id}, ${p.name}, ${p.dob}, ${p.cousinMarriage}, ${p.bloodGroup}, ${p.formDate})
  `;
  await sql`
    INSERT INTO medical_information (antenatal_id, complaints, lmp, edd, risk_factors, medications, surgical_history, diagnosis, plan)
    VALUES (${p.id}, ${p.complaints}, ${p.lmp}, ${p.edd}, ${p.riskFactors}, ${p.medications}, ${p.surgicalHistory}, ${p.diagnosis}, ${p.plan})
  `;
  await sql`
    INSERT INTO family_history (antenatal_id, family_dm, family_htn, family_cancer, family_twins, family_special_child, family_thalassemia)
    VALUES (${p.id}, ${p.famDm}, ${p.famHtn}, ${p.famCancer}, ${p.famTwins}, ${p.famSpecialChild}, ${p.famThalassemia})
  `;
  await sql`
    INSERT INTO medical_history (antenatal_id, drug_allergy, chicken_pox, medical_htn, medical_dm, medical_thyroid, medical_others)
    VALUES (${p.id}, ${p.drugAllergy}, ${p.chickenPox}, ${p.medHtn}, ${p.medDm}, ${p.medThyroid}, ${p.medOthers})
  `;
  await sql`
    INSERT INTO gynae_history (antenatal_id, regular, irregular, pco, hirsutism, pap_smear, contraception)
    VALUES (${p.id}, ${p.regular}, ${p.irregular}, ${p.pco}, ${p.hirsutism}, ${p.papSmear}, ${p.contraception})
  `;
  await sql`
    INSERT INTO vitals (antenatal_id, height, weight, bp, pallor, thyroid_normal, edema)
    VALUES (${p.id}, ${p.height}, ${p.weight}, ${p.bp}, ${p.pallor}, ${p.thyroidNormal}, ${p.edema})
  `;
  for (const obs of p.obstetric) {
    await sql`
      INSERT INTO obstetric_history (antenatal_id, years, term, mod, complications, gender, weight, status)
      VALUES (${p.id}, ${obs.years}, ${obs.term}, ${obs.mod}, ${obs.complications}, ${obs.gender}, ${obs.weight}, ${obs.status})
    `;
  }
}

// ─────────────────────────────────────────────
// Build flat card object for Neo4j sync from normalized data
// ─────────────────────────────────────────────
function buildFlatCard(p) {
  return {
    id: p.id,                        // string like 'A021'
    patient_name: p.name,
    age: null,                       // normalized schema doesn't store age
    cousin_marriage: p.cousinMarriage,
    blood_group: p.bloodGroup,
    lmp: p.lmp,
    edd: p.edd,
    risk_factors: p.riskFactors,
    diagnosis: p.diagnosis,
    plan: p.plan,
    complaints: p.complaints,
    bp: p.bp,
    weight: p.weight,
    height: p.height,
    edema: p.edema,
    pallor: p.pallor,
    family_dm: p.famDm,
    family_htn: p.famHtn,
    family_cancer: p.famCancer,
    family_twins: p.famTwins,
    family_special_child: p.famSpecialChild,
    family_thalassemia: p.famThalassemia,
    medical_dm: p.medDm,
    medical_htn: p.medHtn,
    medical_thyroid: p.medThyroid,
    drug_allergy: p.drugAllergy,
    chicken_pox: p.chickenPox,
    pco: p.pco,
  };
}

// ─────────────────────────────────────────────
// Sync existing patients (A001–A020) to Neo4j
// by joining all normalized tables
// ─────────────────────────────────────────────
async function syncExistingPatients() {
  console.log("\n🔄 Syncing existing patients (A001–A020) to Neo4j...");

  const patients = await sql`
    SELECT
      pi.antenatal_id, pi.patient_name, pi.cousin_marriage, pi.blood_group,
      mi.lmp, mi.edd, mi.risk_factors, mi.diagnosis, mi.plan, mi.complaints,
      v.height, v.weight, v.bp, v.pallor, v.edema,
      fh.family_dm, fh.family_htn, fh.family_cancer, fh.family_twins,
      fh.family_special_child, fh.family_thalassemia,
      mh.drug_allergy, mh.chicken_pox, mh.medical_htn, mh.medical_dm, mh.medical_thyroid,
      gh.pco
    FROM antenatal_card_patientinfo pi
    LEFT JOIN medical_information mi ON mi.antenatal_id = pi.antenatal_id
    LEFT JOIN vitals v ON v.antenatal_id = pi.antenatal_id
    LEFT JOIN family_history fh ON fh.antenatal_id = pi.antenatal_id
    LEFT JOIN medical_history mh ON mh.antenatal_id = pi.antenatal_id
    LEFT JOIN gynae_history gh ON gh.antenatal_id = pi.antenatal_id
  `;

  for (const row of patients) {
    const obsRows = await sql`
      SELECT years, term, mod, complications, gender, weight, status
      FROM obstetric_history WHERE antenatal_id = ${row.antenatal_id}
    `;

    const flatCard = {
      id: row.antenatal_id,
      patient_name: row.patient_name,
      age: null,
      cousin_marriage: row.cousin_marriage,
      blood_group: row.blood_group,
      lmp: row.lmp,
      edd: row.edd,
      risk_factors: row.risk_factors,
      diagnosis: row.diagnosis,
      plan: row.plan,
      complaints: row.complaints,
      bp: row.bp,
      weight: row.weight,
      height: row.height,
      edema: row.edema,
      pallor: row.pallor,
      family_dm: row.family_dm,
      family_htn: row.family_htn,
      family_cancer: row.family_cancer,
      family_twins: row.family_twins,
      family_special_child: row.family_special_child,
      family_thalassemia: row.family_thalassemia,
      medical_dm: row.medical_dm,
      medical_htn: row.medical_htn,
      medical_thyroid: row.medical_thyroid,
      drug_allergy: row.drug_allergy,
      chicken_pox: row.chicken_pox,
      pco: row.pco,
    };

    await syncPatientToNeo4j(flatCard, obsRows, null, null);
  }

  console.log(`✅ Synced ${patients.length} existing patients to Neo4j`);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function seed() {
  console.log("🌱 GynAI Patient Seeder starting...\n");
  await testNeo4jConnection();

  // Step 1: Sync all existing patients to Neo4j
  await syncExistingPatients();

  // Step 2: Seed new patients
  console.log("\n➕ Seeding new patients (A021–A032)...");
  let seeded = 0;
  let skipped = 0;

  for (const p of NEW_PATIENTS) {
    const existing = await sql`
      SELECT antenatal_id FROM antenatal_card_patientinfo WHERE antenatal_id = ${p.id} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`⏭️  Skipping ${p.name} (${p.id} already exists)`);
      skipped++;
      await syncPatientToNeo4j(buildFlatCard(p), p.obstetric.map(o => ({
        years: o.years, term: o.term, mod: o.mod,
        complications: o.complications, gender: o.gender, weight: o.weight, status: o.status
      })), null, null);
      continue;
    }

    await insertNormalizedPatient(p);
    await syncPatientToNeo4j(buildFlatCard(p), p.obstetric.map(o => ({
      years: o.years, term: o.term, mod: o.mod,
      complications: o.complications, gender: o.gender, weight: o.weight, status: o.status
    })), null, null);

    console.log(`✅ Seeded: ${p.name} (${p.id})`);
    seeded++;
  }

  console.log(`\n📊 Complete: ${seeded} new patients inserted, ${skipped} skipped`);
  console.log("📊 All patients are now synced to Neo4j graph database.\n");

  await closeNeo4jDriver();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeder failed:", err);
  process.exit(1);
});
