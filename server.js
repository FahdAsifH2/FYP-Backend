// server.js
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import {
  initAntenatalCards,
  initAppointments,
  initPaitentsDB,
} from "./initDB.js";
import DoctorRoutes from "./routes/DoctorRoutes.js";
import cors from "cors";
import { SqlTemplate } from "@neondatabase/serverless";

dotenv.config();
const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// Routes
app.use("/api/Doctors", DoctorRoutes);


// Create schema with connection test
async function createSchema() {
  try {
    await initPaitentsDB();
    await initAntenatalCards();
    await initAppointments();
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
  console.log(`- Network: http://192.168.100.67:${PORT}`);
  console.log("=========================================\n");

  await createSchema();
});
