"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Customer = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  company_name?: string | null;
  preferred_service_type?: string | null;
  preferred_payment_method?: string | null;
  preferred_city?: string | null;
  role?: string | null;
};

type Booking = {
  id: string;
  job_id?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  final_total?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  installer_name?: string | null;
  installer_pay_status?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  incomplete_reason?: string | null;
};

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function money(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getServiceTypeLabel(job: Booking) {
  if (safeText(job.service_type_label)) return safeText(job.service_type_label);

  const value = safeText(job.service_type);

  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";

  return value || "-";
}

function getPickupWindow(job: Booking) {
  return (
    safeText(job.pickup_time_slot) ||
    safeText(job.scheduled_time) ||
    "-"
  );
}

function getDisplayStatus(job: Booking) {
  const status = normalizeText(job.status);

  if (!status) return "Pending";
  if (status === "available") return "Pending";
  if (status === "pending") return "Pending";
  if (status === "pending_payment") return "Pending Payment";
  if (status === "pending_rebook_payment") return "Pending Payment";
  if (status === "pending_rebook_review") return "Pending Review";
  if (status === "accepted") return "Assigned";
  if (status === "confirmed") return "Assigned";
  if (status === "assigned") return "In Progress";
  if (status === "in_progress") return "In Progress";
  if (status === "in progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "completed_pending_admin_review") return "Completed";
  if (status === "incomplete") return "Incomplete";
  if (status === "cancelled") return "Cancelled";
  if (status === "canceled") return "Cancelled";

  return status.replace(/_/g, " ");
}

function getStatusClass(job: Booking) {
  const label = getDisplayStatus(job);

  if (label === "Pending" || label === "Pending Payment" || label === "Pending Review") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }

  if (label === "Assigned" || label === "In Progress") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (label === "Completed") {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }

  if (label === "Incomplete") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (label === "Cancelled") {
    return "border-zinc-600 bg-zinc-700/30 text-zinc-300";
  }

  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getProgressStep(job: Booking) {
  const label = getDisplayStatus(job);

  if (label === "Pending" || label === "Pending Payment" || label === "Pending Review") return 1;
  if (label === "Assigned") return 2;
  if (label === "In Progress") return 3;
  if (label === "Completed") return 4;
  return 1;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
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

function StatusBadge({ job }: { job: Booking }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(job)}`}
    >
      {getDisplayStatus(job)}
    </span>
  );
}

function ProgressTracker({ job }: { job: Booking }) {
  const currentStep = getProgressStep(job);

  const steps = ["Pending", "Assigned", "In Progress", "Completed"];

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const active = currentStep >= stepNumber;

        return (
          <div
            key={step}
            className={`rounded-xl border p-3 text-center text-xs font-semibold ${
              active
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                : "border-zinc-800 bg-black text-zinc-500"
            }`}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/login");
      return;
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, company_name, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    const { data: customerRow } = await supabase
      .from("customers")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const mergedCustomer: Customer = {
      id: user.id,
      full_name:
        customerRow?.full_name ||
        profileRow?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        "",
      email:
        customerRow?.email ||
        profileRow?.email ||
        user.email ||
        "",
      phone:
        customerRow?.phone ||
        customerRow?.phone_number ||
        profileRow?.phone_number ||
        "",
      phone_number:
        customerRow?.phone_number ||
        customerRow?.phone ||
        profileRow?.phone_number ||
        "",
      company_name:
        customerRow?.company_name ||
        profileRow?.company_name ||
        "",
      preferred_service_type:
        customerRow?.preferred_service_type || "",
      preferred_payment_method:
        customerRow?.preferred_payment_method || "",
      preferred_city:
        customerRow?.preferred_city || "",
      role:
        customerRow?.role ||
        profileRow?.role ||
        "customer",
    };

    if ((mergedCustomer.role || "customer") !== "customer") {
      router.push("/login");
      return;
    }

    setCustomer(mergedCustomer);

    try {
      localStorage.setItem(
        "customerAiProfile",
        JSON.stringify({
          fullName: mergedCustomer.full_name || "",
          email: mergedCustomer.email || "",
          phone: mergedCustomer.phone || mergedCustomer.phone_number || "",
          company: mergedCustomer.company_name || "",
          preferredServiceType: mergedCustomer.preferred_service_type || "",
          preferredPaymentMethod: mergedCustomer.preferred_payment_method || "",
          preferredCity: mergedCustomer.preferred_city || "",
        })
      );

      localStorage.setItem(
        "lastCustomerProfile",
        JSON.stringify({
          customerName: mergedCustomer.full_name || "",
          customerEmail: mergedCustomer.email || "",
          companyName: mergedCustomer.company_name || "",
          phoneNumber: mergedCustomer.phone || mergedCustomer.phone_number || "",
        })
      );
    } catch (error) {
      console.error("LOCAL STORAGE CUSTOMER PROFILE ERROR:", error);
    }

    const possibleEmail = safeText(mergedCustomer.email);
    const possibleName = safeText(mergedCustomer.full_name);
    const possibleCompany = safeText(mergedCustomer.company_name);

    let bookingsQuery = supabase.from("bookings").select("*");

    const filters: string[] = [];
    if (possibleEmail) filters.push(`customer_email.eq.${possibleEmail}`);
    if (possibleName) filters.push(`customer_name.eq.${possibleName}`);
    if (possibleCompany) filters.push(`company_name.eq.${possibleCompany}`);

    if (filters.length > 0) {
      bookingsQuery = bookingsQuery.or(filters.join(","));
    }

    const { data: bookingsData, error: bookingsError } = await bookingsQuery
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("CUSTOMER BOOKINGS ERROR:", bookingsError);
      setBookings([]);
      setLoading(false);
      return;
    }

    setBookings((bookingsData as Booking[]) || []);
    setLoading(false);
  }

  function handleRebook(job: Booking) {
    router.push(`/rebook/${job.id}`);
  }

  function handleNewBooking() {
    router.push("/book");
  }

  const pendingJobs = useMemo(() => {
    return bookings.filter((job) => {
      const status = getDisplayStatus(job);
      return (
        status === "Pending" ||
        status === "Pending Payment" ||
        status === "Pending Review"
      );
    });
  }, [bookings]);

  const assignedJobs = useMemo(() => {
    return bookings.filter((job) => {
      const status = getDisplayStatus(job);
      return status === "Assigned" || status === "In Progress";
    });
  }, [bookings]);

  const completedJobs = useMemo(() => {
    return bookings.filter((job) => getDisplayStatus(job) === "Completed");
  }, [bookings]);

  const recentJobs = useMemo(() => bookings.slice(0, 8), [bookings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Loading dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold text-yellow-500">
            Welcome, {customer?.full_name || "Customer"}
          </h1>
          <p className="mt-2 text-gray-400">
            Track your jobs, rebook faster, and manage your account in one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={handleNewBooking}
            className="rounded-2xl bg-yellow-500 p-6 font-bold text-black transition hover:bg-yellow-400"
          >
            🚀 New Booking
          </button>

          <button
            onClick={() => router.push("/book")}
            className="rounded-2xl border border-yellow-500 p-6 font-bold text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
          >
            🔁 Rebook / Quick Booking
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="All Jobs" value={String(bookings.length)} />
          <MetricCard label="Pending" value={String(pendingJobs.length)} />
          <MetricCard label="Assigned / In Progress" value={String(assignedJobs.length)} />
          <MetricCard label="Completed" value={String(completedJobs.length)} />
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-semibold text-yellow-500">
                Your Profile
              </h2>

              <div className="space-y-2 text-gray-300">
                <p>Name: {customer?.full_name || "-"}</p>
                <p>Email: {customer?.email || "-"}</p>
                <p>Phone: {customer?.phone || customer?.phone_number || "-"}</p>
                <p>Company: {customer?.company_name || "-"}</p>
                <p>Preferred Service: {customer?.preferred_service_type || "-"}</p>
                <p>Preferred Payment: {customer?.preferred_payment_method || "-"}</p>
                <p>Preferred City: {customer?.preferred_city || "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-semibold text-yellow-500">
                Job Tracking Summary
              </h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Pending Jobs</p>
                  <p className="mt-2 text-xl font-bold text-yellow-400">
                    {pendingJobs.length}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Assigned / In Progress</p>
                  <p className="mt-2 text-xl font-bold text-blue-300">
                    {assignedJobs.length}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Completed Jobs</p>
                  <p className="mt-2 text-xl font-bold text-green-400">
                    {completedJobs.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-yellow-500">
                Recent Jobs
              </h2>

              <Link
                href="/book"
                className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
              >
                New Booking
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <p className="text-gray-400">No jobs yet.</p>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-zinc-800 bg-black p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-yellow-400">
                          {job.job_id || job.id}
                        </p>
                        <p className="mt-1 text-sm text-gray-300">
                          {getServiceTypeLabel(job)}
                        </p>
                      </div>

                      <StatusBadge job={job} />
                    </div>

                    <ProgressTracker job={job} />

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatDate(job.scheduled_date)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Pickup Window
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {getPickupWindow(job)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Total
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {money(job.final_total)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Pick Up
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {job.pickup_address || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Drop Off
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {job.dropoff_address || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Installer
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {job.installer_name || "Not assigned yet"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Payment
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {job.payment_method || "-"} / {job.payment_status || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Updated
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatDateTime(job.completed_at || job.created_at)}
                        </p>
                      </div>
                    </div>

                    {normalizeText(job.status) === "incomplete" ? (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                        Incomplete reason: {job.incomplete_reason || "-"}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleRebook(job)}
                        className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
                      >
                        Rebook This Job
                      </button>

                      <button
                        onClick={handleNewBooking}
                        className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
                      >
                        New Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}