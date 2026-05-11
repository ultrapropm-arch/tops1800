"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ServiceType =
  | ""
  | "countertop_upgrade"
  | "countertop_replacement"
  | "countertop_repair"
  | "sink_cooktop_cutout"
  | "backsplash_service"
  | "full_kitchen_upgrade"
  | "remove_laminate"
  | "remove_laminate_dispose"
  | "remove_stone"
  | "remove_stone_dispose"
  | "remove_backsplash_tile"
  | "remove_backsplash_tile_dispose"
  | "drill_faucet_hole"
  | "fix_chip"
  | "remove_plumbing"
  | "silicone"
  | "granite_marble_sealing"
  | "polishing"
  | "general_cutting"
  | "reinstall_sink"
  | "fix_seams"
  | "sink_cutout"
  | "cooktop_cutout"
  | "not_sure";

type MaterialStatus = "" | "have_material" | "need_supply_install" | "not_sure";
type FirstStep = "" | "estimate" | "measurements" | "have_measurements" | "advice";
type ProjectStage = "" | "planning" | "ready_estimate" | "ready_measurements" | "ready_install";
type PaymentMethod = "" | "credit_debit" | "etransfer" | "cash_pickup";

const supabase = createClient();

const HST_RATE = 0.13;
const HST_NUMBER = "720734235RT0001";
const MEASUREMENT_DEPOSIT = 300;
const ETRANSFER_EMAIL = "info@1800tops.com";

const serviceLabels: Record<ServiceType, string> = {
  "": "",
  countertop_upgrade: "Kitchen countertop upgrade",
  countertop_replacement: "Countertop replacement",
  countertop_repair: "Countertop repair / service",
  sink_cooktop_cutout: "Sink or cooktop cutout",
  backsplash_service: "Backsplash service",
  full_kitchen_upgrade: "Full kitchen upgrade",
  remove_laminate: "Remove laminate",
  remove_laminate_dispose: "Remove laminate and dispose",
  remove_stone: "Remove stone",
  remove_stone_dispose: "Remove stone and dispose",
  remove_backsplash_tile: "Remove backsplash tile",
  remove_backsplash_tile_dispose: "Remove backsplash tile and dispose",
  drill_faucet_hole: "Drill faucet hole",
  fix_chip: "Fix chip",
  remove_plumbing: "Remove plumbing",
  silicone: "Silicone",
  granite_marble_sealing: "Granite/marble sealing",
  polishing: "Polishing",
  general_cutting: "General cutting",
  reinstall_sink: "Reinstall sink",
  fix_seams: "Fix seams",
  sink_cutout: "Sink cutout",
  cooktop_cutout: "Cooktop cutout",
  not_sure: "Not sure / need advice",
};

const startingPrices: Record<ServiceType, number> = {
  "": 0,
  countertop_upgrade: 300,
  countertop_replacement: 500,
  countertop_repair: 220,
  sink_cooktop_cutout: 300,
  backsplash_service: 300,
  full_kitchen_upgrade: 750,
  remove_laminate: 260,
  remove_laminate_dispose: 360,
  remove_stone: 350,
  remove_stone_dispose: 520,
  remove_backsplash_tile: 325,
  remove_backsplash_tile_dispose: 500,
  drill_faucet_hole: 200,
  fix_chip: 220,
  remove_plumbing: 250,
  silicone: 200,
  granite_marble_sealing: 200,
  polishing: 200,
  general_cutting: 250,
  reinstall_sink: 225,
  fix_seams: 250,
  sink_cutout: 300,
  cooktop_cutout: 300,
  not_sure: 0,
};

function money(value: number) {
  return "$" + value.toFixed(2);
}

