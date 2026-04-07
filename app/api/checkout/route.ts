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
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (customer_email) {
      await sendEmail({
        to: customer_email,
        subject: "Booking Confirmed - 1800TOPS",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Booking Confirmed</h2>
            <p>Hi ${customer_name || "Customer"},</p>
            <p>Your booking has been received.</p>
            <p><strong>Company:</strong> ${company_name || "N/A"}</p>
            <p><strong>Service:</strong> ${service_type || "N/A"}</p>
            <p><strong>Date:</strong> ${scheduled_date || "TBD"}</p>
            <p><strong>Time:</strong> ${scheduled_time || "TBD"}</p>
            <p><strong>Pickup:</strong> ${pickup_address || "N/A"}</p>
            <p><strong>Dropoff:</strong> ${dropoff_address || "N/A"}</p>
            <p><strong>Total:</strong> $${total_price || 0}</p>
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
          <p><strong>Customer:</strong> ${customer_name || "N/A"}</p>
          <p><strong>Email:</strong> ${customer_email || "N/A"}</p>
          <p><strong>Company:</strong> ${company_name || "N/A"}</p>
          <p><strong>Service:</strong> ${service_type || "N/A"}</p>
          <p><strong>Date:</strong> ${scheduled_date || "TBD"}</p>
          <p><strong>Time:</strong> ${scheduled_time || "TBD"}</p>
          <p><strong>Pickup:</strong> ${pickup_address || "N/A"}</p>
          <p><strong>Dropoff:</strong> ${dropoff_address || "N/A"}</p>
          <p><strong>Total:</strong> $${total_price || 0}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Booking created and emails sent",
      booking: data,
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