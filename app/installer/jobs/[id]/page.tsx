"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ADMIN_EMAIL = "ultrapropm@gmail.com";
const RETURN_FEE_CUSTOMER = 200;
const RETURN_FEE_INSTALLER_PAY = 180;
const BASE_MILEAGE_RATE = 1.5;
const REBOOK_CUSTOMER_MILEAGE_PERCENT = 0.6;
const INSTALLER_HST_RATE = 0.13;

const INSTALLER_RATES = {
  installation_3cm: 7,
  installation_2cm_standard: 6.5,
  installation_2cm: 6.5,
  full_height_backsplash: 7,

  mileage_per_km: 1,

  waterfall: 60,
  outlet_plug_cutout: 25,
  difficult: 100,
  remeasure_backsplash_fh: 100,
  remeasure_backsplash_lh: 50,
  extra_helper: 110,
  condo_highrise: 50,
  sink_cutout_onsite: 100,
  cooktop_cutout: 100,
  sealing: 25,
  plumbing_removal: 25,
  onsite_cutting: 100,
  onsite_polishing: 90,
} as const;

type Booking = {
  id: string;
  job_id?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;

  pickup_address?: string | null;
  dropoff_address?: string | null;

  pickup_city?: string | null;
  dropoff_city?: string | null;

  service_type?: string | null;
  service_type_label?: string | null;
  material_type?: string | null;
  material_size?: string | null;
  job_size?: number | null;
  sqft?: number | null;

  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;

  installer_pay?: number | null;
  installer_pay_status?: string | null;

  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  accepted_at?: string | null;
  completed_at?: string | null;
  incomplete_at?: string | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  incomplete_photo_url?: string | null;
  incomplete_photo_path?: string | null;
  incomplete_reported_at?: string | null;

  completion_photo_url?: string | null;
  completion_photo_path?: string | null;
  completion_marked_at?: string | null;

  homeowner_signed_completion_required?: boolean | null;
  homeowner_signed_completion_url?: string | null;
  homeowner_signed_completion_path?: string | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;

  mileage_fee?: number | null;
  customer_sqft_rate?: number | null;
  service_price?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;
  customer_mileage_charge?: number | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  waterfall_quantity?: number | null;
  outlet_plug_cutout_quantity?: number | null;
  disposal_responsibility?: string | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;
};

type InstallerPricing = {
  basePay: number;
  mileagePay: number;
  addonPay: number;
  cutPolishPay: number;
  sinkPay: number;
  otherPay: number;
  subtotalPay: number;
  hstPay: number;
  returnPay: number;
  totalPay: number;
  payoutLines: { label: string; amount: number }[];
  parsedAddons: { label: string; amount: number }[];
  parsedJustServices: { label: string; amount: number }[];
};

function money(value?: number | null) {
  const n = Number(value || 0);
  return "$" + n.toFixed(2);
}

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function num(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) return [from, to].filter(Boolean).join(" - ");

  return job.scheduled_time || "-";
}

function getHoursUntilJob(scheduledDate?: string | null) {
  if (!scheduledDate) return null;

  const target = new Date(`${scheduledDate}T09:00:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  return diffMs / (1000 * 60 * 60);
}

function getServiceTypeLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "installation_2cm") return "2cm Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getDisposalResponsibilityLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "customer") return "Customer / Shop Responsible";
  if (value === "installer") return "Installer Responsible";
  return value;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  if (typeof value === "string") {
    return value
      .split(" | ")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function joinPipe(values: string[]) {
  return values.filter(Boolean).join(" | ");
}

function normalizeStatus(status?: string | null) {
  const value = normalizeText(status);

  if (!value) return "new";
  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "accepted_by_installer") return "accepted";
  if (value === "in progress") return "in_progress";
  if (value === "completed_pending_admin_review") {
    return "completed_pending_admin_review";
  }
  if (value === "canceled") return "cancelled";

  return value;
}

function isAvailableJob(job: Booking) {
  const status = normalizeStatus(job.status);
  const hasInstaller =
    safeText(job.installer_name).length > 0 ||
    safeText(job.reassigned_installer_name).length > 0;

  if (hasInstaller) return false;
  if (job.accepted_at) return false;
  if (job.completed_at) return false;
  if (job.incomplete_at) return false;

  return status === "available" || status === "pending" || status === "new";
}

function isAssignedToInstaller(job: Booking, installerName: string) {
  const current = normalizeText(installerName);
  if (!current) return false;

  return (
    normalizeText(job.installer_name) === current ||
    normalizeText(job.reassigned_installer_name) === current
  );
}

function extractVisibleArea(address?: string | null) {
  const raw = safeText(address);
  if (!raw) return "-";

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    if (/\d/.test(parts[0])) return parts[1] || parts[0];
    return parts[0];
  }

  if (parts.length === 2) {
    if (/\d/.test(parts[0])) return parts[1] || parts[0];
    return parts[0];
  }

  return raw;
}

function getVisibleAddress(address?: string | null, canSeeFull?: boolean) {
  return canSeeFull ? safeText(address) || "-" : extractVisibleArea(address);
}

function getDiscountedIncompleteMileage(job: Booking) {
  const chargeableKm =
    num(job.chargeable_km) > 0
      ? num(job.chargeable_km)
      : num(job.round_trip_km) > 0
      ? num(job.round_trip_km)
      : num(job.one_way_km) > 0
      ? num(job.one_way_km) * 2
      : 0;

  const discounted =
    chargeableKm * BASE_MILEAGE_RATE * REBOOK_CUSTOMER_MILEAGE_PERCENT;

  return Number(discounted.toFixed(2));
}

function getIncompleteTotalDue(job: Booking, returnFee: number) {
  return Number((num(returnFee) + getDiscountedIncompleteMileage(job)).toFixed(2));
}

function getRebookUrl(job: Booking) {
  const bookingId = safeText(job.id);
  const publicJobId = safeText(job.job_id) || bookingId;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/rebook?booking_id=${encodeURIComponent(
      bookingId
    )}&job_id=${encodeURIComponent(publicJobId)}`;
  }

  return `/rebook?booking_id=${encodeURIComponent(
    bookingId
  )}&job_id=${encodeURIComponent(publicJobId)}`;
}

