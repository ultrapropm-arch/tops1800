"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@/utils/supabase/client";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

const HST_RATE = 0.13;
const CUSTOMER_JUST_SERVICE_MINIMUM = 220;
const INSTALLER_JUST_SERVICE_MINIMUM = 160;
const CUSTOMER_MILEAGE_RATE = 1.5;
const INSTALLER_MILEAGE_RATE = 1.0;
const RETURN_FEE_CUSTOMER = 200;
const RETURN_FEE_INSTALLER_PAY = 180;
const REBOOK_CUSTOMER_MILEAGE_MULTIPLIER = 0.6;
const REBOOK_INSTALLER_MILEAGE_MULTIPLIER = 0.5;
const MAX_SERVICE_DISTANCE_KM = 200;

const ADMIN_EMAIL = "ultrapropm@gmail.com";

type MainServiceType =
  | ""
  | "full_height_backsplash"
  | "installation_3cm"
  | "installation_2cm_standard"
  | "backsplash_tiling"
  | "justServices";

type DisposalResponsibility = "customer" | "installer";

type PaymentMethod =
  | ""
  | "creditDebit"
  | "etransfer"
  | "cashPickup"
  | "chequePickup"
  | "weeklyInvoice";

type ServicePricingConfig = {
  customerRate: number;
  installerRate: number;
  label: string;
};

type SavedCustomerProfile = {
  customerName?: string;
  customerEmail?: string;
  companyName?: string;
  phoneNumber?: string;
};

type CheckoutDraft = Record<string, any>;

const MAIN_SERVICE_PRICING: Record<
  Exclude<MainServiceType, "" | "justServices">,
  ServicePricingConfig
> = {
  full_height_backsplash: {
    customerRate: 10,
    installerRate: 7,
    label: "Full Height Backsplash",
  },
  installation_3cm: {
    customerRate: 10,
    installerRate: 7,
    label: "3cm Installation",
  },
  installation_2cm_standard: {
    customerRate: 9,
    installerRate: 6.5,
    label: "2cm Standard Installation",
  },
  backsplash_tiling: {
    customerRate: 21,
    installerRate: 13,
    label: "Backsplash Tiling",
  },
};

const ADD_ON_SERVICES = [
  "Extra Cutting — $175",
  "Small Polishing — $175",
  "Big Polishing — $175",
  "Sink Cutout — $180",
  "Waterfall — $100 each",
  "Extra Helper Needed — $200",
  "Outlet Plug Cutout — $50 each",
  "Granite / Marble Sealing — $50",
  "Cooktop Cutout — $180",
  "Condo / High-Rise — $80",
  "Difficult / Stairs 7+ / Basement — $180",
  "Plumbing Service — $50",
  "Remove and Dispose Laminate",
  "Remove and Dispose Stone",
  "Removal — $60",
  "Full Countertop Template — $300",
  "Remeasure Backsplash - Full Height — $180",
  "Remeasure Backsplash - Low Height — $80",
  "Vanity Removal",
  "Backsplash Tile Removal",
] as const;

const JUST_SERVICES = [
  "Reinstall Sink",
  "Fix Chips",
  "Silicone Caulking",
  "Extra Cutting",
  "Fix Seam",
  "Drill Holes",
  "Plumbing",
  "Sink Cutout",
  "Outlet Plug Cutout",
  "Cooktop Cutout",
  "Granite / Marble Sealing",
  "Big Polishing",
  "Small Polishing",
  "Polishing",
] as const;

function normalizeServiceName(label: string) {
  return label.split("—")[0].trim().toLowerCase();
}

