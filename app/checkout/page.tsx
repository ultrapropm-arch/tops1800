"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@/utils/supabase/client";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const HST_RATE = 0.13;
const CUSTOMER_JOB_MINIMUM = 210;

const PAYMENT_EMAIL = "info@1800tops.com";
const ADMIN_NOTIFICATION_EMAIL = "ultrapropm@gmail.com";
const ADMIN_PHONE = "647-913-0480";

type PaymentMethod =
  | ""
  | "creditDebit"
  | "etransfer"
  | "cashPickup"
  | "chequePickup"
  | "weeklyInvoice";

type SendEmailParams = {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  type?:
    | "assignment"
    | "completion"
    | "incomplete"
    | "resume_request"
    | "installer_accepted"
    | "new_job_available"
    | "standard";
  sendAdminCopy?: boolean;
  sendApprovedInstallers?: boolean;
  jobId?: string;
};

function parseNumber(value: string | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | null) {
  if (!value) return [];
  return value
    .split(" | ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getTimelineLabel(params: {
  timeline: string;
  scheduledDate?: string;
  pickupTimeSlot?: string;
}) {
  if (params.timeline === "sameDay") {
    return `Same Day${params.pickupTimeSlot ? ` • ${params.pickupTimeSlot}` : ""}`;
  }

  if (params.timeline === "nextDay") {
    return `Next Day${params.pickupTimeSlot ? ` • ${params.pickupTimeSlot}` : ""}`;
  }

  if (params.timeline === "scheduled") {
    const pieces = ["Scheduled"];
    if (params.scheduledDate) pieces.push(params.scheduledDate);
    if (params.pickupTimeSlot) pieces.push(params.pickupTimeSlot);
    return pieces.join(" • ");
  }

  return "Not provided";
}

function getPaymentLabel(method: PaymentMethod) {
  switch (method) {
    case "creditDebit":
      return "Credit / Debit Card";
    case "etransfer":
      return "E-Transfer";
    case "cashPickup":
      return "Cash Pickup";
    case "chequePickup":
      return "Cheque Pickup";
    case "weeklyInvoice":
      return "Weekly Invoice";
    default:
      return "Not selected";
  }
}

function getStatusFromPaymentMethod(method: PaymentMethod) {
  if (method === "creditDebit") return "pending_payment";
  if (method === "weeklyInvoice") return "available";
  return "available";
}

function buildConfirmationUrl(params: {
  jobGroupId: number;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  companyName: string;
  phoneNumber: string;
  jobsCount: number;
}) {
  const qs = new URLSearchParams({
    group: String(params.jobGroupId),
    total: formatMoney(params.finalTotal),
    payment: params.paymentMethod,
    paymentLabel: getPaymentLabel(params.paymentMethod),
    customerName: params.customerName || "",
    customerEmail: params.customerEmail || "",
    companyName: params.companyName || "",
    phoneNumber: params.phoneNumber || "",
    jobsCount: String(params.jobsCount),
  });

  return `/confirmation?${qs.toString()}`;
}

async function sendEmail(params: SendEmailParams) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Email failed");
  }

  return data;
}

