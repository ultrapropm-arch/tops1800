"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type PayoutStatus =
  | "unpaid"
  | "pending"
  | "pending_review"
  | "ready"
  | "paid"
  | "hold";

type FilterTab =
  | "all"
  | "ready"
  | "pending"
  | "pending_review"
  | "hold"
  | "paid"
  | "unpaid"
  | "customer_paid"
  | "high_risk"
  | "high_margin";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;

  service_type?: string | null;
  service_type_label?: string | null;

  scheduled_date?: string | null;
  scheduled_time?: string | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;

  installer_pay?: number | null;
  installer_hst?: number | null;
  installer_hst_pay?: number | null;
  installer_total_pay?: number | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;
  installer_subtotal_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;

  installer_pay_status?: string | null;

  payout_notes?: string | null;
  payout_batch_id?: string | null;
  payout_sent_at?: string | null;

  notes?: string | null;

  final_total?: number | null;
  subtotal?: number | null;
  hst?: number | null;
  hst_amount?: number | null;
  company_profit?: number | null;

  payment_status?: string | null;
  payment_method?: string | null;
  status?: string | null;

  job_group_id?: string | number | null;
  job_number?: number | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;

  mileage_fee?: number | null;
  customer_mileage_charge?: number | null;
  chargeable_km?: number | null;
  one_way_km?: number | null;
  round_trip_km?: number | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  redo_requested?: boolean | null;

  accepted_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;

  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
};

type InstallerProfile = {
  id: string;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;

  email?: string | null;
  payout_method?: string | null;
  payout_email?: string | null;
  etransfer_email?: string | null;

  bank_name?: string | null;
  account_holder_name?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  account_number?: string | null;
  bank_account_last4?: string | null;

  notes?: string | null;
  status?: string | null;
};

type AiPayoutInsight = {
  riskLabel: string;
  riskClass: string;
  recommendedAction: string;
  priorityScore: number;
  profitLabel: string;
  profitClass: string;
  payoutHealth: string;
  payoutHealthClass: string;
  routeStrategy: string;
  routeStrategyClass: string;
  speedLabel: string;
  speedClass: string;
};

type PayoutItem = {
  id: string;
  job_id: string;
  installer: string;
  job: string;

  amount: number;
  installer_hst: number;
  installer_total_pay: number;

  status: PayoutStatus;

  notes: string;
  payout_notes: string;
  payout_batch_id: string;
  payout_sent_at: string;

  final_total: number;
  company_profit: number;

  payment_status: string;
  payout_method: string;
  payout_destination: string;

  booking_status: string;

  return_fee: number;
  mileage_fee: number;

  service_type: string;
  scheduled_date: string;
  group_label: string;

  ai_dispatch_score: number;
  ai_priority_score: number;
  ai_grouping_label: string;
  ai_distance_tier: string;
  ai_recommended_installer_type: string;

  incomplete_reason: string;
  incomplete_note: string;
  redo_requested: boolean;

  accepted_at: string;
  completed_at: string;

  payout_lines: { label: string; amount: number }[];

  ai: AiPayoutInsight;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeLower(value: unknown): string {
  return toText(value).toLowerCase();
}

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getServiceTypeLabel(
  serviceType?: string | null,
  serviceTypeLabel?: string | null
) {
  if (serviceTypeLabel) return serviceTypeLabel;
  if (!serviceType) return "-";
  if (serviceType === "full_height_backsplash") return "Full Height Backsplash";
  if (serviceType === "installation_3cm") return "3cm Installation";
  if (serviceType === "installation_2cm_standard") return "2cm Standard Installation";
  if (serviceType === "installation_2cm") return "2cm Installation";
  if (serviceType === "backsplash_tiling") return "Backsplash Tiling";
  if (serviceType === "justServices") return "Just Services";
  return serviceType;
}

function normalizePayoutStatus(value?: string | null): PayoutStatus {
  const status = safeLower(value);

  if (status === "paid") return "paid";
  if (status === "ready") return "ready";
  if (status === "hold") return "hold";
  if (status === "pending_review") return "pending_review";
  if (status === "pending") return "pending";
  return "unpaid";
}

function getInstallerDisplayName(installer?: InstallerProfile | null) {
  if (!installer) return "";
  return (
    toText(installer.installer_name) ||
    toText(installer.full_name) ||
    toText(installer.name) ||
    toText(installer.business_name) ||
    toText(installer.company_name)
  );
}

function getActiveInstallerName(booking: Booking) {
  return (
    toText(booking.reassigned_installer_name) ||
    toText(booking.installer_name) ||
    "-"
  );
}

function getPayoutLines(booking: Booking): { label: string; amount: number }[] {
  if (
    Array.isArray(booking.installer_payout_lines) &&
    booking.installer_payout_lines.length > 0
  ) {
    return booking.installer_payout_lines.map((line) => ({
      label: toText(line.label) || "Payout Line",
      amount: toNumber(line.amount),
    }));
  }

  const lines: { label: string; amount: number }[] = [];

  if (toNumber(booking.installer_base_pay) > 0) {
    lines.push({
      label: "Base Install Pay",
      amount: toNumber(booking.installer_base_pay),
    });
  }

  if (toNumber(booking.installer_addon_pay) > 0) {
    lines.push({
      label: "Add-On Pay",
      amount: toNumber(booking.installer_addon_pay),
    });
  }

  if (toNumber(booking.installer_cut_polish_pay) > 0) {
    lines.push({
      label: "Cut / Polish Pay",
      amount: toNumber(booking.installer_cut_polish_pay),
    });
  }

  if (toNumber(booking.installer_sink_pay) > 0) {
    lines.push({
      label: "Sink / Reattach Pay",
      amount: toNumber(booking.installer_sink_pay),
    });
  }

  if (toNumber(booking.installer_other_pay) > 0) {
    lines.push({
      label: "Other Service Pay",
      amount: toNumber(booking.installer_other_pay),
    });
  }

  if (toNumber(booking.installer_mileage_pay) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: toNumber(booking.installer_mileage_pay),
    });
  }

  return lines;
}

