"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  material_type?: string | null;
  material_size?: string | null;
  job_size?: number | null;
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
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  return_fee?: number | null;
  mileage_fee?: number | null;
  redo_requested?: boolean | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
};

type GroupedJobs = {
  groupKey: string;
  jobs: Booking[];
  company_name: string;
  customer_name: string;
  phone_number: string;
  scheduled_date: string;
  totalPay: number;
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) {
    return job.pickup_time_slot;
  }

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return job.scheduled_time || "-";
}

export default function InstallerIncompleteJobsPage() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [installerName, setInstallerName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("installerPortalName") || "";
    setInstallerName(savedName);
  }, []);

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    localStorage.setItem("installerPortalName", installerName);
  }, [installerName]);

  async function loadJobs() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error loading incomplete installer jobs:", error);
      alert(error.message || "Could not load incomplete jobs.");
      setLoading(false);
      return;
    }

    setJobs((data as Booking[]) || []);
    setLoading(false);
  }

  const filteredJobs = useMemo(() => {
    const installer = installerName.trim().toLowerCase();
    const term = search.trim().toLowerCase();

    let result = jobs.filter((job) => {
      const assignedToInstaller =
        installer !== "" &&
        (
          (job.installer_name || "").trim().toLowerCase() === installer ||
          (job.reassigned_installer_name || "").trim().toLowerCase() === installer
        );

      const status = (job.status || "").toLowerCase();

      return assignedToInstaller && status === "incomplete";
    });

    if (!term) return result;

    return result.filter((job) => {
      return (
        (job.job_id || "").toLowerCase().includes(term) ||
        (job.customer_name || "").toLowerCase().includes(term) ||
        (job.company_name || "").toLowerCase().includes(term) ||
        (job.phone_number || "").toLowerCase().includes(term) ||
        (job.pickup_address || "").toLowerCase().includes(term) ||
        (job.dropoff_address || "").toLowerCase().includes(term) ||
        (job.service_type || "").toLowerCase().includes(term) ||
        (job.scheduled_date || "").toLowerCase().includes(term) ||
        (job.pickup_time_slot || "").toLowerCase().includes(term) ||
        (job.incomplete_reason || "").toLowerCase().includes(term) ||
        (job.incomplete_note || "").toLowerCase().includes(term)
      );
    });
  }, [jobs, installerName, search]);

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    for (const job of filteredJobs) {
      const key = String(job.job_group_id || job.id);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(job);
    }

    const result: GroupedJobs[] = Array.from(groups.entries()).map(
      ([groupKey, groupJobs]) => {
        const sortedJobs = [...groupJobs].sort((a, b) => {
          const aNumber = Number(a.job_number || 0);
          const bNumber = Number(b.job_number || 0);
          return aNumber - bNumber;
        });

        const firstJob = sortedJobs[0];

        return {
          groupKey,
          jobs: sortedJobs,
          company_name: firstJob?.company_name || "",
          customer_name: firstJob?.customer_name || "",
          phone_number: firstJob?.phone_number || "",
          scheduled_date: firstJob?.scheduled_date || "",
          totalPay: sortedJobs.reduce(
            (sum, item) => sum + Number(item.installer_pay || 0),
            0
          ),
        };
      }
    );

    return result.sort((a, b) => {
      const aDate = new Date(a.scheduled_date || "").getTime() || 0;
      const bDate = new Date(b.scheduled_date || "").getTime() || 0;
      return aDate - bDate;
    });
  }, [filteredJobs]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold text-yellow-500">
            My Incomplete Jobs
          </h1>
          <p className="mt-2 text-gray-400">
            Jobs assigned to you that were marked incomplete and still need follow-up.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <input
              type="text"
              value={installerName}
              onChange={(e) => setInstallerName(e.target.value)}
              placeholder="Enter installer name"
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, job ID, address, reason..."
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading incomplete jobs...
          </div>
        ) : !installerName.trim() ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Enter installer name to load your incomplete jobs.
          </div>
        ) : groupedJobs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No incomplete jobs found.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedJobs.map((group) => (
              <div
                key={group.groupKey}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-yellow-500">
                      {group.company_name || group.customer_name || "Incomplete Job Group"}
                    </h2>
                    <div className="mt-2 space-y-1 text-sm text-gray-300">
                      <p>Customer: {group.customer_name || "-"}</p>
                      <p>Phone: {group.phone_number || "-"}</p>
                      <p>Date: {group.scheduled_date || "-"}</p>
                      <p>Jobs in Group: {group.jobs.length}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm">
                    <p className="text-gray-400">Total Group Pay</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-400">
                      {money(group.totalPay)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {group.jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={"/installer/jobs/" + job.id}
                      className="block rounded-2xl border border-zinc-800 bg-black p-6 transition hover:border-yellow-500 hover:bg-zinc-950"
                    >
                      <h3 className="text-xl font-semibold text-yellow-500">
                        {job.job_number ? `Job ${job.job_number}` : "Job"}
                      </h3>

                      <div className="mt-3 space-y-2 text-sm text-gray-300">
                        <p>Job ID: {job.job_id || job.id}</p>
                        <p>Customer: {job.customer_name || "-"}</p>
                        <p>Phone: {job.phone_number || "-"}</p>
                        <p>Service: {job.service_type || "-"}</p>
                        <p>Date: {job.scheduled_date || "-"}</p>
                        <p>Pickup Window: {getPickupWindow(job)}</p>
                        <p>Pick Up: {job.pickup_address || "-"}</p>
                        <p>Drop Off: {job.dropoff_address || "-"}</p>
                        <p>Status: {job.status || "-"}</p>
                        <p>Redo Requested: {job.redo_requested ? "Yes" : "No"}</p>
                        <p>Incomplete Reason: {job.incomplete_reason || "-"}</p>
                        <p>Incomplete Note: {job.incomplete_note || "-"}</p>
                        <p>Return Fee: {money(job.return_fee)}</p>
                        <p>Mileage Fee: {money(job.mileage_fee)}</p>
                        <p>Payout Status: {job.installer_pay_status || "-"}</p>
                        <p className="font-semibold text-yellow-400">
                          Pay: {money(job.installer_pay)}
                        </p>
                      </div>

                      <div className="mt-4 text-sm font-semibold text-yellow-400">
                        Open Job
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}