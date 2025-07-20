// ./agents/agentPrototype.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

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


const notifyDoctor = tool(
  async ({ issues, alert }) => {
    console.log("🔔 Notified Doctor");
    console.log("Issues:", issues);
    console.log("Alert:", alert);
    return "Doctor has been notified.";
  },
  {
    name: "notifyDoctor",
    description: "Notify the doctor about a patient issue or alert.",
    schema: z.object({
      issues: z.string(),
      alert: z.string()
    })
  }
);

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

const tools = [add, subtract, multiply, divide,notifyDoctor];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);

// Nodes
async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: "You are a helpful assistant tasked to notifying the doctor about the patient on a set of inputs nut only notify if the info is valid and the paitnet is in extreme situation else donot notify along with your own short analysis if diabetes is false than no sugar and vice versa also tell if you notified the doctor or not."
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

// Export function to use the agent
export async function runAgent(userMessage) {
  const messages = [{
    role: "user",
    content: userMessage
  }];
  
  console.log("  ")
  console.log("  ")
  const result = await agentBuilder.invoke({ messages });
  const lastAIMessage = result.messages.findLast(msg => msg?.constructor?.name === "AIMessage");
  console.log("  ")
  console.log("  ")
  return lastAIMessage?.content;
}