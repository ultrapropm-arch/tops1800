import { NextResponse } from "next/server";
import { supportReply } from "@/lib/ai/support";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reply = await supportReply(body.message);
    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json({ error: "Support error" }, { status: 500 });
  }
}