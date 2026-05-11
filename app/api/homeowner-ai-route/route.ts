import { NextResponse } from "next/server";

const LONG_DISTANCE_KM = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      serviceType,
      timeline,
      approxSqft,
      oneWayKm,
      city,
    } = body;

    const sqft = Number(approxSqft || 0);
    const distanceKm = Number(oneWayKm || 0);

    let urgencyLabel = "Standard";
    let installerType = "General Technician";
    let routeLabel = "Solo Route";
    let aiScore = 50;

    if (
      timeline === "asap" ||
      timeline === "this_week"
    ) {
      urgencyLabel = "Fast Priority";
      aiScore += 20;
    }

    if (distanceKm >= LONG_DISTANCE_KM) {
      installerType = "Long Distance Technician";
      aiScore += 15;
    }

    if (
      serviceType?.includes("repair") ||
      serviceType?.includes("chip") ||
      serviceType?.includes("seams")
    ) {
      installerType = "Repair Specialist";
      aiScore += 10;
    }

    if (
      serviceType?.includes("countertop") ||
      serviceType?.includes("full_kitchen_upgrade")
    ) {
      installerType = "Countertop Installer";
      aiScore += 10;
    }

    if (
      serviceType?.includes("backsplash")
    ) {
      installerType = "Backsplash Specialist";
      aiScore += 10;
    }

    if (sqft >= 80) {
      aiScore += 10;
    }

    if (distanceKm <= 35) {
      routeLabel = "Possible Same-Day Group Route";
      aiScore += 10;
    }

    if (distanceKm > 35 && distanceKm <= 80) {
      routeLabel = "Regional Route";
    }

    if (distanceKm > 80) {
      routeLabel = "Dedicated Route";
    }

    if (aiScore > 100) aiScore = 100;

    return NextResponse.json({
      success: true,

      ai: {
        urgencyLabel,
        installerType,
        routeLabel,
        aiScore,

        summary: `
${installerType} recommended.
${urgencyLabel} priority.
${routeLabel}.
Approx ${distanceKm} km from dispatch area.
City: ${city || "Unknown"}.
        `.trim(),
      },
    });
  } catch (error) {
    console.error("AI homeowner route error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "AI route failed",
      },
      {
        status: 500,
      }
    );
  }
}