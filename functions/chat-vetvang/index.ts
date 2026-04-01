import { Runtime, Sockets, Query, ID } from "node-appwrite";
import { GoogleGenerativeAI } from "@google/generative-ai";

// System prompt for Vẹt Vàng
const SYSTEM_PROMPT = `Bạn là Vẹt Vàng (Golden Parrot) - một mascot AI tài chính cá nhân cho người Việt. Bạn hài hước, châm biếm, và thẳng thắn. Không bao giờ lịch sự một cách generic. Luôn dùng tiếng Việt. Chủ đề: tài chính, đầu tư, tiết kiệm, chi tiêu.`;

interface Message {
  role: "user" | "model";
  content: string;
}

export default async ({ req, res, log, error }: any) => {
  try {
    const body = req.bodyJson();
    const { message, history = [] } = body as {
      message: string;
      history: Message[];
    };

    if (!message) {
      return res.json({ error: "message is required" }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const baseUrl = process.env.GEMINI_BASE_URL;

    if (!apiKey) {
      return res.json({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      ...(baseUrl ? { apiEndpoint: baseUrl } : {}),
    });

    // Build conversation history
    const chatHistory: Parameters<typeof model.generateContent>[0]["history"] =
      history.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.json({ reply: text });
  } catch (err) {
    error(`chat-vetvang error: ${err}`);
    return res.json({ error: "Internal server error" }, 500);
  }
};
