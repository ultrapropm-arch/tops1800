"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

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

  timeline?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;

  service_type?: string | null;
  service_type_label?: string | null;
  material_type?: string | null;
  material_size?: string | null;
  job_size?: number | null;
  sqft?: number | null;

  payment_method?: string | null;
  status?: string | null;
  payment_status?: string | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  company_profit?: number | null;

  notes?: string | null;
  side_note?: string | null;

  subtotal?: number | null;
  hst?: number | null;
  hst_amount?: number | null;
  final_total?: number | null;

  job_group_id?: string | number | null;
  job_number?: number | null;
  is_archived?: boolean | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  incomplete_photo_url?: string | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;
  mileage_fee?: number | null;
  admin_fee_note?: string | null;
  redo_requested?: boolean | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;

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

  completed_photo_url?: string | null;
  completion_signature_url?: string | null;
  has_signing_form?: boolean | null;

  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_route_hint?: string | null;
  ai_urgency_label?: string | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;
};

type Installer = {
  id: string;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  payout_method?: string | null;
  etransfer_email?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  account_number?: string | null;
  notes?: string | null;
  status?: string | null;
  approval_status?: string | null;
  rating?: number | null;
};

type DispatchInstaller = {
  id: string;
  name: string;
  distanceKm?: number;
  rating?: number;
  activeJobs?: number;
};

type DispatchRecommendation = {
  recommended: {
    id: string;
    name: string;
    distanceKm?: number;
    rating?: number;
    activeJobs?: number;
    score: number;
    scoreBreakdown: {
      distanceScore: number;
      ratingScore: number;
      workloadScore: number;
    };
  } | null;
  all: {
    id: string;
    name: string;
    distanceKm?: number;
    rating?: number;
    activeJobs?: number;
    score: number;
    scoreBreakdown: {
      distanceScore: number;
      ratingScore: number;
      workloadScore: number;
    };
  }[];
};

type StatusFilter =
  | "all"
  | "new"
  | "available"
  | "pending"
  | "accepted"
  | "in_progress"
  | "incomplete"
  | "completed"
  | "cancelled";

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
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

function getServiceTypeLabel(booking: Booking) {
  if (booking.service_type_label) return booking.service_type_label;

  const value = booking.service_type;
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
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

function getPickupWindow(booking: Booking) {
  if (booking.pickup_time_slot) return booking.pickup_time_slot;

  const from = booking.pickup_time_from || "";
  const to = booking.pickup_time_to || "";

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return booking.scheduled_time || "-";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getPayoutLines(booking: Booking) {
  if (
    Array.isArray(booking.installer_payout_lines) &&
    booking.installer_payout_lines.length > 0
  ) {
    return booking.installer_payout_lines.map((line) => ({
      label: line.label || "Payout Line",
      amount: Number(line.amount || 0),
    }));
  }

  const lines: { label: string; amount: number }[] = [];

  if (Number(booking.installer_base_pay || 0) > 0) {
    lines.push({
      label: "Base Install Pay",
      amount: Number(booking.installer_base_pay || 0),
    });
  }

  if (Number(booking.installer_mileage_pay || 0) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: Number(booking.installer_mileage_pay || 0),
    });
  }

  if (Number(booking.installer_addon_pay || 0) > 0) {
    lines.push({
      label: "Add-On Pay",
      amount: Number(booking.installer_addon_pay || 0),
    });
  }

  if (Number(booking.installer_cut_polish_pay || 0) > 0) {
    lines.push({
      label: "Cut / Polish Pay",
      amount: Number(booking.installer_cut_polish_pay || 0),
    });
  }

  if (Number(booking.installer_sink_pay || 0) > 0) {
    lines.push({
      label: "Sink / Reattach Pay",
      amount: Number(booking.installer_sink_pay || 0),
    });
  }

  if (Number(booking.installer_other_pay || 0) > 0) {
    lines.push({
      label: "Other Service Pay",
      amount: Number(booking.installer_other_pay || 0),
    });
  }

  return lines;
}

function getUrgencyLabel(booking: Booking) {
  if (booking.ai_urgency_label) return booking.ai_urgency_label;

  const text = [
    booking.timeline || "",
    booking.pickup_time_slot || "",
    booking.scheduled_time || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("same")) return "Same-Day Priority";
  if (text.includes("next")) return "Next-Day Priority";

  return "Open Scheduling";
}

