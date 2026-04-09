import { NextResponse } from "next/server";

type MileageRequestBody = {
  pickupAddress?: string;
  dropoffAddress?: string;
};

function getChargeableKm(oneWayKm: number) {
  const safeOneWayKm = Number.isFinite(oneWayKm) && oneWayKm > 0 ? oneWayKm : 0;
  const roundTripKm = safeOneWayKm * 2;

  if (roundTripKm <= 120) {
    return {
      roundTripKm,
      chargeableKm: 0,
    };
  }

  if (roundTripKm <= 320) {
    return {
      roundTripKm,
      chargeableKm: roundTripKm - 120,
    };
  }

  return {
    roundTripKm,
    chargeableKm: roundTripKm,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MileageRequestBody;
    const pickupAddress = body.pickupAddress?.trim();
    const dropoffAddress = body.dropoffAddress?.trim();

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { success: false, error: "Missing addresses" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing Google Maps API key" },
        { status: 500 }
      );
    }

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", pickupAddress);
    url.searchParams.set("destinations", dropoffAddress);
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    if (
      !res.ok ||
      data.status !== "OK" ||
      !data.rows?.[0]?.elements?.[0] ||
      data.rows[0].elements[0].status !== "OK"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to calculate distance",
          details: data,
        },
        { status: 400 }
      );
    }

    const meters = data.rows[0].elements[0].distance.value;
    const oneWayKm = Number((meters / 1000).toFixed(2));
    const { roundTripKm, chargeableKm } = getChargeableKm(oneWayKm);
    const mileageCharge = Number((chargeableKm * 1.5).toFixed(2));

    return NextResponse.json({
      success: true,
      oneWayKm,
      roundTripKm: Number(roundTripKm.toFixed(2)),
      chargeableKm: Number(chargeableKm.toFixed(2)),
      mileageCharge,
    });
  } catch (error) {
    console.error("Mileage API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to calculate mileage" },
      { status: 500 }
    );
  }
}