// server.js
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import {
  initAntenatalCards,
  initAppointments,
  initPaitentsDB,
  initUser,
  initDoctorPatientRelationships,
  initDocuments,
  initHealthProfiles,
  initSymptomLogs,
} from "./initDB.js";
import authRoutes from "./routes/authRoutes.js";
import DoctorRoutes from "./routes/DoctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import relationshipRoutes from "./routes/relationshipRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import healthProfileRoutes from "./routes/healthProfileRoutes.js";
import symptomRoutes from "./routes/symptomRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import cors from "cors";
import { testNeo4jConnection } from "./neo4j.js";

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/Doctors", DoctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/health-profile", healthProfileRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Create schema with connection test
async function createSchema() {
  try {
    await initUser();
    await initPaitentsDB();
    await initAntenatalCards();
    await initAppointments();
    await initDoctorPatientRelationships();
    await initDocuments();
    await initHealthProfiles();
    await initSymptomLogs();
    console.log("Database schema initialized successfully");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

const PORT = process.env.PORT || 5001;

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log("\n=========================================");
  console.log(`Server running at:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Network: http://0.0.0.0:${PORT}`);
  console.log("=========================================\n");

  await createSchema();
  await testNeo4jConnection();
});