function extractPrice(label: string) {
  const match = label.match(/\$([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

function parsePositiveNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number) {
  return `$${round2(value).toFixed(2)}`;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeBool(value: unknown) {
  return value === true || value === "true";
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(" | ")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function getTimelineCharge(timeline: string) {
  if (timeline === "sameDay") return 210;
  if (timeline === "nextDay") return 150;
  return 0;
}

function getChargeableKm(oneWayKm: number) {
  const safeOneWayKm = Number.isFinite(oneWayKm) && oneWayKm > 0 ? oneWayKm : 0;
  const roundTripKm = safeOneWayKm * 2;

  if (roundTripKm <= 120) {
    return { roundTripKm, chargeableKm: 0 };
  }

  if (roundTripKm <= 320) {
    return { roundTripKm, chargeableKm: roundTripKm - 120 };
  }

  return { roundTripKm, chargeableKm: roundTripKm };
}

function getSqftRates(serviceType: MainServiceType) {
  if (
    serviceType === "full_height_backsplash" ||
    serviceType === "installation_3cm" ||
    serviceType === "installation_2cm_standard" ||
    serviceType === "backsplash_tiling"
  ) {
    return MAIN_SERVICE_PRICING[serviceType];
  }

  return {
    customerRate: 0,
    installerRate: 0,
    label: "",
  };
}

function getCustomerAddOnPrice(params: {
  service: string;
  waterfallQuantity: number;
  outletPlugCutoutQuantity: number;
  disposalResponsibility: DisposalResponsibility;
}) {
  const service = normalizeServiceName(params.service);

  if (service === "extra cutting") return 175;
  if (service === "small polishing") return 175;
  if (service === "big polishing") return 175;
  if (service === "sink cutout") return 180;
  if (service === "waterfall") return 100 * params.waterfallQuantity;
  if (service === "extra helper needed") return 200;

  if (service === "outlet plug cutout") {
    return 50 * params.outletPlugCutoutQuantity;
  }

  if (
    service === "granite / marble sealing" ||
    service === "granite/marble sealing"
  ) {
    return 50;
  }

  if (service === "cooktop cutout") return 180;
  if (service === "condo / high-rise") return 80;
  if (service === "difficult / stairs 7+ / basement") return 180;
  if (service === "plumbing service" || service === "plumbing removal") return 50;
  if (service === "full countertop template") return 300;
  if (service === "remeasure backsplash - full height") return 180;
  if (service === "remeasure backsplash - low height") return 80;

  if (service === "remove and dispose laminate") {
    return params.disposalResponsibility === "installer" ? 350 : 175;
  }

  if (service === "remove and dispose stone") {
    return params.disposalResponsibility === "installer" ? 450 : 325;
  }

  if (service === "vanity removal") {
    return params.disposalResponsibility === "installer" ? 190 : 80;
  }

  if (service === "backsplash tile removal") {
    return params.disposalResponsibility === "installer" ? 480 : 300;
  }

  if (service === "removal") return 60;

  return extractPrice(params.service);
}

function getInstallerAddOnPrice(params: {
  service: string;
  waterfallQuantity: number;
  outletPlugCutoutQuantity: number;
  disposalResponsibility: DisposalResponsibility;
}) {
  const service = normalizeServiceName(params.service);

  if (service === "extra cutting") return 100;
  if (service === "small polishing") return 90;
  if (service === "big polishing") return 90;
  if (service === "sink cutout") return 100;
  if (service === "waterfall") return 60 * params.waterfallQuantity;
  if (service === "extra helper needed") return 110;

  if (service === "outlet plug cutout") {
    return 25 * params.outletPlugCutoutQuantity;
  }

  if (
    service === "granite / marble sealing" ||
    service === "granite/marble sealing"
  ) {
    return 25;
  }

  if (service === "cooktop cutout") return 100;
  if (service === "condo / high-rise") return 50;
  if (service === "difficult / stairs 7+ / basement") return 100;
  if (service === "plumbing service" || service === "plumbing removal") return 25;
  if (service === "full countertop template") return 215;
  if (service === "remeasure backsplash - full height") return 100;
  if (service === "remeasure backsplash - low height") return 50;

  if (service === "remove and dispose laminate") {
    return params.disposalResponsibility === "installer" ? 250 : 100;
  }

  if (service === "remove and dispose stone") {
    return params.disposalResponsibility === "installer" ? 325 : 200;
  }

  if (service === "vanity removal") {
    return params.disposalResponsibility === "installer" ? 110 : 40;
  }

  if (service === "backsplash tile removal") {
    return params.disposalResponsibility === "installer" ? 320 : 190;
  }

  if (service === "removal") return 0;

  return 0;
}

function calculateCustomerAddOnTotal(params: {
  services: string[];
  waterfallQuantity: number;
  outletPlugCutoutQuantity: number;
  disposalResponsibility: DisposalResponsibility;
}) {
  return params.services.reduce((sum, service) => {
    return (
      sum +
      getCustomerAddOnPrice({
        service,
        waterfallQuantity: params.waterfallQuantity,
        outletPlugCutoutQuantity: params.outletPlugCutoutQuantity,
        disposalResponsibility: params.disposalResponsibility,
      })
    );
  }, 0);
}

function calculateCustomerJustServiceTotal(services: string[]) {
  if (services.length === 0) return 0;
  return CUSTOMER_JUST_SERVICE_MINIMUM;
}

function formatSelectedAddOnLabel(params: {
  service: string;
  waterfallQuantity: number;
  outletPlugCutoutQuantity: number;
  disposalResponsibility: DisposalResponsibility;
}) {
  const service = normalizeServiceName(params.service);
  const label = params.service.split("—")[0].trim();

  if (service === "waterfall") {
    return `${label} x${params.waterfallQuantity} — $${(
      100 * params.waterfallQuantity
    ).toFixed(2)}`;
  }

  if (service === "outlet plug cutout") {
    return `${label} x${params.outletPlugCutoutQuantity} — $${(
      50 * params.outletPlugCutoutQuantity
    ).toFixed(2)}`;
  }

  if (service === "remove and dispose laminate") {
    return params.disposalResponsibility === "installer"
      ? `${label} — Installer Responsible for Disposal — $350`
      : `${label} — Customer Responsible for Disposal — $175`;
  }

  if (service === "remove and dispose stone") {
    return params.disposalResponsibility === "installer"
      ? `${label} — Installer Responsible for Disposal — $450`
      : `${label} — Customer Responsible for Disposal — $325`;
  }

  if (service === "vanity removal") {
    return params.disposalResponsibility === "installer"
      ? `${label} — Installer Responsible for Disposal — $190`
      : `${label} — Customer Responsible for Disposal — $80`;
  }

  if (service === "backsplash tile removal") {
    return params.disposalResponsibility === "installer"
      ? `${label} — Installer Responsible for Disposal — $480`
      : `${label} — Customer Responsible for Disposal — $300`;
  }

  return params.service;
}

function saveCustomerProfile(profile: SavedCustomerProfile) {
  try {
    localStorage.setItem("lastCustomerProfile", JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save customer profile:", error);
  }
}

function loadCustomerProfile(): SavedCustomerProfile | null {
  try {
    const raw = localStorage.getItem("lastCustomerProfile");
    if (!raw) return null;
    return JSON.parse(raw) as SavedCustomerProfile;
  } catch (error) {
    console.error("Failed to load customer profile:", error);
    return null;
  }
}

function loadSessionDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem("checkoutDraft");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load checkout draft:", error);
    return null;
  }
}

function getDistanceTierLabel(oneWayKm: number, total: number) {
  if (oneWayKm <= 80) return "Local Zone";
  if (oneWayKm <= 120 && total >= 2500) return "Extended Zone";
  if (oneWayKm <= 200 && total >= 5000) return "Premium Distance Zone";
  if (oneWayKm > 200) return "Outside Service Zone";
  return "Restricted Distance Zone";
}

function getPaymentGuidance(oneWayKm: number, total: number, companyName: string) {
  const notes: string[] = [];

  notes.push("Cash Pickup: up to 80km.");
  notes.push("Cash Pickup extends to 120km when order is $2,500+.");
  notes.push("Cash Pickup extends to 200km when order is $5,000+.");
  notes.push("Cheque Pickup is stricter than cash.");
  notes.push("Weekly Invoice is better for company jobs and higher totals.");

  if (oneWayKm > MAX_SERVICE_DISTANCE_KM) {
    notes.push(
      `This booking is outside the current max service distance of ${MAX_SERVICE_DISTANCE_KM} km.`
    );
  } else if (oneWayKm > 120 && total < 5000) {
    notes.push("This distance likely needs a $5,000+ order for wider payment flexibility.");
  } else if (oneWayKm > 80 && total < 2500) {
    notes.push("This distance likely needs a $2,500+ order for local pickup payment flexibility.");
  }

  if (!companyName.trim()) {
    notes.push("Add a company name if you want weekly invoice eligibility.");
  }

  return notes;
}

function getRecommendedInstallerType(params: {
  oneWayKm: number;
  sqft: number;
  serviceType: MainServiceType;
  hasSecondJob: boolean;
  total: number;
}) {
  const { oneWayKm, sqft, serviceType, hasSecondJob, total } = params;

  if (hasSecondJob && total >= 5000) return "Senior Multi-Job Installer";
  if (oneWayKm > 120) return "Long Distance Specialist";
  if (sqft >= 80) return "Large Project Specialist";
  if (serviceType === "installation_3cm") return "3cm Stone Specialist";
  if (serviceType === "full_height_backsplash") return "Backsplash Specialist";

  return "Standard Installer";
}

function getAllowedPaymentOptions(params: {
  oneWayKm: number;
  total: number;
  companyName: string;
}) {
  const { oneWayKm, total, companyName } = params;

  return {
    creditDebit: true,
    etransfer: true,
    cashPickup:
      oneWayKm <= 80 ||
      (oneWayKm <= 120 && total >= 2500) ||
      (oneWayKm <= 200 && total >= 5000),
    chequePickup:
      oneWayKm <= 50 ||
      (oneWayKm <= 80 && total >= 2500) ||
      (oneWayKm <= 120 && total >= 5000),
    weeklyInvoice: companyName.trim().length > 0 && total >= 2500,
  };
}

function getBookingStatusFromPaymentMethod(paymentMethod: PaymentMethod) {
  if (paymentMethod === "creditDebit") return "pending_payment";
  if (paymentMethod === "weeklyInvoice") return "pending_invoice";
  return "available";
}

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  if (paymentMethod === "creditDebit") return "Credit / Debit";
  if (paymentMethod === "etransfer") return "E-Transfer";
  if (paymentMethod === "cashPickup") return "Cash Pickup";
  if (paymentMethod === "chequePickup") return "Cheque Pickup";
  if (paymentMethod === "weeklyInvoice") return "Weekly Invoice";
  return "-";
}

function buildCustomerConfirmationHtml(p: {
  customerName: string;
  customerEmail: string;
  companyName: string;
  bookingNumber: string;
  paymentMethod: string;
  total: number;
  timeline: string;
  scheduledDate: string;
  pickupTimeSlot: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceLabel: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="color:#c9a227;">1800TOPS Booking Confirmation</h2>
      <p>Hello ${p.customerName || "Customer"},</p>
      <p>Your booking has been received.</p>
      <p><strong>Booking ID:</strong> ${p.bookingNumber}</p>
      <p><strong>Company:</strong> ${p.companyName || "-"}</p>
      <p><strong>Email:</strong> ${p.customerEmail || "-"}</p>
      <p><strong>Service:</strong> ${p.serviceLabel || "-"}</p>
      <p><strong>Timeline:</strong> ${p.timeline || "-"}</p>
      <p><strong>Scheduled Date:</strong> ${p.scheduledDate || "-"}</p>
      <p><strong>Pickup Window:</strong> ${p.pickupTimeSlot || "-"}</p>
      <p><strong>Pick Up:</strong> ${p.pickupAddress || "-"}</p>
      <p><strong>Drop Off:</strong> ${p.dropoffAddress || "-"}</p>
      <p><strong>Payment Method:</strong> ${p.paymentMethod}</p>
      <p><strong>Total:</strong> ${money(p.total)}</p>
      <p>Thank you for booking with 1800TOPS.</p>
    </div>
  `;
}

function buildAdminConfirmationHtml(p: {
  customerName: string;
  customerEmail: string;
  companyName: string;
  bookingNumber: string;
  paymentMethod: string;
  total: number;
  timeline: string;
  scheduledDate: string;
  pickupTimeSlot: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceLabel: string;
  notes: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="color:#c9a227;">New 1800TOPS Booking</h2>
      <p><strong>Booking ID:</strong> ${p.bookingNumber}</p>
      <p><strong>Customer:</strong> ${p.customerName || "-"}</p>
      <p><strong>Email:</strong> ${p.customerEmail || "-"}</p>
      <p><strong>Company:</strong> ${p.companyName || "-"}</p>
      <p><strong>Service:</strong> ${p.serviceLabel || "-"}</p>
      <p><strong>Timeline:</strong> ${p.timeline || "-"}</p>
      <p><strong>Scheduled Date:</strong> ${p.scheduledDate || "-"}</p>
      <p><strong>Pickup Window:</strong> ${p.pickupTimeSlot || "-"}</p>
      <p><strong>Pick Up:</strong> ${p.pickupAddress || "-"}</p>
      <p><strong>Drop Off:</strong> ${p.dropoffAddress || "-"}</p>
      <p><strong>Payment Method:</strong> ${p.paymentMethod}</p>
      <p><strong>Total:</strong> ${money(p.total)}</p>
      <p><strong>Notes:</strong> ${p.notes || "-"}</p>
    </div>
  `;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Email failed");
  }
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-yellow-500">{title}</h2>
      {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

function SummaryBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-black p-4">
      <p className="mb-2 font-semibold text-yellow-400">{title}</p>
      <div className="space-y-1 text-sm text-gray-300">{children}</div>
    </div>
  );
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [checkoutStep, setCheckoutStep] = useState<"form" | "review">("form");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [submitting, setSubmitting] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [bookingSaved, setBookingSaved] = useState(false);
  const [savedBookingId, setSavedBookingId] = useState("");
  const [confirmationReady, setConfirmationReady] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [timeline, setTimeline] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [serviceType, setServiceType] = useState<MainServiceType>("");
  const [jobSize, setJobSize] = useState("");
  const [sideNote, setSideNote] = useState("");

  const [oneWayKm, setOneWayKm] = useState<number | null>(null);
  const [roundTripKm, setRoundTripKm] = useState<number | null>(null);
  const [chargeableKm, setChargeableKm] = useState<number>(0);
  const [mileageCharge, setMileageCharge] = useState<number>(0);

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedJustServices, setSelectedJustServices] = useState<string[]>([]);
  const [waterfallQuantity, setWaterfallQuantity] = useState("1");
  const [outletPlugCutoutQuantity, setOutletPlugCutoutQuantity] = useState("1");
  const [disposalResponsibility, setDisposalResponsibility] =
    useState<DisposalResponsibility>("customer");

  const [showSecondJob, setShowSecondJob] = useState(false);
  const [secondJobAddress, setSecondJobAddress] = useState("");
  const [secondJobDate, setSecondJobDate] = useState("");
  const [secondJobPickupTimeSlot, setSecondJobPickupTimeSlot] = useState("");
  const [secondJobSqft, setSecondJobSqft] = useState("");
  const [secondJobServiceType, setSecondJobServiceType] =
    useState<MainServiceType>("");
  const [secondJobSideNote, setSecondJobSideNote] = useState("");
  const [secondJobAddOns, setSecondJobAddOns] = useState<string[]>([]);
  const [secondJobJustServices, setSecondJobJustServices] = useState<string[]>([]);
  const [secondJobWaterfallQuantity, setSecondJobWaterfallQuantity] = useState("1");
  const [secondJobOutletPlugCutoutQuantity, setSecondJobOutletPlugCutoutQuantity] =
    useState("1");
  const [secondJobDisposalResponsibility, setSecondJobDisposalResponsibility] =
    useState<DisposalResponsibility>("customer");

  const [secondJobOneWayKm, setSecondJobOneWayKm] = useState<number | null>(null);
  const [secondJobRoundTripKm, setSecondJobRoundTripKm] = useState<number | null>(
    null
  );
  const [secondJobChargeableKm, setSecondJobChargeableKm] = useState<number>(0);
  const [secondJobMileageCharge, setSecondJobMileageCharge] = useState<number>(0);

  const isRebook = searchParams.get("rebook") === "true";
  const originalJobId = searchParams.get("jobId") || "";
  const rebookReason = searchParams.get("reason") || "";
  const returnFeeRequired = searchParams.get("returnFee") === "true";
  const rebookDate = searchParams.get("date") || "";
  const cancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    const step = searchParams.get("step");
    setCheckoutStep(step === "review" ? "review" : "form");
  }, [searchParams]);

  useEffect(() => {
    const draft = loadSessionDraft();

    if (draft) {
      setCustomerName(safeString(draft.customerName));
      setCustomerEmail(safeString(draft.customerEmail));
      setCompanyName(safeString(draft.companyName));
      setPhoneNumber(safeString(draft.phoneNumber));
      setPickupAddress(safeString(draft.pickupAddress));
      setDropoffAddress(safeString(draft.dropoffAddress));
      setTimeline(safeString(draft.timeline));
      setScheduledDate(safeString(draft.scheduledDate));
      setPickupTimeSlot(safeString(draft.pickupTimeSlot));
      setServiceType((safeString(draft.serviceType) as MainServiceType) || "");
      setJobSize(String(draft.jobSize ?? ""));
      setSideNote(safeString(draft.sideNote));

      setOneWayKm(
        draft.oneWayKm === null || draft.oneWayKm === undefined
          ? null
          : Number(draft.oneWayKm)
      );
      setRoundTripKm(
        draft.roundTripKm === null || draft.roundTripKm === undefined
          ? null
          : Number(draft.roundTripKm)
      );
      setChargeableKm(Number(draft.chargeableKm || 0));
      setMileageCharge(Number(draft.mileageCharge || 0));

      setSelectedAddOns(toArray(draft.selectedAddOns ?? draft.addOnServices));
      setSelectedJustServices(
        toArray(draft.selectedJustServices ?? draft.justServices)
      );
      setWaterfallQuantity(String(draft.waterfallQuantity ?? "1"));
      setOutletPlugCutoutQuantity(String(draft.outletPlugCutoutQuantity ?? "1"));
      setDisposalResponsibility(
        (safeString(draft.disposalResponsibility) as DisposalResponsibility) ||
          "customer"
      );

      setShowSecondJob(safeBool(draft.showSecondJob));
      setSecondJobAddress(safeString(draft.secondJobAddress));
      setSecondJobDate(
        safeString(draft.secondJobScheduledDate || draft.secondJobDate)
      );
      setSecondJobPickupTimeSlot(safeString(draft.secondJobPickupTimeSlot));
      setSecondJobSqft(String(draft.secondJobSqft ?? ""));
      setSecondJobServiceType(
        (safeString(draft.secondJobServiceType) as MainServiceType) || ""
      );
      setSecondJobSideNote(safeString(draft.secondJobSideNote));
      setSecondJobAddOns(toArray(draft.secondJobAddOns));
      setSecondJobJustServices(toArray(draft.secondJobJustServices));
      setSecondJobWaterfallQuantity(String(draft.secondJobWaterfallQuantity ?? "1"));
      setSecondJobOutletPlugCutoutQuantity(
        String(draft.secondJobOutletPlugCutoutQuantity ?? "1")
      );
      setSecondJobDisposalResponsibility(
        (safeString(
          draft.secondJobDisposalResponsibility
        ) as DisposalResponsibility) || "customer"
      );
      setSecondJobOneWayKm(
        draft.secondJobOneWayKm === null || draft.secondJobOneWayKm === undefined
          ? null
          : Number(draft.secondJobOneWayKm)
      );
      setSecondJobRoundTripKm(
        draft.secondJobRoundTripKm === null || draft.secondJobRoundTripKm === undefined
          ? null
          : Number(draft.secondJobRoundTripKm)
      );
      setSecondJobChargeableKm(Number(draft.secondJobChargeableKm || 0));
      setSecondJobMileageCharge(Number(draft.secondJobMileageCharge || 0));

      setLoadError("");
      return;
    }

    if (!isRebook) {
      const saved = loadCustomerProfile();
      if (saved) {
        if (saved.customerName) setCustomerName(saved.customerName);
        if (saved.customerEmail) setCustomerEmail(saved.customerEmail);
        if (saved.companyName) setCompanyName(saved.companyName);
        if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);
      }
    }

    if (searchParams.size > 0) {
      setCustomerName(searchParams.get("customerName") || "");
      setCustomerEmail(searchParams.get("customerEmail") || "");
      setCompanyName(searchParams.get("companyName") || "");
      setPhoneNumber(searchParams.get("phoneNumber") || "");
      setPickupAddress(searchParams.get("pickupAddress") || "");
      setDropoffAddress(searchParams.get("dropoffAddress") || "");
      setTimeline(searchParams.get("timeline") || "");
      setScheduledDate(searchParams.get("scheduledDate") || "");
      setPickupTimeSlot(searchParams.get("pickupTimeSlot") || "");
      setServiceType(
        ((searchParams.get("serviceType") || "") as MainServiceType) || ""
      );
      setJobSize(searchParams.get("jobSize") || searchParams.get("sqft") || "");
      setSideNote(searchParams.get("sideNote") || "");
      setOneWayKm(
        searchParams.get("oneWayKm")
          ? Number(searchParams.get("oneWayKm"))
          : null
      );
      setRoundTripKm(
        searchParams.get("roundTripKm")
          ? Number(searchParams.get("roundTripKm"))
          : null
      );
      setChargeableKm(Number(searchParams.get("chargeableKm") || 0));
      setMileageCharge(Number(searchParams.get("mileageCharge") || 0));
      setSelectedAddOns(toArray(searchParams.get("addOnServices")));
      setSelectedJustServices(toArray(searchParams.get("justServices")));
      setWaterfallQuantity(searchParams.get("waterfallQuantity") || "1");
      setOutletPlugCutoutQuantity(
        searchParams.get("outletPlugCutoutQuantity") || "1"
      );
      setDisposalResponsibility(
        ((searchParams.get("disposalResponsibility") ||
          "customer") as DisposalResponsibility) || "customer"
      );
      setShowSecondJob(searchParams.get("showSecondJob") === "true");
      setSecondJobAddress(searchParams.get("secondJobAddress") || "");
      setSecondJobDate(
        searchParams.get("secondJobScheduledDate") ||
          searchParams.get("secondJobDate") ||
          ""
      );
      setSecondJobPickupTimeSlot(searchParams.get("secondJobPickupTimeSlot") || "");
      setSecondJobSqft(searchParams.get("secondJobSqft") || "");
      setSecondJobServiceType(
        ((searchParams.get("secondJobServiceType") || "") as MainServiceType) || ""
      );
      setSecondJobSideNote(searchParams.get("secondJobSideNote") || "");
      setSecondJobAddOns(toArray(searchParams.get("secondJobAddOns")));
      setSecondJobJustServices(toArray(searchParams.get("secondJobJustServices")));
      setSecondJobWaterfallQuantity(
        searchParams.get("secondJobWaterfallQuantity") || "1"
      );
      setSecondJobOutletPlugCutoutQuantity(
        searchParams.get("secondJobOutletPlugCutoutQuantity") || "1"
      );
      setSecondJobDisposalResponsibility(
        ((searchParams.get("secondJobDisposalResponsibility") ||
          "customer") as DisposalResponsibility) || "customer"
      );
      setSecondJobOneWayKm(
        searchParams.get("secondJobOneWayKm")
          ? Number(searchParams.get("secondJobOneWayKm"))
          : null
      );
      setSecondJobRoundTripKm(
        searchParams.get("secondJobRoundTripKm")
          ? Number(searchParams.get("secondJobRoundTripKm"))
          : null
      );
      setSecondJobChargeableKm(
        Number(searchParams.get("secondJobChargeableKm") || 0)
      );
      setSecondJobMileageCharge(
        Number(searchParams.get("secondJobMileageCharge") || 0)
      );
      setLoadError("");
      return;
    }

    setLoadError("No booking data found. Please go back to the booking page.");
  }, [isRebook, searchParams]);

  useEffect(() => {
    if (!isRebook) return;
    if (rebookDate) setScheduledDate(rebookDate);
    if (rebookReason) {
      setSideNote((prev) =>
        prev ? `${prev} | Rebook reason: ${rebookReason}` : `Rebook reason: ${rebookReason}`
      );
    }
  }, [isRebook, rebookDate, rebookReason]);

  const sqft = useMemo(() => parsePositiveNumber(jobSize), [jobSize]);
  const secondJobSqftNumber = useMemo(
    () => parsePositiveNumber(secondJobSqft),
    [secondJobSqft]
  );

  const waterfallQtyNumber = useMemo(
    () => Math.max(1, parsePositiveNumber(waterfallQuantity) || 1),
    [waterfallQuantity]
  );

  const outletPlugCutoutQtyNumber = useMemo(
    () => Math.max(1, parsePositiveNumber(outletPlugCutoutQuantity) || 1),
    [outletPlugCutoutQuantity]
  );

  const secondJobWaterfallQtyNumber = useMemo(
    () => Math.max(1, parsePositiveNumber(secondJobWaterfallQuantity) || 1),
    [secondJobWaterfallQuantity]
  );

  const secondJobOutletPlugCutoutQtyNumber = useMemo(
    () => Math.max(1, parsePositiveNumber(secondJobOutletPlugCutoutQuantity) || 1),
    [secondJobOutletPlugCutoutQuantity]
  );

  const pricingConfig = useMemo(() => getSqftRates(serviceType), [serviceType]);
  const secondJobPricingConfig = useMemo(
    () => getSqftRates(secondJobServiceType),
    [secondJobServiceType]
  );

  const servicePrice = useMemo(() => {
    if (sqft <= 0 || pricingConfig.customerRate <= 0) return 0;
    return round2(sqft * pricingConfig.customerRate);
  }, [sqft, pricingConfig.customerRate]);

  const secondJobServicePrice = useMemo(() => {
    if (secondJobSqftNumber <= 0 || secondJobPricingConfig.customerRate <= 0) return 0;
    return round2(secondJobSqftNumber * secondJobPricingConfig.customerRate);
  }, [secondJobSqftNumber, secondJobPricingConfig.customerRate]);

  const installerServicePayout = useMemo(() => {
    if (sqft <= 0 || pricingConfig.installerRate <= 0) return 0;
    return round2(sqft * pricingConfig.installerRate);
  }, [sqft, pricingConfig.installerRate]);

  const secondJobInstallerServicePayout = useMemo(() => {
    if (secondJobSqftNumber <= 0 || secondJobPricingConfig.installerRate <= 0) return 0;
    return round2(secondJobSqftNumber * secondJobPricingConfig.installerRate);
  }, [secondJobSqftNumber, secondJobPricingConfig.installerRate]);

  const customerAddOnTotal = useMemo(() => {
    return round2(
      calculateCustomerAddOnTotal({
        services: selectedAddOns,
        waterfallQuantity: waterfallQtyNumber,
        outletPlugCutoutQuantity: outletPlugCutoutQtyNumber,
        disposalResponsibility,
      })
    );
  }, [
    selectedAddOns,
    waterfallQtyNumber,
    outletPlugCutoutQtyNumber,
    disposalResponsibility,
  ]);

  const secondJobAddOnTotal = useMemo(() => {
    return round2(
      calculateCustomerAddOnTotal({
        services: secondJobAddOns,
        waterfallQuantity: secondJobWaterfallQtyNumber,
        outletPlugCutoutQuantity: secondJobOutletPlugCutoutQtyNumber,
        disposalResponsibility: secondJobDisposalResponsibility,
      })
    );
  }, [
    secondJobAddOns,
    secondJobWaterfallQtyNumber,
    secondJobOutletPlugCutoutQtyNumber,
    secondJobDisposalResponsibility,
  ]);

  const customerJustServiceTotal = useMemo(() => {
    return round2(calculateCustomerJustServiceTotal(selectedJustServices));
  }, [selectedJustServices]);

  const secondJobJustServiceTotal = useMemo(() => {
    return round2(calculateCustomerJustServiceTotal(secondJobJustServices));
  }, [secondJobJustServices]);

  const effectiveCustomerMileageRate = useMemo(() => {
    return isRebook
      ? CUSTOMER_MILEAGE_RATE * REBOOK_CUSTOMER_MILEAGE_MULTIPLIER
      : CUSTOMER_MILEAGE_RATE;
  }, [isRebook]);

  const effectiveInstallerMileageRate = useMemo(() => {
    return isRebook
      ? INSTALLER_MILEAGE_RATE * REBOOK_INSTALLER_MILEAGE_MULTIPLIER
      : INSTALLER_MILEAGE_RATE;
  }, [isRebook]);

  const effectiveCompanyMileageRate = useMemo(() => {
    return round2(
      Math.max(0, effectiveCustomerMileageRate - effectiveInstallerMileageRate)
    );
  }, [effectiveCustomerMileageRate, effectiveInstallerMileageRate]);

  const installerMileagePayout = useMemo(() => {
    return round2(chargeableKm * effectiveInstallerMileageRate);
  }, [chargeableKm, effectiveInstallerMileageRate]);

  const secondJobInstallerMileagePayout = useMemo(() => {
    return round2(secondJobChargeableKm * effectiveInstallerMileageRate);
  }, [secondJobChargeableKm, effectiveInstallerMileageRate]);

  const platformMileageProfit = useMemo(() => {
    return round2(chargeableKm * effectiveCompanyMileageRate);
  }, [chargeableKm, effectiveCompanyMileageRate]);

  const secondJobPlatformMileageProfit = useMemo(() => {
    return round2(secondJobChargeableKm * effectiveCompanyMileageRate);
  }, [secondJobChargeableKm, effectiveCompanyMileageRate]);

  const timelineCharge = useMemo(() => getTimelineCharge(timeline), [timeline]);
  const secondJobTimelineCharge = 0;

  const customerReturnFee = useMemo(() => {
    return isRebook && returnFeeRequired ? RETURN_FEE_CUSTOMER : 0;
  }, [isRebook, returnFeeRequired]);

  const customerSubtotal = useMemo(() => {
    return round2(
      servicePrice +
        customerAddOnTotal +
        customerJustServiceTotal +
        mileageCharge +
        timelineCharge +
        customerReturnFee
    );
  }, [
    servicePrice,
    customerAddOnTotal,
    customerJustServiceTotal,
    mileageCharge,
    timelineCharge,
    customerReturnFee,
  ]);

  const customerHst = useMemo(() => round2(customerSubtotal * HST_RATE), [customerSubtotal]);
  const customerTotal = useMemo(() => round2(customerSubtotal + customerHst), [customerSubtotal, customerHst]);

  const secondJobCustomerSubtotal = useMemo(() => {
    return round2(
      secondJobServicePrice +
        secondJobAddOnTotal +
        secondJobJustServiceTotal +
        secondJobMileageCharge +
        secondJobTimelineCharge
    );
  }, [
    secondJobServicePrice,
    secondJobAddOnTotal,
    secondJobJustServiceTotal,
    secondJobMileageCharge,
  ]);

  const secondJobCustomerHst = useMemo(
    () => round2(secondJobCustomerSubtotal * HST_RATE),
    [secondJobCustomerSubtotal]
  );

  const secondJobCustomerTotal = useMemo(
    () => round2(secondJobCustomerSubtotal + secondJobCustomerHst),
    [secondJobCustomerSubtotal, secondJobCustomerHst]
  );

  const installerBasePay = useMemo(() => round2(installerServicePayout), [installerServicePayout]);

  const installerAddOnPay = useMemo(() => {
    const addOnPay = selectedAddOns.reduce((sum, service) => {
      return (
        sum +
        getInstallerAddOnPrice({
          service,
          waterfallQuantity: waterfallQtyNumber,
          outletPlugCutoutQuantity: outletPlugCutoutQtyNumber,
          disposalResponsibility,
        })
      );
    }, 0);

    return round2(addOnPay);
  }, [
    selectedAddOns,
    waterfallQtyNumber,
    outletPlugCutoutQtyNumber,
    disposalResponsibility,
  ]);

  const installerJustServicePay = useMemo(() => {
    const knownJustServicePrices: Record<string, number> = {
      "extra cutting": 100,
      "big polishing": 90,
      "small polishing": 90,
      "sink cutout": 100,
      "outlet plug cutout": 25,
      "cooktop cutout": 100,
      "granite / marble sealing": 25,
      "granite/marble sealing": 25,
      plumbing: 25,
      "drill holes": 25,
      "silicone caulking": 25,
      "reinstall sink": 100,
      "fix chips": 50,
      "fix seam": 50,
      polishing: 90,
    };

    const normalized = selectedJustServices.map(normalizeServiceName);
    let subtotal = 0;

    normalized.forEach((service) => {
      subtotal += knownJustServicePrices[service] || 0;
    });

    if (normalized.length > 0 && subtotal < INSTALLER_JUST_SERVICE_MINIMUM) {
      subtotal = INSTALLER_JUST_SERVICE_MINIMUM;
    }

    return round2(subtotal);
  }, [selectedJustServices]);

  const installerCutPolishPay = 0;
  const installerSinkPay = 0;
  const installerOtherPay = 0;

  const installerSubtotalPay = useMemo(() => {
    return round2(
      installerBasePay +
        installerAddOnPay +
        installerJustServicePay +
        installerMileagePayout +
        installerCutPolishPay +
        installerSinkPay +
        installerOtherPay
    );
  }, [
    installerBasePay,
    installerAddOnPay,
    installerJustServicePay,
    installerMileagePayout,
  ]);

  const installerHstPay = useMemo(() => round2(installerSubtotalPay * HST_RATE), [installerSubtotalPay]);

  const installerReturnPay = useMemo(() => {
    return isRebook && returnFeeRequired ? RETURN_FEE_INSTALLER_PAY : 0;
  }, [isRebook, returnFeeRequired]);

  const installerPay = useMemo(() => {
    return round2(installerSubtotalPay + installerHstPay + installerReturnPay);
  }, [installerSubtotalPay, installerHstPay, installerReturnPay]);

  const secondJobInstallerBasePay = useMemo(
    () => round2(secondJobInstallerServicePayout),
    [secondJobInstallerServicePayout]
  );

  const secondJobInstallerAddOnPay = useMemo(() => {
    const addOnPay = secondJobAddOns.reduce((sum, service) => {
      return (
        sum +
        getInstallerAddOnPrice({
          service,
          waterfallQuantity: secondJobWaterfallQtyNumber,
          outletPlugCutoutQuantity: secondJobOutletPlugCutoutQtyNumber,
          disposalResponsibility: secondJobDisposalResponsibility,
        })
      );
    }, 0);

    return round2(addOnPay);
  }, [
    secondJobAddOns,
    secondJobWaterfallQtyNumber,
    secondJobOutletPlugCutoutQtyNumber,
    secondJobDisposalResponsibility,
  ]);

  const secondJobInstallerJustServicePay = useMemo(() => {
    const knownJustServicePrices: Record<string, number> = {
      "extra cutting": 100,
      "big polishing": 90,
      "small polishing": 90,
      "sink cutout": 100,
      "outlet plug cutout": 25,
      "cooktop cutout": 100,
      "granite / marble sealing": 25,
      "granite/marble sealing": 25,
      plumbing: 25,
      "drill holes": 25,
      "silicone caulking": 25,
      "reinstall sink": 100,
      "fix chips": 50,
      "fix seam": 50,
      polishing: 90,
    };

    const normalized = secondJobJustServices.map(normalizeServiceName);
    let subtotal = 0;

    normalized.forEach((service) => {
      subtotal += knownJustServicePrices[service] || 0;
    });

    if (normalized.length > 0 && subtotal < INSTALLER_JUST_SERVICE_MINIMUM) {
      subtotal = INSTALLER_JUST_SERVICE_MINIMUM;
    }

    return round2(subtotal);
  }, [secondJobJustServices]);

  const secondJobInstallerCutPolishPay = 0;
  const secondJobInstallerSinkPay = 0;
  const secondJobInstallerOtherPay = 0;

  const secondJobInstallerSubtotalPay = useMemo(() => {
    return round2(
      secondJobInstallerBasePay +
        secondJobInstallerAddOnPay +
        secondJobInstallerJustServicePay +
        secondJobInstallerMileagePayout +
        secondJobInstallerCutPolishPay +
        secondJobInstallerSinkPay +
        secondJobInstallerOtherPay
    );
  }, [
    secondJobInstallerBasePay,
    secondJobInstallerAddOnPay,
    secondJobInstallerJustServicePay,
    secondJobInstallerMileagePayout,
  ]);

  const secondJobInstallerHstPay = useMemo(
    () => round2(secondJobInstallerSubtotalPay * HST_RATE),
    [secondJobInstallerSubtotalPay]
  );

  const secondJobInstallerReturnPay = 0;

  const secondJobInstallerPay = useMemo(() => {
    return round2(
      secondJobInstallerSubtotalPay +
        secondJobInstallerHstPay +
        secondJobInstallerReturnPay
    );
  }, [
    secondJobInstallerSubtotalPay,
    secondJobInstallerHstPay,
  ]);

  const companySubtotal = useMemo(
    () => round2(customerSubtotal - installerSubtotalPay),
    [customerSubtotal, installerSubtotalPay]
  );

  const companyHst = useMemo(
    () => round2(customerHst - installerHstPay),
    [customerHst, installerHstPay]
  );

  const companyProfit = useMemo(
    () => round2(customerTotal - installerPay),
    [customerTotal, installerPay]
  );

  const secondJobCompanySubtotal = useMemo(
    () => round2(secondJobCustomerSubtotal - secondJobInstallerSubtotalPay),
    [secondJobCustomerSubtotal, secondJobInstallerSubtotalPay]
  );

  const secondJobCompanyHst = useMemo(
    () => round2(secondJobCustomerHst - secondJobInstallerHstPay),
    [secondJobCustomerHst, secondJobInstallerHstPay]
  );

  const secondJobCompanyProfit = useMemo(
    () => round2(secondJobCustomerTotal - secondJobInstallerPay),
    [secondJobCustomerTotal, secondJobInstallerPay]
  );

  const formattedSelectedAddOns = useMemo(() => {
    return selectedAddOns.map((service) =>
      formatSelectedAddOnLabel({
        service,
        waterfallQuantity: waterfallQtyNumber,
        outletPlugCutoutQuantity: outletPlugCutoutQtyNumber,
        disposalResponsibility,
      })
    );
  }, [
    selectedAddOns,
    waterfallQtyNumber,
    outletPlugCutoutQtyNumber,
    disposalResponsibility,
  ]);

  const formattedSecondJobAddOns = useMemo(() => {
    return secondJobAddOns.map((service) =>
      formatSelectedAddOnLabel({
        service,
        waterfallQuantity: secondJobWaterfallQtyNumber,
        outletPlugCutoutQuantity: secondJobOutletPlugCutoutQtyNumber,
        disposalResponsibility: secondJobDisposalResponsibility,
      })
    );
  }, [
    secondJobAddOns,
    secondJobWaterfallQtyNumber,
    secondJobOutletPlugCutoutQtyNumber,
    secondJobDisposalResponsibility,
  ]);

  const maxOneWayKm = useMemo(() => {
    const primary = oneWayKm || 0;
    const secondary = showSecondJob ? secondJobOneWayKm || 0 : 0;
    return Math.max(primary, secondary);
  }, [oneWayKm, secondJobOneWayKm, showSecondJob]);

  const combinedCustomerSubtotal = useMemo(() => {
    return round2(customerSubtotal + (showSecondJob ? secondJobCustomerSubtotal : 0));
  }, [customerSubtotal, secondJobCustomerSubtotal, showSecondJob]);

  const combinedCustomerHst = useMemo(() => {
    return round2(customerHst + (showSecondJob ? secondJobCustomerHst : 0));
  }, [customerHst, secondJobCustomerHst, showSecondJob]);

  const combinedCustomerTotal = useMemo(() => {
    return round2(customerTotal + (showSecondJob ? secondJobCustomerTotal : 0));
  }, [customerTotal, secondJobCustomerTotal, showSecondJob]);

  const combinedInstallerSubtotalPay = useMemo(() => {
    return round2(
      installerSubtotalPay + (showSecondJob ? secondJobInstallerSubtotalPay : 0)
    );
  }, [installerSubtotalPay, secondJobInstallerSubtotalPay, showSecondJob]);

  const combinedInstallerHstPay = useMemo(() => {
    return round2(installerHstPay + (showSecondJob ? secondJobInstallerHstPay : 0));
  }, [installerHstPay, secondJobInstallerHstPay, showSecondJob]);

  const combinedInstallerPay = useMemo(() => {
    return round2(installerPay + (showSecondJob ? secondJobInstallerPay : 0));
  }, [installerPay, secondJobInstallerPay, showSecondJob]);

  const combinedCompanySubtotal = useMemo(() => {
    return round2(companySubtotal + (showSecondJob ? secondJobCompanySubtotal : 0));
  }, [companySubtotal, secondJobCompanySubtotal, showSecondJob]);

  const combinedCompanyHst = useMemo(() => {
    return round2(companyHst + (showSecondJob ? secondJobCompanyHst : 0));
  }, [companyHst, secondJobCompanyHst, showSecondJob]);

  const combinedCompanyProfit = useMemo(() => {
    return round2(companyProfit + (showSecondJob ? secondJobCompanyProfit : 0));
  }, [companyProfit, secondJobCompanyProfit, showSecondJob]);

  const combinedSqft = useMemo(() => {
    return sqft + (showSecondJob ? secondJobSqftNumber : 0);
  }, [sqft, secondJobSqftNumber, showSecondJob]);

  const distanceTierLabel = useMemo(() => {
    return getDistanceTierLabel(maxOneWayKm, combinedCustomerTotal);
  }, [maxOneWayKm, combinedCustomerTotal]);

  const paymentGuidance = useMemo(() => {
    return getPaymentGuidance(maxOneWayKm, combinedCustomerTotal, companyName);
  }, [maxOneWayKm, combinedCustomerTotal, companyName]);

  const recommendedInstallerType = useMemo(() => {
    return getRecommendedInstallerType({
      oneWayKm: maxOneWayKm,
      sqft: combinedSqft,
      serviceType,
      hasSecondJob: showSecondJob,
      total: combinedCustomerTotal,
    });
  }, [maxOneWayKm, combinedSqft, serviceType, showSecondJob, combinedCustomerTotal]);

  const allowedPayments = useMemo(() => {
    return getAllowedPaymentOptions({
      oneWayKm: maxOneWayKm,
      total: combinedCustomerTotal,
      companyName,
    });
  }, [maxOneWayKm, combinedCustomerTotal, companyName]);

  useEffect(() => {
    if (paymentMethod && !allowedPayments[paymentMethod]) {
      setPaymentMethod("");
    }
  }, [allowedPayments, paymentMethod]);

  const serviceLabel = useMemo(() => {
    if (pricingConfig.label) return pricingConfig.label;
    if (serviceType === "justServices") return "Just Services";
    return "-";
  }, [pricingConfig.label, serviceType]);

  const showMainServiceFields = serviceType !== "" && serviceType !== "justServices";
  const showSecondJobMainServiceFields =
    secondJobServiceType !== "" && secondJobServiceType !== "justServices";

  async function saveBookingToDatabase() {
    if (bookingSaved && savedBookingId) return savedBookingId;

    const bookingNumber = originalJobId || `JOB-${Date.now()}`;

    const bookingPayload = {
      job_id: bookingNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      company_name: companyName,
      phone_number: phoneNumber,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      timeline,
      scheduled_date: scheduledDate || null,
      pickup_time_slot: pickupTimeSlot,
      service_type: serviceType || null,
      service_type_label: serviceLabel,
      job_size: sqft || 0,
      sqft: sqft || 0,
      payment_method: paymentMethod,
      status: getBookingStatusFromPaymentMethod(paymentMethod),
      payment_status: paymentMethod === "creditDebit" ? "pending" : "unpaid",
      notes: sideNote || null,
      side_note: sideNote || null,
      subtotal: combinedCustomerSubtotal,
      hst: combinedCustomerHst,
      hst_amount: combinedCustomerHst,
      final_total: combinedCustomerTotal,
      add_on_services: formattedSelectedAddOns,
      just_services: selectedJustServices,
      waterfall_quantity: waterfallQtyNumber,
      outlet_plug_cutout_quantity: outletPlugCutoutQtyNumber,
      disposal_responsibility: disposalResponsibility,
      installer_base_pay: installerBasePay,
      installer_mileage_pay: installerMileagePayout,
      installer_addon_pay: installerAddOnPay,
      installer_cut_polish_pay: 0,
      installer_sink_pay: 0,
      installer_other_pay: 0,
      installer_subtotal_pay: combinedInstallerSubtotalPay,
      installer_hst_pay: combinedInstallerHstPay,
      installer_pay: combinedInstallerPay,
      company_profit: combinedCompanyProfit,
      mileage_fee: mileageCharge + secondJobMileageCharge,
      return_fee: returnFeeRequired ? RETURN_FEE_CUSTOMER : 0,
      return_fee_charged: returnFeeRequired ? RETURN_FEE_CUSTOMER : 0,
      return_fee_installer_pay: returnFeeRequired ? RETURN_FEE_INSTALLER_PAY : 0,
      ai_distance_tier: distanceTierLabel,
      ai_recommended_installer_type: recommendedInstallerType,
      ai_route_hint: showSecondJob
        ? "Multi-job checkout - review grouped route."
        : "Single job checkout.",
      admin_fee_note: showSecondJob ? "Includes grouped second job." : null,
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert([bookingPayload])
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message || "Could not save booking.");
    }

    const savedId = String(data?.id || bookingNumber);
    setBookingSaved(true);
    setSavedBookingId(savedId);
    return savedId;
  }

  async function sendConfirmationEmails(bookingId: string) {
    const paymentLabel = getPaymentMethodLabel(paymentMethod);

    await Promise.all([
      sendEmail({
        to: customerEmail,
        subject: `1800TOPS Booking Confirmation - ${originalJobId || bookingId}`,
        html: buildCustomerConfirmationHtml({
          customerName,
          customerEmail,
          companyName,
          bookingNumber: originalJobId || bookingId,
          paymentMethod: paymentLabel,
          total: combinedCustomerTotal,
          timeline,
          scheduledDate,
          pickupTimeSlot,
          pickupAddress,
          dropoffAddress,
          serviceLabel,
        }),
      }),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New 1800TOPS Booking - ${originalJobId || bookingId}`,
        html: buildAdminConfirmationHtml({
          customerName,
          customerEmail,
          companyName,
          bookingNumber: originalJobId || bookingId,
          paymentMethod: paymentLabel,
          total: combinedCustomerTotal,
          timeline,
          scheduledDate,
          pickupTimeSlot,
          pickupAddress,
          dropoffAddress,
          serviceLabel,
          notes: sideNote,
        }),
      }),
    ]);
  }

  async function handleOfflineConfirmation() {
    try {
      if (!paymentMethod) {
        alert("Please select a payment method.");
        return;
      }

      if (paymentMethod === "creditDebit") {
        alert("Please use the card payment button for Stripe.");
        return;
      }

      setSubmitting(true);

      const bookingId = await saveBookingToDatabase();
      await sendConfirmationEmails(bookingId);

      sessionStorage.removeItem("checkoutDraft");
      setConfirmationReady(true);
      setCheckoutStep("review");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not confirm booking.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStripeCheckout() {
    try {
      if (!paymentMethod) {
        alert("Please select a payment method.");
        return;
      }

      if (paymentMethod !== "creditDebit") {
        alert("Please use Confirm Booking for non-card payment methods.");
        return;
      }

      if (!customerName.trim()) {
        alert("Please enter customer name.");
        return;
      }

      if (!customerEmail.trim()) {
        alert("Please enter customer email.");
        return;
      }

      if (combinedCustomerTotal <= 0) {
        alert("Invalid checkout total.");
        return;
      }

      setStripeLoading(true);

      const bookingId = await saveBookingToDatabase();

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(combinedCustomerTotal * 100),
          customerName,
          customerEmail,
          jobGroupId: originalJobId || bookingId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not start Stripe checkout.");
      }

      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to load.");
      }

      const result = await stripe.redirectToCheckout({
        sessionId: data.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Stripe checkout failed.");
    } finally {
      setStripeLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-yellow-500 md:text-4xl">
            Checkout
          </h1>
          <p className="text-zinc-300">
            Review your booking, choose payment, and confirm.
          </p>
        </div>

        {cancelled ? (
          <div className="mb-6 rounded-2xl border border-red-500 bg-zinc-900 p-5 text-red-300">
            Payment was cancelled. Your booking review is still here.
          </div>
        ) : null}

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-500 bg-zinc-900 p-5 text-red-300">
            {loadError}
          </div>
        ) : null}

        {confirmationReady ? (
          <div className="mb-6 rounded-2xl border border-green-500 bg-zinc-900 p-5">
            <h2 className="text-xl font-semibold text-green-400">
              Booking Confirmed
            </h2>
            <div className="mt-3 space-y-2 text-sm text-gray-300">
              <p>Booking ID: {originalJobId || savedBookingId || "-"}</p>
              <p>Customer: {customerName}</p>
              <p>Email: {customerEmail}</p>
              <p>Payment Method: {getPaymentMethodLabel(paymentMethod)}</p>
              <p>Total: {money(combinedCustomerTotal)}</p>
              <p>Customer confirmation email sent.</p>
              <p>Admin confirmation email sent.</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          {isRebook ? (
            <div className="rounded-2xl border border-yellow-500 bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold text-yellow-400">Return Visit / Rebook</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-300">
                <p>Original Job ID: {originalJobId || "-"}</p>
                <p>Reason: {rebookReason || "-"}</p>
                <p>Customer Mileage Discount: 40%</p>
                <p>Customer Pays: 60% of mileage</p>
                <p>Installer Gets: 50% of installer mileage</p>
                <p>Company Keeps: customer mileage minus installer mileage</p>
                {returnFeeRequired ? (
                  <p className="font-semibold text-yellow-400">
                    Return Trip Fee: ${RETURN_FEE_CUSTOMER.toFixed(2)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <SectionTitle title="Customer Details" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={customerName}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="email"
                value={customerEmail}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                value={companyName}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="tel"
                value={phoneNumber}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                value={dropoffAddress}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                value={pickupAddress}
                readOnly
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-black p-4">
            <h3 className="mb-3 text-lg font-semibold text-yellow-500">Smart Booking Notes</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Distance Tier: {distanceTierLabel}</p>
              <p>• AI Recommended Installer: {recommendedInstallerType}</p>
              <p>• Max Service Distance: {MAX_SERVICE_DISTANCE_KM} km one-way</p>
              {paymentGuidance.map((note) => (
                <p key={note}>• {note}</p>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="Mileage Summary" />
            <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4 text-sm text-gray-300">
              <p>• One-Way Distance: {oneWayKm ?? 0} km</p>
              <p>• Round-Trip Distance: {roundTripKm ?? 0} km</p>
              <p>• Chargeable Distance: {chargeableKm} km</p>
              <p>• Customer Mileage Charge: {money(mileageCharge)}</p>
              <p>• Installer Mileage Pay: {money(installerMileagePayout)}</p>
              <p>• Company Mileage Profit: {money(platformMileageProfit)}</p>
            </div>
          </div>

          <div>
            <SectionTitle title="Primary Job Summary" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SummaryBox title="Booking Details">
                <p>Timeline: {timeline || "-"}</p>
                <p>Scheduled Date: {scheduledDate || "-"}</p>
                <p>Pickup Window: {pickupTimeSlot || "-"}</p>
                <p>Service: {serviceLabel}</p>
                {showMainServiceFields ? <p>Square Footage: {sqft}</p> : null}
                <p>Notes: {sideNote || "-"}</p>
              </SummaryBox>

              <SummaryBox title="Primary Job Pricing">
                <p>Service Price: {money(servicePrice)}</p>
                <p>Add-On Total: {money(customerAddOnTotal)}</p>
                <p>Just Service Total: {money(customerJustServiceTotal)}</p>
                <p>Timeline Charge: {money(timelineCharge)}</p>
                <p>Subtotal: {money(customerSubtotal)}</p>
                <p>HST: {money(customerHst)}</p>
                <p className="font-semibold text-yellow-400">
                  Total: {money(customerTotal)}
                </p>
              </SummaryBox>
            </div>

            {formattedSelectedAddOns.length > 0 ? (
              <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                <p className="mb-2 font-semibold text-yellow-400">
                  Selected Add-On Services
                </p>
                <div className="space-y-1 text-sm text-gray-300">
                  {formattedSelectedAddOns.map((service) => (
                    <p key={service}>• {service}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedJustServices.length > 0 ? (
              <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                <p className="mb-2 font-semibold text-yellow-400">
                  Selected Just Services
                </p>
                <div className="space-y-1 text-sm text-gray-300">
                  {selectedJustServices.map((service) => (
                    <p key={service}>• {service}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {showSecondJob ? (
            <div>
              <SectionTitle title="Second Job Summary" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SummaryBox title="Second Job Details">
                  <p>Address: {secondJobAddress || "-"}</p>
                  <p>Date: {secondJobDate || "-"}</p>
                  <p>Pickup Window: {secondJobPickupTimeSlot || "-"}</p>
                  <p>
                    Service:{" "}
                    {secondJobPricingConfig.label || secondJobServiceType || "-"}
                  </p>
                  {showSecondJobMainServiceFields ? (
                    <p>Square Footage: {secondJobSqftNumber}</p>
                  ) : null}
                  <p>Notes: {secondJobSideNote || "-"}</p>
                </SummaryBox>

                <SummaryBox title="Second Job Pricing">
                  <p>Service Price: {money(secondJobServicePrice)}</p>
                  <p>Add-On Total: {money(secondJobAddOnTotal)}</p>
                  <p>Just Service Total: {money(secondJobJustServiceTotal)}</p>
                  <p>Mileage Charge: {money(secondJobMileageCharge)}</p>
                  <p>Subtotal: {money(secondJobCustomerSubtotal)}</p>
                  <p>HST: {money(secondJobCustomerHst)}</p>
                  <p className="font-semibold text-yellow-400">
                    Total: {money(secondJobCustomerTotal)}
                  </p>
                </SummaryBox>
              </div>

              {formattedSecondJobAddOns.length > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                  <p className="mb-2 font-semibold text-yellow-400">
                    Second Job Selected Add-On Services
                  </p>
                  <div className="space-y-1 text-sm text-gray-300">
                    {formattedSecondJobAddOns.map((service) => (
                      <p key={service}>• {service}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {secondJobJustServices.length > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                  <p className="mb-2 font-semibold text-yellow-400">
                    Second Job Selected Just Services
                  </p>
                  <div className="space-y-1 text-sm text-gray-300">
                    {secondJobJustServices.map((service) => (
                      <p key={service}>• {service}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4 text-sm text-gray-300">
                <p>Second Job One-Way Distance: {secondJobOneWayKm ?? 0} km</p>
                <p>Second Job Round-Trip Distance: {secondJobRoundTripKm ?? 0} km</p>
                <p>Second Job Chargeable Distance: {secondJobChargeableKm} km</p>
                <p>Second Job Customer Mileage Charge: {money(secondJobMileageCharge)}</p>
                <p>Second Job Installer Mileage Pay: {money(secondJobInstallerMileagePayout)}</p>
                <p>Second Job Company Mileage Profit: {money(secondJobPlatformMileageProfit)}</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-700 bg-black p-4 text-sm text-gray-300">
            <p className="font-semibold text-yellow-400">Combined Math Check</p>
            <p>Combined Customer Subtotal: {money(combinedCustomerSubtotal)}</p>
            <p>Combined Customer HST: {money(combinedCustomerHst)}</p>
            <p>Combined Customer Total: {money(combinedCustomerTotal)}</p>
            <p>Combined Installer Subtotal: {money(combinedInstallerSubtotalPay)}</p>
            <p>Combined Installer HST: {money(combinedInstallerHstPay)}</p>
            <p>Combined Installer Pay: {money(combinedInstallerPay)}</p>
            <p>Combined Company Subtotal: {money(combinedCompanySubtotal)}</p>
            <p>Combined Company HST Portion: {money(combinedCompanyHst)}</p>
            <p className="font-semibold text-yellow-400">
              Combined Company Profit: {money(combinedCompanyProfit)}
            </p>
          </div>

          <div>
            <SectionTitle title="Payment Method" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="rounded-xl border border-zinc-700 bg-black p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === "creditDebit"}
                    onChange={() => setPaymentMethod("creditDebit")}
                    disabled={!allowedPayments.creditDebit || confirmationReady}
                  />
                  <div>
                    <p className="font-semibold text-white">Credit / Debit</p>
                    <p className="text-sm text-gray-400">Pay online with Stripe</p>
                  </div>
                </div>
              </label>

              <label className="rounded-xl border border-zinc-700 bg-black p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === "etransfer"}
                    onChange={() => setPaymentMethod("etransfer")}
                    disabled={!allowedPayments.etransfer || confirmationReady}
                  />
                  <div>
                    <p className="font-semibold text-white">E-Transfer</p>
                    <p className="text-sm text-gray-400">Book now and pay after confirmation</p>
                  </div>
                </div>
              </label>

              <label className="rounded-xl border border-zinc-700 bg-black p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === "cashPickup"}
                    onChange={() => setPaymentMethod("cashPickup")}
                    disabled={!allowedPayments.cashPickup || confirmationReady}
                  />
                  <div>
                    <p className="font-semibold text-white">Cash Pickup</p>
                    <p className="text-sm text-gray-400">
                      {allowedPayments.cashPickup
                        ? "Available for this booking"
                        : "Not available for this distance / total"}
                    </p>
                  </div>
                </div>
              </label>

              <label className="rounded-xl border border-zinc-700 bg-black p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === "chequePickup"}
                    onChange={() => setPaymentMethod("chequePickup")}
                    disabled={!allowedPayments.chequePickup || confirmationReady}
                  />
                  <div>
                    <p className="font-semibold text-white">Cheque Pickup</p>
                    <p className="text-sm text-gray-400">
                      {allowedPayments.chequePickup
                        ? "Available for this booking"
                        : "Not available for this distance / total"}
                    </p>
                  </div>
                </div>
              </label>

              <label className="rounded-xl border border-zinc-700 bg-black p-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={paymentMethod === "weeklyInvoice"}
                    onChange={() => setPaymentMethod("weeklyInvoice")}
                    disabled={!allowedPayments.weeklyInvoice || confirmationReady}
                  />
                  <div>
                    <p className="font-semibold text-white">Weekly Invoice</p>
                    <p className="text-sm text-gray-400">
                      {allowedPayments.weeklyInvoice
                        ? "Available for qualified company bookings"
                        : "Requires company name and minimum total"}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {checkoutStep === "review" ? (
            <div className="rounded-xl border border-yellow-500 bg-black p-4 text-sm text-gray-300">
              <p className="mb-2 text-lg font-semibold text-yellow-400">Checkout Review</p>
              <p>Customer: {customerName}</p>
              <p>Email: {customerEmail}</p>
              <p>Phone: {phoneNumber}</p>
              <p>Pickup: {pickupAddress}</p>
              <p>Dropoff: {dropoffAddress}</p>
              <p>
                Timeline:{" "}
                {timeline === "sameDay"
                  ? "Same Day"
                  : timeline === "nextDay"
                  ? "Next Day"
                  : "Scheduled"}
              </p>
              <p>Distance Tier: {distanceTierLabel}</p>
              <p>Recommended Installer: {recommendedInstallerType}</p>
              <p>Payment Method: {getPaymentMethodLabel(paymentMethod)}</p>
              <p>Combined Customer Subtotal: {money(combinedCustomerSubtotal)}</p>
              <p>Combined Customer HST: {money(combinedCustomerHst)}</p>
              <p className="font-semibold text-yellow-400">
                Combined Customer Total: {money(combinedCustomerTotal)}
              </p>
            </div>
          ) : null}

          {!confirmationReady ? (
            <>
              {checkoutStep === "form" ? (
                <button
                  type="button"
                  onClick={() => setCheckoutStep("review")}
                  className="w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400"
                >
                  Continue to Review
                </button>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleOfflineConfirmation}
                    disabled={
                      submitting ||
                      stripeLoading ||
                      !paymentMethod ||
                      paymentMethod === "creditDebit"
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black py-4 font-semibold text-white transition hover:border-yellow-500 disabled:opacity-50"
                  >
                    {submitting ? "Confirming..." : "Confirm Booking"}
                  </button>

                  <button
                    type="button"
                    onClick={handleStripeCheckout}
                    disabled={
                      submitting ||
                      stripeLoading ||
                      paymentMethod !== "creditDebit"
                    }
                    className="w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {stripeLoading
                      ? "Redirecting to Payment..."
                      : `Pay ${money(combinedCustomerTotal)}`}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black p-6 text-white">
          Loading checkout page...
        </main>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}