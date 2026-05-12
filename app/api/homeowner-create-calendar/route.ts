import { NextResponse } from "next/server";
import { createCalendarEvent } from "@/lib/google-calendar";

function buildStartDateTime(date?: string, time?: string) {
  if (!date) return null;

  const cleanTime = String(time || "").trim();

  if (/^\d{2}:\d{2}$/.test(cleanTime)) {
    return new Date(`${date}T${cleanTime}:00`);
  }

  return new Date(`${date}T09:00:00`);
}

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
      jobNumber,
      customerPhone,
      customerEmail,
    } = body;

    if (!scheduledDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing scheduled date.",
        },
        { status: 400 }
      );
    }

    const start = buildStartDateTime(scheduledDate, scheduledTime);

    if (!start || Number.isNaN(start.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid scheduled date/time.",
        },
        { status: 400 }
      );
    }

    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const event = await createCalendarEvent({
      title: `1800TOPS Homeowner - ${serviceType || "Service"}`,
      description: `
Job: ${jobNumber || "-"}

Customer: ${customerName || "-"}
Phone: ${customerPhone || "-"}
Email: ${customerEmail || "-"}

Service: ${serviceType || "-"}
Time: ${scheduledTime || "Not specified"}

Notes:
${notes || "-"}
      `.trim(),
      location: [address, city].filter(Boolean).join(", "),
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    });

    return NextResponse.json({
      success: true,
      eventId: event?.id || null,
      eventLink: event?.htmlLink || null,
    });
  } catch (error) {
    console.error("Homeowner calendar event failed:", error);

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