function parseInstallerServiceLine(raw: string, job: Booking) {
  const value = normalizeText(raw);

  if (value.includes("waterfall")) {
    const qty = Math.max(1, num(job.waterfall_quantity));
    return {
      label: `Waterfall x${qty}`,
      amount: INSTALLER_RATES.waterfall * qty,
      bucket: "addon" as const,
    };
  }

  if (value.includes("outlet")) {
    const qty = Math.max(1, num(job.outlet_plug_cutout_quantity));
    return {
      label: `Outlet Plug Cutout x${qty}`,
      amount: INSTALLER_RATES.outlet_plug_cutout * qty,
      bucket: "addon" as const,
    };
  }

  if (value.includes("extra helper")) {
    return {
      label: "Extra Helper",
      amount: INSTALLER_RATES.extra_helper,
      bucket: "addon" as const,
    };
  }

  if (
    value.includes("difficult") ||
    value.includes("stairs") ||
    value.includes("basement")
  ) {
    return {
      label: "Difficult / Stairs / Basement",
      amount: INSTALLER_RATES.difficult,
      bucket: "addon" as const,
    };
  }

  if (
    value.includes("condo") ||
    value.includes("high rise") ||
    value.includes("high-rise")
  ) {
    return {
      label: "Condo / High-Rise",
      amount: INSTALLER_RATES.condo_highrise,
      bucket: "other" as const,
    };
  }

  if (value.includes("sink cutout")) {
    return {
      label: "Sink Cutout Onsite",
      amount: INSTALLER_RATES.sink_cutout_onsite,
      bucket: "sink" as const,
    };
  }

  if (value.includes("cooktop")) {
    return {
      label: "Cooktop Cutout",
      amount: INSTALLER_RATES.cooktop_cutout,
      bucket: "other" as const,
    };
  }

  if (value.includes("plumbing")) {
    return {
      label: "Plumbing Removal",
      amount: INSTALLER_RATES.plumbing_removal,
      bucket: "other" as const,
    };
  }

  if (value.includes("sealing")) {
    return {
      label: "Marble / Granite Sealing",
      amount: INSTALLER_RATES.sealing,
      bucket: "other" as const,
    };
  }

  if (value.includes("onsite cutting")) {
    return {
      label: "Onsite Cutting",
      amount: INSTALLER_RATES.onsite_cutting,
      bucket: "cut_polish" as const,
    };
  }

  if (value.includes("onsite polishing")) {
    return {
      label: "Onsite Polishing",
      amount: INSTALLER_RATES.onsite_polishing,
      bucket: "cut_polish" as const,
    };
  }

  if (value.includes("remeasure backsplash fh")) {
    return {
      label: "Remeasure Backsplash FH",
      amount: INSTALLER_RATES.remeasure_backsplash_fh,
      bucket: "other" as const,
    };
  }

  if (value.includes("remeasure backsplash lh")) {
    return {
      label: "Remeasure Backsplash LH",
      amount: INSTALLER_RATES.remeasure_backsplash_lh,
      bucket: "other" as const,
    };
  }

  return {
    label: raw,
    amount: 0,
    bucket: "other" as const,
  };
}

function calculateInstallerPricing(job: Booking): InstallerPricing {
  const serviceType = safeText(job.service_type);
  const sqft = num(job.sqft || job.job_size);

  const derivedBaseRate =
    serviceType === "installation_3cm"
      ? INSTALLER_RATES.installation_3cm
      : serviceType === "installation_2cm_standard" || serviceType === "installation_2cm"
      ? INSTALLER_RATES.installation_2cm_standard
      : serviceType === "full_height_backsplash"
      ? INSTALLER_RATES.full_height_backsplash
      : 0;

  const parsedAddons = toArray(job.add_on_services).map((item) =>
    parseInstallerServiceLine(item, job)
  );

  const parsedJustServices = toArray(job.just_services).map((item) =>
    parseInstallerServiceLine(item, job)
  );

  let derivedAddonPay = 0;
  let derivedCutPolishPay = 0;
  let derivedSinkPay = 0;
  let derivedOtherPay = 0;

  [...parsedAddons, ...parsedJustServices].forEach((line) => {
    if (line.bucket === "addon") derivedAddonPay += line.amount;
    else if (line.bucket === "cut_polish") derivedCutPolishPay += line.amount;
    else if (line.bucket === "sink") derivedSinkPay += line.amount;
    else derivedOtherPay += line.amount;
  });

  const basePay =
    num(job.installer_base_pay) > 0 ? num(job.installer_base_pay) : sqft * derivedBaseRate;

  const addonPay =
    num(job.installer_addon_pay) > 0 ? num(job.installer_addon_pay) : derivedAddonPay;

  const cutPolishPay =
    num(job.installer_cut_polish_pay) > 0
      ? num(job.installer_cut_polish_pay)
      : derivedCutPolishPay;

  const sinkPay =
    num(job.installer_sink_pay) > 0 ? num(job.installer_sink_pay) : derivedSinkPay;

  const otherPay =
    num(job.installer_other_pay) > 0 ? num(job.installer_other_pay) : derivedOtherPay;

  const mileagePay =
    num(job.installer_mileage_pay) > 0
      ? num(job.installer_mileage_pay)
      : num(job.chargeable_km) > 0
      ? num(job.chargeable_km) * INSTALLER_RATES.mileage_per_km
      : 0;

  const calculatedSubtotal = Number(
    (basePay + addonPay + cutPolishPay + sinkPay + otherPay + mileagePay).toFixed(2)
  );

  const subtotalPay =
    num(job.installer_subtotal_pay) > 0 &&
    Math.abs(num(job.installer_subtotal_pay) - calculatedSubtotal) < 0.01
      ? num(job.installer_subtotal_pay)
      : calculatedSubtotal;

  const calculatedHst = Number((subtotalPay * INSTALLER_HST_RATE).toFixed(2));

  const hstPay =
    num(job.installer_hst_pay) > 0 &&
    Math.abs(num(job.installer_hst_pay) - calculatedHst) < 0.01
      ? num(job.installer_hst_pay)
      : calculatedHst;

  const returnPay =
    num(job.return_fee_installer_pay) > 0
      ? num(job.return_fee_installer_pay)
      : num(job.return_fee_charged || job.return_fee) > 0
      ? RETURN_FEE_INSTALLER_PAY
      : 0;

  const calculatedTotal = Number((subtotalPay + hstPay + returnPay).toFixed(2));

  const totalPay =
    num(job.installer_pay) > 0 &&
    Math.abs(num(job.installer_pay) - calculatedTotal) < 0.01
      ? num(job.installer_pay)
      : calculatedTotal;

  const payoutLines = [
    { label: "Base Install Pay", amount: basePay },
    { label: "Add-On Pay", amount: addonPay },
    { label: "Cut / Polish Pay", amount: cutPolishPay },
    { label: "Sink / Reattach Pay", amount: sinkPay },
    { label: "Other Service Pay", amount: otherPay },
    { label: "Mileage Pay", amount: mileagePay },
  ].filter((line) => line.amount > 0);

  return {
    basePay,
    mileagePay,
    addonPay,
    cutPolishPay,
    sinkPay,
    otherPay,
    subtotalPay,
    hstPay,
    returnPay,
    totalPay,
    payoutLines,
    parsedAddons: parsedAddons.map((item) => ({
      label: item.label,
      amount: item.amount,
    })),
    parsedJustServices: parsedJustServices.map((item) => ({
      label: item.label,
      amount: item.amount,
    })),
  };
}

