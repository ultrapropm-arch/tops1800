"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const HST_RATE = 0.13;

type JobType = "service" | "estimate";
type JobStatus =
  | "new"
  | "open"
  | "contacted"
  | "scheduled"
  | "assigned"
  | "completed"
  | "closed"
  | "cancelled";

type HomeownerJob = {
  id: string;
  job_number?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  address?: string | null;
  city?: string | null;
  postal_code?: string | null;

  service_type?: string | null;
  service_price?: number | null;
  request_type?: JobType | null;
  status?: JobStatus | string | null;

  preferred_date?: string | null;
  preferred_time?: string | null;

  payment_method?: string | null;
  payment_status?: string | null;
  payment_amount?: number | null;

  scheduled_date?: string | null;
  scheduled_time?: string | null;
  is_urgent?: boolean | null;
  priority_note?: string | null;

  notes?: string | null;

  technician_name?: string | null;
  technician_phone?: string | null;
  technician_email?: string | null;
  technician_payout?: number | null;
  payout_status?: string | null;
  payout_notes?: string | null;
  company_profit?: number | null;

  completion_token?: string | null;
  completion_photo_url?: string | null;
  completion_notes?: string | null;
  completed_at?: string | null;

  calendar_event_id?: string | null;
  calendar_event_link?: string | null;
  calendar_status?: string | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  ai_route_note?: string | null;
  ai_priority_score?: number | null;
  ai_route_label?: string | null;
  ai_recommended_tech?: string | null;
  ai_urgency_label?: string | null;

  created_at?: string | null;
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function normalizeStatus(status?: string | null): JobStatus {
  if (!status) return "new";
  return status as JobStatus;
}

function isClosed(status?: string | null) {
  return ["completed", "closed", "cancelled"].includes(normalizeStatus(status));
}

function paymentLabel(value?: string | null) {
  if (value === "credit_debit") return "Card";
  if (value === "etransfer") return "E-Transfer";
  if (value === "cash_pickup") return "Cash Pickup";
  if (value === "no_payment_required") return "No Payment";
  if (value === "not_required") return "No Payment";
  return value || "-";
}

function calendarStatusLabel(value?: string | null) {
  if (value === "created") return "Created";
  if (value === "failed") return "Failed";
  return "Not Created";
}

function estimateServiceMinutes(service?: string | null) {
  const s = String(service || "").toLowerCase();

  if (s.includes("estimate") || s.includes("measure")) return 45;
  if (s.includes("remove stone")) return 180;
  if (s.includes("remove laminate")) return 120;
  if (s.includes("backsplash")) return 180;
  if (s.includes("sink cutout")) return 120;
  if (s.includes("cooktop")) return 120;
  if (s.includes("chip")) return 75;
  if (s.includes("silicone")) return 60;
  if (s.includes("seam")) return 90;
  if (s.includes("polish")) return 90;
  if (s.includes("plumbing")) return 90;

  return 90;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function preHstFromTotal(total?: number | null) {
  return Number(total || 0) / (1 + HST_RATE);
}

function hstFromTotal(total?: number | null) {
  return Number(total || 0) - preHstFromTotal(total);
}

function calcProfit(job: HomeownerJob) {
  return Number(job.payment_amount || 0) - Number(job.technician_payout || 0);
}

export default function HomeownerAdminPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<HomeownerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    | "all"
    | "open"
    | "closed"
    | "service"
    | "estimate"
    | "schedule"
    | "urgent"
    | "calendar"
    | "payouts"
    | "completed"
  >("open");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem("homeowner_admin_logged_in");

    if (loggedIn !== "true") {
      router.push("/homeowner-login");
      return;
    }

    loadJobs();
  }, [router]);

  async function loadJobs() {
  setLoading(true);

  const { data, error } = await supabase
    .from("homeowner_bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<HomeownerJob[]>();

  console.log("HOMEOWNER BOOKINGS:", data);
  console.log("HOMEOWNER BOOKINGS ERROR:", error);

  if (error) {
    console.error(error);
    alert("Error loading homeowner jobs. Check Supabase RLS/select policy.");
  } else {
    setJobs(data || []);
  }

  setLoading(false);
}

  async function updateJob(id: string, patch: Partial<HomeownerJob>) {
    setSavingId(id);

    const { error } = await supabase
      .from("homeowner_bookings")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Update failed.");
    } else {
      await loadJobs();
    }

    setSavingId(null);
  }

  async function deleteJob(id: string) {
    const confirmDelete = window.confirm(
      "Delete this homeowner job permanently from the platform?"
    );

    if (!confirmDelete) return;

    setSavingId(id);

    const { error } = await supabase
      .from("homeowner_bookings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Delete failed.");
    } else {
      await loadJobs();
    }

    setSavingId(null);
  }

  async function calculateDistance(job: HomeownerJob) {
    if (!job.address || !job.city) {
      alert("This job needs an address and city first.");
      return;
    }

    setSavingId(job.id);

    try {
      const res = await fetch("/api/homeowner-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originAddress: "Toronto, ON",
          destinationAddress: `${job.address}, ${job.city} ${
            job.postal_code || ""
          }`,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Distance calculation failed.");
        setSavingId(null);
        return;
      }

      const aiRes = await fetch("/api/homeowner-ai-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: job.service_type,
          timeline: job.preferred_date,
          approxSqft: "",
          oneWayKm: data.oneWayKm,
          city: job.city,
        }),
      });

      const aiData = await aiRes.json();

      await updateJob(job.id, {
        one_way_km: data.oneWayKm,
        round_trip_km: data.roundTripKm,
        ai_route_note: data.aiRouteNote,
        ai_route_label: aiData?.ai?.routeLabel || data.aiRouteNote,
        ai_recommended_tech: aiData?.ai?.installerType || "General Technician",
        ai_urgency_label: aiData?.ai?.urgencyLabel || "Standard",
        ai_priority_score: aiData?.ai?.aiScore || 50,
      });
    } catch (error) {
      console.error(error);
      alert("Distance / AI failed.");
      setSavingId(null);
    }
  }

  async function createCalendarForJob(job: HomeownerJob) {
    if (!job.scheduled_date) {
      alert("Add a scheduled date first.");
      return;
    }

    setSavingId(job.id);

    try {
      const res = await fetch("/api/homeowner-create-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  jobNumber: job.job_number || job.id.slice(0, 8).toUpperCase(),

  customerName: job.customer_name,
  customerEmail: job.customer_email,
  customerPhone: job.customer_phone,

  serviceType: job.service_type,

  address: job.address,
  city: job.city,

  scheduledDate: job.scheduled_date,
  scheduledTime: job.scheduled_time,

  notes: job.notes,
}),
      });

      const data = await res.json();

      if (!data.success) {
        await updateJob(job.id, { calendar_status: "failed" });
        alert(data.error || "Calendar event failed.");
        return;
      }

      await updateJob(job.id, {
        calendar_status: "created",
        calendar_event_id: data.eventId || null,
        calendar_event_link: data.eventLink || null,
      });

      alert("Calendar event created.");
    } catch (error) {
      console.error(error);
      await updateJob(job.id, { calendar_status: "failed" });
      alert("Calendar event failed.");
    }

    setSavingId(null);
  }

  async function sendInstallerAssignment(job: HomeownerJob) {
    const nameInput = document.getElementById(
      `tech-name-${job.id}`
    ) as HTMLInputElement;
    const phoneInput = document.getElementById(
      `tech-phone-${job.id}`
    ) as HTMLInputElement;
    const emailInput = document.getElementById(
      `tech-email-${job.id}`
    ) as HTMLInputElement;

    const technicianName = nameInput?.value || "";
    const technicianPhone = phoneInput?.value || "";
    const technicianEmail = emailInput?.value || "";

    if (!technicianName || !technicianEmail) {
      alert("Enter technician name and email first.");
      return;
    }

    setSavingId(job.id);

    try {
      const res = await fetch("/api/homeowner-installer-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobNumber: job.job_number || job.id.slice(0, 8).toUpperCase(),
          technicianName,
          technicianPhone,
          technicianEmail,
          serviceType: job.service_type,
          customerName: job.customer_name,
          customerPhone: job.customer_phone,
          address: job.address,
          city: job.city,
          scheduledDate: job.scheduled_date,
          scheduledTime: job.scheduled_time,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Could not send installer job link.");
        setSavingId(null);
        return;
      }

      alert("Installer job link sent successfully.");
      await loadJobs();
    } catch (error) {
      console.error(error);
      alert("Installer assignment failed.");
    }

    setSavingId(null);
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.toLowerCase();

      const matchesSearch =
        !q ||
        [
          job.job_number,
          job.customer_name,
          job.customer_email,
          job.customer_phone,
          job.address,
          job.city,
          job.service_type,
          job.technician_name,
          job.technician_email,
          job.scheduled_date,
          job.payment_status,
          job.payout_status,
          job.calendar_status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const type = job.request_type || "service";
      const closed = isClosed(job.status);
      const completed = normalizeStatus(job.status) === "completed";

      const matchesTab =
        tab === "all" ||
        (tab === "service" && type !== "estimate") ||
        (tab === "estimate" && type === "estimate") ||
        (tab === "open" && !closed) ||
        (tab === "closed" && closed) ||
        (tab === "completed" && completed) ||
        (tab === "schedule" && !!job.scheduled_date && !closed) ||
        (tab === "urgent" && !!job.is_urgent && !closed) ||
        (tab === "calendar" && !closed) ||
        (tab === "payouts" && completed);

      return matchesSearch && matchesTab;
    });
  }, [jobs, search, tab]);

  const openJobs = jobs.filter((j) => !isClosed(j.status));
  const urgentJobs = openJobs.filter((j) => j.is_urgent);
  const scheduledJobs = openJobs.filter((j) => j.scheduled_date);
  const todayJobs = scheduledJobs.filter((j) => j.scheduled_date === todayDate());
  const unscheduledJobs = openJobs.filter((j) => !j.scheduled_date);
  const completedJobs = jobs.filter((j) => normalizeStatus(j.status) === "completed");
  const calendarCreatedJobs = jobs.filter((j) => j.calendar_status === "created");

  const totalRevenue = jobs.reduce(
    (sum, job) => sum + Number(job.payment_amount || 0),
    0
  );
  const paidRevenue = jobs
    .filter((job) => job.payment_status === "paid")
    .reduce((sum, job) => sum + Number(job.payment_amount || 0), 0);
  const pendingRevenue = totalRevenue - paidRevenue;
  const totalPreHst = preHstFromTotal(totalRevenue);
  const totalHst = hstFromTotal(totalRevenue);

  const totalPayouts = jobs.reduce(
    (sum, job) => sum + Number(job.technician_payout || 0),
    0
  );
  const unpaidPayouts = jobs
    .filter((job) => job.payout_status !== "paid")
    .reduce((sum, job) => sum + Number(job.technician_payout || 0), 0);
  const totalProfit = jobs.reduce((sum, job) => sum + calcProfit(job), 0);

  const totalHours =
    Math.round(
      (openJobs.reduce(
        (sum, job) => sum + estimateServiceMinutes(job.service_type),
        0
      ) /
        60) *
        10
    ) / 10;

  const avgAiScore =
    openJobs.length > 0
      ? Math.round(
          openJobs.reduce(
            (sum, job) => sum + Number(job.ai_priority_score || 0),
            0
          ) / openJobs.length
        )
      : 0;

  const totalDistanceKm = openJobs.reduce(
    (sum, job) => sum + Number(job.round_trip_km || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
          <div>
            <p className="text-yellow-400 tracking-[0.35em] text-xs font-bold">
              1800TOPS
            </p>
            <h1 className="text-4xl font-black mt-2">Homeowner Admin</h1>
            <p className="text-zinc-400 mt-2">
              Homeowner jobs, calendar, urgent dispatch, AI route, technician
              assignment, payout, HST, and company income.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadJobs}
              className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold"
            >
              Refresh
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("homeowner_admin_logged_in");
                router.push("/homeowner-login");
              }}
              className="border border-white/20 px-6 py-3 rounded-xl font-bold"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="grid md:grid-cols-5 gap-4 mb-6">
          <div className="border border-green-500/30 rounded-2xl p-5 bg-green-500/10">
            <p className="text-green-300 text-sm">Total Homeowner Income</p>
            <p className="text-2xl font-black text-green-300">
              {money(totalRevenue)}
            </p>
          </div>

          <div className="border border-blue-500/30 rounded-2xl p-5 bg-blue-500/10">
            <p className="text-blue-300 text-sm">Paid Revenue</p>
            <p className="text-2xl font-black text-blue-300">
              {money(paidRevenue)}
            </p>
          </div>

          <div className="border border-yellow-500/30 rounded-2xl p-5 bg-yellow-500/10">
            <p className="text-yellow-300 text-sm">Pending Revenue</p>
            <p className="text-2xl font-black text-yellow-300">
              {money(pendingRevenue)}
            </p>
          </div>

          <div className="border border-orange-500/30 rounded-2xl p-5 bg-orange-500/10">
            <p className="text-orange-300 text-sm">HST Collected</p>
            <p className="text-2xl font-black text-orange-300">
              {money(totalHst)}
            </p>
            <p className="text-xs text-orange-200 mt-1">
              Pre-HST: {money(totalPreHst)}
            </p>
          </div>

          <div className="border border-purple-500/30 rounded-2xl p-5 bg-purple-500/10">
            <p className="text-purple-300 text-sm">Company Profit</p>
            <p className="text-2xl font-black text-purple-300">
              {money(totalProfit)}
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-7 gap-4 mb-6">
          <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950">
            <p className="text-zinc-400 text-sm">Total Jobs</p>
            <p className="text-3xl font-black">{jobs.length}</p>
          </div>

          <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950">
            <p className="text-zinc-400 text-sm">Open</p>
            <p className="text-3xl font-black">{openJobs.length}</p>
          </div>

          <div className="border border-red-500/30 rounded-2xl p-5 bg-red-500/10">
            <p className="text-red-300 text-sm">Urgent</p>
            <p className="text-3xl font-black text-red-300">
              {urgentJobs.length}
            </p>
          </div>

          <div className="border border-blue-500/30 rounded-2xl p-5 bg-blue-500/10">
            <p className="text-blue-300 text-sm">Today</p>
            <p className="text-3xl font-black text-blue-300">
              {todayJobs.length}
            </p>
          </div>

          <div className="border border-yellow-500/30 rounded-2xl p-5 bg-yellow-500/10">
            <p className="text-yellow-300 text-sm">Scheduled</p>
            <p className="text-3xl font-black text-yellow-300">
              {scheduledJobs.length}
            </p>
          </div>

          <div className="border border-green-500/30 rounded-2xl p-5 bg-green-500/10">
            <p className="text-green-300 text-sm">Calendar</p>
            <p className="text-3xl font-black text-green-300">
              {calendarCreatedJobs.length}
            </p>
          </div>

          <div className="border border-orange-500/30 rounded-2xl p-5 bg-orange-500/10">
            <p className="text-orange-300 text-sm">Unpaid Payouts</p>
            <p className="text-3xl font-black text-orange-300">
              {money(unpaidPayouts)}
            </p>
          </div>
        </section>

        <section className="border border-yellow-500/30 bg-yellow-500/10 rounded-2xl p-5 mb-6">
          <h2 className="text-2xl font-black text-yellow-300">
            AI Dispatch + Calendar Control Center
          </h2>

          <div className="grid md:grid-cols-3 gap-5 mt-5">
            <div className="bg-black/40 rounded-2xl p-5 border border-yellow-500/20">
              <p className="text-zinc-400 text-sm">Estimated Work Time</p>
              <p className="text-4xl font-black mt-2">{totalHours} hrs</p>
            </div>

            <div className="bg-black/40 rounded-2xl p-5 border border-blue-500/20">
              <p className="text-zinc-400 text-sm">AI Average Score</p>
              <p className="text-4xl font-black text-blue-300 mt-2">
                {avgAiScore}
              </p>
            </div>

            <div className="bg-black/40 rounded-2xl p-5 border border-green-500/20">
              <p className="text-zinc-400 text-sm">Route Distance</p>
              <p className="text-4xl font-black text-green-300 mt-2">
                {Math.round(totalDistanceKm)} km
              </p>
            </div>
          </div>

          <p className="text-white font-semibold mt-5">
            {totalHours >= 7
              ? "Full day. Keep this to 3–4 jobs max and group by distance."
              : totalHours >= 5
              ? "Good same-day route. Prioritize urgent and nearby jobs."
              : urgentJobs.length > 0
              ? "Urgent jobs exist. Prioritize those first."
              : "Light day. You can handle more homeowner bookings."}
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-4 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job #, name, phone, address, city, calendar, payout..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
          />

          <div className="grid grid-cols-10 gap-2">
            {(
              [
                "all",
                "open",
                "schedule",
                "calendar",
                "urgent",
                "completed",
                "payouts",
                "closed",
                "service",
                "estimate",
              ] as const
            ).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-xl px-2 py-3 text-[10px] font-bold border ${
                  tab === item
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-zinc-950 text-white border-zinc-800"
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="border border-zinc-800 rounded-2xl p-8 text-zinc-400">
            Loading homeowner bookings...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="border border-zinc-800 rounded-2xl p-8 text-zinc-400">
            No homeowner bookings found.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredJobs.map((job) => {
              const status = normalizeStatus(job.status);
              const requestType = job.request_type || "service";
              const closed = isClosed(status);
              const jobTotal = Number(job.payment_amount || 0);
              const jobPreHst = preHstFromTotal(jobTotal);
              const jobHst = hstFromTotal(jobTotal);
              const jobProfit = calcProfit(job);

              return (
                <div
                  key={job.id}
                  className={`border rounded-2xl p-5 ${
                    job.is_urgent
                      ? "border-red-500/50 bg-red-500/10"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="bg-zinc-800 text-white px-3 py-1 rounded-full text-xs font-bold">
                          JOB #
                          {job.job_number || job.id.slice(0, 8).toUpperCase()}
                        </span>

                        {job.is_urgent && (
                          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            URGENT
                          </span>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            requestType === "estimate"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {requestType === "estimate" ? "ESTIMATE" : "SERVICE"}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            closed
                              ? "bg-red-500/20 text-red-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            job.calendar_status === "created"
                              ? "bg-green-500/20 text-green-300"
                              : job.calendar_status === "failed"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          CALENDAR: {calendarStatusLabel(job.calendar_status)}
                        </span>
                      </div>

                      <h2 className="text-2xl font-black">
                        {job.service_type || "Homeowner Request"}
                      </h2>

                      <p className="text-zinc-400">
                        {job.customer_name || "No name"} ·{" "}
                        {job.customer_phone || "No phone"}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-zinc-400 text-sm">Customer Total</p>
                      <p className="text-2xl font-black text-green-300">
                        {money(job.payment_amount)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Pre-HST {money(jobPreHst)} · HST {money(jobHst)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 gap-4 mt-5 text-sm">
                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <p className="text-zinc-500">Customer</p>
                      <p>{job.customer_name || "-"}</p>
                      <p>{job.customer_email || "-"}</p>
                      <p>{job.customer_phone || "-"}</p>
                    </div>

                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <p className="text-zinc-500">Address</p>
                      <p>{job.address || "-"}</p>
                      <p>
                        {job.city || "-"} {job.postal_code || ""}
                      </p>
                    </div>

                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <p className="text-zinc-500">Schedule</p>
                      <p>Date: {job.scheduled_date || "Not scheduled"}</p>
                      <p>Time: {job.scheduled_time || "-"}</p>
                      <p>Preferred: {job.preferred_date || "-"}</p>
                    </div>

                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <p className="text-zinc-500">AI Route</p>
                      <p>One-way: {job.one_way_km || 0} km</p>
                      <p>Round-trip: {job.round_trip_km || 0} km</p>
                      <p>Score: {job.ai_priority_score || 0}</p>
                    </div>

                    <div className="bg-black rounded-xl p-4 border border-zinc-800">
                      <p className="text-zinc-500">Money</p>
                      <p>Total: {money(jobTotal)}</p>
                      <p>HST: {money(jobHst)}</p>
                      <p>Profit: {money(jobProfit)}</p>
                    </div>
                  </div>

                  <div className="mt-5 border border-zinc-800 rounded-xl p-4 bg-black">
                    <h3 className="font-black mb-3">
                      Schedule / Calendar / Priority
                    </h3>

                    <div className="grid md:grid-cols-4 gap-3">
                      <input
                        type="date"
                        defaultValue={job.scheduled_date || ""}
                        id={`schedule-date-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <input
                        placeholder="Time e.g. 9 AM - 11 AM"
                        defaultValue={job.scheduled_time || ""}
                        id={`schedule-time-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <input
                        placeholder="Priority note"
                        defaultValue={job.priority_note || ""}
                        id={`priority-note-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <button
                        disabled={savingId === job.id}
                        onClick={() => {
                          const dateInput = document.getElementById(
                            `schedule-date-${job.id}`
                          ) as HTMLInputElement;

                          const timeInput = document.getElementById(
                            `schedule-time-${job.id}`
                          ) as HTMLInputElement;

                          const noteInput = document.getElementById(
                            `priority-note-${job.id}`
                          ) as HTMLInputElement;

                          updateJob(job.id, {
                            scheduled_date: dateInput.value || null,
                            scheduled_time: timeInput.value,
                            priority_note: noteInput.value,
                            status: dateInput.value ? "scheduled" : status,
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-3 font-bold disabled:opacity-50"
                      >
                        Save Schedule
                      </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-3 mt-3">
                      <button
                        disabled={savingId === job.id}
                        onClick={() =>
                          updateJob(job.id, {
                            is_urgent: !job.is_urgent,
                            ai_urgency_label: !job.is_urgent
                              ? "Urgent"
                              : "Standard",
                          })
                        }
                        className={`rounded-xl px-4 py-3 font-bold ${
                          job.is_urgent
                            ? "bg-red-700 hover:bg-red-600"
                            : "bg-zinc-800 hover:bg-zinc-700"
                        }`}
                      >
                        {job.is_urgent ? "Remove Urgent" : "Mark Urgent"}
                      </button>

                      <button
                        disabled={savingId === job.id}
                        onClick={() => calculateDistance(job)}
                        className="bg-yellow-400 text-black hover:bg-yellow-300 rounded-xl px-4 py-3 font-bold disabled:opacity-50"
                      >
                        Calculate Distance + AI
                      </button>

                      <button
                        disabled={savingId === job.id}
                        onClick={() => createCalendarForJob(job)}
                        className="bg-green-600 hover:bg-green-500 rounded-xl px-4 py-3 font-bold disabled:opacity-50"
                      >
                        Create Calendar Event
                      </button>

                      <a
                        href={
                          job.calendar_event_link ||
                          "https://calendar.google.com/calendar/u/0/r"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 font-bold text-center"
                      >
                        Open Calendar
                      </a>
                    </div>

                    {(job.priority_note ||
                      job.ai_route_note ||
                      job.ai_recommended_tech) && (
                      <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                        <p className="text-yellow-300 font-bold">
                          AI / Priority Notes
                        </p>
                        <p className="text-sm text-zinc-300 mt-2">
                          Priority: {job.priority_note || "-"}
                        </p>
                        <p className="text-sm text-zinc-300">
                          Route: {job.ai_route_label || job.ai_route_note || "-"}
                        </p>
                        <p className="text-sm text-zinc-300">
                          Recommended: {job.ai_recommended_tech || "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border border-zinc-800 rounded-xl p-4 bg-black">
                    <h3 className="font-black mb-3">
                      Assign Technician + Send Completion Link
                    </h3>

                    <div className="grid md:grid-cols-4 gap-3">
                      <input
                        defaultValue={job.technician_name || ""}
                        placeholder="Technician name"
                        id={`tech-name-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <input
                        defaultValue={job.technician_phone || ""}
                        placeholder="Technician phone"
                        id={`tech-phone-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <input
                        defaultValue={job.technician_email || ""}
                        placeholder="Technician email"
                        id={`tech-email-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <button
                        disabled={savingId === job.id}
                        onClick={() => sendInstallerAssignment(job)}
                        className="bg-yellow-400 text-black hover:bg-yellow-300 rounded-xl px-4 py-3 font-bold disabled:opacity-50"
                      >
                        Send Job Link
                      </button>
                    </div>

                    {(job.technician_name || job.technician_email) && (
                      <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-zinc-300">
                        <p>
                          Assigned to:{" "}
                          <strong>{job.technician_name || "-"}</strong>
                        </p>
                        <p>Phone: {job.technician_phone || "-"}</p>
                        <p>Email: {job.technician_email || "-"}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border border-blue-500/20 rounded-xl p-4 bg-blue-500/10">
                    <h3 className="font-black mb-3 text-blue-300">
                      Payout / Company Profit
                    </h3>

                    <div className="grid md:grid-cols-5 gap-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={job.technician_payout || 0}
                        placeholder="Technician payout"
                        id={`payout-amount-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <select
                        defaultValue={job.payout_status || "unpaid"}
                        id={`payout-status-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="hold">Hold</option>
                      </select>

                      <input
                        defaultValue={job.payout_notes || ""}
                        placeholder="Payout notes"
                        id={`payout-notes-${job.id}`}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
                      />

                      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                        <p className="text-xs text-green-300">Profit</p>
                        <p className="font-black text-green-300">
                          {money(jobProfit)}
                        </p>
                      </div>

                      <button
                        disabled={savingId === job.id}
                        onClick={() => {
                          const payoutInput = document.getElementById(
                            `payout-amount-${job.id}`
                          ) as HTMLInputElement;

                          const statusInput = document.getElementById(
                            `payout-status-${job.id}`
                          ) as HTMLSelectElement;

                          const notesInput = document.getElementById(
                            `payout-notes-${job.id}`
                          ) as HTMLInputElement;

                          const payout = Number(payoutInput.value || 0);

                          updateJob(job.id, {
                            technician_payout: payout,
                            payout_status: statusInput.value,
                            payout_notes: notesInput.value,
                            company_profit: Number(job.payment_amount || 0) - payout,
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-3 font-bold disabled:opacity-50"
                      >
                        Save Payout
                      </button>
                    </div>
                  </div>

                  {job.completion_photo_url && (
                    <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                      <p className="font-bold text-green-300">
                        Completion Photo Uploaded
                      </p>

                      <p className="text-sm text-zinc-300 mt-1">
                        Completed at: {job.completed_at || "-"}
                      </p>

                      {job.completion_notes && (
                        <p className="text-sm text-zinc-300 mt-2 whitespace-pre-wrap">
                          Notes: {job.completion_notes}
                        </p>
                      )}

                      <a
                        href={job.completion_photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-xl bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-500"
                      >
                        View Completion Photo
                      </a>
                    </div>
                  )}

                  {job.notes && (
                    <div className="mt-4 bg-black border border-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-500 text-sm">Customer Notes</p>
                      <p className="whitespace-pre-wrap">{job.notes}</p>
                    </div>
                  )}

                  <div className="mt-5 grid md:grid-cols-8 gap-2">
                    <button
                      onClick={() => updateJob(job.id, { status: "open" })}
                      className="bg-zinc-800 hover:bg-zinc-700 rounded-xl py-3 font-bold"
                    >
                      Open
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "contacted" })}
                      className="bg-purple-600 hover:bg-purple-500 rounded-xl py-3 font-bold"
                    >
                      Contacted
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "scheduled" })}
                      className="bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-bold"
                    >
                      Scheduled
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "assigned" })}
                      className="bg-cyan-700 hover:bg-cyan-600 rounded-xl py-3 font-bold"
                    >
                      Assigned
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "completed" })}
                      className="bg-green-600 hover:bg-green-500 rounded-xl py-3 font-bold"
                    >
                      Completed
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "closed" })}
                      className="bg-zinc-700 hover:bg-zinc-600 rounded-xl py-3 font-bold"
                    >
                      Close
                    </button>

                    <button
                      onClick={() => updateJob(job.id, { status: "cancelled" })}
                      className="bg-orange-700 hover:bg-orange-600 rounded-xl py-3 font-bold"
                    >
                      Cancel
                    </button>

                    <button
                      disabled={savingId === job.id}
                      onClick={() => deleteJob(job.id)}
                      className="bg-red-700 hover:bg-red-600 rounded-xl py-3 font-bold disabled:opacity-50"
                    >
                      Delete
                    </button>
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