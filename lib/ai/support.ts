import { openai } from "./client";

export async function supportReply(message: string) {
  if (!openai) return "AI not configured.";

  try {
    const res = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `You are 1800TOPS AI assistant.

Help customers with countertop installation quotes.

Customer: ${message}`,
    });

    return res.output_text || "No response.";
  } catch (error) {
    console.error("OpenAI ERROR:", error);
    return "AI failed. Check server logs.";
  }
}