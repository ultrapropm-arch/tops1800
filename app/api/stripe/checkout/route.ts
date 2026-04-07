import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY in environment" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await req.json();

    const amount = Number(body.amount);
    const customerEmail = body.customerEmail;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "1-800TOPS Booking",
              description: "Countertop installation",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/confirmation`,
      cancel_url: `${baseUrl}/checkout`,
    });

    return NextResponse.json({
      id: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Stripe error:", error);

    return NextResponse.json(
      { error: error.message || "Stripe failed" },
      { status: 500 }
    );
  }
}