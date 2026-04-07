"use client";

export const dynamic = "force-dynamic";

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
  job_group_id?: string | number | null;
  job_number?: number | null;
  accepted_at?: string | null;
  redo_requested?: boolean | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  admin_fee_note?: string | null;
};

type Installer = {
  id: string;
  full_name?: string | null;
  status?: string | null;
};

type GroupedJobs = {
  groupKey: string;
  jobs: Booking[];
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) return [from, to].filter(Boolean).join(" - ");

  return job.scheduled_time || "-";
}

export default function AvailableBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [search, setSearch] = useState("");
  const [installerSelections, setInstallerSelections] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    void loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadBookings(), loadInstallers()]);
    setLoading(false);
  }

  async function loadBookings() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "available")
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading available bookings");
      return;
    }

    const rows = (data as Booking[]) || [];
    setBookings(rows);

    const map: Record<string, string> = {};
    rows.forEach((job) => {
      map[job.id] = job.installer_name || "";
    });
    setInstallerSelections(map);
  }

  async function loadInstallers() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("installers")
      .select("id, full_name, status")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error loading installers:", error);
      return;
    }

    setInstallers((data as Installer[]) || []);
  }

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return bookings;

    return bookings.filter((job) => {
      return (
        (job.job_id || "").toLowerCase().includes(term) ||
        (job.id || "").toLowerCase().includes(term) ||
        (job.customer_name || "").toLowerCase().includes(term) ||
        (job.customer_email || "").toLowerCase().includes(term) ||
        (job.company_name || "").toLowerCase().includes(term) ||
        (job.phone_number || "").toLowerCase().includes(term) ||
        (job.pickup_address || "").toLowerCase().includes(term) ||
        (job.dropoff_address || "").toLowerCase().includes(term) ||
        (job.service_type || "").toLowerCase().includes(term) ||
        (job.scheduled_date || "").toLowerCase().includes(term) ||
        (job.pickup_time_slot || "").toLowerCase().includes(term) ||
        (job.incomplete_reason || "").toLowerCase().includes(term) ||
        (job.incomplete_note || "").toLowerCase().includes(term) ||
        (job.admin_fee_note || "").toLowerCase().includes(term)
      );
    });
  }, [bookings, search]);

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    filteredBookings.forEach((job) => {
      const key = String(job.job_group_id || job.id);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(job);
    });

    return Array.from(groups.entries()).map(([groupKey, jobs]) => ({
      groupKey,
      jobs: [...jobs].sort(
        (a, b) => Number(a.job_number || 0) - Number(b.job_number || 0)
      ),
    }));
  }, [filteredBookings]);

  async function assignSingleJob(job: Booking) {
    const selectedInstaller = installerSelections[job.id] || "";

    if (!selectedInstaller) {
      alert("Please select an installer first.");
      return;
    }

    try {
      setSavingKey(job.id);

      const supabase = createClient();

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: selectedInstaller,
          reassigned_installer_name: selectedInstaller,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          redo_requested: false,
        })
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message);
      }

      alert("Installer assigned ✅");
      await loadBookings();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to assign installer");
    } finally {
      setSavingKey("");
    }
  }

  async function assignEntireGroup(group: GroupedJobs) {
    const selectedInstaller = installerSelections[group.jobs[0].id] || "";

    if (!selectedInstaller) {
      alert("Please select an installer first.");
      return;
    }

    try {
      setSavingKey(group.groupKey);

      const supabase = createClient();
      const ids = group.jobs.map((job) => job.id);

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: selectedInstaller,
          reassigned_installer_name: selectedInstaller,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          redo_requested: false,
        })
        .in("id", ids);

      if (error) {
        throw new Error(error.message);
      }

      alert("Group assigned ✅");
      await loadBookings();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to assign group");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold text-yellow-500">
            Available Bookings
          </h1>

          <p className="mt-2 text-gray-400">
            Jobs ready for installer acceptance or admin dispatch.
          </p>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job ID, customer, company, service, address..."
              className="w-full rounded-xl border border-zinc-700 bg-black p-4 text-white outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-300">
            Loading...
          </div>
        ) : groupedJobs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-400">
            No available bookings right now.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedJobs.map((group) => {
              const isGrouped = group.jobs.length > 1;
              const first = group.jobs[0];
              const groupPay = group.jobs.reduce(
                (sum, item) => sum + Number(item.installer_pay || 0),
                0
              );

              return (
                <div
                  key={group.groupKey}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-yellow-500">
                        {first.company_name || first.customer_name || "Job"}
                      </h2>

                      <div className="mt-2 space-y-1 text-sm text-gray-300">
                        <p>
                          Group ID: {String(first.job_group_id || first.id)}
                          {isGrouped ? ` • ${group.jobs.length} jobs` : ""}
                        </p>
                        <p>Customer: {first.customer_name || "-"}</p>
                        <p>Phone: {first.phone_number || "-"}</p>
                        <p>Date: {first.scheduled_date || "-"}</p>
                        <p>Redo Request: {first.redo_requested ? "Yes" : "No"}</p>
                      </div>
                    </div>

                    <div className="w-full md:w-[340px]">
                      <label className="mb-2 block text-sm text-gray-400">
                        Assign Installer
                      </label>

                      <select
                        value={installerSelections[first.id] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const next = { ...installerSelections };

                          group.jobs.forEach((job) => {
                            next[job.id] = value;
                          });

                          setInstallerSelections(next);
                        }}
                        className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                      >
                        <option value="">Select Installer</option>
                        {installers
                          .filter((installer) => installer.status !== "inactive")
                          .map((installer) => (
                            <option
                              key={installer.id}
                              value={installer.full_name || ""}
                            >
                              {installer.full_name || "Unnamed Installer"}
                            </option>
                          ))}
                      </select>

                      <div className="mt-3 rounded-xl border border-zinc-800 bg-black p-4 text-sm">
                        <p className="text-gray-400">Total Group Pay</p>
                        <p className="mt-1 text-xl font-semibold text-yellow-400">
                          {money(groupPay)}
                        </p>
                      </div>

                      {isGrouped ? (
                        <button
                          type="button"
                          onClick={() => void assignEntireGroup(group)}
                          disabled={savingKey === group.groupKey}
                          className="mt-3 w-full rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
                        >
                          {savingKey === group.groupKey
                            ? "Assigning..."
                            : "Assign Entire Group"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {group.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-zinc-800 bg-black p-5"
                      >
                        <h3 className="text-xl font-semibold text-yellow-400">
                          {job.job_number ? `Job ${job.job_number}` : "Job"}
                        </h3>

                        <div className="mt-3 space-y-1 text-sm text-gray-300">
                          <p>Job ID: {job.job_id || job.id}</p>
                          <p>Customer: {job.customer_name || "-"}</p>
                          <p>Company: {job.company_name || "-"}</p>
                          <p>Service: {job.service_type || "-"}</p>
                          <p>Date: {job.scheduled_date || "-"}</p>
                          <p>Pickup Window: {getPickupWindow(job)}</p>
                          <p>Pick Up: {job.pickup_address || "-"}</p>
                          <p>Drop Off: {job.dropoff_address || "-"}</p>
                          <p>Status: {job.status || "-"}</p>
                          <p>Redo Requested: {job.redo_requested ? "Yes" : "No"}</p>
                          <p>Incomplete Reason: {job.incomplete_reason || "-"}</p>
                          <p>Incomplete Note: {job.incomplete_note || "-"}</p>
                          <p>Admin Fee Note: {job.admin_fee_note || "-"}</p>
                          <p className="font-semibold text-yellow-400">
                            Pay: {money(job.installer_pay)}
                          </p>
                        </div>

                        {!isGrouped ? (
                          <>
                            <div className="mt-4">
                              <label className="mb-2 block text-sm text-gray-400">
                                Assign Installer
                              </label>
                              <select
                                value={installerSelections[job.id] || ""}
                                onChange={(e) =>
                                  setInstallerSelections({
                                    ...installerSelections,
                                    [job.id]: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
                              >
                                <option value="">Select Installer</option>
                                {installers
                                  .filter(
                                    (installer) => installer.status !== "inactive"
                                  )
                                  .map((installer) => (
                                    <option
                                      key={installer.id}
                                      value={installer.full_name || ""}
                                    >
                                      {installer.full_name || "Unnamed Installer"}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => void assignSingleJob(job)}
                              disabled={savingKey === job.id}
                              className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
                            >
                              {savingKey === job.id
                                ? "Assigning..."
                                : "Assign Installer"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}