"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type PayoutStatus = "unpaid" | "pending_review" | "ready" | "paid" | "hold";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  notes?: string | null;
  final_total?: number | null;
  company_profit?: number | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
  return_fee?: number | null;
  return_fee_charged?: number | null;
  mileage_fee?: number | null;
  customer_mileage_charge?: number | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  redo_requested?: boolean | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
};

type Installer = {
  id: string;
  full_name?: string | null;
  payout_method?: string | null;
  etransfer_email?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  account_number?: string | null;
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
};

type PayoutItem = {
  id: string;
  job_id: string;
  installer: string;
  job: string;
  amount: number;
  status: PayoutStatus;
  notes: string;
  final_total: number;
  company_profit: number;
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
  ai: AiPayoutInsight;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatMoney(amount: number) {
  return "$" + amount.toFixed(2);
}

function getServiceTypeLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
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

function buildAiPayoutInsight(params: {
  amount: number;
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
}) : AiPayoutInsight {
  const {
    amount,
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
  } = params;

  const normalizedBookingStatus = bookingStatus.toLowerCase();
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
  if (status === "paid") {
    payoutHealth = "Paid";
  } else if (status === "hold") {
    payoutHealth = "On Hold";
  } else if (status === "ready") {
    payoutHealth = "Ready to Send";
  } else if (status === "pending_review") {
    payoutHealth = "Needs Review";
  } else {
    payoutHealth = "Pending";
  }

  let recommendedAction = "Review payout details.";

  if (status === "paid") {
    recommendedAction = "Already paid. No action needed.";
  } else if (status === "hold") {
    recommendedAction = "Resolve issue before payout release.";
  } else if (hasIncompleteSignals) {
    recommendedAction = "Check incomplete / redo notes before paying.";
  } else if (!payoutMethod || payoutMethod.toLowerCase() === "not set") {
    recommendedAction = "Set installer payout method first.";
  } else if (normalizedBookingStatus !== "completed" && normalizedBookingStatus !== "completed_pending_admin_review") {
    recommendedAction = "Job is not completed yet. Keep payout pending.";
  } else if (status === "pending_review") {
    recommendedAction = "Admin review needed before marking ready.";
  } else if (status === "ready") {
    recommendedAction = "Good to send payout now.";
  } else if (companyProfit <= 0 && amount > 0) {
    recommendedAction = "Double-check pay. Company profit is zero or negative.";
  } else if (aiDispatchScore >= 80 && companyProfit >= 250) {
    recommendedAction = "High-quality job. Prioritize fast payout.";
  } else {
    recommendedAction = "Payout can move forward when confirmed.";
  }

  return {
    riskLabel,
    riskClass: getRiskClass(riskLabel),
    recommendedAction,
    priorityScore: Math.max(aiPriorityScore, aiDispatchScore),
    profitLabel,
    profitClass: getProfitClass(profitLabel),
    payoutHealth,
    payoutHealthClass: getPayoutHealthClass(payoutHealth),
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

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);

    const supabase = createClient();

    const bookingsResponse = await supabase
      .from("bookings")
      .select("*")
      .not("installer_name", "is", null)
      .order("scheduled_date", { ascending: true });

    if (bookingsResponse.error) {
      console.error(
        "Error loading payouts:",
        JSON.stringify(bookingsResponse.error, null, 2)
      );
      alert(bookingsResponse.error.message || "Could not load payouts.");
      setLoading(false);
      return;
    }

    const installersResponse = await supabase
      .from("installers")
      .select("*");

    if (installersResponse.error) {
      console.error(
        "Error loading installer payout info:",
        JSON.stringify(installersResponse.error, null, 2)
      );
      alert(installersResponse.error.message || "Could not load installer payout details.");
      setLoading(false);
      return;
    }

    const installers = (installersResponse.data as Installer[]) || [];
    const bookings = ((bookingsResponse.data as Booking[]) || []).filter(
      (item) => (item.installer_name || "").trim() !== ""
    );

    const payoutItems: PayoutItem[] = bookings.map((booking) => {
      const activeInstallerName =
        (booking.reassigned_installer_name || booking.installer_name || "-").trim();

      const matchedInstaller = installers.find(
        (installer) =>
          (installer.full_name || "").trim().toLowerCase() ===
          activeInstallerName.toLowerCase()
      );

      const payoutMethod = matchedInstaller?.payout_method || "Not set";

      let payoutDestination = "-";

      if (payoutMethod.toLowerCase() === "etransfer") {
        payoutDestination = matchedInstaller?.etransfer_email || "-";
      } else if (payoutMethod.toLowerCase() === "bank") {
        payoutDestination = [
          matchedInstaller?.bank_name || "",
          matchedInstaller?.account_holder_name || "",
          matchedInstaller?.transit_number
            ? `Transit: ${matchedInstaller.transit_number}`
            : "",
          matchedInstaller?.institution_number
            ? `Institution: ${matchedInstaller.institution_number}`
            : "",
          matchedInstaller?.account_number
            ? `Account: ${matchedInstaller.account_number}`
            : "",
        ]
          .filter(Boolean)
          .join(" • ");
      } else if (
        payoutMethod.toLowerCase() === "accounting_software" ||
        payoutMethod.toLowerCase() === "accounting software"
      ) {
        payoutDestination = "Pay through accounting software";
      } else {
        payoutDestination = matchedInstaller?.notes || "-";
      }

      const finalTotal = toNumber(booking.final_total);
      const amount = toNumber(booking.installer_pay);
      const companyProfit =
        booking.company_profit !== null && booking.company_profit !== undefined
          ? toNumber(booking.company_profit)
          : finalTotal - amount;

      const jobLabelParts = [
        booking.company_name || booking.customer_name || "Job",
        booking.service_type_label || getServiceTypeLabel(booking.service_type),
        booking.scheduled_date || "",
        booking.job_group_id
          ? `Group ${String(booking.job_group_id)}${
              booking.job_number ? ` • Job ${booking.job_number}` : ""
            }`
          : "",
      ].filter(Boolean);

      const status = (
        toStringValue(booking.installer_pay_status || "unpaid")
      ) as PayoutStatus;

      const ai = buildAiPayoutInsight({
        amount,
        finalTotal,
        companyProfit,
        status,
        bookingStatus: toStringValue(booking.status),
        returnFee: toNumber(booking.return_fee ?? booking.return_fee_charged),
        mileageFee: toNumber(booking.mileage_fee ?? booking.customer_mileage_charge),
        incompleteReason: toStringValue(booking.incomplete_reason),
        incompleteNote: toStringValue(booking.incomplete_notes || booking.incomplete_note),
        redoRequested: Boolean(booking.redo_requested),
        payoutMethod,
        aiDispatchScore: toNumber(booking.ai_dispatch_score),
        aiPriorityScore: toNumber(booking.ai_priority_score),
      });

      return {
        id: booking.id,
        job_id: booking.job_id || booking.id,
        installer: activeInstallerName || "-",
        job: jobLabelParts.join(" • "),
        amount,
        status,
        notes: booking.notes || "",
        final_total: finalTotal,
        company_profit: companyProfit,
        payout_method: payoutMethod,
        payout_destination: payoutDestination || "-",
        booking_status: booking.status || "-",
        return_fee: toNumber(booking.return_fee ?? booking.return_fee_charged),
        mileage_fee: toNumber(booking.mileage_fee ?? booking.customer_mileage_charge),
        service_type:
          booking.service_type_label || getServiceTypeLabel(booking.service_type),
        scheduled_date: booking.scheduled_date || "-",
        group_label: booking.job_group_id
          ? `Group ${String(booking.job_group_id)}`
          : "Single Job",
        ai_dispatch_score: toNumber(booking.ai_dispatch_score),
        ai_priority_score: toNumber(booking.ai_priority_score),
        ai_grouping_label: booking.ai_grouping_label || "Solo Route",
        ai_distance_tier: booking.ai_distance_tier || "Standard Zone",
        ai_recommended_installer_type:
          booking.ai_recommended_installer_type || "Standard Installer",
        incomplete_reason: booking.incomplete_reason || "",
        incomplete_note:
          booking.incomplete_notes || booking.incomplete_note || "",
        redo_requested: Boolean(booking.redo_requested),
        accepted_at: booking.accepted_at || "",
        completed_at: booking.completed_at || "",
        ai,
      };
    });

    setPayouts(payoutItems);
    setLoading(false);
  }

  async function updateStatus(id: string, status: PayoutStatus) {
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({ installer_pay_status: status })
      .eq("id", id);

    if (error) {
      console.error("Error updating payout status:", JSON.stringify(error, null, 2));
      alert(error.message || "Could not update payout status.");
      setSavingId("");
      return;
    }

    setPayouts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, status };
        next.ai = buildAiPayoutInsight({
          amount: next.amount,
          finalTotal: next.final_total,
          companyProfit: next.company_profit,
          status: next.status,
          bookingStatus: next.booking_status,
          returnFee: next.return_fee,
          mileageFee: next.mileage_fee,
          incompleteReason: next.incomplete_reason,
          incompleteNote: next.incomplete_note,
          redoRequested: next.redo_requested,
          payoutMethod: next.payout_method,
          aiDispatchScore: next.ai_dispatch_score,
          aiPriorityScore: next.ai_priority_score,
        });
        return next;
      })
    );

    setSavingId("");
  }

  function updateNotes(id: string, notes: string) {
    setPayouts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  }

  async function saveNotes(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({ notes: item.notes })
      .eq("id", id);

    if (error) {
      console.error("Error saving notes:", JSON.stringify(error, null, 2));
      alert(error.message || "Could not save notes.");
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

        const next = {
          ...item,
          amount: safeAmount,
          company_profit: item.final_total - safeAmount,
        };

        next.ai = buildAiPayoutInsight({
          amount: next.amount,
          finalTotal: next.final_total,
          companyProfit: next.company_profit,
          status: next.status,
          bookingStatus: next.booking_status,
          returnFee: next.return_fee,
          mileageFee: next.mileage_fee,
          incompleteReason: next.incomplete_reason,
          incompleteNote: next.incomplete_note,
          redoRequested: next.redo_requested,
          payoutMethod: next.payout_method,
          aiDispatchScore: next.ai_dispatch_score,
          aiPriorityScore: next.ai_priority_score,
        });

        return next;
      })
    );
  }

  async function saveAmount(id: string) {
    const item = payouts.find((entry) => entry.id === id);
    if (!item) return;

    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({
        installer_pay: item.amount,
        company_profit: item.final_total - item.amount,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving payout amount:", JSON.stringify(error, null, 2));
      alert(error.message || "Could not save payout amount.");
      setSavingId("");
      return;
    }

    setSavingId("");
  }

  const filteredPayouts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return payouts;

    return payouts.filter((item) => {
      return (
        item.job_id.toLowerCase().includes(term) ||
        item.installer.toLowerCase().includes(term) ||
        item.job.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.booking_status.toLowerCase().includes(term) ||
        item.payout_method.toLowerCase().includes(term) ||
        item.payout_destination.toLowerCase().includes(term) ||
        item.notes.toLowerCase().includes(term) ||
        item.ai.riskLabel.toLowerCase().includes(term) ||
        item.ai.recommendedAction.toLowerCase().includes(term) ||
        item.ai.profitLabel.toLowerCase().includes(term)
      );
    });
  }, [payouts, search]);

  const summary = useMemo(() => {
    const pendingReview = payouts.filter(
      (item) => item.status === "pending_review"
    ).length;

    const holdCount = payouts.filter((item) => item.status === "hold").length;

    const readyTotal = payouts
      .filter((item) => item.status === "ready")
      .reduce((sum, item) => sum + item.amount, 0);

    const paidTotal = payouts
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0);

    const unpaidTotal = payouts
      .filter((item) => item.status === "unpaid")
      .reduce((sum, item) => sum + item.amount, 0);

    const highRisk = payouts.filter(
      (item) => item.ai.riskLabel === "High Risk"
    ).length;

    const highMargin = payouts.filter(
      (item) => item.ai.profitLabel === "High Margin"
    ).length;

    const readyNow = payouts.filter(
      (item) => item.ai.payoutHealth === "Ready to Send"
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
    };
  }, [payouts]);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold text-yellow-500">
          Admin Payouts
        </h1>

        <p className="mb-6 text-gray-300">
          Review installer payouts, adjust pay, track review status, and manage ready,
          hold, unpaid, and paid payout flow with AI payout guidance.
        </p>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search job ID, installer, payout status, AI risk, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <SummaryCard
            label="Pending Review"
            value={String(summary.pendingReview)}
          />
          <SummaryCard
            label="On Hold"
            value={String(summary.holdCount)}
          />
          <SummaryCard
            label="Ready to Pay"
            value={formatMoney(summary.readyTotal)}
          />
          <SummaryCard
            label="Paid Total"
            value={formatMoney(summary.paidTotal)}
          />
          <SummaryCard
            label="Unpaid Total"
            value={formatMoney(summary.unpaidTotal)}
          />
          <SummaryCard
            label="AI High Risk"
            value={String(summary.highRisk)}
          />
          <SummaryCard
            label="AI High Margin"
            value={String(summary.highMargin)}
          />
          <SummaryCard
            label="AI Ready Now"
            value={String(summary.readyNow)}
          />
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
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <AiBadge
                    label="AI Risk"
                    value={item.ai.riskLabel}
                    className={item.ai.riskClass}
                  />
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
                    label="Distance Tier"
                    value={item.ai_distance_tier || "-"}
                  />
                  <AiBadge
                    label="Grouping"
                    value={item.ai_grouping_label || "Solo Route"}
                  />
                </div>

                <div className="mb-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">AI Recommended Action</p>
                  <p className="mt-1 font-semibold text-yellow-400">
                    {item.ai.recommendedAction}
                  </p>
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
                    <p className="mt-1 text-sm text-yellow-400">
                      Job ID: {item.job_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Amount</p>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        updateAmount(item.id, Number(e.target.value))
                      }
                      onBlur={() => void saveAmount(item.id)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-black p-2 text-white outline-none"
                    />
                    <p className="mt-2 font-bold text-yellow-500">
                      {formatMoney(item.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Status</p>
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

                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Method</p>
                    <p className="mt-1 font-semibold text-white">
                      {item.payout_method || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Service / Date</p>
                    <p className="mt-1 text-white">{item.service_type || "-"}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {item.scheduled_date || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Destination</p>
                    <p className="mt-1 text-white">{item.payout_destination}</p>
                  </div>
                </div>

                <div className="mb-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Final Total</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatMoney(item.final_total)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Company Profit</p>
                    <p className="mt-1 font-semibold text-yellow-500">
                      {formatMoney(item.company_profit)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Return Fee</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatMoney(item.return_fee)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Mileage Fee</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatMoney(item.mileage_fee)}
                    </p>
                  </div>
                </div>

                {(item.incomplete_reason || item.incomplete_note || item.redo_requested) ? (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-400">Incomplete / Redo Flags</p>
                    {item.incomplete_reason ? (
                      <p className="mt-2 text-sm text-gray-300">
                        Reason: {item.incomplete_reason}
                      </p>
                    ) : null}
                    {item.incomplete_note ? (
                      <p className="mt-1 text-sm text-gray-300">
                        Note: {item.incomplete_note}
                      </p>
                    ) : null}
                    {item.redo_requested ? (
                      <p className="mt-1 text-sm text-gray-300">
                        Redo Requested: Yes
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <textarea
                  placeholder="Admin notes..."
                  value={item.notes}
                  onChange={(e) => updateNotes(item.id, e.target.value)}
                  onBlur={() => void saveNotes(item.id)}
                  className="mb-4 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                />

                <div className="flex flex-wrap gap-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}