function bookedConfirmationHtml(params: {
  customerName: string;
  paymentLabel: string;
  jobsHtml: string;
  finalTotal: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Booking Confirmed</h2>
      <p>Hello ${params.customerName || "Customer"},</p>
      <p>Your booking has been received.</p>
      <p><strong>Payment Method:</strong> ${params.paymentLabel}</p>
      ${params.jobsHtml}
      <h3 style="margin-top: 18px;">Final Total: $${params.finalTotal}</h3>
      ${
        params.paymentLabel === "E-Transfer"
          ? `<p><strong>E-Transfer Email:</strong> ${PAYMENT_EMAIL}</p>`
          : ""
      }
      ${
        params.paymentLabel === "Weekly Invoice"
          ? `<p><strong>Billing Email:</strong> ${PAYMENT_EMAIL}</p>`
          : ""
      }
      <p style="margin-top: 18px;">Thank you for booking with 1800TOPS.</p>
    </div>
  `;
}

function cardPendingEmailHtml(params: {
  customerName: string;
  jobsHtml: string;
  finalTotal: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Booking Started</h2>
      <p>Hello ${params.customerName || "Customer"},</p>
      <p>Your booking has been created and is waiting for card payment.</p>
      ${params.jobsHtml}
      <h3 style="margin-top: 18px;">Final Total: $${params.finalTotal}</h3>
      <p>Please complete your payment on the Stripe checkout page.</p>
    </div>
  `;
}

function adminNotificationHtml(params: {
  customerName: string;
  customerEmail: string;
  companyName: string;
  phoneNumber: string;
  paymentLabel: string;
  jobsHtml: string;
  finalTotal: string;
  jobGroupId: number;
  status: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>New Booking Received</h2>
      <p><strong>Customer:</strong> ${params.customerName || "-"}</p>
      <p><strong>Email:</strong> ${params.customerEmail || "-"}</p>
      <p><strong>Phone:</strong> ${params.phoneNumber || "-"}</p>
      <p><strong>Company:</strong> ${params.companyName || "-"}</p>
      <p><strong>Payment Method:</strong> ${params.paymentLabel}</p>
      <p><strong>Status:</strong> ${params.status}</p>
      <p><strong>Job Group ID:</strong> ${params.jobGroupId}</p>
      ${params.jobsHtml}
      <h3 style="margin-top: 18px;">Final Total: $${params.finalTotal}</h3>
    </div>
  `;
}

function installerNewJobHtml(params: {
  customerName: string;
  companyName: string;
  paymentLabel: string;
  jobsHtml: string;
  finalTotal: string;
  jobGroupId: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>New Available Job</h2>
      <p>A new job is now available in the installer portal.</p>
      <p><strong>Customer:</strong> ${params.customerName || "-"}</p>
      <p><strong>Company:</strong> ${params.companyName || "-"}</p>
      <p><strong>Payment Method:</strong> ${params.paymentLabel}</p>
      <p><strong>Job Group ID:</strong> ${params.jobGroupId}</p>
      ${params.jobsHtml}
      <h3 style="margin-top: 18px;">Booking Value: $${params.finalTotal}</h3>
      <p>Please log in to the installer portal to review and accept this job if it fits your route.</p>
    </div>
  `;
}

function buildEmailJobHtml(params: {
  title: string;
  timelineLabel: string;
  serviceTypeLabel: string;
  pickupAddress: string;
  dropoffAddress?: string;
  addOnServices: string[];
  justServices: string[];
  total: number;
}) {
  const addOnsHtml =
    params.addOnServices.length > 0
      ? `<p><strong>Add-Ons:</strong> ${params.addOnServices.join(", ")}</p>`
      : "";

  const justServicesHtml =
    params.justServices.length > 0
      ? `<p><strong>Just Services:</strong> ${params.justServices.join(", ")}</p>`
      : "";

  const dropoffHtml = params.dropoffAddress
    ? `<p><strong>Drop Off:</strong> ${params.dropoffAddress}</p>`
    : "";

  return `
    <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 8px;">
      <h3 style="margin-top: 0;">${params.title}</h3>
      <p><strong>Timeline:</strong> ${params.timelineLabel}</p>
      <p><strong>Service:</strong> ${params.serviceTypeLabel || "-"}</p>
      <p><strong>Pick Up:</strong> ${params.pickupAddress || "-"}</p>
      ${dropoffHtml}
      ${addOnsHtml}
      ${justServicesHtml}
      <p><strong>Total:</strong> $${formatMoney(params.total)}</p>
    </div>
  `;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [isSaving, setIsSaving] = useState(false);

  const customerName = searchParams.get("customerName") || "";
  const customerEmail = searchParams.get("customerEmail") || "";
  const companyName = searchParams.get("companyName") || "";
  const phoneNumber = searchParams.get("phoneNumber") || "";

  const bookingDistanceTier = searchParams.get("bookingDistanceTier") || "";
  const maxServiceDistanceKm = searchParams.get("maxServiceDistanceKm") || "200";

  const timeline = searchParams.get("timeline") || "";
  const scheduledDate = searchParams.get("scheduledDate") || "";
  const pickupTimeSlot = searchParams.get("pickupTimeSlot") || "";

  const pickupAddress = searchParams.get("pickupAddress") || "";
  const dropoffAddress = searchParams.get("dropoffAddress") || "";

  const serviceType = searchParams.get("serviceType") || "";
  const serviceTypeLabel =
    searchParams.get("serviceTypeLabel") || serviceType || "";

  const sqft = parseNumber(searchParams.get("sqft"));
  const customerSqftRate = parseNumber(searchParams.get("customerSqftRate"));

  const servicePrice = parseNumber(searchParams.get("servicePrice"));
  const mileageCharge = parseNumber(searchParams.get("mileageCharge"));
  const customerAddOnTotal = parseNumber(searchParams.get("customerAddOnTotal"));
  const customerJustServiceTotal = parseNumber(
    searchParams.get("customerJustServiceTotal")
  );
  const returnFeeCharged = parseNumber(searchParams.get("returnFeeCharged"));

  const oneWayKm = parseNumber(searchParams.get("oneWayKm"));
  const roundTripKm = parseNumber(searchParams.get("roundTripKm"));
  const chargeableKm = parseNumber(searchParams.get("chargeableKm"));

  const sideNote = searchParams.get("sideNote") || "";

  const addOnList = parseList(searchParams.get("addOnServices"));
  const justServices = parseList(searchParams.get("justServices"));

  const installerServicePayout = parseNumber(
    searchParams.get("installerServicePayout")
  );
  const installerMileagePayout = parseNumber(
    searchParams.get("installerMileagePayout")
  );
  const installerTotalPayout = parseNumber(
    searchParams.get("installerTotalPayout")
  );

  const showSecondJob = searchParams.get("showSecondJob") === "true";

  const secondJobTimeline =
    searchParams.get("secondJobTimeline") || "scheduled";
  const secondJobScheduledDate =
    searchParams.get("secondJobScheduledDate") || "";
  const secondJobPickupTimeSlot =
    searchParams.get("secondJobPickupTimeSlot") || "";

  const secondAddress = searchParams.get("secondJobAddress") || "";
  const secondDropoffAddress =
    searchParams.get("secondJobDropoffAddress") || "";

  const secondJobServiceType = searchParams.get("secondJobServiceType") || "";
  const secondJobServiceTypeLabel =
    searchParams.get("secondJobServiceTypeLabel") || secondJobServiceType || "";

  const secondJobSqft = parseNumber(searchParams.get("secondJobSqft"));
  const secondJobCustomerSqftRate = parseNumber(
    searchParams.get("secondJobCustomerSqftRate")
  );

  const secondServicePrice = parseNumber(
    searchParams.get("secondJobServicePrice")
  );
  const secondMileageCharge = parseNumber(
    searchParams.get("secondJobMileageCharge")
  );
  const secondJobAddOnTotal = parseNumber(
    searchParams.get("secondJobAddOnTotal")
  );
  const secondJobJustServiceTotal = parseNumber(
    searchParams.get("secondJobJustServiceTotal")
  );

  const secondJobOneWayKm = parseNumber(searchParams.get("secondJobOneWayKm"));
  const secondJobRoundTripKm = parseNumber(
    searchParams.get("secondJobRoundTripKm")
  );
  const secondJobChargeableKm = parseNumber(
    searchParams.get("secondJobChargeableKm")
  );

  const secondJobSideNote = searchParams.get("secondJobSideNote") || "";

  const secondAddOns = parseList(searchParams.get("secondJobAddOns"));
  const secondJustServices = parseList(searchParams.get("secondJobJustServices"));

  const secondJobInstallerServicePayout = parseNumber(
    searchParams.get("secondJobInstallerServicePayout")
  );
  const secondJobInstallerMileagePayout = parseNumber(
    searchParams.get("secondJobInstallerMileagePayout")
  );
  const secondJobInstallerTotalPayout = parseNumber(
    searchParams.get("secondJobInstallerTotalPayout")
  );

  const [showMainJob, setShowMainJob] = useState(true);
  const [showSecondJobState, setShowSecondJobState] = useState(showSecondJob);

  const job1Pricing = useMemo(() => {
    const rawSubtotal =
      servicePrice +
      mileageCharge +
      customerAddOnTotal +
      customerJustServiceTotal +
      returnFeeCharged;

    const base =
      rawSubtotal > 0 ? Math.max(rawSubtotal, CUSTOMER_JOB_MINIMUM) : 0;

    const hst = base * HST_RATE;

    return {
      rawSubtotal,
      subtotal: base,
      hst,
      total: base + hst,
    };
  }, [
    servicePrice,
    mileageCharge,
    customerAddOnTotal,
    customerJustServiceTotal,
    returnFeeCharged,
  ]);

  const job2Pricing = useMemo(() => {
    if (!showSecondJobState) return null;

    const rawSubtotal =
      secondServicePrice +
      secondMileageCharge +
      secondJobAddOnTotal +
      secondJobJustServiceTotal;

    const base =
      rawSubtotal > 0 ? Math.max(rawSubtotal, CUSTOMER_JOB_MINIMUM) : 0;

    const hst = base * HST_RATE;

    return {
      rawSubtotal,
      subtotal: base,
      hst,
      total: base + hst,
    };
  }, [
    secondServicePrice,
    secondMileageCharge,
    secondJobAddOnTotal,
    secondJobJustServiceTotal,
    showSecondJobState,
  ]);

  const finalTotal =
    (showMainJob ? job1Pricing.total : 0) +
    (showSecondJobState && job2Pricing ? job2Pricing.total : 0);

  const mainTimelineLabel = getTimelineLabel({
    timeline,
    scheduledDate,
    pickupTimeSlot,
  });

  const secondTimelineLabel = getTimelineLabel({
    timeline: secondJobTimeline,
    scheduledDate: secondJobScheduledDate,
    pickupTimeSlot: secondJobPickupTimeSlot,
  });

  async function handleCardCheckout(jobGroupId: number) {
    if (!stripePromise) {
      throw new Error("Stripe publishable key is missing.");
    }

    const stripe = await stripePromise;

    if (!stripe) {
      throw new Error("Stripe failed to load.");
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(finalTotal * 100),
        jobGroupId,
        customerName,
        customerEmail,
        companyName,
        phoneNumber,
        confirmationUrl: buildConfirmationUrl({
          jobGroupId,
          finalTotal,
          paymentMethod,
          customerName,
          customerEmail,
          companyName,
          phoneNumber,
          jobsCount: (showMainJob ? 1 : 0) + (showSecondJobState ? 1 : 0),
        }),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "Failed to create Stripe checkout session.");
    }

    if (!data?.id) {
      throw new Error("Stripe session ID missing.");
    }

    const result = await stripe.redirectToCheckout({
      sessionId: data.id,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async function handleConfirmBooking() {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (!showMainJob && !showSecondJobState) {
      alert("You must keep at least one job.");
      return;
    }

    if (paymentMethod === "weeklyInvoice" && !companyName.trim()) {
      alert("Weekly invoice requires a company name.");
      return;
    }

    try {
      setIsSaving(true);

      const jobGroupId = Date.now();
      const bookings: Record<string, any>[] = [];
      let jobsHtml = "";

      if (showMainJob) {
        bookings.push({
          customer_name: customerName,
          customer_email: customerEmail,
          company_name: companyName,
          phone_number: phoneNumber,

          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,

          timeline,
          scheduled_date: scheduledDate || null,
          pickup_time_slot: pickupTimeSlot || null,

          service_type: serviceType || null,
          service_type_label: serviceTypeLabel || null,

          sqft,
          customer_sqft_rate: customerSqftRate,

          service_price: servicePrice,
          mileage_charge: mileageCharge,
          add_on_services: addOnList.join(" | "),
          just_services: justServices.join(" | "),
          customer_add_on_total: customerAddOnTotal,
          customer_just_service_total: customerJustServiceTotal,
          return_fee_charged: returnFeeCharged,

          one_way_km: oneWayKm,
          round_trip_km: roundTripKm,
          chargeable_km: chargeableKm,

          subtotal: job1Pricing.subtotal,
          hst_amount: job1Pricing.hst,
          final_total: Number(formatMoney(job1Pricing.total)),

          installer_service_payout: installerServicePayout,
          installer_mileage_payout: installerMileagePayout,
          installer_total_payout: installerTotalPayout,

          side_note: sideNote || null,
          job_group_id: jobGroupId,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "creditDebit" ? "pending" : "not_required",
          status: getStatusFromPaymentMethod(paymentMethod),
        });

        jobsHtml += buildEmailJobHtml({
          title: "Job 1",
          timelineLabel: mainTimelineLabel,
          serviceTypeLabel,
          pickupAddress,
          dropoffAddress,
          addOnServices: addOnList,
          justServices,
          total: job1Pricing.total,
        });
      }

      if (showSecondJobState && job2Pricing) {
        bookings.push({
          customer_name: customerName,
          customer_email: customerEmail,
          company_name: companyName,
          phone_number: phoneNumber,

          pickup_address: secondAddress,
          dropoff_address: secondDropoffAddress || null,

          timeline: secondJobTimeline || null,
          scheduled_date: secondJobScheduledDate || null,
          pickup_time_slot: secondJobPickupTimeSlot || null,

          service_type: secondJobServiceType || null,
          service_type_label: secondJobServiceTypeLabel || null,

          sqft: secondJobSqft,
          customer_sqft_rate: secondJobCustomerSqftRate,

          service_price: secondServicePrice,
          mileage_charge: secondMileageCharge,
          add_on_services: secondAddOns.join(" | "),
          just_services: secondJustServices.join(" | "),
          customer_add_on_total: secondJobAddOnTotal,
          customer_just_service_total: secondJobJustServiceTotal,

          one_way_km: secondJobOneWayKm,
          round_trip_km: secondJobRoundTripKm,
          chargeable_km: secondJobChargeableKm,

          subtotal: job2Pricing.subtotal,
          hst_amount: job2Pricing.hst,
          final_total: Number(formatMoney(job2Pricing.total)),

          installer_service_payout: secondJobInstallerServicePayout,
          installer_mileage_payout: secondJobInstallerMileagePayout,
          installer_total_payout: secondJobInstallerTotalPayout,

          side_note: secondJobSideNote || null,
          job_group_id: jobGroupId,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "creditDebit" ? "pending" : "not_required",
          status: getStatusFromPaymentMethod(paymentMethod),
        });

        jobsHtml += buildEmailJobHtml({
          title: "Job 2",
          timelineLabel: secondTimelineLabel,
          serviceTypeLabel: secondJobServiceTypeLabel,
          pickupAddress: secondAddress,
          dropoffAddress: secondDropoffAddress,
          addOnServices: secondAddOns,
          justServices: secondJustServices,
          total: job2Pricing.total,
        });
      }

      const { data: insertedBookings, error } = await supabase
        .from("bookings")
        .insert(bookings)
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      const firstJobId =
        insertedBookings && insertedBookings.length > 0
          ? String(insertedBookings[0].id)
          : String(jobGroupId);

      const jobsCount = (showMainJob ? 1 : 0) + (showSecondJobState ? 1 : 0);
      const confirmationUrl = buildConfirmationUrl({
        jobGroupId,
        finalTotal,
        paymentMethod,
        customerName,
        customerEmail,
        companyName,
        phoneNumber,
        jobsCount,
      });

      if (paymentMethod === "creditDebit") {
        await Promise.all([
          sendEmail({
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: `New Card Booking Pending Payment${
              customerName ? ` - ${customerName}` : ""
            }`,
            html: adminNotificationHtml({
              customerName,
              customerEmail,
              companyName,
              phoneNumber,
              paymentLabel: getPaymentLabel(paymentMethod),
              jobsHtml,
              finalTotal: formatMoney(finalTotal),
              jobGroupId,
              status: "pending_payment",
            }),
            type: "standard",
          }),
          customerEmail
            ? sendEmail({
                to: customerEmail,
                subject: "Booking Started - Payment Required",
                html: cardPendingEmailHtml({
                  customerName,
                  jobsHtml,
                  finalTotal: formatMoney(finalTotal),
                }),
                type: "standard",
              })
            : Promise.resolve(),
        ]);

        await handleCardCheckout(jobGroupId);
        return;
      }

      await Promise.all([
        customerEmail
          ? sendEmail({
              to: customerEmail,
              subject: "Booking Confirmed",
              html: bookedConfirmationHtml({
                customerName,
                paymentLabel: getPaymentLabel(paymentMethod),
                jobsHtml,
                finalTotal: formatMoney(finalTotal),
              }),
              type: "standard",
            })
          : Promise.resolve(),
        sendEmail({
          to: ADMIN_NOTIFICATION_EMAIL,
          subject: `New Booking Received${customerName ? ` - ${customerName}` : ""}`,
          html: adminNotificationHtml({
            customerName,
            customerEmail,
            companyName,
            phoneNumber,
            paymentLabel: getPaymentLabel(paymentMethod),
            jobsHtml,
            finalTotal: formatMoney(finalTotal),
            jobGroupId,
            status: "available",
          }),
          type: "standard",
        }),
        sendEmail({
          to: ADMIN_NOTIFICATION_EMAIL,
          subject: `New Available Job - Group ${jobGroupId}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #111;">
              <h2>New Available Job</h2>
              <p>A new job is now available in the installer portal.</p>
              ${jobsHtml}
              <p><strong>Booking Value:</strong> $${formatMoney(finalTotal)}</p>
            </div>
          `,
          type: "new_job_available",
          sendApprovedInstallers: true,
          jobId: firstJobId,
        }),
      ]);

      router.push(confirmationUrl);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-yellow-500 mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-yellow-500 text-xl mb-4">Customer Details</h2>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p className="text-zinc-500">Name</p>
                  <p>{customerName || "-"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Email</p>
                  <p>{customerEmail || "-"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Company</p>
                  <p>{companyName || "-"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Phone</p>
                  <p>{phoneNumber || "-"}</p>
                </div>
              </div>

              {(bookingDistanceTier || maxServiceDistanceKm) && (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-400">
                  <p>Distance Tier: {bookingDistanceTier || "-"}</p>
                  <p>Max Service Distance: {maxServiceDistanceKm} km</p>
                </div>
              )}
            </div>

            {showMainJob && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 relative">
                <button
                  type="button"
                  onClick={() => setShowMainJob(false)}
                  className="absolute top-4 right-4 text-red-500 text-sm"
                >
                  Remove
                </button>

                <h2 className="text-yellow-500 text-xl mb-4">Job 1</h2>

                <div className="space-y-2 text-sm text-gray-300">
                  <p>Timeline: {mainTimelineLabel}</p>
                  <p>Service: {serviceTypeLabel || "-"}</p>
                  <p>Pick Up: {pickupAddress || "-"}</p>
                  <p>Drop Off: {dropoffAddress || "-"}</p>
                  {sqft > 0 && (
                    <p>
                      Size: {sqft} sqft
                      {customerSqftRate > 0
                        ? ` @ $${formatMoney(customerSqftRate)}/sqft`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service</span>
                    <span>${formatMoney(servicePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mileage</span>
                    <span>${formatMoney(mileageCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Add-ons</span>
                    <span>${formatMoney(customerAddOnTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Just Services</span>
                    <span>${formatMoney(customerJustServiceTotal)}</span>
                  </div>
                  {returnFeeCharged > 0 && (
                    <div className="flex justify-between">
                      <span>Return Fee</span>
                      <span>${formatMoney(returnFeeCharged)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${formatMoney(job1Pricing.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HST</span>
                    <span>${formatMoney(job1Pricing.hst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-yellow-400">
                    <span>Total</span>
                    <span>${formatMoney(job1Pricing.total)}</span>
                  </div>
                </div>

                {addOnList.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-yellow-400 font-semibold mb-2">Add-Ons</p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {addOnList.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {justServices.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-yellow-400 font-semibold mb-2">
                      Just Services
                    </p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {justServices.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {sideNote && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-yellow-400 font-semibold mb-2">Side Note</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {sideNote}
                    </p>
                  </div>
                )}
              </div>
            )}

            {showSecondJobState && job2Pricing && (
              <div className="rounded-2xl border border-yellow-500/30 bg-black p-6 relative">
                <button
                  type="button"
                  onClick={() => setShowSecondJobState(false)}
                  className="absolute top-4 right-4 text-red-500 text-sm"
                >
                  Remove
                </button>

                <h2 className="text-yellow-500 text-xl mb-4">Job 2</h2>

                <div className="space-y-2 text-sm text-gray-300">
                  <p>Timeline: {secondTimelineLabel}</p>
                  <p>Service: {secondJobServiceTypeLabel || "-"}</p>
                  <p>Address: {secondAddress || "-"}</p>
                  {secondDropoffAddress && <p>Drop Off: {secondDropoffAddress}</p>}
                  {secondJobSqft > 0 && (
                    <p>
                      Size: {secondJobSqft} sqft
                      {secondJobCustomerSqftRate > 0
                        ? ` @ $${formatMoney(secondJobCustomerSqftRate)}/sqft`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service</span>
                    <span>${formatMoney(secondServicePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mileage</span>
                    <span>${formatMoney(secondMileageCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Add-ons</span>
                    <span>${formatMoney(secondJobAddOnTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Just Services</span>
                    <span>${formatMoney(secondJobJustServiceTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${formatMoney(job2Pricing.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HST</span>
                    <span>${formatMoney(job2Pricing.hst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-yellow-400">
                    <span>Total</span>
                    <span>${formatMoney(job2Pricing.total)}</span>
                  </div>
                </div>

                {secondAddOns.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-yellow-400 font-semibold mb-2">Add-Ons</p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {secondAddOns.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {secondJustServices.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-yellow-400 font-semibold mb-2">
                      Just Services
                    </p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {secondJustServices.map((item) => (
                        <p key={item}>• {item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {secondJobSideNote && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-yellow-400 font-semibold mb-2">Side Note</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {secondJobSideNote}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-yellow-500 mb-4 text-xl">Payment Method</h2>

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-black border border-zinc-700 p-3 rounded-xl"
              >
                <option value="">Select Payment</option>
                <option value="creditDebit">Credit / Debit Card</option>
                <option value="etransfer">E-Transfer</option>
                <option value="cashPickup">Cash Pickup</option>
                <option value="chequePickup">Cheque Pickup</option>
                <option value="weeklyInvoice">Weekly Invoice</option>
              </select>

              <div className="mt-4 text-sm text-gray-400 space-y-2">
                <p>• Card redirects to secure Stripe checkout.</p>
                <p>• Weekly Invoice is best for approved company accounts.</p>
                <p>• Cash and cheque pickup depend on your distance and order tier.</p>

                {paymentMethod === "etransfer" && (
                  <div className="rounded-xl border border-yellow-500/30 bg-black p-4 text-sm">
                    <p className="text-yellow-400 font-semibold mb-2">
                      E-Transfer Instructions
                    </p>
                    <p>
                      Send payment to:{" "}
                      <span className="text-white font-medium">{PAYMENT_EMAIL}</span>
                    </p>
                    <p className="mt-1">
                      Please include your name and phone number in the e-transfer note.
                    </p>
                  </div>
                )}

                {paymentMethod === "cashPickup" && (
                  <div className="rounded-xl border border-yellow-500/30 bg-black p-4 text-sm">
                    <p className="text-yellow-400 font-semibold mb-2">Cash Pickup</p>
                    <p>Our team will confirm pickup details before the job is scheduled.</p>
                    <p className="mt-1">
                      Support: <span className="text-white font-medium">{ADMIN_PHONE}</span>
                    </p>
                  </div>
                )}

                {paymentMethod === "chequePickup" && (
                  <div className="rounded-xl border border-yellow-500/30 bg-black p-4 text-sm">
                    <p className="text-yellow-400 font-semibold mb-2">Cheque Pickup</p>
                    <p>Please have the cheque ready for pickup when confirmed by our team.</p>
                    <p className="mt-1">
                      Support: <span className="text-white font-medium">{ADMIN_PHONE}</span>
                    </p>
                  </div>
                )}

                {paymentMethod === "weeklyInvoice" && (
                  <div className="rounded-xl border border-yellow-500/30 bg-black p-4 text-sm">
                    <p className="text-yellow-400 font-semibold mb-2">Weekly Invoice</p>
                    <p>Approved company accounts will be billed weekly.</p>
                    <p className="mt-1">
                      Billing email:{" "}
                      <span className="text-white font-medium">{PAYMENT_EMAIL}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sticky top-10 h-fit">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-yellow-500 text-xl mb-4">Final Total</h2>

              <div className="space-y-3 text-sm">
                {showMainJob && (
                  <div className="flex justify-between">
                    <span>Job 1</span>
                    <span>${formatMoney(job1Pricing.total)}</span>
                  </div>
                )}

                {showSecondJobState && job2Pricing && (
                  <div className="flex justify-between">
                    <span>Job 2</span>
                    <span>${formatMoney(job2Pricing.total)}</span>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 flex justify-between text-2xl font-bold text-yellow-500">
                  <span>Total</span>
                  <span>${formatMoney(finalTotal)}</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">Selected Payment</p>
                <p className="text-base text-white mt-1">
                  {getPaymentLabel(paymentMethod)}
                </p>
              </div>

              {paymentMethod === "etransfer" && (
                <div className="mt-4 rounded-xl border border-yellow-500/30 bg-black p-4">
                  <p className="text-sm text-zinc-500">E-Transfer Email</p>
                  <p className="text-white font-medium mt-1">{PAYMENT_EMAIL}</p>
                </div>
              )}

              {paymentMethod === "cashPickup" && (
                <div className="mt-4 rounded-xl border border-yellow-500/30 bg-black p-4">
                  <p className="text-sm text-zinc-500">Pickup Support</p>
                  <p className="text-white font-medium mt-1">{ADMIN_PHONE}</p>
                </div>
              )}

              {paymentMethod === "weeklyInvoice" && (
                <div className="mt-4 rounded-xl border border-yellow-500/30 bg-black p-4">
                  <p className="text-sm text-zinc-500">Invoice Billing Email</p>
                  <p className="text-white font-medium mt-1">{PAYMENT_EMAIL}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSaving}
                className="w-full mt-6 bg-yellow-500 text-black py-4 rounded-xl font-semibold disabled:opacity-60"
              >
                {isSaving ? "Processing..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white p-6">
          Loading checkout...
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}