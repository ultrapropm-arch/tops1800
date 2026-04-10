import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY in environment" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing STRIPE_WEBHOOK_SECRET in environment" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = await createClient();

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe-Signature header" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const bookingId = session.metadata?.booking_id || "";
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || "";

        if (bookingId) {
          const { error } = await supabase
            .from("bookings")
            .update({
              payment_status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId || null,
            })
            .eq("id", bookingId);

          if (error) {
            console.error("Error updating booking to paid:", error);
            return NextResponse.json(
              { error: "Failed to update booking" },
              { status: 500 }
            );
          }
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id || "";

        if (bookingId) {
          await supabase
            .from("bookings")
            .update({
              payment_status: "expired",
              stripe_session_id: session.id,
            })
            .eq("id", bookingId);
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const { error } = await supabase
          .from("bookings")
          .update({
            payment_status: "failed",
            stripe_payment_intent_id: paymentIntent.id,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("Error updating failed payment:", error);
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: error?.message || "Webhook failed" },
      { status: 500 }
    );
  }
}