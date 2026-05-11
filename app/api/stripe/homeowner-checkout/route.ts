import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      jobNumber,
      serviceLabel,
      customerEmail,
      paymentAmount,
      successUrl,
      cancelUrl,
    } = body;

    const amountInCents = Math.round(Number(paymentAmount || 0) * 100);

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "Missing STRIPE_SECRET_KEY." },
        { status: 500 }
      );
    }

    if (!amountInCents || amountInCents < 50) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: amountInCents,
            product_data: {
              name: `1800TOPS Homeowner - ${serviceLabel || "Booking"}`,
              description: `Job Number: ${jobNumber}`,
            },
          },
        },
      ],
      metadata: {
        system: "homeowner",
        jobNumber: String(jobNumber || ""),
        serviceLabel: String(serviceLabel || ""),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Homeowner Stripe checkout error:", error);

    return NextResponse.json(
      { success: false, error: "Homeowner Stripe checkout failed." },
      { status: 500 }
    );
  }
}