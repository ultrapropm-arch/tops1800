"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type OldJob = {
  id: string;
  archived_job_id?: string | null;
  original_booking_id?: string | null;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  status?: string | null;
  installer_pay?: number | null;
  company_profit?: number | null;
  archived_at?: string | null;
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function timeAgo(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(diffMs / 1000 / 60 / 60);
  const days = Math.floor(diffMs / 1000 / 60 / 60 / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getStatusClass(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "completed" || value === "completed_pending_admin_review") {
    return "text-green-400";
  }

  if (value === "incomplete") {
    return "text-red-400";
  }

  if (value === "paid") {
    return "text-blue-400";
  }

  return "text-gray-300";
}

export default function AdminOldJobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<OldJob[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadOldJobs();
  }, []);

  async function loadOldJobs() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("archived_jobs")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("OLD JOBS LOAD ERROR:", error);
      alert(error.message || "Could not load old jobs.");
      setLoading(false);
      return;
    }

    setJobs((data as OldJob[]) || []);
    setLoading(false);
  }

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) => {
      return (
        (job.archived_job_id || "").toLowerCase().includes(term) ||
        (job.original_booking_id || "").toLowerCase().includes(term) ||
        (job.job_id || "").toLowerCase().includes(term) ||
        (job.company_name || "").toLowerCase().includes(term) ||
        (job.customer_name || "").toLowerCase().includes(term) ||
        (job.installer_name || "").toLowerCase().includes(term) ||
        (job.status || "").toLowerCase().includes(term) ||
        (job.scheduled_date || "").toLowerCase().includes(term)
      );
    });
  }, [jobs, search]);

  const summary = useMemo(() => {
    const totalJobs = jobs.length;
    const totalPayout = jobs.reduce(
      (sum, job) => sum + Number(job.installer_pay || 0),
      0
    );
    const totalProfit = jobs.reduce(
      (sum, job) => sum + Number(job.company_profit || 0),
      0
    );

    return {
      totalJobs,
      totalPayout,
      totalProfit,
    };
  }, [jobs]);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-bold text-yellow-500">Old Jobs</h1>
            <p className="mt-3 max-w-3xl text-gray-300">
              View archived jobs only. This page is for completed older jobs and
              minimal stored history.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Archived Jobs</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {summary.totalJobs}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total Installer Payout</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {money(summary.totalPayout)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total Company Profit</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {money(summary.totalProfit)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job ID, company, customer, installer, date..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading old jobs...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No old jobs found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xl font-bold text-yellow-500">
                        {job.archived_job_id || job.job_id || job.original_booking_id || job.id}
                      </p>

                      <span className={`text-sm font-semibold ${getStatusClass(job.status)}`}>
                        {job.status || "-"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Company / Customer:</span>{" "}
                      {job.company_name || job.customer_name || "-"}
                    </p>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Scheduled Date:</span>{" "}
                      {job.scheduled_date || "-"}
                    </p>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Installer:</span>{" "}
                      {job.installer_name || "-"}
                    </p>

                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Archived:</span>{" "}
                      {job.archived_at ? timeAgo(job.archived_at) : "-"}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:w-[320px]">
                    <div className="rounded-xl border border-zinc-800 bg-black p-4">
                      <p className="text-sm text-gray-400">Installer Pay</p>
                      <p className="mt-1 text-lg font-bold text-yellow-500">
                        {money(job.installer_pay)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-black p-4">
                      <p className="text-sm text-gray-400">Company Profit</p>
                      <p className="mt-1 text-lg font-bold text-yellow-500">
                        {money(job.company_profit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}