"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  customer_email?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  scheduled_date?: string | null;
  pickup_time_slot?: string | null;
  status?: string | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
};

export default function JobReadyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl">Loading...</div>
        </main>
      }
    >
      <JobReadyPageContent />
    </Suspense>
  );
}

function JobReadyPageContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [job, setJob] = useState<Booking | null>(null);

  const [isJobReady, setIsJobReady] = useState("yes");
  const [pickupWindow, setPickupWindow] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  useEffect(() => {
    if (jobId) {
      void loadJob();
    } else {
      setLoading(false);
    }
  }, [jobId]);

  async function loadJob() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, job_id, customer_name, company_name, customer_email, phone_number, pickup_address, dropoff_address, service_type, scheduled_date, pickup_time_slot, status, incomplete_reason, incomplete_note"
      )
      .eq("id", jobId)
      .maybeSingle<Booking>();

    if (error || !data) {
      console.error("Error loading job-ready booking:", error);
      setLoading(false);
      return;
    }

    setJob(data);
    setPickupWindow(data.pickup_time_slot || "");
    setLoading(false);
  }

  async function submitReadyRequest() {
    if (!job) return;

    if (isJobReady !== "yes") {
      alert("Please click this button when the job is ready.");
      return;
    }

    if (!pickupWindow.trim()) {
      alert("Please enter a pickup window.");
      return;
    }

    setSaving(true);

    try {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h2>Job Ready Request Submitted</h2>
          <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
          <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
          <p><strong>Customer Name:</strong> ${job.customer_name || "-"}</p>
          <p><strong>Email:</strong> ${job.customer_email || "-"}</p>
          <p><strong>Phone:</strong> ${job.phone_number || "-"}</p>
          <p><strong>Service:</strong> ${job.service_type || "-"}</p>
          <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
          <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
          <p><strong>Requested Pickup Window:</strong> ${pickupWindow}</p>
          <p><strong>Customer Note:</strong> ${customerNote || "-"}</p>
          <p><strong>Next Step:</strong> Check original installer first. If unavailable, assign another installer.</p>
        </div>
      `;

      const customerHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h2>We Received Your Job Ready Request</h2>
          <p>Hello ${job.customer_name || "Customer"},</p>
          <p>We received your request to continue your incomplete job.</p>
          <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
          <p><strong>Requested Pickup Window:</strong> ${pickupWindow}</p>
          <p><strong>Your Note:</strong> ${customerNote || "-"}</p>
          <p>Our admin team will review your request and check the original installer first.</p>
        </div>
      `;

      await fetch(`/api/bookings/${job.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redo_requested: true,
          admin_fee_note: customerNote.trim()
            ? `Customer ready note: ${customerNote.trim()}`
            : "Customer marked job ready",
        }),
      });

      await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "ultrapropm@gmail.com",
          subject: `Job Ready Request - ${job.job_id || job.id}`,
          type: "resume_request",
          html: adminHtml,
        }),
      });

      if (job.customer_email) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: job.customer_email,
            subject: `We Received Your Job Ready Request - ${job.job_id || job.id}`,
            type: "resume_request",
            html: customerHtml,
          }),
        });
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Job ready request error:", error);
      alert("Could not submit request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-4xl font-bold text-yellow-500">
            Job Ready Request
          </h1>
          <p className="mt-2 text-gray-300">
            Use this form when your incomplete job is ready to continue. Do not
            create a new booking.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading job...
          </div>
        ) : !job ? (
          <div className="rounded-2xl border border-red-500 bg-zinc-900 p-6 text-red-300">
            Job not found. Please check your email link or contact admin.
          </div>
        ) : submitted ? (
          <div className="rounded-2xl border border-green-600 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold text-green-400">
              Request Submitted ✅
            </h2>
            <p className="mt-3 text-gray-300">
              We received your request. Admin will review it and check the
              original installer first.
            </p>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-300">
              <p>Job ID: {job.job_id || job.id}</p>
              <p>Requested Pickup Window: {pickupWindow}</p>
              <p>Note: {customerNote || "-"}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold text-yellow-500">
                Job Details
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Info label="Job ID" value={job.job_id || job.id} />
                <Info
                  label="Customer / Company"
                  value={job.company_name || job.customer_name || "-"}
                />
                <Info label="Customer Name" value={job.customer_name || "-"} />
                <Info label="Phone" value={job.phone_number || "-"} />
                <Info label="Service" value={job.service_type || "-"} />
                <Info label="Last Date" value={job.scheduled_date || "-"} />
                <Info label="Pick Up" value={job.pickup_address || "-"} />
                <Info label="Drop Off" value={job.dropoff_address || "-"} />
                <Info
                  label="Previous Incomplete Reason"
                  value={job.incomplete_reason || "-"}
                />
                <Info
                  label="Previous Incomplete Note"
                  value={job.incomplete_note || "-"}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-semibold text-yellow-500">
                Confirm Job Is Ready
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Is the job ready now?
                  </label>
                  <select
                    value={isJobReady}
                    onChange={(e) => setIsJobReady(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Preferred Pickup Window
                  </label>
                  <input
                    type="text"
                    value={pickupWindow}
                    onChange={(e) => setPickupWindow(e.target.value)}
                    placeholder="Example: 9am - 12pm or Friday morning"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Notes
                  </label>
                  <textarea
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    rows={4}
                    placeholder="Add any note for admin..."
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-300">
                  Please submit this at least 3 days before the requested pickup
                  window when possible. Admin will review and arrange the next
                  step.
                </div>

                <button
                  type="button"
                  onClick={() => void submitReadyRequest()}
                  disabled={saving}
                  className="w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Submit Job Ready Request"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-white">{value || "-"}</p>
    </div>
  );
}