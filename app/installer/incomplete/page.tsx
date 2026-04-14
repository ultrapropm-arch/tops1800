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
  service_type_label?: string | null;
  material_type?: string | null;
  material_size?: string | null;

  sqft?: number | null;
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

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_other_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;
  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;

  status?: string | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  incomplete_at?: string | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;
  mileage_fee?: number | null;
  redo_requested?: boolean | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  job_group_id?: string | number | null;
  job_number?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;

  ai_distance_tier?: string | null;
  ai_grouping_label?: string | null;
  ai_route_hint?: string | null;
  ai_urgency_label?: string | null;

  is_archived?: boolean | null;
};

type InstallerProfile = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  status?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  [key: string]: unknown;
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

function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: number | null) {
  return "$" + num(value).toFixed(2);
}

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function getNormalizedStatus(status?: string | null) {
  const value = normalizeText(status);

  if (!value) return "new";
  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "accepted_by_installer") return "accepted";
  if (value === "in progress" || value === "in-progress") return "in_progress";
  if (value === "completed_pending_admin_review") return "completed";
  if (value === "canceled") return "cancelled";

  return value;
}

function getServiceTypeLabel(job: Booking) {
  if (safeText(job.service_type_label)) return safeText(job.service_type_label);

  const value = safeText(job.service_type);
  if (!value) return "-";

  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "installation_2cm") return "2cm Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";

  return value;
}

function getPickupWindow(job: Booking) {
  if (safeText(job.pickup_time_slot)) {
    return safeText(job.pickup_time_slot);
  }

  const from = safeText(job.pickup_time_from);
  const to = safeText(job.pickup_time_to);

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return safeText(job.scheduled_time) || "-";
}

function getIncompleteNote(job: Booking) {
  return safeText(job.incomplete_notes) || safeText(job.incomplete_note) || "-";
}

function getDerivedInstallerPay(job: Booking) {
  if (num(job.installer_pay) > 0) return num(job.installer_pay);

  const subtotalAndHst = num(job.installer_subtotal_pay) + num(job.installer_hst_pay);
  if (subtotalAndHst > 0) return subtotalAndHst;

  if (Array.isArray(job.installer_payout_lines) && job.installer_payout_lines.length > 0) {
    return job.installer_payout_lines.reduce((sum, line) => sum + num(line.amount), 0);
  }

  return (
    num(job.installer_base_pay) +
    num(job.installer_mileage_pay) +
    num(job.installer_addon_pay) +
    num(job.installer_other_pay) +
    num(job.installer_cut_polish_pay) +
    num(job.installer_sink_pay)
  );
}

function getInstallerDisplayName(profile: InstallerProfile | null, fallbackEmail?: string | null) {
  if (!profile) return safeText(fallbackEmail || "");

  return (
    safeText(profile.installer_name as string | null) ||
    safeText(profile.full_name as string | null) ||
    safeText(profile.name as string | null) ||
    safeText(profile.business_name as string | null) ||
    safeText(profile.company_name as string | null) ||
    safeText(profile.email as string | null) ||
    safeText(fallbackEmail || "")
  );
}

function isMyIncompleteJob(job: Booking, installer: string) {
  const current = normalizeText(installer);
  if (!current) return false;

  const assigned =
    normalizeText(job.installer_name) === current ||
    normalizeText(job.reassigned_installer_name) === current;

  if (!assigned) return false;

  const status = getNormalizedStatus(job.status);
  const incompleteFlag = status === "incomplete" || !!job.incomplete_at;

  return job.is_archived !== true && incompleteFlag;
}

