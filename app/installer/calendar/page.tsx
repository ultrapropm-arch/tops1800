"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type CalendarJob = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  customer_email?: string | null;
  installer_name?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  scheduled_date?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  status?: string | null;
  installer_pay?: number | null;
  final_total?: number | null;
  one_way_km?: number | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
  is_archived?: boolean | null;

  ai_urgency_label?: string | null;
  ai_grouping_label?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_distance_tier?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_route_hint?: string | null;
};

type SuggestionSectionProps = {
  title: string;
  items: CalendarJob[];
  emptyText: string;
  accentClass: string;
  onSelect: (date: string) => void;
};

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: CalendarJob) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return "-";
}

function getServiceTypeLabel(job: CalendarJob) {
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

function getStatusClass(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "completed" || value === "completed_pending_admin_review") {
    return "text-green-400";
  }

  if (
    value === "confirmed" ||
    value === "accepted" ||
    value === "assigned" ||
    value === "in_progress"
  ) {
    return "text-blue-400";
  }

  if (value === "incomplete") {
    return "text-red-400";
  }

  if (value === "available" || value === "pending" || value === "new") {
    return "text-yellow-400";
  }

  return "text-gray-400";
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

function isSameDayJob(job: CalendarJob) {
  const text = [
    job.pickup_time_slot || "",
    job.service_type || "",
    job.service_type_label || "",
    job.ai_urgency_label || "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("same day") ||
    text.includes("same-day") ||
    (job.ai_urgency_label || "") === "Same-Day Priority"
  );
}

function isNextDayJob(job: CalendarJob) {
  const text = [
    job.pickup_time_slot || "",
    job.service_type || "",
    job.service_type_label || "",
    job.ai_urgency_label || "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("next day") ||
    text.includes("next-day") ||
    (job.ai_urgency_label || "") === "Next-Day Priority"
  );
}

function getAiScore(job: CalendarJob, allJobs: CalendarJob[]) {
  let score = Number(job.ai_dispatch_score || 0);

  if (!score) {
    score = 50;

    if (isSameDayJob(job)) score += 20;
    else if (isNextDayJob(job)) score += 10;

    if (Number(job.one_way_km || 0) > 120) score += 8;
    if (Number(job.installer_pay || 0) >= 500) score += 10;

    const clusterKey = getRouteClusterKey(job.dropoff_address || job.pickup_address);

    const nearbyCount = allJobs.filter((item) => {
      if (item.id === job.id) return false;
      if ((item.scheduled_date || "") !== (job.scheduled_date || "")) return false;

      const itemClusterKey = getRouteClusterKey(
        item.dropoff_address || item.pickup_address
      );

      return clusterKey && itemClusterKey && clusterKey === itemClusterKey;
    }).length;

    if (nearbyCount >= 2) score += 12;
    else if (nearbyCount === 1) score += 6;
  }

  return Math.max(0, Math.min(100, score));
}

function getPriorityScore(job: CalendarJob) {
  let score = Number(job.ai_priority_score || 0);

  if (!score) {
    score = 40;
    if (isSameDayJob(job)) score += 35;
    else if (isNextDayJob(job)) score += 18;
    if (Number(job.one_way_km || 0) > 120) score += 8;
    if (Number(job.installer_pay || 0) >= 500) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function SuggestionSection({
  title,
  items,
  emptyText,
  accentClass,
  onSelect,
}: SuggestionSectionProps) {
  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <span className="rounded-full bg-black/40 px-2 py-1 text-xs font-bold">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-300">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                if (job.scheduled_date) onSelect(job.scheduled_date);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-left transition hover:border-yellow-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {job.job_id || job.id}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {job.company_name || job.customer_name || "Job"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-yellow-400">
                    {money(job.installer_pay)}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {job.scheduled_date || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-2 space-y-1 text-xs text-gray-300">
                <p>{getServiceTypeLabel(job)}</p>
                <p>{getPickupWindow(job)}</p>
                <p className="truncate">
                  {job.dropoff_address || job.pickup_address || "-"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
          id,
          job_id,
          customer_name,
          company_name,
          customer_email,
          installer_name,
          pickup_address,
          dropoff_address,
          scheduled_date,
          pickup_time_slot,
          pickup_time_from,
          pickup_time_to,
          service_type,
          service_type_label,
          status,
          installer_pay,
          final_total,
          one_way_km,
          job_group_id,
          job_number,
          is_archived,
          ai_urgency_label,
          ai_grouping_label,
          ai_recommended_installer_type,
          ai_distance_tier,
          ai_dispatch_score,
          ai_priority_score,
          ai_route_hint
        `
      )
      .eq("is_archived", false)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error loading calendar jobs:", error);
      alert(error.message || "Could not load calendar jobs.");
      setLoading(false);
      return;
    }

    const validJobs = ((data as CalendarJob[]) || []).filter(
      (job) => job.scheduled_date
    );

    setJobs(validJobs);

    if (!selectedDate && validJobs.length > 0) {
      setSelectedDate(validJobs[0].scheduled_date || null);
    }

    setLoading(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthTitle = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: Array<{ type: "empty" } | { type: "day"; dayNumber: number }> =
      [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push({ type: "empty" });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ type: "day", dayNumber: day });
    }

    return cells;
  }, [firstDayOfMonth, daysInMonth]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, CalendarJob[]> = {};

    for (const job of jobs) {
      const date = job.scheduled_date || "";
      if (!date) continue;

      if (!map[date]) {
        map[date] = [];
      }

      map[date].push(job);
    }

    return map;
  }, [jobs]);

  const sameDayJobs = useMemo(() => {
    return jobs
      .filter((job) => isSameDayJob(job))
      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
      .slice(0, 8);
  }, [jobs]);

  const nextDayJobs = useMemo(() => {
    return jobs
      .filter((job) => !isSameDayJob(job) && isNextDayJob(job))
      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
      .slice(0, 8);
  }, [jobs]);

  const longDistanceJobs = useMemo(() => {
    return jobs
      .filter((job) => Number(job.one_way_km || 0) > 120)
      .sort((a, b) => Number(b.one_way_km || 0) - Number(a.one_way_km || 0))
      .slice(0, 8);
  }, [jobs]);

  const topAiJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => getAiScore(b, jobs) - getAiScore(a, jobs))
      .slice(0, 8);
  }, [jobs]);

  const groupedRouteJobs = useMemo(() => {
    const routeMatches = jobs.filter((job) => {
      const clusterKey = getRouteClusterKey(job.dropoff_address || job.pickup_address);
      if (!clusterKey) return false;

      const nearbyCount = jobs.filter((item) => {
        if (item.id === job.id) return false;
        if ((item.scheduled_date || "") !== (job.scheduled_date || "")) return false;

        const itemClusterKey = getRouteClusterKey(
          item.dropoff_address || item.pickup_address
        );

        return clusterKey === itemClusterKey;
      }).length;

      return nearbyCount > 0;
    });

    return routeMatches
      .sort((a, b) => getAiScore(b, jobs) - getAiScore(a, jobs))
      .slice(0, 8);
  }, [jobs]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  function formatDate(dayNumber: number) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(dayNumber).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  const selectedJobs = selectedDate ? jobsByDate[selectedDate] || [] : [];

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-bold text-yellow-500">Calendar</h1>
          <p className="mt-3 max-w-3xl text-gray-300">
            View all scheduled jobs by day, while keeping urgency and AI suggestions
            visible on the right side.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading calendar...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
                >
                  Previous
                </button>

                <h2 className="text-2xl font-bold text-white">{monthTitle}</h2>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
                >
                  Next
                </button>
              </div>

              <div className="mb-3 grid grid-cols-7 gap-2">
                {WEEK_DAYS.map((day, index) => (
                  <div
                    key={day + "-" + index}
                    className="py-2 text-center text-sm font-semibold text-gray-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, index) => {
                  if (cell.type === "empty") {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[96px] rounded-2xl border border-transparent bg-black/30"
                      />
                    );
                  }

                  const fullDate = formatDate(cell.dayNumber);
                  const dayJobs = jobsByDate[fullDate] || [];
                  const isSelected = selectedDate === fullDate;
                  const hasSameDayUrgency = dayJobs.some((job) => isSameDayJob(job));
                  const hasNextDayPriority = dayJobs.some((job) => isNextDayJob(job));

                  return (
                    <button
                      key={fullDate}
                      type="button"
                      onClick={() => setSelectedDate(fullDate)}
                      className={
                        isSelected
                          ? "min-h-[96px] rounded-2xl border border-yellow-500 bg-black p-3 text-left transition"
                          : hasSameDayUrgency
                            ? "min-h-[96px] rounded-2xl border border-red-500/40 bg-red-500/5 p-3 text-left transition hover:border-red-400"
                            : hasNextDayPriority
                              ? "min-h-[96px] rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-left transition hover:border-yellow-400"
                              : "min-h-[96px] rounded-2xl border border-zinc-800 bg-black p-3 text-left transition hover:border-zinc-600"
                      }
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-bold text-white">
                          {cell.dayNumber}
                        </span>

                        {dayJobs.length > 0 ? (
                          <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
                            {dayJobs.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1">
                        {dayJobs.slice(0, 2).map((job) => (
                          <div
                            key={job.id}
                            className="truncate rounded-lg bg-zinc-900 px-2 py-1 text-xs text-gray-300"
                          >
                            {getPickupWindow(job)} - {job.installer_name || "Unassigned"}
                          </div>
                        ))}

                        {dayJobs.length > 2 ? (
                          <div className="text-xs text-gray-500">
                            +{dayJobs.length - 2} more
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-6">
              <SuggestionSection
                title="Urgent Same-Day Jobs"
                items={sameDayJobs}
                emptyText="No same-day urgency jobs right now."
                accentClass="border-red-500/30 bg-red-500/10 text-red-300"
                onSelect={setSelectedDate}
              />

              <SuggestionSection
                title="Next-Day Priority Jobs"
                items={nextDayJobs}
                emptyText="No next-day priority jobs right now."
                accentClass="border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                onSelect={setSelectedDate}
              />

              <SuggestionSection
                title="Long Distance Jobs"
                items={longDistanceJobs}
                emptyText="No long-distance jobs right now."
                accentClass="border-blue-500/30 bg-blue-500/10 text-blue-300"
                onSelect={setSelectedDate}
              />

              <SuggestionSection
                title="Top AI Match Jobs"
                items={topAiJobs}
                emptyText="No AI-matched jobs right now."
                accentClass="border-purple-500/30 bg-purple-500/10 text-purple-300"
                onSelect={setSelectedDate}
              />

              <SuggestionSection
                title="Grouped Route Suggestions"
                items={groupedRouteJobs}
                emptyText="No grouped route suggestions right now."
                accentClass="border-green-500/30 bg-green-500/10 text-green-300"
                onSelect={setSelectedDate}
              />

              <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold text-yellow-500">
                  {selectedDate ? `Jobs for ${selectedDate}` : "Select a Day"}
                </h2>

                <div className="mt-5 space-y-4">
                  {!selectedDate ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-gray-400">
                      Click a day on the calendar or a suggestion on the right.
                    </div>
                  ) : selectedJobs.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No jobs scheduled for this date.
                    </div>
                  ) : (
                    selectedJobs
                      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
                      .map((job) => (
                        <div
                          key={job.id}
                          className={`rounded-2xl border bg-black p-5 ${
                            isSameDayJob(job)
                              ? "border-red-500/30"
                              : isNextDayJob(job)
                                ? "border-yellow-500/30"
                                : "border-zinc-800"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-bold text-yellow-400">
                              {job.job_id || job.id}
                            </p>

                            {isSameDayJob(job) ? (
                              <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400">
                                Same-Day
                              </span>
                            ) : null}

                            {!isSameDayJob(job) && isNextDayJob(job) ? (
                              <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-400">
                                Next-Day
                              </span>
                            ) : null}

                            <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs font-bold text-purple-300">
                              AI {getAiScore(job, jobs)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2 text-sm text-gray-300">
                            <p>
                              <span className="text-gray-500">Customer / Company:</span>{" "}
                              {job.company_name || job.customer_name || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">Service:</span>{" "}
                              {getServiceTypeLabel(job)}
                            </p>
                            <p>
                              <span className="text-gray-500">Installer:</span>{" "}
                              {job.installer_name || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">Pickup Window:</span>{" "}
                              {getPickupWindow(job)}
                            </p>
                            <p>
                              <span className="text-gray-500">Pick Up:</span>{" "}
                              {job.pickup_address || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">Drop Off:</span>{" "}
                              {job.dropoff_address || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">One-Way Distance:</span>{" "}
                              {Number(job.one_way_km || 0).toFixed(2)} km
                            </p>
                            <p>
                              <span className="text-gray-500">Installer Pay:</span>{" "}
                              {money(job.installer_pay)}
                            </p>
                            <p>
                              <span className="text-gray-500">Final Total:</span>{" "}
                              {money(job.final_total)}
                            </p>
                            <p>
                              <span className="text-gray-500">AI Installer Type:</span>{" "}
                              {job.ai_recommended_installer_type || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">AI Distance Tier:</span>{" "}
                              {job.ai_distance_tier || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">AI Grouping:</span>{" "}
                              {job.ai_grouping_label || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">AI Route Hint:</span>{" "}
                              {job.ai_route_hint || "-"}
                            </p>
                            <p>
                              <span className="text-gray-500">Status:</span>{" "}
                              <span className={getStatusClass(job.status)}>
                                {job.status || "-"}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}