async function sendCustomerEmail(params: {
  to: string;
  subject: string;
  html: string;
  type?: "assignment" | "completion" | "incomplete";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send email");
  }

  return result;
}

async function sendAdminEmail(params: {
  subject: string;
  html: string;
  type?: "installer_accepted" | "completion" | "incomplete";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: params.subject,
      html: params.html,
      type: params.type,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send admin email");
  }

  return result;
}

async function uploadJobFile(
  file: File,
  folder: "completed-jobs" | "completion-signatures" | "incomplete-jobs",
  jobId: string
) {
  const supabase = createClient();
  const safeFileName = file.name.replace(/\s+/g, "-");
  const filePath = `${folder}/${jobId}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from("job-photos").upload(filePath, file, {
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload file.");
  }

  const { data } = supabase.storage.from("job-photos").getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: data.publicUrl,
  };
}

async function uploadManyJobFiles(
  files: File[],
  folder: "completed-jobs" | "completion-signatures" | "incomplete-jobs",
  jobId: string
) {
  const uploads: { filePath: string; publicUrl: string }[] = [];

  for (const file of files) {
    const result = await uploadJobFile(file, folder, jobId);
    uploads.push(result);
  }

  return uploads;
}

function buildLinksHtml(title: string, urls: string[]) {
  if (!urls.length) return "";

  return `
    <div style="margin-top: 12px;">
      <p><strong>${title}:</strong></p>
      <ul>
        ${urls
          .map(
            (url, index) => `<li><a href="${url}">Open ${title} ${index + 1}</a></li>`
          )
          .join("")}
      </ul>
    </div>
  `;
}

function assignmentEmailHtml(job: Booking, installerName?: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>An installer has been assigned to your booking with 1-800TOPS.</p>
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Installer:</strong> ${installerName || job.installer_name || "-"}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Service:</strong> ${getServiceTypeLabel(
          job.service_type_label || job.service_type
        )}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      </div>
    </div>
  `;
}

function completionEmailHtml(
  job: Booking,
  completionPhotoUrls: string[],
  signatureUrl?: string
) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>Your job has been completed successfully.</p>
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Service:</strong> ${getServiceTypeLabel(
          job.service_type_label || job.service_type
        )}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
        ${buildLinksHtml("Completion Photo", completionPhotoUrls)}
        ${
          signatureUrl
            ? `<p><strong>Signed Completion:</strong> <a href="${signatureUrl}">View Signed Form</a></p>`
            : `<p><strong>Signed Completion:</strong> No customer signing form was provided.</p>`
        }
      </div>
      <p>Thank you for choosing 1-800TOPS.</p>
    </div>
  `;
}

function incompleteEmailHtml(
  job: Booking,
  reason: string,
  note: string,
  returnFee: number,
  incompletePhotoUrl: string
) {
  const reasonLabel =
    reason === "customer"
      ? "Customer / Homeowner Issue"
      : reason === "shop"
      ? "Shop Issue"
      : reason === "installer"
      ? "Installer Issue"
      : reason || "-";

  const discountedMileageCharge = getDiscountedIncompleteMileage(job);
  const totalDue = getIncompleteTotalDue(job, returnFee);
  const rebookUrl = getRebookUrl(job);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>Your job could not be completed at this time.</p>
      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Reason:</strong> ${reasonLabel}</p>
        <p><strong>Note:</strong> ${note || "-"}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
        <p><strong>Photo Proof:</strong> <a href="${incompletePhotoUrl}">View Photo</a></p>
      </div>
      ${
        returnFee > 0
          ? `
        <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px; background: #fafafa;">
          <p><strong>Return Visit Fee:</strong> ${money(returnFee)}</p>
          <p><strong>Discounted Mileage Charge:</strong> ${money(discountedMileageCharge)}</p>
          <p><strong>Total Due For Return Visit:</strong> ${money(totalDue)}</p>
        </div>
      `
          : ""
      }
      ${
        returnFee > 0
          ? `<p>A return visit fee has been applied because this was marked as a customer or shop-related issue.</p>`
          : ""
      }
      <p><strong>Please do not create a new booking.</strong></p>
      <p>Use the link below to continue this existing job when you are ready.</p>
      ${
        returnFee > 0
          ? `
        <div style="margin: 24px 0;">
          <a
            href="${rebookUrl}"
            style="
              display: inline-block;
              background: #d4af37;
              color: #000;
              text-decoration: none;
              padding: 14px 22px;
              border-radius: 10px;
              font-weight: bold;
            "
          >
            Request Return Visit
          </a>
        </div>
        <p><strong>Payment options on the return-visit page:</strong></p>
        <ul>
          <li>Credit / Debit</li>
          <li>E-Transfer</li>
          <li>Pay Later</li>
        </ul>
      `
          : ""
      }
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
      <p><strong>Important Job Policies:</strong></p>
      <ul>
        <li>Installer waiting time may be subject to additional charges.</li>
        <li>Please ensure all countertop pieces are counted and organized before pickup.</li>
        <li>If paperwork requires homeowner signature, provide it to the installer at pickup.</li>
      </ul>
    </div>
  `;
}

