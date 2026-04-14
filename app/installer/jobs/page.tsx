"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const ADMIN_PHONE = "647-795-4392";
const ADMIN_EMAIL = "ultrapropm@gmail.com";

type Booking = {
  id: string;
  job_id?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  incomplete_at?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;

  pickup_address?: string | null;
  dropoff_address?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;

  service_type?: string | null;
  service_type_label?: string | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  sqft?: number | null;
  job_size?: number | null;
  customer_sqft_rate?: number | null;
  service_price?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;
  customer_mileage_charge?: number | null;
  mileage_fee?: number | null;
  mileage_charge?: number | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  waterfall_quantity?: number | null;
  outlet_plug_cutout_quantity?: number | null;
  disposal_responsibility?: string | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_other_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;

  final_total?: number | null;
  subtotal?: number | null;
  hst_amount?: number | null;
  is_archived?: boolean | null;

  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_route_hint?: string | null;
  ai_urgency_label?: string | null;

  incomplete_reason?: string | null;
  incomplete_notes?: string | null;
};

type InstallerProfile = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  status?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  [key: string]: unknown;
};

type GroupedJobs = {
  groupKey: string;
  jobs: Booking[];
};

type AiJobInsight = {
  recommendedInstallerType: string;
  urgencyLabel: string;
  groupingLabel: string;
  groupingColor: string;
  routeHint: string;
  dispatchScore: number;
  priorityScore: number;
  distanceTier: string;
  bestMatchScore: number;
  recommendedAction: string;
};

type FilterValue =
  | "all"
  | "single"
  | "grouped"
  | "urgency"
  | "sameDay"
  | "nextDay"
  | "longDistance"
  | "highPay"
  | "bestAi";

type ViewMode = "available" | "myJobs";

function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: number | null) {
  return "$" + num(value).toFixed(2);
}

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function getCityOnly(address?: string | null) {
  const value = safeText(address);
  if (!value) return "-";

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const provincePattern =
      /^(on|ontario|ab|alberta|bc|british columbia|mb|manitoba|nb|new brunswick|nl|newfoundland and labrador|ns|nova scotia|nt|northwest territories|nu|nunavut|pe|prince edward island|qc|quebec|sk|saskatchewan|yt|yukon)$/i;

    const countryPattern = /^(canada|usa|united states)$/i;

    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i];
      if (
        provincePattern.test(part) ||
        countryPattern.test(part) ||
        /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(part)
      ) {
        continue;
      }
      return part;
    }

    return parts[parts.length - 2] || parts[0];
  }

  return parts[0] || value;
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

function getNormalizedStatus(status?: string | null) {
  return safeText(status).toLowerCase();
}

function normalizeBookingStatus(job: Booking) {
  const value = getNormalizedStatus(job.status);

  if (job.is_archived === true) return "archived";
  if (job.completed_at || value === "completed" || value === "completed_pending_admin_review") {
    return "completed";
  }
  if (job.incomplete_at || value === "incomplete") {
    return "incomplete";
  }

  if (!value) {
    if (safeText(job.installer_name) || safeText(job.reassigned_installer_name)) {
      return "accepted";
    }
    return "new";
  }

  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "accepted_by_installer") return "accepted";
  if (value === "in progress" || value === "in-progress") return "in_progress";
  if (value === "canceled") return "cancelled";

  return value;
}

function hasAssignedInstaller(job: Booking) {
  return (
    safeText(job.installer_name).length > 0 ||
    safeText(job.reassigned_installer_name).length > 0
  );
}

function isJobAvailable(job: Booking) {
  const status = normalizeBookingStatus(job);
  return (
    job.is_archived !== true &&
    !hasAssignedInstaller(job) &&
    status !== "completed" &&
    status !== "incomplete" &&
    status !== "cancelled" &&
    (status === "new" || status === "pending" || status === "available")
  );
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = safeText(job.pickup_time_from);
  const to = safeText(job.pickup_time_to);

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return job.scheduled_time || "-";
}

