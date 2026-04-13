"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Installer = {
  id: string;
  user_id?: string | null;

  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;

  email?: string | null;
  phone?: string | null;

  business_name?: string | null;
  legal_payout_name?: string | null;

  street_address?: string | null;
  unit?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;

  years_experience?: number | null;
  service_area?: string | null;
  vehicle_type?: string | null;
  max_travel_km?: number | null;

  has_tools?: boolean | null;
  has_truck?: boolean | null;
  has_helper?: boolean | null;

  payout_method?: string | null;
  etransfer_email?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;

  approval_status?: string | null;
  status?: string | null;
  is_active?: boolean | null;

  created_at?: string | null;
};

type ApprovalStatus = "approved" | "rejected" | "pending";
type FilterValue = "all" | "approved" | "rejected" | "pending" | "active" | "inactive";

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function yesNo(value?: boolean | null) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

function getInstallerName(item: Installer) {
  return (
    safeText(item.installer_name) ||
    safeText(item.full_name) ||
    safeText(item.name) ||
    "Unnamed"
  );
}

function getBusinessName(item: Installer) {
  return safeText(item.business_name) || "-";
}

function getAddress(item: Installer) {
  return [
    safeText(item.street_address),
    safeText(item.unit),
    safeText(item.city),
    safeText(item.province),
    safeText(item.postal_code),
    safeText(item.country),
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeApprovalStatus(item: Installer): ApprovalStatus {
  const approval = normalizeText(item.approval_status);
  const status = normalizeText(item.status);

  if (approval === "approved" || approval === "active") return "approved";
  if (approval === "rejected") return "rejected";
  if (approval === "pending") return "pending";

  if (status === "approved" || status === "active") return "approved";
  if (status === "rejected") return "rejected";

  return "pending";
}

function isInstallerActive(item: Installer) {
  if (item.is_active === true) return true;
  return normalizeText(item.status) === "active";
}

function statusColor(status?: string | null) {
  const s = String(status || "pending").toLowerCase();

  if (s === "approved" || s === "active") return "text-green-400";
  if (s === "rejected") return "text-red-400";
  return "text-yellow-400";
}

function StatCard({
  label,
  value,
  className = "text-yellow-500",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

export default function AdminInstallersPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    void loadInstallers();
  }, []);

  async function loadInstallers() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("installer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD INSTALLERS ERROR:", error);
      alert(error.message || "Error loading installers");
      setInstallers([]);
      setLoading(false);
      return;
    }

    setInstallers((data as Installer[]) || []);
    setLoading(false);
  }

  async function updateInstallerFields(
    id: string,
    payload: Partial<Installer>
  ) {
    setUpdatingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("installer_profiles")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("UPDATE INSTALLER ERROR:", error);
      alert(error.message || "Update failed");
      setUpdatingId("");
      return;
    }

    setInstallers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...payload,
            }
          : item
      )
    );

    setUpdatingId("");
  }

  async function updateApprovalStatus(
    id: string,
    nextStatus: ApprovalStatus
  ) {
    const isApproved = nextStatus === "approved";

    await updateInstallerFields(id, {
      approval_status: nextStatus,
      status: nextStatus === "approved" ? "active" : nextStatus,
      is_active: isApproved,
    });
  }

  async function toggleActive(item: Installer) {
    const nextIsActive = !isInstallerActive(item);

    await updateInstallerFields(item.id, {
      is_active: nextIsActive,
      status: nextIsActive ? "active" : "inactive",
    });
  }

  const filteredInstallers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return installers.filter((item) => {
      const approval = normalizeApprovalStatus(item);
      const active = isInstallerActive(item);

      if (filter === "approved" && approval !== "approved") return false;
      if (filter === "rejected" && approval !== "rejected") return false;
      if (filter === "pending" && approval !== "pending") return false;
      if (filter === "active" && !active) return false;
      if (filter === "inactive" && active) return false;

      if (!term) return true;

      return (
        getInstallerName(item).toLowerCase().includes(term) ||
        safeText(item.email).toLowerCase().includes(term) ||
        safeText(item.phone).toLowerCase().includes(term) ||
        safeText(item.business_name).toLowerCase().includes(term) ||
        safeText(item.legal_payout_name).toLowerCase().includes(term) ||
        safeText(item.service_area).toLowerCase().includes(term) ||
        safeText(item.vehicle_type).toLowerCase().includes(term) ||
        safeText(item.payout_method).toLowerCase().includes(term) ||
        safeText(item.etransfer_email).toLowerCase().includes(term) ||
        safeText(item.bank_name).toLowerCase().includes(term) ||
        safeText(item.account_holder_name).toLowerCase().includes(term) ||
        getAddress(item).toLowerCase().includes(term) ||
        safeText(item.user_id).toLowerCase().includes(term) ||
        normalizeText(item.approval_status).includes(term) ||
        normalizeText(item.status).includes(term)
      );
    });
  }, [installers, search, filter]);

  const summary = useMemo(() => {
    const approved = installers.filter(
      (item) => normalizeApprovalStatus(item) === "approved"
    ).length;

    const rejected = installers.filter(
      (item) => normalizeApprovalStatus(item) === "rejected"
    ).length;

    const pending = installers.filter(
      (item) => normalizeApprovalStatus(item) === "pending"
    ).length;

    const active = installers.filter((item) => isInstallerActive(item)).length;

    const inactive = installers.filter((item) => !isInstallerActive(item)).length;

    return {
      total: installers.length,
      approved,
      rejected,
      pending,
      active,
      inactive,
    };
  }, [installers]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-4xl font-bold text-yellow-500">
          Installer Applications
        </h1>
        <p className="mt-2 text-gray-400">
          Approve or reject installers before they access the system.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total" value={String(summary.total)} />
        <StatCard label="Approved" value={String(summary.approved)} className="text-green-400" />
        <StatCard label="Pending" value={String(summary.pending)} className="text-yellow-400" />
        <StatCard label="Rejected" value={String(summary.rejected)} className="text-red-400" />
        <StatCard label="Active" value={String(summary.active)} className="text-green-400" />
        <StatCard label="Inactive" value={String(summary.inactive)} className="text-zinc-300" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search installer, email, phone, service area, payout..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["approved", "Approved"],
                ["pending", "Pending"],
                ["rejected", "Rejected"],
                ["active", "Active"],
                ["inactive", "Inactive"],
              ] as [FilterValue, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  filter === value
                    ? "bg-yellow-500 text-black"
                    : "border border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadInstallers()}
            className="rounded-xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
          >
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <p className="text-gray-300">Loading...</p>
      ) : filteredInstallers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-400">
          No installers found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInstallers.map((item) => {
            const approval = normalizeApprovalStatus(item);
            const active = isInstallerActive(item);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-yellow-500">
                      {getInstallerName(item)}
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      Auth Link: {item.user_id || item.id}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Business: {getBusinessName(item)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(
                        approval
                      )} border-current/20 bg-black`}
                    >
                      Approval: {approval.toUpperCase()}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(
                        item.status
                      )} border-current/20 bg-black`}
                    >
                      Status: {(item.status || "pending").toUpperCase()}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active
                          ? "border-green-500/20 bg-black text-green-400"
                          : "border-yellow-500/20 bg-black text-yellow-400"
                      }`}
                    >
                      {active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                  <Info label="Email" value={item.email} />
                  <Info label="Phone" value={item.phone} />
                  <Info label="Business Name" value={item.business_name} />
                  <Info label="Legal Payout Name" value={item.legal_payout_name} />
                  <Info
                    label="Years Experience"
                    value={
                      item.years_experience !== null &&
                      item.years_experience !== undefined
                        ? String(item.years_experience)
                        : "-"
                    }
                  />
                  <Info label="Service Area" value={item.service_area} />
                  <Info label="Vehicle Type" value={item.vehicle_type} />
                  <Info
                    label="Max Travel KM"
                    value={
                      item.max_travel_km !== null &&
                      item.max_travel_km !== undefined
                        ? String(item.max_travel_km)
                        : "-"
                    }
                  />
                  <Info label="Own Tools" value={yesNo(item.has_tools)} />
                  <Info label="Has Truck" value={yesNo(item.has_truck)} />
                  <Info label="Has Helper" value={yesNo(item.has_helper)} />
                  <Info label="Payout Method" value={item.payout_method} />
                  <Info label="E-Transfer Email" value={item.etransfer_email} />
                  <Info label="Bank Name" value={item.bank_name} />
                  <Info label="Account Holder Name" value={item.account_holder_name} />
                  <Info label="Address" value={getAddress(item)} />
                  <Info
                    label="Created"
                    value={
                      item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"
                    }
                  />
                </div>

                <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Approval Controls</p>

                  <p
                    className={`mt-2 text-2xl font-bold ${statusColor(
                      approval
                    )}`}
                  >
                    {approval.toUpperCase()}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void updateApprovalStatus(item.id, "approved")}
                      disabled={updatingId === item.id}
                      className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                    >
                      {updatingId === item.id ? "Updating..." : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void updateApprovalStatus(item.id, "rejected")}
                      disabled={updatingId === item.id}
                      className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                    >
                      {updatingId === item.id ? "Updating..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void updateApprovalStatus(item.id, "pending")}
                      disabled={updatingId === item.id}
                      className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
                    >
                      {updatingId === item.id ? "Updating..." : "Pending"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleActive(item)}
                      disabled={updatingId === item.id}
                      className={`rounded-xl px-4 py-2 font-semibold disabled:opacity-60 ${
                        active
                          ? "bg-zinc-700 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {updatingId === item.id
                        ? "Updating..."
                        : active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className="rounded-xl border border-zinc-800 bg-black p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="break-words text-white">{value || "-"}</p>
    </div>
  );
}