import express from "express";
import { sql } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/symptoms/log
// Log (or update) today's symptom entry for the authenticated patient.
// If a log already exists for CURRENT_DATE it is updated in place (upsert).
// Body: { symptoms: string[], notes: string }
router.post("/log", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ success: false, error: "Only patients can log symptoms" });
    }

    const { symptoms, notes } = req.body;

    if (!Array.isArray(symptoms)) {
      return res
        .status(400)
        .json({ success: false, error: "symptoms must be an array" });
    }

    const userId = req.user.id;
    // Persist the array as a JSON string so it fits a TEXT column without
    // requiring a separate array column or jsonb.
    const symptomsJson = JSON.stringify(symptoms);

    const result = await sql`
      INSERT INTO symptom_logs (user_id, symptoms, notes, logged_date)
      VALUES (
        ${userId},
        ${symptomsJson},
        ${notes || null},
        CURRENT_DATE
      )
      ON CONFLICT (user_id, logged_date) DO UPDATE SET
        symptoms   = EXCLUDED.symptoms,
        notes      = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error logging symptoms:", error);
    res.status(500).json({ success: false, error: "Failed to log symptoms" });
  }
});

// GET /api/symptoms/today
// Return the authenticated patient's symptom log for today.
router.get("/today", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM symptom_logs
      WHERE user_id    = ${req.user.id}
        AND logged_date = CURRENT_DATE
    `;

    if (result.length === 0) {
      return res.json({ success: true, data: null, message: "No symptom log for today" });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error fetching today's symptoms:", error);
    res.status(500).json({ success: false, error: "Failed to fetch today's symptom log" });
  }
});

// GET /api/symptoms/patient/:patientId
// Doctor retrieves the last 7 days of symptom logs for a specific patient.
// Auth required — an active doctor-patient relationship must exist.
router.get("/patient/:patientId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ success: false, error: "Only doctors can view patient symptom logs" });
    }

    const { patientId } = req.params;

    // Verify an active relationship exists between this doctor and the patient
    const relationship = await sql`
      SELECT id FROM doctor_patient_relationships
      WHERE doctor_id = ${req.user.id}
        AND patient_id = ${patientId}
        AND status = 'active'
    `;

    if (relationship.length === 0) {
      return res
        .status(403)
        .json({ success: false, error: "No active relationship with this patient" });
    }

    const result = await sql`
      SELECT * FROM symptom_logs
      WHERE user_id    = ${patientId}
        AND logged_date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY logged_date DESC
    `;

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching patient symptom logs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patient symptom logs" });
  }
});

export default router;
