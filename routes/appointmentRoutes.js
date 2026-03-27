import express from "express";
import { sql } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/appointments - Book a new appointment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { doctorId, doctorName, appointmentDate, appointmentTime, appointmentType, issue } = req.body;
    const patientId = req.user.id;
    const patientName = req.user.name;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: "Date and time are required" });
    }

    const result = await sql`
      INSERT INTO appointments (patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time, appointment_type, issue, status)
      VALUES (${patientId}, ${doctorId || null}, ${patientName}, ${doctorName || null}, ${appointmentDate}, ${appointmentTime}, ${appointmentType || 'Routine Checkup'}, ${issue || null}, 'pending')
      RETURNING *
    `;

    res.status(201).json({ success: true, message: "Appointment booked", data: result[0] });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ success: false, error: "Failed to book appointment" });
  }
});

// GET /api/appointments/patient - Get patient's appointments
router.get("/patient", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM appointments
      WHERE patient_id = ${req.user.id}
      ORDER BY appointment_date DESC, appointment_time DESC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ success: false, error: "Failed to fetch appointments" });
  }
});

// GET /api/appointments/doctor - Get doctor's appointments
router.get("/doctor", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can view doctor appointments" });
    }
    const result = await sql`
      SELECT * FROM appointments
      WHERE doctor_id = ${req.user.id}
      ORDER BY appointment_date ASC, appointment_time ASC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ success: false, error: "Failed to fetch appointments" });
  }
});

// GET /api/appointments/doctor/upcoming - Get doctor's upcoming appointments
router.get("/doctor/upcoming", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM appointments
      WHERE doctor_id = ${req.user.id}
        AND appointment_date >= CURRENT_DATE
        AND status IN ('pending', 'confirmed')
      ORDER BY appointment_date ASC, appointment_time ASC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching upcoming:", error);
    res.status(500).json({ success: false, error: "Failed to fetch appointments" });
  }
});

// PATCH /api/appointments/:id/status - Update appointment status (doctor confirms/cancels)
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ["confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await sql`
      UPDATE appointments
      SET status = ${status}, notes = COALESCE(${notes || null}, notes)
      WHERE id = ${req.params.id} AND (doctor_id = ${req.user.id} OR patient_id = ${req.user.id})
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ success: true, message: `Appointment ${status}`, data: result[0] });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ success: false, error: "Failed to update appointment" });
  }
});

// DELETE /api/appointments/:id - Cancel/delete appointment
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      DELETE FROM appointments
      WHERE id = ${req.params.id} AND (patient_id = ${req.user.id} OR doctor_id = ${req.user.id})
      RETURNING *
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({ success: false, error: "Failed to delete appointment" });
  }
});

export default router;
