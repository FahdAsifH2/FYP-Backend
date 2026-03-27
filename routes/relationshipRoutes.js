import express from "express";
import { sql } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/relationships/doctors - List all available doctors (for patients to browse)
router.get("/doctors", authenticateToken, async (req, res) => {
  try {
    const doctors = await sql`
      SELECT id, name, email, created_at
      FROM users
      WHERE role = 'doctor'
      ORDER BY name
    `;
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ success: false, error: "Failed to fetch doctors" });
  }
});

// POST /api/relationships/connect - Patient connects with a doctor
router.post("/connect", authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;
    const patientName = req.user.name;

    console.log(`[CONNECT] Patient ${patientId} connecting with doctor ${doctorId}`);

    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patients can connect with doctors" });
    }

    // Get doctor name
    const doctor = await sql`SELECT name FROM users WHERE id = ${doctorId} AND role = 'doctor'`;
    if (doctor.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Remove any old rows for this pair and insert fresh
    const deleted = await sql`
      DELETE FROM doctor_patient_relationships
      WHERE doctor_id = ${doctorId} AND patient_id = ${patientId}
      RETURNING id
    `;
    console.log(`[CONNECT] Deleted ${deleted.length} old rows`);

    const result = await sql`
      INSERT INTO doctor_patient_relationships (doctor_id, patient_id, doctor_name, patient_name, status)
      VALUES (${doctorId}, ${patientId}, ${doctor[0].name}, ${patientName}, 'active')
      RETURNING *
    `;

    console.log(`[CONNECT] Success - new relationship id: ${result[0].id}`);
    res.status(201).json({ success: true, message: "Connected with doctor", data: result[0] });
  } catch (error) {
    console.error("[CONNECT] Error:", error);
    res.status(500).json({ success: false, error: "Failed to connect: " + error.message });
  }
});

// GET /api/relationships/my-doctor - Get patient's connected doctor
router.get("/my-doctor", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT dpr.*, u.email as doctor_email
      FROM doctor_patient_relationships dpr
      JOIN users u ON u.id = dpr.doctor_id
      WHERE dpr.patient_id = ${req.user.id} AND dpr.status = 'active'
      ORDER BY dpr.created_at DESC
      LIMIT 1
    `;
    if (result.length === 0) {
      return res.json({ success: true, data: null, message: "No doctor connected yet" });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({ success: false, error: "Failed to fetch doctor" });
  }
});

// GET /api/relationships/my-patients - Get doctor's connected patients
router.get("/my-patients", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can view their patients" });
    }
    const result = await sql`
      SELECT dpr.*, u.email as patient_email
      FROM doctor_patient_relationships dpr
      JOIN users u ON u.id = dpr.patient_id
      WHERE dpr.doctor_id = ${req.user.id} AND dpr.status = 'active'
      ORDER BY dpr.created_at DESC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patients" });
  }
});

// DELETE /api/relationships/disconnect/:doctorId - Patient disconnects from doctor
router.delete("/disconnect/:doctorId", authenticateToken, async (req, res) => {
  try {
    await sql`
      UPDATE doctor_patient_relationships
      SET status = 'inactive'
      WHERE doctor_id = ${req.params.doctorId} AND patient_id = ${req.user.id}
    `;
    res.json({ success: true, message: "Disconnected from doctor" });
  } catch (error) {
    console.error("Error disconnecting:", error);
    res.status(500).json({ success: false, error: "Failed to disconnect" });
  }
});

export default router;
