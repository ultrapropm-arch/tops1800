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

  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_total_pay?: number | null;
  installer_pay_status?: string | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;

  return_fee_installer_pay?: number | null;

  sqft?: number | null;
  job_size?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  waterfall_quantity?: number | null;
  outlet_plug_cutout_quantity?: number | null;
  disposal_responsibility?: string | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;
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

function getCityOnly(address?: string | null) {
  const value = safeText(address);
  if (!value) return "-";

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const provincePattern =
      /^(on|ontario|ab|alberta|bc|british columbia|mb|manitoba|nb|new brunswick|nl|newfoundland and labrador|ns|nova scotia|nt|northwest territories|nu|nunavut|pe|prince edward island|qc|quebec|sk|saskatchewan|yt|yukon)$/i;

    const countryPattern = /^(canada|usa|united states)$/i;

    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (
        provincePattern.test(part) ||
        countryPattern.test(part) ||
        /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(part)
      ) {
        continue;
      }
      return part;
    }

    return parts[parts.length - 2] || parts[0];
  }

  return parts[0] || value;
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return job.scheduled_time || "-";
}

function getServiceTypeLabel(job: Booking) {
  if (job.service_type_label) return job.service_type_label;

  const value = job.service_type;
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "installation_2cm") return "2cm Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getPayoutLines(job: Booking) {
  const lines: { label: string; amount: number }[] = [];

  if (
    Array.isArray(job.installer_payout_lines) &&
    job.installer_payout_lines.length > 0
  ) {
    return job.installer_payout_lines
      .map((line) => ({
        label: line.label || "Payout Line",
        amount: num(line.amount),
      }))
      .filter((line) => line.amount > 0);
  }

  if (num(job.installer_base_pay) > 0) {
    lines.push({
      label: "Base Install Pay",
      amount: num(job.installer_base_pay),
    });
  }

  if (num(job.installer_mileage_pay) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: num(job.installer_mileage_pay),
    });
  }

  if (num(job.installer_addon_pay) > 0) {
    lines.push({
      label: "Add-On Pay",
      amount: num(job.installer_addon_pay),
    });
  }

  if (num(job.installer_cut_polish_pay) > 0) {
    lines.push({
      label: "Cut / Polish Pay",
      amount: num(job.installer_cut_polish_pay),
    });
  }

  if (num(job.installer_sink_pay) > 0) {
    lines.push({
      label: "Sink / Reattach Pay",
      amount: num(job.installer_sink_pay),
    });
  }

  if (num(job.installer_other_pay) > 0) {
    lines.push({
      label: "Other Service Pay",
      amount: num(job.installer_other_pay),
    });
  }

  if (num(job.return_fee_installer_pay) > 0) {
    lines.push({
      label: "Return Visit Pay",
      amount: num(job.return_fee_installer_pay),
    });
  }

  return lines;
}

function getInstallerSubtotal(job: Booking) {
  const explicitSubtotal = num(job.installer_subtotal_pay);
  if (explicitSubtotal > 0) return explicitSubtotal;

  return (
    num(job.installer_base_pay) +
    num(job.installer_mileage_pay) +
    num(job.installer_addon_pay) +
    num(job.installer_cut_polish_pay) +
    num(job.installer_sink_pay) +
    num(job.installer_other_pay)
  );
}

function getInstallerHst(job: Booking) {
  const explicitHst = num(job.installer_hst_pay);
  if (explicitHst > 0) return explicitHst;

  return getInstallerSubtotal(job) * 0.13;
}

function getInstallerTotal(job: Booking) {
  const explicitTotal = num(job.installer_total_pay || job.installer_pay);
  if (explicitTotal > 0) return explicitTotal;

  return (
    getInstallerSubtotal(job) +
    getInstallerHst(job) +
    num(job.return_fee_installer_pay)
  );
}

function normalizeStatus(status?: string | null) {
  const value = safeText(status).toLowerCase();

  if (!value) return "new";
  if (value === "assigned") return "accepted";
  if (value === "accepted_by_installer") return "accepted";
  if (value === "in progress") return "in_progress";
  if (value === "in-progress") return "in_progress";
  return value;
}

