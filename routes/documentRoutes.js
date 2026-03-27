import express from "express";
import { sql } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/documents/upload - Upload a document (base64 encoded)
router.post("/upload", authenticateToken, async (req, res) => {
  try {
    const { title, description, fileName, fileType, fileSize, fileData, category } = req.body;
    const patientId = req.user.id;

    if (!title || !fileName || !fileData) {
      return res.status(400).json({ error: "Title, fileName, and fileData are required" });
    }

    const validCategories = ["lab_report", "ultrasound", "prescription", "discharge_summary", "general", "blood_work", "scan"];
    const docCategory = validCategories.includes(category) ? category : "general";

    const result = await sql`
      INSERT INTO documents (patient_id, title, description, file_name, file_type, file_size, file_data, category)
      VALUES (${patientId}, ${title}, ${description || null}, ${fileName}, ${fileType || 'application/pdf'}, ${fileSize || 0}, ${fileData}, ${docCategory})
      RETURNING id, patient_id, title, description, file_name, file_type, file_size, category, shared_with_doctor, doctor_id, uploaded_at
    `;

    res.status(201).json({ success: true, message: "Document uploaded", data: result[0] });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ success: false, error: "Failed to upload document" });
  }
});

// GET /api/documents/my-documents - Get patient's documents
router.get("/my-documents", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT id, patient_id, title, description, file_name, file_type, file_size, category, shared_with_doctor, doctor_id, uploaded_at
      FROM documents
      WHERE patient_id = ${req.user.id}
      ORDER BY uploaded_at DESC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ success: false, error: "Failed to fetch documents" });
  }
});

// GET /api/documents/:id - Get a specific document with file data
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT * FROM documents
      WHERE id = ${req.params.id}
        AND (patient_id = ${req.user.id} OR doctor_id = ${req.user.id})
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ success: false, error: "Failed to fetch document" });
  }
});

// PATCH /api/documents/:id/share - Share document with doctor
router.patch("/:id/share", authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.body;

    // Verify doctor exists
    const doctor = await sql`SELECT id, name FROM users WHERE id = ${doctorId} AND role = 'doctor'`;
    if (doctor.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const result = await sql`
      UPDATE documents
      SET shared_with_doctor = true, doctor_id = ${doctorId}
      WHERE id = ${req.params.id} AND patient_id = ${req.user.id}
      RETURNING id, title, file_name, shared_with_doctor, doctor_id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ success: true, message: `Document shared with ${doctor[0].name}`, data: result[0] });
  } catch (error) {
    console.error("Error sharing document:", error);
    res.status(500).json({ success: false, error: "Failed to share document" });
  }
});

// PATCH /api/documents/:id/unshare - Unshare document
router.patch("/:id/unshare", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      UPDATE documents
      SET shared_with_doctor = false, doctor_id = null
      WHERE id = ${req.params.id} AND patient_id = ${req.user.id}
      RETURNING id, title
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, message: "Document unshared", data: result[0] });
  } catch (error) {
    console.error("Error unsharing:", error);
    res.status(500).json({ success: false, error: "Failed to unshare" });
  }
});

// GET /api/documents/shared/with-me - Doctor views shared documents
router.get("/shared/with-me", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can view shared documents" });
    }
    const result = await sql`
      SELECT d.id, d.title, d.description, d.file_name, d.file_type, d.file_size, d.category, d.uploaded_at,
             u.name as patient_name, u.email as patient_email
      FROM documents d
      JOIN users u ON u.id = d.patient_id
      WHERE d.doctor_id = ${req.user.id} AND d.shared_with_doctor = true
      ORDER BY d.uploaded_at DESC
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching shared docs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch shared documents" });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      DELETE FROM documents
      WHERE id = ${req.params.id} AND patient_id = ${req.user.id}
      RETURNING id
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ success: false, error: "Failed to delete document" });
  }
});

export default router;
