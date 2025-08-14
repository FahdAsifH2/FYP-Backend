// server.js
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import patientsRoutes from "./routes/DoctorRoutes.js";
import { initAntenatalCards, initPaitentsDB } from "./initDB.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { AIMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { runAgent } from "./agents/agentPrototype.js";
import DoctorRoutes from "./routes/DoctorRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();

initPaitentsDB();
initAntenatalCards();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/Doctors", DoctorRoutes);


const PORT = process.env.PORT || 5001;

// CRITICAL FIX: Listen on all network interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(" ");
  console.log(`Server running at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://192.168.100.67:${PORT}`);
  console.log(" ");
});