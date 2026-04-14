import { NextResponse } from "next/server";
import { supportReply, ChatMessage } from "@/lib/ai/support";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    const messages: ChatMessage[] = rawMessages
      .filter(
        (msg: unknown) =>
          typeof msg === "object" &&
          msg !== null &&
          "role" in msg &&
          "content" in msg
      )
      .map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: typeof msg.content === "string" ? msg.content : "",
      }))
      .filter((msg) => msg.content.trim().length > 0);

    const reply = await supportReply(messages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI support route error:", error);

    return NextResponse.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}