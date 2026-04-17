"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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

type PaymentMethod =
  | ""
  | "creditDebit"
  | "eTransfer"
  | "cash"
  | "cheque"
  | "weeklyInvoice"
  | "payLater";

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

function toArray(value: string) {
  return value
    .split(" | ")
    .map((item) => item.trim())
    .filter(Boolean);
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
  if (service === "outlet plug cutout") return 50 * params.outletPlugCutoutQuantity;
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
  if (service === "outlet plug cutout") return 25 * params.outletPlugCutoutQuantity;
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

function loadCustomerProfile(): SavedCustomerProfile | null {
  try {
    const raw = localStorage.getItem("lastCustomerProfile");
    if (!raw) return null;
    return JSON.parse(raw) as SavedCustomerProfile;
  } catch {
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

function getAllowedPaymentMethods(params: {
  oneWayKm: number;
  total: number;
  companyName: string;
}) {
  const { oneWayKm, total, companyName } = params;
  const methods: PaymentMethod[] = ["creditDebit", "eTransfer", "payLater"];

  if (oneWayKm <= 80) {
    methods.push("cash");
  } else if (oneWayKm <= 120 && total >= 2500) {
    methods.push("cash");
  } else if (oneWayKm <= 200 && total >= 5000) {
    methods.push("cash");
  }

  if (oneWayKm <= 50) {
    methods.push("cheque");
  } else if (oneWayKm <= 80 && total >= 2500) {
    methods.push("cheque");
  } else if (oneWayKm <= 120 && total >= 5000) {
    methods.push("cheque");
  }

  if (companyName.trim() && total >= 2500) {
    methods.push("weeklyInvoice");
  }

  return Array.from(new Set(methods));
}

function getStatusFromPaymentMethod(method: PaymentMethod) {
  if (method === "creditDebit") return "pending_payment";
  if (method === "weeklyInvoice") return "pending_invoice";
  return "available";
}

function paymentLabel(method: PaymentMethod) {
  if (method === "creditDebit") return "Credit / Debit";
  if (method === "eTransfer") return "E-Transfer";
  if (method === "cash") return "Cash";
  if (method === "cheque") return "Cheque";
  if (method === "weeklyInvoice") return "Weekly Invoice";
  if (method === "payLater") return "Pay Later";
  return "-";
}

function generateJobGroupId() {
  return `JG-${Date.now()}`;
}

function generateJobId(index: number) {
  return `JOB-${Date.now()}-${index}`;
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

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  type?: string;
}) {
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

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
  const [mileageLoading, setMileageLoading] = useState(false);
  const [mileageError, setMileageError] = useState("");
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
  const [secondJobServiceType, setSecondJobServiceType] = useState<MainServiceType>("");
  const [secondJobSideNote, setSecondJobSideNote] = useState("");
  const [secondJobAddOns, setSecondJobAddOns] = useState<string[]>([]);
  const [secondJobJustServices, setSecondJobJustServices] = useState<string[]>([]);
  const [secondJobWaterfallQuantity, setSecondJobWaterfallQuantity] = useState("1");
  const [secondJobOutletPlugCutoutQuantity, setSecondJobOutletPlugCutoutQuantity] =
    useState("1");
  const [secondJobDisposalResponsibility, setSecondJobDisposalResponsibility] =
    useState<DisposalResponsibility>("customer");
  const [secondJobMileageLoading, setSecondJobMileageLoading] = useState(false);
  const [secondJobMileageError, setSecondJobMileageError] = useState("");
  const [secondJobOneWayKm, setSecondJobOneWayKm] = useState<number | null>(null);
  const [secondJobRoundTripKm, setSecondJobRoundTripKm] = useState<number | null>(null);
  const [secondJobChargeableKm, setSecondJobChargeableKm] = useState<number>(0);
  const [secondJobMileageCharge, setSecondJobMileageCharge] = useState<number>(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("creditDebit");
  const [submitLoading, setSubmitLoading] = useState(false);

  const isRebook = searchParams.get("rebook") === "true";
  const originalJobId = searchParams.get("jobId") || "";
  const rebookReason = searchParams.get("reason") || "";
  const returnFeeRequired =
    searchParams.get("returnFeeRequired") === "true" ||
    searchParams.get("returnFee") === "true";
  const rebookDate = searchParams.get("date") || "";

  useEffect(() => {
    if (!isRebook) {
      const saved = loadCustomerProfile();
      if (saved) {
        if (saved.customerName) {
          setCustomerName((prev) => prev || saved.customerName || "");
        }
        if (saved.customerEmail) {
          setCustomerEmail((prev) => prev || saved.customerEmail || "");
        }
        if (saved.companyName) {
          setCompanyName((prev) => prev || saved.companyName || "");
        }
        if (saved.phoneNumber) {
          setPhoneNumber((prev) => prev || saved.phoneNumber || "");
        }
      }
    }
  }, [isRebook]);

  useEffect(() => {
    const getText = (key: string) => searchParams.get(key) || "";

    const urlCustomerName = getText("customerName");
    const urlCustomerEmail = getText("customerEmail");
    const urlCompanyName = getText("companyName");
    const urlPhoneNumber = getText("phoneNumber");
    const urlPickupAddress = getText("pickupAddress");
    const urlDropoffAddress = getText("dropoffAddress");
    const urlTimeline = getText("timeline");
    const urlScheduledDate = getText("scheduledDate");
    const urlPickupTimeSlot = getText("pickupTimeSlot");
    const urlServiceType = (getText("serviceType") || "") as MainServiceType;
    const urlSqft = getText("sqft");
    const urlSideNote = getText("sideNote");

    if (urlCustomerName) setCustomerName(urlCustomerName);
    if (urlCustomerEmail) setCustomerEmail(urlCustomerEmail);
    if (urlCompanyName) setCompanyName(urlCompanyName);
    if (urlPhoneNumber) setPhoneNumber(urlPhoneNumber);
    if (urlPickupAddress) setPickupAddress(urlPickupAddress);
    if (urlDropoffAddress) setDropoffAddress(urlDropoffAddress);
    if (urlTimeline) setTimeline(urlTimeline);
    if (rebookDate || urlScheduledDate) setScheduledDate(rebookDate || urlScheduledDate);
    if (urlPickupTimeSlot) setPickupTimeSlot(urlPickupTimeSlot);
    if (urlServiceType) setServiceType(urlServiceType);
    if (urlSqft) setJobSize(urlSqft);

    if (urlSideNote) {
      setSideNote(
        `${urlSideNote}${rebookReason ? ` | Rebook reason: ${rebookReason}` : ""}`
      );
    } else if (rebookReason) {
      setSideNote(`Rebook reason: ${rebookReason}`);
    }

    const baseOneWay = Number(getText("oneWayKm") || 0);
    const baseRoundTrip = Number(getText("roundTripKm") || 0);
    const baseChargeable = Number(getText("chargeableKm") || 0);
    const baseMileage = Number(getText("mileageCharge") || 0);

    setOneWayKm(baseOneWay || null);
    setRoundTripKm(baseRoundTrip || null);
    setChargeableKm(baseChargeable || 0);
    setMileageCharge(baseMileage || 0);

    setSelectedAddOns(toArray(getText("addOnServices")));
    setSelectedJustServices(toArray(getText("justServices")));
    setWaterfallQuantity(getText("waterfallQuantity") || "1");
    setOutletPlugCutoutQuantity(getText("outletPlugCutoutQuantity") || "1");
    setDisposalResponsibility(
      ((getText("disposalResponsibility") || "customer") as DisposalResponsibility) || "customer"
    );

    const hasSecondJob = getText("showSecondJob") === "true";
    setShowSecondJob(hasSecondJob);
    setSecondJobAddress(getText("secondJobAddress"));
    setSecondJobDate(getText("secondJobScheduledDate") || getText("secondJobDate"));
    setSecondJobPickupTimeSlot(getText("secondJobPickupTimeSlot"));
    setSecondJobSqft(getText("secondJobSqft"));
    setSecondJobServiceType((getText("secondJobServiceType") || "") as MainServiceType);
    setSecondJobSideNote(getText("secondJobSideNote"));
    setSecondJobAddOns(toArray(getText("secondJobAddOns")));
    setSecondJobJustServices(toArray(getText("secondJobJustServices")));
    setSecondJobOneWayKm(Number(getText("secondJobOneWayKm") || 0) || null);
    setSecondJobRoundTripKm(Number(getText("secondJobRoundTripKm") || 0) || null);
    setSecondJobChargeableKm(Number(getText("secondJobChargeableKm") || 0) || 0);
    setSecondJobMileageCharge(Number(getText("secondJobMileageCharge") || 0) || 0);
    setSecondJobWaterfallQuantity(getText("secondJobWaterfallQuantity") || "1");
    setSecondJobOutletPlugCutoutQuantity(
      getText("secondJobOutletPlugCutoutQuantity") || "1"
    );
    setSecondJobDisposalResponsibility(
      ((getText("secondJobDisposalResponsibility") || "customer") as DisposalResponsibility) ||
        "customer"
    );
  }, [searchParams, rebookDate, rebookReason]);

  const sqft = useMemo(() => parsePositiveNumber(jobSize), [jobSize]);
  const secondJobSqftNumber = useMemo(() => parsePositiveNumber(secondJobSqft), [secondJobSqft]);

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
    if (secondJobSqftNumber <= 0 || secondJobPricingConfig.customerRate <= 0) {
      return 0;
    }
    return round2(secondJobSqftNumber * secondJobPricingConfig.customerRate);
  }, [secondJobSqftNumber, secondJobPricingConfig.customerRate]);

  const installerServicePayout = useMemo(() => {
    if (sqft <= 0 || pricingConfig.installerRate <= 0) return 0;
    return round2(sqft * pricingConfig.installerRate);
  }, [sqft, pricingConfig.installerRate]);

  const secondJobInstallerServicePayout = useMemo(() => {
    if (secondJobSqftNumber <= 0 || secondJobPricingConfig.installerRate <= 0) {
      return 0;
    }
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
    return round2(Math.max(0, effectiveCustomerMileageRate - effectiveInstallerMileageRate));
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
  const secondJobTimelineCharge = useMemo(() => 0, []);

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
  const customerTotal = useMemo(() => round2(customerSubtotal + customerHst), [
    customerSubtotal,
    customerHst,
  ]);

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
    secondJobTimelineCharge,
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

  const installerCutPolishPay = useMemo(() => 0, []);
  const installerSinkPay = useMemo(() => 0, []);
  const installerOtherPay = useMemo(() => 0, []);

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
    installerCutPolishPay,
    installerSinkPay,
    installerOtherPay,
  ]);

  const installerHstPay = useMemo(() => round2(installerSubtotalPay * HST_RATE), [
    installerSubtotalPay,
  ]);

  const installerReturnPay = useMemo(() => {
    return isRebook && returnFeeRequired ? RETURN_FEE_INSTALLER_PAY : 0;
  }, [isRebook, returnFeeRequired]);

  const installerPay = useMemo(
    () => round2(installerSubtotalPay + installerHstPay + installerReturnPay),
    [installerSubtotalPay, installerHstPay, installerReturnPay]
  );

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

  const secondJobInstallerCutPolishPay = useMemo(() => 0, []);
  const secondJobInstallerSinkPay = useMemo(() => 0, []);
  const secondJobInstallerOtherPay = useMemo(() => 0, []);

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
    secondJobInstallerCutPolishPay,
    secondJobInstallerSinkPay,
    secondJobInstallerOtherPay,
  ]);

  const secondJobInstallerHstPay = useMemo(
    () => round2(secondJobInstallerSubtotalPay * HST_RATE),
    [secondJobInstallerSubtotalPay]
  );
  const secondJobInstallerPay = useMemo(
    () => round2(secondJobInstallerSubtotalPay + secondJobInstallerHstPay),
    [secondJobInstallerSubtotalPay, secondJobInstallerHstPay]
  );

  const companySubtotal = useMemo(
    () => round2(customerSubtotal - installerSubtotalPay),
    [customerSubtotal, installerSubtotalPay]
  );
  const companyHst = useMemo(() => round2(customerHst - installerHstPay), [
    customerHst,
    installerHstPay,
  ]);
  const companyProfit = useMemo(() => round2(customerTotal - installerPay), [
    customerTotal,
    installerPay,
  ]);

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

  const showDisposalOption = useMemo(() => {
    return selectedAddOns.some((service) => {
      const normalized = normalizeServiceName(service);
      return (
        normalized === "remove and dispose laminate" ||
        normalized === "remove and dispose stone" ||
        normalized === "vanity removal" ||
        normalized === "backsplash tile removal"
      );
    });
  }, [selectedAddOns]);

  const showSecondJobDisposalOption = useMemo(() => {
    return secondJobAddOns.some((service) => {
      const normalized = normalizeServiceName(service);
      return (
        normalized === "remove and dispose laminate" ||
        normalized === "remove and dispose stone" ||
        normalized === "vanity removal" ||
        normalized === "backsplash tile removal"
      );
    });
  }, [secondJobAddOns]);

  const showWaterfallQuantity = useMemo(() => {
    return selectedAddOns.some((service) => normalizeServiceName(service) === "waterfall");
  }, [selectedAddOns]);

  const showOutletQuantity = useMemo(() => {
    return selectedAddOns.some(
      (service) => normalizeServiceName(service) === "outlet plug cutout"
    );
  }, [selectedAddOns]);

  const showSecondJobWaterfallQuantity = useMemo(() => {
    return secondJobAddOns.some((service) => normalizeServiceName(service) === "waterfall");
  }, [secondJobAddOns]);

  const showSecondJobOutletQuantity = useMemo(() => {
    return secondJobAddOns.some(
      (service) => normalizeServiceName(service) === "outlet plug cutout"
    );
  }, [secondJobAddOns]);

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
    return round2(installerSubtotalPay + (showSecondJob ? secondJobInstallerSubtotalPay : 0));
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

  const finalTotalForPayment = useMemo(() => {
    return showSecondJob ? combinedCustomerTotal : customerTotal;
  }, [showSecondJob, combinedCustomerTotal, customerTotal]);

  const allowedPaymentMethods = useMemo(() => {
    return getAllowedPaymentMethods({
      oneWayKm: maxOneWayKm,
      total: finalTotalForPayment,
      companyName,
    });
  }, [maxOneWayKm, finalTotalForPayment, companyName]);

  useEffect(() => {
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(allowedPaymentMethods[0] || "creditDebit");
    }
  }, [allowedPaymentMethods, paymentMethod]);

  const calculateMileage = async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setMileageError("Please enter both pick up and drop off address.");
      return;
    }

    setMileageLoading(true);
    setMileageError("");

    try {
      const res = await fetch("/api/mileage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupAddress,
          dropoffAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Mileage calculation failed");
      }

      const safeOneWayKm = Number(data.oneWayKm) || 0;
      const mileageResult = getChargeableKm(safeOneWayKm);
      const customerMileageCharge = mileageResult.chargeableKm * effectiveCustomerMileageRate;

      setOneWayKm(safeOneWayKm);
      setRoundTripKm(mileageResult.roundTripKm);
      setChargeableKm(mileageResult.chargeableKm);
      setMileageCharge(round2(customerMileageCharge));
    } catch (error) {
      setMileageError(error instanceof Error ? error.message : "Mileage calculation failed");
      setOneWayKm(null);
      setRoundTripKm(null);
      setChargeableKm(0);
      setMileageCharge(0);
    } finally {
      setMileageLoading(false);
    }
  };

  const calculateSecondJobMileage = async () => {
    if (!pickupAddress.trim() || !secondJobAddress.trim()) {
      setSecondJobMileageError("Please enter first job pick up address and second job address.");
      return;
    }

    setSecondJobMileageLoading(true);
    setSecondJobMileageError("");

    try {
      const res = await fetch("/api/mileage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupAddress,
          dropoffAddress: secondJobAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Mileage calculation failed");
      }

      const safeOneWayKm = Number(data.oneWayKm) || 0;
      const mileageResult = getChargeableKm(safeOneWayKm);
      const customerMileageCharge = mileageResult.chargeableKm * effectiveCustomerMileageRate;

      setSecondJobOneWayKm(safeOneWayKm);
      setSecondJobRoundTripKm(mileageResult.roundTripKm);
      setSecondJobChargeableKm(mileageResult.chargeableKm);
      setSecondJobMileageCharge(round2(customerMileageCharge));
    } catch (error) {
      setSecondJobMileageError(
        error instanceof Error ? error.message : "Mileage calculation failed"
      );
      setSecondJobOneWayKm(null);
      setSecondJobRoundTripKm(null);
      setSecondJobChargeableKm(0);
      setSecondJobMileageCharge(0);
    } finally {
      setSecondJobMileageLoading(false);
    }
  };

  const handleContinueToCheckout = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      alert("That payment method is not allowed for this distance / total.");
      return;
    }

    setSubmitLoading(true);

    try {
      const jobGroupId = generateJobGroupId();
      const primaryJobId = generateJobId(1);
      const secondJobId = generateJobId(2);
      const createdAt = new Date().toISOString();
      const bookingStatus = getStatusFromPaymentMethod(paymentMethod);

      const primaryBooking: Record<string, any> = {
        job_group_id: jobGroupId,
        job_id: primaryJobId,
        job_number: 1,
        created_at: createdAt,

        customer_name: customerName,
        customer_email: customerEmail,
        company_name: companyName || null,
        phone_number: phoneNumber || null,

        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,

        timeline,
        scheduled_date: scheduledDate || null,
        pickup_time_slot: pickupTimeSlot || null,

        service_type: serviceType,
        service_type_label: pricingConfig.label || serviceType,
        sqft,
        job_size: sqft,
        side_note: sideNote || null,

        one_way_km: oneWayKm,
        round_trip_km: roundTripKm,
        chargeable_km: chargeableKm,
        customer_mileage_charge: mileageCharge,
        mileage_fee: mileageCharge,

        add_on_services: formattedSelectedAddOns,
        just_services: selectedJustServices,

        waterfall_quantity: waterfallQtyNumber,
        outlet_plug_cutout_quantity: outletPlugCutoutQtyNumber,
        disposal_responsibility: disposalResponsibility,

        customer_sqft_rate: pricingConfig.customerRate,
        service_price: servicePrice,
        timeline_charge: timelineCharge,
        subtotal: customerSubtotal,
        hst: customerHst,
        final_total: customerTotal,

        installer_base_pay: installerBasePay,
        installer_mileage_pay: installerMileagePayout,
        installer_addon_pay: installerAddOnPay,
        installer_cut_polish_pay: installerCutPolishPay,
        installer_sink_pay: installerSinkPay,
        installer_other_pay: installerOtherPay,
        installer_subtotal_pay: installerSubtotalPay,
        installer_hst_pay: installerHstPay,
        installer_pay: installerPay,

        return_fee: customerReturnFee,
        return_fee_charged: customerReturnFee,
        return_fee_installer_pay: installerReturnPay,

        company_subtotal: companySubtotal,
        company_hst: companyHst,
        company_profit: companyProfit,
        platform_mileage_profit: platformMileageProfit,

        booking_distance_tier: distanceTierLabel,
        recommended_installer_type: recommendedInstallerType,

        payment_method: paymentMethod,
        status: bookingStatus,

        is_rebook: isRebook,
        original_job_id: originalJobId || null,
        rebook_reason: rebookReason || null,
      };

      const rows: Record<string, any>[] = [primaryBooking];

      if (showSecondJob) {
        rows.push({
          job_group_id: jobGroupId,
          job_id: secondJobId,
          job_number: 2,
          created_at: createdAt,

          customer_name: customerName,
          customer_email: customerEmail,
          company_name: companyName || null,
          phone_number: phoneNumber || null,

          pickup_address: pickupAddress,
          dropoff_address: secondJobAddress,

          timeline: "scheduled",
          scheduled_date: secondJobDate || null,
          pickup_time_slot: secondJobPickupTimeSlot || null,

          service_type: secondJobServiceType,
          service_type_label: secondJobPricingConfig.label || secondJobServiceType,
          sqft: secondJobSqftNumber,
          job_size: secondJobSqftNumber,
          side_note: secondJobSideNote || null,

          one_way_km: secondJobOneWayKm,
          round_trip_km: secondJobRoundTripKm,
          chargeable_km: secondJobChargeableKm,
          customer_mileage_charge: secondJobMileageCharge,
          mileage_fee: secondJobMileageCharge,

          add_on_services: formattedSecondJobAddOns,
          just_services: secondJobJustServices,

          waterfall_quantity: secondJobWaterfallQtyNumber,
          outlet_plug_cutout_quantity: secondJobOutletPlugCutoutQtyNumber,
          disposal_responsibility: secondJobDisposalResponsibility,

          customer_sqft_rate: secondJobPricingConfig.customerRate,
          service_price: secondJobServicePrice,
          timeline_charge: secondJobTimelineCharge,
          subtotal: secondJobCustomerSubtotal,
          hst: secondJobCustomerHst,
          final_total: secondJobCustomerTotal,

          installer_base_pay: secondJobInstallerBasePay,
          installer_mileage_pay: secondJobInstallerMileagePayout,
          installer_addon_pay: secondJobInstallerAddOnPay,
          installer_cut_polish_pay: secondJobInstallerCutPolishPay,
          installer_sink_pay: secondJobInstallerSinkPay,
          installer_other_pay: secondJobInstallerOtherPay,
          installer_subtotal_pay: secondJobInstallerSubtotalPay,
          installer_hst_pay: secondJobInstallerHstPay,
          installer_pay: secondJobInstallerPay,

          company_subtotal: secondJobCompanySubtotal,
          company_hst: secondJobCompanyHst,
          company_profit: secondJobCompanyProfit,
          platform_mileage_profit: secondJobPlatformMileageProfit,

          booking_distance_tier: distanceTierLabel,
          recommended_installer_type: recommendedInstallerType,

          payment_method: paymentMethod,
          status: bookingStatus,
        });
      }

      const { error } = await supabase.from("bookings").insert(rows);

      if (error) {
        throw new Error(error.message || "Failed to save booking.");
      }

      try {
        await sendEmail({
          to: customerEmail,
          subject: `Booking Confirmed - ${jobGroupId}`,
          type: "booking_confirmation",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
              <h2>Booking Received</h2>
              <p>Hello ${customerName},</p>
              <p>Your booking has been received by 1-800TOPS.</p>
              <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
                <p><strong>Booking Group ID:</strong> ${jobGroupId}</p>
                <p><strong>Payment Method:</strong> ${paymentLabel(paymentMethod)}</p>
                <p><strong>Total:</strong> ${money(finalTotalForPayment)}</p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Customer email error:", emailError);
      }

      try {
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `New Booking - ${jobGroupId}`,
          type: "booking_admin",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
              <h2>New Booking Created</h2>
              <p><strong>Booking Group ID:</strong> ${jobGroupId}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              <p><strong>Phone:</strong> ${phoneNumber}</p>
              <p><strong>Payment Method:</strong> ${paymentLabel(paymentMethod)}</p>
              <p><strong>Total:</strong> ${money(finalTotalForPayment)}</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Admin email error:", emailError);
      }

      if (paymentMethod === "creditDebit") {
        const stripeRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(finalTotalForPayment * 100),
            jobGroupId,
            customerName,
            customerEmail,
          }),
        });

        const stripeData = await stripeRes.json().catch(() => null);

        if (!stripeRes.ok) {
          throw new Error(stripeData?.error || "Stripe checkout failed.");
        }

        if (stripeData?.url) {
          window.location.href = stripeData.url;
          return;
        }

        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = `/confirmation?jobGroupId=${encodeURIComponent(
        jobGroupId
      )}&paymentMethod=${encodeURIComponent(paymentMethod)}`;
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to confirm booking.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-yellow-500 md:text-4xl">
            {isRebook ? "Rebook Job" : "Checkout"}
          </h1>
          <p className="text-zinc-300">
            Review your project details, choose payment, and confirm your booking.
          </p>
        </div>

        {isRebook ? (
          <div className="mb-6 rounded-2xl border border-yellow-500 bg-zinc-900 p-5">
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
                  Return Trip Fee: {money(RETURN_FEE_CUSTOMER)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
          <div>
            <SectionTitle title="Customer Details" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Your Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="email"
                placeholder="Customer Email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                placeholder="Drop Off Address"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black p-3"
              />
              <input
                type="text"
                placeholder="Pick Up Address"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
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
            <SectionTitle
              title="Mileage Calculation"
              subtitle={
                isRebook
                  ? `Round-trip mileage rules: first 120 km total is free. Over 120 km up to 320 km is charged only on the extra km. Rebook customer mileage is $${effectiveCustomerMileageRate.toFixed(
                      2
                    )}/km and installer mileage is $${effectiveInstallerMileageRate.toFixed(
                      2
                    )}/km.`
                  : `Round-trip mileage rules: first 120 km total is free. Over 120 km up to 320 km is charged only on the extra km. Standard customer mileage rate is $${CUSTOMER_MILEAGE_RATE.toFixed(
                      2
                    )}/km.`
              }
            />
            <div className="mt-4">
              <button
                type="button"
                onClick={calculateMileage}
                className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
              >
                {mileageLoading ? "Calculating..." : "Calculate Distance"}
              </button>
            </div>
            {mileageError ? (
              <div className="mt-4 rounded-xl border border-red-500 bg-black p-3 text-sm text-red-400">
                {mileageError}
              </div>
            ) : null}
            {oneWayKm !== null && roundTripKm !== null ? (
              <div className="mt-4 space-y-2 rounded-xl border border-zinc-700 bg-black p-4 text-sm text-gray-300">
                <p>• One-Way Distance: {oneWayKm} km</p>
                <p>• Round-Trip Distance: {roundTripKm} km</p>
                <p>• Chargeable Distance: {chargeableKm} km</p>
                <p>• Customer Mileage Charge: {money(mileageCharge)}</p>
                <p>• Installer Mileage Pay: {money(installerMileagePayout)}</p>
                <p>• Company Mileage Profit: {money(platformMileageProfit)}</p>
              </div>
            ) : null}
          </div>

          <div>
            <SectionTitle title="Timeline" />
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-3"
            >
              <option value="">Select Timeline</option>
              <option value="sameDay">Same Day — $210</option>
              <option value="nextDay">Next Day — $150</option>
              <option value="scheduled">Scheduled — $0</option>
            </select>
            {timeline === "scheduled" ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm text-gray-300">Select Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                />
              </div>
            ) : null}
          </div>

          <div>
            <SectionTitle title="Pickup Time Window" />
            <select
              value={pickupTimeSlot}
              onChange={(e) => setPickupTimeSlot(e.target.value)}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-3"
            >
              <option value="">Select Time Window</option>
              <option value="8:00 AM - 11:00 AM">8:00 AM – 11:00 AM</option>
              <option value="11:00 AM - 2:00 PM">11:00 AM – 2:00 PM</option>
              <option value="2:00 PM - 5:00 PM">2:00 PM – 5:00 PM</option>
              <option value="5:00 PM - 8:00 PM">5:00 PM – 8:00 PM</option>
            </select>
          </div>

          <div>
            <SectionTitle title="Service Type" />
            <select
              value={serviceType}
              onChange={(e) => {
                const value = e.target.value as MainServiceType;
                setServiceType(value);
                if (value === "justServices") {
                  setJobSize("");
                  setSelectedAddOns([]);
                } else {
                  setSelectedJustServices([]);
                }
              }}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-3"
            >
              <option value="">Select Service Type</option>
              <option value="full_height_backsplash">
                Full Height Backsplash — $10/sqft
              </option>
              <option value="installation_3cm">3cm Installation — $10/sqft</option>
              <option value="installation_2cm_standard">
                2cm Standard Installation — $9/sqft
              </option>
              <option value="backsplash_tiling">Backsplash Tiling — $21/sqft</option>
              <option value="justServices">Just Services</option>
            </select>
          </div>

          {serviceType !== "" && serviceType !== "justServices" ? (
            <>
              <div>
                <SectionTitle title="Job Size (Square Footage)" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Square Footage"
                  value={jobSize}
                  onChange={(e) => setJobSize(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-zinc-700 bg-black p-3"
                />
              </div>

              <div className="rounded-xl border border-zinc-700 bg-black p-4">
                <h3 className="mb-3 text-lg font-semibold text-yellow-500">
                  Service Pricing Summary
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• Service: {pricingConfig.label || "-"}</p>
                  <p>• Square Footage: {sqft}</p>
                  <p>• Customer Rate: ${pricingConfig.customerRate.toFixed(2)}/sqft</p>
                  <p className="font-semibold text-yellow-400">
                    • Service Price: {money(servicePrice)}
                  </p>
                </div>
              </div>

              <div>
                <SectionTitle title="Add-On Services" />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {ADD_ON_SERVICES.map((service) => (
                    <label
                      key={service}
                      className="flex items-center justify-between rounded-xl border border-zinc-700 bg-black p-4"
                    >
                      <span className="pr-4 text-sm text-gray-300">{service}</span>
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(service)}
                        onChange={() =>
                          setSelectedAddOns((prev) =>
                            prev.includes(service)
                              ? prev.filter((item) => item !== service)
                              : [...prev, service]
                          )
                        }
                      />
                    </label>
                  ))}
                </div>

                {showWaterfallQuantity ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-gray-300">Waterfall Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={waterfallQuantity}
                      onChange={(e) => setWaterfallQuantity(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                    />
                  </div>
                ) : null}

                {showOutletQuantity ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-gray-300">
                      Outlet Plug Cutout Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={outletPlugCutoutQuantity}
                      onChange={(e) => setOutletPlugCutoutQuantity(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black p-3"
                    />
                  </div>
                ) : null}

                {showDisposalOption ? (
                  <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                    <p className="mb-2 font-semibold text-yellow-400">Disposal Responsibility</p>
                    <div className="space-y-2 text-sm text-gray-300">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="disposalResponsibility"
                          checked={disposalResponsibility === "customer"}
                          onChange={() => setDisposalResponsibility("customer")}
                        />
                        <span>Customer / Shop Responsible for Disposal</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="disposalResponsibility"
                          checked={disposalResponsibility === "installer"}
                          onChange={() => setDisposalResponsibility("installer")}
                        />
                        <span>Installer Responsible for Disposal</span>
                      </label>
                    </div>
                  </div>
                ) : null}

                {formattedSelectedAddOns.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                    <p className="mb-2 font-semibold text-yellow-400">Selected Add-On Services</p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {formattedSelectedAddOns.map((service) => (
                        <p key={service}>• {service}</p>
                      ))}
                    </div>
                    <p className="mt-3 font-semibold text-yellow-400">
                      Add-On Service Total: {money(customerAddOnTotal)}
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {serviceType === "justServices" ? (
            <div>
              <SectionTitle title="Just Services" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {JUST_SERVICES.map((service) => (
                  <label
                    key={service}
                    className="flex items-center justify-between rounded-xl border border-zinc-700 bg-black p-4"
                  >
                    <span className="pr-4 text-sm text-gray-300">{service}</span>
                    <input
                      type="checkbox"
                      checked={selectedJustServices.includes(service)}
                      onChange={() =>
                        setSelectedJustServices((prev) =>
                          prev.includes(service)
                            ? prev.filter((item) => item !== service)
                            : [...prev, service]
                        )
                      }
                    />
                  </label>
                ))}
              </div>

              {selectedJustServices.length > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4">
                  <p className="mb-2 font-semibold text-yellow-400">Selected Just Services</p>
                  <div className="space-y-1 text-sm text-gray-300">
                    {selectedJustServices.map((service) => (
                      <p key={service}>• {service}</p>
                    ))}
                  </div>
                  <p className="mt-3 font-semibold text-yellow-400">
                    Just Service Minimum: {money(customerJustServiceTotal)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <SectionTitle title="Side Note" />
            <textarea
              placeholder="Add any side note or extra request"
              value={sideNote}
              onChange={(e) => setSideNote(e.target.value)}
              className="mt-4 min-h-[120px] w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          {!showSecondJob ? (
            <button
              type="button"
              onClick={() => setShowSecondJob(true)}
              className="w-full rounded-xl border border-yellow-500 py-3 font-semibold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
            >
              + Add Another Job
            </button>
          ) : null}

          {showSecondJob ? (
            <div className="space-y-4 rounded-2xl border border-zinc-700 bg-black p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-yellow-500">Second Job</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondJob(false);
                    setSecondJobAddress("");
                    setSecondJobDate("");
                    setSecondJobPickupTimeSlot("");
                    setSecondJobSqft("");
                    setSecondJobServiceType("");
                    setSecondJobSideNote("");
                    setSecondJobAddOns([]);
                    setSecondJobJustServices([]);
                    setSecondJobWaterfallQuantity("1");
                    setSecondJobOutletPlugCutoutQuantity("1");
                    setSecondJobDisposalResponsibility("customer");
                    setSecondJobMileageError("");
                    setSecondJobOneWayKm(null);
                    setSecondJobRoundTripKm(null);
                    setSecondJobChargeableKm(0);
                    setSecondJobMileageCharge(0);
                  }}
                  className="text-sm text-red-400"
                >
                  Remove
                </button>
              </div>

              <input
                type="text"
                placeholder="Second Job Address"
                value={secondJobAddress}
                onChange={(e) => setSecondJobAddress(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
              />

              <input
                type="date"
                value={secondJobDate}
                onChange={(e) => setSecondJobDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
              />

              <select
                value={secondJobPickupTimeSlot}
                onChange={(e) => setSecondJobPickupTimeSlot(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
              >
                <option value="">Select Time Window</option>
                <option value="8:00 AM - 11:00 AM">8:00 AM – 11:00 AM</option>
                <option value="11:00 AM - 2:00 PM">11:00 AM – 2:00 PM</option>
                <option value="2:00 PM - 5:00 PM">2:00 PM – 5:00 PM</option>
                <option value="5:00 PM - 8:00 PM">5:00 PM – 8:00 PM</option>
              </select>

              <select
                value={secondJobServiceType}
                onChange={(e) => {
                  const value = e.target.value as MainServiceType;
                  setSecondJobServiceType(value);
                  if (value === "justServices") {
                    setSecondJobSqft("");
                    setSecondJobAddOns([]);
                  } else {
                    setSecondJobJustServices([]);
                  }
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
              >
                <option value="">Select Service Type</option>
                <option value="full_height_backsplash">
                  Full Height Backsplash — $10/sqft
                </option>
                <option value="installation_3cm">3cm Installation — $10/sqft</option>
                <option value="installation_2cm_standard">
                  2cm Standard Installation — $9/sqft
                </option>
                <option value="backsplash_tiling">Backsplash Tiling — $21/sqft</option>
                <option value="justServices">Just Services</option>
              </select>

              {secondJobServiceType !== "" && secondJobServiceType !== "justServices" ? (
                <>
                  <input
                    type="number"
                    placeholder="Second Job Square Footage"
                    value={secondJobSqft}
                    onChange={(e) => setSecondJobSqft(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
                  />

                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-yellow-500">
                      Second Job Pricing Summary
                    </h3>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>• Service: {secondJobPricingConfig.label || "-"}</p>
                      <p>• Square Footage: {secondJobSqftNumber}</p>
                      <p>
                        • Customer Rate: ${secondJobPricingConfig.customerRate.toFixed(2)}/sqft
                      </p>
                      <p className="font-semibold text-yellow-400">
                        • Service Price: {money(secondJobServicePrice)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-yellow-500">
                      Second Job Add-On Services
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {ADD_ON_SERVICES.map((service) => (
                        <label
                          key={`second-job-${service}`}
                          className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-4"
                        >
                          <span className="pr-4 text-sm text-gray-300">{service}</span>
                          <input
                            type="checkbox"
                            checked={secondJobAddOns.includes(service)}
                            onChange={() =>
                              setSecondJobAddOns((prev) =>
                                prev.includes(service)
                                  ? prev.filter((item) => item !== service)
                                  : [...prev, service]
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>

                    {showSecondJobWaterfallQuantity ? (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-gray-300">
                          Second Job Waterfall Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={secondJobWaterfallQuantity}
                          onChange={(e) => setSecondJobWaterfallQuantity(e.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
                        />
                      </div>
                    ) : null}

                    {showSecondJobOutletQuantity ? (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm text-gray-300">
                          Second Job Outlet Plug Cutout Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={secondJobOutletPlugCutoutQuantity}
                          onChange={(e) =>
                            setSecondJobOutletPlugCutoutQuantity(e.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3"
                        />
                      </div>
                    ) : null}

                    {showSecondJobDisposalOption ? (
                      <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                        <p className="mb-2 font-semibold text-yellow-400">
                          Second Job Disposal Responsibility
                        </p>
                        <div className="space-y-2 text-sm text-gray-300">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="secondJobDisposalResponsibility"
                              checked={secondJobDisposalResponsibility === "customer"}
                              onChange={() => setSecondJobDisposalResponsibility("customer")}
                            />
                            <span>Customer / Shop Responsible for Disposal</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="secondJobDisposalResponsibility"
                              checked={secondJobDisposalResponsibility === "installer"}
                              onChange={() => setSecondJobDisposalResponsibility("installer")}
                            />
                            <span>Installer Responsible for Disposal</span>
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {formattedSecondJobAddOns.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                        <p className="mb-2 font-semibold text-yellow-400">
                          Selected Second Job Add-On Services
                        </p>
                        <div className="space-y-1 text-sm text-gray-300">
                          {formattedSecondJobAddOns.map((service) => (
                            <p key={`second-job-selected-${service}`}>• {service}</p>
                          ))}
                        </div>
                        <p className="mt-3 font-semibold text-yellow-400">
                          Add-On Service Total: {money(secondJobAddOnTotal)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {secondJobServiceType === "justServices" ? (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-yellow-500">
                    Second Job Just Services
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {JUST_SERVICES.map((service) => (
                      <label
                        key={`second-job-just-${service}`}
                        className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-4"
                      >
                        <span className="pr-4 text-sm text-gray-300">{service}</span>
                        <input
                          type="checkbox"
                          checked={secondJobJustServices.includes(service)}
                          onChange={() =>
                            setSecondJobJustServices((prev) =>
                              prev.includes(service)
                                ? prev.filter((item) => item !== service)
                                : [...prev, service]
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>

                  {secondJobJustServices.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                      <p className="mb-2 font-semibold text-yellow-400">
                        Selected Second Job Just Services
                      </p>
                      <div className="space-y-1 text-sm text-gray-300">
                        {secondJobJustServices.map((service) => (
                          <p key={`second-job-just-selected-${service}`}>• {service}</p>
                        ))}
                      </div>
                      <p className="mt-3 font-semibold text-yellow-400">
                        Just Service Minimum: {money(secondJobJustServiceTotal)}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 text-lg font-semibold text-yellow-500">
                  Second Job Mileage Calculation
                </h3>
                <button
                  type="button"
                  onClick={calculateSecondJobMileage}
                  className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
                >
                  {secondJobMileageLoading
                    ? "Calculating..."
                    : "Calculate Second Job Distance"}
                </button>

                {secondJobMileageError ? (
                  <div className="mt-4 rounded-xl border border-red-500 bg-zinc-900 p-3 text-sm text-red-400">
                    {secondJobMileageError}
                  </div>
                ) : null}

                {secondJobOneWayKm !== null && secondJobRoundTripKm !== null ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-gray-300">
                    <p>• One-Way Distance: {secondJobOneWayKm} km</p>
                    <p>• Round-Trip Distance: {secondJobRoundTripKm} km</p>
                    <p>• Chargeable Distance: {secondJobChargeableKm} km</p>
                    <p className="font-semibold text-yellow-400">
                      • Mileage Charge: {money(secondJobMileageCharge)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-400">
            Final pricing, including mileage, timeline, services, return trip fee, and payment
            method, is shown below.
          </div>

          <div className="rounded-2xl border border-zinc-700 bg-black p-5">
            <SectionTitle title="Payment Method" subtitle="Choose how the customer will pay." />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
            >
              {allowedPaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {paymentLabel(method)}
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-2 text-sm text-gray-300">
              <p>• Selected Payment: {paymentLabel(paymentMethod)}</p>
              <p>• Final Total: {money(finalTotalForPayment)}</p>
              <p>• Booking Distance Tier: {distanceTierLabel}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-700 bg-black p-5">
            <SectionTitle title="Checkout Summary" />
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span>Primary Job Subtotal</span>
                <span>{money(customerSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span>Primary Job HST</span>
                <span>{money(customerHst)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span>Primary Job Total</span>
                <span>{money(customerTotal)}</span>
              </div>

              {showSecondJob ? (
                <>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Second Job Subtotal</span>
                    <span>{money(secondJobCustomerSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Second Job HST</span>
                    <span>{money(secondJobCustomerHst)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Second Job Total</span>
                    <span>{money(secondJobCustomerTotal)}</span>
                  </div>
                </>
              ) : null}

              <div className="flex items-center justify-between border-t border-zinc-700 pt-4 text-base font-semibold text-yellow-400">
                <span>Grand Total</span>
                <span>{money(finalTotalForPayment)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleContinueToCheckout}
              disabled={submitLoading}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {submitLoading
                ? "Processing..."
                : paymentMethod === "creditDebit"
                ? "Confirm & Continue to Payment"
                : "Confirm Booking"}
            </button>
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
        <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 md:py-10">
          <div className="mx-auto max-w-5xl">Loading checkout...</div>
        </main>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
