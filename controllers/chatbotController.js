import { runNeuroSymbolicAgent } from "../agents/neuroSymbolicAgent.js";

/**
 * POST /api/chatbot/message
 * Body: { message: string, conversationHistory?: [{role, content}] }
 * Auth: JWT required (doctor role)
 */
export async function handleMessage(req, res) {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: "message is required" });
    }

    const doctorId = req.user.id;

    const { response, resultsCount, llmUsed } = await runNeuroSymbolicAgent(
      message.trim(),
      doctorId,
      conversationHistory
    );

    return res.json({
      success: true,
      response,
      resultsCount,
      llmUsed,
    });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Chatbot request failed",
      details: err.message,
    });
  }
}
