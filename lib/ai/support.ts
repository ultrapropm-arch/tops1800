import { openai } from "./client";

export async function supportReply(message: string) {
  if (!openai) return "AI not configured.";

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You help customers book countertop installation.",
      },
      { role: "user", content: message },
    ],
  });

  return res.choices[0]?.message?.content || "";
}