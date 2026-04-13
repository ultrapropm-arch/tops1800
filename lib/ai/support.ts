import { openai } from "./client";

export async function supportReply(message: string) {
  if (!openai) return "AI not configured.";

  try {
    const res = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content:
            "You are a 1800TOPS AI assistant. Help customers get countertop installation quotes, ask for missing details (sqft, distance, services), and guide them to book.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return res.output_text || "How can I help with your job?";
  } catch (err) {
    console.error("AI Error:", err);
    return "AI error. Please try again.";
  }
}