function deriveInstallerSubtotal(booking: Booking, payoutLines: { label: string; amount: number }[]) {
  if (toNumber(booking.installer_subtotal_pay) > 0) {
    return toNumber(booking.installer_subtotal_pay);
  }

  const lineSubtotal = payoutLines.reduce((sum, line) => sum + toNumber(line.amount), 0);
  if (lineSubtotal > 0) return lineSubtotal;

  if (toNumber(booking.installer_pay) > 0) return toNumber(booking.installer_pay);

  return 0;
}

function deriveInstallerHst(booking: Booking) {
  return toNumber(booking.installer_hst_pay) || toNumber(booking.installer_hst);
}

function deriveInstallerTotalPay(
  booking: Booking,
  subtotal: number,
  installerHst: number
) {
  if (toNumber(booking.installer_total_pay) > 0) {
    return toNumber(booking.installer_total_pay);
  }

  if (toNumber(booking.installer_pay) > 0 && installerHst === 0) {
    return toNumber(booking.installer_pay);
  }

  if (toNumber(booking.installer_pay) > 0 && installerHst > 0) {
    const pay = toNumber(booking.installer_pay);
    if (pay >= subtotal + installerHst) return pay;
  }

  return subtotal + installerHst;
}

function deriveFinalTotal(booking: Booking) {
  if (toNumber(booking.final_total) > 0) return toNumber(booking.final_total);

  const subtotal = toNumber(booking.subtotal);
  const hst = toNumber(booking.hst) || toNumber(booking.hst_amount);

  if (subtotal > 0 || hst > 0) return subtotal + hst;

  return 0;
}

function deriveCompanyProfit(booking: Booking, installerTotalPay: number) {
  if (booking.company_profit !== null && booking.company_profit !== undefined) {
    return toNumber(booking.company_profit);
  }

  const finalTotal = deriveFinalTotal(booking);
  return finalTotal - installerTotalPay;
}

function getRiskClass(label: string) {
  if (label === "High Risk") return "text-red-400 border-red-500/30 bg-red-500/10";
  if (label === "Watch Closely") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  return "text-green-400 border-green-500/30 bg-green-500/10";
}

function getProfitClass(label: string) {
  if (label === "High Margin") return "text-green-400 border-green-500/30 bg-green-500/10";
  if (label === "Good Margin") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (label === "Tight Margin") return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  return "text-red-400 border-red-500/30 bg-red-500/10";
}

function getPayoutHealthClass(label: string) {
  if (label === "Ready to Send") return "text-green-400 border-green-500/30 bg-green-500/10";
  if (label === "Needs Review") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (label === "On Hold") return "text-red-400 border-red-500/30 bg-red-500/10";
  if (label === "Paid") return "text-blue-300 border-blue-500/30 bg-blue-500/10";
  return "text-zinc-300 border-zinc-700 bg-zinc-800/40";
}

function getPaymentStatusClass(status: string) {
  const normalized = safeLower(status);
  if (normalized === "paid") return "text-green-400 border-green-500/30 bg-green-500/10";
  if (normalized === "pending") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (normalized === "failed") return "text-red-400 border-red-500/30 bg-red-500/10";
  return "text-zinc-300 border-zinc-700 bg-zinc-800/40";
}

function getRouteStrategyClass(label: string) {
  if (label === "Grouped Route") return "text-blue-300 border-blue-500/30 bg-blue-500/10";
  if (label === "Long Distance") return "text-orange-300 border-orange-500/30 bg-orange-500/10";
  return "text-zinc-300 border-zinc-700 bg-zinc-800/40";
}

function getSpeedClass(label: string) {
  if (label === "Fast Pay Recommended") return "text-green-300 border-green-500/30 bg-green-500/10";
  if (label === "Review Before Pay") return "text-yellow-300 border-yellow-500/30 bg-yellow-500/10";
  return "text-zinc-300 border-zinc-700 bg-zinc-800/40";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateBatchId() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(
    date.getMinutes()
  ).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
  return `PAYOUT-${stamp}`;
}

