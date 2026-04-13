import { NextResponse } from "next/server";
import { supportReply } from "@/lib/ai/support";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Get last user message from chat
    const lastMessage =
      body?.messages?.[body.messages.length - 1]?.content || "";

    // ✅ Call your AI logic
    const reply = await supportReply(lastMessage);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (err) {
    console.error("AI Support Error:", err);

    return NextResponse.json(
      { reply: "Error connecting to AI." },
      { status: 500 }
    );
  }
}