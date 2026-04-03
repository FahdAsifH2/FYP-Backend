import express from "express";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";
import { handleMessage } from "../controllers/chatbotController.js";

const router = express.Router();

// Doctor-only chatbot endpoint
router.post("/message", authenticateToken, requireRole(["doctor"]), handleMessage);

export default router;
