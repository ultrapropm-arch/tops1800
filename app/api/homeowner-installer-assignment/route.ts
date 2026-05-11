import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const FROM_EMAIL = "1800TOPS <info@mail.1800tops.com>";

function safe(value: any) {
  return value ? String(value) : "-";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      jobId,
      jobNumber,
      technicianName,
      technicianPhone,
      technicianEmail,
      serviceType,
      customerName,
      customerPhone,
      address,
      city,
      scheduledDate,
      scheduledTime,
    } = body;

    if (!jobId || !technicianEmail) {
      return NextResponse.json(
        { success: false, error: "Missing jobId or technicianEmail" },
        { status: 400 }
      );
    }

    const completionToken = crypto.randomBytes(24).toString("hex");

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const completionLink = `${siteUrl}/homeowner-complete?job=${encodeURIComponent(
      jobNumber || jobId
    )}&token=${completionToken}`;

    const { error } = await supabase
      .from("homeowner_bookings")
      .update({
        technician_name: technicianName,
        technician_phone: technicianPhone,
        technician_email: technicianEmail,
        completion_token: completionToken,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { success: false, error: "Could not update homeowner job" },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: technicianEmail,
      subject: `1800TOPS Job Assigned - ${safe(jobNumber)}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
          <h2>1800TOPS Homeowner Job Assigned</h2>

          <p>Hi ${safe(technicianName)},</p>

          <p>You have been assigned a homeowner service job.</p>

          <div style="background:#f7f7f7;border:1px solid #ddd;border-radius:12px;padding:16px;margin:20px 0">
            <p><strong>Job Number:</strong> ${safe(jobNumber)}</p>
            <p><strong>Service:</strong> ${safe(serviceType)}</p>
            <p><strong>Customer:</strong> ${safe(customerName)}</p>
            <p><strong>Customer Phone:</strong> ${safe(customerPhone)}</p>
            <p><strong>Address:</strong> ${safe(address)}, ${safe(city)}</p>
            <p><strong>Scheduled Date:</strong> ${safe(scheduledDate)}</p>
            <p><strong>Scheduled Time:</strong> ${safe(scheduledTime)}</p>
          </div>

          <p>When the job is finished, click the button below to upload one completion photo and mark the job complete.</p>

          <p style="margin:24px 0">
            <a href="${completionLink}" style="background:#facc15;color:#000;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;display:inline-block">
              Complete Job
            </a>
          </p>

          <p style="font-size:13px;color:#555">
            Do not share this link. It is only for completing this assigned job.
          </p>

          <p>Thank you,<br/><strong>1800TOPS</strong></p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      completionLink,
    });
  } catch (error) {
    console.error("Homeowner installer assignment error:", error);

    return NextResponse.json(
      { success: false, error: "Installer assignment email failed" },
      { status: 500 }
    );
  }
}