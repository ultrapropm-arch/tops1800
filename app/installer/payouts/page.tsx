"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;

  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;
};

type InstallerProfile = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  payout_method?: string | null;
  payout_email?: string | null;
  etransfer_email?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  account_number?: string | null;
};

type PayoutStatus =
  | "unpaid"
  | "pending"
  | "pending_review"
  | "hold"
  | "ready"
  | "paid";

type PayoutView = {
  id: string;
  jobId: string;
  jobLabel: string;
  serviceLabel: string;
  subtotalPay: number;
  hstPay: number;
  returnPay: number;
  totalPay: number;
  customerReturnFee: number;
  status: PayoutStatus;
  payoutLines: {
    label: string;
    amount: number;
  }[];
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getServiceTypeLabel(booking: {
  service_type?: string | null;
  service_type_label?: string | null;
}) {
  if (booking.service_type_label) return booking.service_type_label;

  const value = booking.service_type;
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function normalizePayoutStatus(value?: string | null): PayoutStatus {
  const status = (value || "").trim().toLowerCase();

  if (status === "paid") return "paid";
  if (status === "ready") return "ready";
  if (status === "hold") return "hold";
  if (status === "pending_review") return "pending_review";
  if (status === "pending") return "pending";
  return "unpaid";
}

function getPayoutLines(booking: Booking) {
  if (
    Array.isArray(booking.installer_payout_lines) &&
    booking.installer_payout_lines.length > 0
  ) {
    return booking.installer_payout_lines.map((line) => ({
      label: line.label || "Payout Line",
      amount: Number(line.amount || 0),
    }));
  }

  const lines: { label: string; amount: number }[] = [];

  if (Number(booking.installer_base_pay || 0) > 0) {
    lines.push({
      label: "Base Install Pay",
      amount: Number(booking.installer_base_pay || 0),
    });
  }

  if (Number(booking.installer_addon_pay || 0) > 0) {
    lines.push({
      label: "Add-On Pay",
      amount: Number(booking.installer_addon_pay || 0),
    });
  }

  if (Number(booking.installer_cut_polish_pay || 0) > 0) {
    lines.push({
      label: "Cut / Polish Pay",
      amount: Number(booking.installer_cut_polish_pay || 0),
    });
  }

  if (Number(booking.installer_sink_pay || 0) > 0) {
    lines.push({
      label: "Sink / Reattach Pay",
      amount: Number(booking.installer_sink_pay || 0),
    });
  }

  if (Number(booking.installer_other_pay || 0) > 0) {
    lines.push({
      label: "Other Service Pay",
      amount: Number(booking.installer_other_pay || 0),
    });
  }

  if (Number(booking.installer_mileage_pay || 0) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: Number(booking.installer_mileage_pay || 0),
    });
  }

  return lines;
}