function adminAcceptedEmailHtml(job: Booking, installerName: string) {
  const pricing = calculateInstallerPricing(job);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Status:</strong> accepted</p>
      <p><strong>Installer Payout:</strong> ${money(pricing.totalPay)}</p>
    </div>
  `;
}

function adminCompletionEmailHtml(
  job: Booking,
  installerName: string,
  completionPhotoUrls: string[],
  hasSigningForm: boolean,
  signatureUrl?: string
) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Job Completed</h2>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      ${buildLinksHtml("Completion Photo", completionPhotoUrls)}
      <p><strong>Customer Provided Signing Form:</strong> ${hasSigningForm ? "Yes" : "No"}</p>
      ${
        signatureUrl
          ? `<p><strong>Signed Completion:</strong> <a href="${signatureUrl}">View Signed Form</a></p>`
          : ""
      }
      <p><strong>Status:</strong> completed_pending_admin_review</p>
    </div>
  `;
}

function adminIncompleteEmailHtml(
  job: Booking,
  installerName: string,
  reason: string,
  note: string,
  returnFee: number,
  installerPayStatus: string,
  incompletePhotoUrl: string
) {
  const reasonLabel =
    reason === "customer"
      ? "Customer / Homeowner Issue"
      : reason === "shop"
      ? "Shop Issue"
      : reason === "installer"
      ? "Installer Issue"
      : reason || "-";

  const discountedMileageCharge = getDiscountedIncompleteMileage(job);
  const totalDue = getIncompleteTotalDue(job, returnFee);
  const rebookUrl = getRebookUrl(job);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Job Incomplete</h2>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      <p><strong>Note:</strong> ${note || "-"}</p>
      <p><strong>Photo Proof:</strong> <a href="${incompletePhotoUrl}">View Photo</a></p>
      <p><strong>Customer Return Fee:</strong> ${money(returnFee)}</p>
      <p><strong>Discounted Mileage Charge:</strong> ${money(discountedMileageCharge)}</p>
      <p><strong>Total Due For Return Visit:</strong> ${money(totalDue)}</p>
      <p><strong>Installer Return Pay:</strong> ${money(
        returnFee > 0 ? RETURN_FEE_INSTALLER_PAY : 0
      )}</p>
      <p><strong>Installer Pay Status:</strong> ${installerPayStatus}</p>
      <p><strong>Rebook Link:</strong> <a href="${rebookUrl}">${rebookUrl}</a></p>
      <p><strong>Status:</strong> incomplete</p>
    </div>
  `;
}

function adminCancelRequestEmailHtml(
  job: Booking,
  installerName: string,
  reason: string,
  hoursNotice: number | null
) {
  const lateCancel = hoursNotice !== null && hoursNotice < 48;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p><strong>Installer Cancel Request</strong></p>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Cancel Reason:</strong> ${reason || "-"}</p>
      <p><strong>Notice Given:</strong> ${
        hoursNotice === null ? "-" : `${hoursNotice.toFixed(1)} hours`
      }</p>
      <p><strong>Policy Result:</strong> ${
        lateCancel
          ? "Late cancellation request (under 48 hours notice)"
          : "Within policy (48+ hours notice)"
      }</p>
      <p><strong>Next Step:</strong> Review and reassign if approved.</p>
    </div>
  `;
}

function Info({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={highlight ? "mt-1 font-semibold text-yellow-400" : "mt-1 text-white"}>
        {value || "-"}
      </p>
    </div>
  );
}

function ServiceBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="mb-3 text-lg font-semibold text-yellow-400">{title}</p>
      <div className="space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>
    </div>
  );
}

