
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import transactions from "./routes/transactions.js"
import { initDB } from "./initDB.js";

const app = express();
dotenv.config();



// Initialize database when starting the server
initDB();

// Middleware to parse JSON requests
app.use(express.json());

// Middleware for routes
app.use("/api/transactions", transactions);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${PORT}`);
})