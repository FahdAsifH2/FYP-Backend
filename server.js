// server.js
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import transactions from "./routes/transactions.js";
import patientsRoutes from "./routes/patientsRoutes.js";
import { initDB, initPaitentsDB } from "./initDB.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { runAgent } from "./agents/agentPrototype.js";

dotenv.config();
const app = express();


initDB();
initPaitentsDB();

// ✅ Middleware
app.use(express.json());
app.use("/api/transactions", transactions);
app.use("/api/patients", patientsRoutes);


// // ✅ Test the agent
// const testAgent = async () => {
//   const result = await runAgent("Notify the doctor about high blood pressure and dizziness");
//   console.log("AI Reply:", result);
// };

// Run the agent test
//testAgent();



const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});