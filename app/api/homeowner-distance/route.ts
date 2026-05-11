import { NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

type DistanceRequest = {
  originAddress?: string;
  destinationAddress?: string;
};

export async function POST(req: Request) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing GOOGLE_MAPS_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as DistanceRequest;

    const originAddress = body.originAddress?.trim();
    const destinationAddress = body.destinationAddress?.trim();

    if (!originAddress || !destinationAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "originAddress and destinationAddress are required",
        },
        { status: 400 }
      );
    }

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");

    url.searchParams.set("origins", originAddress);
    url.searchParams.set("destinations", destinationAddress);
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Maps request failed",
          status: response.status,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    const element = data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      return NextResponse.json(
        {
          success: false,
          error: "Could not calculate distance for this address",
          googleStatus: element?.status || data?.status,
        },
        { status: 400 }
      );
    }

    const oneWayMeters = Number(element.distance?.value || 0);
    const oneWayKm = Math.round((oneWayMeters / 1000) * 10) / 10;
    const roundTripKm = Math.round(oneWayKm * 2 * 10) / 10;

    const durationText = element.duration?.text || "";
    const distanceText = element.distance?.text || "";

    return NextResponse.json({
      success: true,
      originAddress,
      destinationAddress,
      oneWayKm,
      roundTripKm,
      distanceText,
      durationText,
      aiRouteNote:
        roundTripKm <= 40
          ? "Good same-day service route."
          : roundTripKm <= 120
          ? "Possible same-day route. Group with nearby jobs."
          : "Long-distance route. Schedule carefully or group with other jobs.",
    });
  } catch (error) {
    console.error("Homeowner distance error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Distance calculation failed",
      },
      { status: 500 }
    );
  }
}