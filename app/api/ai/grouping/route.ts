import { NextResponse } from "next/server";
import { findGroupingMatches } from "@/lib/ai/grouping";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const currentBooking = body?.currentBooking;
    const openBookings = Array.isArray(body?.openBookings) ? body.openBookings : [];

    if (!currentBooking?.id) {
      return NextResponse.json(
        { error: "Current booking is required." },
        { status: 400 }
      );
    }

    const rawResult = findGroupingMatches(currentBooking, openBookings) || {};

    const result = {
      groupingLabel:
        typeof rawResult.groupingLabel === "string" && rawResult.groupingLabel.trim()
          ? rawResult.groupingLabel
          : "Solo Route",
      groupingScore:
        typeof rawResult.groupingScore === "number"
          ? rawResult.groupingScore
          : Number(rawResult.groupingScore || 50),
      routeHint:
        typeof rawResult.routeHint === "string" && rawResult.routeHint.trim()
          ? rawResult.routeHint
          : "No grouping suggestion",
      matchedJobIds: Array.isArray(rawResult.matchedJobIds)
        ? rawResult.matchedJobIds.map(String)
        : [],
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Grouping error:", error);

    return NextResponse.json(
      { error: "Grouping error" },
      { status: 500 }
    );
  }
}