function isAssignedStatus(status?: string | null) {
  const normalized = normalizeStatus(status);

  return (
    normalized === "accepted" ||
    normalized === "confirmed" ||
    normalized === "in_progress" ||
    normalized === "completed_pending_admin_review" ||
    normalized === "completed"
  );
}

function isIncompleteStatus(status?: string | null) {
  return normalizeStatus(status) === "incomplete";
}

function installerMatches(job: Booking, installerName: string) {
  const installer = installerName.trim().toLowerCase();
  if (!installer) return false;

  return (
    safeText(job.installer_name).toLowerCase() === installer ||
    safeText(job.reassigned_installer_name).toLowerCase() === installer
  );
}

export default function InstallerAssignedJobsPage() {
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
      .select(
        `
        id,
        job_id,
        customer_name,
        customer_email,
        company_name,
        phone_number,
        pickup_address,
        dropoff_address,
        service_type,
        service_type_label,
        scheduled_date,
        scheduled_time,
        pickup_time_slot,
        pickup_time_from,
        pickup_time_to,
        installer_name,
        reassigned_installer_name,
        installer_pay,
        installer_total_pay,
        installer_pay_status,
        status,
        job_group_id,
        job_number,
        incomplete_reason,
        incomplete_note,
        incomplete_notes,
        return_fee_installer_pay,
        sqft,
        job_size,
        one_way_km,
        round_trip_km,
        chargeable_km,
        add_on_services,
        just_services,
        side_note,
        waterfall_quantity,
        outlet_plug_cutout_quantity,
        disposal_responsibility,
        installer_base_pay,
        installer_mileage_pay,
        installer_addon_pay,
        installer_cut_polish_pay,
        installer_sink_pay,
        installer_other_pay,
        installer_subtotal_pay,
        installer_hst_pay,
        installer_payout_lines
        `
      )
      .eq("is_archived", false)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error loading assigned jobs:", error);
      alert(error.message || "Could not load assigned jobs.");
      setLoading(false);
      return;
    }

    setJobs((data as Booking[]) || []);
    setLoading(false);
  }

  const searchedJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = jobs.filter((job) => installerMatches(job, installerName));

    if (!term) return result;

    return result.filter((job) => {
      return (
        safeText(job.job_id).toLowerCase().includes(term) ||
        safeText(job.customer_name).toLowerCase().includes(term) ||
        safeText(job.customer_email).toLowerCase().includes(term) ||
        safeText(job.company_name).toLowerCase().includes(term) ||
        safeText(job.phone_number).toLowerCase().includes(term) ||
        safeText(job.pickup_address).toLowerCase().includes(term) ||
        safeText(job.dropoff_address).toLowerCase().includes(term) ||
        safeText(job.service_type).toLowerCase().includes(term) ||
        safeText(job.service_type_label).toLowerCase().includes(term) ||
        safeText(job.scheduled_date).toLowerCase().includes(term) ||
        safeText(job.scheduled_time).toLowerCase().includes(term) ||
        safeText(job.pickup_time_slot).toLowerCase().includes(term) ||
        safeText(job.status).toLowerCase().includes(term) ||
        safeText(job.incomplete_reason).toLowerCase().includes(term) ||
        safeText(job.incomplete_note).toLowerCase().includes(term) ||
        safeText(job.incomplete_notes).toLowerCase().includes(term) ||
        safeText(job.installer_pay_status).toLowerCase().includes(term)
      );
    });
  }, [jobs, installerName, search]);

  const activeJobs = useMemo(() => {
    return searchedJobs.filter((job) => isAssignedStatus(job.status));
  }, [searchedJobs]);

  const incompleteJobs = useMemo(() => {
    return searchedJobs.filter((job) => isIncompleteStatus(job.status));
  }, [searchedJobs]);

  const groupedActiveJobs = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    for (const job of activeJobs) {
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
            (sum, item) => sum + getInstallerTotal(item),
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
  }, [activeJobs]);

  const groupedIncompleteJobs = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    for (const job of incompleteJobs) {
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
            (sum, item) => sum + getInstallerTotal(item),
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
  }, [incompleteJobs]);

  const totalAssignedPay = useMemo(() => {
    return activeJobs.reduce((sum, item) => sum + getInstallerTotal(item), 0);
  }, [activeJobs]);

  const totalIncompletePay = useMemo(() => {
    return incompleteJobs.reduce((sum, item) => sum + getInstallerTotal(item), 0);
  }, [incompleteJobs]);

  function renderPayoutBox(job: Booking) {
    const payoutLines = getPayoutLines(job);
    const subtotal = getInstallerSubtotal(job);
    const hst = getInstallerHst(job);
    const total = getInstallerTotal(job);

    return (
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-3 text-sm font-semibold text-yellow-400">
          Payout Breakdown
        </p>

        {payoutLines.length > 0 ? (
          <div className="space-y-2 text-sm text-gray-300">
            {payoutLines.map((line) => (
              <div
                key={line.label}
                className="flex items-center justify-between"
              >
                <span>{line.label}</span>
                <span>{money(line.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            No payout line items found. Showing calculated totals below.
          </div>
        )}

        <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3 text-sm text-gray-300">
          <div className="flex items-center justify-between">
            <span>Subtotal Pay</span>
            <span>{money(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>HST Pay</span>
            <span>{money(hst)}</span>
          </div>

          <div className="flex items-center justify-between font-semibold text-yellow-400">
            <span>Total Payout</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-3xl font-bold text-yellow-500">My Assigned Jobs</h1>
        <p className="mt-2 text-gray-400">
          View your assigned jobs, installer payout per job, and incomplete follow-up jobs.
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
            placeholder="Search job ID, customer, company, address, date..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-300">Loading assigned jobs...</div>
      ) : !installerName.trim() ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Enter installer name to load your assigned jobs.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm text-gray-400">Assigned Jobs Total Payout</p>
              <p className="mt-2 text-3xl font-bold text-yellow-500">
                {money(totalAssignedPay)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm text-gray-400">Incomplete Jobs Total Payout</p>
              <p className="mt-2 text-3xl font-bold text-yellow-500">
                {money(totalIncompletePay)}
              </p>
            </div>
          </div>

          {groupedActiveJobs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
              No assigned jobs found.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActiveJobs.map((group) => (
                <div
                  key={group.groupKey}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-yellow-500">
                        {group.company_name || group.customer_name || "Assigned Job Group"}
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
                    {group.jobs.map((job) => {
                      return (
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
                            <p>Pick Up City: {getCityOnly(job.pickup_address)}</p>
                            <p>Drop Off City: {getCityOnly(job.dropoff_address)}</p>
                            <p>One-Way KM: {num(job.one_way_km).toFixed(2)}</p>
                            <p>Status: {job.status || "-"}</p>
                            <p>Payout Status: {job.installer_pay_status || "-"}</p>
                          </div>

                          {renderPayoutBox(job)}

                          <div className="mt-4 text-sm font-semibold text-yellow-400">
                            Open Job
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500">
              Incomplete Jobs
            </h2>
            <p className="mt-2 text-gray-400">
              These are jobs assigned to you that were marked incomplete and still need follow-up.
            </p>
          </div>

          {groupedIncompleteJobs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
              No incomplete jobs found.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedIncompleteJobs.map((group) => (
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
                    {group.jobs.map((job) => {
                      return (
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
                            <p>Pick Up City: {getCityOnly(job.pickup_address)}</p>
                            <p>Drop Off City: {getCityOnly(job.dropoff_address)}</p>
                            <p>One-Way KM: {num(job.one_way_km).toFixed(2)}</p>
                            <p>Status: {job.status || "-"}</p>
                            <p>Incomplete Reason: {job.incomplete_reason || "-"}</p>
                            <p>Note: {job.incomplete_notes || job.incomplete_note || "-"}</p>
                            <p>Payout Status: {job.installer_pay_status || "-"}</p>
                          </div>

                          {renderPayoutBox(job)}

                          <div className="mt-4 text-sm font-semibold text-yellow-400">
                            Open Incomplete Job
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}