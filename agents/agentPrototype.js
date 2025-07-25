// ./agents/agentPrototype.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { allTools } from "./tools.js";

// ✅ LLM + Tools
const llm = new ChatOllama({
  model: "llama3.1:8b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});
const tools = allTools; // ✅ No nesting

// Only do this if needed later for object lookup
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

// For binding to the LLM, use the array (NOT the object)
const llmWithTools = llm.bindTools(tools); // ✅ Correct


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