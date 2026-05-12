"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    google: any;
  }
}

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
type PaymentMethod = "credit_debit" | "etransfer" | "cash_pickup" | "no_payment_required";

const supabase = createClient();

const HST_RATE = 0.13;
const HST_NUMBER = "720734235RT0001";
const ETRANSFER_EMAIL = "info@1800tops.com";
const MEASUREMENT_DEPOSIT = 300;

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
  return "$" + Number(value || 0).toFixed(2);
}

function paymentMethodLabel(value: PaymentMethod) {
  if (value === "credit_debit") return "Credit / Debit Card";
  if (value === "etransfer") return "E-Transfer";
  if (value === "cash_pickup") return "Cash Pickup";
  return "No payment required";
}

function aiUrgency(timeline: string) {
  if (timeline === "asap") return "Same-Day / ASAP Priority";
  if (timeline === "this_week") return "This Week Priority";
  if (timeline === "next_week") return "Next Week Standard";
  return "Standard Scheduling";
}

function aiRecommendedTech(service: ServiceType, firstStep: FirstStep) {
  const label = serviceLabels[service].toLowerCase();

  if (firstStep === "estimate" || firstStep === "measurements") {
    return "Estimator / measurement technician";
  }

  if (label.includes("stone")) return "Stone removal technician";
  if (label.includes("backsplash")) return "Backsplash removal technician";
  if (label.includes("sink") || label.includes("cooktop") || label.includes("cutout")) {
    return "Cutout / onsite service technician";
  }
  if (
    label.includes("chip") ||
    label.includes("seam") ||
    label.includes("polishing") ||
    label.includes("sealing") ||
    label.includes("silicone")
  ) {
    return "Repair / finishing technician";
  }

  return "General homeowner service technician";
}

function aiScore({
  serviceType,
  firstStep,
  timeline,
  city,
  paymentRequired,
}: {
  serviceType: ServiceType;
  firstStep: FirstStep;
  timeline: string;
  city: string;
  paymentRequired: boolean;
}) {
  let score = 50;

  if (timeline === "asap") score += 25;
  if (timeline === "this_week") score += 15;
  if (city) score += 10;
  if (serviceType && serviceType !== "not_sure") score += 10;
  if (firstStep === "measurements") score += 10;
  if (paymentRequired) score += 10;
  if (startingPrices[serviceType] >= 300) score += 5;

  return Math.min(score, 100);
}

async function getNextJobNumber() {
  const { count, error } = await supabase
    .from("homeowner_bookings")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (error || count === null) {
    return `TOP${Date.now().toString().slice(-6)}`;
  }

  return `TOP${count + 1}`;
}

