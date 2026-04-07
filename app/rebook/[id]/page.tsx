"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ADMIN_EMAIL = "ultrapropm@gmail.com";

const HST_RATE = 0.13;

// return-visit rules
const RETURN_VISIT_FEE = 200;
const RETURN_VISIT_INSTALLER_PAY = 180;

// mileage rules
const BASE_CUSTOMER_MILEAGE_RATE = 1.5;

// customer pays 60% of base mileage
const REBOOK_CUSTOMER_PAY_RATE = 0.6;

// installer gets 50% of base mileage
const REBOOK_INSTALLER_PAY_RATE = 0.5;

// company keeps 10% of base mileage
const REBOOK_COMPANY_KEEP_RATE = 0.1;

type PaymentMethod = "" | "creditDebit" | "etransfer" | "payLater";

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
  installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  status?: string | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_photo_url?: string | null;
  incomplete_photo_path?: string | null;
  incomplete_reported_at?: string | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;
  mileage_fee?: number | null;

  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;
  customer_mileage_charge?: number | null;

  installer_mileage_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  side_note?: string | null;
};

function money(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) return job.pickup_time_slot;
  return job.scheduled_time || "-";
}

function getServiceTypeLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getPaymentMethodLabel(value: PaymentMethod) {
  if (value === "creditDebit") return "Credit / Debit";
  if (value === "etransfer") return "E-Transfer";
  if (value === "payLater") return "Pay Later";
  return "-";
}

function Info({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={highlight ? "mt-1 font-semibold text-yellow-400" : "mt-1 text-white"}>
        {value || "-"}
      </p>
    </div>
  );
}

async function sendCustomerEmail(params: {
  to: string;
  subject: string;
  html: string;
  type?: "assignment" | "completion" | "incomplete";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send email");
  }

  return result;
}

async function sendAdminEmail(params: {
  subject: string;
  html: string;
  type?: "completion" | "incomplete" | "installer_accepted";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: params.subject,
      html: params.html,
      type: params.type,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send admin email");
  }

  return result;
}

