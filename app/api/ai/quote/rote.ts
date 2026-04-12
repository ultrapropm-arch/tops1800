import { NextResponse } from "next/server";
import { generateQuote } from "@/lib/ai/quote";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = generateQuote(body);
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ error: "Quote error" }, { status: 500 });
  }
}