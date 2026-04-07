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
  redo_requested?: boolean | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  admin_fee_note?: string | null;
  return_fee?: number | null;
  mileage_fee?: number | null;
  accepted_at?: string | null;
};

type Installer = {
  id: string;
  full_name?: string | null;
  status?: string | null;
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

export default function PendingBookingsPage() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  const [installerSelections, setInstallerSelections] = useState<
    Record<string, string>
  >({});
  const [dateSelections, setDateSelections] = useState<Record<string, string>>(
    {}
  );
  const [windowSelections, setWindowSelections] = useState<
    Record<string, string>
  >({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadJobs(), loadInstallers()]);
    setLoading(false);
  }

  async function loadJobs() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error loading pending bookings:", error);
      alert(error.message || "Could not load pending bookings.");
      return;
    }

    const rows = (data as Booking[]) || [];
    setJobs(rows);

    const installerMap: Record<string, string> = {};
    const dateMap: Record<string, string> = {};
    const windowMap: Record<string, string> = {};
    const noteMap: Record<string, string> = {};

    rows.forEach((job) => {
      installerMap[job.id] =
        job.reassigned_installer_name || job.installer_name || "";
      dateMap[job.id] = job.scheduled_date || "";
      windowMap[job.id] = job.pickup_time_slot || "";
      noteMap[job.id] = job.admin_fee_note || "";
    });

    setInstallerSelections(installerMap);
    setDateSelections(dateMap);
    setWindowSelections(windowMap);
    setAdminNotes(noteMap);
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

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) => {
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
        (job.installer_name || "").toLowerCase().includes(term) ||
        (job.reassigned_installer_name || "").toLowerCase().includes(term) ||
        (job.incomplete_reason || "").toLowerCase().includes(term) ||
        (job.incomplete_note || "").toLowerCase().includes(term) ||
        (job.admin_fee_note || "").toLowerCase().includes(term) ||
        ((job.redo_requested ? "redo" : "") || "").toLowerCase().includes(term)
      );
    });
  }, [jobs, search]);

  async function savePendingChanges(job: Booking) {
    try {
      setSavingId(job.id);

      const selectedInstaller = installerSelections[job.id] || "";
      const selectedDate = dateSelections[job.id] || "";
      const selectedWindow = windowSelections[job.id] || "";
      const selectedNote = adminNotes[job.id] || "";

      const supabase = createClient();

      const updateData: Record<string, unknown> = {
        scheduled_date: selectedDate || null,
        pickup_time_slot: selectedWindow || null,
        admin_fee_note: selectedNote || null,
        reassigned_installer_name: selectedInstaller || null,
      };

      if (selectedInstaller) {
        updateData.installer_name = selectedInstaller;
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message);
      }

      alert("Pending booking updated ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to update pending booking");
    } finally {
      setSavingId("");
    }
  }

  async function assignAndAccept(job: Booking) {
    try {
      setSavingId(job.id);

      const selectedInstaller = installerSelections[job.id] || "";
      const selectedDate = dateSelections[job.id] || job.scheduled_date || "";
      const selectedWindow =
        windowSelections[job.id] || job.pickup_time_slot || "";
      const selectedNote = adminNotes[job.id] || "";

      if (!selectedInstaller) {
        alert("Please choose an installer first.");
        setSavingId("");
        return;
      }

      const supabase = createClient();

      const { error } = await supabase
        .from("bookings")
        .update({
          installer_name: selectedInstaller,
          reassigned_installer_name: selectedInstaller,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          redo_requested: false,
          scheduled_date: selectedDate || null,
          pickup_time_slot: selectedWindow || null,
          admin_fee_note: selectedNote || null,
        })
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message);
      }

      alert("Installer assigned and job accepted ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to assign installer");
    } finally {
      setSavingId("");
    }
  }

  async function moveToAvailable(job: Booking) {
    try {
      setSavingId(job.id);

      const selectedDate = dateSelections[job.id] || job.scheduled_date || "";
      const selectedWindow =
        windowSelections[job.id] || job.pickup_time_slot || "";
      const selectedNote = adminNotes[job.id] || "";

      const supabase = createClient();

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "available",
          redo_requested: false,
          scheduled_date: selectedDate || null,
          pickup_time_slot: selectedWindow || null,
          admin_fee_note: selectedNote || null,
          installer_name: "",
        })
        .eq("id", job.id);

      if (error) {
        throw new Error(error.message);
      }

      alert("Job moved to available ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to move job to available");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold text-yellow-500">
            Pending Bookings
          </h1>
          <p className="mt-2 text-gray-300">
            Review pending jobs, including redo requests and customer “job ready”
            requests, then assign an installer or move the job back to available.
          </p>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job ID, customer, installer, service, reason..."
              className="w-full rounded-xl border border-zinc-700 bg-black p-4 text-white outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-300">
            Loading pending bookings...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-300">
            No pending bookings found.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <h2 className="mb-3 text-2xl font-semibold text-yellow-500">
                      {job.company_name || job.customer_name || "Pending Job"}
                    </h2>

                    <div className="space-y-2 text-sm text-gray-300">
                      <p>Job ID: {job.job_id || job.id}</p>
                      <p>Customer: {job.customer_name || "-"}</p>
                      <p>Email: {job.customer_email || "-"}</p>
                      <p>Phone: {job.phone_number || "-"}</p>
                      <p>Company: {job.company_name || "-"}</p>
                      <p>Pick Up: {job.pickup_address || "-"}</p>
                      <p>Drop Off: {job.dropoff_address || "-"}</p>
                      <p>Service Type: {job.service_type || "-"}</p>
                      <p>Scheduled Date: {job.scheduled_date || "-"}</p>
                      <p>Pickup Window: {getPickupWindow(job)}</p>
                      <p>Status: {job.status || "-"}</p>
                      <p>Redo Requested: {job.redo_requested ? "Yes" : "No"}</p>
                      <p>Original Installer: {job.installer_name || "-"}</p>
                      <p>
                        Reassigned Installer:{" "}
                        {job.reassigned_installer_name || "-"}
                      </p>
                      <p>Incomplete Reason: {job.incomplete_reason || "-"}</p>
                      <p>Incomplete Note: {job.incomplete_note || "-"}</p>
                      <p>Admin Fee Note: {job.admin_fee_note || "-"}</p>
                      <p>Return Fee: {money(job.return_fee)}</p>
                      <p>Mileage Fee: {money(job.mileage_fee)}</p>
                      <p>Installer Pay: {money(job.installer_pay)}</p>
                      <p>
                        Installer Payout Status: {job.installer_pay_status || "-"}
                      </p>
                      <p>Accepted At: {job.accepted_at || "-"}</p>
                    </div>
                  </div>

                  <div className="w-full xl:w-[460px]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm text-gray-400">
                          Assign / Reassign Installer
                        </label>
                        <select
                          value={installerSelections[job.id] || ""}
                          onChange={(e) =>
                            setInstallerSelections({
                              ...installerSelections,
                              [job.id]: e.target.value,
                            })
                          }
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
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-gray-400">
                          Scheduled Date
                        </label>
                        <input
                          type="date"
                          value={dateSelections[job.id] || ""}
                          onChange={(e) =>
                            setDateSelections({
                              ...dateSelections,
                              [job.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-gray-400">
                          Pickup Window
                        </label>
                        <input
                          type="text"
                          value={windowSelections[job.id] || ""}
                          onChange={(e) =>
                            setWindowSelections({
                              ...windowSelections,
                              [job.id]: e.target.value,
                            })
                          }
                          placeholder="Example: 9am - 12pm"
                          className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm text-gray-400">
                          Admin Note
                        </label>
                        <input
                          type="text"
                          value={adminNotes[job.id] || ""}
                          onChange={(e) =>
                            setAdminNotes({
                              ...adminNotes,
                              [job.id]: e.target.value,
                            })
                          }
                          placeholder="Add note about the redo / ready request"
                          className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void savePendingChanges(job)}
                        disabled={savingId === job.id}
                        className="rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {savingId === job.id ? "Saving..." : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void assignAndAccept(job)}
                        disabled={savingId === job.id}
                        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-500 disabled:opacity-60"
                      >
                        Assign & Accept
                      </button>

                      <button
                        type="button"
                        onClick={() => void moveToAvailable(job)}
                        disabled={savingId === job.id}
                        className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        Move To Available
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-700 p-4 text-sm text-gray-300">
                      <p className="mb-1">
                        Use this section for redo requests and customer “job ready”
                        requests.
                      </p>
                      <p className="mb-1">
                        Check the original installer first. If unavailable, choose
                        another installer and assign the job.
                      </p>
                      <p>
                        You can also save admin notes and update the requested date
                        and pickup window before pushing it forward.
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