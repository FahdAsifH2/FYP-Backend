// ./agents/tools.js
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Add tool
export const add = tool(async ({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

// Subtract tool
export const subtract = tool(async ({ a, b }) => a - b, {
  name: "subtract",
  description: "Subtract two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

// Multiply tool
export const multiply = tool(async ({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

// Divide tool
export const divide = tool(async ({ a, b }) => {
  if (b === 0) throw new Error("Cannot divide by zero");
  return a / b;
}, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
});

// Notify doctor tool
export const notifyDoctor = tool(
  async ({ issues, alert }) => {
    console.log("Doctor Notified")
    return "Doctor has been notified.";
  },
  {
    name: "notifyDoctor",
    description: "Notify the doctor about a patient issue or alert.",
    schema: z.object({
      issues: z.string(),
      alert: z.string(),
    }),
  }
);

// Export all tools in an array (optional for easy import)
export const allTools = [add, subtract, multiply, divide, notifyDoctor];
