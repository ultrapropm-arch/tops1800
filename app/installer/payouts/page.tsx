"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_total_pay?: number | null;
  installer_pay_status?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;

  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;

  payout_notes?: string | null;
  payout_batch_id?: string | null;
  payout_sent_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;

  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  redo_requested?: boolean | null;
};

type InstallerProfile = {
  id?: string | null;
  full_name?: string | null;
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
};

type PayoutStatus =
  | "unpaid"
  | "pending"
  | "pending_review"
  | "hold"
  | "ready"
  | "paid";

type PayoutAi = {
  statusLabel: string;
  statusClass: string;
  speedLabel: string;
  speedClass: string;
  routeLabel: string;
  routeClass: string;
  confidenceLabel: string;
  confidenceClass: string;
  recommendedAction: string;
};

type PayoutView = {
  id: string;
  jobId: string;
  jobLabel: string;
  serviceLabel: string;
  subtotalPay: number;
  hstPay: number;
  returnPay: number;
  totalPay: number;
  customerReturnFee: number;
  status: PayoutStatus;
  payoutLines: {
    label: string;
    amount: number;
  }[];
  payoutNotes: string;
  payoutBatchId: string;
  payoutSentAt: string;
  acceptedAt: string;
  completedAt: string;
  aiDispatchScore: number;
  aiPriorityScore: number;
  aiGroupingLabel: string;
  aiDistanceTier: string;
  aiRecommendedInstallerType: string;
  incompleteReason: string;
  incompleteNote: string;
  redoRequested: boolean;
  ai: PayoutAi;
};

type FilterTab =
  | "all"
  | "pending"
  | "pending_review"
  | "hold"
  | "ready"
  | "paid"
  | "high_priority";

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getServiceTypeLabel(booking: {
  service_type?: string | null;
  service_type_label?: string | null;
}) {
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

function normalizePayoutStatus(value?: string | null): PayoutStatus {
  const status = (value || "").trim().toLowerCase();

  if (status === "paid") return "paid";
  if (status === "ready") return "ready";
  if (status === "hold") return "hold";
  if (status === "pending_review") return "pending_review";
  if (status === "pending") return "pending";
  return "unpaid";
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

  if (Number(booking.installer_mileage_pay || 0) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: Number(booking.installer_mileage_pay || 0),
    });
  }

  return lines;
}

function statusColor(status: PayoutStatus) {
  if (status === "paid") return "text-green-400";
  if (status === "ready") return "text-yellow-400";
  if (status === "pending_review") return "text-orange-400";
  if (status === "pending") return "text-blue-400";
  if (status === "hold") return "text-red-400";
  return "text-gray-400";
}

