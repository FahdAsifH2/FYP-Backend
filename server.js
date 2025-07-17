
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import transactions from "./routes/transactions.js"
import { initDB, initPaitentsDB } from "./initDB.js";
import patientsRoutes from "./routes/patientsRoutes.js"

const app = express();
dotenv.config();

// Initialize databases
initDB();
initPaitentsDB()

// Middleware to parse JSON requests
app.use(express.json());

// Middleware for routes
app.use("/api/transactions", transactions);
app.use("/api/patients",patientsRoutes);



const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${PORT}`);
})