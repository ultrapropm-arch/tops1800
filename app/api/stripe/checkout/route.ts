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

    const bookingId = body.bookingId || body.booking_id || "";
    const jobId = body.jobId || body.job_id || "";
    const jobGroupId = body.jobGroupId || body.job_group_id || body.group || "";

    const customerName = body.customerName || "";
    const companyName = body.companyName || "";
    const phoneNumber = body.phoneNumber || "";
    const payment = body.payment || "creditDebit";
    const paymentLabel = body.paymentLabel || "Credit / Debit Card";
    const pickupAddress = body.pickupAddress || "";
    const dropoffAddress = body.dropoffAddress || "";
    const timeline = body.timeline || "";
    const scheduledDate = body.scheduledDate || "";
    const pickupTimeSlot = body.pickupTimeSlot || "";
    const serviceType = body.serviceType || "";
    const serviceTypeLabel = body.serviceTypeLabel || "";

    const secondJobAddress = body.secondJobAddress || "";
    const secondJobDate = body.secondJobDate || "";
    const secondJobPickupTimeSlot = body.secondJobPickupTimeSlot || "";
    const secondJobServiceType = body.secondJobServiceType || "";
    const secondJobServiceTypeLabel = body.secondJobServiceTypeLabel || "";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://1800tops.com";

    const successParams = new URLSearchParams();

    if (bookingId) successParams.set("booking_id", String(bookingId));
    if (jobId) successParams.set("job_id", String(jobId));
    if (jobGroupId) {
      successParams.set("job_group_id", String(jobGroupId));
      successParams.set("group", String(jobGroupId));
    }

    if (customerName) successParams.set("customerName", String(customerName));
    if (customerEmail) successParams.set("customerEmail", String(customerEmail));
    if (companyName) successParams.set("companyName", String(companyName));
    if (phoneNumber) successParams.set("phoneNumber", String(phoneNumber));
    if (payment) successParams.set("payment", String(payment));
    if (paymentLabel) successParams.set("paymentLabel", String(paymentLabel));
    successParams.set("total", (amount / 100).toFixed(2));

    if (pickupAddress) successParams.set("pickupAddress", String(pickupAddress));
    if (dropoffAddress) successParams.set("dropoffAddress", String(dropoffAddress));
    if (timeline) successParams.set("timeline", String(timeline));
    if (scheduledDate) successParams.set("scheduledDate", String(scheduledDate));
    if (pickupTimeSlot) {
      successParams.set("pickupTimeSlot", String(pickupTimeSlot));
    }
    if (serviceType) successParams.set("serviceType", String(serviceType));
    if (serviceTypeLabel) {
      successParams.set("serviceTypeLabel", String(serviceTypeLabel));
    }

    if (secondJobAddress) {
      successParams.set("secondJobAddress", String(secondJobAddress));
    }
    if (secondJobDate) {
      successParams.set("secondJobDate", String(secondJobDate));
    }
    if (secondJobPickupTimeSlot) {
      successParams.set(
        "secondJobPickupTimeSlot",
        String(secondJobPickupTimeSlot)
      );
    }
    if (secondJobServiceType) {
      successParams.set("secondJobServiceType", String(secondJobServiceType));
    }
    if (secondJobServiceTypeLabel) {
      successParams.set(
        "secondJobServiceTypeLabel",
        String(secondJobServiceTypeLabel)
      );
    }

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
      success_url: `${baseUrl}/confirmation?${successParams.toString()}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        booking_id: String(bookingId || ""),
        job_id: String(jobId || ""),
        job_group_id: String(jobGroupId || ""),
        customer_email: String(customerEmail || ""),
      },
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