function statusChipClass(status: PayoutStatus) {
  if (status === "paid") return "border-green-500/30 bg-green-500/10 text-green-300";
  if (status === "ready") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  if (status === "pending_review") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (status === "pending") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (status === "hold") return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function aiChipClass(
  value:
    | "fast"
    | "normal"
    | "review"
    | "grouped"
    | "distance"
    | "standard"
    | "high"
    | "medium"
    | "low"
) {
  if (value === "fast" || value === "grouped" || value === "high") {
    return "border-green-500/30 bg-green-500/10 text-green-300";
  }
  if (value === "review" || value === "distance") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }
  if (value === "low") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function buildAiPayoutSummary(params: {
  status: PayoutStatus;
  totalPay: number;
  aiDispatchScore: number;
  aiPriorityScore: number;
  aiGroupingLabel: string;
  aiDistanceTier: string;
  incompleteReason: string;
  incompleteNote: string;
  redoRequested: boolean;
  payoutMethod: string;
}): PayoutAi {
  const {
    status,
    totalPay,
    aiDispatchScore,
    aiPriorityScore,
    aiGroupingLabel,
    aiDistanceTier,
    incompleteReason,
    incompleteNote,
    redoRequested,
    payoutMethod,
  } = params;

  const hasIssue =
    incompleteReason.trim().length > 0 ||
    incompleteNote.trim().length > 0 ||
    redoRequested ||
    status === "hold";

  let statusLabel = "Pending";
  if (status === "paid") statusLabel = "Paid";
  else if (status === "ready") statusLabel = "Ready for Payout";
  else if (status === "pending_review") statusLabel = "Under Review";
  else if (status === "hold") statusLabel = "On Hold";
  else if (status === "unpaid") statusLabel = "Pending";

  let speedLabel = "Standard Pay";
  let speedClass = aiChipClass("normal");

  if (status === "ready" && aiPriorityScore >= 80 && !hasIssue) {
    speedLabel = "Fast Pay Recommended";
    speedClass = aiChipClass("fast");
  } else if (status === "pending_review" || hasIssue) {
    speedLabel = "Review Before Pay";
    speedClass = aiChipClass("review");
  }

  let routeLabel = "Standard Route";
  let routeClass = aiChipClass("standard");

  if (
    aiGroupingLabel.toLowerCase().includes("group") ||
    aiGroupingLabel.toLowerCase().includes("paired")
  ) {
    routeLabel = "Grouped Route";
    routeClass = aiChipClass("grouped");
  } else if (
    aiDistanceTier.toLowerCase().includes("long") ||
    aiDistanceTier.toLowerCase().includes("outer")
  ) {
    routeLabel = "Long Distance";
    routeClass = aiChipClass("distance");
  }

  let confidenceLabel = "Normal Confidence";
  let confidenceClass = aiChipClass("medium");

  const maxScore = Math.max(aiDispatchScore, aiPriorityScore);
  if (maxScore >= 80) {
    confidenceLabel = "High Confidence";
    confidenceClass = aiChipClass("high");
  } else if (maxScore <= 35) {
    confidenceLabel = "Low Confidence";
    confidenceClass = aiChipClass("low");
  }

  let recommendedAction = "Wait for payout status updates from admin.";
  if (!payoutMethod || payoutMethod.toLowerCase() === "not set") {
    recommendedAction = "Add your payout method details so payouts can be processed.";
  } else if (status === "ready") {
    recommendedAction = "Your payout is ready and should be sent soon.";
  } else if (status === "paid") {
    recommendedAction = "Payout completed. Review the paid date and payout batch if shown.";
  } else if (status === "pending_review") {
    recommendedAction = "Admin is reviewing this payout before release.";
  } else if (status === "hold") {
    recommendedAction = "This payout is on hold pending issue review.";
  } else if (hasIssue) {
    recommendedAction = "A redo or incomplete issue is attached to this payout.";
  } else if (totalPay > 0 && aiPriorityScore >= 70) {
    recommendedAction = "High-priority payout. Keep your payout details current.";
  }

  return {
    statusLabel,
    statusClass: statusChipClass(status),
    speedLabel,
    speedClass,
    routeLabel,
    routeClass,
    confidenceLabel,
    confidenceClass,
    recommendedAction,
  };
}

function MetricCard({
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

function filterTabClass(active: boolean) {
  return active
    ? "border-yellow-400 bg-yellow-500 text-black"
    : "border-zinc-700 bg-black text-white hover:bg-zinc-900";
}

export default function PayoutPage() {
  const [loading, setLoading] = useState(true);
  const [installerName, setInstallerName] = useState("");
  const [payouts, setPayouts] = useState<PayoutView[]>([]);
  const [profile, setProfile] = useState<InstallerProfile | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    const savedName = localStorage.getItem("installerPortalName") || "";
    setInstallerName(savedName);
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);

    const supabase = createClient();

    const savedName = localStorage.getItem("installerPortalName") || "";
    const savedEmail = localStorage.getItem("installerPortalEmail") || "";
    const normalizedInstallerName = savedName.trim().toLowerCase();

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (bookingsError) {
      console.error("Error loading payouts:", bookingsError);
      alert(bookingsError.message || "Could not load payouts.");
      setLoading(false);
      return;
    }

    let installerProfile: InstallerProfile | null = null;

    if (savedEmail) {
      const { data: profileData, error: profileError } = await supabase
        .from("installer_profiles")
        .select("*")
        .ilike("email", savedEmail)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading installer profile:", profileError);
      }

      installerProfile = (profileData as InstallerProfile) || null;
    }

    const payoutMethod =
      installerProfile?.payout_method ||
      (installerProfile?.etransfer_email || installerProfile?.payout_email
        ? "etransfer"
        : installerProfile?.bank_name
          ? "bank"
          : "");

    const myPayouts = ((bookingsData as Booking[]) || [])
      .filter((booking) => {
        return (
          normalizedInstallerName !== "" &&
          (booking.installer_name || "").trim().toLowerCase() ===
            normalizedInstallerName
        );
      })
      .map((booking) => {
        const payoutLines = getPayoutLines(booking);

        const labelParts = [
          booking.company_name || booking.customer_name || "Job",
          getServiceTypeLabel(booking),
          booking.scheduled_date || "",
          booking.job_group_id
            ? `Group ${String(booking.job_group_id)}${
                booking.job_number ? ` • Job ${booking.job_number}` : ""
              }`
            : "",
        ].filter(Boolean);

        const subtotalPay =
          Number(booking.installer_subtotal_pay || 0) > 0
            ? Number(booking.installer_subtotal_pay || 0)
            : payoutLines.reduce((sum, line) => sum + line.amount, 0);

        const hstPay = Number(booking.installer_hst_pay || 0);
        const returnPay = Number(booking.return_fee_installer_pay || 0);

        const totalPay =
          Number(booking.installer_total_pay || 0) > 0
            ? Number(booking.installer_total_pay || 0)
            : Number(booking.installer_pay || 0) > 0
              ? Number(booking.installer_pay || 0)
              : subtotalPay + hstPay + returnPay;

        const customerReturnFee = Number(
          booking.return_fee_charged || booking.return_fee || 0
        );

        const status = normalizePayoutStatus(booking.installer_pay_status);

        return {
          id: booking.id,
          jobId: booking.job_id || booking.id,
          jobLabel: labelParts.join(" • "),
          serviceLabel: getServiceTypeLabel(booking),
          subtotalPay,
          hstPay,
          returnPay,
          totalPay,
          customerReturnFee,
          status,
          payoutLines,
          payoutNotes: booking.payout_notes || "",
          payoutBatchId: booking.payout_batch_id || "",
          payoutSentAt: booking.payout_sent_at || "",
          acceptedAt: booking.accepted_at || "",
          completedAt: booking.completed_at || "",
          aiDispatchScore: Number(booking.ai_dispatch_score || 0),
          aiPriorityScore: Number(booking.ai_priority_score || 0),
          aiGroupingLabel: booking.ai_grouping_label || "Solo Route",
          aiDistanceTier: booking.ai_distance_tier || "Standard Zone",
          aiRecommendedInstallerType:
            booking.ai_recommended_installer_type || "Standard Installer",
          incompleteReason: booking.incomplete_reason || "",
          incompleteNote:
            booking.incomplete_notes || booking.incomplete_note || "",
          redoRequested: Boolean(booking.redo_requested),
          ai: buildAiPayoutSummary({
            status,
            totalPay,
            aiDispatchScore: Number(booking.ai_dispatch_score || 0),
            aiPriorityScore: Number(booking.ai_priority_score || 0),
            aiGroupingLabel: booking.ai_grouping_label || "Solo Route",
            aiDistanceTier: booking.ai_distance_tier || "Standard Zone",
            incompleteReason: booking.incomplete_reason || "",
            incompleteNote:
              booking.incomplete_notes || booking.incomplete_note || "",
            redoRequested: Boolean(booking.redo_requested),
            payoutMethod,
          }),
        };
      });

    setProfile(installerProfile);
    setPayouts(myPayouts);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const unpaid = payouts
      .filter((payout) => payout.status === "unpaid")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const pending = payouts
      .filter((payout) => payout.status === "pending")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const pendingReview = payouts
      .filter((payout) => payout.status === "pending_review")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const hold = payouts
      .filter((payout) => payout.status === "hold")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const ready = payouts
      .filter((payout) => payout.status === "ready")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const paid = payouts
      .filter((payout) => payout.status === "paid")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const highPriority = payouts.filter(
      (payout) => payout.aiPriorityScore >= 80
    ).length;

    return { unpaid, pending, pendingReview, hold, ready, paid, highPriority };
  }, [payouts]);

  const tabCounts = useMemo(() => {
    return {
      all: payouts.length,
      pending: payouts.filter((payout) => payout.status === "pending").length,
      pending_review: payouts.filter((payout) => payout.status === "pending_review").length,
      hold: payouts.filter((payout) => payout.status === "hold").length,
      ready: payouts.filter((payout) => payout.status === "ready").length,
      paid: payouts.filter((payout) => payout.status === "paid").length,
      high_priority: payouts.filter((payout) => payout.aiPriorityScore >= 80).length,
    };
  }, [payouts]);

  const filteredPayouts = useMemo(() => {
    let items = payouts;

    if (activeTab === "pending") {
      items = items.filter((payout) => payout.status === "pending");
    } else if (activeTab === "pending_review") {
      items = items.filter((payout) => payout.status === "pending_review");
    } else if (activeTab === "hold") {
      items = items.filter((payout) => payout.status === "hold");
    } else if (activeTab === "ready") {
      items = items.filter((payout) => payout.status === "ready");
    } else if (activeTab === "paid") {
      items = items.filter((payout) => payout.status === "paid");
    } else if (activeTab === "high_priority") {
      items = items.filter((payout) => payout.aiPriorityScore >= 80);
    }

    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((payout) => {
      return (
        payout.jobId.toLowerCase().includes(term) ||
        payout.jobLabel.toLowerCase().includes(term) ||
        payout.serviceLabel.toLowerCase().includes(term) ||
        payout.status.toLowerCase().includes(term) ||
        payout.payoutBatchId.toLowerCase().includes(term) ||
        payout.payoutNotes.toLowerCase().includes(term) ||
        payout.ai.statusLabel.toLowerCase().includes(term) ||
        payout.ai.recommendedAction.toLowerCase().includes(term) ||
        payout.ai.routeLabel.toLowerCase().includes(term) ||
        payout.ai.speedLabel.toLowerCase().includes(term)
      );
    });
  }, [payouts, search, activeTab]);

  function renderPayoutMethod() {
    if (!profile) return "-";

    const method = (profile.payout_method || "").toLowerCase();

    if (method === "etransfer") {
      return profile.etransfer_email || profile.payout_email || "-";
    }

    if (method === "bank") {
      return [
        profile.bank_name || "",
        profile.account_holder_name || "",
        profile.transit_number ? `Transit: ${profile.transit_number}` : "",
        profile.institution_number ? `Institution: ${profile.institution_number}` : "",
        profile.bank_account_last4
          ? `Acct Last4: ${profile.bank_account_last4}`
          : profile.account_number
            ? `Account: ${profile.account_number}`
            : "",
      ]
        .filter(Boolean)
        .join(" • ");
    }

    if (method === "accounting_software") {
      return "Paid through accounting software";
    }

    return "-";
  }

  const payoutMethodMissing =
    !profile?.payout_method &&
    !profile?.etransfer_email &&
    !profile?.payout_email &&
    !profile?.bank_name;

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-yellow-500">My Payouts</h1>

        <p className="mb-6 text-gray-300">
          Review your payout status, subtotal, HST, return pay, payout method details,
          payout notes, payout batch, and AI payout guidance for each completed job.
        </p>

        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Search job ID, job, status, batch ID, AI action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "all"
            )}`}
          >
            All ({tabCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "pending"
            )}`}
          >
            Pending ({tabCounts.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending_review")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "pending_review"
            )}`}
          >
            Under Review ({tabCounts.pending_review})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hold")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "hold"
            )}`}
          >
            Hold ({tabCounts.hold})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ready")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "ready"
            )}`}
          >
            Ready ({tabCounts.ready})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paid")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "paid"
            )}`}
          >
            Paid ({tabCounts.paid})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("high_priority")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filterTabClass(
              activeTab === "high_priority"
            )}`}
          >
            AI High Priority ({tabCounts.high_priority})
          </button>
        </div>

        <div className="mb-6 text-sm text-zinc-400">
          Showing:{" "}
          <span className="font-semibold text-yellow-500">
            {activeTab.replaceAll("_", " ").toUpperCase()}
          </span>{" "}
          • Results: <span className="font-semibold text-white">{filteredPayouts.length}</span>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard label="Unpaid" value={money(totals.unpaid)} />
          <MetricCard label="Pending" value={money(totals.pending)} />
          <MetricCard label="Review" value={money(totals.pendingReview)} />
          <MetricCard label="Hold" value={money(totals.hold)} />
          <MetricCard label="Ready" value={money(totals.ready)} />
          <MetricCard label="Paid" value={money(totals.paid)} />
          <MetricCard label="AI High Priority" value={String(totals.highPriority)} />
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-400">Installer Name</p>
              <p className="mt-1 text-lg font-semibold">{installerName || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Payout Method</p>
              <p className="mt-1 text-lg font-semibold">
                {profile?.payout_method || "-"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-400">Payout Details</p>
              <p className="mt-1 break-words text-sm text-gray-300">
                {renderPayoutMethod()}
              </p>
            </div>
          </div>
        </div>

        {payoutMethodMissing ? (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
            <p className="font-semibold text-yellow-400">Action needed</p>
            <p className="mt-1 text-sm text-gray-300">
              Your payout method is not fully set yet. Add your e-transfer or bank details
              in your installer profile so payouts can move smoothly.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="text-gray-300">Loading payouts...</div>
        ) : filteredPayouts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No payouts found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayouts.map((payout) => (
              <div
                key={payout.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <AiBadge
                    label="Status"
                    value={payout.ai.statusLabel}
                    className={payout.ai.statusClass}
                  />
                  <AiBadge
                    label="Speed"
                    value={payout.ai.speedLabel}
                    className={payout.ai.speedClass}
                  />
                  <AiBadge
                    label="Route"
                    value={payout.ai.routeLabel}
                    className={payout.ai.routeClass}
                  />
                  <AiBadge
                    label="Confidence"
                    value={payout.ai.confidenceLabel}
                    className={payout.ai.confidenceClass}
                  />
                  <AiBadge
                    label="Priority"
                    value={`${Math.max(
                      payout.aiDispatchScore,
                      payout.aiPriorityScore
                    )}/100`}
                    className="border-blue-500/30 bg-blue-500/10 text-blue-300"
                  />
                  <AiBadge label="Distance Tier" value={payout.aiDistanceTier} />
                  <AiBadge label="Grouping" value={payout.aiGroupingLabel} />
                </div>

                <div className="mb-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">AI Recommended Action</p>
                  <p className="mt-1 font-semibold text-yellow-400">
                    {payout.ai.recommendedAction}
                  </p>
                </div>

                <div className="grid items-start gap-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400">Job</p>
                    <p className="text-lg font-semibold">{payout.jobLabel}</p>
                    <p className="mt-1 text-sm text-gray-400">Job ID: {payout.jobId}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Service</p>
                    <p className="text-base font-semibold text-white">
                      {payout.serviceLabel}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Suggested Type: {payout.aiRecommendedInstallerType}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className={`text-sm font-semibold ${statusColor(payout.status)}`}>
                      {payout.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Batch: {payout.payoutBatchId || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Subtotal Pay</p>
                    <p className="mt-2 text-xl font-bold text-yellow-500">
                      {money(payout.subtotalPay)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">HST Pay</p>
                    <p className="mt-2 text-xl font-bold text-yellow-500">
                      {money(payout.hstPay)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Installer Return Pay</p>
                    <p className="mt-2 text-xl font-bold text-yellow-500">
                      {money(payout.returnPay)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Total Payout</p>
                    <p className="mt-2 text-xl font-bold text-yellow-500">
                      {money(payout.totalPay)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Accepted At</p>
                    <p className="mt-2 text-sm text-white">
                      {formatDateTime(payout.acceptedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Completed At</p>
                    <p className="mt-2 text-sm text-white">
                      {formatDateTime(payout.completedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Payout Sent At</p>
                    <p className="mt-2 text-sm text-white">
                      {formatDateTime(payout.payoutSentAt)}
                    </p>
                  </div>
                </div>

                {payout.customerReturnFee > 0 ? (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">
                      Customer Return Fee Charged
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {money(payout.customerReturnFee)}
                    </p>
                  </div>
                ) : null}

                {payout.incompleteReason || payout.incompleteNote || payout.redoRequested ? (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-400">Incomplete / Redo Notes</p>
                    {payout.incompleteReason ? (
                      <p className="mt-2 text-sm text-gray-300">
                        Reason: {payout.incompleteReason}
                      </p>
                    ) : null}
                    {payout.incompleteNote ? (
                      <p className="mt-1 text-sm text-gray-300">
                        Note: {payout.incompleteNote}
                      </p>
                    ) : null}
                    {payout.redoRequested ? (
                      <p className="mt-1 text-sm text-gray-300">
                        Redo Requested: Yes
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {payout.payoutNotes ? (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="text-sm text-gray-400">Admin Payout Notes</p>
                    <p className="mt-2 text-sm text-gray-300">{payout.payoutNotes}</p>
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="mb-3 text-sm font-semibold text-yellow-400">
                    Payout Breakdown
                  </p>

                  {payout.payoutLines.length > 0 ? (
                    <div className="space-y-2 text-sm text-gray-300">
                      {payout.payoutLines.map((line, index) => (
                        <div
                          key={`${line.label}-${index}`}
                          className="flex items-center justify-between border-b border-zinc-800 pb-2"
                        >
                          <span>{line.label}</span>
                          <span>{money(line.amount)}</span>
                        </div>
                      ))}

                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>Subtotal Pay</span>
                        <span>{money(payout.subtotalPay)}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>HST Pay</span>
                        <span>{money(payout.hstPay)}</span>
                      </div>

                      {payout.returnPay > 0 ? (
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span>Installer Return Pay</span>
                          <span>{money(payout.returnPay)}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                        <span>Total Payout</span>
                        <span>{money(payout.totalPay)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>Subtotal Pay</span>
                        <span>{money(payout.subtotalPay)}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>HST Pay</span>
                        <span>{money(payout.hstPay)}</span>
                      </div>

                      {payout.returnPay > 0 ? (
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span>Installer Return Pay</span>
                          <span>{money(payout.returnPay)}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                        <span>Total Payout</span>
                        <span>{money(payout.totalPay)}</span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Detailed payout lines will show automatically when saved in the booking.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}