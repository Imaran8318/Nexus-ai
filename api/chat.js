// api/chat.js — Vercel Serverless Function using Google Gemini (FREE)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Convert messages to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // Add system prompt as first user message if provided
    if (system) {
      geminiMessages.unshift({
        role: "user",
        parts: [{ text: `System: ${system}` }]
      }, {
        role: "model",
        parts: [{ text: "Understood! I will follow these instructions." }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // Return in same format as Anthropic so frontend works unchanged
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
