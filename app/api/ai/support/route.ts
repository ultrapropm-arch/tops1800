import { NextResponse } from "next/server";
import { supportReply, ChatMessage } from "@/lib/ai/support";

function isValidChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawMessages: unknown[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    const messages: ChatMessage[] = rawMessages
      .filter(isValidChatMessage)
      .map(
        (msg): ChatMessage => ({
          role: msg.role,
          content: msg.content.trim(),
        })
      )
      .filter((msg) => msg.content.length > 0);

    const safeMessages: ChatMessage[] =
      messages.length > 0
        ? messages
        : [
            {
              role: "user",
              content: "I need a quote.",
            },
          ];

    const reply = await supportReply(safeMessages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI support route error:", error);

    return NextResponse.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}