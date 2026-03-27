import express from "express";
import { sql } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/health-profile/save
// Save or update the authenticated patient's health profile.
// Auth required — patient role only.
router.post("/save", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ success: false, error: "Only patients can save a health profile" });
    }

    const {
      name,
      age,
      height,
      weight,
      gravida,
      blood_group,
      diabetes,
      previous_c_section,
      allergies,
      medical_conditions,
    } = req.body;

    const userId = req.user.id;

    const result = await sql`
      INSERT INTO health_profiles (
        user_id, name, age, height, weight, gravida,
        blood_group, diabetes, previous_c_section,
        allergies, medical_conditions, updated_at
      )
      VALUES (
        ${userId},
        ${name || null},
        ${age || null},
        ${height || null},
        ${weight || null},
        ${gravida || null},
        ${blood_group || null},
        ${diabetes ?? false},
        ${previous_c_section ?? false},
        ${allergies || null},
        ${medical_conditions || null},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        name               = EXCLUDED.name,
        age                = EXCLUDED.age,
        height             = EXCLUDED.height,
        weight             = EXCLUDED.weight,
        gravida            = EXCLUDED.gravida,
        blood_group        = EXCLUDED.blood_group,
        diabetes           = EXCLUDED.diabetes,
        previous_c_section = EXCLUDED.previous_c_section,
        allergies          = EXCLUDED.allergies,
        medical_conditions = EXCLUDED.medical_conditions,
        updated_at         = CURRENT_TIMESTAMP
      RETURNING *
    `;

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error saving health profile:", error);
    res.status(500).json({ success: false, error: "Failed to save health profile" });
  }
});

// GET /api/health-profile/my-profile
// Return the authenticated patient's own health profile.
router.get("/my-profile", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM health_profiles
      WHERE user_id = ${req.user.id}
    `;

    if (result.length === 0) {
      return res.json({ success: true, data: null, message: "No health profile found" });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error fetching health profile:", error);
    res.status(500).json({ success: false, error: "Failed to fetch health profile" });
  }
});

// GET /api/health-profile/patient/:patientId
// Doctor views a specific patient's health profile.
// Auth required — an active doctor-patient relationship must exist.
router.get("/patient/:patientId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ success: false, error: "Only doctors can view patient profiles" });
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
      SELECT * FROM health_profiles
      WHERE user_id = ${patientId}
    `;

    if (result.length === 0) {
      return res.json({ success: true, data: null, message: "Patient has no health profile yet" });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error fetching patient health profile:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patient health profile" });
  }
});

export default router;
