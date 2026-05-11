import { NextResponse } from "next/server";
import { createCalendarEvent } from "@/lib/google-calendar";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customerName,
      serviceType,
      address,
      city,
      scheduledDate,
      scheduledTime,
      notes,
    } = body;

    const start = new Date(`${scheduledDate}T09:00:00`);

    const end = new Date(
      start.getTime() + 2 * 60 * 60 * 1000
    );

    await createCalendarEvent({
      title: `1800TOPS - ${serviceType}`,

      description: `
Customer: ${customerName}

Service: ${serviceType}

Time: ${scheduledTime || "Not specified"}

Notes:
${notes || "-"}
      `,

      location: `${address}, ${city}`,

      startDateTime: start.toISOString(),

      endDateTime: end.toISOString(),
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Calendar event failed",
      },
      {
        status: 500,
      }
    );
  }
}