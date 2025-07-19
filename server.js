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
dotenv.config();
const app = express();

// ✅ Initialize local DBs
initDB();
initPaitentsDB();

// ✅ Middleware
app.use(express.json());
app.use("/api/transactions", transactions);
app.use("/api/patients", patientsRoutes);

// ✅ Define tools
const add = tool(async ({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

const subtract = tool(async ({ a, b }) => a - b, {
  name: "subtract",
  description: "Subtract two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

const multiply = tool(async ({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

const divide = tool(async ({ a, b }) => {
  if (b === 0) throw new Error("Cannot divide by zero");
  return a / b;
}, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

// ✅ LLM + Tools

const llm = new ChatOllama({
  model: "llama3.1:8b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});
const tools = [add, subtract, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name,tool]))
const llmWithTools = llm.bindTools(tools);

// Nodes
async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
    },
    ...state.messages
  ]);

  return {
    messages: [result]
  };
}

const toolNode = new ToolNode(tools);



// Conditional edge function to route to the tool node or end
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}


// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges(
    "llmCall",
    shouldContinue,
    {
      // Name returned by shouldContinue : Name of next node to visit
      "Action": "tools",
      "__end__": "__end__",
    }
  )
  .addEdge("tools", "llmCall")
  .compile();


  
// Invoke
const messages = [{
  role: "user",
  content: "Add 3 and 4 than multiply with 5"
}];

const result = await agentBuilder.invoke({ messages });
const lastAIMessage = result.messages.findLast(msg => msg?.constructor?.name === "AIMessage");
console.log("AI Reply:", lastAIMessage?.content);



// ✅ Server Start
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