function getServiceTypeLabel(job: Booking) {
  if (job.service_type_label) return job.service_type_label;

  const value = job.service_type;
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

function getRouteClusterKey(address?: string | null) {
  if (!address) return "";
  return address
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function getGroupingColor(label: string) {
  if (label === "Strong Grouping") {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }
  if (label === "Possible Grouping" || label === "Possible Group") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function isSameDayJob(job: Booking) {
  const text = [
    job.pickup_time_slot || "",
    job.scheduled_time || "",
    job.service_type_label || "",
    job.service_type || "",
    job.ai_urgency_label || "",
  ]
    .join(" ")
    .toLowerCase();

  return text.includes("same day") || text.includes("same-day") || job.ai_urgency_label === "Same-Day Priority";
}

function isNextDayJob(job: Booking) {
  const text = [
    job.pickup_time_slot || "",
    job.scheduled_time || "",
    job.service_type_label || "",
    job.service_type || "",
    job.ai_urgency_label || "",
  ]
    .join(" ")
    .toLowerCase();

  return text.includes("next day") || text.includes("next-day") || job.ai_urgency_label === "Next-Day Priority";
}

function getDerivedInstallerPay(job: Booking) {
  if (num(job.installer_pay) > 0) return num(job.installer_pay);

  const subtotalAndHst = num(job.installer_subtotal_pay) + num(job.installer_hst_pay);
  if (subtotalAndHst > 0) return subtotalAndHst;

  if (Array.isArray(job.installer_payout_lines) && job.installer_payout_lines.length > 0) {
    return job.installer_payout_lines.reduce((sum, line) => sum + num(line.amount), 0);
  }

  const fallback =
    num(job.installer_base_pay) +
    num(job.installer_mileage_pay) +
    num(job.installer_addon_pay) +
    num(job.installer_other_pay) +
    num(job.installer_cut_polish_pay) +
    num(job.installer_sink_pay);

  return fallback;
}

function getPayoutLines(job: Booking) {
  if (Array.isArray(job.installer_payout_lines) && job.installer_payout_lines.length > 0) {
    return job.installer_payout_lines.map((line) => ({
      label: line.label || "Payout Line",
      amount: num(line.amount),
    }));
  }

  const lines: { label: string; amount: number }[] = [];

  if (num(job.installer_base_pay) > 0) {
    lines.push({ label: "Base Pay", amount: num(job.installer_base_pay) });
  }
  if (num(job.installer_addon_pay) > 0) {
    lines.push({ label: "Add-On Pay", amount: num(job.installer_addon_pay) });
  }
  if (num(job.installer_other_pay) > 0) {
    lines.push({ label: "Other Service Pay", amount: num(job.installer_other_pay) });
  }
  if (num(job.installer_cut_polish_pay) > 0) {
    lines.push({ label: "Cut / Polish Pay", amount: num(job.installer_cut_polish_pay) });
  }
  if (num(job.installer_sink_pay) > 0) {
    lines.push({ label: "Sink / Reattach Pay", amount: num(job.installer_sink_pay) });
  }
  if (num(job.installer_mileage_pay) > 0) {
    lines.push({ label: "Mileage Pay", amount: num(job.installer_mileage_pay) });
  }

  return lines;
}

function getAiInsight(job: Booking, allJobs: Booking[]): AiJobInsight {
  const oneWayKm = num(job.one_way_km);
  const sqft = num(job.sqft || job.job_size);
  const addOnCount = toArray(job.add_on_services).length;
  const serviceType = (job.service_type || "").toLowerCase();
  const serviceText = [
    job.pickup_time_slot || "",
    job.scheduled_time || "",
    job.service_type_label || "",
    job.service_type || "",
    job.ai_urgency_label || "",
  ]
    .join(" ")
    .toLowerCase();

  const distanceTier = job.ai_distance_tier || (oneWayKm > 120 ? "Long Distance" : oneWayKm > 70 ? "Extended Range" : "Standard Zone");

  let recommendedInstallerType =
    job.ai_recommended_installer_type || "Standard Installer";

  if (!job.ai_recommended_installer_type) {
    if (oneWayKm > 120) {
      recommendedInstallerType = "Long Distance Specialist";
    } else if (sqft >= 80) {
      recommendedInstallerType = "Large Project Specialist";
    } else if (serviceType === "installation_3cm") {
      recommendedInstallerType = "3cm Stone Specialist";
    } else if (serviceType === "full_height_backsplash") {
      recommendedInstallerType = "Backsplash Specialist";
    } else if (serviceType === "backsplash_tiling") {
      recommendedInstallerType = "Tiling Specialist";
    } else if (addOnCount >= 4) {
      recommendedInstallerType = "Complex Add-On Installer";
    }
  }

  let urgencyLabel = job.ai_urgency_label || "Open Scheduling";
  if (!job.ai_urgency_label) {
    if (serviceText.includes("same")) urgencyLabel = "Same-Day Priority";
    else if (serviceText.includes("next")) urgencyLabel = "Next-Day Priority";
  }

  const clusterKey = getRouteClusterKey(job.dropoff_address || job.pickup_address);

  const nearbyCount = allJobs.filter((item) => {
    if (item.id === job.id) return false;
    if (normalizeBookingStatus(item) === "completed" || normalizeBookingStatus(item) === "incomplete") return false;
    const sameDate = safeText(item.scheduled_date) === safeText(job.scheduled_date);
    if (!sameDate) return false;

    const itemClusterKey = getRouteClusterKey(item.dropoff_address || item.pickup_address);
    return clusterKey && itemClusterKey && clusterKey === itemClusterKey;
  }).length;

  let groupingLabel = job.ai_grouping_label || "Solo Route";
  if (!job.ai_grouping_label) {
    if (nearbyCount >= 2) groupingLabel = "Strong Grouping";
    else if (nearbyCount === 1) groupingLabel = "Possible Grouping";
  }

  let routeHint = job.ai_route_hint || "No grouping suggestion yet.";
  if (!job.ai_route_hint) {
    if (nearbyCount >= 2) routeHint = "Bundle this with nearby same-date jobs.";
    else if (nearbyCount === 1) routeHint = "Possible nearby grouped run.";
    else if (oneWayKm > 120) routeHint = "Best for a dedicated long-distance installer.";
    else routeHint = "Review route timing before accepting.";
  }

  let dispatchScore = num(job.ai_dispatch_score);
  if (!dispatchScore) {
    dispatchScore = 50;
    if (urgencyLabel === "Same-Day Priority") dispatchScore += 20;
    if (urgencyLabel === "Next-Day Priority") dispatchScore += 10;
    if (sqft >= 80) dispatchScore += 10;
    if (nearbyCount >= 1) dispatchScore += 10;
    if (oneWayKm > 120) dispatchScore += 5;
    if (getDerivedInstallerPay(job) >= 500) dispatchScore += 10;
    dispatchScore = Math.max(0, Math.min(100, dispatchScore));
  }

  let priorityScore = num(job.ai_priority_score);
  if (!priorityScore) {
    priorityScore = 40;
    if (urgencyLabel === "Same-Day Priority") priorityScore += 30;
    if (urgencyLabel === "Next-Day Priority") priorityScore += 15;
    if (sqft >= 80) priorityScore += 10;
    if (getDerivedInstallerPay(job) >= 500) priorityScore += 10;
    priorityScore = Math.max(0, Math.min(100, priorityScore));
  }

  let bestMatchScore = 55;
  if (recommendedInstallerType === "Long Distance Specialist") bestMatchScore += 15;
  if (recommendedInstallerType === "Large Project Specialist") bestMatchScore += 10;
  if (groupingLabel === "Strong Grouping") bestMatchScore += 15;
  if (groupingLabel === "Possible Grouping") bestMatchScore += 8;
  if (getDerivedInstallerPay(job) >= 500) bestMatchScore += 10;
  if (urgencyLabel === "Same-Day Priority") bestMatchScore += 12;
  if (urgencyLabel === "Next-Day Priority") bestMatchScore += 6;
  bestMatchScore = Math.max(0, Math.min(100, bestMatchScore));

  let recommendedAction = "Review and accept if route works.";
  if (urgencyLabel === "Same-Day Priority" && getDerivedInstallerPay(job) >= 500) {
    recommendedAction = "Top priority job. Accept quickly.";
  } else if (urgencyLabel === "Same-Day Priority") {
    recommendedAction = "Urgent same-day job. Review first.";
  } else if (urgencyLabel === "Next-Day Priority") {
    recommendedAction = "Next-day priority. Good early review.";
  } else if (groupingLabel === "Strong Grouping") {
    recommendedAction = "Strong grouped run. High route efficiency.";
  } else if (oneWayKm > 120) {
    recommendedAction = "Best if you want a dedicated long-distance run.";
  } else if (getDerivedInstallerPay(job) < 250) {
    recommendedAction = "Lower pay job. Best if nearby or combined.";
  }

  return {
    recommendedInstallerType,
    urgencyLabel,
    groupingLabel,
    groupingColor: getGroupingColor(groupingLabel),
    routeHint,
    dispatchScore,
    priorityScore,
    distanceTier,
    bestMatchScore,
    recommendedAction,
  };
}

async function sendCustomerAssignmentEmail(job: Booking, installerName: string) {
  if (!job.customer_email) return;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Your Installer Has Been Assigned</h2>
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>An installer has been assigned to your booking with 1-800TOPS.</p>

      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Installer:</strong> ${installerName || "-"}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Service:</strong> ${getServiceTypeLabel(job)}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      </div>

      <h3>Important Notes</h3>
      <ul>
        <li>Please ensure all countertop pieces are counted and organized for pickup.</li>
        <li>Installer waiting time may be subject to an additional charge.</li>
        <li>If any paperwork requires the homeowner’s signature, please provide it to the installer at pickup.</li>
      </ul>

      <p>If you have any questions, please contact admin directly at <strong>${ADMIN_PHONE}</strong>.</p>
      <p>Thank you for choosing 1-800TOPS.</p>
    </div>
  `;

  await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: job.customer_email,
      subject: "Your Installer Has Been Assigned",
      type: "assignment",
      html,
    }),
  });
}

async function sendAdminAcceptedEmail(job: Booking, installerName: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(job)}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Status:</strong> accepted</p>
      <p><strong>Installer Pay:</strong> ${money(getDerivedInstallerPay(job))}</p>
    </div>
  `;

  await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: `Installer Accepted Job - ${job.job_id || job.id}`,
      type: "installer_accepted",
      html,
    }),
  });
}

function AiBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
        className || "border-zinc-700 bg-zinc-800/40 text-zinc-300"
      }`}
    >
      <span className="text-zinc-400">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ job }: { job: Booking }) {
  const normalized = normalizeBookingStatus(job) || "no status";
  const archived = job.is_archived === true;

  let className = "border-zinc-700 bg-zinc-800/40 text-zinc-300";

  if (archived) {
    className = "border-zinc-600 bg-zinc-700/30 text-zinc-300";
  } else if (normalized === "accepted") {
    className = "border-blue-500/30 bg-blue-500/10 text-blue-300";
  } else if (normalized === "in_progress") {
    className = "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  } else if (normalized === "completed") {
    className = "border-green-500/30 bg-green-500/10 text-green-400";
  } else if (normalized === "incomplete") {
    className = "border-red-500/30 bg-red-500/10 text-red-400";
  } else if (
    normalized === "pending" ||
    normalized === "available" ||
    normalized === "new"
  ) {
    className = "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }

  return (
    <AiBadge
      label="Status"
      value={archived ? `${normalized} / archived` : normalized}
      className={className}
    />
  );
}

function JobDetailBlock({
  job,
  allJobs,
  expanded,
  onToggle,
  canAccept,
  onAccept,
  acceptLoading,
  showAcceptButton = true,
  showMyJobActions = false,
  actionLoading = false,
  onStartJob,
  onCompleteJob,
  onIncompleteJob,
  viewMode,
}: {
  job: Booking;
  allJobs: Booking[];
  expanded: boolean;
  onToggle: () => void;
  canAccept: boolean;
  onAccept: () => void;
  acceptLoading: boolean;
  showAcceptButton?: boolean;
  showMyJobActions?: boolean;
  actionLoading?: boolean;
  onStartJob?: () => void;
  onCompleteJob?: () => void;
  onIncompleteJob?: () => void;
  viewMode: ViewMode;
}) {
  const addOns = toArray(job.add_on_services);
  const justServices = toArray(job.just_services);
  const payoutLines = getPayoutLines(job);
  const ai = getAiInsight(job, allJobs);
  const sameDay = isSameDayJob(job);
  const nextDay = isNextDayJob(job);
  const normalizedStatus = normalizeBookingStatus(job);
  const derivedInstallerPay = getDerivedInstallerPay(job);

  const showFullAddress = viewMode === "myJobs";
  const pickupDisplay = showFullAddress
    ? job.pickup_address || "-"
    : getCityOnly(job.pickup_address);
  const dropoffDisplay = showFullAddress
    ? job.dropoff_address || "-"
    : getCityOnly(job.dropoff_address);

  return (
    <div
      className={`rounded-xl border p-4 ${
        sameDay
          ? "border-red-500/30 bg-red-500/5"
          : nextDay
            ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-zinc-800 bg-black"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-yellow-400">
              {job.job_number ? `Job ${job.job_number}` : "Job"}
            </p>

            <StatusPill job={job} />

            {sameDay ? (
              <AiBadge
                label="Urgent"
                value="Same Day"
                className="border-red-500/30 bg-red-500/10 text-red-400"
              />
            ) : null}

            {!sameDay && nextDay ? (
              <AiBadge
                label="Priority"
                value="Next Day"
                className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
              />
            ) : null}

            <AiBadge
              label="Grouping"
              value={ai.groupingLabel}
              className={ai.groupingColor}
            />
            <AiBadge
              label="AI Match"
              value={`${ai.bestMatchScore}/100`}
              className="border-purple-500/30 bg-purple-500/10 text-purple-300"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CompactStat label="Job ID" value={job.job_id || job.id} />
            <CompactStat label="Service" value={getServiceTypeLabel(job)} />
            <CompactStat label="Date" value={job.scheduled_date || "-"} />
            <CompactStat label="Pickup Window" value={getPickupWindow(job)} />
            <CompactStat
              label="Sqft"
              value={
                num(job.sqft || job.job_size)
                  ? `${num(job.sqft || job.job_size).toFixed(2)} sqft`
                  : "-"
              }
            />
            <CompactStat
              label="Distance"
              value={`${num(job.one_way_km).toFixed(2)} km`}
            />
            <CompactStat label="Distance Tier" value={ai.distanceTier} />
            <CompactStat label="Total Pay" value={money(derivedInstallerPay)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <AiBadge
              label="AI Installer"
              value={ai.recommendedInstallerType}
              className="border-blue-500/30 bg-blue-500/10 text-blue-300"
            />
            <AiBadge label="Dispatch" value={`${ai.dispatchScore}/100`} />
            <AiBadge label="Priority" value={`${ai.priorityScore}/100`} />
            <AiBadge label="Urgency" value={ai.urgencyLabel} />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-sm font-semibold text-yellow-400">AI Route Hint</p>
            <p className="mt-1 text-sm text-gray-300">{ai.routeHint}</p>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-sm font-semibold text-yellow-400">AI Recommended Action</p>
            <p className="mt-1 text-sm text-gray-300">{ai.recommendedAction}</p>
          </div>
        </div>

        <div className="w-full space-y-3 lg:w-auto">
          <button
            type="button"
            onClick={onToggle}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400 lg:w-auto"
          >
            {expanded ? "Hide Details" : "View Details"}
          </button>

          {showAcceptButton ? (
            canAccept ? (
              <button
                type="button"
                onClick={onAccept}
                disabled={acceptLoading}
                className="w-full rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60 lg:w-auto"
              >
                {acceptLoading ? "Accepting..." : "Accept This Job"}
              </button>
            ) : (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs text-zinc-400">
                This job is not currently available to accept.
              </div>
            )
          ) : null}

          {showMyJobActions ? (
            <div className="space-y-3">
              {normalizedStatus === "accepted" ? (
                <button
                  type="button"
                  onClick={onStartJob}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  {actionLoading ? "Updating..." : "Start Job"}
                </button>
              ) : null}

              {(normalizedStatus === "accepted" || normalizedStatus === "in_progress") ? (
                <button
                  type="button"
                  onClick={onCompleteJob}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300 transition hover:bg-green-500/20 disabled:opacity-60"
                >
                  {actionLoading ? "Updating..." : "Mark Completed"}
                </button>
              ) : null}

              {(normalizedStatus === "accepted" || normalizedStatus === "in_progress") ? (
                <button
                  type="button"
                  onClick={onIncompleteJob}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  {actionLoading ? "Updating..." : "Mark Incomplete"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <div className="space-y-1 text-sm text-gray-300">
            <p>Customer: {job.company_name || job.customer_name || "Job"}</p>
            <p>Email: {job.customer_email || "-"}</p>
            <p>Phone: {job.phone_number || "-"}</p>
            <p>Pick Up: {pickupDisplay}</p>
            <p>Drop Off: {dropoffDisplay}</p>
            <p>Installer Assigned: {job.installer_name || job.reassigned_installer_name || "-"}</p>
            <p>Created At: {job.created_at || "-"}</p>
            <p>Accepted At: {job.accepted_at || "-"}</p>
            <p>Completed At: {job.completed_at || "-"}</p>
            <p>Incomplete At: {job.incomplete_at || "-"}</p>

            {num(job.waterfall_quantity) > 0 ? (
              <p>Waterfall Quantity: {String(job.waterfall_quantity)}</p>
            ) : null}

            {num(job.outlet_plug_cutout_quantity) > 0 ? (
              <p>Outlet Plug Cutout Quantity: {String(job.outlet_plug_cutout_quantity)}</p>
            ) : null}

            {job.disposal_responsibility ? (
              <p>
                Disposal Responsibility:{" "}
                {getDisposalResponsibilityLabel(job.disposal_responsibility)}
              </p>
            ) : null}

            {job.side_note ? <p>Side Note: {job.side_note}</p> : null}
            {job.incomplete_reason ? <p>Incomplete Reason: {job.incomplete_reason}</p> : null}
            {job.incomplete_notes ? <p>Incomplete Notes: {job.incomplete_notes}</p> : null}
          </div>

          {addOns.length > 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 font-semibold text-yellow-400">Add-On Services</p>
              <div className="space-y-1 text-sm text-gray-300">
                {addOns.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>
          ) : null}

          {justServices.length > 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 font-semibold text-yellow-400">Just Services</p>
              <div className="space-y-1 text-sm text-gray-300">
                {justServices.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="mb-2 font-semibold text-yellow-400">Your Pay Breakdown</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>Base Pay: {money(job.installer_base_pay)}</p>
              <p>Add-On Pay: {money(job.installer_addon_pay)}</p>
              <p>Other Service Pay: {money(job.installer_other_pay)}</p>
              <p>Cut / Polish Pay: {money(job.installer_cut_polish_pay)}</p>
              <p>Sink / Reattach Pay: {money(job.installer_sink_pay)}</p>
              <p>Mileage Pay: {money(job.installer_mileage_pay)}</p>
              <p>Subtotal Pay: {money(job.installer_subtotal_pay)}</p>

              {num(job.installer_hst_pay) > 0 ? (
                <p>HST Pay: {money(job.installer_hst_pay)}</p>
              ) : null}

              {payoutLines.length > 0 ? (
                <div className="pt-2">
                  {payoutLines.map((line, index) => (
                    <p key={`${line.label || "line"}-${index}`}>
                      • {line.label || "Payout Line"}: {money(line.amount)}
                    </p>
                  ))}
                </div>
              ) : null}

              <p className="pt-2 font-semibold text-yellow-400">
                Total Pay: {money(derivedInstallerPay)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InstallerJobsPage() {
  const [allJobs, setAllJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [installerName, setInstallerName] = useState("");
  const [acceptingKey, setAcceptingKey] = useState("");
  const [statusActionKey, setStatusActionKey] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("available");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    void bootPage();
  }, []);

  async function findInstallerProfile(userId: string, email?: string | null) {
    const supabase = createClient();

    const byUserId = await supabase
      .from("installer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!byUserId.error && byUserId.data) {
      return byUserId.data as InstallerProfile;
    }

    const byId = await supabase
      .from("installer_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return byId.data as InstallerProfile;
    }

    if (email) {
      const byEmail = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!byEmail.error && byEmail.data) {
        return byEmail.data as InstallerProfile;
      }
    }

    return null;
  }

  function isMyJob(job: Booking, currentInstallerName: string) {
    const assignedNames = [
      safeText(job.installer_name),
      safeText(job.reassigned_installer_name),
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase());

    const current = safeText(currentInstallerName).toLowerCase();
    if (!current) return false;

    return assignedNames.includes(current);
  }

  async function bootPage() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("AUTH ERROR:", authError);
        alert("Please log in as installer first.");
        setAllJobs([]);
        setInstallerName("");
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      const installerProfile = await findInstallerProfile(user.id, user.email);

      if (!installerProfile) {
        alert("No installer profile was found for this signed-in account.");
        setAllJobs([]);
        setInstallerName("");
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      const resolvedInstallerName =
        safeText((installerProfile.installer_name as string | null) || null) ||
        safeText((installerProfile.full_name as string | null) || null) ||
        safeText((installerProfile.name as string | null) || null) ||
        safeText((installerProfile.business_name as string | null) || null) ||
        safeText((installerProfile.company_name as string | null) || null) ||
        safeText(user.email || "");

      if (!resolvedInstallerName) {
        alert("Installer profile name not found.");
        setAllJobs([]);
        setInstallerName("");
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      const approvalValue = String(
        installerProfile.approval_status || installerProfile.status || ""
      )
        .trim()
        .toLowerCase();

      const isActiveValue = installerProfile.is_active;

      const approvalBlocked =
        (approvalValue && !["approved", "active"].includes(approvalValue)) ||
        isActiveValue === false;

      if (approvalBlocked) {
        alert("Your installer account is not approved yet.");
        setAllJobs([]);
        setInstallerName(resolvedInstallerName);
        setAuthChecked(true);
        setLoading(false);
        return;
      }

      if (!installerProfile.user_id && installerProfile.id === user.id) {
        const { error: backfillError } = await supabase
          .from("installer_profiles")
          .update({ user_id: user.id })
          .eq("id", user.id);

        if (backfillError) {
          console.error("INSTALLER PROFILE BACKFILL ERROR:", backfillError);
        }
      }

      setInstallerName(resolvedInstallerName);

      if (typeof window !== "undefined") {
        localStorage.setItem("installerPortalName", resolvedInstallerName);
      }

      setAuthChecked(true);
      await loadJobs();
    } catch (error) {
      console.error("BOOT PAGE ERROR:", error);
      alert("Failed to load installer page.");
      setAllJobs([]);
      setInstallerName("");
      setAuthChecked(true);
      setLoading(false);
    }
  }

  async function loadJobs() {
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const safeJobs = ((data as Booking[]) || []).map((job) => ({
        ...job,
        installer_pay: getDerivedInstallerPay(job),
        one_way_km: num(job.one_way_km),
        sqft: num(job.sqft),
        job_size: num(job.job_size),
        installer_subtotal_pay: num(job.installer_subtotal_pay),
        installer_hst_pay: num(job.installer_hst_pay),
        installer_base_pay: num(job.installer_base_pay),
        installer_mileage_pay: num(job.installer_mileage_pay),
        installer_addon_pay: num(job.installer_addon_pay),
        installer_other_pay: num(job.installer_other_pay),
        installer_cut_polish_pay: num(job.installer_cut_polish_pay),
        installer_sink_pay: num(job.installer_sink_pay),
      }));

      setAllJobs(safeJobs);
    } catch (error) {
      console.error("LOAD JOBS ERROR:", error);
      alert(error instanceof Error ? error.message : "Error loading jobs");
      setAllJobs([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function recheckSingleJobAvailability(jobId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to re-check job.");
    }

    const job = (data as Booking | null) || null;

    if (!job) {
      throw new Error("Job not found.");
    }

    if (!isJobAvailable(job)) {
      throw new Error("Job is no longer available.");
    }

    return job;
  }

  async function recheckGroupedJobsAvailability(jobIds: string[]) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .in("id", jobIds);

    if (error) {
      throw new Error(error.message || "Failed to re-check grouped jobs.");
    }

    const jobsFound = (data as Booking[]) || [];

    if (jobsFound.length !== jobIds.length) {
      throw new Error("One or more jobs are missing.");
    }

    const invalidJob = jobsFound.find((job) => !isJobAvailable(job));
    if (invalidJob) {
      throw new Error("One or more jobs are no longer available.");
    }

    return jobsFound;
  }

  async function acceptSingleJob(job: Booking) {
    if (!authChecked) {
      alert("Checking installer access...");
      return;
    }

    if (!installerName.trim()) {
      alert("Installer name not found from profile.");
      return;
    }

    if (!isJobAvailable(job)) {
      alert("This job is not available to accept.");
      return;
    }

    setAcceptingKey(job.id);

    try {
      const freshJob = await recheckSingleJobAvailability(job.id);
      const supabase = createClient();
      const acceptedAt = new Date().toISOString();

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: installerName.trim(),
          reassigned_installer_name: null,
          status: "accepted",
          accepted_at: acceptedAt,
        })
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message || "Failed to accept job");
      }

      try {
        await sendCustomerAssignmentEmail(freshJob, installerName.trim());
      } catch (emailError) {
        console.error("Customer assignment email error:", emailError);
      }

      try {
        await sendAdminAcceptedEmail(freshJob, installerName.trim());
      } catch (emailError) {
        console.error("Admin accepted email error:", emailError);
      }

      alert("Job accepted ✅");
      setViewMode("myJobs");
      await loadJobs();
    } catch (error) {
      console.error("ACCEPT SINGLE JOB ERROR:", error);
      alert(error instanceof Error ? error.message : "Failed to accept job");
    } finally {
      setAcceptingKey("");
    }
  }

  async function acceptBothJobs(group: GroupedJobs) {
    if (!authChecked) {
      alert("Checking installer access...");
      return;
    }

    if (!installerName.trim()) {
      alert("Installer name not found from profile.");
      return;
    }

    if (group.jobs.length < 2) {
      alert("This group no longer has both jobs available.");
      return;
    }

    if (!group.jobs.every(isJobAvailable)) {
      alert("One or more jobs in this group are not available to accept.");
      return;
    }

    setAcceptingKey(group.groupKey);

    try {
      const jobIds = group.jobs.map((job) => job.id);
      const freshJobs = await recheckGroupedJobsAvailability(jobIds);
      const supabase = createClient();
      const acceptedAt = new Date().toISOString();

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: installerName.trim(),
          reassigned_installer_name: null,
          status: "accepted",
          accepted_at: acceptedAt,
        })
        .in("id", jobIds);

      if (error) {
        throw new Error(error.message || "Failed to accept both jobs");
      }

      for (const freshJob of freshJobs) {
        try {
          await sendCustomerAssignmentEmail(freshJob, installerName.trim());
        } catch (emailError) {
          console.error("Customer assignment email error:", emailError);
        }

        try {
          await sendAdminAcceptedEmail(freshJob, installerName.trim());
        } catch (emailError) {
          console.error("Admin accepted email error:", emailError);
        }
      }

      alert("Both jobs accepted ✅");
      setViewMode("myJobs");
      await loadJobs();
    } catch (error) {
      console.error("ACCEPT BOTH JOBS ERROR:", error);
      alert(error instanceof Error ? error.message : "Failed to accept both jobs");
    } finally {
      setAcceptingKey("");
    }
  }

  async function updateMyJobStatus(
    job: Booking,
    nextStatus: "in_progress" | "completed" | "incomplete"
  ) {
    if (!installerName.trim()) {
      alert("Installer profile name not found.");
      return;
    }

    if (!isMyJob(job, installerName)) {
      alert("You can only update your own jobs.");
      return;
    }

    setStatusActionKey(job.id);

    try {
      const supabase = createClient();
      const updates: Record<string, unknown> = {
        status: nextStatus,
      };

      if (nextStatus === "in_progress") {
        updates.status = "in_progress";
      }

      if (nextStatus === "completed") {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
        updates.incomplete_at = null;
      }

      if (nextStatus === "incomplete") {
        const reason = window.prompt(
          "Enter incomplete reason (customer, shop, installer, access issue, damage, other):",
          job.incomplete_reason || ""
        );

        if (reason === null) {
          setStatusActionKey("");
          return;
        }

        const notes = window.prompt(
          "Add incomplete notes for admin:",
          job.incomplete_notes || ""
        );

        if (notes === null) {
          setStatusActionKey("");
          return;
        }

        updates.status = "incomplete";
        updates.incomplete_at = new Date().toISOString();
        updates.completed_at = null;
        updates.incomplete_reason = reason.trim();
        updates.incomplete_notes = notes.trim();
      }

      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message || "Failed to update job status.");
      }

      alert(
        nextStatus === "in_progress"
          ? "Job marked in progress ✅"
          : nextStatus === "completed"
            ? "Job marked completed ✅"
            : "Job marked incomplete ✅"
      );

      await loadJobs();
    } catch (error) {
      console.error("UPDATE JOB STATUS ERROR:", error);
      alert(error instanceof Error ? error.message : "Failed to update job");
    } finally {
      setStatusActionKey("");
    }
  }

  const availableJobs = useMemo(() => {
    return allJobs.filter(isJobAvailable);
  }, [allJobs]);

  const myJobs = useMemo(() => {
    const jobs = allJobs.filter((job) => isMyJob(job, installerName));

    return [...jobs].sort((a, b) => {
      const aStatus = normalizeBookingStatus(a);
      const bStatus = normalizeBookingStatus(b);

      const priority = (status: string) => {
        if (status === "accepted") return 1;
        if (status === "in_progress") return 2;
        if (status === "incomplete") return 3;
        if (status === "completed") return 4;
        return 5;
      };

      const diff = priority(aStatus) - priority(bStatus);
      if (diff !== 0) return diff;

      return num(b.job_number) - num(a.job_number);
    });
  }, [allJobs, installerName]);

  const visibleJobs = useMemo(() => {
    return viewMode === "available" ? availableJobs : myJobs;
  }, [viewMode, availableJobs, myJobs]);

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    visibleJobs.forEach((job) => {
      const key = String(job.job_group_id || job.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(job);
    });

    const result: GroupedJobs[] = Array.from(groups.entries()).map(
      ([groupKey, groupItems]) => ({
        groupKey,
        jobs: [...groupItems].sort(
          (a, b) => num(a.job_number) - num(b.job_number)
        ),
      })
    );

    return result.sort((a, b) => {
      const aHasSameDay = a.jobs.some(isSameDayJob);
      const bHasSameDay = b.jobs.some(isSameDayJob);
      if (aHasSameDay && !bHasSameDay) return -1;
      if (!aHasSameDay && bHasSameDay) return 1;

      const aHasNextDay = a.jobs.some(isNextDayJob);
      const bHasNextDay = b.jobs.some(isNextDayJob);
      if (aHasNextDay && !bHasNextDay) return -1;
      if (!aHasNextDay && bHasNextDay) return 1;

      const aTopAi = Math.max(
        ...a.jobs.map((job) => getAiInsight(job, visibleJobs).bestMatchScore)
      );
      const bTopAi = Math.max(
        ...b.jobs.map((job) => getAiInsight(job, visibleJobs).bestMatchScore)
      );
      if (bTopAi !== aTopAi) return bTopAi - aTopAi;

      const aTopPay = Math.max(...a.jobs.map((job) => getDerivedInstallerPay(job)));
      const bTopPay = Math.max(...b.jobs.map((job) => getDerivedInstallerPay(job)));

      return bTopPay - aTopPay;
    });
  }, [visibleJobs]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    return groupedJobs.filter((group) => {
      const isGrouped = group.jobs.length > 1;

      if (filter === "single" && isGrouped) return false;
      if (filter === "grouped" && !isGrouped) return false;

      if (
        filter === "urgency" &&
        !group.jobs.some((job) => {
          const ai = getAiInsight(job, visibleJobs);
          return ai.urgencyLabel === "Same-Day Priority" || ai.urgencyLabel === "Next-Day Priority";
        })
      ) {
        return false;
      }

      if (
        filter === "sameDay" &&
        !group.jobs.some(
          (job) => getAiInsight(job, visibleJobs).urgencyLabel === "Same-Day Priority"
        )
      ) {
        return false;
      }

      if (
        filter === "nextDay" &&
        !group.jobs.some(
          (job) => getAiInsight(job, visibleJobs).urgencyLabel === "Next-Day Priority"
        )
      ) {
        return false;
      }

      if (
        filter === "longDistance" &&
        !group.jobs.some((job) => num(job.one_way_km) > 120)
      ) {
        return false;
      }

      if (
        filter === "highPay" &&
        !group.jobs.some((job) => getDerivedInstallerPay(job) >= 500)
      ) {
        return false;
      }

      if (
        filter === "bestAi" &&
        !group.jobs.some((job) => getAiInsight(job, visibleJobs).bestMatchScore >= 85)
      ) {
        return false;
      }

      if (!term) return true;

      return group.jobs.some((job) => {
        const ai = getAiInsight(job, visibleJobs);

        return (
          safeText(job.job_id).toLowerCase().includes(term) ||
          safeText(job.company_name).toLowerCase().includes(term) ||
          safeText(job.customer_name).toLowerCase().includes(term) ||
          safeText(job.pickup_address).toLowerCase().includes(term) ||
          safeText(job.dropoff_address).toLowerCase().includes(term) ||
          safeText(job.scheduled_date).toLowerCase().includes(term) ||
          getServiceTypeLabel(job).toLowerCase().includes(term) ||
          normalizeBookingStatus(job).includes(term) ||
          safeText(job.installer_name).toLowerCase().includes(term) ||
          ai.recommendedInstallerType.toLowerCase().includes(term) ||
          ai.groupingLabel.toLowerCase().includes(term) ||
          ai.urgencyLabel.toLowerCase().includes(term) ||
          ai.recommendedAction.toLowerCase().includes(term)
        );
      });
    });
  }, [groupedJobs, search, filter, visibleJobs]);

  const urgentGroups = useMemo(() => {
    return filteredGroups.filter((group) => group.jobs.some(isSameDayJob));
  }, [filteredGroups]);

  const nextDayGroups = useMemo(() => {
    return filteredGroups.filter(
      (group) => !group.jobs.some(isSameDayJob) && group.jobs.some(isNextDayJob)
    );
  }, [filteredGroups]);

  const regularGroups = useMemo(() => {
    return filteredGroups.filter(
      (group) => !group.jobs.some(isSameDayJob) && !group.jobs.some(isNextDayJob)
    );
  }, [filteredGroups]);

  const summary = useMemo(() => {
    const totalGroups = filteredGroups.length;
    const totalJobs = filteredGroups.reduce((sum, group) => sum + group.jobs.length, 0);
    const groupedCount = filteredGroups.filter((group) => group.jobs.length > 1).length;
    const urgencyCount = filteredGroups.filter((group) =>
      group.jobs.some((job) => {
        const ai = getAiInsight(job, visibleJobs);
        return ai.urgencyLabel === "Same-Day Priority" || ai.urgencyLabel === "Next-Day Priority";
      })
    ).length;

    const sameDayCount = filteredGroups.filter((group) =>
      group.jobs.some(
        (job) => getAiInsight(job, visibleJobs).urgencyLabel === "Same-Day Priority"
      )
    ).length;

    const nextDayCount = filteredGroups.filter((group) =>
      group.jobs.some(
        (job) => getAiInsight(job, visibleJobs).urgencyLabel === "Next-Day Priority"
      )
    ).length;

    const longDistanceCount = filteredGroups.filter((group) =>
      group.jobs.some((job) => num(job.one_way_km) > 120)
    ).length;

    const topAiCount = filteredGroups.filter((group) =>
      group.jobs.some((job) => getAiInsight(job, visibleJobs).bestMatchScore >= 85)
    ).length;

    return {
      totalGroups,
      totalJobs,
      groupedCount,
      urgencyCount,
      sameDayCount,
      nextDayCount,
      longDistanceCount,
      topAiCount,
    };
  }, [filteredGroups, visibleJobs]);

  const availableSummary = useMemo(() => {
    return {
      jobs: availableJobs.length,
      groups: new Set(availableJobs.map((job) => String(job.job_group_id || job.id))).size,
    };
  }, [availableJobs]);

  const myJobsSummary = useMemo(() => {
    const accepted = myJobs.filter((job) => normalizeBookingStatus(job) === "accepted").length;
    const completed = myJobs.filter((job) => normalizeBookingStatus(job) === "completed").length;
    const incomplete = myJobs.filter((job) => normalizeBookingStatus(job) === "incomplete").length;
    const inProgress = myJobs.filter((job) => normalizeBookingStatus(job) === "in_progress").length;

    return {
      total: myJobs.length,
      accepted,
      completed,
      incomplete,
      inProgress,
    };
  }, [myJobs]);

  function renderGroup(group: GroupedJobs) {
    const isGrouped = group.jobs.length > 1;
    const availableJobsInGroup = group.jobs.filter(isJobAvailable);
    const totalGroupPay = group.jobs.reduce(
      (sum, job) => sum + getDerivedInstallerPay(job),
      0
    );

    const topAi = Math.max(
      ...group.jobs.map((job) => getAiInsight(job, visibleJobs).bestMatchScore)
    );

    const topPriority = Math.max(
      ...group.jobs.map((job) => getAiInsight(job, visibleJobs).priorityScore)
    );

    const bestGrouping = group.jobs.some(
      (job) => getAiInsight(job, visibleJobs).groupingLabel === "Strong Grouping"
    )
      ? "Strong Grouping"
      : group.jobs.some(
            (job) => getAiInsight(job, visibleJobs).groupingLabel === "Possible Grouping"
          )
        ? "Possible Grouping"
        : "Solo Route";

    const hasSameDay = group.jobs.some(isSameDayJob);
    const hasNextDay = group.jobs.some(isNextDayJob);
    const canAcceptBoth =
      viewMode === "available" &&
      isGrouped &&
      availableJobsInGroup.length === group.jobs.length;

    return (
      <div
        key={group.groupKey}
        className={`rounded-xl border p-5 ${
          hasSameDay
            ? "border-red-500/30 bg-red-500/5"
            : hasNextDay
              ? "border-yellow-500/30 bg-yellow-500/5"
              : "border-zinc-800 bg-zinc-900"
        }`}
      >
        <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-2xl font-semibold text-yellow-400">
              {group.jobs[0].company_name ||
                group.jobs[0].customer_name ||
                (isGrouped ? "Group Job" : "Job")}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {isGrouped ? `Grouped Run • ${group.jobs.length} jobs shown` : "Single Job"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasSameDay ? (
              <AiBadge
                label="Urgent"
                value="Same Day"
                className="border-red-500/30 bg-red-500/10 text-red-400"
              />
            ) : null}

            {!hasSameDay && hasNextDay ? (
              <AiBadge
                label="Priority"
                value="Next Day"
                className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
              />
            ) : null}

            <AiBadge label="Group Pay" value={money(totalGroupPay)} />
            <AiBadge
              label="Best AI"
              value={`${topAi}/100`}
              className="border-purple-500/30 bg-purple-500/10 text-purple-300"
            />
            <AiBadge label="Best Priority" value={`${topPriority}/100`} />
            <AiBadge
              label="Grouping"
              value={bestGrouping}
              className={getGroupingColor(bestGrouping)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {group.jobs.map((job) => {
            const detailKey = `${group.groupKey}-${job.id}`;
            const expanded = Boolean(expandedKeys[detailKey]);

            return (
              <div key={job.id}>
                <JobDetailBlock
                  job={job}
                  allJobs={visibleJobs}
                  expanded={expanded}
                  onToggle={() => toggleExpanded(detailKey)}
                  canAccept={viewMode === "available" ? isJobAvailable(job) : false}
                  onAccept={() => void acceptSingleJob(job)}
                  acceptLoading={acceptingKey === job.id}
                  showAcceptButton={viewMode === "available"}
                  showMyJobActions={viewMode === "myJobs"}
                  actionLoading={statusActionKey === job.id}
                  onStartJob={() => void updateMyJobStatus(job, "in_progress")}
                  onCompleteJob={() => void updateMyJobStatus(job, "completed")}
                  onIncompleteJob={() => void updateMyJobStatus(job, "incomplete")}
                  viewMode={viewMode}
                />
              </div>
            );
          })}
        </div>

        {viewMode === "available" && isGrouped ? (
          canAcceptBoth ? (
            <button
              type="button"
              onClick={() => void acceptBothJobs(group)}
              disabled={acceptingKey === group.groupKey}
              className="mt-5 rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {acceptingKey === group.groupKey ? "Accepting Both..." : "Accept Both Jobs"}
            </button>
          ) : (
            <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              Not all jobs in this group are currently available to accept together.
            </div>
          )
        ) : null}
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-4xl font-bold text-yellow-500">
          {viewMode === "available" ? "Available Jobs" : "My Jobs"}
        </h1>
        <p className="mt-2 text-gray-400">
          {viewMode === "available"
            ? "Open jobs installers can still accept."
            : "Jobs already accepted or assigned to this installer only."}
        </p>

        {installerName ? (
          <p className="mt-3 text-sm text-zinc-300">
            Logged in as:{" "}
            <span className="font-semibold text-yellow-400">{installerName}</span>
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setViewMode("available")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold ${
              viewMode === "available"
                ? "bg-yellow-500 text-black"
                : "border border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
            }`}
          >
            Available Jobs
          </button>

          <button
            type="button"
            onClick={() => setViewMode("myJobs")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold ${
              viewMode === "myJobs"
                ? "bg-yellow-500 text-black"
                : "border border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
            }`}
          >
            My Jobs
          </button>

          <button
            type="button"
            onClick={() => void loadJobs()}
            className="rounded-xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CompactStat label="Available Jobs" value={String(availableSummary.jobs)} />
        <CompactStat label="Available Groups" value={String(availableSummary.groups)} />
        <CompactStat label="My Jobs" value={String(myJobsSummary.total)} />
        <CompactStat label="My Accepted" value={String(myJobsSummary.accepted)} />
      </div>

      {viewMode === "myJobs" ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <CompactStat label="In Progress" value={String(myJobsSummary.inProgress)} />
          <CompactStat label="Completed" value={String(myJobsSummary.completed)} />
          <CompactStat label="Incomplete" value={String(myJobsSummary.incomplete)} />
          <CompactStat label="My Total Jobs" value={String(myJobsSummary.total)} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-gray-300">
          AI helps suggest the best jobs and grouped routes, but{" "}
          <span className="font-semibold text-yellow-400">
            you still choose which job to accept.
          </span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <CompactStat label="Job Groups" value={String(summary.totalGroups)} />
        <CompactStat label="Total Jobs" value={String(summary.totalJobs)} />
        <CompactStat label="Grouped Runs" value={String(summary.groupedCount)} />
        <CompactStat label="Urgency" value={String(summary.urgencyCount)} />
        <CompactStat label="Same-Day" value={String(summary.sameDayCount)} />
        <CompactStat label="Next-Day" value={String(summary.nextDayCount)} />
        <CompactStat label="Long Distance" value={String(summary.longDistanceCount)} />
        <CompactStat label="Top AI Match" value={String(summary.topAiCount)} />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job ID, company, address, service, status..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["single", "Single"],
                ["grouped", "Grouped"],
                ["urgency", "Urgency"],
                ["sameDay", "Same Day"],
                ["nextDay", "Next Day"],
                ["longDistance", "Long Distance"],
                ["highPay", "High Pay"],
                ["bestAi", "Best AI"],
              ] as [FilterValue, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  filter === value
                    ? "bg-yellow-500 text-black"
                    : "border border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-300">Loading...</p>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
          {viewMode === "available"
            ? "No available jobs found."
            : "No jobs assigned to this installer yet."}
        </div>
      ) : (
        <div className="space-y-8">
          {urgentGroups.length > 0 ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <h2 className="text-2xl font-bold text-red-400">
                  Urgent Same-Day Jobs
                </h2>
                <p className="mt-1 text-sm text-red-200">
                  These jobs are pushed to the top so installers can see them first.
                </p>
              </div>

              {urgentGroups.map((group) => renderGroup(group))}
            </section>
          ) : null}

          {nextDayGroups.length > 0 ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                <h2 className="text-2xl font-bold text-yellow-400">
                  Next-Day Priority Jobs
                </h2>
                <p className="mt-1 text-sm text-yellow-200">
                  High-visibility jobs that should be reviewed early.
                </p>
              </div>

              {nextDayGroups.map((group) => renderGroup(group))}
            </section>
          ) : null}

          {regularGroups.length > 0 ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-2xl font-bold text-yellow-500">
                  {viewMode === "available" ? "Other Available Jobs" : "My Other Jobs"}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Remaining jobs ranked by AI score, grouping, and payout.
                </p>
              </div>

              {regularGroups.map((group) => renderGroup(group))}
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
