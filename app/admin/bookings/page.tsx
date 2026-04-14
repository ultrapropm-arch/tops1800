"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type BookingStatus =
  | "new"
  | "available"
  | "pending"
  | "accepted"
  | "in_progress"
  | "incomplete"
  | "completed"
  | "completed_pending_admin_review"
  | "cancelled"
  | "archived";

type InstallerPayStatus =
  | "unpaid"
  | "pending"
  | "pending_review"
  | "hold"
  | "ready"
  | "paid";

type Booking = {
  id: string;
  job_id?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  incomplete_at?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;

  pickup_address?: string | null;
  dropoff_address?: string | null;

  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;

  service_type?: string | null;
  service_type_label?: string | null;
  material_type?: string | null;
  material_size?: string | null;
  timeline?: string | null;

  sqft?: number | null;
  job_size?: number | null;

  installer_name?: string | null;
  reassigned_installer_name?: string | null;

  status?: string | null;
  is_archived?: boolean | null;
  job_group_id?: string | number | null;
  job_number?: number | null;

  payment_method?: string | null;
  payment_status?: string | null;

  customer_sqft_rate?: number | null;
  service_price?: number | null;
  final_total?: number | null;
  company_profit?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;
  customer_mileage_charge?: number | null;
  mileage_fee?: number | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  waterfall_quantity?: number | null;
  outlet_plug_cutout_quantity?: number | null;
  disposal_responsibility?: string | null;

  installer_pay?: number | null;
  installer_total_pay?: number | null;
  installer_pay_status?: string | null;
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

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  redo_requested?: boolean | null;

  completion_photo_url?: string | null;
  completion_photo_path?: string | null;
  completed_photo_url?: string | null;
  completed_photo_path?: string | null;
  completion_signature_url?: string | null;
  completion_signature_path?: string | null;
  incomplete_photo_url?: string | null;
  incomplete_photo_path?: string | null;

  payout_notes?: string | null;
  payout_batch_id?: string | null;
  payout_sent_at?: string | null;

  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_route_hint?: string | null;
};

type InstallerProfile = {
  id?: string;
  full_name?: string | null;
  installer_name?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
};

type BookingRow = Booking & {
  _calc: PricingResult;
};

type FilterValue =
  | "all"
  | "new"
  | "available"
  | "pending"
  | "accepted"
  | "in_progress"
  | "incomplete"
  | "completed"
  | "cancelled"
  | "archived";

const HST_RATE = 0.13;

const PRICING = {
  customer: {
    installation_3cm: 10,
    installation_2cm_standard: 9,
    installation_2cm: 9,
    full_height_backsplash: 10,
  },
  installer: {
    installation_3cm: 7,
    installation_2cm_standard: 6.5,
    installation_2cm: 6.5,
    full_height_backsplash: 7,
  },
  addons: {
    customer: {
      waterfall: 100,
      outlet: 50,
      extra_helper: 200,
      difficult: 180,
      sink_cutout_onsite: 180,
      cooktop_cutout: 180,
      plumbing_removal: 50,
      sealing: 50,
      onsite_cutting: 175,
      onsite_polishing: 175,
      remeasure_backsplash_fh: 180,
      remeasure_backsplash_lh: 80,
      condo_highrise: 80,
    },
    installer: {
      waterfall: 60,
      outlet: 25,
      extra_helper: 110,
      difficult: 100,
      sink_cutout_onsite: 100,
      cooktop_cutout: 100,
      plumbing_removal: 25,
      sealing: 25,
      onsite_cutting: 100,
      onsite_polishing: 90,
      remeasure_backsplash_fh: 100,
      remeasure_backsplash_lh: 50,
      condo_highrise: 50,
    },
  },
  mileage: {
    customer: 1.4,
    installer: 1.0,
  },
  returnVisit: {
    customer: 200,
    installer: 180,
  },
} as const;