async function getNextJobNumber() {
  const { data, error } = await supabase
    .from("homeowner_bookings")
    .select("job_number")
    .not("job_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data || data.length === 0) return "TOP1";

  let highest = 0;

  data.forEach((job) => {
    const number = parseInt(String(job.job_number || "").replace("TOP", ""));
    if (!isNaN(number) && number > highest) highest = number;
  });

  return `TOP${highest + 1}`;
}

export default function HomeownerBookingPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [serviceType, setServiceType] = useState<ServiceType>("");
  const [materialStatus, setMaterialStatus] = useState<MaterialStatus>("");
  const [firstStep, setFirstStep] = useState<FirstStep>("");
  const [projectStage, setProjectStage] = useState<ProjectStage>("");

  const [approxSqft, setApproxSqft] = useState("");
  const [timeline, setTimeline] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const estimate = useMemo(() => {
    const sqft = Number(approxSqft || 0);
    const base = startingPrices[serviceType] || 0;

    let rangeLow = base;
    let rangeHigh = base;

    if (
      serviceType === "countertop_upgrade" ||
      serviceType === "countertop_replacement"
    ) {
      rangeLow = Math.max(300, sqft * 10);
      rangeHigh = Math.max(500, sqft * 18);
    }

    if (serviceType === "backsplash_service") {
      rangeLow = Math.max(300, sqft * 10);
      rangeHigh = Math.max(450, sqft * 18);
    }

    if (serviceType === "full_kitchen_upgrade") {
      rangeLow = Math.max(750, sqft * 18);
      rangeHigh = Math.max(1500, sqft * 35);
    }

    const hstLow = rangeLow * HST_RATE;
    const hstHigh = rangeHigh * HST_RATE;

    return {
      rangeLow,
      rangeHigh,
      hstLow,
      hstHigh,
      totalLow: rangeLow + hstLow,
      totalHigh: rangeHigh + hstHigh,
    };
  }, [serviceType, approxSqft]);

  const requestType =
    firstStep === "estimate" ||
    firstStep === "measurements" ||
    projectStage === "ready_estimate" ||
    projectStage === "ready_measurements"
      ? "estimate"
      : "service";

  const requiresPayment =
    firstStep === "measurements" || requestType === "service";

  const paymentAmount =
    firstStep === "measurements" ? MEASUREMENT_DEPOSIT : estimate.totalLow;

  const paymentLabel =
    firstStep === "measurements"
      ? "Measurements deposit"
      : "Service payment";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!serviceType) {
      alert("Please select a service.");
      return;
    }

    if (requiresPayment && !paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    try {
      setSubmitting(true);

      const jobNumber = await getNextJobNumber();
      const serviceLabel = serviceLabels[serviceType];
      const servicePrice = startingPrices[serviceType] || 0;

      const fullNotes = `
Material status: ${materialStatus}
First step: ${firstStep}
Project stage: ${projectStage}
Approx sqft: ${approxSqft || "Not provided"}
Timeline: ${timeline}
Preferred contact: ${preferredContact}
Payment required: ${requiresPayment ? "Yes" : "No"}
Payment method: ${paymentMethod || "No payment required for estimate"}
Payment label: ${requiresPayment ? paymentLabel : "Estimate request"}
Payment amount: ${requiresPayment ? money(paymentAmount) : "$0.00"}
E-transfer email: ${paymentMethod === "etransfer" ? ETRANSFER_EMAIL : "N/A"}

Customer notes:
${notes || "No notes provided."}

Estimate low before HST: ${money(estimate.rangeLow)}
Estimate high before HST: ${money(estimate.rangeHigh)}
HST low: ${money(estimate.hstLow)}
HST high: ${money(estimate.hstHigh)}
Total low: ${money(estimate.totalLow)}
Total high: ${money(estimate.totalHigh)}
HST Number: ${HST_NUMBER}
      `.trim();

      const { error } = await supabase.from("homeowner_bookings").insert({
        job_number: jobNumber,
        request_type: requestType,
        status: paymentMethod === "credit_debit" ? "pending_payment" : "new",

        customer_name: customerName,
        customer_email: email,
        customer_phone: phone,

        address: projectAddress,
        city,
        postal_code: postalCode,

        service_type: serviceLabel,
        service_price: servicePrice,

        preferred_date: timeline,
        preferred_time: preferredContact,

        payment_method: paymentMethod || "no_payment_required",
        payment_status: requiresPayment ? "pending" : "not_required",
        payment_amount: requiresPayment ? paymentAmount : 0,

        notes: fullNotes,

        one_way_km: 0,
        round_trip_km: 0,
        ai_route_note:
          "Distance not calculated yet. Admin can update route manually.",
      });

      if (error) {
        console.error(error);
        alert("Booking failed. Check homeowner_bookings RLS insert policy.");
        setSubmitting(false);
        return;
      }

      await fetch("/api/homeowner-confirmation-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobNumber,
          customerName,
          customerEmail: email,
          customerPhone: phone,
          serviceLabel,
          projectAddress,
          city,
          postalCode,
          estimateLow: money(estimate.totalLow),
          estimateHigh: money(estimate.totalHigh),
          requestType,
          timeline,
          preferredContact,
          notes,
          paymentMethod: paymentMethod || "no_payment_required",
          paymentRequired: requiresPayment,
          paymentAmount: money(paymentAmount),
          paymentLabel,
          etransferEmail: ETRANSFER_EMAIL,
        }),
      });

      const params = new URLSearchParams({
        job: jobNumber,
        customerName,
        phone,
        email,
        projectAddress,
        city,
        postalCode,
        serviceType,
        serviceLabel,
        materialStatus,
        firstStep,
        projectStage,
        approxSqft,
        timeline,
        preferredContact,
        notes,
        estimateLow: estimate.totalLow.toFixed(2),
        estimateHigh: estimate.totalHigh.toFixed(2),
        hstNumber: HST_NUMBER,
        paymentMethod: paymentMethod || "no_payment_required",
        paymentRequired: String(requiresPayment),
        paymentAmount: paymentAmount.toFixed(2),
        paymentLabel,
      });

      if (requiresPayment && paymentMethod === "credit_debit") {
        const stripeResponse = await fetch("/api/homeowner-stripe-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobNumber,
            customerEmail: email,
            serviceLabel,
            servicePrice,
            hstAmount:
              firstStep === "measurements"
                ? MEASUREMENT_DEPOSIT * HST_RATE
                : estimate.hstLow,
            finalTotal: paymentAmount,
            paymentLabel,
          }),
        });

        const stripeData = await stripeResponse.json();

        if (stripeData?.url) {
          window.location.href = stripeData.url;
          return;
        }

        alert("Stripe checkout failed. Please try again or choose another payment method.");
        setSubmitting(false);
        return;
      }

      router.push(`/homeowners/confirmation?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting the homeowner booking.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
          1800TOPS Homeowners
        </p>

        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          On-Demand Homeowner Estimates, Measurements & Services
        </h1>

        <p className="mt-4 max-w-2xl text-gray-300">
          Get countertop help fast. Request an estimate, book measurements, or
          schedule homeowner services with the fastest installation turnaround
          possible.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-2xl font-bold">Contact Information</h2>

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Full name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Project address"
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
            required
          />

          <div className="grid gap-5 md:grid-cols-2">
            <input
              className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />

            <input
              className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
              placeholder="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          <h2 className="pt-4 text-2xl font-bold">Project Details</h2>

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
            required
          >
            <option value="">Select service needed</option>
            <option value="countertop_upgrade">Kitchen countertop upgrade</option>
            <option value="countertop_replacement">Countertop replacement</option>
            <option value="countertop_repair">Countertop repair / service</option>
            <option value="sink_cooktop_cutout">Sink or cooktop cutout</option>
            <option value="backsplash_service">Backsplash service</option>
            <option value="full_kitchen_upgrade">Full kitchen upgrade</option>
            <option value="remove_laminate">Remove laminate - $260</option>
            <option value="remove_laminate_dispose">Remove laminate and dispose - $360</option>
            <option value="remove_stone">Remove stone - $350</option>
            <option value="remove_stone_dispose">Remove stone and dispose - $520</option>
            <option value="remove_backsplash_tile">Remove backsplash tile - $325</option>
            <option value="remove_backsplash_tile_dispose">Remove backsplash tile and dispose - $500</option>
            <option value="drill_faucet_hole">Drill faucet hole - $200</option>
            <option value="fix_chip">Fix chip - $220</option>
            <option value="remove_plumbing">Remove plumbing - $250</option>
            <option value="silicone">Silicone - $200</option>
            <option value="granite_marble_sealing">Granite/marble sealing - $200</option>
            <option value="polishing">Polishing - $200</option>
            <option value="general_cutting">General cutting - $250</option>
            <option value="reinstall_sink">Reinstall sink - $225</option>
            <option value="fix_seams">Fix seams - $250</option>
            <option value="sink_cutout">Sink cutout - $300</option>
            <option value="cooktop_cutout">Cooktop cutout - $300</option>
            <option value="not_sure">Not sure / need advice</option>
          </select>

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={materialStatus}
            onChange={(e) => setMaterialStatus(e.target.value as MaterialStatus)}
            required
          >
            <option value="">Do you already have countertops/material?</option>
            <option value="have_material">Yes, I already have material</option>
            <option value="need_supply_install">No, I need supply + install</option>
            <option value="not_sure">Not sure yet</option>
          </select>

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={firstStep}
            onChange={(e) => setFirstStep(e.target.value as FirstStep)}
            required
          >
            <option value="">What do you need first?</option>
            <option value="estimate">Send someone for an estimate - no payment required</option>
            <option value="measurements">Book measurements - $300 deposit</option>
            <option value="have_measurements">I already have measurements</option>
            <option value="advice">I need help choosing options</option>
          </select>

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={projectStage}
            onChange={(e) => setProjectStage(e.target.value as ProjectStage)}
            required
          >
            <option value="">Project stage</option>
            <option value="planning">Just planning</option>
            <option value="ready_estimate">Ready for estimate</option>
            <option value="ready_measurements">Ready for measurements</option>
            <option value="ready_install">Ready to book install/service</option>
          </select>

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Approx square footage, if known"
            type="number"
            value={approxSqft}
            onChange={(e) => setApproxSqft(e.target.value)}
          />

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            required
          >
            <option value="">Preferred timeline</option>
            <option value="asap">As soon as possible</option>
            <option value="this_week">This week</option>
            <option value="next_week">Next week</option>
            <option value="two_four_weeks">2–4 weeks</option>
            <option value="planning_only">Planning only</option>
          </select>

          <select
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            value={preferredContact}
            onChange={(e) => setPreferredContact(e.target.value)}
            required
          >
            <option value="">Preferred contact method</option>
            <option value="phone">Phone call</option>
            <option value="text">Text message</option>
            <option value="email">Email</option>
          </select>

          {requiresPayment && (
            <>
              <h2 className="pt-4 text-2xl font-bold">Payment Method</h2>

              <select
                className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                required
              >
                <option value="">Select payment method</option>
                <option value="credit_debit">Credit / Debit Card</option>
                <option value="etransfer">E-Transfer ({ETRANSFER_EMAIL})</option>
                <option value="cash_pickup">Cash Pickup</option>
              </select>

              <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-5">
                <p className="font-bold text-yellow-300">
                  Payment Required: {money(paymentAmount)}
                </p>
                <p className="mt-2 text-sm text-gray-300">
                  {firstStep === "measurements"
                    ? "A $300 deposit is required to book measurements."
                    : "Full payment is required for homeowner service bookings."}
                </p>
              </div>

              {paymentMethod === "etransfer" && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
                  <p className="font-bold text-blue-300">E-Transfer Instructions</p>
                  <p className="mt-2 text-sm text-gray-300">
                    Send e-transfer to:
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {ETRANSFER_EMAIL}
                  </p>
                  <p className="mt-3 text-sm text-gray-400">
                    Include your job number in the transfer notes after submitting.
                  </p>
                </div>
              )}

              {paymentMethod === "cash_pickup" && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                  <p className="font-bold text-yellow-300">Cash Pickup</p>
                  <p className="mt-2 text-sm text-gray-300">
                    1800TOPS will coordinate cash pickup arrangements with you after booking review.
                  </p>
                </div>
              )}
            </>
          )}

          {!requiresPayment && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
              <p className="font-bold text-green-300">
                No payment required for estimate request.
              </p>
              <p className="mt-2 text-sm text-gray-300">
                Submit your request and 1800TOPS will contact you to arrange the next step.
              </p>
            </div>
          )}

          <textarea
            className="min-h-32 w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Tell us about the project."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-300">
              Estimated starting range
            </p>

            {serviceType && serviceType !== "not_sure" ? (
              <p className="mt-2 text-3xl font-bold text-yellow-400">
                {money(estimate.totalLow)} - {money(estimate.totalHigh)}
              </p>
            ) : (
              <p className="mt-2 text-3xl font-bold text-yellow-400">
                Quote after review
              </p>
            )}

            <p className="mt-2 text-sm text-gray-300">
              HST included where applicable. HST Number: {HST_NUMBER}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-yellow-400 px-6 py-4 text-lg font-bold text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {submitting
              ? "Submitting..."
              : requiresPayment && paymentMethod === "credit_debit"
              ? "Continue to Card Payment"
              : "Submit Homeowner Request"}
          </button>
        </form>
      </div>
    </main>
  );
}