"use client";

import { useEffect, useState } from "react";
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

function yesNo(value?: boolean | null) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

function getInstallerName(item: Installer) {
  return (
    item.installer_name ||
    item.full_name ||
    item.name ||
    "Unnamed"
  );
}

function getAddress(item: Installer) {
  return [
    item.street_address || "",
    item.unit || "",
    item.city || "",
    item.province || "",
    item.postal_code || "",
    item.country || "",
  ]
    .filter(Boolean)
    .join(", ");
}

export default function AdminInstallersPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

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

  async function updateApprovalStatus(
    id: string,
    nextStatus: ApprovalStatus
  ) {
    setUpdatingId(id);

    const supabase = createClient();

    const isApproved = nextStatus === "approved";

    const payload = {
      approval_status: nextStatus,
      status: nextStatus,
      is_active: isApproved,
    };

    const { error } = await supabase
      .from("installer_profiles")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("UPDATE INSTALLER STATUS ERROR:", error);
      alert(error.message || "Update failed");
      setUpdatingId("");
      return;
    }

    setInstallers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              approval_status: nextStatus,
              status: nextStatus,
              is_active: isApproved,
            }
          : item
      )
    );

    setUpdatingId("");
  }

  function statusColor(status?: string | null) {
    const s = String(status || "pending").toLowerCase();

    if (s === "approved" || s === "active") return "text-green-400";
    if (s === "rejected") return "text-red-400";
    return "text-yellow-400";
  }

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

      {loading ? (
        <p className="text-gray-300">Loading...</p>
      ) : installers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-400">
          No installers found.
        </div>
      ) : (
        <div className="grid gap-4">
          {installers.map((item) => (
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(
                      item.approval_status
                    )} border-current/20 bg-black`}
                  >
                    Approval: {(item.approval_status || "pending").toUpperCase()}
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
                      item.is_active
                        ? "border-green-500/20 bg-black text-green-400"
                        : "border-yellow-500/20 bg-black text-yellow-400"
                    }`}
                  >
                    {item.is_active ? "ACTIVE" : "INACTIVE"}
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
                    item.approval_status
                  )}`}
                >
                  {(item.approval_status || "pending").toUpperCase()}
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
                </div>
              </div>
            </div>
          ))}
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