export default function InstallerIncompleteJobsPage() {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [installerName, setInstallerName] = useState("");
  const [search, setSearch] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    void bootPage();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && installerName.trim()) {
      localStorage.setItem("installerPortalName", installerName);
    }
  }, [installerName]);

  async function findInstallerProfile(userId: string, email?: string | null) {
    const supabase = createClient();

    const byUserId = await supabase
      .from("installer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!byUserId.error && byUserId.data) {
      return byUserId.data as InstallerProfile;
    }

    const byId = await supabase
      .from("installer_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return byId.data as InstallerProfile;
    }

    if (email) {
      const byEmail = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!byEmail.error && byEmail.data) {
        return byEmail.data as InstallerProfile;
      }
    }

    return null;
  }

  async function bootPage() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      const savedName =
        typeof window !== "undefined"
          ? localStorage.getItem("installerPortalName") || ""
          : "";

      if (authError || !user) {
        setInstallerName(savedName);
        setAuthChecked(true);
        await loadJobs();
        return;
      }

      const installerProfile = await findInstallerProfile(user.id, user.email);

      if (installerProfile) {
        const resolvedInstallerName = getInstallerDisplayName(installerProfile, user.email);

        const approvalValue = String(
          installerProfile.approval_status || installerProfile.status || ""
        )
          .trim()
          .toLowerCase();

        const isActiveValue = installerProfile.is_active;

        const approvalBlocked =
          (approvalValue && !["approved", "active"].includes(approvalValue)) ||
          isActiveValue === false;

        if (!approvalBlocked && resolvedInstallerName) {
          setInstallerName(resolvedInstallerName);

          if (!installerProfile.user_id && installerProfile.id === user.id) {
            const { error: backfillError } = await supabase
              .from("installer_profiles")
              .update({ user_id: user.id })
              .eq("id", user.id);

            if (backfillError) {
              console.error("INSTALLER PROFILE BACKFILL ERROR:", backfillError);
            }
          }
        } else {
          setInstallerName(savedName);
        }
      } else {
        setInstallerName(savedName || safeText(user.email || ""));
      }

      setAuthChecked(true);
      await loadJobs();
    } catch (error) {
      console.error("BOOT INCOMPLETE PAGE ERROR:", error);
      const savedName =
        typeof window !== "undefined"
          ? localStorage.getItem("installerPortalName") || ""
          : "";
      setInstallerName(savedName);
      setAuthChecked(true);
      await loadJobs();
    }
  }

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

    const safeJobs: Booking[] = ((data as Booking[]) || []).map((job) => ({
      ...job,
      installer_pay: getDerivedInstallerPay(job),
      installer_subtotal_pay: num(job.installer_subtotal_pay),
      installer_hst_pay: num(job.installer_hst_pay),
      installer_base_pay: num(job.installer_base_pay),
      installer_mileage_pay: num(job.installer_mileage_pay),
      installer_addon_pay: num(job.installer_addon_pay),
      installer_other_pay: num(job.installer_other_pay),
      installer_cut_polish_pay: num(job.installer_cut_polish_pay),
      installer_sink_pay: num(job.installer_sink_pay),
      return_fee: num(job.return_fee),
      return_fee_charged: num(job.return_fee_charged),
      return_fee_installer_pay: num(job.return_fee_installer_pay),
      mileage_fee: num(job.mileage_fee),
      one_way_km: num(job.one_way_km),
      round_trip_km: num(job.round_trip_km),
      chargeable_km: num(job.chargeable_km),
      sqft: num(job.sqft),
      job_size: num(job.job_size),
    }));

    setJobs(safeJobs);
    setLoading(false);
  }

  const filteredJobs = useMemo(() => {
    const installer = installerName.trim();
    const term = search.trim().toLowerCase();

    let result = jobs.filter((job) => isMyIncompleteJob(job, installer));

    if (!term) return result;

    return result.filter((job) => {
      return (
        safeText(job.job_id).toLowerCase().includes(term) ||
        safeText(job.customer_name).toLowerCase().includes(term) ||
        safeText(job.company_name).toLowerCase().includes(term) ||
        safeText(job.phone_number).toLowerCase().includes(term) ||
        safeText(job.pickup_address).toLowerCase().includes(term) ||
        safeText(job.dropoff_address).toLowerCase().includes(term) ||
        safeText(job.service_type).toLowerCase().includes(term) ||
        safeText(job.service_type_label).toLowerCase().includes(term) ||
        safeText(job.scheduled_date).toLowerCase().includes(term) ||
        safeText(job.pickup_time_slot).toLowerCase().includes(term) ||
        safeText(job.incomplete_reason).toLowerCase().includes(term) ||
        getIncompleteNote(job).toLowerCase().includes(term)
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
          const aNumber = num(a.job_number);
          const bNumber = num(b.job_number);
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
            (sum, item) => sum + getDerivedInstallerPay(item),
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
        ) : !authChecked && !installerName.trim() ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Checking installer access...
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
                        <p>Service: {getServiceTypeLabel(job)}</p>
                        <p>Date: {job.scheduled_date || "-"}</p>
                        <p>Pickup Window: {getPickupWindow(job)}</p>
                        <p>Pick Up: {job.pickup_address || "-"}</p>
                        <p>Drop Off: {job.dropoff_address || "-"}</p>
                        <p>Status: {getNormalizedStatus(job.status) || "-"}</p>
                        <p>Redo Requested: {job.redo_requested ? "Yes" : "No"}</p>
                        <p>Incomplete Reason: {job.incomplete_reason || "-"}</p>
                        <p>Incomplete Note: {getIncompleteNote(job)}</p>
                        <p>Return Fee: {money(job.return_fee_charged || job.return_fee)}</p>
                        <p>Mileage Fee: {money(job.mileage_fee)}</p>
                        <p>Payout Status: {job.installer_pay_status || "-"}</p>
                        <p className="font-semibold text-yellow-400">
                          Pay: {money(getDerivedInstallerPay(job))}
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