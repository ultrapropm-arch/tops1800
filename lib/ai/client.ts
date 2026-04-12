import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("Missing OPENAI_API_KEY");
}

export const openai = apiKey
  ? new OpenAI({ apiKey: apiKey })
  : null;