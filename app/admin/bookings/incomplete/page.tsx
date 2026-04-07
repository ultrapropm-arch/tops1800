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
  admin_fee_note?: string | null;
  redo_requested?: boolean | null;
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

export default function IncompleteBookingsPage() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  const [returnFees, setReturnFees] = useState<Record<string, string>>({});
  const [mileageFees, setMileageFees] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [reassignedInstallers, setReassignedInstallers] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "incomplete")
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error loading incomplete jobs:", error);
      alert(error.message || "Could not load incomplete jobs.");
      setLoading(false);
      return;
    }

    const rows = (data as Booking[]) || [];
    setJobs(rows);

    const rf: Record<string, string> = {};
    const mf: Record<string, string> = {};
    const notes: Record<string, string> = {};
    const reassign: Record<string, string> = {};

    rows.forEach((j) => {
      rf[j.id] = String(j.return_fee ?? 0);
      mf[j.id] = String(j.mileage_fee ?? 0);
      notes[j.id] = j.admin_fee_note || "";
      reassign[j.id] = j.reassigned_installer_name || "";
    });

    setReturnFees(rf);
    setMileageFees(mf);
    setAdminNotes(notes);
    setReassignedInstallers(reassign);

    setLoading(false);
  }

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return jobs;

    return jobs.filter((job) => {
      return (
        (job.job_id || "").toLowerCase().includes(term) ||
        (job.id || "").toLowerCase().includes(term) ||
        (job.customer_name || "").toLowerCase().includes(term) ||
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
        (job.admin_fee_note || "").toLowerCase().includes(term)
      );
    });
  }, [jobs, search]);

  async function saveAdminChanges(job: Booking) {
    try {
      setSavingId(job.id);

      const res = await fetch(`/api/bookings/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_fee: Number(returnFees[job.id] || 0),
          mileage_fee: Number(mileageFees[job.id] || 0),
          admin_fee_note: adminNotes[job.id] || "",
          reassigned_installer_name: reassignedInstallers[job.id] || "",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Failed to save admin changes");
      }

      alert("Admin changes saved ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to save admin changes");
    } finally {
      setSavingId("");
    }
  }

  async function markReadyForRedo(job: Booking) {
    try {
      setSavingId(job.id);

      const res = await fetch(`/api/bookings/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redo_requested: true,
          status: "pending",
          installer_name: reassignedInstallers[job.id] || job.installer_name || "",
          admin_fee_note: adminNotes[job.id] || "",
          return_fee: Number(returnFees[job.id] || 0),
          mileage_fee: Number(mileageFees[job.id] || 0),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Failed to mark ready for redo");
      }

      alert("Job moved to pending redo ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to mark ready for redo");
    } finally {
      setSavingId("");
    }
  }

  async function reopenJob(job: Booking) {
    try {
      setSavingId(job.id);

      const res = await fetch(`/api/bookings/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "available",
          installer_name: "",
          redo_requested: true,
          admin_fee_note: adminNotes[job.id] || "",
          return_fee: Number(returnFees[job.id] || 0),
          mileage_fee: Number(mileageFees[job.id] || 0),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Failed to reopen job");
      }

      alert("Job reopened ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to reopen job");
    } finally {
      setSavingId("");
    }
  }

  async function markCompleted(job: Booking) {
    try {
      setSavingId(job.id);

      const res = await fetch(`/api/bookings/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          installer_pay_status: "ready",
          admin_fee_note: adminNotes[job.id] || "",
          return_fee: Number(returnFees[job.id] || 0),
          mileage_fee: Number(mileageFees[job.id] || 0),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Failed to mark completed");
      }

      alert("Marked completed ✅");
      await loadJobs();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Failed to mark completed");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="space-y-6 p-6 text-white">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-3xl font-bold text-yellow-500">
          Incomplete Jobs (Admin Control)
        </h1>
        <p className="mt-2 text-gray-400">
          Review incomplete jobs, adjust fees, add admin notes, reassign installers,
          and move jobs back into the workflow.
        </p>

        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job ID, customer, company, installer, reason..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-300">
          Loading incomplete jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-gray-300">
          No incomplete jobs found.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-yellow-400">
                    {job.company_name || job.customer_name || "Incomplete Job"}
                  </h2>

                  <div className="mt-2 space-y-1 text-sm text-gray-300">
                    <p>Job ID: {job.job_id || job.id}</p>
                    <p>Customer: {job.customer_name || "-"}</p>
                    <p>Phone: {job.phone_number || "-"}</p>
                    <p>Service: {job.service_type || "-"}</p>
                    <p>Date: {job.scheduled_date || "-"}</p>
                    <p>Pickup Window: {getPickupWindow(job)}</p>
                    <p>Pick Up: {job.pickup_address || "-"}</p>
                    <p>Drop Off: {job.dropoff_address || "-"}</p>
                    <p>Installer: {job.installer_name || "-"}</p>
                    <p>Status: {job.status || "-"}</p>
                    <p className="text-red-400">
                      Incomplete Reason: {job.incomplete_reason || "-"}
                    </p>
                    <p>Installer Note: {job.incomplete_note || "-"}</p>
                    <p>Payout Status: {job.installer_pay_status || "-"}</p>
                    <p className="font-semibold text-yellow-400">
                      Installer Pay: {money(job.installer_pay)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm">
                  <p className="text-gray-400">Current Charges</p>
                  <p className="mt-1 text-yellow-400">
                    Return Fee: {money(job.return_fee)}
                  </p>
                  <p className="text-yellow-400">
                    Mileage Fee: {money(job.mileage_fee)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <h3 className="text-lg font-semibold text-yellow-500">
                    Fee Controls
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={returnFees[job.id] || ""}
                      onChange={(e) =>
                        setReturnFees({
                          ...returnFees,
                          [job.id]: e.target.value,
                        })
                      }
                      placeholder="Return Fee"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                    />

                    <input
                      value={mileageFees[job.id] || ""}
                      onChange={(e) =>
                        setMileageFees({
                          ...mileageFees,
                          [job.id]: e.target.value,
                        })
                      }
                      placeholder="Mileage Fee"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <textarea
                    value={adminNotes[job.id] || ""}
                    onChange={(e) =>
                      setAdminNotes({
                        ...adminNotes,
                        [job.id]: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="Admin fee note / dispute note / explanation..."
                    className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <h3 className="text-lg font-semibold text-yellow-500">
                    Reassign / Redo Controls
                  </h3>

                  <input
                    value={reassignedInstallers[job.id] || ""}
                    onChange={(e) =>
                      setReassignedInstallers({
                        ...reassignedInstallers,
                        [job.id]: e.target.value,
                      })
                    }
                    placeholder="New installer name if reassigning"
                    className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                  />

                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                    <p>
                      Use this when the original installer is not available to
                      finish the job.
                    </p>
                    <p className="mt-1">
                      You can save the new installer name, then move the job back
                      to pending or available.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => void saveAdminChanges(job)}
                  disabled={savingId === job.id}
                  className="rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
                >
                  {savingId === job.id ? "Saving..." : "Save Admin Changes"}
                </button>

                <button
                  onClick={() => void markReadyForRedo(job)}
                  disabled={savingId === job.id}
                  className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  Move To Pending Redo
                </button>

                <button
                  onClick={() => void reopenJob(job)}
                  disabled={savingId === job.id}
                  className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  Reopen As Available
                </button>

                <button
                  onClick={() => void markCompleted(job)}
                  disabled={savingId === job.id}
                  className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-500 disabled:opacity-60"
                >
                  Mark Completed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}