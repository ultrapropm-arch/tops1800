import { openai } from "./client";

export async function supportReply(messages: any[]) {
  if (!openai) return "AI not configured.";

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You are an AI assistant for 1800TOPS.

You help customers:
- Get countertop installation quotes
- Understand pricing
- Book jobs

Ask smart follow-up questions if needed:
- square footage
- material (2cm or 3cm)
- location
- add-ons (sink, cutouts, waterfalls)

Be short, clear, and professional.
`,
      },
      ...messages,
    ],
  });

  return res.choices[0]?.message?.content || "No response.";
}