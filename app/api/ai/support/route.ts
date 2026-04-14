import { NextResponse } from "next/server";
import { supportReply } from "@/lib/ai/support";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastMessage = messages[messages.length - 1]?.content?.trim() || "";

    if (!lastMessage) {
      return NextResponse.json({ reply: "No message sent." }, { status: 400 });
    }

    const reply = await supportReply(lastMessage);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI Support Error:", err);

    return NextResponse.json(
      { reply: "Error connecting to AI." },
      { status: 500 }
    );
  }
}