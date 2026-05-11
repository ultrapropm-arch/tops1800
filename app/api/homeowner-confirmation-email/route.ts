import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createCalendarEvent } from "@/lib/google-calendar";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "ultrapropm@gmail.com";
const FROM_EMAIL = "1800TOPS <info@mail.1800tops.com>";
const HST_NUMBER = "720734235RT0001";
const ETRANSFER_EMAIL = "info@1800tops.com";

function safe(value: any) {
  return value !== undefined && value !== null && String(value).trim() !== ""
    ? String(value)
    : "-";
}

function paymentMethodLabel(value: string) {
  if (value === "credit_debit") return "Credit / Debit Card";
  if (value === "etransfer") return "E-Transfer";
  if (value === "cash_pickup") return "Cash Pickup";
  if (value === "no_payment_required") return "No payment required";
  if (value === "not_required") return "No payment required";
  return value || "No payment required";
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function resolveCalendarStart({
  scheduledDate,
  timeline,
}: {
  scheduledDate?: string;
  timeline?: string;
}) {
  const now = new Date();

  if (scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return new Date(`${scheduledDate}T09:00:00`);
  }

  if (timeline === "asap") {
    return addHours(now, 1);
  }

  if (timeline === "this_week") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  if (timeline === "next_week") {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      jobNumber,
      customerName,
      customerEmail,
      customerPhone,
      serviceLabel,
      projectAddress,
      city,
      postalCode,
      estimateLow,
      estimateHigh,
      requestType,
      timeline,
      preferredContact,
      notes,

      paymentMethod,
      paymentRequired,
      paymentAmount,
      paymentLabel,
      paymentStatus,
      etransferEmail,

      scheduledDate,
      scheduledTime,
    } = body;

    const finalPaymentMethod = paymentMethod || "no_payment_required";
    const finalPaymentStatus =
      paymentStatus || (paymentRequired ? "pending" : "not_required");

    const customerSubject = `1800TOPS Homeowner Request Received - ${safe(
      jobNumber
    )}`;

    const adminSubject = `New Homeowner Request - ${safe(jobNumber)}`;

    const paymentHtml = `
      <div style="background:#f7f7f7;border:1px solid #ddd;border-radius:12px;padding:16px;margin:20px 0">
        <h3 style="margin-top:0">Payment Details</h3>
        <p><strong>Payment Required:</strong> ${
          paymentRequired ? "Yes" : "No"
        }</p>
        <p><strong>Payment Type:</strong> ${safe(paymentLabel)}</p>
        <p><strong>Payment Method:</strong> ${paymentMethodLabel(
          finalPaymentMethod
        )}</p>
        <p><strong>Payment Status:</strong> ${safe(finalPaymentStatus)}</p>
        <p><strong>Payment Amount:</strong> ${safe(paymentAmount)}</p>
        ${
          finalPaymentMethod === "etransfer"
            ? `<div style="background:#eaf3ff;border:1px solid #8bbcff;border-radius:10px;padding:12px;margin-top:12px">
                <p style="margin:0"><strong>E-Transfer Instructions</strong></p>
                <p style="margin:8px 0 0 0">Send e-transfer to: <strong>${safe(
                  etransferEmail || ETRANSFER_EMAIL
                )}</strong></p>
                <p style="margin:8px 0 0 0">Please include your job number <strong>${safe(
                  jobNumber
                )}</strong> in the e-transfer notes.</p>
              </div>`
            : ""
        }
        ${
          finalPaymentMethod === "cash_pickup"
            ? `<div style="background:#fff8db;border:1px solid #e5c84b;border-radius:10px;padding:12px;margin-top:12px">
                <p style="margin:0"><strong>Cash Pickup</strong></p>
                <p style="margin:8px 0 0 0">1800TOPS will coordinate cash pickup arrangements after your booking is reviewed.</p>
              </div>`
            : ""
        }
      </div>
    `;

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
        <h2>1800TOPS Homeowner Request Received</h2>

        <p>Hi ${safe(customerName)},</p>

        <p>We received your homeowner request. Our team will review your project and contact you shortly.</p>

        <div style="background:#f7f7f7;border:1px solid #ddd;border-radius:12px;padding:16px;margin:20px 0">
          <h3 style="margin-top:0">Request Details</h3>
          <p><strong>Job Number:</strong> ${safe(jobNumber)}</p>
          <p><strong>Request Type:</strong> ${safe(requestType)}</p>
          <p><strong>Service:</strong> ${safe(serviceLabel)}</p>
          <p><strong>Address:</strong> ${safe(projectAddress)}, ${safe(
      city
    )} ${safe(postalCode)}</p>
          <p><strong>Preferred Timeline:</strong> ${safe(timeline)}</p>
          <p><strong>Preferred Contact:</strong> ${safe(preferredContact)}</p>
        </div>

        <div style="background:#fff8db;border:1px solid #e5c84b;border-radius:12px;padding:16px;margin:20px 0">
          <h3 style="margin-top:0">Estimated Starting Range</h3>
          <p style="font-size:22px;font-weight:bold;margin:0">${safe(
            estimateLow
          )} - ${safe(estimateHigh)}</p>
          <p>HST included where applicable.</p>
          <p><strong>HST Number:</strong> ${HST_NUMBER}</p>
        </div>

        ${paymentHtml}

        <p style="font-size:13px;color:#555">
          This is only a starting estimate. Final price is confirmed after estimate, measurements, photos, material details, access, removal, and scheduling are reviewed.
        </p>

        <p>Thank you,<br/><strong>1800TOPS</strong></p>
      </div>
    `;

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
        <h2>New Homeowner Request</h2>

        <div style="background:#f7f7f7;border:1px solid #ddd;border-radius:12px;padding:16px;margin:20px 0">
          <p><strong>Job Number:</strong> ${safe(jobNumber)}</p>
          <p><strong>Request Type:</strong> ${safe(requestType)}</p>
          <p><strong>Customer:</strong> ${safe(customerName)}</p>
          <p><strong>Phone:</strong> ${safe(customerPhone)}</p>
          <p><strong>Email:</strong> ${safe(customerEmail)}</p>
        </div>

        <div style="background:#fff8db;border:1px solid #e5c84b;border-radius:12px;padding:16px;margin:20px 0">
          <h3 style="margin-top:0">Project</h3>
          <p><strong>Service:</strong> ${safe(serviceLabel)}</p>
          <p><strong>Address:</strong> ${safe(projectAddress)}, ${safe(
      city
    )} ${safe(postalCode)}</p>
          <p><strong>Timeline:</strong> ${safe(timeline)}</p>
          <p><strong>Preferred Contact:</strong> ${safe(preferredContact)}</p>
          <p><strong>Estimated Range:</strong> ${safe(estimateLow)} - ${safe(
      estimateHigh
    )}</p>
          <p><strong>HST Number:</strong> ${HST_NUMBER}</p>
        </div>

        ${paymentHtml}

        <h3>Customer Notes</h3>
        <p>${safe(notes)}</p>
      </div>
    `;

    if (customerEmail) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: adminSubject,
      html: adminHtml,
    });

    try {
      const calendarStart = resolveCalendarStart({
        scheduledDate,
        timeline,
      });

      const calendarEnd = addHours(calendarStart, 2);

      await createCalendarEvent({
        title: `1800TOPS ${safe(jobNumber)} - ${safe(serviceLabel)}`,
        location: `${safe(projectAddress)}, ${safe(city)} ${safe(postalCode)}`,
        startDateTime: calendarStart.toISOString(),
        endDateTime: calendarEnd.toISOString(),
        description: `
Job Number: ${safe(jobNumber)}
Request Type: ${safe(requestType)}
Customer: ${safe(customerName)}
Phone: ${safe(customerPhone)}
Email: ${safe(customerEmail)}

Service: ${safe(serviceLabel)}
Address: ${safe(projectAddress)}, ${safe(city)} ${safe(postalCode)}
Timeline: ${safe(timeline)}
Preferred Contact: ${safe(preferredContact)}
Scheduled Time: ${safe(scheduledTime)}

Payment Required: ${paymentRequired ? "Yes" : "No"}
Payment Method: ${paymentMethodLabel(finalPaymentMethod)}
Payment Status: ${safe(finalPaymentStatus)}
Payment Amount: ${safe(paymentAmount)}

Notes:
${safe(notes)}
        `.trim(),
      });
    } catch (calendarError) {
      console.error("Google Calendar event failed:", calendarError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Homeowner confirmation email error:", error);

    return NextResponse.json(
      { success: false, error: "Homeowner confirmation email failed" },
      { status: 500 }
    );
  }
}