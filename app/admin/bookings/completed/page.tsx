"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  scheduled_date?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
  return_fee?: number | null;
  mileage_fee?: number | null;
};

type GroupedJobs = {
  groupKey: string;
  jobs: Booking[];
  company_name: string;
  customer_name: string;
  phone_number: string;
  scheduled_date: string;
  installer_name: string;
  totalPay: number;
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) return [from, to].filter(Boolean).join(" - ");

  return "-";
}

export default function CompletedBookingsPage() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error(error);
      alert("Failed to load completed bookings");
      setLoading(false);
      return;
    }

    setJobs((data as Booking[]) || []);
    setLoading(false);
  }

  const filteredJobs = useMemo(() => {
    const term = search.toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) => {
      return (
        (job.customer_name || "").toLowerCase().includes(term) ||
        (job.company_name || "").toLowerCase().includes(term) ||
        (job.phone_number || "").toLowerCase().includes(term) ||
        (job.job_id || "").toLowerCase().includes(term)
      );
    });
  }, [jobs, search]);

  const groupedJobs = useMemo(() => {
    const map = new Map<string, Booking[]>();

    for (const job of filteredJobs) {
      const key = String(job.job_group_id || job.id);

      if (!map.has(key)) map.set(key, []);

      map.get(key)!.push(job);
    }

    return Array.from(map.entries()).map(([groupKey, groupJobs]) => {
      const first = groupJobs[0];

      return {
        groupKey,
        jobs: groupJobs,
        company_name: first?.company_name || "",
        customer_name: first?.customer_name || "",
        phone_number: first?.phone_number || "",
        scheduled_date: first?.scheduled_date || "",
        installer_name: first?.installer_name || "",
        totalPay: groupJobs.reduce(
          (sum, j) => sum + Number(j.installer_pay || 0),
          0
        ),
      };
    });
  }, [filteredJobs]);

  const totalRevenue = useMemo(() => {
    return jobs.reduce((sum, j) => sum + Number(j.installer_pay || 0), 0);
  }, [jobs]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold text-yellow-500">
            Completed Bookings
          </h1>

          <p className="mt-2 text-gray-400">
            All completed jobs + installer payouts
          </p>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Search customer, job id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3"
            />
          </div>

          <div className="mt-4 text-yellow-400 font-semibold">
            Total Installer Payout: {money(totalRevenue)}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-300">Loading...</div>
        ) : groupedJobs.length === 0 ? (
          <div className="text-gray-400">No completed jobs</div>
        ) : (
          groupedJobs.map((group) => (
            <div
              key={group.groupKey}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl text-yellow-500 font-semibold">
                    {group.company_name || group.customer_name}
                  </h2>

                  <p className="text-sm text-gray-400">
                    Installer: {group.installer_name || "-"}
                  </p>
                  <p className="text-sm text-gray-400">
                    Jobs: {group.jobs.length}
                  </p>
                </div>

                <div className="text-yellow-400 font-bold">
                  {money(group.totalPay)}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {group.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border border-zinc-800 rounded-xl p-4 bg-black"
                  >
                    <p className="text-yellow-400 font-semibold">
                      {job.job_id || job.id}
                    </p>

                    <div className="text-sm text-gray-300 space-y-1 mt-2">
                      <p>Customer: {job.customer_name}</p>
                      <p>Service: {job.service_type}</p>
                      <p>Date: {job.scheduled_date}</p>
                      <p>Pickup: {getPickupWindow(job)}</p>
                      <p>Return Fee: {money(job.return_fee)}</p>
                      <p>Mileage Fee: {money(job.mileage_fee)}</p>
                      <p>Payout Status: {job.installer_pay_status}</p>

                      <p className="text-yellow-400 font-semibold">
                        Pay: {money(job.installer_pay)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}