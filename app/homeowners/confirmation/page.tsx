"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const HST_RATE = 0.13;
const HST_NUMBER = "720734235RT0001";

function money(value?: string | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function paymentMethodLabel(value?: string | null) {
  if (value === "credit_debit") return "Credit / Debit";
  if (value === "etransfer") return "E-Transfer";
  if (value === "cash_pickup") return "Cash Pickup";
  if (value === "no_payment_required") return "No Payment Required";
  return value || "-";
}

function HomeownerConfirmationContent() {
  const searchParams = useSearchParams();

  const job = searchParams.get("job") || "TOP";

  const customerName = searchParams.get("customerName") || "";
  const customerEmail = searchParams.get("customerEmail") || "";
  const customerPhone = searchParams.get("customerPhone") || "";

  const projectAddress = searchParams.get("projectAddress") || "";
  const city = searchParams.get("city") || "";
  const postalCode = searchParams.get("postalCode") || "";

  const serviceLabel =
    searchParams.get("serviceLabel") || "Homeowner Request";

  const requestType = searchParams.get("requestType") || "service";

  const timeline = searchParams.get("timeline") || "";
  const preferredContact =
    searchParams.get("preferredContact") || "";

  const paymentMethod =
    searchParams.get("paymentMethod") || "no_payment_required";

  const paymentStatus =
    searchParams.get("paymentStatus") || "pending";

  const estimateLow =
    Number(searchParams.get("estimateLow") || 0);

  const estimateHigh =
    Number(searchParams.get("estimateHigh") || 0);

  const subtotal = estimateHigh / (1 + HST_RATE);
  const hstAmount = estimateHigh - subtotal;

  const aiUrgency =
    timeline.toLowerCase().includes("same")
      ? "Same-Day Priority"
      : timeline.toLowerCase().includes("next")
      ? "Next-Day Priority"
      : "Standard Scheduling";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
          1800TOPS HOMEOWNERS
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
            <h1 className="text-5xl font-black text-green-400">
              Request Confirmed
            </h1>

            <p className="mt-4 text-lg text-gray-300">
              Your homeowner request has been successfully submitted.
            </p>

            <p className="mt-2 text-gray-400">
              Confirmation emails were sent to both the customer and
              1800TOPS admin.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-300">
                Job Number
              </p>

              <p className="mt-3 text-5xl font-black text-yellow-400">
                {job}
              </p>

              <div className="mt-5 rounded-xl bg-black/40 p-4">
                <p className="text-sm text-gray-400">
                  Request Type
                </p>

                <p className="mt-1 text-xl font-bold capitalize">
                  {requestType}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-300">
                AI Priority
              </p>

              <p className="mt-3 text-3xl font-black text-blue-300">
                {aiUrgency}
              </p>

              <p className="mt-3 text-sm text-gray-300">
                Timeline: {timeline || "-"}
              </p>

              <p className="text-sm text-gray-300">
                Preferred Contact: {preferredContact || "-"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h2 className="text-2xl font-black">
                Customer Information
              </h2>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Customer Name
                  </p>

                  <p className="font-semibold">
                    {customerName || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Email
                  </p>

                  <p className="font-semibold">
                    {customerEmail || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Phone
                  </p>

                  <p className="font-semibold">
                    {customerPhone || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h2 className="text-2xl font-black">
                Project Address
              </h2>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Address
                  </p>

                  <p className="font-semibold">
                    {projectAddress || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    City
                  </p>

                  <p className="font-semibold">
                    {city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Postal Code
                  </p>

                  <p className="font-semibold">
                    {postalCode || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <h2 className="text-3xl font-black text-yellow-300">
              Service Details
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div className="rounded-xl bg-black/40 p-5">
                <p className="text-sm text-gray-400">
                  Service
                </p>

                <p className="mt-2 text-xl font-bold">
                  {serviceLabel}
                </p>
              </div>

              <div className="rounded-xl bg-black/40 p-5">
                <p className="text-sm text-gray-400">
                  Estimate Low
                </p>

                <p className="mt-2 text-2xl font-black">
                  {money(String(estimateLow))}
                </p>
              </div>

              <div className="rounded-xl bg-black/40 p-5">
                <p className="text-sm text-gray-400">
                  Estimate High
                </p>

                <p className="mt-2 text-2xl font-black text-yellow-300">
                  {money(String(estimateHigh))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
            <h2 className="text-3xl font-black text-green-300">
              Pricing Summary
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-gray-300">
                  Estimated Subtotal
                </p>

                <p className="font-bold">
                  {money(subtotal.toFixed(2))}
                </p>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-gray-300">
                  HST (13%)
                </p>

                <p className="font-bold">
                  {money(hstAmount.toFixed(2))}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-2xl font-black">
                  Estimated Total
                </p>

                <p className="text-3xl font-black text-green-300">
                  {money(String(estimateHigh))}
                </p>
              </div>

              <div className="rounded-xl bg-black/40 p-4 mt-4">
                <p className="text-sm text-gray-400">
                  HST Number
                </p>

                <p className="font-bold">
                  {HST_NUMBER}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <h2 className="text-3xl font-black text-blue-300">
              Payment Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-black/40 p-5">
                <p className="text-sm text-gray-400">
                  Payment Method
                </p>

                <p className="mt-2 text-xl font-bold">
                  {paymentMethodLabel(paymentMethod)}
                </p>
              </div>

              <div className="rounded-xl bg-black/40 p-5">
                <p className="text-sm text-gray-400">
                  Payment Status
                </p>

                <p className="mt-2 text-xl font-bold capitalize">
                  {paymentStatus}
                </p>
              </div>
            </div>

            {paymentMethod === "etransfer" && (
              <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <p className="font-bold text-yellow-300">
                  E-Transfer Instructions
                </p>

                <p className="mt-2 text-gray-300">
                  Send e-transfer to:
                </p>

                <p className="text-xl font-black">
                  info@1800tops.com
                </p>

                <p className="mt-3 text-sm text-gray-400">
                  Include your job number {job} in the transfer
                  notes.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black p-6">
            <h2 className="text-2xl font-black">
              Important Information
            </h2>

            <div className="mt-4 space-y-4 text-gray-300">
              <p>
                Final pricing may change after measurements,
                photos, removal conditions, access conditions,
                plumbing, scheduling, material details, and
                onsite review.
              </p>

              <p>
                Same-day and urgent requests are prioritized based
                on technician availability and distance routing.
              </p>

              <p>
                1800TOPS may contact you for additional project
                details before final scheduling.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <Link
              href="/"
              className="rounded-xl bg-yellow-400 px-6 py-4 text-center font-bold text-black hover:bg-yellow-300"
            >
              Return Home
            </Link>

            <Link
              href="/homeowners/book"
              className="rounded-xl border border-white/20 px-6 py-4 text-center font-bold text-white hover:bg-white/10"
            >
              Submit Another Request
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function HomeownerConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-6 py-10 text-white">
          Loading homeowner confirmation...
        </main>
      }
    >
      <HomeownerConfirmationContent />
    </Suspense>
  );
}