export default function HomeownerBookingPage() {
  const router = useRouter();
  const addressInputRef = useRef<HTMLInputElement | null>(null);

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
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("no_payment_required");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let autocomplete: any;

    function initAutocomplete() {
      if (!window.google?.maps?.places || !addressInputRef.current) return;

      autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: "ca" },
        fields: ["formatted_address", "address_components"],
        types: ["address"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (place.formatted_address) {
          setProjectAddress(place.formatted_address);
        }

        const components = place.address_components || [];

        const cityComponent =
          components.find((item: any) => item.types.includes("locality")) ||
          components.find((item: any) => item.types.includes("administrative_area_level_3")) ||
          components.find((item: any) => item.types.includes("administrative_area_level_2"));

        const postalComponent = components.find((item: any) =>
          item.types.includes("postal_code")
        );

        if (cityComponent?.long_name) setCity(cityComponent.long_name);
        if (postalComponent?.long_name) setPostalCode(postalComponent.long_name);
      });
    }

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    const googleMapsKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!googleMapsKey) return;

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", initAutocomplete);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, []);

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

    if (firstStep === "measurements") {
      rangeLow = MEASUREMENT_DEPOSIT;
      rangeHigh = MEASUREMENT_DEPOSIT;
    }

    if (firstStep === "estimate" || serviceType === "not_sure") {
      rangeLow = 0;
      rangeHigh = 0;
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
  }, [serviceType, approxSqft, firstStep]);

  const requestType =
    firstStep === "estimate" ||
    firstStep === "measurements" ||
    projectStage === "ready_estimate" ||
    projectStage === "ready_measurements"
      ? "estimate"
      : "service";

  const paymentRequired = firstStep === "measurements" || requestType === "service";
  const finalPaymentMethod: PaymentMethod = paymentRequired ? paymentMethod : "no_payment_required";
  const paymentStatus =
    finalPaymentMethod === "credit_debit"
      ? "pending_card_payment"
      : paymentRequired
      ? "pending"
      : "not_required";

  const paymentAmount = paymentRequired ? estimate.totalHigh : 0;

  const ai = useMemo(() => {
    return {
      urgency: aiUrgency(timeline),
      recommendedTech: aiRecommendedTech(serviceType, firstStep),
      routeLabel: city ? `${city} homeowner route` : "City missing — route cannot be grouped yet",
      score: aiScore({
        serviceType,
        firstStep,
        timeline,
        city,
        paymentRequired,
      }),
    };
  }, [serviceType, firstStep, timeline, city, paymentRequired]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!serviceType) {
      alert("Please select a service or estimate option.");
      return;
    }

    if (!firstStep) {
      alert("Please select what you need first.");
      return;
    }

    if (!preferredDate) {
      alert("Please select a preferred booking date.");
      return;
    }

    if (paymentRequired && finalPaymentMethod === "no_payment_required") {
      alert("Please choose a payment method.");
      return;
    }

    try {
      setSubmitting(true);

      const jobNumber = await getNextJobNumber();
      const serviceLabel = serviceLabels[serviceType];
      const servicePrice = estimate.totalHigh;

      const fullNotes = `
Material status: ${materialStatus}
First step: ${firstStep}
Project stage: ${projectStage}
Approx sqft: ${approxSqft || "Not provided"}
Preferred date: ${preferredDate}
Timeline: ${timeline}
Preferred contact: ${preferredContact}

AI urgency: ${ai.urgency}
AI recommended tech: ${ai.recommendedTech}
AI route label: ${ai.routeLabel}
AI priority score: ${ai.score}

Payment required: ${paymentRequired ? "Yes" : "No"}
Payment method: ${paymentMethodLabel(finalPaymentMethod)}
Payment status: ${paymentStatus}

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
        status: "new",

        customer_name: customerName,
        customer_email: email,
        customer_phone: phone,

        address: projectAddress,
        city,
        postal_code: postalCode,

        service_type: serviceLabel,
        service_price: servicePrice,

        payment_method: finalPaymentMethod,
        payment_status: paymentStatus,
        payment_amount: paymentAmount,

        preferred_date: preferredDate,
        preferred_time: preferredContact,

        notes: fullNotes,

        one_way_km: 0,
        round_trip_km: 0,
        ai_route_note: "Distance not calculated yet. Admin can update route manually.",
        ai_priority_score: ai.score,
        ai_route_label: ai.routeLabel,
        ai_recommended_tech: ai.recommendedTech,
        ai_urgency_label: ai.urgency,
      });

      if (error) {
        console.error(error);
        alert(`Booking failed: ${error.message}`);
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
    preferredDate,
    timeline,
    preferredContact,
    notes,
    paymentMethod: finalPaymentMethod,
    paymentRequired,
    paymentAmount: money(paymentAmount),
    paymentLabel:
      firstStep === "measurements"
        ? "Measurement deposit"
        : requestType === "service"
        ? "Homeowner service payment"
        : "Estimate request",
    paymentStatus,
    etransferEmail: ETRANSFER_EMAIL,
  }),
});

await fetch("/api/homeowner-create-calendar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jobNumber,
    customerName,
    customerEmail: email,
    customerPhone: phone,
    serviceType: serviceLabel,
    address: projectAddress,
    city,
    scheduledDate:
      preferredDate ||
      new Date().toISOString().slice(0, 10),
    scheduledTime:
      timeline || "Homeowner request submitted",
    notes:
      notes || "Homeowner request submitted.",
  }),
});

const params = new URLSearchParams({
  job: jobNumber,
  customerName,
  customerEmail: email,
  customerPhone: phone,
  phone,
  email,
  projectAddress,
  city,
  postalCode,
  serviceType: serviceLabel,
  requestType,
  timeline,
  preferredDate,
  preferredContact,
  estimateLow: money(estimate.totalLow),
  estimateHigh: money(estimate.totalHigh),
  paymentMethod: finalPaymentMethod,
  paymentRequired: String(paymentRequired),
  paymentAmount: money(paymentAmount),
  paymentStatus,
});
const liveBaseUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://1800tops.com";

const confirmationUrl =
  `/homeowners/confirmation?${params.toString()}`;

if (paymentRequired && paymentAmount > 0) {
  const stripeRes = await fetch(
  "/api/stripe/homeowner-checkout",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobNumber,
      serviceLabel,
      customerEmail: email,
      paymentAmount,
      successUrl:
        `${liveBaseUrl}${confirmationUrl}&stripe=success`,
      cancelUrl:
        `${liveBaseUrl}/homeowners/book?stripe=cancelled&job=${jobNumber}`,
    }),
  }
);

  const stripeData = await stripeRes.json();

  if (!stripeData.success || !stripeData.url) {
    alert(
      stripeData.error ||
        "Stripe checkout failed."
    );

    setSubmitting(false);
    return;
  }

  window.location.href = stripeData.url;
  return;
}

      router.push(confirmationUrl);
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
          Request a Homeowner Estimate
        </h1>

        <p className="mt-4 max-w-2xl text-gray-300">
          Need countertops, kitchen upgrades, measurements, or installation
          help? Submit your project details and 1800TOPS will contact you to
          schedule an estimate, measurement visit, or homeowner service.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-lg font-bold text-yellow-400">1. Request</p>
            <p className="mt-2 text-sm text-gray-300">
              Tell us what you need for your kitchen or countertop project.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-lg font-bold text-yellow-400">2. Estimate</p>
            <p className="mt-2 text-sm text-gray-300">
              We contact you to arrange an estimate or measurement visit.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-lg font-bold text-yellow-400">3. Schedule</p>
            <p className="mt-2 text-sm text-gray-300">
              Once approved, we schedule the installation or service.
            </p>
          </div>
        </div>

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
            ref={addressInputRef}
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Start typing project address"
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

            <option disabled>── Estimate / Measurement ──</option>
            <option value="not_sure">Book estimate / not sure yet</option>
            <option value="countertop_upgrade">Kitchen countertop upgrade</option>
            <option value="countertop_replacement">Countertop replacement</option>
            <option value="full_kitchen_upgrade">Full kitchen upgrade</option>

            <option disabled>── Homeowner Services ──</option>
            <option value="countertop_repair">Countertop repair / service - from $220</option>
            <option value="sink_cooktop_cutout">Sink or cooktop cutout - from $300</option>
            <option value="backsplash_service">Backsplash service - from $300</option>
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
            onChange={(e) => {
              const next = e.target.value as FirstStep;
              setFirstStep(next);

              if (next === "estimate" || next === "advice") {
                setPaymentMethod("no_payment_required");
              }

              if (next === "measurements" || next === "have_measurements") {
                setPaymentMethod("credit_debit");
              }
            }}
            required
          >
            <option value="">What do you need first?</option>
            <option value="estimate">Send someone for an estimate — no payment</option>
            <option value="measurements">Send someone for measurements — $300 + HST</option>
            <option value="have_measurements">I already have measurements / ready for service</option>
            <option value="advice">I need help choosing options — no payment</option>
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

          <input
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            required
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

          {paymentRequired && (
            <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-200">
                Payment method
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit_debit")}
                  className={`rounded-xl border p-4 text-left font-bold ${
                    finalPaymentMethod === "credit_debit"
                      ? "border-blue-400 bg-blue-400 text-black"
                      : "border-white/10 bg-black text-white"
                  }`}
                >
                  Credit / Debit
                  <p className="mt-1 text-xs font-normal">Secure Stripe payment</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("etransfer")}
                  className={`rounded-xl border p-4 text-left font-bold ${
                    finalPaymentMethod === "etransfer"
                      ? "border-blue-400 bg-blue-400 text-black"
                      : "border-white/10 bg-black text-white"
                  }`}
                >
                  E-Transfer
                  <p className="mt-1 text-xs font-normal">{ETRANSFER_EMAIL}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash_pickup")}
                  className={`rounded-xl border p-4 text-left font-bold ${
                    finalPaymentMethod === "cash_pickup"
                      ? "border-blue-400 bg-blue-400 text-black"
                      : "border-white/10 bg-black text-white"
                  }`}
                >
                  Cash Pickup
                  <p className="mt-1 text-xs font-normal">Admin will coordinate</p>
                </button>
              </div>
            </div>
          )}

          <textarea
            className="min-h-32 w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            placeholder="Tell us about the project. Example: kitchen size, material, old countertop removal, sink, backsplash, repair needed, or anything important."
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
              Preferred date: {preferredDate || "Not selected yet"}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              Payment method: {paymentMethodLabel(finalPaymentMethod)} · Status: {paymentStatus}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              AI: {ai.urgency} · {ai.recommendedTech} · Score {ai.score}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              Price includes HST where applicable. HST Number: {HST_NUMBER}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              This is only a starting estimate. Final price is confirmed after
              estimate, measurements, photos, material details, access, removal,
              and scheduling are reviewed.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-yellow-400 px-6 py-4 text-lg font-bold text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {submitting
              ? finalPaymentMethod === "credit_debit"
                ? "Opening Stripe..."
                : "Submitting..."
              : finalPaymentMethod === "credit_debit" && paymentRequired
              ? "Continue to Secure Card Payment"
              : "Submit Homeowner Request"}
          </button>

          <p className="text-center text-xs text-gray-400">
            By submitting, you agree that 1800TOPS may contact you about your
            homeowner estimate, measurement, or service request.
          </p>
        </form>
      </div>
    </main>
  );
}