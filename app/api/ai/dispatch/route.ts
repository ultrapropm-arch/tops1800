import { NextResponse } from "next/server";
import { recommendInstaller } from "@/lib/ai/dispatch";

export async function POST(req: Request) {
  try {
    if (process.env.AI_DISPATCH_ENABLED !== "true") {
      return NextResponse.json(
        { error: "AI dispatch is disabled." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = recommendInstaller(body.installers || []);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Dispatch error:", error);

    return NextResponse.json(
      { error: "Dispatch error" },
      { status: 500 }
    );
  }
}