export default function PayoutPage() {
  const [loading, setLoading] = useState(true);
  const [installerName, setInstallerName] = useState("");
  const [payouts, setPayouts] = useState<PayoutView[]>([]);
  const [profile, setProfile] = useState<InstallerProfile | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("installerPortalName") || "";
    setInstallerName(savedName);
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);

    const supabase = createClient();

    const savedName = localStorage.getItem("installerPortalName") || "";
    const savedEmail = localStorage.getItem("installerPortalEmail") || "";
    const normalizedInstallerName = savedName.trim().toLowerCase();

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (bookingsError) {
      console.error("Error loading payouts:", bookingsError);
      alert(bookingsError.message || "Could not load payouts.");
      setLoading(false);
      return;
    }

    let installerProfile: InstallerProfile | null = null;

    if (savedEmail) {
      const { data: profileData, error: profileError } = await supabase
        .from("installer_profiles")
        .select("*")
        .ilike("email", savedEmail)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading installer profile:", profileError);
      }

      installerProfile = (profileData as InstallerProfile) || null;
    }

    const myPayouts = ((bookingsData as Booking[]) || [])
      .filter((booking) => {
        return (
          normalizedInstallerName !== "" &&
          (booking.installer_name || "").trim().toLowerCase() ===
            normalizedInstallerName
        );
      })
      .map((booking) => {
        const payoutLines = getPayoutLines(booking);

        const labelParts = [
          booking.company_name || booking.customer_name || "Job",
          getServiceTypeLabel(booking),
          booking.scheduled_date || "",
          booking.job_group_id
            ? `Group ${String(booking.job_group_id)}${
                booking.job_number ? ` • Job ${booking.job_number}` : ""
              }`
            : "",
        ].filter(Boolean);

        const subtotalPay =
          Number(booking.installer_subtotal_pay || 0) > 0
            ? Number(booking.installer_subtotal_pay || 0)
            : payoutLines.reduce((sum, line) => sum + line.amount, 0);

        const hstPay = Number(booking.installer_hst_pay || 0);
        const returnPay = Number(booking.return_fee_installer_pay || 0);
        const totalPay =
          Number(booking.installer_pay || 0) > 0
            ? Number(booking.installer_pay || 0)
            : subtotalPay + hstPay + returnPay;

        const customerReturnFee = Number(
          booking.return_fee_charged || booking.return_fee || 0
        );

        return {
          id: booking.id,
          jobId: booking.job_id || booking.id,
          jobLabel: labelParts.join(" • "),
          serviceLabel: getServiceTypeLabel(booking),
          subtotalPay,
          hstPay,
          returnPay,
          totalPay,
          customerReturnFee,
          status: normalizePayoutStatus(booking.installer_pay_status),
          payoutLines,
        };
      });

    setProfile(installerProfile);
    setPayouts(myPayouts);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const unpaid = payouts
      .filter((payout) => payout.status === "unpaid")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const pending = payouts
      .filter((payout) => payout.status === "pending")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const pendingReview = payouts
      .filter((payout) => payout.status === "pending_review")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const hold = payouts
      .filter((payout) => payout.status === "hold")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const ready = payouts
      .filter((payout) => payout.status === "ready")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    const paid = payouts
      .filter((payout) => payout.status === "paid")
      .reduce((sum, payout) => sum + payout.totalPay, 0);

    return { unpaid, pending, pendingReview, hold, ready, paid };
  }, [payouts]);

  function renderPayoutMethod() {
    if (!profile) return "-";

    const method = (profile.payout_method || "").toLowerCase();

    if (method === "etransfer") {
      return profile.etransfer_email || profile.payout_email || "-";
    }

    if (method === "bank") {
      return [
        profile.bank_name || "",
        profile.account_holder_name || "",
        profile.transit_number ? `Transit: ${profile.transit_number}` : "",
        profile.institution_number
          ? `Institution: ${profile.institution_number}`
          : "",
        profile.account_number ? `Account: ${profile.account_number}` : "",
      ]
        .filter(Boolean)
        .join(" • ");
    }

    if (method === "accounting_software") {
      return "Paid through accounting software";
    }

    return "-";
  }

  function statusColor(status: PayoutStatus) {
    if (status === "paid") return "text-green-400";
    if (status === "ready") return "text-yellow-400";
    if (status === "pending_review") return "text-orange-400";
    if (status === "pending") return "text-blue-400";
    if (status === "hold") return "text-red-400";
    return "text-gray-400";
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="mb-2 text-4xl font-bold text-yellow-500">My Payouts</h1>

      <p className="mb-6 text-gray-300">
        Review your payout status, subtotal, HST, return pay, payment method
        details, and each job payout breakdown.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Unpaid" value={money(totals.unpaid)} />
        <MetricCard label="Pending" value={money(totals.pending)} />
        <MetricCard
          label="Pending Review"
          value={money(totals.pendingReview)}
        />
        <MetricCard label="Hold" value={money(totals.hold)} />
        <MetricCard label="Ready" value={money(totals.ready)} />
        <MetricCard label="Paid" value={money(totals.paid)} />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-400">Installer Name</p>
            <p className="mt-1 text-lg font-semibold">{installerName || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Payout Method</p>
            <p className="mt-1 text-lg font-semibold">
              {profile?.payout_method || "-"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-gray-400">Payout Details</p>
            <p className="mt-1 break-words text-sm text-gray-300">
              {renderPayoutMethod()}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-300">Loading payouts...</div>
      ) : payouts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          No payouts found.
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="grid items-start gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400">Job</p>
                  <p className="text-lg font-semibold">{payout.jobLabel}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Job ID: {payout.jobId}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Service</p>
                  <p className="text-base font-semibold text-white">
                    {payout.serviceLabel}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p
                    className={`text-sm font-semibold ${statusColor(
                      payout.status
                    )}`}
                  >
                    {payout.status.replaceAll("_", " ")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Subtotal Pay</p>
                  <p className="mt-2 text-xl font-bold text-yellow-500">
                    {money(payout.subtotalPay)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">HST Pay</p>
                  <p className="mt-2 text-xl font-bold text-yellow-500">
                    {money(payout.hstPay)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Installer Return Pay</p>
                  <p className="mt-2 text-xl font-bold text-yellow-500">
                    {money(payout.returnPay)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">Total Payout</p>
                  <p className="mt-2 text-xl font-bold text-yellow-500">
                    {money(payout.totalPay)}
                  </p>
                </div>
              </div>

              {payout.customerReturnFee > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-gray-400">
                    Customer Return Fee Charged
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {money(payout.customerReturnFee)}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-400">
                  Payout Breakdown
                </p>

                {payout.payoutLines.length > 0 ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    {payout.payoutLines.map((line, index) => (
                      <div
                        key={`${line.label}-${index}`}
                        className="flex items-center justify-between border-b border-zinc-800 pb-2"
                      >
                        <span>{line.label}</span>
                        <span>{money(line.amount)}</span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>Subtotal Pay</span>
                      <span>{money(payout.subtotalPay)}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>HST Pay</span>
                      <span>{money(payout.hstPay)}</span>
                    </div>

                    {payout.returnPay > 0 ? (
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>Installer Return Pay</span>
                        <span>{money(payout.returnPay)}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                      <span>Total Payout</span>
                      <span>{money(payout.totalPay)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>Subtotal Pay</span>
                      <span>{money(payout.subtotalPay)}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>HST Pay</span>
                      <span>{money(payout.hstPay)}</span>
                    </div>

                    {payout.returnPay > 0 ? (
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span>Installer Return Pay</span>
                        <span>{money(payout.returnPay)}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>Total Payout</span>
                      <span>{money(payout.totalPay)}</span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Detailed payout lines will show automatically when saved
                      in the booking.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
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