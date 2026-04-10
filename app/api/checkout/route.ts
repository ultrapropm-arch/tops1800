import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customer_name,
      customer_email,
      company_name,
      pickup_address,
      dropoff_address,
      service_type,
      scheduled_date,
      scheduled_time,
      total_price,
      job_id,
      job_group_id,
    } = body;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          customer_name,
          customer_email,
          company_name,
          pickup_address,
          dropoff_address,
          service_type,
          scheduled_date,
          scheduled_time,
          total_price,
          job_id: job_id || null,
          job_group_id: job_group_id || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    const bookingId = data?.id || "";
    const bookingJobId = data?.job_id || job_id || "";
    const bookingGroupId = data?.job_group_id || job_group_id || "";

    if (customer_email) {
      await sendEmail({
        to: customer_email,
        subject: "Booking Confirmed - 1800TOPS",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Booking Confirmed</h2>
            <p>Hi ${customer_name || "Customer"},</p>
            <p>Your booking has been received.</p>

            <p><strong>Booking ID:</strong> ${bookingId || "N/A"}</p>
            <p><strong>Job ID:</strong> ${bookingJobId || "N/A"}</p>
            <p><strong>Job Group ID:</strong> ${bookingGroupId || "N/A"}</p>

            <p><strong>Company:</strong> ${company_name || "N/A"}</p>
            <p><strong>Service:</strong> ${service_type || "N/A"}</p>
            <p><strong>Date:</strong> ${scheduled_date || "TBD"}</p>
            <p><strong>Time:</strong> ${scheduled_time || "TBD"}</p>
            <p><strong>Pickup:</strong> ${pickup_address || "N/A"}</p>
            <p><strong>Dropoff:</strong> ${dropoff_address || "N/A"}</p>
            <p><strong>Total:</strong> $${Number(total_price || 0).toFixed(2)}</p>

            <hr />

            <p><strong>Important:</strong></p>
            <ul>
              <li>Installer waiting time may be charged</li>
              <li>Please ensure all countertop pieces are counted and organized for pickup</li>
              <li>Please provide any paperwork to the installer at pickup if required</li>
            </ul>

            <p>Thank you,<br />1800TOPS</p>
          </div>
        `,
      });
    }

    await sendEmail({
      to: "info@1800tops.com",
      subject: "New Booking Received - 1800TOPS",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Booking Received</h2>

          <p><strong>Booking ID:</strong> ${bookingId || "N/A"}</p>
          <p><strong>Job ID:</strong> ${bookingJobId || "N/A"}</p>
          <p><strong>Job Group ID:</strong> ${bookingGroupId || "N/A"}</p>

          <p><strong>Customer:</strong> ${customer_name || "N/A"}</p>
          <p><strong>Email:</strong> ${customer_email || "N/A"}</p>
          <p><strong>Company:</strong> ${company_name || "N/A"}</p>
          <p><strong>Service:</strong> ${service_type || "N/A"}</p>
          <p><strong>Date:</strong> ${scheduled_date || "TBD"}</p>
          <p><strong>Time:</strong> ${scheduled_time || "TBD"}</p>
          <p><strong>Pickup:</strong> ${pickup_address || "N/A"}</p>
          <p><strong>Dropoff:</strong> ${dropoff_address || "N/A"}</p>
          <p><strong>Total:</strong> $${Number(total_price || 0).toFixed(2)}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Booking created and emails sent",
      booking: data,
      booking_id: bookingId,
      job_id: bookingJobId,
      job_group_id: bookingGroupId,
    });
  } catch (error: any) {
    console.error("Checkout API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}