function customerRebookConfirmationHtml(params: {
  customerName: string;
  jobId: string;
  requestedDate: string;
  pickupWindow: string;
  paymentMethodLabel: string;
  returnFee: number;
  mileageBaseAmount: number;
  mileageDiscountedAmount: number;
  subtotal: number;
  hst: number;
  total: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Return Visit Request Received</h2>
      <p>Hello ${params.customerName || "Customer"},</p>
      <p>Your return-visit request has been submitted.</p>

      <div style="margin:16px 0; padding:14px; border:1px solid #ddd; border-radius:10px;">
        <p><strong>Job ID:</strong> ${params.jobId}</p>
        <p><strong>Requested Date:</strong> ${params.requestedDate || "-"}</p>
        <p><strong>Pickup Window:</strong> ${params.pickupWindow || "-"}</p>
        <p><strong>Payment Method:</strong> ${params.paymentMethodLabel}</p>
        <p><strong>Return Visit Fee:</strong> ${money(params.returnFee)}</p>
        <p><strong>Base Mileage Amount:</strong> ${money(params.mileageBaseAmount)}</p>
        <p><strong>Discounted Mileage Amount:</strong> ${money(params.mileageDiscountedAmount)}</p>
        <p><strong>Subtotal:</strong> ${money(params.subtotal)}</p>
        <p><strong>HST:</strong> ${money(params.hst)}</p>
        <p><strong>Total:</strong> ${money(params.total)}</p>
      </div>

      <p>Admin will review your request and arrange the next step.</p>
      <p>Thank you for choosing 1-800TOPS.</p>
    </div>
  `;
}

function adminRebookRequestHtml(params: {
  job: Booking;
  requestedDate: string;
  pickupWindow: string;
  paymentMethodLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  oneWayKm: number;
  roundTripKm: number;
  chargeableKm: number;
  mileageBaseAmount: number;
  mileageDiscountedAmount: number;
  mileageInstallerPay: number;
  mileageCompanyKeep: number;
  returnFee: number;
  returnFeeInstallerPay: number;
  subtotal: number;
  hst: number;
  total: number;
  customerNote: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Return Visit Request Submitted</h2>

      <p><strong>Job ID:</strong> ${params.job.job_id || params.job.id}</p>
      <p><strong>Customer:</strong> ${params.job.customer_name || "-"}</p>
      <p><strong>Company:</strong> ${params.job.company_name || "-"}</p>
      <p><strong>Email:</strong> ${params.job.customer_email || "-"}</p>
      <p><strong>Phone:</strong> ${params.job.phone_number || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        params.job.service_type_label || params.job.service_type
      )}</p>

      <div style="margin:16px 0; padding:14px; border:1px solid #ddd; border-radius:10px;">
        <p><strong>Requested Date:</strong> ${params.requestedDate || "-"}</p>
        <p><strong>Pickup Window:</strong> ${params.pickupWindow || "-"}</p>
        <p><strong>Pick Up:</strong> ${params.pickupAddress || "-"}</p>
        <p><strong>Drop Off:</strong> ${params.dropoffAddress || "-"}</p>
        <p><strong>Payment Method:</strong> ${params.paymentMethodLabel}</p>
      </div>

      <div style="margin:16px 0; padding:14px; border:1px solid #ddd; border-radius:10px;">
        <p><strong>One-Way Distance:</strong> ${params.oneWayKm.toFixed(2)} km</p>
        <p><strong>Round-Trip Distance:</strong> ${params.roundTripKm.toFixed(2)} km</p>
        <p><strong>Chargeable Distance:</strong> ${params.chargeableKm.toFixed(2)} km</p>
        <p><strong>Base Mileage Amount:</strong> ${money(params.mileageBaseAmount)}</p>
        <p><strong>Customer Mileage (60%):</strong> ${money(params.mileageDiscountedAmount)}</p>
        <p><strong>Installer Mileage Pay (50%):</strong> ${money(params.mileageInstallerPay)}</p>
        <p><strong>Company Mileage Keep (10%):</strong> ${money(params.mileageCompanyKeep)}</p>
      </div>

      <div style="margin:16px 0; padding:14px; border:1px solid #ddd; border-radius:10px;">
        <p><strong>Return Visit Fee:</strong> ${money(params.returnFee)}</p>
        <p><strong>Return Visit Installer Pay:</strong> ${money(params.returnFeeInstallerPay)}</p>
        <p><strong>Subtotal:</strong> ${money(params.subtotal)}</p>
        <p><strong>HST:</strong> ${money(params.hst)}</p>
        <p><strong>Total Customer Charge:</strong> ${money(params.total)}</p>
      </div>

      <p><strong>Customer Note:</strong> ${params.customerNote || "-"}</p>
      <p><strong>Next Step:</strong> Review request, contact customer if needed, and schedule the return visit.</p>
    </div>
  `;
}

export default function RebookPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const jobId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<Booking | null>(null);

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");

  const [mileageLoading, setMileageLoading] = useState(false);
  const [mileageError, setMileageError] = useState("");

  const [oneWayKm, setOneWayKm] = useState<number>(0);
  const [roundTripKm, setRoundTripKm] = useState<number>(0);
  const [chargeableKm, setChargeableKm] = useState<number>(0);

  useEffect(() => {
    if (jobId) {
      void loadJob();
    }
  }, [jobId]);

  async function loadJob() {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", jobId)
      .maybeSingle<Booking>();

    if (error || !data) {
      console.error("LOAD REBOOK JOB ERROR:", error);
      alert("Could not load job.");
      setLoading(false);
      return;
    }

    setJob(data);
    setPickupAddress(data.pickup_address || "");
    setDropoffAddress(data.dropoff_address || "");
    setRequestedDate(data.scheduled_date || "");
    setPickupWindow(getPickupWindow(data));

    const existingOneWay = Number(data.one_way_km || 0);
    const existingRoundTrip = Number(data.round_trip_km || existingOneWay * 2 || 0);
    const existingChargeable = Number(data.chargeable_km || 0);

    setOneWayKm(existingOneWay);
    setRoundTripKm(existingRoundTrip);
    setChargeableKm(existingChargeable);

    setLoading(false);
  }

  const mileageBaseAmount = useMemo(() => {
    return Number((chargeableKm * BASE_CUSTOMER_MILEAGE_RATE).toFixed(2));
  }, [chargeableKm]);

  const discountedMileageAmount = useMemo(() => {
    return Number((mileageBaseAmount * REBOOK_CUSTOMER_PAY_RATE).toFixed(2));
  }, [mileageBaseAmount]);

  const installerMileagePay = useMemo(() => {
    return Number((mileageBaseAmount * REBOOK_INSTALLER_PAY_RATE).toFixed(2));
  }, [mileageBaseAmount]);

  const companyMileageKeep = useMemo(() => {
    return Number((mileageBaseAmount * REBOOK_COMPANY_KEEP_RATE).toFixed(2));
  }, [mileageBaseAmount]);

  const subtotal = useMemo(() => {
    return Number((RETURN_VISIT_FEE + discountedMileageAmount).toFixed(2));
  }, [discountedMileageAmount]);

  const hst = useMemo(() => {
    return Number((subtotal * HST_RATE).toFixed(2));
  }, [subtotal]);

  const total = useMemo(() => {
    return Number((subtotal + hst).toFixed(2));
  }, [subtotal, hst]);

  const installerSubtotalPay = useMemo(() => {
    return Number((RETURN_VISIT_INSTALLER_PAY + installerMileagePay).toFixed(2));
  }, [installerMileagePay]);

  const installerHstPay = useMemo(() => {
    return Number((installerSubtotalPay * HST_RATE).toFixed(2));
  }, [installerSubtotalPay]);

  const installerTotalPay = useMemo(() => {
    return Number((installerSubtotalPay + installerHstPay).toFixed(2));
  }, [installerSubtotalPay, installerHstPay]);

  async function calculateMileage() {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setMileageError("Please enter both pick up and drop off address.");
      return;
    }

    setMileageLoading(true);
    setMileageError("");

    try {
      const res = await fetch("/api/mileage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Mileage calculation failed");
      }

      const nextOneWay = Number(data.oneWayKm || 0);
      const nextRoundTrip = nextOneWay * 2;

      setOneWayKm(nextOneWay);
      setRoundTripKm(nextRoundTrip);
      setChargeableKm(nextRoundTrip);
    } catch (error: any) {
      console.error("REBOOK MILEAGE ERROR:", error);
      setMileageError(error?.message || "Mileage calculation failed");
      setOneWayKm(0);
      setRoundTripKm(0);
      setChargeableKm(0);
    } finally {
      setMileageLoading(false);
    }
  }

  async function handleSubmit() {
    if (!job) return;

    if (!requestedDate) {
      alert("Please select a return-visit date.");
      return;
    }

    if (!pickupWindow) {
      alert("Please select a pickup time window.");
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    setSubmitting(true);

    const paymentMethodLabel = getPaymentMethodLabel(paymentMethod);

    const rebookNote = [
      `REBOOK REQUEST`,
      `Requested date: ${requestedDate}`,
      `Pickup window: ${pickupWindow}`,
      `Payment method: ${paymentMethodLabel}`,
      `Return visit fee: ${money(RETURN_VISIT_FEE)}`,
      `Base mileage amount: ${money(mileageBaseAmount)}`,
      `Discounted mileage amount: ${money(discountedMileageAmount)}`,
      `Installer mileage pay: ${money(installerMileagePay)}`,
      `Company mileage keep: ${money(companyMileageKeep)}`,
      `Subtotal: ${money(subtotal)}`,
      `HST: ${money(hst)}`,
      `Total: ${money(total)}`,
      customerNote ? `Customer note: ${customerNote}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const updatePayload = {
      // keep job in admin review flow
      status: paymentMethod === "creditDebit" ? "pending_rebook_payment" : "pending_rebook_review",

      // new requested schedule
      scheduled_date: requestedDate,
      pickup_time_slot: pickupWindow,

      // latest addresses
      pickup_address: pickupAddress.trim(),
      dropoff_address: dropoffAddress.trim(),

      // financials
      return_fee: RETURN_VISIT_FEE,
      return_fee_charged: RETURN_VISIT_FEE,
      return_fee_installer_pay: RETURN_VISIT_INSTALLER_PAY,

      one_way_km: oneWayKm,
      round_trip_km: roundTripKm,
      chargeable_km: chargeableKm,

      mileage_fee: discountedMileageAmount,
      customer_mileage_charge: discountedMileageAmount,

      installer_mileage_pay: installerMileagePay,
      installer_subtotal_pay: installerSubtotalPay,
      installer_hst_pay: installerHstPay,
      installer_pay: installerTotalPay,
      installer_pay_status: paymentMethod === "creditDebit" ? "awaiting_payment" : "pending_review",

      incomplete_note: rebookNote,
      side_note: customerNote?.trim() || job.side_note || "",
    };

    const { error } = await supabase.from("bookings").update(updatePayload).eq("id", job.id);

    if (error) {
      console.error("REBOOK UPDATE ERROR:", error);
      alert(error.message || "Failed to save rebook request.");
      setSubmitting(false);
      return;
    }

    if (paymentMethod === "creditDebit") {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(total * 100),
            customerEmail: job.customer_email || "",
          }),
        });

        const session = await res.json();

        if (!res.ok || !session?.url) {
          alert(session?.error || "Stripe checkout failed");
          setSubmitting(false);
          return;
        }

        try {
          await sendAdminEmail({
            subject: `Rebook Payment Started - ${job.job_id || job.id}`,
            type: "incomplete",
            html: adminRebookRequestHtml({
              job,
              requestedDate,
              pickupWindow,
              paymentMethodLabel,
              pickupAddress,
              dropoffAddress,
              oneWayKm,
              roundTripKm,
              chargeableKm,
              mileageBaseAmount,
              mileageDiscountedAmount: discountedMileageAmount,
              mileageInstallerPay: installerMileagePay,
              mileageCompanyKeep: companyMileageKeep,
              returnFee: RETURN_VISIT_FEE,
              returnFeeInstallerPay: RETURN_VISIT_INSTALLER_PAY,
              subtotal,
              hst,
              total,
              customerNote,
            }),
          });
        } catch (emailError) {
          console.error("ADMIN REBOOK EMAIL ERROR:", emailError);
        }

        window.location.href = session.url;
        return;
      } catch (error: any) {
        console.error("REBOOK STRIPE ERROR:", error);
        alert(error?.message || "Stripe checkout failed.");
        setSubmitting(false);
        return;
      }
    }

    try {
      if (job.customer_email) {
        await sendCustomerEmail({
          to: job.customer_email,
          subject: "Your Return Visit Request Has Been Received",
          type: "incomplete",
          html: customerRebookConfirmationHtml({
            customerName: job.customer_name || "Customer",
            jobId: job.job_id || job.id,
            requestedDate,
            pickupWindow,
            paymentMethodLabel,
            returnFee: RETURN_VISIT_FEE,
            mileageBaseAmount,
            mileageDiscountedAmount: discountedMileageAmount,
            subtotal,
            hst,
            total,
          }),
        });
      }
    } catch (emailError) {
      console.error("CUSTOMER REBOOK EMAIL ERROR:", emailError);
    }

    try {
      await sendAdminEmail({
        subject: `Rebook Request Submitted - ${job.job_id || job.id}`,
        type: "incomplete",
        html: adminRebookRequestHtml({
          job,
          requestedDate,
          pickupWindow,
          paymentMethodLabel,
          pickupAddress,
          dropoffAddress,
          oneWayKm,
          roundTripKm,
          chargeableKm,
          mileageBaseAmount,
          mileageDiscountedAmount: discountedMileageAmount,
          mileageInstallerPay: installerMileagePay,
          mileageCompanyKeep: companyMileageKeep,
          returnFee: RETURN_VISIT_FEE,
          returnFeeInstallerPay: RETURN_VISIT_INSTALLER_PAY,
          subtotal,
          hst,
          total,
          customerNote,
        }),
      });
    } catch (emailError) {
      console.error("ADMIN REBOOK EMAIL ERROR:", emailError);
    }

    alert(
      paymentMethod === "etransfer"
        ? "Return visit request submitted. Please send your e-transfer."
        : "Return visit request submitted. Admin will review it."
    );

    setSubmitting(false);
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-yellow-500">Return Visit Request</h1>
              <p className="mt-2 text-gray-400">
                Rebook your existing job, add discounted mileage if needed, and choose how you want to pay.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
            >
              Back
            </button>
          </div>
        </div>

        {loading || !job ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading job...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold text-yellow-500">Original Job</h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Info label="Job ID" value={job.job_id || job.id} />
                  <Info label="Customer" value={job.customer_name} />
                  <Info label="Company" value={job.company_name} />
                  <Info label="Email" value={job.customer_email} />
                  <Info label="Phone" value={job.phone_number} />
                  <Info
                    label="Service Type"
                    value={getServiceTypeLabel(job.service_type_label || job.service_type)}
                  />
                  <Info label="Original Date" value={job.scheduled_date} />
                  <Info label="Original Pickup Window" value={getPickupWindow(job)} />
                  <Info label="Pick Up" value={job.pickup_address} />
                  <Info label="Drop Off" value={job.dropoff_address} />
                  <Info label="Incomplete Reason" value={job.incomplete_reason} />
                  <Info label="Incomplete Note" value={job.incomplete_note} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold text-yellow-500">Return Visit Details</h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-gray-300">Requested Date *</label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">Pickup Window *</label>
                    <select
                      value={pickupWindow}
                      onChange={(e) => setPickupWindow(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select pickup window</option>
                      <option value="8:00 AM - 11:00 AM">8:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 2:00 PM">11:00 AM - 2:00 PM</option>
                      <option value="2:00 PM - 5:00 PM">2:00 PM - 5:00 PM</option>
                      <option value="5:00 PM - 8:00 PM">5:00 PM - 8:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">Pick Up Address</label>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">Drop Off Address</label>
                    <input
                      type="text"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-gray-300">Customer Note</label>
                    <textarea
                      rows={4}
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Add any update about what is now ready for the return visit..."
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-yellow-400">Mileage</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Return-visit mileage uses your base mileage amount, then applies the rebook discount.
                    Customer pays 60%, installer gets 50%, company keeps 10%.
                  </p>

                  <button
                    type="button"
                    onClick={() => void calculateMileage()}
                    disabled={mileageLoading}
                    className="mt-4 rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                  >
                    {mileageLoading ? "Calculating..." : "Calculate Mileage"}
                  </button>

                  {mileageError ? (
                    <div className="mt-4 rounded-xl border border-red-500 bg-black p-4 text-sm text-red-400">
                      {mileageError}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Info label="One-Way Distance" value={`${oneWayKm.toFixed(2)} km`} />
                    <Info label="Round-Trip Distance" value={`${roundTripKm.toFixed(2)} km`} />
                    <Info label="Chargeable Distance" value={`${chargeableKm.toFixed(2)} km`} />
                    <Info label="Base Mileage Amount" value={money(mileageBaseAmount)} />
                    <Info label="Customer Mileage (60%)" value={money(discountedMileageAmount)} highlight />
                    <Info label="Installer Mileage Pay (50%)" value={money(installerMileagePay)} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold text-yellow-500">Payment Method</h2>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select payment method</option>
                  <option value="creditDebit">Credit / Debit</option>
                  <option value="etransfer">E-Transfer</option>
                  <option value="payLater">Pay Later</option>
                </select>

                {paymentMethod === "etransfer" ? (
                  <div className="mt-4 rounded-xl border border-yellow-500 bg-black p-4 text-sm text-yellow-400">
                    Send e-transfer after submitting your request.
                    <div className="mt-2 font-semibold text-white">1800tops@gmail.com</div>
                  </div>
                ) : null}

                {paymentMethod === "payLater" ? (
                  <div className="mt-4 rounded-xl border border-zinc-700 bg-black p-4 text-sm text-gray-300">
                    Your request will still be sent to admin for review, and payment can be collected later.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-semibold text-yellow-500">Return Visit Summary</h2>

                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Return Visit Fee</span>
                    <span>{money(RETURN_VISIT_FEE)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Discounted Mileage</span>
                    <span>{money(discountedMileageAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>HST</span>
                    <span>{money(hst)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-700 pt-4 text-base font-semibold text-yellow-400">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-300">
                  <p><strong>Installer Return Pay:</strong> {money(RETURN_VISIT_INSTALLER_PAY)}</p>
                  <p className="mt-2"><strong>Installer Mileage Pay:</strong> {money(installerMileagePay)}</p>
                  <p className="mt-2"><strong>Installer Total Pay:</strong> {money(installerTotalPay)}</p>
                  <p className="mt-2"><strong>Company Mileage Keep:</strong> {money(companyMileageKeep)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : paymentMethod === "creditDebit"
                      ? "Continue to Payment"
                      : "Submit Return Visit Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}