function InstallerAmountBox({
  title,
  items,
}: {
  title: string;
  items: { label: string; amount: number }[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="mb-3 text-lg font-semibold text-yellow-400">{title}</p>
      <div className="space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <span>{item.label}</span>
            <span className="font-semibold text-yellow-400">{money(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstallerJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const jobId = String((params as Record<string, string | string[] | undefined>)?.jobId || (params as Record<string, string | string[] | undefined>)?.id || "");

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Booking | null>(null);
  const [groupJobs, setGroupJobs] = useState<Booking[]>([]);
  const [installerName, setInstallerName] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [showIncompleteBox, setShowIncompleteBox] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [incompleteNote, setIncompleteNote] = useState("");
  const [incompletePhoto, setIncompletePhoto] = useState<File | null>(null);

  const [showCompleteBox, setShowCompleteBox] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
  const [hasSigningForm, setHasSigningForm] = useState("");
  const [completionSignature, setCompletionSignature] = useState<File | null>(null);

  const [showCancelBox, setShowCancelBox] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("installerPortalName") || "";
    setInstallerName(savedName);

    if (jobId) {
      void loadJobDetails();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadJobDetails() {
    setLoading(true);

    try {
      if (!jobId) {
        throw new Error("Missing job id.");
      }

      let loadedJob: Booking | null = null;

      const byRowId = await supabase
        .from("bookings")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (byRowId.data) {
        loadedJob = byRowId.data as Booking;
      } else {
        const byPublicJobId = await supabase
          .from("bookings")
          .select("*")
          .eq("job_id", jobId)
          .maybeSingle();

        if (byPublicJobId.data) {
          loadedJob = byPublicJobId.data as Booking;
        }
      }

      if (!loadedJob) {
        throw new Error("Could not load job details.");
      }

      setJob(loadedJob);
      setIncompleteReason(loadedJob.incomplete_reason || "");
      setIncompleteNote(loadedJob.incomplete_note || loadedJob.incomplete_notes || "");
      setHasSigningForm(
        loadedJob.homeowner_signed_completion_required === true
          ? "yes"
          : loadedJob.homeowner_signed_completion_required === false
          ? "no"
          : ""
      );

      if (loadedJob.job_group_id) {
        const { data: groupData, error: groupError } = await supabase
          .from("bookings")
          .select("*")
          .eq("job_group_id", loadedJob.job_group_id)
          .order("job_number", { ascending: true });

        if (groupError) {
          console.error("Error loading grouped jobs:", groupError);
          setGroupJobs([loadedJob]);
        } else {
          setGroupJobs(((groupData as Booking[]) || [loadedJob]).map((item) => item as Booking));
        }
      } else {
        setGroupJobs([loadedJob]);
      }
    } catch (error) {
      console.error("Error loading job:", error);
      alert(error instanceof Error ? error.message : "Could not load job details.");
      setJob(null);
      setGroupJobs([]);
    } finally {
      setLoading(false);
    }
  }

  const currentJobAvailable = useMemo(() => {
    if (!job) return false;
    return isAvailableJob(job);
  }, [job]);

  const currentJobAssignedToMe = useMemo(() => {
    if (!job) return false;
    return isAssignedToInstaller(job, installerName);
  }, [job, installerName]);

  const pricing = useMemo(() => {
    return job ? calculateInstallerPricing(job) : null;
  }, [job]);

  const availableJobsInGroup = useMemo(() => {
    return groupJobs.filter((item) => isAvailableJob(item));
  }, [groupJobs]);

  const totalAvailableGroupPay = useMemo(() => {
    return availableJobsInGroup.reduce((sum, item) => {
      return sum + calculateInstallerPricing(item).totalPay;
    }, 0);
  }, [availableJobsInGroup]);

  const hoursUntilJob = useMemo(() => {
    return getHoursUntilJob(job?.scheduled_date);
  }, [job]);

  const isLateCancel = useMemo(() => {
    return hoursUntilJob !== null && hoursUntilJob < 48;
  }, [hoursUntilJob]);

  const addOnServices = useMemo(() => {
    return toArray(job?.add_on_services);
  }, [job]);

  const justServices = useMemo(() => {
    return toArray(job?.just_services);
  }, [job]);

  const canSeeFullAddresses = currentJobAssignedToMe;

  async function acceptThisJob() {
    if (!job) return;

    if (!installerName.trim()) {
      alert("Enter your installer name first.");
      return;
    }

    setActionLoading("accept-one");

    try {
      const { data: freshData, error: freshError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", job.id)
        .maybeSingle();

      if (freshError || !freshData) {
        throw new Error("Could not re-check job.");
      }

      const freshJob = freshData as Booking;

      if (!isAvailableJob(freshJob)) {
        throw new Error("This job is no longer available.");
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: installerName.trim(),
          reassigned_installer_name: null,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw new Error(error.message || "Failed to accept job.");

      try {
        if (freshJob.customer_email) {
          await sendCustomerEmail({
            to: freshJob.customer_email,
            subject: "Your Installer Has Been Assigned",
            type: "assignment",
            html: assignmentEmailHtml(freshJob, installerName.trim()),
          });
        }
      } catch (emailError) {
        console.error("Assignment email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Installer Accepted Job - ${freshJob.job_id || freshJob.id}`,
          type: "installer_accepted",
          html: adminAcceptedEmailHtml(freshJob, installerName.trim()),
        });
      } catch (emailError) {
        console.error("Admin accepted email error:", emailError);
      }

      alert("Job accepted");
      await loadJobDetails();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to accept job.");
    } finally {
      setActionLoading("");
    }
  }

  async function acceptAllAvailableJobs() {
    if (!installerName.trim()) {
      alert("Enter your installer name first.");
      return;
    }

    if (availableJobsInGroup.length === 0) {
      alert("No available jobs left in this group.");
      return;
    }

    setActionLoading("accept-all");

    try {
      const jobIds = availableJobsInGroup.map((item) => item.id);

      const { data: freshGroupData, error: freshGroupError } = await supabase
        .from("bookings")
        .select("*")
        .in("id", jobIds);

      if (freshGroupError) {
        throw new Error(freshGroupError.message || "Failed to re-check grouped jobs.");
      }

      const freshJobs = ((freshGroupData as Booking[]) || []).filter((item) =>
        isAvailableJob(item)
      );

      if (freshJobs.length !== jobIds.length) {
        throw new Error("One or more jobs in this group are no longer available.");
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: installerName.trim(),
          reassigned_installer_name: null,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .in("id", jobIds);

      if (error) {
        throw new Error(error.message || "Failed to accept available jobs in this group.");
      }

      for (const item of freshJobs) {
        try {
          if (item.customer_email) {
            await sendCustomerEmail({
              to: item.customer_email,
              subject: "Your Installer Has Been Assigned",
              type: "assignment",
              html: assignmentEmailHtml(item, installerName.trim()),
            });
          }
        } catch (emailError) {
          console.error("Assignment email error:", emailError);
        }

        try {
          await sendAdminEmail({
            subject: `Installer Accepted Job - ${item.job_id || item.id}`,
            type: "installer_accepted",
            html: adminAcceptedEmailHtml(item, installerName.trim()),
          });
        } catch (emailError) {
          console.error("Admin accepted email error:", emailError);
        }
      }

      alert("Available group jobs accepted");
      await loadJobDetails();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to accept available jobs in this group."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function completeJob() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can complete this job.");
      return;
    }

    if (completionPhotos.length === 0) {
      alert("Please upload at least one completion photo before completing the job.");
      return;
    }

    if (!hasSigningForm) {
      alert("Please select whether the customer provided a signing form.");
      return;
    }

    if (hasSigningForm === "yes" && !completionSignature) {
      alert("Please upload the signed completion form.");
      return;
    }

    setActionLoading("complete");

    try {
      const photoUploads = await uploadManyJobFiles(completionPhotos, "completed-jobs", job.id);

      let signatureUpload:
        | {
            filePath: string;
            publicUrl: string;
          }
        | undefined;

      const signingFormProvided = hasSigningForm === "yes";

      if (signingFormProvided && completionSignature) {
        signatureUpload = await uploadJobFile(
          completionSignature,
          "completion-signatures",
          job.id
        );
      }

      const photoUrls = photoUploads.map((item) => item.publicUrl);
      const photoPaths = photoUploads.map((item) => item.filePath);

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "completed_pending_admin_review",
          installer_pay_status: "pending_review",
          completion_photo_url: joinPipe(photoUrls),
          completion_photo_path: joinPipe(photoPaths),
          homeowner_signed_completion_required: signingFormProvided,
          homeowner_signed_completion_url: signatureUpload?.publicUrl || null,
          homeowner_signed_completion_path: signatureUpload?.filePath || null,
          completion_marked_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) {
        console.error("COMPLETE JOB DB ERROR:", error);
        throw new Error(error.message || "Failed to complete job.");
      }

      try {
        if (job.customer_email) {
          await sendCustomerEmail({
            to: job.customer_email,
            subject: "Your Job Has Been Completed",
            type: "completion",
            html: completionEmailHtml(job, photoUrls, signatureUpload?.publicUrl),
          });
        }
      } catch (emailError) {
        console.error("Completion email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Job Completed - ${job.job_id || job.id}`,
          type: "completion",
          html: adminCompletionEmailHtml(
            job,
            installerName.trim(),
            photoUrls,
            signingFormProvided,
            signatureUpload?.publicUrl
          ),
        });
      } catch (emailError) {
        console.error("Admin completion email error:", emailError);
      }

      setCompletionPhotos([]);
      setCompletionSignature(null);
      setHasSigningForm("");
      setShowCompleteBox(false);

      alert("Job marked complete");
      await loadJobDetails();
    } catch (error) {
      console.error("COMPLETE JOB ERROR:", error);
      alert(error instanceof Error ? error.message : "Failed to complete job.");
    } finally {
      setActionLoading("");
    }
  }

  async function markIncomplete() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can mark this job incomplete.");
      return;
    }

    if (!incompleteReason.trim()) {
      alert("Please select an incomplete reason.");
      return;
    }

    if (!incompletePhoto) {
      alert("Please upload a photo before confirming incomplete.");
      return;
    }

    setActionLoading("incomplete");

    try {
      const incompletePhotoUpload = await uploadJobFile(
        incompletePhoto,
        "incomplete-jobs",
        job.id
      );

      const normalizedReason = incompleteReason.trim().toLowerCase();
      const isCustomerOrShop =
        normalizedReason === "customer" || normalizedReason === "shop";

      const returnFeeCharged = isCustomerOrShop ? RETURN_FEE_CUSTOMER : 0;
      const returnFeeInstallerPay = isCustomerOrShop ? RETURN_FEE_INSTALLER_PAY : 0;
      const installerPayStatus = normalizedReason === "installer" ? "hold" : "pending";

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "incomplete",
          incomplete_reason: normalizedReason,
          incomplete_note: incompleteNote.trim(),
          incomplete_notes: incompleteNote.trim(),
          incomplete_photo_url: incompletePhotoUpload.publicUrl,
          incomplete_photo_path: incompletePhotoUpload.filePath,
          incomplete_reported_at: new Date().toISOString(),
          incomplete_at: new Date().toISOString(),
          return_fee: returnFeeCharged,
          return_fee_charged: returnFeeCharged,
          return_fee_installer_pay: returnFeeInstallerPay,
          installer_pay_status: installerPayStatus,
        })
        .eq("id", job.id);

      if (error) {
        console.error("MARK INCOMPLETE DB ERROR:", error);
        throw new Error(error.message || "Failed to mark job incomplete.");
      }

      try {
        if (job.customer_email && isCustomerOrShop) {
          await sendCustomerEmail({
            to: job.customer_email,
            subject: "Your Job Requires Follow-Up",
            type: "incomplete",
            html: incompleteEmailHtml(
              job,
              normalizedReason,
              incompleteNote.trim(),
              returnFeeCharged,
              incompletePhotoUpload.publicUrl
            ),
          });
        }
      } catch (emailError) {
        console.error("Incomplete email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Job Marked Incomplete - ${job.job_id || job.id}`,
          type: "incomplete",
          html: adminIncompleteEmailHtml(
            job,
            installerName.trim(),
            normalizedReason,
            incompleteNote.trim(),
            returnFeeCharged,
            installerPayStatus,
            incompletePhotoUpload.publicUrl
          ),
        });
      } catch (emailError) {
        console.error("Admin incomplete email error:", emailError);
      }

      setIncompletePhoto(null);
      setShowIncompleteBox(false);

      alert("Job marked incomplete");
      await loadJobDetails();
    } catch (error) {
      console.error("INCOMPLETE JOB ERROR:", error);
      alert(error instanceof Error ? error.message : "Failed to mark job incomplete.");
    } finally {
      setActionLoading("");
    }
  }

  async function requestCancelJob() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can request cancellation.");
      return;
    }

    if (!cancelReason.trim()) {
      alert("Please enter a cancellation reason.");
      return;
    }

    setActionLoading("cancel-request");

    try {
      const noticeText =
        hoursUntilJob === null
          ? "Notice hours unknown"
          : `${hoursUntilJob.toFixed(1)} hours notice`;

      const policyText =
        hoursUntilJob !== null && hoursUntilJob < 48
          ? "Late cancellation request - under 48 hours notice."
          : "Within cancellation policy - 48+ hours notice.";

      const cancelNote = `Installer cancel request: ${cancelReason.trim()} | ${noticeText} | ${policyText}`;

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "pending",
          installer_name: "",
          reassigned_installer_name: "",
          accepted_at: null,
          installer_pay_status: "unpaid",
          incomplete_reason: "installer_cancel_request",
          incomplete_note: cancelNote,
          incomplete_notes: cancelNote,
        })
        .eq("id", job.id);

      if (error) throw new Error(error.message || "Failed to request cancellation.");

      try {
        await sendAdminEmail({
          subject: `Installer Cancel Request - ${job.job_id || job.id}`,
          type: "incomplete",
          html: adminCancelRequestEmailHtml(
            job,
            installerName.trim(),
            cancelReason.trim(),
            hoursUntilJob
          ),
        });
      } catch (emailError) {
        console.error("Admin cancel request email error:", emailError);
      }

      setShowCancelBox(false);

      alert("Cancellation request sent to admin");
      await loadJobDetails();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to request cancellation.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-500">Job Details</h1>
            <p className="mt-2 text-gray-400">
              Installer view only shows installer payout and city-only addresses before
              acceptance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
          >
            Back
          </button>
        </div>
      </div>

      {loading || !job || !pricing ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Loading job details...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500">
              {job.company_name || job.customer_name || "Job"}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Job ID" value={job.job_id || job.id} />
              <Info label="Customer" value={job.customer_name} />
              <Info label="Phone" value={job.phone_number} />
              <Info
                label="Service Type"
                value={getServiceTypeLabel(job.service_type_label || job.service_type)}
              />
              <Info label="Material Type" value={job.material_type} />
              <Info label="Material Size" value={job.material_size} />
              <Info
                label="Job Size"
                value={
                  job.job_size !== null && job.job_size !== undefined
                    ? `${job.job_size} sqft`
                    : job.sqft !== null && job.sqft !== undefined
                    ? `${job.sqft} sqft`
                    : "-"
                }
              />
              <Info label="Date" value={job.scheduled_date} />
              <Info label="Pickup Window" value={getPickupWindow(job)} />
              <Info
                label="Pick Up Area"
                value={getVisibleAddress(job.pickup_address, canSeeFullAddresses)}
              />
              <Info
                label="Drop Off Area"
                value={getVisibleAddress(job.dropoff_address, canSeeFullAddresses)}
              />
              <Info label="Status" value={job.status} />
              <Info label="Installer Pay Status" value={job.installer_pay_status} />
              <Info label="Installer Base Pay" value={money(pricing.basePay)} />
              <Info label="Installer Add-On Pay" value={money(pricing.addonPay)} />
              <Info label="Installer Cut / Polish Pay" value={money(pricing.cutPolishPay)} />
              <Info label="Installer Sink Pay" value={money(pricing.sinkPay)} />
              <Info label="Installer Other Pay" value={money(pricing.otherPay)} />
              <Info label="Installer Mileage Pay" value={money(pricing.mileagePay)} />
              <Info label="Installer Subtotal" value={money(pricing.subtotalPay)} />
              <Info label="Installer HST" value={money(pricing.hstPay)} />
              <Info label="Installer Return Pay" value={money(pricing.returnPay)} />
              <Info
                label="Total Installer Payout"
                value={money(pricing.totalPay)}
                highlight
              />
              <Info label="Incomplete Reason" value={job.incomplete_reason} />
              <Info
                label="Incomplete Note"
                value={job.incomplete_note || job.incomplete_notes}
              />
              <Info
                label="Waterfall Quantity"
                value={
                  Number(job.waterfall_quantity || 0) > 0
                    ? String(job.waterfall_quantity)
                    : "-"
                }
              />
              <Info
                label="Outlet Plug Cutout Quantity"
                value={
                  Number(job.outlet_plug_cutout_quantity || 0) > 0
                    ? String(job.outlet_plug_cutout_quantity)
                    : "-"
                }
              />
              <Info
                label="Disposal Responsibility"
                value={getDisposalResponsibilityLabel(job.disposal_responsibility)}
              />
              <Info
                label="Customer Provided Signing Form"
                value={
                  job.homeowner_signed_completion_required === true
                    ? "Yes"
                    : job.homeowner_signed_completion_required === false
                    ? "No"
                    : "-"
                }
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InstallerAmountBox
                title="Installer Add-On Payouts"
                items={pricing.parsedAddons}
              />
              <InstallerAmountBox
                title="Installer Just-Service Payouts"
                items={pricing.parsedJustServices}
              />
            </div>

            {(addOnServices.length > 0 || justServices.length > 0) && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
                <h3 className="text-xl font-semibold text-yellow-400">
                  Installer Service List
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ServiceBox title="Add-On Services" items={addOnServices} />
                  <ServiceBox title="Just Services" items={justServices} />
                </div>
              </div>
            )}

            {job.side_note ? (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
                <h3 className="text-xl font-semibold text-yellow-400">Side Note</h3>
                <p className="mt-3 text-sm text-gray-300">{job.side_note}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
              <h3 className="text-xl font-semibold text-yellow-400">
                Installer Payout Breakdown
              </h3>

              <div className="mt-4 space-y-3 text-sm text-gray-300">
                {pricing.payoutLines.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between border-b border-zinc-800 pb-3"
                  >
                    <span>{line.label}</span>
                    <span>{money(line.amount)}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span>Subtotal Pay</span>
                  <span>{money(pricing.subtotalPay)}</span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span>HST Pay</span>
                  <span>{money(pricing.hstPay)}</span>
                </div>

                {pricing.returnPay > 0 ? (
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Return Pay</span>
                    <span>{money(pricing.returnPay)}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-zinc-700 pt-4 text-base font-semibold text-yellow-400">
                  <span>Total Installer Payout</span>
                  <span>{money(pricing.totalPay)}</span>
                </div>
              </div>
            </div>

            {availableJobsInGroup.length > 1 ? (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
                <h3 className="text-xl font-semibold text-yellow-400">Grouped Jobs</h3>
                <p className="mt-2 text-sm text-gray-300">
                  Available jobs in this group: {availableJobsInGroup.length}
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Total available group payout:{" "}
                  <span className="font-semibold text-yellow-400">
                    {money(totalAvailableGroupPay)}
                  </span>
                </p>
              </div>
            ) : null}

            {!canSeeFullAddresses && (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                Full pickup and drop-off addresses unlock after you accept the job.
              </div>
            )}

            {hoursUntilJob !== null ? (
              <div
                className={`mt-6 rounded-xl border p-4 text-sm ${
                  isLateCancel
                    ? "border-red-500 bg-red-950 text-red-300"
                    : "border-zinc-700 bg-black text-gray-300"
                }`}
              >
                <p>
                  Time until scheduled job: <strong>{hoursUntilJob.toFixed(1)} hours</strong>
                </p>
                <p className="mt-1">
                  Installer cancellation policy: <strong>48 hours notice</strong>.
                </p>
                {isLateCancel ? (
                  <p className="mt-1">
                    This is a <strong>late cancellation request</strong> because it is under
                    48 hours.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {currentJobAvailable ? (
                <button
                  type="button"
                  onClick={() => void acceptThisJob()}
                  disabled={actionLoading === "accept-one"}
                  className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                >
                  {actionLoading === "accept-one" ? "Accepting..." : "Accept This Job"}
                </button>
              ) : null}

              {availableJobsInGroup.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void acceptAllAvailableJobs()}
                  disabled={actionLoading === "accept-all"}
                  className="rounded-xl border border-yellow-500 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-500 hover:text-black disabled:opacity-60"
                >
                  {actionLoading === "accept-all"
                    ? "Accepting..."
                    : `Accept All Available Jobs (${availableJobsInGroup.length})`}
                </button>
              ) : null}

              {currentJobAssignedToMe &&
              normalizeStatus(job.status) !== "completed" &&
              normalizeStatus(job.status) !== "completed_pending_admin_review" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCompleteBox((prev) => !prev)}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500"
                  >
                    {showCompleteBox ? "Close Complete" : "Complete Job"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowIncompleteBox((prev) => !prev)}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500"
                  >
                    {showIncompleteBox ? "Close Incomplete" : "Mark Incomplete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelBox((prev) => !prev)}
                    className="rounded-xl border border-red-500 px-5 py-3 font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    {showCancelBox ? "Close Cancel Request" : "Request Cancel Job"}
                  </button>
                </>
              ) : null}
            </div>

            {showCompleteBox ? (
              <div className="mt-6 rounded-2xl border border-green-500 bg-black p-5">
                <h3 className="text-xl font-semibold text-green-400">Complete Job</h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Completion Photos <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setCompletionPhotos(Array.from(e.target.files || []))
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Upload one or more completion images.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Did customer provide a signing form?{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={hasSigningForm}
                      onChange={(e) => setHasSigningForm(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {hasSigningForm === "yes" ? (
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-gray-300">
                        Upload Signed Completion Form{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setCompletionSignature(e.target.files?.[0] || null)
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p>
                    At least one completion photo is <strong>required</strong>.
                  </p>
                  <p className="mt-1">
                    Signed completion upload is only required if the customer provided a
                    signing form.
                  </p>
                  {completionPhotos.length > 0 ? (
                    <p className="mt-1">
                      Files selected: <strong>{completionPhotos.length}</strong>
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void completeJob()}
                    disabled={actionLoading === "complete"}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-60"
                  >
                    {actionLoading === "complete" ? "Completing..." : "Confirm Complete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompleteBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-green-400 hover:text-green-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {showIncompleteBox ? (
              <div className="mt-6 rounded-2xl border border-red-500 bg-black p-5">
                <h3 className="text-xl font-semibold text-red-400">Mark Job Incomplete</h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={incompleteReason}
                      onChange={(e) => setIncompleteReason(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select reason</option>
                      <option value="customer">Customer / Homeowner Issue</option>
                      <option value="shop">Shop Issue</option>
                      <option value="installer">Installer Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Photo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIncompletePhoto(e.target.files?.[0] || null)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-gray-300">Notes</label>
                    <textarea
                      value={incompleteNote}
                      onChange={(e) => setIncompleteNote(e.target.value)}
                      rows={4}
                      placeholder="Enter what happened..."
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p>
                    If reason is <strong>customer</strong> or <strong>shop</strong>, a{" "}
                    <strong>return fee will be applied</strong>.
                  </p>
                  <p className="mt-1">
                    If reason is <strong>installer</strong>, installer payout status will
                    move to <strong>hold</strong>.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void markIncomplete()}
                    disabled={actionLoading === "incomplete"}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {actionLoading === "incomplete" ? "Saving..." : "Confirm Incomplete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowIncompleteBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-red-400 hover:text-red-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {showCancelBox ? (
              <div className="mt-6 rounded-2xl border border-red-500/50 bg-black p-5">
                <h3 className="text-xl font-semibold text-red-400">
                  Request Cancel Job
                </h3>

                <div className="mt-4">
                  <label className="mb-2 block text-sm text-gray-300">
                    Cancellation Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    placeholder="Why are you requesting cancellation?"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p>
                    Installer cancellation policy requires <strong>48 hours notice</strong>.
                  </p>
                  {hoursUntilJob !== null ? (
                    <p className="mt-1">
                      Current notice: <strong>{hoursUntilJob.toFixed(1)} hours</strong>
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void requestCancelJob()}
                    disabled={actionLoading === "cancel-request"}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {actionLoading === "cancel-request"
                      ? "Sending..."
                      : "Submit Cancel Request"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-red-400 hover:text-red-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}