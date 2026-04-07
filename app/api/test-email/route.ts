import { NextResponse } from "next/server";
import { transporter } from "@/lib/mailer";

export async function GET() {
  try {
    await transporter.sendMail({
      from: '"1800TOPS Support" <info@1800tops.com>',
      to: "info@1800tops.com",
      subject: "1800TOPS test email",
      html: "<h1>✅ Email working!</h1><p>Zoho is connected.</p>",
    });

    return NextResponse.json({
      success: true,
      message: "Email sent",
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}