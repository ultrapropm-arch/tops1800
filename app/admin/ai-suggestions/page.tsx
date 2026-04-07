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
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  installer_name?: string | null;
  status?: string | null;
  one_way_km?: number | null;
  installer_pay?: number | null;
  company_profit?: number | null;
  service_type?: string | null;
  service_type_label?: string | null;
  timeline?: string | null;
  ai_urgency_label?: string | null;
  ai_grouping_label?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_route_hint?: string | null;
  ai_distance_tier?: string | null;
};

type FilterValue =
  | "all"
  | "sameDay"
  | "nextDay"
  | "longDistance"
  | "grouped"
  | "bestAi"
  | "highPay";

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

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
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
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

function getUrgencyLabel(job: Booking) {
  if (job.ai_urgency_label) return job.ai_urgency_label;

  const text = [
    job.timeline || "",
    job.pickup_time_slot || "",
    job.scheduled_time || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("same")) return "Same-Day Priority";
  if (text.includes("next")) return "Next-Day Priority";

  return "Open Scheduling";
}

function getAiScore(job: Booking) {
  let score = Number(job.ai_dispatch_score || job.ai_priority_score || 0);

  if (!score) {
    score = 55;

    if ((job.ai_recommended_installer_type || "") === "Long Distance Specialist") {
      score += 15;
    }

    if ((job.ai_recommended_installer_type || "") === "Large Project Specialist") {
      score += 10;
    }

    if ((job.ai_grouping_label || "") === "Strong Grouping") {
      score += 15;
    } else if ((job.ai_grouping_label || "") === "Possible Group") {
      score += 8;
    }

    if (Number(job.installer_pay || 0) >= 500) {
      score += 10;
    }

    if (getUrgencyLabel(job) === "Same-Day Priority") {
      score += 12;
    } else if (getUrgencyLabel(job) === "Next-Day Priority") {
      score += 6;
    }

    if (Number(job.one_way_km || 0) > 120) {
      score += 8;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function getUrgencyClass(label: string) {
  if (label === "Same-Day Priority") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (label === "Next-Day Priority") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }

  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getGroupingClass(label?: string | null) {
  if (label === "Strong Grouping") {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }

  if (label === "Possible Group") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getProfitClass(value?: number | null) {
  const profit = Number(value || 0);

  if (profit >= 300) return "text-green-400";
  if (profit >= 100) return "text-yellow-400";
  return "text-red-400";
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

function SuggestionCard({
  job,
}: {
  job: Booking;
}) {
  const urgency = getUrgencyLabel(job);
  const aiScore = getAiScore(job);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-lg font-bold text-yellow-400">{job.job_id || job.id}</p>

        <Badge label={urgency} className={getUrgencyClass(urgency)} />

        <Badge
          label={job.ai_grouping_label || "Solo Route"}
          className={getGroupingClass(job.ai_grouping_label)}
        />

        <Badge
          label={`AI ${aiScore}/100`}
          className="border-purple-500/30 bg-purple-500/10 text-purple-300"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 text-sm text-gray-300">
          <p>Company / Customer: {job.company_name || job.customer_name || "-"}</p>
          <p>Service: {getServiceTypeLabel(job)}</p>
          <p>Date: {job.scheduled_date || "-"}</p>
          <p>Pickup Window: {getPickupWindow(job)}</p>
          <p>Installer: {job.installer_name || "Unassigned"}</p>
        </div>

        <div className="space-y-2 text-sm text-gray-300">
          <p>One-Way KM: {Number(job.one_way_km || 0).toFixed(2)}</p>
          <p>Installer Pay: {money(job.installer_pay)}</p>
          <p className={getProfitClass(job.company_profit)}>
            Company Profit: {money(job.company_profit)}
          </p>
          <p>Distance Tier: {job.ai_distance_tier || "-"}</p>
          <p>AI Installer Type: {job.ai_recommended_installer_type || "-"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-sm font-semibold text-yellow-400">Route Hint</p>
        <p className="mt-1 text-sm text-gray-300">
          {job.ai_route_hint || "No route hint yet."}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-300">
        <p>Pick Up: {job.pickup_address || "-"}</p>
        <p>Drop Off: {job.dropoff_address || "-"}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Booking[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-4 text-xl font-bold text-yellow-500">
        {title} ({items.length})
      </h2>

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((job) => (
            <SuggestionCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiSuggestionsPage() {
  const [loading, setLoading] = useState(true);
  const [runningAi, setRunningAi] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [runMessage, setRunMessage] = useState("");

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("is_archived", false)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("AI SUGGESTIONS LOAD ERROR:", error);
      setLoading(false);
      return;
    }

    const filtered = ((data as Booking[]) || []).filter(
      (job) =>
        (job.status || "").toLowerCase() === "available" &&
        !(job.installer_name || "").trim()
    );

    setJobs(filtered);
    setLoading(false);
  }

  async function runAiDispatch() {
    try {
      setRunningAi(true);
      setRunMessage("");

      const response = await fetch("/api/ai-dispatch", {
        method: "POST",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to run AI dispatch.");
      }

      setRunMessage("AI dispatch completed successfully.");
      await loadJobs();
    } catch (error) {
      console.error("RUN AI DISPATCH ERROR:", error);
      setRunMessage(
        error instanceof Error ? error.message : "Failed to run AI dispatch."
      );
    } finally {
      setRunningAi(false);
    }
  }

  const sameDay = useMemo(
    () =>
      jobs
        .filter((j) => getUrgencyLabel(j) === "Same-Day Priority")
        .sort((a, b) => getAiScore(b) - getAiScore(a)),
    [jobs]
  );

  const nextDay = useMemo(
    () =>
      jobs
        .filter((j) => getUrgencyLabel(j) === "Next-Day Priority")
        .sort((a, b) => getAiScore(b) - getAiScore(a)),
    [jobs]
  );

  const longDistance = useMemo(
    () =>
      jobs
        .filter((j) => Number(j.one_way_km || 0) > 120)
        .sort((a, b) => Number(b.one_way_km || 0) - Number(a.one_way_km || 0)),
    [jobs]
  );

  const topMatches = useMemo(
    () =>
      jobs
        .filter((j) => getAiScore(j) >= 85)
        .sort((a, b) => getAiScore(b) - getAiScore(a)),
    [jobs]
  );

  const grouped = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.ai_grouping_label === "Strong Grouping" ||
            j.ai_grouping_label === "Possible Group"
        )
        .sort((a, b) => getAiScore(b) - getAiScore(a)),
    [jobs]
  );

  const highPay = useMemo(
    () =>
      jobs
        .filter((j) => Number(j.installer_pay || 0) >= 500)
        .sort((a, b) => Number(b.installer_pay || 0) - Number(a.installer_pay || 0)),
    [jobs]
  );

  const allSuggestions = useMemo(() => {
    let result = [...jobs];

    if (filter === "sameDay") {
      result = sameDay;
    } else if (filter === "nextDay") {
      result = nextDay;
    } else if (filter === "longDistance") {
      result = longDistance;
    } else if (filter === "grouped") {
      result = grouped;
    } else if (filter === "bestAi") {
      result = topMatches;
    } else if (filter === "highPay") {
      result = highPay;
    }

    const term = search.trim().toLowerCase();

    if (!term) {
      return result.sort((a, b) => getAiScore(b) - getAiScore(a));
    }

    return result
      .filter((job) => {
        return (
          (job.job_id || "").toLowerCase().includes(term) ||
          (job.company_name || "").toLowerCase().includes(term) ||
          (job.customer_name || "").toLowerCase().includes(term) ||
          (job.pickup_address || "").toLowerCase().includes(term) ||
          (job.dropoff_address || "").toLowerCase().includes(term) ||
          (job.scheduled_date || "").toLowerCase().includes(term) ||
          (job.ai_recommended_installer_type || "").toLowerCase().includes(term) ||
          (job.ai_grouping_label || "").toLowerCase().includes(term) ||
          (job.ai_urgency_label || "").toLowerCase().includes(term) ||
          (job.service_type || "").toLowerCase().includes(term) ||
          (job.service_type_label || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => getAiScore(b) - getAiScore(a));
  }, [jobs, sameDay, nextDay, longDistance, grouped, topMatches, highPay, filter, search]);

  const summary = useMemo(() => {
    const sameDayCount = sameDay.length;
    const nextDayCount = nextDay.length;
    const longDistanceCount = longDistance.length;
    const groupedCount = grouped.length;
    const bestAiCount = topMatches.length;
    const highPayCount = highPay.length;

    const routeClusters = new Set(
      jobs
        .map((job) => getRouteClusterKey(job.dropoff_address || job.pickup_address))
        .filter(Boolean)
    ).size;

    return {
      total: jobs.length,
      sameDayCount,
      nextDayCount,
      longDistanceCount,
      groupedCount,
      bestAiCount,
      highPayCount,
      routeClusters,
    };
  }, [jobs, sameDay, nextDay, longDistance, grouped, topMatches, highPay]);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-yellow-500">AI Suggestions</h1>
            <p className="mt-3 max-w-3xl text-gray-300">
              Dispatch control center for same-day jobs, next-day jobs, long-distance runs,
              grouped routes, top AI matches, and higher-paying jobs.
            </p>
          </div>

          <div className="w-full xl:w-auto">
            <button
              type="button"
              onClick={() => void runAiDispatch()}
              disabled={runningAi}
              className="w-full rounded-2xl bg-yellow-500 px-6 py-4 text-sm font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60 xl:w-auto"
            >
              {runningAi ? "Running AI Dispatch..." : "Run AI Dispatch"}
            </button>

            {runMessage ? (
              <p className="mt-3 text-sm text-gray-300">{runMessage}</p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-400">
            Loading AI suggestions...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <StatCard label="All Suggestions" value={String(summary.total)} />
              <StatCard label="Same-Day" value={String(summary.sameDayCount)} />
              <StatCard label="Next-Day" value={String(summary.nextDayCount)} />
              <StatCard label="Long Distance" value={String(summary.longDistanceCount)} />
              <StatCard label="Grouped Routes" value={String(summary.groupedCount)} />
              <StatCard label="Top AI Match" value={String(summary.bestAiCount)} />
              <StatCard
                label="Route Clusters"
                value={String(summary.routeClusters)}
                sublabel={`High Pay: ${summary.highPayCount}`}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search job ID, company, date, route, AI type..."
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All"],
                      ["sameDay", "Same Day"],
                      ["nextDay", "Next Day"],
                      ["longDistance", "Long Distance"],
                      ["grouped", "Grouped"],
                      ["bestAi", "Best AI"],
                      ["highPay", "High Pay"],
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

            {filter === "all" && !search.trim() ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <Section
                  title="🔥 Same-Day Priority"
                  items={sameDay}
                  emptyText="No same-day jobs right now."
                />
                <Section
                  title="⚡ Next-Day Priority"
                  items={nextDay}
                  emptyText="No next-day jobs right now."
                />
                <Section
                  title="🚚 Long Distance"
                  items={longDistance}
                  emptyText="No long-distance jobs right now."
                />
                <Section
                  title="🧠 Top AI Matches"
                  items={topMatches}
                  emptyText="No top AI matches right now."
                />
                <Section
                  title="📦 Grouped Routes"
                  items={grouped}
                  emptyText="No grouped route suggestions right now."
                />
                <Section
                  title="💰 High Pay Jobs"
                  items={highPay}
                  emptyText="No high pay jobs right now."
                />
              </div>
            ) : (
              <Section
                title="Filtered Suggestions"
                items={allSuggestions}
                emptyText="No jobs match this filter."
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}