function getUrgencyBadgeClass(label: string) {
  if (label === "Same-Day Priority") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }
  if (label === "Next-Day Priority") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getGroupingBadgeClass(label?: string | null) {
  if (label === "Strong Grouping") {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }
  if (label === "Possible Group") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getDispatchBadgeClass(score: number) {
  if (score >= 85) return "border-purple-500/30 bg-purple-500/10 text-purple-300";
  if (score >= 70) return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (score >= 55) return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getProfitLabel(profit?: number | null) {
  const value = Number(profit || 0);
  if (value >= 300) return "High Profit";
  if (value >= 100) return "Good Profit";
  if (value > 0) return "Low Profit";
  return "Negative / No Profit";
}

function getProfitBadgeClass(profit?: number | null) {
  const value = Number(profit || 0);
  if (value >= 300) return "border-green-500/30 bg-green-500/10 text-green-400";
  if (value >= 100) return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  if (value > 0) return "border-orange-500/30 bg-orange-500/10 text-orange-400";
  return "border-red-500/30 bg-red-500/10 text-red-400";
}

function getProfitTextClass(profit?: number | null) {
  const value = Number(profit || 0);
  if (value >= 300) return "text-green-400";
  if (value >= 100) return "text-yellow-400";
  if (value > 0) return "text-orange-400";
  return "text-red-400";
}

function getAiScore(booking: Booking) {
  let score = Number(booking.ai_dispatch_score || booking.ai_priority_score || 0);

  if (!score) {
    score = 50;

    if (getUrgencyLabel(booking) === "Same-Day Priority") score += 20;
    if (getUrgencyLabel(booking) === "Next-Day Priority") score += 10;
    if (Number(booking.installer_pay || 0) >= 500) score += 10;
    if ((booking.ai_grouping_label || "") === "Strong Grouping") score += 15;
    if ((booking.ai_grouping_label || "") === "Possible Group") score += 8;
    if (Number(booking.mileage_fee || 0) > 0) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getAcceptedStateLabel(booking: Booking) {
  if (safeText(booking.installer_name) || safeText(booking.reassigned_installer_name)) {
    return "Accepted";
  }
  if (normalizeText(booking.status) === "accepted") return "Accepted";
  return "Not Accepted";
}

function getAcceptedStateClass(booking: Booking) {
  return getAcceptedStateLabel(booking) === "Accepted"
    ? "border-green-500/30 bg-green-500/10 text-green-400"
    : "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getPublicJobPhotoUrl(path?: string | null) {
  if (!path) return "";
  const supabase = createClient();
  const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
  return data.publicUrl;
}

function normalizeBookingStatus(status?: string | null): string {
  const value = normalizeText(status);

  if (!value) return "new";
  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "in progress") return "in_progress";
  if (value === "completed_pending_admin_review") return "completed";
  if (value === "canceled") return "cancelled";

  return value;
}

function matchesStatusFilter(booking: Booking, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  return normalizeBookingStatus(booking.status) === filter;
}

function getInstallerDisplayName(installer: Installer) {
  return (
    safeText(installer.installer_name) ||
    safeText(installer.full_name) ||
    safeText(installer.name) ||
    safeText(installer.business_name) ||
    safeText(installer.company_name) ||
    "Unnamed Installer"
  );
}

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-yellow-500">{value}</p>
      {sublabel ? <p className="mt-2 text-sm text-gray-400">{sublabel}</p> : null}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-2xl font-bold text-yellow-500">{title}</h2>
      <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

function ProofLink({
  label,
  path,
}: {
  label: string;
  path?: string | null;
}) {
  if (!path) {
    return <p>{label}: -</p>;
  }

  const publicUrl = getPublicJobPhotoUrl(path);

  return (
    <p>
      {label}:{" "}
      <a
        href={publicUrl}
        target="_blank"
        rel="noreferrer"
        className="text-yellow-400 underline"
      >
        Open
      </a>
    </p>
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
      <p className="mb-2 text-sm font-semibold text-yellow-400">{title}</p>
      <div className="space-y-1 text-sm text-gray-300">
        {items.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  installers,
  expanded,
  onToggle,
  onUpdate,
  savingId,
  dispatchRecommendation,
  dispatchLoadingId,
  onRunDispatch,
  onAssignRecommendedInstaller,
}: {
  booking: Booking;
  installers: Installer[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (
    id: string,
    field: keyof Booking,
    value: string | number | boolean | null
  ) => void;
  savingId: string;
  dispatchRecommendation?: DispatchRecommendation;
  dispatchLoadingId: string;
  onRunDispatch: (booking: Booking) => void;
  onAssignRecommendedInstaller: (booking: Booking) => void;
}) {
  const addOnServices = toArray(booking.add_on_services);
  const justServices = toArray(booking.just_services);
  const payoutLines = getPayoutLines(booking);
  const urgencyLabel = getUrgencyLabel(booking);
  const aiScore = getAiScore(booking);
  const acceptedState = getAcceptedStateLabel(booking);
  const normalizedStatus = normalizeBookingStatus(booking.status);
  const recommendedInstaller = dispatchRecommendation?.recommended || null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-zinc-800 pb-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-yellow-500">
              {booking.company_name || booking.customer_name || "Booking"}
            </h3>

            <Badge
              label={normalizedStatus || "new"}
              className="border-zinc-700 bg-zinc-800/40 text-zinc-300"
            />

            <Badge
              label={urgencyLabel}
              className={getUrgencyBadgeClass(urgencyLabel)}
            />

            <Badge
              label={booking.ai_grouping_label || "Solo Route"}
              className={getGroupingBadgeClass(booking.ai_grouping_label)}
            />

            <Badge
              label={`Dispatch ${aiScore}/100`}
              className={getDispatchBadgeClass(aiScore)}
            />

            <Badge
              label={getProfitLabel(booking.company_profit)}
              className={getProfitBadgeClass(booking.company_profit)}
            />

            <Badge
              label={acceptedState}
              className={getAcceptedStateClass(booking)}
            />

            {booking.is_archived === true ? (
              <Badge
                label="Archived"
                className="border-zinc-600 bg-zinc-700/30 text-zinc-300"
              />
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Job</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.job_id || booking.id}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.scheduled_date || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Pickup Window
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {getPickupWindow(booking)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Service</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {getServiceTypeLabel(booking)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Installer</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.reassigned_installer_name ||
                  booking.installer_name ||
                  "Unassigned"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Status</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.status || "new"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Accepted Time
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatDateTime(booking.accepted_at)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Installer Pay
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {money(booking.installer_pay)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Company Profit
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${getProfitTextClass(
                  booking.company_profit
                )}`}
              >
                {money(booking.company_profit)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Payout Status
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.installer_pay_status || "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-sm font-semibold text-yellow-400">
                AI Suggested Installer Type
              </p>
              <p className="mt-1 text-sm text-gray-300">
                {booking.ai_recommended_installer_type || "Standard Installer"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-sm font-semibold text-yellow-400">AI Route Hint</p>
              <p className="mt-1 text-sm text-gray-300">
                {booking.ai_route_hint || "No route hint yet."}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-300">
                  AI Dispatch Recommendation
                </p>

                {dispatchLoadingId === booking.id ? (
                  <p className="mt-1 text-sm text-gray-300">
                    Calculating best installer...
                  </p>
                ) : recommendedInstaller ? (
                  <div className="mt-1 space-y-1 text-sm text-gray-300">
                    <p>
                      Recommended:{" "}
                      <span className="font-semibold text-white">
                        {recommendedInstaller.name}
                      </span>
                    </p>
                    <p>
                      Score:{" "}
                      <span className="font-semibold text-purple-300">
                        {recommendedInstaller.score}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      Distance {recommendedInstaller.scoreBreakdown.distanceScore} •
                      Rating {recommendedInstaller.scoreBreakdown.ratingScore} •
                      Workload {recommendedInstaller.scoreBreakdown.workloadScore}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-300">
                    No recommendation yet.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <button
                  type="button"
                  onClick={() => onRunDispatch(booking)}
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/20"
                >
                  {dispatchLoadingId === booking.id ? "Running..." : "Run AI Dispatch"}
                </button>

                {recommendedInstaller ? (
                  <button
                    type="button"
                    onClick={() => onAssignRecommendedInstaller(booking)}
                    disabled={savingId === booking.id}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-60"
                  >
                    {savingId === booking.id ? "Saving..." : "Assign Recommended"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-[260px]">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
          >
            {expanded ? "Hide Details" : "View Full Details"}
          </button>

          <button
            type="button"
            onClick={() => onUpdate(booking.id, "status", "available")}
            disabled={savingId === booking.id}
            className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60"
          >
            {savingId === booking.id ? "Saving..." : "Set Live / Available"}
          </button>

          <button
            type="button"
            onClick={() => onUpdate(booking.id, "status", "completed")}
            disabled={savingId === booking.id}
            className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-60"
          >
            {savingId === booking.id ? "Saving..." : "Mark Completed"}
          </button>

          <button
            type="button"
            onClick={() => onUpdate(booking.id, "status", "incomplete")}
            disabled={savingId === booking.id}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {savingId === booking.id ? "Saving..." : "Mark Incomplete"}
          </button>

          <button
            type="button"
            onClick={() => onUpdate(booking.id, "installer_pay_status", "ready")}
            disabled={savingId === booking.id}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white transition hover:border-yellow-500 disabled:opacity-60"
          >
            {savingId === booking.id ? "Saving..." : "Set Ready Payout"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-400">
                  Customer / Job Info
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Job ID: {booking.job_id || booking.id}</p>
                  <p>Booking Row ID: {booking.id}</p>
                  {booking.job_group_id ? (
                    <p>
                      Group ID: {String(booking.job_group_id)}
                      {booking.job_number ? ` • Job ${booking.job_number}` : ""}
                    </p>
                  ) : null}
                  <p>Customer: {booking.customer_name || "-"}</p>
                  <p>Email: {booking.customer_email || "-"}</p>
                  <p>Phone: {booking.phone_number || "-"}</p>
                  <p>Company: {booking.company_name || "-"}</p>
                  <p>Material Type: {booking.material_type || "-"}</p>
                  <p>Material Size: {booking.material_size || "-"}</p>
                  <p>Sqft: {Number(booking.sqft || booking.job_size || 0) || "-"}</p>
                  <p>Payment Method: {booking.payment_method || "-"}</p>
                  <p>Timeline: {booking.timeline || "-"}</p>
                  <p>Created: {formatDateTime(booking.created_at)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-400">
                  Route / Schedule
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Scheduled Date: {booking.scheduled_date || "-"}</p>
                  <p>Scheduled Time: {booking.scheduled_time || "-"}</p>
                  <p>Pickup Window: {getPickupWindow(booking)}</p>
                  <p>Pick Up: {booking.pickup_address || "-"}</p>
                  <p>Drop Off: {booking.dropoff_address || "-"}</p>
                  <p>Distance Tier: {booking.ai_distance_tier || "-"}</p>
                  <p>Accepted At: {formatDateTime(booking.accepted_at)}</p>
                  <p>Completed At: {formatDateTime(booking.completed_at)}</p>
                  <p>Incomplete At: {formatDateTime(booking.incomplete_at)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ServiceBox title="Add-On Services" items={addOnServices} />
              <ServiceBox title="Just Services" items={justServices} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-400">
                  Incomplete / Return / Redo
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Incomplete Reason: {booking.incomplete_reason || "-"}</p>
                  <p>
                    Incomplete Note:{" "}
                    {booking.incomplete_notes || booking.incomplete_note || "-"}
                  </p>
                  <p>
                    Customer Return Fee:{" "}
                    {money(booking.return_fee_charged || booking.return_fee)}
                  </p>
                  <p>
                    Installer Return Pay: {money(booking.return_fee_installer_pay)}
                  </p>
                  <p>Mileage Fee: {money(booking.mileage_fee)}</p>
                  <p>Admin Fee Note: {booking.admin_fee_note || "-"}</p>
                  <p>Redo Requested: {booking.redo_requested ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-400">
                  Extra Details / Proof
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Waterfall Quantity: {booking.waterfall_quantity || "-"}</p>
                  <p>
                    Outlet Plug Cutout Quantity:{" "}
                    {booking.outlet_plug_cutout_quantity || "-"}
                  </p>
                  <p>
                    Disposal Responsibility:{" "}
                    {getDisposalResponsibilityLabel(booking.disposal_responsibility)}
                  </p>
                  <p>
                    Customer Provided Signing Form:{" "}
                    {booking.has_signing_form === true
                      ? "Yes"
                      : booking.has_signing_form === false
                        ? "No"
                        : "-"}
                  </p>
                  <ProofLink
                    label="Completed Photo Proof"
                    path={booking.completed_photo_url}
                  />
                  <ProofLink
                    label="Completion Signature"
                    path={booking.completion_signature_url}
                  />
                  <ProofLink
                    label="Incomplete Photo Proof"
                    path={booking.incomplete_photo_url}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="mb-3 text-sm font-semibold text-yellow-400">
                Payout Breakdown
              </p>

              {payoutLines.length > 0 ? (
                <div className="space-y-2 text-sm text-gray-300">
                  {payoutLines.map((line) => (
                    <div
                      key={line.label}
                      className="flex items-center justify-between border-b border-zinc-800 pb-2"
                    >
                      <span>{line.label}</span>
                      <span>{money(line.amount)}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>Subtotal Pay</span>
                    <span>{money(booking.installer_subtotal_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>HST Pay</span>
                    <span>{money(booking.installer_hst_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                    <span>Total Installer Pay</span>
                    <span>{money(booking.installer_pay)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>Subtotal Pay</span>
                    <span>{money(booking.installer_subtotal_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>HST Pay</span>
                    <span>{money(booking.installer_hst_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span>Total Installer Pay</span>
                    <span>{money(booking.installer_pay)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="mb-3 text-sm font-semibold text-yellow-400">
                Notes / Totals
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Notes: {booking.notes || "-"}</p>
                <p>Side Note: {booking.side_note || "-"}</p>
                <p>Subtotal: {money(booking.subtotal)}</p>
                <p>HST: {money(booking.hst ?? booking.hst_amount)}</p>
                <p className="font-semibold text-yellow-400">
                  Total: {money(booking.final_total)}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-[460px]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Booking Status
                </label>
                <select
                  value={booking.status || ""}
                  onChange={(e) => onUpdate(booking.id, "status", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                >
                  <option value="">Select Status</option>
                  <option value="new">New</option>
                  <option value="available">Available</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="accepted">Accepted</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="completed_pending_admin_review">
                    Completed Pending Admin Review
                  </option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Customer Payment Status
                </label>
                <select
                  value={booking.payment_status || ""}
                  onChange={(e) =>
                    onUpdate(booking.id, "payment_status", e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                >
                  <option value="">Select Payment Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer
                </label>
                <select
                  value={booking.installer_name || ""}
                  onChange={(e) =>
                    onUpdate(booking.id, "installer_name", e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                >
                  <option value="">Select Installer</option>
                  {installers
                    .filter((installer) => normalizeText(installer.status) !== "inactive")
                    .map((installer) => {
                      const installerDisplayName = getInstallerDisplayName(installer);

                      return (
                        <option key={installer.id} value={installerDisplayName}>
                          {installerDisplayName}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer Pay
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.installer_pay ?? 0}
                  onBlur={(e) =>
                    onUpdate(booking.id, "installer_pay", Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer Payout Status
                </label>
                <select
                  value={booking.installer_pay_status || ""}
                  onChange={(e) =>
                    onUpdate(booking.id, "installer_pay_status", e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                >
                  <option value="">Select Payout Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="hold">Hold</option>
                  <option value="ready">Ready</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Company Profit
                </label>
                <input
                  type="text"
                  value={money(booking.company_profit)}
                  readOnly
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Customer Return Fee
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.return_fee_charged || booking.return_fee || 0}
                  onBlur={(e) =>
                    onUpdate(
                      booking.id,
                      "return_fee_charged",
                      Number(e.target.value || 0)
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer Return Pay
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.return_fee_installer_pay || 0}
                  onBlur={(e) =>
                    onUpdate(
                      booking.id,
                      "return_fee_installer_pay",
                      Number(e.target.value || 0)
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer Subtotal Pay
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.installer_subtotal_pay || 0}
                  onBlur={(e) =>
                    onUpdate(
                      booking.id,
                      "installer_subtotal_pay",
                      Number(e.target.value || 0)
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Installer HST Pay
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.installer_hst_pay || 0}
                  onBlur={(e) =>
                    onUpdate(
                      booking.id,
                      "installer_hst_pay",
                      Number(e.target.value || 0)
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Mileage Fee
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={booking.mileage_fee || 0}
                  onBlur={(e) =>
                    onUpdate(booking.id, "mileage_fee", Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">
                  Incomplete Note
                </label>
                <input
                  type="text"
                  defaultValue={booking.incomplete_notes || booking.incomplete_note || ""}
                  onBlur={(e) =>
                    onUpdate(booking.id, "incomplete_notes", e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">
                  Admin Fee Note
                </label>
                <input
                  type="text"
                  defaultValue={booking.admin_fee_note || ""}
                  onBlur={(e) =>
                    onUpdate(booking.id, "admin_fee_note", e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">
                  Admin Notes
                </label>
                <input
                  type="text"
                  defaultValue={booking.notes || ""}
                  onBlur={(e) => onUpdate(booking.id, "notes", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-700 p-4 text-sm text-gray-300">
              <p className="mb-1">
                Jobs in <span className="text-yellow-400">Available</span> or{" "}
                <span className="text-yellow-400">Pending</span> are live for installer
                acceptance.
              </p>
              <p className="mb-1">
                Incomplete jobs can carry customer return fees, installer return pay,
                mileage fees, payout hold, and redo request tracking.
              </p>
              <p className="mb-1">
                Completed jobs can include photo proof and optional signed completion
                forms.
              </p>
              <p>
                When a job is marked completed and installer pay is set, payout status can
                move to <span className="text-yellow-400">Ready</span>.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminBookingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [dispatchMap, setDispatchMap] = useState<Record<string, DispatchRecommendation>>({});
  const [dispatchLoadingId, setDispatchLoadingId] = useState("");

  useEffect(() => {
    void loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadBookings(), loadInstallers()]);
    setLoading(false);
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading bookings:", error);
      alert("Could not load bookings.");
      return;
    }

    const safeData: Booking[] = ((data as Booking[]) || []).map((booking) => ({
      ...booking,
      installer_pay: Number(booking.installer_pay || 0),
      company_profit: Number(booking.company_profit || 0),
      final_total: Number(booking.final_total || 0),
      subtotal: Number(booking.subtotal || 0),
      hst: Number((booking as any).hst || booking.hst_amount || 0),
      sqft: Number(booking.sqft || booking.job_size || 0),
      installer_subtotal_pay: Number(booking.installer_subtotal_pay || 0),
      installer_hst_pay: Number(booking.installer_hst_pay || 0),
      mileage_fee: Number(booking.mileage_fee || 0),
      return_fee: Number(booking.return_fee || 0),
      return_fee_charged: Number(booking.return_fee_charged || 0),
      return_fee_installer_pay: Number(booking.return_fee_installer_pay || 0),
    }));

    setBookings(safeData);
  }

  async function loadInstallers() {
    const { data, error } = await supabase
      .from("installer_profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error loading installers:", error);
      return;
    }

    setInstallers((data as Installer[]) || []);
  }

  function buildDispatchInstallers(currentBooking: Booking): DispatchInstaller[] {
    const acceptedCountByName = bookings.reduce<Record<string, number>>((acc, item) => {
      const normalized = normalizeBookingStatus(item.status);
      const assignedName = safeText(item.reassigned_installer_name || item.installer_name);

      if (assignedName && (normalized === "accepted" || normalized === "in_progress")) {
        acc[assignedName] = (acc[assignedName] || 0) + 1;
      }

      return acc;
    }, {});

    return installers
      .filter((installer) => normalizeText(installer.status) !== "inactive")
      .map((installer) => {
        const name = getInstallerDisplayName(installer);
        const activeJobs = acceptedCountByName[name] || 0;

        let distanceKm = 15;

        const routeText = `${safeText(currentBooking.pickup_address)} ${safeText(
          currentBooking.dropoff_address
        )}`.toLowerCase();

        if (routeText.includes("toronto")) distanceKm = 10;
        if (routeText.includes("mississauga")) distanceKm = 18;
        if (routeText.includes("brampton")) distanceKm = 22;
        if (routeText.includes("vaughan")) distanceKm = 16;
        if (routeText.includes("scarborough")) distanceKm = 20;
        if (routeText.includes("markham")) distanceKm = 19;
        if (routeText.includes("north york")) distanceKm = 12;
        if (routeText.includes("etobicoke")) distanceKm = 14;

        return {
          id: installer.id,
          name,
          distanceKm,
          rating: Number(installer.rating || 4.5),
          activeJobs,
        };
      });
  }

  async function runDispatchForBooking(booking: Booking) {
    try {
      setDispatchLoadingId(booking.id);

      const dispatchInstallers = buildDispatchInstallers(booking);

      const res = await fetch("/api/ai/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: booking.id,
          jobId: booking.job_id,
          installers: dispatchInstallers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to run AI dispatch");
      }

      setDispatchMap((prev) => ({
        ...prev,
        [booking.id]: data.result,
      }));
    } catch (error) {
      console.error("Dispatch recommendation failed:", error);
      alert("Could not run AI dispatch.");
    } finally {
      setDispatchLoadingId("");
    }
  }

  async function assignRecommendedInstaller(booking: Booking) {
    const recommendedInstaller = dispatchMap[booking.id]?.recommended;
    if (!recommendedInstaller) return;

    await updateBookingField(booking.id, "installer_name", recommendedInstaller.name);
  }

  async function updateBookingField(
    id: string,
    field: keyof Booking,
    value: string | number | boolean | null
  ) {
    const currentBooking = bookings.find((item) => item.id === id);
    if (!currentBooking) return;

    setSavingId(id);

    const updateData: Record<string, string | number | boolean | null> = {
      [field]: value,
    };

    const currentFinalTotal = Number(currentBooking.final_total || 0);

    if (field === "installer_pay") {
      const installerPay = Number(value || 0);
      updateData.company_profit = currentFinalTotal - installerPay;
    }

    if (field === "final_total") {
      const finalTotal = Number(value || 0);
      updateData.company_profit = finalTotal - Number(currentBooking.installer_pay || 0);
    }

    if (field === "status" && value === "completed_pending_admin_review") {
      updateData.installer_pay_status = "pending_review";
    }

    if (field === "status" && value === "completed") {
      updateData.completed_at = new Date().toISOString();

      if (
        currentBooking.installer_name &&
        Number(currentBooking.installer_pay || 0) > 0 &&
        (
          normalizeText(currentBooking.installer_pay_status || "unpaid") === "unpaid" ||
          normalizeText(currentBooking.installer_pay_status) === "pending_review"
        )
      ) {
        updateData.installer_pay_status = "ready";
      }
    }

    if (field === "status" && value === "incomplete") {
      updateData.incomplete_at = new Date().toISOString();

      if (normalizeText(currentBooking.installer_pay_status) === "ready") {
        updateData.installer_pay_status = "hold";
      }
    }

    if (
      field === "status" &&
      value !== "completed" &&
      value !== "completed_pending_admin_review" &&
      value !== "incomplete"
    ) {
      if (
        normalizeText(currentBooking.installer_pay_status) === "ready" ||
        normalizeText(currentBooking.installer_pay_status) === "pending_review"
      ) {
        updateData.installer_pay_status = "unpaid";
      }
    }

    if (field === "status" && value === "accepted") {
      updateData.accepted_at = new Date().toISOString();
    }

    if (
      field === "status" &&
      (value === "available" || value === "pending" || value === "new")
    ) {
      updateData.installer_name = null;
      updateData.reassigned_installer_name = null;
      updateData.accepted_at = null;
    }

    if (field === "installer_name" && value) {
      if (
        ["available", "confirmed", "assigned", "new", "pending"].includes(
          normalizeText(currentBooking.status)
        )
      ) {
        updateData.status = "accepted";
        updateData.accepted_at = new Date().toISOString();
      }
    }

    if (field === "installer_name" && !value) {
      if (
        normalizeText(currentBooking.status) === "accepted" ||
        normalizeText(currentBooking.status) === "assigned" ||
        normalizeText(currentBooking.status) === "confirmed"
      ) {
        updateData.status = "available";
      }
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating booking:", error);
      alert("Could not update booking.");
      setSavingId("");
      return;
    }

    await loadBookings();
    setSavingId("");
  }

  function toggleExpanded(id: string) {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings
      .filter((booking) => matchesStatusFilter(booking, statusFilter))
      .filter((booking) => {
        if (!term) return true;

        return (
          safeText(booking.job_id).toLowerCase().includes(term) ||
          safeText(booking.id).toLowerCase().includes(term) ||
          safeText(booking.customer_name).toLowerCase().includes(term) ||
          safeText(booking.customer_email).toLowerCase().includes(term) ||
          safeText(booking.company_name).toLowerCase().includes(term) ||
          safeText(booking.phone_number).toLowerCase().includes(term) ||
          safeText(booking.pickup_address).toLowerCase().includes(term) ||
          safeText(booking.dropoff_address).toLowerCase().includes(term) ||
          safeText(booking.timeline).toLowerCase().includes(term) ||
          safeText(booking.scheduled_date).toLowerCase().includes(term) ||
          safeText(booking.scheduled_time).toLowerCase().includes(term) ||
          safeText(booking.pickup_time_slot).toLowerCase().includes(term) ||
          safeText(booking.service_type).toLowerCase().includes(term) ||
          safeText(booking.service_type_label).toLowerCase().includes(term) ||
          safeText(booking.payment_method).toLowerCase().includes(term) ||
          safeText(booking.status).toLowerCase().includes(term) ||
          safeText(booking.payment_status).toLowerCase().includes(term) ||
          safeText(booking.installer_name).toLowerCase().includes(term) ||
          safeText(booking.reassigned_installer_name).toLowerCase().includes(term) ||
          safeText(booking.installer_pay_status).toLowerCase().includes(term) ||
          safeText(booking.notes).toLowerCase().includes(term) ||
          safeText(booking.incomplete_reason).toLowerCase().includes(term) ||
          safeText(booking.incomplete_note).toLowerCase().includes(term) ||
          safeText(booking.incomplete_notes).toLowerCase().includes(term) ||
          safeText(booking.admin_fee_note).toLowerCase().includes(term) ||
          safeText(booking.ai_grouping_label).toLowerCase().includes(term) ||
          safeText(booking.ai_recommended_installer_type).toLowerCase().includes(term) ||
          safeText(booking.ai_urgency_label).toLowerCase().includes(term)
        );
      });
  }, [bookings, search, statusFilter]);

  const summary = useMemo(() => {
    const countBy = (filter: StatusFilter) =>
      bookings.filter((item) => matchesStatusFilter(item, filter)).length;

    const readyPayout = bookings.filter(
      (item) => normalizeText(item.installer_pay_status) === "ready"
    ).length;

    const acceptedAssigned = bookings.filter(
      (item) =>
        normalizeBookingStatus(item.status) === "accepted" ||
        safeText(item.installer_name).length > 0 ||
        safeText(item.reassigned_installer_name).length > 0
    ).length;

    const totalProfit = bookings.reduce(
      (sum, item) => sum + Number(item.company_profit || 0),
      0
    );

    return {
      new: countBy("new"),
      available: countBy("available"),
      pending: countBy("pending"),
      accepted: countBy("accepted"),
      inProgress: countBy("in_progress"),
      incomplete: countBy("incomplete"),
      completed: countBy("completed"),
      cancelled: countBy("cancelled"),
      readyPayout,
      acceptedAssigned,
      total: bookings.length,
      totalProfit,
    };
  }, [bookings]);

  const availableJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return s === "available" || s === "pending" || s === "new";
      }),
    [filteredBookings]
  );

  const acceptedJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return s === "accepted";
      }),
    [filteredBookings]
  );

  const inProgressJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return s === "in_progress";
      }),
    [filteredBookings]
  );

  const incompleteJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return s === "incomplete";
      }),
    [filteredBookings]
  );

  const completedJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return s === "completed";
      }),
    [filteredBookings]
  );

  const otherJobs = useMemo(
    () =>
      filteredBookings.filter((item) => {
        const s = normalizeBookingStatus(item.status);
        return ![
          "available",
          "pending",
          "new",
          "accepted",
          "in_progress",
          "incomplete",
          "completed",
        ].includes(s);
      }),
    [filteredBookings]
  );

  function renderSection(
    title: string,
    subtitle: string,
    items: Booking[]
  ) {
    if (items.length === 0) return null;

    return (
      <section className="space-y-4">
        <SectionHeader title={title} subtitle={subtitle} />
        {items.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            installers={installers}
            expanded={Boolean(expandedRows[booking.id])}
            onToggle={() => toggleExpanded(booking.id)}
            onUpdate={updateBookingField}
            savingId={savingId}
            dispatchRecommendation={dispatchMap[booking.id]}
            dispatchLoadingId={dispatchLoadingId}
            onRunDispatch={runDispatchForBooking}
            onAssignRecommendedInstaller={assignRecommendedInstaller}
          />
        ))}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-yellow-500">Admin Bookings</h1>

        <p className="mb-6 text-gray-300">
          Manage all bookings, push jobs live, dispatch installers, review incomplete
          jobs, track AI priority, monitor profit, and control payout readiness.
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="All Jobs" value={String(summary.total)} />
          <StatCard label="Available / Live" value={String(summary.available + summary.pending + summary.new)} />
          <StatCard label="Accepted" value={String(summary.accepted)} />
          <StatCard label="In Progress" value={String(summary.inProgress)} />
          <StatCard label="Incomplete" value={String(summary.incomplete)} />
          <StatCard label="Completed" value={String(summary.completed)} />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Ready Payout" value={String(summary.readyPayout)} />
          <StatCard label="Accepted / Assigned" value={String(summary.acceptedAssigned)} />
          <StatCard label="Cancelled" value={String(summary.cancelled)} />
          <StatCard label="Total Profit" value={money(summary.totalProfit)} />
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job ID, customer, company, installer, status, address..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white outline-none"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["available", "Available"],
              ["pending", "Pending"],
              ["accepted", "Accepted"],
              ["in_progress", "In Progress"],
              ["incomplete", "Incomplete"],
              ["completed", "Completed"],
              ["cancelled", "Cancelled"],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                statusFilter === value
                  ? "bg-yellow-500 text-black"
                  : "border border-zinc-700 bg-zinc-900 text-white hover:border-yellow-500 hover:text-yellow-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-300">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No bookings found.
          </div>
        ) : (
          <div className="space-y-8">
            {renderSection(
              "Available / Live Jobs",
              "These jobs are visible for installer acceptance or ready to go live.",
              availableJobs
            )}

            {renderSection(
              "Accepted Jobs",
              "These jobs have been accepted and are now assigned.",
              acceptedJobs
            )}

            {renderSection(
              "In Progress Jobs",
              "These jobs are underway and should be monitored closely.",
              inProgressJobs
            )}

            {renderSection(
              "Incomplete Jobs",
              "These jobs need follow-up, fees review, redo planning, or payout hold.",
              incompleteJobs
            )}

            {renderSection(
              "Completed Jobs",
              "Finished jobs with payout readiness and proof review.",
              completedJobs
            )}

            {renderSection(
              "Other Jobs",
              "Cancelled or uncategorized statuses.",
              otherJobs
            )}
          </div>
        )}
      </div>
    </main>
  );
}