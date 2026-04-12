import { NextResponse } from "next/server";
import { analyzeProfit } from "@/lib/ai/profit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = analyzeProfit(body);
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ error: "Profit error" }, { status: 500 });
  }
}