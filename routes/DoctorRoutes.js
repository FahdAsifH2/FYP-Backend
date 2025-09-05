import express from "express";
import { sql } from "../db.js";
import { GetAppointments, PutAppointments, createPatient } from "../controllers/patientsController.js";
import { GetAllPatientByName } from "../controllers/patientsController.js";
import { getPatientDetailsByID } from "../controllers/patientsController.js";
import { PredictPregnancy } from "../controllers/patientsController.js";

const router = express.Router();

router.post("/putPatients", createPatient);
router.get("/getPatientsNames", GetAllPatientByName);
router.get("/getPatientDetails/:id", getPatientDetailsByID);
router.get("/putPatients", createPatient);
router.post("/PredictPregnancy", PredictPregnancy);
router.post("/appointments",PutAppointments);
router.get("GetTomorrowsAppointments",GetAppointments)











router.post("/SubmitAntenatalform", async (req, res) => {
  console.log("Api end point hit");
  try {
    const {
      patientInfo,
      medicalInfo,
      vitals,
      scans,
      history,
      obstetricHistory,
      investigations,
    } = req.body;

    // Insert main antenatal card data
    const result1 = await sql`
      INSERT INTO antenatal_cards (
        patient_name, guardian_name, guardian_type, age, married_since, cousin_marriage,
        address, tel, blood_group, husband_name, husband_blood_group,
        patient_occupation, husband_occupation, ref_by, form_date, p_field,
        complaints, lmp, edd, risk_factors, medications, surgical_history,
        diagnosis, plan, additional_notes, height, weight, bp, pallor,
        thyroid_normal, thyroid_notes, edema, edema_location, chest_findings, breasts,
        scan_edd, scan_pa, scan_ps, scan_bimanual,
        regular, irregular, pco, hirsutism, pap_smear, contraception,
        family_dm, family_htn, family_cancer, family_twins, family_special_child, family_thalassemia,
        drug_allergy, chicken_pox, medical_htn, medical_dm, medical_thyroid, medical_others,
        booking_scan, nt_scan, anomaly_scan, scan_28_weeks, scan_34_weeks, term_scan
      ) VALUES (
        ${patientInfo?.patientName || null},
        ${patientInfo?.guardianName || null},
        ${patientInfo?.guardianType || null},
        ${patientInfo?.age || null},
        ${patientInfo?.marriedSince || null},
        ${patientInfo?.cousinMarriage || false},
        ${patientInfo?.address || null},
        ${patientInfo?.tel || null},
        ${patientInfo?.bloodGroup || null},
        ${patientInfo?.husbandName || null},
        ${patientInfo?.husbandBloodGroup || null},
        ${patientInfo?.patientOccupation || null},
        ${patientInfo?.husbandOccupation || null},
        ${patientInfo?.refBy || null},
        ${patientInfo?.date || null},
        ${patientInfo?.p || null},
        ${medicalInfo?.complaints || null},
        ${medicalInfo?.lmp || null},
        ${medicalInfo?.edd || null},
        ${medicalInfo?.riskFactors || null},
        ${medicalInfo?.medications || null},
        ${medicalInfo?.surgicalHistory || null},
        ${medicalInfo?.diagnosis || null},
        ${medicalInfo?.plan || null},
        ${medicalInfo?.additionalNotes || null},
        ${vitals?.height || null},
        ${vitals?.weight || null},
        ${vitals?.bp || null},
        ${vitals?.pallor || null},
        ${vitals?.thyroidNormal ?? true},
        ${vitals?.thyroidNotes || null},
        ${vitals?.edema || null},
        ${vitals?.edemaLocation || null},
        ${vitals?.chestFindings || null},
        ${vitals?.breasts || null},
        ${scans?.edd || null},
        ${scans?.pa || null},
        ${scans?.ps || null},
        ${scans?.bimanual || null},
        ${history?.gynaeHistory?.regular || false},
        ${history?.gynaeHistory?.irregular || false},
        ${history?.gynaeHistory?.pco || false},
        ${history?.gynaeHistory?.hirsutism || false},
        ${history?.gynaeHistory?.papSmear || false},
        ${history?.gynaeHistory?.contraception || false},
        ${history?.familyHistory?.dm || false},
        ${history?.familyHistory?.htn || false},
        ${history?.familyHistory?.cancer || false},
        ${history?.familyHistory?.twins || false},
        ${history?.familyHistory?.specialChild || false},
        ${history?.familyHistory?.thalassemia || false},
        ${history?.medicalHistory?.drugAllergy || false},
        ${history?.medicalHistory?.chickenPox || false},
        ${history?.medicalHistory?.htnMedical || false},
        ${history?.medicalHistory?.dmMedical || false},
        ${history?.medicalHistory?.thyroid || false},
        ${history?.medicalHistory?.others || false},
        ${scans?.scanTypes?.bookingScan || false},
        ${scans?.scanTypes?.ntScan || false},
        ${scans?.scanTypes?.anomalyScan || false},
        ${scans?.scanTypes?.scan28Weeks || false},
        ${scans?.scanTypes?.scan34Weeks || false},
        ${scans?.scanTypes?.termScan || false}
      ) RETURNING id, created_at
    `;

    const antenatalCardId = result1[0].id;

    // Insert obstetric history if exists
    if (obstetricHistory && obstetricHistory.length > 0) {
      for (let i = 0; i < obstetricHistory.length; i++) {
        const historyRecord = obstetricHistory[i];

        // Skip empty records
        if (
          !historyRecord.yrs &&
          !historyRecord.term &&
          !historyRecord.mod &&
          !historyRecord.complications &&
          !historyRecord.genderWeight &&
          !historyRecord.status
        ) {
          continue;
        }

        const years = parseInt(historyRecord.yrs) || 0;
        const term = parseInt(historyRecord.term) || 0;
        const modeOfDelivery = historyRecord.mod || null;
        const complications = historyRecord.complications || null;
        const genderAndWeight = historyRecord.genderWeight || "";
        const status = historyRecord.status || null;

        // Parse gender and weight
        let gender = "";
        let weight = 0;

        if (genderAndWeight && genderAndWeight.trim()) {
          const parts = genderAndWeight.trim().split(/\s+/);

          for (let j = 0; j < parts.length; j++) {
            if (isNaN(parts[j])) {
              gender = parts[j];
            } else {
              // Extract numeric value (remove non-digits except decimal point)
              const numericValue = parts[j].replace(/[^\d.]/g, "");
              weight = parseFloat(numericValue) || 0;
              break;
            }
          }
        }

      //  console.log("Data received in API:", req.body);
     

        await sql`
          INSERT INTO obstetric_history (
            antenatal_card_id,
            years,
            term,
            mod,
            complications,
            gender,
            weight,
            status
          ) VALUES (
            ${antenatalCardId},
            ${years},
            ${term},
            ${modeOfDelivery},
            ${complications},
            ${gender},
            ${weight},
            ${status}
          )
        `;
      }
    }

    // Insert investigations if exists
    if (investigations && investigations.length > 0) {
      for (let i = 0; i < investigations.length; i++) {
        const investigation = investigations[i];

        // Skip empty records
        if (
          !investigation.test &&
          !investigation.date &&
          !investigation.hb &&
          !investigation.bsr &&
          !investigation.urine &&
          !investigation.ultrasound
        ) {
          continue;
        }

        await sql`
          INSERT INTO investigations (
            antenatal_card_id,
            test,
            test_date,
            hb,
            bsr,
            urine,
            ultrasound
          ) VALUES (
            ${antenatalCardId},
            ${investigation.test || null},
            ${investigation.date || null},
            ${investigation.hb || null},
            ${investigation.bsr || null},
            ${investigation.urine || null},
            ${investigation.ultrasound || null}
          )
        `;
      }
    }

    res.status(201).json({
      success: true,
      message: "Antenatal card saved successfully",
      id: antenatalCardId,
      created_at: result1[0].created_at,
    });
  } catch (error) {
    console.error("Error saving antenatal card:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save antenatal card",
      details: error.message,
    });
  }
});

export default router;
