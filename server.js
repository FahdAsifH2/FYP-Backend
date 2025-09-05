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

app.get("/getAppointments", async (req,res) => {
  try {
    const response = await sql`
    SELECT * FROM appointments ORDER BY appointment_date
    `;
    res.json(response);
    console.log(response)
    console.log("Appointments Retrived");
  } catch (error) {

    res.status(500).json({message:"Error with Appointments"})
  }
});

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
