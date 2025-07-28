// server.js
import express from "express";
import dotenv from "dotenv";
import { sql } from "./db.js";
import patientsRoutes from "./routes/DoctorRoutes.js";
import { initPaitentsDB } from "./initDB.js";
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

//  Middleware
app.use(cors());
app.use(express.json());
app.use("/api/Doctors", DoctorRoutes);


app.get("/api/patients/putPatinets",(req,res)=>{
  console.log("This patient Route")
})





const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(" ");
  console.log(` Server running at http://localhost:${PORT}`);
});