function buildAiPayoutInsight(params: {
  installerTotalPay: number;
  finalTotal: number;
  companyProfit: number;
  status: PayoutStatus;
  bookingStatus: string;
  returnFee: number;
  mileageFee: number;
  incompleteReason: string;
  incompleteNote: string;
  redoRequested: boolean;
  payoutMethod: string;
  aiDispatchScore: number;
  aiPriorityScore: number;
  aiGroupingLabel: string;
  aiDistanceTier: string;
}): AiPayoutInsight {
  const {
    installerTotalPay,
    finalTotal,
    companyProfit,
    status,
    bookingStatus,
    returnFee,
    mileageFee,
    incompleteReason,
    incompleteNote,
    redoRequested,
    payoutMethod,
    aiDispatchScore,
    aiPriorityScore,
    aiGroupingLabel,
    aiDistanceTier,
  } = params;

  const normalizedBookingStatus = safeLower(bookingStatus);

  const hasIncompleteSignals =
    normalizedBookingStatus === "incomplete" ||
    incompleteReason.trim().length > 0 ||
    incompleteNote.trim().length > 0 ||
    redoRequested;

  let riskLabel = "Low Risk";
  if (status === "hold" || hasIncompleteSignals) {
    riskLabel = "High Risk";
  } else if (
    returnFee > 0 ||
    mileageFee > 180 ||
    finalTotal > 5000 ||
    aiPriorityScore >= 80
  ) {
    riskLabel = "Watch Closely";
  }

  let profitLabel = "Low Margin";
  if (companyProfit >= 600) {
    profitLabel = "High Margin";
  } else if (companyProfit >= 250) {
    profitLabel = "Good Margin";
  } else if (companyProfit >= 100) {
    profitLabel = "Tight Margin";
  }

  let payoutHealth = "Pending";
  if (status === "paid") payoutHealth = "Paid";
  else if (status === "hold") payoutHealth = "On Hold";
  else if (status === "ready") payoutHealth = "Ready to Send";
  else if (status === "pending_review") payoutHealth = "Needs Review";

  let recommendedAction = "Review payout details.";
  if (status === "paid") {
    recommendedAction = "Already paid. No action needed.";
  } else if (status === "hold") {
    recommendedAction = "Resolve issue before payout release.";
  } else if (hasIncompleteSignals) {
    recommendedAction = "Check incomplete or redo notes before paying.";
  } else if (!safeLower(payoutMethod) || safeLower(payoutMethod) === "not set") {
    recommendedAction = "Set installer payout method first.";
  } else if (
    normalizedBookingStatus !== "completed" &&
    normalizedBookingStatus !== "completed_pending_admin_review"
  ) {
    recommendedAction = "Job is not completed yet. Keep payout pending.";
  } else if (status === "pending_review") {
    recommendedAction = "Admin review needed before marking ready.";
  } else if (status === "ready") {
    recommendedAction = "Good to send payout now.";
  } else if (companyProfit <= 0 && installerTotalPay > 0) {
    recommendedAction = "Double-check pay. Company profit is zero or negative.";
  } else if (aiDispatchScore >= 80 && companyProfit >= 250) {
    recommendedAction = "High-quality job. Prioritize fast payout.";
  } else {
    recommendedAction = "Payout can move forward when confirmed.";
  }

  const routeStrategy =
    safeLower(aiGroupingLabel).includes("group") || safeLower(aiGroupingLabel).includes("paired")
      ? "Grouped Route"
      : safeLower(aiDistanceTier).includes("long") || mileageFee > 180
        ? "Long Distance"
        : "Standard Route";

  const speedLabel =
    status === "ready" && companyProfit >= 250 && !hasIncompleteSignals
      ? "Fast Pay Recommended"
      : status === "pending_review" || riskLabel === "Watch Closely"
        ? "Review Before Pay"
        : "Standard Pay";

  return {
    riskLabel,
    riskClass: getRiskClass(riskLabel),
    recommendedAction,
    priorityScore: Math.max(aiPriorityScore, aiDispatchScore),
    profitLabel,
    profitClass: getProfitClass(profitLabel),
    payoutHealth,
    payoutHealthClass: getPayoutHealthClass(payoutHealth),
    routeStrategy,
    routeStrategyClass: getRouteStrategyClass(routeStrategy),
    speedLabel,
    speedClass: getSpeedClass(speedLabel),
  };
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-yellow-500">{value}</p>
    </div>
  );
}

