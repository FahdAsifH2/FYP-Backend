
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import transactions from "./routes/transactions.js"

const app = express();
dotenv.config();

// Database initialization
async function initDB() {
  try {
    await sql.query(`CREATE TABLE IF NOT EXISTS transactions(
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      created_at DATE NOT NULL DEFAULT CURRENT_DATE
    )`);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}


async function inintdb()
{
  try
  {
    
  }
  catch(error)
  {

  }

}

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