type PricingResult = {
  serviceLabel: string;
  normalizedStatus: BookingStatus;
  customerSubtotal: number;
  customerHst: number;
  customerFinalTotal: number;
  installerBasePay: number;
  installerAddonPay: number;
  installerOtherPay: number;
  installerCutPolishPay: number;
  installerSinkPay: number;
  installerMileagePay: number;
  installerSubtotalPay: number;
  installerHstPay: number;
  installerReturnPay: number;
  installerTotalPay: number;
  companyProfit: number;
  payoutLines: { label: string; amount: number }[];
  parsedAddons: { label: string; customerAmount: number; installerAmount: number }[];
  parsedJustServices: { label: string; customerAmount: number; installerAmount: number }[];
};

function money(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function num(value?: number | string | null) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPickupWindow(job: Booking) {
  if (safeText(job.pickup_time_slot)) return safeText(job.pickup_time_slot);

  const from = safeText(job.pickup_time_from);
  const to = safeText(job.pickup_time_to);

  if (from || to) return [from, to].filter(Boolean).join(" - ");

  return safeText(job.scheduled_time) || "-";
}

function getServiceTypeLabel(job: Pick<Booking, "service_type" | "service_type_label">) {
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

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeStatus(status?: string | null, archived?: boolean | null): BookingStatus {
  if (archived) return "archived";

  const value = safeText(status).toLowerCase();

  if (!value) return "new";
  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "accepted_by_installer") return "accepted";
  if (value === "in progress") return "in_progress";
  if (value === "canceled") return "cancelled";
  if (value === "completed_pending_admin_review") return "completed_pending_admin_review";

  return (value as BookingStatus) || "new";
}

function parseAddonLine(raw: string, job: Booking) {
  const value = raw.toLowerCase();

  if (value.includes("waterfall")) {
    const qty = Math.max(1, num(job.waterfall_quantity));
    return {
      label: `Waterfall x${qty}`,
      customerAmount: PRICING.addons.customer.waterfall * qty,
      installerAmount: PRICING.addons.installer.waterfall * qty,
      bucket: "addon" as const,
    };
  }

  if (value.includes("outlet")) {
    const qty = Math.max(1, num(job.outlet_plug_cutout_quantity));
    return {
      label: `Outlet Plug Cutout x${qty}`,
      customerAmount: PRICING.addons.customer.outlet * qty,
      installerAmount: PRICING.addons.installer.outlet * qty,
      bucket: "addon" as const,
    };
  }

  if (value.includes("extra helper")) {
    return {
      label: "Extra Helper",
      customerAmount: PRICING.addons.customer.extra_helper,
      installerAmount: PRICING.addons.installer.extra_helper,
      bucket: "addon" as const,
    };
  }

  if (value.includes("difficult") || value.includes("stairs") || value.includes("basement")) {
    return {
      label: "Difficult / Stairs / Basement",
      customerAmount: PRICING.addons.customer.difficult,
      installerAmount: PRICING.addons.installer.difficult,
      bucket: "addon" as const,
    };
  }

  if (value.includes("sink cutout")) {
    return {
      label: "Sink Cutout Onsite",
      customerAmount: PRICING.addons.customer.sink_cutout_onsite,
      installerAmount: PRICING.addons.installer.sink_cutout_onsite,
      bucket: "sink" as const,
    };
  }

  if (value.includes("cooktop")) {
    return {
      label: "Cooktop Cutout",
      customerAmount: PRICING.addons.customer.cooktop_cutout,
      installerAmount: PRICING.addons.installer.cooktop_cutout,
      bucket: "other" as const,
    };
  }

  if (value.includes("plumbing")) {
    return {
      label: "Plumbing Removal",
      customerAmount: PRICING.addons.customer.plumbing_removal,
      installerAmount: PRICING.addons.installer.plumbing_removal,
      bucket: "other" as const,
    };
  }

  if (value.includes("sealing")) {
    return {
      label: "Marble / Granite Sealing",
      customerAmount: PRICING.addons.customer.sealing,
      installerAmount: PRICING.addons.installer.sealing,
      bucket: "other" as const,
    };
  }

  if (value.includes("onsite cutting")) {
    return {
      label: "Onsite Cutting",
      customerAmount: PRICING.addons.customer.onsite_cutting,
      installerAmount: PRICING.addons.installer.onsite_cutting,
      bucket: "cut_polish" as const,
    };
  }

  if (value.includes("onsite polishing")) {
    return {
      label: "Onsite Polishing",
      customerAmount: PRICING.addons.customer.onsite_polishing,
      installerAmount: PRICING.addons.installer.onsite_polishing,
      bucket: "cut_polish" as const,
    };
  }

  if (value.includes("remeasure backsplash fh")) {
    return {
      label: "Remeasure Backsplash FH",
      customerAmount: PRICING.addons.customer.remeasure_backsplash_fh,
      installerAmount: PRICING.addons.installer.remeasure_backsplash_fh,
      bucket: "other" as const,
    };
  }

  if (value.includes("remeasure backsplash lh")) {
    return {
      label: "Remeasure Backsplash LH",
      customerAmount: PRICING.addons.customer.remeasure_backsplash_lh,
      installerAmount: PRICING.addons.installer.remeasure_backsplash_lh,
      bucket: "other" as const,
    };
  }

  if (value.includes("condo") || value.includes("high-rise") || value.includes("high rise")) {
    return {
      label: "Condo / High-Rise",
      customerAmount: PRICING.addons.customer.condo_highrise,
      installerAmount: PRICING.addons.installer.condo_highrise,
      bucket: "other" as const,
    };
  }

  return {
    label: raw,
    customerAmount: 0,
    installerAmount: 0,
    bucket: "other" as const,
  };
}

function calculatePricing(job: Booking): PricingResult {
  const serviceType = safeText(job.service_type);
  const sqft = num(job.sqft || job.job_size);
  const normalizedStatus = normalizeStatus(job.status, job.is_archived);
  const serviceLabel = getServiceTypeLabel(job);

  const customerRate =
    num(job.customer_sqft_rate) ||
    (serviceType in PRICING.customer
      ? PRICING.customer[serviceType as keyof typeof PRICING.customer]
      : 0);

  const installerRate =
    serviceType in PRICING.installer
      ? PRICING.installer[serviceType as keyof typeof PRICING.installer]
      : 0;

  const customerBase = sqft * customerRate;
  const installerBase = sqft * installerRate;

  const parsedAddons = toArray(job.add_on_services).map((item) => parseAddonLine(item, job));
  const parsedJustServices = toArray(job.just_services).map((item) => parseAddonLine(item, job));

  let installerAddonPay = 0;
  let installerOtherPay = 0;
  let installerCutPolishPay = 0;
  let installerSinkPay = 0;

  const customerAddonTotal = [...parsedAddons, ...parsedJustServices].reduce(
    (sum, item) => sum + item.customerAmount,
    0
  );

  [...parsedAddons, ...parsedJustServices].forEach((line) => {
    if (line.bucket === "addon") installerAddonPay += line.installerAmount;
    else if (line.bucket === "cut_polish") installerCutPolishPay += line.installerAmount;
    else if (line.bucket === "sink") installerSinkPay += line.installerAmount;
    else installerOtherPay += line.installerAmount;
  });

  const installerMileagePay =
    num(job.installer_mileage_pay) > 0
      ? num(job.installer_mileage_pay)
      : num(job.chargeable_km) > 0
      ? num(job.chargeable_km) * PRICING.mileage.installer
      : 0;

  const customerMileage =
    num(job.customer_mileage_charge) > 0
      ? num(job.customer_mileage_charge)
      : num(job.chargeable_km) > 0
      ? num(job.chargeable_km) * PRICING.mileage.customer
      : 0;

  const installerReturnPay =
    num(job.return_fee_installer_pay) > 0
      ? num(job.return_fee_installer_pay)
      : num(job.return_fee_charged || job.return_fee) > 0
      ? PRICING.returnVisit.installer
      : 0;

  const customerReturnFee =
    num(job.return_fee_charged || job.return_fee) > 0
      ? num(job.return_fee_charged || job.return_fee)
      : 0;

  const computedInstallerSubtotal =
    installerBase +
    installerAddonPay +
    installerOtherPay +
    installerCutPolishPay +
    installerSinkPay +
    installerMileagePay;

  const installerSubtotalPay =
    num(job.installer_subtotal_pay) > 0
      ? num(job.installer_subtotal_pay)
      : computedInstallerSubtotal;

  const installerHstPay =
    num(job.installer_hst_pay) > 0
      ? num(job.installer_hst_pay)
      : installerSubtotalPay * HST_RATE;

  const installerTotalPay =
    num(job.installer_total_pay) > 0
      ? num(job.installer_total_pay)
      : num(job.installer_pay) > 0
      ? num(job.installer_pay)
      : installerSubtotalPay + installerHstPay + installerReturnPay;

  const customerSubtotal =
    num(job.service_price) > 0
      ? num(job.service_price)
      : customerBase + customerAddonTotal + customerMileage + customerReturnFee;

  const customerHst =
    customerSubtotal > 0 ? customerSubtotal * HST_RATE : 0;

  const customerFinalTotal =
    num(job.final_total) > 0 ? num(job.final_total) : customerSubtotal + customerHst;

  const companyProfit =
    num(job.company_profit) !== 0
      ? num(job.company_profit)
      : customerFinalTotal - installerTotalPay;

  const payoutLines =
    Array.isArray(job.installer_payout_lines) && job.installer_payout_lines.length > 0
      ? job.installer_payout_lines.map((line) => ({
          label: safeText(line.label) || "Payout Line",
          amount: num(line.amount),
        }))
      : [
          { label: "Base Install Pay", amount: installerBase },
          { label: "Add-On Pay", amount: installerAddonPay },
          { label: "Other Service Pay", amount: installerOtherPay },
          { label: "Cut / Polish Pay", amount: installerCutPolishPay },
          { label: "Sink / Reattach Pay", amount: installerSinkPay },
          { label: "Mileage Pay", amount: installerMileagePay },
        ].filter((line) => line.amount > 0);

  return {
    serviceLabel,
    normalizedStatus,
    customerSubtotal,
    customerHst,
    customerFinalTotal,
    installerBasePay: installerBase,
    installerAddonPay,
    installerOtherPay,
    installerCutPolishPay,
    installerSinkPay,
    installerMileagePay,
    installerSubtotalPay,
    installerHstPay,
    installerReturnPay,
    installerTotalPay,
    companyProfit,
    payoutLines,
    parsedAddons: parsedAddons.map((x) => ({
      label: x.label,
      customerAmount: x.customerAmount,
      installerAmount: x.installerAmount,
    })),
    parsedJustServices: parsedJustServices.map((x) => ({
      label: x.label,
      customerAmount: x.customerAmount,
      installerAmount: x.installerAmount,
    })),
  };
}

function pillClass(status: string) {
  const value = status.toLowerCase();
  if (value.includes("completed")) return "border-green-500/30 bg-green-500/10 text-green-300";
  if (value.includes("incomplete")) return "border-red-500/30 bg-red-500/10 text-red-300";
  if (value.includes("accepted") || value.includes("progress")) {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  if (value.includes("pending") || value.includes("available") || value.includes("new")) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }
  if (value.includes("cancel")) return "border-zinc-600 bg-zinc-800/50 text-zinc-300";
  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function Badge({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${className || pillClass(value)}`}>
      <span className="text-zinc-400">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-black p-4 ${className || ""}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdminBookingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [installers, setInstallers] = useState<InstallerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [bookingsRes, installersRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("installer_profiles").select("*").order("full_name", { ascending: true }),
    ]);

    if (bookingsRes.error) {
      console.error("BOOKINGS LOAD ERROR:", bookingsRes.error);
      alert(bookingsRes.error.message || "Failed to load bookings.");
      setLoading(false);
      return;
    }

    if (installersRes.error) {
      console.error("INSTALLERS LOAD ERROR:", installersRes.error);
    }

    const bookingRows = ((bookingsRes.data as Booking[]) || []).map((job) => ({
      ...job,
      _calc: calculatePricing(job),
    }));

    setRows(bookingRows);
    setInstallers((installersRes.data as InstallerProfile[]) || []);
    setLoading(false);
  }

  function refreshRow(job: Booking) {
    return {
      ...job,
      _calc: calculatePricing(job),
    };
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function updateBooking(id: string, updates: Partial<Booking>) {
    setSavingId(id);

    const { error } = await supabase.from("bookings").update(updates).eq("id", id);

    if (error) {
      console.error("UPDATE BOOKING ERROR:", error);
      alert(error.message || "Failed to save booking.");
      setSavingId("");
      return false;
    }

    setRows((prev) =>
      prev.map((item) => (item.id === id ? refreshRow({ ...item, ...updates }) : item))
    );

    setSavingId("");
    return true;
  }

  async function saveComputedPricing(row: BookingRow) {
    const c = row._calc;

    await updateBooking(row.id, {
      installer_base_pay: c.installerBasePay,
      installer_addon_pay: c.installerAddonPay,
      installer_other_pay: c.installerOtherPay,
      installer_cut_polish_pay: c.installerCutPolishPay,
      installer_sink_pay: c.installerSinkPay,
      installer_mileage_pay: c.installerMileagePay,
      installer_subtotal_pay: c.installerSubtotalPay,
      installer_hst_pay: c.installerHstPay,
      installer_pay: c.installerTotalPay,
      installer_total_pay: c.installerTotalPay,
      return_fee_installer_pay: c.installerReturnPay,
      company_profit: c.companyProfit,
      service_price: c.customerSubtotal,
      final_total: c.customerFinalTotal,
      installer_payout_lines: c.payoutLines,
    });
  }

  function updateLocalRow(id: string, patch: Partial<Booking>) {
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return refreshRow({ ...item, ...patch });
      })
    );
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (filter !== "all") {
        const status = normalizeStatus(row.status, row.is_archived);
        if (status !== filter) return false;
      }

      if (!term) return true;

      return (
        safeText(row.job_id).toLowerCase().includes(term) ||
        safeText(row.customer_name).toLowerCase().includes(term) ||
        safeText(row.company_name).toLowerCase().includes(term) ||
        safeText(row.installer_name).toLowerCase().includes(term) ||
        safeText(row.reassigned_installer_name).toLowerCase().includes(term) ||
        safeText(row.status).toLowerCase().includes(term) ||
        safeText(row.pickup_address).toLowerCase().includes(term) ||
        safeText(row.dropoff_address).toLowerCase().includes(term)
      );
    });
  }, [rows, search, filter]);

  const summary = useMemo(() => {
    const totalInstallerPay = filteredRows.reduce((sum, item) => sum + item._calc.installerTotalPay, 0);
    const totalProfit = filteredRows.reduce((sum, item) => sum + item._calc.companyProfit, 0);
    const available = filteredRows.filter(
      (item) => item._calc.normalizedStatus === "available" || item._calc.normalizedStatus === "pending"
    ).length;
    const completed = filteredRows.filter((item) =>
      ["completed", "completed_pending_admin_review"].includes(item._calc.normalizedStatus)
    ).length;

    return {
      jobs: filteredRows.length,
      available,
      completed,
      totalInstallerPay,
      totalProfit,
    };
  }, [filteredRows]);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-4xl font-bold text-yellow-500">Admin Bookings</h1>
          <p className="mt-2 text-gray-400">
            Live booking control, installer payout calculation, customer totals, and company profit.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Jobs" value={String(summary.jobs)} />
          <StatCard label="Available / Live" value={String(summary.available)} />
          <StatCard label="Completed" value={String(summary.completed)} />
          <StatCard label="Total Installer Pay" value={money(summary.totalInstallerPay)} />
          <StatCard label="Company Profit" value={money(summary.totalProfit)} />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job ID, customer, company, installer, status, address..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                "all",
                "new",
                "available",
                "pending",
                "accepted",
                "in_progress",
                "incomplete",
                "completed",
                "cancelled",
                "archived",
              ] as FilterValue[]
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  filter === value
                    ? "border-yellow-400 bg-yellow-500 text-black"
                    : "border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
                }`}
              >
                {value.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading bookings...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No bookings found.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRows.map((row) => {
              const calc = row._calc;
              const expanded = Boolean(expandedIds[row.id]);
              const activeInstaller =
                safeText(row.reassigned_installer_name) ||
                safeText(row.installer_name) ||
                "Unassigned";

              return (
                <div key={row.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <p className="text-3xl font-bold text-yellow-500">
                          {row.company_name || row.customer_name || "Job"}
                        </p>
                        <Badge label="Status" value={calc.normalizedStatus.replaceAll("_", " ")} />
                        <Badge label="Payout" value={safeText(row.installer_pay_status) || "unpaid"} />
                        <Badge
                          label="Profit"
                          value={
                            calc.companyProfit < 0
                              ? "Negative / No Profit"
                              : calc.companyProfit > 0
                              ? "Positive Profit"
                              : "No Profit"
                          }
                          className={
                            calc.companyProfit < 0
                              ? "border-red-500/30 bg-red-500/10 text-red-300"
                              : calc.companyProfit > 0
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : "border-zinc-700 bg-zinc-800/40 text-zinc-300"
                          }
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <StatCard label="Job" value={row.job_id || row.id} />
                        <StatCard label="Date" value={row.scheduled_date || "-"} />
                        <StatCard label="Pickup Window" value={getPickupWindow(row)} />
                        <StatCard label="Service" value={calc.serviceLabel} />
                        <StatCard label="Installer" value={activeInstaller} />
                        <StatCard label="Status" value={calc.normalizedStatus.replaceAll("_", " ")} />
                        <StatCard label="Accepted Time" value={row.accepted_at || "-"} />
                        <StatCard label="Installer Pay" value={money(calc.installerTotalPay)} />
                        <StatCard
                          label="Company Profit"
                          value={money(calc.companyProfit)}
                          className={calc.companyProfit < 0 ? "border-red-500/30" : ""}
                        />
                        <StatCard label="Payout Status" value={safeText(row.installer_pay_status) || "unpaid"} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        className="rounded-xl border border-zinc-700 px-4 py-3 font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
                      >
                        {expanded ? "Hide Details" : "View Full Details"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void saveComputedPricing(row)}
                        disabled={savingId === row.id}
                        className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {savingId === row.id ? "Saving..." : "Recalculate Pricing"}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-6 space-y-6 border-t border-zinc-800 pt-6">
                      <div className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_1fr]">
                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Customer / Job Info</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p>Job ID: {row.job_id || row.id}</p>
                            <p>Booking Row ID: {row.id}</p>
                            <p>Customer: {row.customer_name || "-"}</p>
                            <p>Email: {row.customer_email || "-"}</p>
                            <p>Phone: {row.phone_number || "-"}</p>
                            <p>Company: {row.company_name || "-"}</p>
                            <p>Material Type: {row.material_type || "-"}</p>
                            <p>Material Size: {row.material_size || "-"}</p>
                            <p>Sqft: {num(row.sqft || row.job_size)}</p>
                            <p>Payment Method: {row.payment_method || "-"}</p>
                            <p>Created: {row.created_at || "-"}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Route / Schedule</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p>Scheduled Date: {row.scheduled_date || "-"}</p>
                            <p>Scheduled Time: {row.scheduled_time || "-"}</p>
                            <p>Pickup Window: {getPickupWindow(row)}</p>
                            <p>Pick Up: {row.pickup_address || "-"}</p>
                            <p>Drop Off: {row.dropoff_address || "-"}</p>
                            <p>Distance Tier: {row.ai_distance_tier || "-"}</p>
                            <p>Accepted At: {row.accepted_at || "-"}</p>
                            <p>Completed At: {row.completed_at || "-"}</p>
                            <p>Incomplete At: {row.incomplete_at || "-"}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-xl border border-zinc-800 bg-black p-4">
                            <label className="mb-2 block text-sm text-gray-400">Booking Status</label>
                            <select
                              value={calc.normalizedStatus}
                              onChange={(e) => {
                                const value = e.target.value as BookingStatus;
                                updateLocalRow(row.id, {
                                  status: value === "archived" ? row.status : value,
                                  is_archived: value === "archived",
                                });
                              }}
                              onBlur={() => {
                                const current = rows.find((x) => x.id === row.id);
                                if (!current) return;
                                void updateBooking(row.id, {
                                  status:
                                    current._calc.normalizedStatus === "archived"
                                      ? current.status
                                      : current._calc.normalizedStatus,
                                  is_archived: current._calc.normalizedStatus === "archived",
                                });
                              }}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                            >
                              {[
                                "new",
                                "available",
                                "pending",
                                "accepted",
                                "in_progress",
                                "incomplete",
                                "completed",
                                "completed_pending_admin_review",
                                "cancelled",
                                "archived",
                              ].map((option) => (
                                <option key={option} value={option}>
                                  {option.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="rounded-xl border border-zinc-800 bg-black p-4">
                            <label className="mb-2 block text-sm text-gray-400">Installer</label>
                            <select
                              value={safeText(row.reassigned_installer_name) || safeText(row.installer_name)}
                              onChange={(e) => updateLocalRow(row.id, { installer_name: e.target.value })}
                              onBlur={() => {
                                const current = rows.find((x) => x.id === row.id);
                                if (!current) return;
                                void updateBooking(row.id, {
                                  installer_name: safeText(current.installer_name) || null,
                                });
                              }}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                            >
                              <option value="">Select Installer</option>
                              {installers.map((installer) => {
                                const name =
                                  safeText(installer.full_name) ||
                                  safeText(installer.installer_name) ||
                                  safeText(installer.email);
                                if (!name) return null;

                                return (
                                  <option key={`${installer.id}-${name}`} value={name}>
                                    {name}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="rounded-xl border border-zinc-800 bg-black p-4">
                            <label className="mb-2 block text-sm text-gray-400">Installer Payout Status</label>
                            <select
                              value={safeText(row.installer_pay_status) || "unpaid"}
                              onChange={(e) =>
                                updateLocalRow(row.id, {
                                  installer_pay_status: e.target.value as InstallerPayStatus,
                                })
                              }
                              onBlur={() => {
                                const current = rows.find((x) => x.id === row.id);
                                if (!current) return;
                                void updateBooking(row.id, {
                                  installer_pay_status: current.installer_pay_status || "unpaid",
                                });
                              }}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                            >
                              {["unpaid", "pending", "pending_review", "hold", "ready", "paid"].map((option) => (
                                <option key={option} value={option}>
                                  {option.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Add-On Services</p>
                          {calc.parsedAddons.length === 0 ? (
                            <p className="text-sm text-gray-400">-</p>
                          ) : (
                            <div className="space-y-2 text-sm text-gray-300">
                              {calc.parsedAddons.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-4">
                                  <span>{item.label}</span>
                                  <div className="text-right">
                                    <p className="text-zinc-400">Customer {money(item.customerAmount)}</p>
                                    <p className="text-yellow-400">Installer {money(item.installerAmount)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Incomplete / Return / Redo</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p>Incomplete Reason: {row.incomplete_reason || "-"}</p>
                            <p>Incomplete Notes: {row.incomplete_notes || row.incomplete_note || "-"}</p>
                            <p>Customer Return Fee: {money(row.return_fee_charged || row.return_fee)}</p>
                            <p>Installer Return Pay: {money(calc.installerReturnPay)}</p>
                            <p>Mileage Fee: {money(row.mileage_fee || row.customer_mileage_charge)}</p>
                            <p>Redo Requested: {row.redo_requested ? "Yes" : "No"}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Extra Details / Proof</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p>Waterfall Quantity: {num(row.waterfall_quantity) || "-"}</p>
                            <p>Outlet Plug Cutout Quantity: {num(row.outlet_plug_cutout_quantity) || "-"}</p>
                            <p>Disposal Responsibility: {row.disposal_responsibility || "-"}</p>
                            <p>
                              Customer Provided Signing Form:{" "}
                              {row.completion_signature_url ? "Yes" : "No"}
                            </p>
                            <p>
                              Completed Photo Proof:{" "}
                              {row.completion_photo_url || row.completed_photo_url ? (
                                <a
                                  href={row.completion_photo_url || row.completed_photo_url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-yellow-400 underline"
                                >
                                  Open
                                </a>
                              ) : (
                                "-"
                              )}
                            </p>
                            <p>
                              Completion Signature:{" "}
                              {row.completion_signature_url ? (
                                <a
                                  href={row.completion_signature_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-yellow-400 underline"
                                >
                                  Open
                                </a>
                              ) : (
                                "-"
                              )}
                            </p>
                            <p>
                              Incomplete Photo Proof:{" "}
                              {row.incomplete_photo_url ? (
                                <a
                                  href={row.incomplete_photo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-yellow-400 underline"
                                >
                                  Open
                                </a>
                              ) : (
                                "-"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-black p-4">
                        <p className="mb-4 text-lg font-semibold text-yellow-400">Pricing / Payout Breakdown</p>

                        <div className="grid gap-6 xl:grid-cols-2">
                          <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Customer Subtotal</span>
                              <span>{money(calc.customerSubtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Customer HST</span>
                              <span>{money(calc.customerHst)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Customer Final Total</span>
                              <span>{money(calc.customerFinalTotal)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                              <span>Company Profit</span>
                              <span>{money(calc.companyProfit)}</span>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Base Install Pay</span>
                              <span>{money(calc.installerBasePay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Add-On Pay</span>
                              <span>{money(calc.installerAddonPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Other Service Pay</span>
                              <span>{money(calc.installerOtherPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Cut / Polish Pay</span>
                              <span>{money(calc.installerCutPolishPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Sink / Reattach Pay</span>
                              <span>{money(calc.installerSinkPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Mileage Pay</span>
                              <span>{money(calc.installerMileagePay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Subtotal Pay</span>
                              <span>{money(calc.installerSubtotalPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>HST Pay</span>
                              <span>{money(calc.installerHstPay)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                              <span>Return Pay</span>
                              <span>{money(calc.installerReturnPay)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 font-semibold text-yellow-400">
                              <span>Total Installer Pay</span>
                              <span>{money(calc.installerTotalPay)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <label className="mb-2 block text-sm text-gray-400">Admin Notes</label>
                          <textarea
                            value={row.side_note || ""}
                            onChange={(e) => updateLocalRow(row.id, { side_note: e.target.value })}
                            onBlur={() => {
                              const current = rows.find((x) => x.id === row.id);
                              if (!current) return;
                              void updateBooking(row.id, { side_note: current.side_note || "" });
                            }}
                            className="min-h-[120px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <label className="mb-2 block text-sm text-gray-400">Payout Notes</label>
                          <textarea
                            value={row.payout_notes || ""}
                            onChange={(e) => updateLocalRow(row.id, { payout_notes: e.target.value })}
                            onBlur={() => {
                              const current = rows.find((x) => x.id === row.id);
                              if (!current) return;
                              void updateBooking(row.id, { payout_notes: current.payout_notes || "" });
                            }}
                            className="min-h-[120px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-black p-4">
                          <p className="mb-3 text-lg font-semibold text-yellow-400">Quick Actions</p>
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => void updateBooking(row.id, { status: "available", is_archived: false })}
                              className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black hover:bg-yellow-400"
                            >
                              Set Live / Available
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateBooking(row.id, { status: "in_progress" })}
                              className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500"
                            >
                              Set In Progress
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void updateBooking(row.id, {
                                  status: "completed",
                                  completed_at: new Date().toISOString(),
                                })
                              }
                              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-500"
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateBooking(row.id, { installer_pay_status: "ready" })}
                              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
                            >
                              Set Ready Payout
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateBooking(row.id, { is_archived: true })}
                              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white hover:border-zinc-400"
                            >
                              Archive Job
                            </button>
                          </div>
                        </div>
                      </div>

                      {savingId === row.id ? (
                        <p className="text-sm text-yellow-400">Saving updates...</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