function tabButtonClass(isActive: boolean) {
  return isActive
    ? "bg-yellow-500 text-black border-yellow-400"
    : "bg-black text-white border-zinc-700 hover:bg-zinc-900";
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    void loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);
    const supabase = createClient();

    const bookingsResponse = await supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (bookingsResponse.error) {
      console.error("Error loading payouts:", bookingsResponse.error);
      alert(bookingsResponse.error.message || "Could not load payouts.");
      setLoading(false);
      return;
    }

    const installersResponse = await supabase
      .from("installer_profiles")
      .select("*");

    if (installersResponse.error) {
      console.error("Error loading installer payout info:", installersResponse.error);
      alert(installersResponse.error.message || "Could not load installer payout details.");
      setLoading(false);
      return;
    }

    const installers = (installersResponse.data as InstallerProfile[]) || [];
    const bookings = ((bookingsResponse.data as Booking[]) || []).filter((item) => {
      const activeInstaller = getActiveInstallerName(item);
      return activeInstaller !== "-" && activeInstaller !== "";
    });

    const payoutItems: PayoutItem[] = bookings.map((booking) => {
      const activeInstallerName = getActiveInstallerName(booking);

      const matchedInstaller =
        installers.find(
          (installer) =>
            getInstallerDisplayName(installer).toLowerCase() ===
            activeInstallerName.toLowerCase()
        ) || null;

      const payoutMethod = toText(matchedInstaller?.payout_method) || "Not set";

      let payoutDestination = "-";

      if (safeLower(payoutMethod) === "etransfer") {
        payoutDestination =
          toText(matchedInstaller?.etransfer_email) ||
          toText(matchedInstaller?.payout_email) ||
          toText(matchedInstaller?.email) ||
          "-";
      } else if (safeLower(payoutMethod) === "bank") {
        payoutDestination = [
          toText(matchedInstaller?.bank_name),
          toText(matchedInstaller?.account_holder_name),
          toText(matchedInstaller?.transit_number)
            ? `Transit: ${toText(matchedInstaller?.transit_number)}`
            : "",
          toText(matchedInstaller?.institution_number)
            ? `Institution: ${toText(matchedInstaller?.institution_number)}`
            : "",
          toText(matchedInstaller?.bank_account_last4)
            ? `Acct Last4: ${toText(matchedInstaller?.bank_account_last4)}`
            : toText(matchedInstaller?.account_number)
              ? `Account: ${toText(matchedInstaller?.account_number)}`
              : "",
        ]
          .filter(Boolean)
          .join(" • ");
      } else if (
        safeLower(payoutMethod) === "accounting_software" ||
        safeLower(payoutMethod) === "accounting software"
      ) {
        payoutDestination = "Pay through accounting software";
      } else {
        payoutDestination = toText(matchedInstaller?.notes) || "-";
      }

      const payoutLines = getPayoutLines(booking);
      const amount = deriveInstallerSubtotal(booking, payoutLines);
      const installerHst = deriveInstallerHst(booking);
      const installerTotalPay = deriveInstallerTotalPay(booking, amount, installerHst);
      const finalTotal = deriveFinalTotal(booking);
      const companyProfit = deriveCompanyProfit(booking, installerTotalPay);

      const jobLabelParts = [
        toText(booking.company_name) || toText(booking.customer_name) || "Job",
        getServiceTypeLabel(booking.service_type, booking.service_type_label),
        toText(booking.scheduled_date),
        booking.job_group_id
          ? `Group ${String(booking.job_group_id)}${
              booking.job_number ? ` • Job ${booking.job_number}` : ""
            }`
          : "",
      ].filter(Boolean);

      const status = normalizePayoutStatus(booking.installer_pay_status);

      const item: PayoutItem = {
        id: booking.id,
        job_id: toText(booking.job_id) || booking.id,
        installer: activeInstallerName || "-",
        job: jobLabelParts.join(" • "),
        amount,
        installer_hst: installerHst,
        installer_total_pay: installerTotalPay,
        status,
        notes: toText(booking.notes),
        payout_notes: toText(booking.payout_notes),
        payout_batch_id: toText(booking.payout_batch_id),
        payout_sent_at: toText(booking.payout_sent_at),
        final_total: finalTotal,
        company_profit: companyProfit,
        payment_status: toText(booking.payment_status) || "unpaid",
        payout_method: payoutMethod,
        payout_destination: payoutDestination || "-",
        booking_status: toText(booking.status) || "-",
        return_fee: toNumber(booking.return_fee_charged) || toNumber(booking.return_fee),
        mileage_fee: toNumber(booking.mileage_fee) || toNumber(booking.customer_mileage_charge),
        service_type: getServiceTypeLabel(booking.service_type, booking.service_type_label),
        scheduled_date: toText(booking.scheduled_date) || "-",
        group_label: booking.job_group_id ? `Group ${String(booking.job_group_id)}` : "Single Job",
        ai_dispatch_score: toNumber(booking.ai_dispatch_score),
        ai_priority_score: toNumber(booking.ai_priority_score),
        ai_grouping_label: toText(booking.ai_grouping_label) || "Solo Route",
        ai_distance_tier: toText(booking.ai_distance_tier) || "Standard Zone",
        ai_recommended_installer_type:
          toText(booking.ai_recommended_installer_type) || "Standard Installer",
        incomplete_reason: toText(booking.incomplete_reason),
        incomplete_note: toText(booking.incomplete_notes) || toText(booking.incomplete_note),
        redo_requested: Boolean(booking.redo_requested),
        accepted_at: toText(booking.accepted_at),
        completed_at: toText(booking.completed_at),
        payout_lines: payoutLines,
        ai: {
          riskLabel: "",
          riskClass: "",
          recommendedAction: "",
          priorityScore: 0,
          profitLabel: "",
          profitClass: "",
          payoutHealth: "",
          payoutHealthClass: "",
          routeStrategy: "",
          routeStrategyClass: "",
          speedLabel: "",
          speedClass: "",
        },
      };

      item.ai = buildAiPayoutInsight({
        installerTotalPay: item.installer_total_pay,
        finalTotal: item.final_total,
        companyProfit: item.company_profit,
        status: item.status,
        bookingStatus: item.booking_status,
        returnFee: item.return_fee,
        mileageFee: item.mileage_fee,
        incompleteReason: item.incomplete_reason,
        incompleteNote: item.incomplete_note,
        redoRequested: item.redo_requested,
        payoutMethod: item.payout_method,
        aiDispatchScore: item.ai_dispatch_score,
        aiPriorityScore: item.ai_priority_score,
        aiGroupingLabel: item.ai_grouping_label,
        aiDistanceTier: item.ai_distance_tier,
      });

      return item;
    });

    setPayouts(payoutItems);
    setSelectedIds([]);
    setLoading(false);
  }

  function recomputeAi(item: PayoutItem): PayoutItem {
    return {
      ...item,
      ai: buildAiPayoutInsight({
        installerTotalPay: item.installer_total_pay,
        finalTotal: item.final_total,
        companyProfit: item.company_profit,
        status: item.status,
        bookingStatus: item.booking_status,
        returnFee: item.return_fee,
        mileageFee: item.mileage_fee,
        incompleteReason: item.incomplete_reason,
        incompleteNote: item.incomplete_note,
        redoRequested: item.redo_requested,
        payoutMethod: item.payout_method,
        aiDispatchScore: item.ai_dispatch_score,
        aiPriorityScore: item.ai_priority_score,
        aiGroupingLabel: item.ai_grouping_label,
        aiDistanceTier: item.ai_distance_tier,
      }),
    };
  }

  async function updateStatus(id: string, status: PayoutStatus) {
    setSavingId(id);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      installer_pay_status: status,
    };

    if (status === "paid") {
      updates.payout_sent_at = new Date().toISOString();
    }

    const { error } = await supabase.from("bookings").update(updates).eq("id", id);

    if (error) {
      console.error("Error updating payout status:", error);
      alert(error.message || "Could not update payout status.");
      setSavingId("");
      return;
    }

    setPayouts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return recomputeAi({
          ...item,
          status,
          payout_sent_at: status === "paid" ? new Date().toISOString() : item.payout_sent_at,
        });
      })
    );

    setSavingId("");
  }

  async function bulkUpdateStatus(status: PayoutStatus) {
    if (selectedIds.length === 0) {
      alert("Select at least one payout first.");
      return;
    }

    setSavingId("bulk");
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      installer_pay_status: status,
    };

    if (status === "paid") {
      updates.payout_sent_at = new Date().toISOString();
    }

    const { error } = await supabase.from("bookings").update(updates).in("id", selectedIds);

    if (error) {
      console.error("Bulk payout update error:", error);
      alert(error.message || "Could not update selected payouts.");
      setSavingId("");
      return;
    }

    setPayouts((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? recomputeAi({
              ...item,
              status,
              payout_sent_at:
                status === "paid" ? new Date().toISOString() : item.payout_sent_at,
            })
          : item
      )
    );

    setSavingId("");
  }

  async function assignBatchToSelected() {
    if (selectedIds.length === 0) {
      alert("Select at least one payout first.");
      return;
    }

    const batchId = generateBatchId();
    setSavingId("bulk");
    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({ payout_batch_id: batchId })
      .in("id", selectedIds);

    if (error) {
      console.error("Batch assignment error:", error);
      alert(error.message || "Could not assign payout batch.");
      setSavingId("");
      return;
    }

    setPayouts((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id) ? { ...item, payout_batch_id: batchId } : item
      )
    );

    setSavingId("");
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function toggleSelectAllVisible(visibleItems: PayoutItem[]) {
    const visibleIds = visibleItems.map((item) => item.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function updateNotes(id: string, notes: string) {
    setPayouts((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  }

  async function saveNotes(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ notes: item.notes }).eq("id", id);

    if (error) {
      console.error("Error saving notes:", error);
      alert(error.message || "Could not save notes.");
      setSavingId("");
      return;
    }

    setSavingId("");
  }

  function updatePayoutNotes(id: string, payoutNotes: string) {
    setPayouts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, payout_notes: payoutNotes } : item))
    );
  }

  async function savePayoutNotes(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ payout_notes: item.payout_notes })
      .eq("id", id);

    if (error) {
      console.error("Error saving payout notes:", error);
      alert(error.message || "Could not save payout notes.");
      setSavingId("");
      return;
    }

    setSavingId("");
  }

  function updateAmount(id: string, amount: number) {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;

    setPayouts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return recomputeAi({
          ...item,
          amount: safeAmount,
          installer_total_pay: safeAmount + item.installer_hst,
          company_profit: item.final_total - (safeAmount + item.installer_hst),
        });
      })
    );
  }

  function updateInstallerHst(id: string, hst: number) {
    const safeHst = Number.isNaN(hst) ? 0 : hst;

    setPayouts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return recomputeAi({
          ...item,
          installer_hst: safeHst,
          installer_total_pay: item.amount + safeHst,
          company_profit: item.final_total - (item.amount + safeHst),
        });
      })
    );
  }

  async function savePayoutAmounts(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);
    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({
        installer_pay: item.amount,
        installer_hst: item.installer_hst,
        installer_hst_pay: item.installer_hst,
        installer_subtotal_pay: item.amount,
        installer_total_pay: item.installer_total_pay,
        company_profit: item.company_profit,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving payout amount:", error);
      alert(error.message || "Could not save payout amount.");
      setSavingId("");
      return;
    }

    setSavingId("");
  }

  function updateBatchId(id: string, batchId: string) {
    setPayouts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, payout_batch_id: batchId } : item))
    );
  }

  async function saveBatchId(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);
    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({ payout_batch_id: item.payout_batch_id })
      .eq("id", id);

    if (error) {
      console.error("Error saving payout batch id:", error);
      alert(error.message || "Could not save payout batch id.");
      setSavingId("");
      return;
    }

    setSavingId("");
  }

  const tabCounts = useMemo(() => {
    return {
      all: payouts.length,
      ready: payouts.filter((item) => item.status === "ready").length,
      pending: payouts.filter((item) => item.status === "pending").length,
      pending_review: payouts.filter((item) => item.status === "pending_review").length,
      hold: payouts.filter((item) => item.status === "hold").length,
      paid: payouts.filter((item) => item.status === "paid").length,
      unpaid: payouts.filter((item) => item.status === "unpaid").length,
      customer_paid: payouts.filter((item) => safeLower(item.payment_status) === "paid").length,
      high_risk: payouts.filter((item) => item.ai.riskLabel === "High Risk").length,
      high_margin: payouts.filter((item) => item.ai.profitLabel === "High Margin").length,
    };
  }, [payouts]);

  const filteredPayouts = useMemo(() => {
    let items = payouts;

    if (activeTab === "ready") items = items.filter((item) => item.status === "ready");
    else if (activeTab === "pending") items = items.filter((item) => item.status === "pending");
    else if (activeTab === "pending_review")
      items = items.filter((item) => item.status === "pending_review");
    else if (activeTab === "hold") items = items.filter((item) => item.status === "hold");
    else if (activeTab === "paid") items = items.filter((item) => item.status === "paid");
    else if (activeTab === "unpaid") items = items.filter((item) => item.status === "unpaid");
    else if (activeTab === "customer_paid")
      items = items.filter((item) => safeLower(item.payment_status) === "paid");
    else if (activeTab === "high_risk")
      items = items.filter((item) => item.ai.riskLabel === "High Risk");
    else if (activeTab === "high_margin")
      items = items.filter((item) => item.ai.profitLabel === "High Margin");

    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      return (
        item.job_id.toLowerCase().includes(term) ||
        item.installer.toLowerCase().includes(term) ||
        item.job.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.booking_status.toLowerCase().includes(term) ||
        item.payment_status.toLowerCase().includes(term) ||
        item.payout_method.toLowerCase().includes(term) ||
        item.payout_destination.toLowerCase().includes(term) ||
        item.notes.toLowerCase().includes(term) ||
        item.payout_notes.toLowerCase().includes(term) ||
        item.payout_batch_id.toLowerCase().includes(term) ||
        item.ai.riskLabel.toLowerCase().includes(term) ||
        item.ai.recommendedAction.toLowerCase().includes(term) ||
        item.ai.profitLabel.toLowerCase().includes(term) ||
        item.ai.routeStrategy.toLowerCase().includes(term) ||
        item.ai.speedLabel.toLowerCase().includes(term)
      );
    });
  }, [payouts, search, activeTab]);

  const summary = useMemo(() => {
    const pendingReview = payouts.filter((item) => item.status === "pending_review").length;
    const holdCount = payouts.filter((item) => item.status === "hold").length;
    const readyTotal = payouts
      .filter((item) => item.status === "ready")
      .reduce((sum, item) => sum + item.installer_total_pay, 0);
    const paidTotal = payouts
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.installer_total_pay, 0);
    const unpaidTotal = payouts
      .filter((item) => item.status === "unpaid")
      .reduce((sum, item) => sum + item.installer_total_pay, 0);
    const highRisk = payouts.filter((item) => item.ai.riskLabel === "High Risk").length;
    const highMargin = payouts.filter((item) => item.ai.profitLabel === "High Margin").length;
    const readyNow = payouts.filter((item) => item.ai.payoutHealth === "Ready to Send").length;
    const paidCustomerJobs = payouts.filter(
      (item) => safeLower(item.payment_status) === "paid"
    ).length;

    return {
      pendingReview,
      holdCount,
      readyTotal,
      paidTotal,
      unpaidTotal,
      highRisk,
      highMargin,
      readyNow,
      paidCustomerJobs,
    };
  }, [payouts]);

  function exportPayoutCsv() {
    const rows: string[][] = [
      [
        "Booking ID",
        "Job ID",
        "Group",
        "Installer",
        "Job",
        "Service Type",
        "Scheduled Date",
        "Booking Status",
        "Customer Payment Status",
        "Payout Status",
        "Installer Base Pay",
        "Installer HST",
        "Installer Total Pay",
        "Final Total",
        "Company Profit",
        "Return Fee",
        "Mileage Fee",
        "Payout Method",
        "Payout Destination",
        "Payout Batch ID",
        "Payout Sent At",
        "AI Risk",
        "AI Profit Label",
        "AI Payout Health",
        "AI Route Strategy",
        "AI Speed Label",
        "AI Priority Score",
        "AI Recommended Action",
        "Incomplete Reason",
        "Incomplete Note",
        "Redo Requested",
        "Accepted At",
        "Completed At",
        "General Notes",
        "Payout Notes",
      ],
      ...filteredPayouts.map((item) => [
        item.id,
        item.job_id,
        item.group_label,
        item.installer,
        item.job,
        item.service_type,
        item.scheduled_date,
        item.booking_status,
        item.payment_status,
        item.status,
        item.amount.toFixed(2),
        item.installer_hst.toFixed(2),
        item.installer_total_pay.toFixed(2),
        item.final_total.toFixed(2),
        item.company_profit.toFixed(2),
        item.return_fee.toFixed(2),
        item.mileage_fee.toFixed(2),
        item.payout_method,
        item.payout_destination,
        item.payout_batch_id,
        item.payout_sent_at ? formatDateTime(item.payout_sent_at) : "",
        item.ai.riskLabel,
        item.ai.profitLabel,
        item.ai.payoutHealth,
        item.ai.routeStrategy,
        item.ai.speedLabel,
        String(item.ai.priorityScore),
        item.ai.recommendedAction,
        item.incomplete_reason,
        item.incomplete_note,
        item.redo_requested ? "Yes" : "No",
        item.accepted_at ? formatDateTime(item.accepted_at) : "",
        item.completed_at ? formatDateTime(item.completed_at) : "",
        item.notes,
        item.payout_notes,
      ]),
    ];

    const date = new Date();
    const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    downloadCsv(`admin-payouts-${stamp}.csv`, rows);
  }

  const allVisibleSelected =
    filteredPayouts.length > 0 &&
    filteredPayouts.every((item) => selectedIds.includes(item.id));

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-yellow-500">Admin Payouts</h1>

        <p className="mb-6 text-gray-300">
          Review installer payouts, edit pay, HST, totals, notes, payout batches, payout status,
          customer payment status, bulk payout actions, CSV export, and AI payout guidance.
        </p>

        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Search job ID, installer, payout status, payment status, AI risk, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            type="button"
            onClick={exportPayoutCsv}
            className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400"
          >
            Download CSV
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {(
            [
              ["all", "All", tabCounts.all],
              ["ready", "Ready", tabCounts.ready],
              ["pending", "Pending", tabCounts.pending],
              ["pending_review", "Pending Review", tabCounts.pending_review],
              ["hold", "Hold", tabCounts.hold],
              ["paid", "Paid", tabCounts.paid],
              ["unpaid", "Unpaid", tabCounts.unpaid],
              ["customer_paid", "Customer Paid", tabCounts.customer_paid],
              ["high_risk", "AI High Risk", tabCounts.high_risk],
              ["high_margin", "AI High Margin", tabCounts.high_margin],
            ] as [FilterTab, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${tabButtonClass(
                activeTab === key
              )}`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSelectAllVisible(filteredPayouts)}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2 font-semibold text-white hover:bg-zinc-900"
            >
              {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
            </button>

            <button
              type="button"
              onClick={() => void bulkUpdateStatus("ready")}
              disabled={savingId === "bulk"}
              className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              Bulk Mark Ready
            </button>

            <button
              type="button"
              onClick={() => void bulkUpdateStatus("paid")}
              disabled={savingId === "bulk"}
              className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-60"
            >
              Bulk Mark Paid
            </button>

            <button
              type="button"
              onClick={() => void bulkUpdateStatus("hold")}
              disabled={savingId === "bulk"}
              className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              Bulk Hold
            </button>

            <button
              type="button"
              onClick={() => void assignBatchToSelected()}
              disabled={savingId === "bulk"}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2 font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
            >
              Assign Batch ID
            </button>

            <div className="text-sm text-zinc-400">
              Selected: <span className="font-semibold text-white">{selectedIds.length}</span>
            </div>
          </div>
        </div>

        <div className="mb-8 text-sm text-zinc-400">
          Showing tab:{" "}
          <span className="font-semibold text-yellow-500">
            {activeTab.replaceAll("_", " ").toUpperCase()}
          </span>{" "}
          • Results: <span className="font-semibold text-white">{filteredPayouts.length}</span>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4 xl:grid-cols-9">
          <SummaryCard label="Pending Review" value={String(summary.pendingReview)} />
          <SummaryCard label="On Hold" value={String(summary.holdCount)} />
          <SummaryCard label="Ready to Pay" value={formatMoney(summary.readyTotal)} />
          <SummaryCard label="Paid Total" value={formatMoney(summary.paidTotal)} />
          <SummaryCard label="Unpaid Total" value={formatMoney(summary.unpaidTotal)} />
          <SummaryCard label="AI High Risk" value={String(summary.highRisk)} />
          <SummaryCard label="AI High Margin" value={String(summary.highMargin)} />
          <SummaryCard label="AI Ready Now" value={String(summary.readyNow)} />
          <SummaryCard label="Cust. Paid Jobs" value={String(summary.paidCustomerJobs)} />
        </div>

        {loading ? (
          <div className="text-gray-300">Loading payouts...</div>
        ) : filteredPayouts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No payouts found.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPayouts.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border bg-zinc-900 p-6 ${
                  selectedIds.includes(item.id) ? "border-yellow-500/40" : "border-zinc-800"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <label className="flex items-center gap-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="h-4 w-4"
                    />
                    Select payout
                  </label>

                  <div className="text-xs text-zinc-500">{item.group_label}</div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <AiBadge label="AI Risk" value={item.ai.riskLabel} className={item.ai.riskClass} />
                  <AiBadge
                    label="Profit"
                    value={item.ai.profitLabel}
                    className={item.ai.profitClass}
                  />
                  <AiBadge
                    label="Payout Health"
                    value={item.ai.payoutHealth}
                    className={item.ai.payoutHealthClass}
                  />
                  <AiBadge
                    label="Priority"
                    value={`${item.ai.priorityScore}/100`}
                    className="border-blue-500/30 bg-blue-500/10 text-blue-300"
                  />
                  <AiBadge
                    label="Route"
                    value={item.ai.routeStrategy}
                    className={item.ai.routeStrategyClass}
                  />
                  <AiBadge
                    label="Speed"
                    value={item.ai.speedLabel}
                    className={item.ai.speedClass}
                  />
                  <AiBadge label="Distance Tier" value={item.ai_distance_tier || "-"} />
                  <AiBadge label="Grouping" value={item.ai_grouping_label || "Solo Route"} />
                  <AiBadge
                    label="Customer Payment"
                    value={item.payment_status}
                    className={getPaymentStatusClass(item.payment_status)}
                  />
                </div>

                <div className="mb-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">AI Recommended Action</p>
                  <p className="mt-1 font-semibold text-yellow-400">{item.ai.recommendedAction}</p>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-400">Installer</p>
                    <p className="font-semibold">{item.installer}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Suggested Type: {item.ai_recommended_installer_type || "Standard Installer"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Job</p>
                    <p className="font-semibold">{item.job}</p>
                    <p className="mt-1 text-sm text-yellow-400">Job ID: {item.job_id}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Installer Base Pay</p>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateAmount(item.id, Number(e.target.value))}
                      onBlur={() => void savePayoutAmounts(item.id)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-2 text-white outline-none"
                    />
                    <p className="mt-2 font-bold text-yellow-500">{formatMoney(item.amount)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Payout Status</p>
                    <p
                      className={
                        item.status === "paid"
                          ? "font-bold text-green-400"
                          : item.status === "ready"
                            ? "font-bold text-yellow-400"
                            : item.status === "pending_review"
                              ? "font-bold text-orange-400"
                              : item.status === "hold"
                                ? "font-bold text-red-400"
                                : item.status === "pending"
                                  ? "font-bold text-blue-400"
                                  : "font-bold text-gray-300"
                      }
                    >
                      {item.status.replaceAll("_", " ").toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      Booking Status: {item.booking_status}
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Installer HST</p>
                    <input
                      type="number"
                      value={item.installer_hst}
                      onChange={(e) => updateInstallerHst(item.id, Number(e.target.value))}
                      onBlur={() => void savePayoutAmounts(item.id)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-2 text-white outline-none"
                    />
                    <p className="mt-2 font-semibold text-white">
                      {formatMoney(item.installer_hst)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Installer Total Pay</p>
                    <p className="mt-3 font-semibold text-yellow-500">
                      {formatMoney(item.installer_total_pay)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Batch ID</p>
                    <input
                      type="text"
                      value={item.payout_batch_id}
                      onChange={(e) => updateBatchId(item.id, e.target.value)}
                      onBlur={() => void saveBatchId(item.id)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-2 text-white outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Sent At</p>
                    <p className="mt-3 text-white">{formatDateTime(item.payout_sent_at)}</p>
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Method</p>
                    <p className="mt-1 font-semibold text-white">{item.payout_method || "-"}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Service / Date</p>
                    <p className="mt-1 text-white">{item.service_type || "-"}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.scheduled_date || "-"}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Destination</p>
                    <p className="mt-1 break-words text-white">{item.payout_destination}</p>
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Final Total</p>
                    <p className="mt-1 font-semibold text-white">{formatMoney(item.final_total)}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Company Profit</p>
                    <p className="mt-1 font-semibold text-yellow-500">
                      {formatMoney(item.company_profit)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Return Fee</p>
                    <p className="mt-1 font-semibold text-white">{formatMoney(item.return_fee)}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Mileage Fee</p>
                    <p className="mt-1 font-semibold text-white">{formatMoney(item.mileage_fee)}</p>
                  </div>
                </div>

                {(item.incomplete_reason || item.incomplete_note || item.redo_requested) ? (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-400">Incomplete / Redo Flags</p>
                    {item.incomplete_reason ? (
                      <p className="mt-2 text-sm text-gray-300">Reason: {item.incomplete_reason}</p>
                    ) : null}
                    {item.incomplete_note ? (
                      <p className="mt-1 text-sm text-gray-300">Note: {item.incomplete_note}</p>
                    ) : null}
                    {item.redo_requested ? (
                      <p className="mt-1 text-sm text-gray-300">Redo Requested: Yes</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mb-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="mb-3 text-sm font-semibold text-yellow-400">Payout Breakdown</p>

                  <div className="space-y-2 text-sm text-gray-300">
                    {item.payout_lines.length > 0 ? (
                      item.payout_lines.map((line, index) => (
                        <div
                          key={`${line.label}-${index}`}
                          className="flex items-center justify-between border-b border-zinc-800 pb-2"
                        >
                          <span>{line.label}</span>
                          <span>{formatMoney(line.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>Base / Derived Pay</span>
                        <span>{formatMoney(item.amount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>Installer HST</span>
                      <span>{formatMoney(item.installer_hst)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                      <span>Total Payout</span>
                      <span>{formatMoney(item.installer_total_pay)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <textarea
                    placeholder="General admin notes..."
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    onBlur={() => void saveNotes(item.id)}
                    className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  />

                  <textarea
                    placeholder="Payout notes..."
                    value={item.payout_notes}
                    onChange={(e) => updatePayoutNotes(item.id, e.target.value)}
                    onBlur={() => void savePayoutNotes(item.id)}
                    className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "paid")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-60"
                  >
                    Mark Paid
                  </button>

                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "ready")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                  >
                    Mark Ready
                  </button>

                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "pending_review")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
                  >
                    Set Pending Review
                  </button>

                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "pending")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    Set Pending
                  </button>

                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "hold")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    Set Hold
                  </button>

                  <button
                    type="button"
                    onClick={() => void updateStatus(item.id, "unpaid")}
                    disabled={savingId === item.id}
                    className="rounded-xl border border-zinc-700 bg-black px-4 py-2 font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Set Unpaid
                  </button>
                </div>

                {savingId === item.id ? (
                  <p className="mt-3 text-sm text-yellow-400">Saving...</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}