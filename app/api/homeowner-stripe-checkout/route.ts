import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      jobNumber,
      customerEmail,
      serviceLabel,
      servicePrice,
      hstAmount,
      finalTotal,
      paymentLabel,
    } = body;

    const amountInCents = Math.round(Number(finalTotal || 0) * 100);

    if (!jobNumber || amountInCents < 50) {
      return NextResponse.json(
        { error: "Invalid homeowner payment request" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail || undefined,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: amountInCents,
            product_data: {
              name: paymentLabel || `1800TOPS Homeowner Payment`,
              description: `Job ${jobNumber} - ${serviceLabel}`,
            },
          },
        },
      ],
      metadata: {
        system: "homeowner",
        jobNumber: String(jobNumber),
        serviceLabel: String(serviceLabel || ""),
        servicePrice: String(servicePrice || 0),
        hstAmount: String(hstAmount || 0),
        finalTotal: String(finalTotal || 0),
        paymentLabel: String(paymentLabel || ""),
      },
      success_url: `${baseUrl}/homeowners/confirmation?job=${jobNumber}&paid=true&paymentMethod=credit_debit&paymentStatus=paid&paymentAmount=${finalTotal}`,
      cancel_url: `${baseUrl}/homeowners/confirmation?job=${jobNumber}&paid=false&paymentMethod=credit_debit&paymentStatus=cancelled&paymentAmount=${finalTotal}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Homeowner Stripe checkout error:", error);

    return NextResponse.json(
      { error: "Homeowner Stripe checkout failed" },
      { status: 500 }
    );
  }
}