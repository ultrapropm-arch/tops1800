"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SupportChatWidget from "../../components/support/SupportChatWidget";

type BookingData = {
  id?: string;
  jobId?: string;
  secondJobId?: string;
  jobGroupId?: string;

  customerName?: string;
  customerEmail?: string;
  companyName?: string;
  phoneNumber?: string;
  paymentMethod?: string;

  pickupAddress?: string;
  dropoffAddress?: string;

  timeline?: string;
  scheduledDate?: string;
  pickupTimeSlot?: string;
  serviceType?: string;
  serviceTypeLabel?: string;

  materialType?: string;
  materialSize?: string;

  jobSize?: string | number;
  sqft?: string | number;
  sideNote?: string;

  oneWayKm?: number | string;
  roundTripKm?: number | string;
  chargeableKm?: number | string;
  baseMileageCharge?: number | string;
  mileageDiscount?: number | string;
  mileageCharge?: number | string;
  rebookMode?: boolean | string;
  returnFeeCharged?: number | string;

  addOnServices?: string[] | string;
  justServices?: string[] | string;
  additionalServices?: string[] | string;

  customerSqftRate?: number | string;
  servicePrice?: number | string;
  customerTotal?: number | string;

  installerSubtotalPay?: number | string;
  installerHstPay?: number | string;
  installerTotalPay?: number | string;
  companyProfit?: number | string;

  subtotal?: number | string;
  hst?: number | string;
  finalTotal?: number | string;

  waterfallQuantity?: number | string;
  outletPlugCutoutQuantity?: number | string;
  disposalResponsibility?: string;

  aiRecommendedInstaller?: string;
  aiDistanceTier?: string;

  showSecondJob?: boolean | string;
  secondJobAddress?: string;
  secondJobDate?: string;
  secondJobPickupTimeSlot?: string;
  secondJobServiceType?: string;
  secondJobServiceTypeLabel?: string;
  secondJobSqft?: number | string;
  secondJobSideNote?: string;

  secondJobOneWayKm?: number | string;
  secondJobRoundTripKm?: number | string;
  secondJobChargeableKm?: number | string;
  secondJobBaseMileageCharge?: number | string;
  secondJobMileageDiscount?: number | string;
  secondJobMileageCharge?: number | string;
  secondJobRebookMode?: boolean | string;
  secondJobReturnFeeCharged?: number | string;

  secondJobAddOns?: string[] | string;
  secondJobJustServices?: string[] | string;
  secondJobAdditionalServices?: string[] | string;

  secondJobCustomerSqftRate?: number | string;
  secondJobServicePrice?: number | string;
  secondJobCustomerTotal?: number | string;

  secondJobInstallerSubtotalPay?: number | string;
  secondJobInstallerHstPay?: number | string;
  secondJobInstallerTotalPay?: number | string;
  secondJobCompanyProfit?: number | string;

  secondJobWaterfallQuantity?: number | string;
  secondJobOutletPlugCutoutQuantity?: number | string;
  secondJobDisposalResponsibility?: string;
};

type EmailStatus = "idle" | "sending" | "sent" | "error";

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: unknown): string {
  return "$" + toNumber(value).toFixed(2);
}

function km(value?: unknown): string {
  const parsed = toNumber(value);
  if (!parsed) return "-";
  return `${parsed.toFixed(2)} km`;
}

function sqftLabel(value?: unknown): string {
  const parsed = toNumber(value);
  if (!parsed) return "-";
  return `${parsed.toFixed(2)} sqft`;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  if (typeof value === "string") {
    return value
      .split(" | ")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

function getServiceTypeLabel(value?: string): string {
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getDisposalResponsibilityLabel(value?: string): string {
  if (!value) return "-";
  if (value === "customer") return "Customer / Shop Responsible";
  if (value === "installer") return "Installer Responsible";
  return value;
}

function getBookingIdentity(data?: BookingData | null): string {
  if (!data) return "";
  return String(
    data.jobGroupId ||
      data.jobId ||
      data.id ||
      data.customerEmail ||
      data.phoneNumber ||
      ""
  ).trim();
}

function matchesBookingKey(data: BookingData | null, key: string): boolean {
  if (!data || !key) return false;

  const values = [
    data.jobGroupId,
    data.jobId,
    data.secondJobId,
    data.id,
    data.customerEmail,
    data.phoneNumber,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim());

  return values.includes(String(key).trim());
}

function getStoredBooking(possibleKey: string | null): BookingData | null {
  try {
    if (possibleKey) {
      const exactKey = `confirmedBooking_${possibleKey}`;
      const exactSaved = localStorage.getItem(exactKey);

      if (exactSaved) {
        const parsed = JSON.parse(exactSaved) as BookingData;
        if (matchesBookingKey(parsed, possibleKey)) {
          return parsed;
        }
      }
    }

    const latestSaved = localStorage.getItem("confirmedBooking_latest");
    if (latestSaved) {
      const parsed = JSON.parse(latestSaved) as BookingData;
      if (!possibleKey || matchesBookingKey(parsed, possibleKey)) {
        return parsed;
      }
    }

    const legacySaved = localStorage.getItem("confirmedBooking");
    if (legacySaved) {
      const parsed = JSON.parse(legacySaved) as BookingData;
      if (!possibleKey || matchesBookingKey(parsed, possibleKey)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error reading booking from localStorage:", error);
  }

  return null;
}

async function sendCustomerEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      from: "info@1800tops.com",
      sendAdminCopy: true,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Email route error:", result);
    throw new Error(result?.error || "Failed to send email");
  }

  return result;
}

function buildCustomerEmailHtml(params: {
  customerName: string;
  companyName: string;
  phoneNumber: string;
  paymentMethod: string;
  timeline: string;
  scheduledDate: string;
  pickupTimeSlot: string;
  serviceType: string;
  pickupAddress: string;
  dropoffAddress: string;
  secondJobAddress: string;
  secondJobDate: string;
  secondJobPickupTimeSlot: string;
  secondJobServiceType: string;
  hasSecondJob: boolean;
  jobId: string;
  secondJobId: string;
  jobGroupId: string;
  aiRecommendedInstaller: string;
  aiDistanceTier: string;
  job1Total: number;
  job2Total: number;
  subtotal: number;
  hst: number;
  total: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Your Booking Has Been Confirmed</h2>
      <p>Hello ${params.customerName || "Customer"},</p>

      <p><strong>Booking Group ID:</strong> ${params.jobGroupId || "-"}</p>
      <p><strong>Job 1 ID:</strong> ${params.jobId || "-"}</p>
      ${
        params.hasSecondJob
          ? `<p><strong>Job 2 ID:</strong> ${params.secondJobId || "-"}</p>`
          : ""
      }

      <p><strong>Company:</strong> ${params.companyName || "-"}</p>
      <p><strong>Phone:</strong> ${params.phoneNumber || "-"}</p>
      <p><strong>Payment Method:</strong> ${params.paymentMethod || "-"}</p>
      <p><strong>Timeline:</strong> ${params.timeline || "-"}</p>
      <p><strong>Scheduled Date:</strong> ${params.scheduledDate || "-"}</p>
      <p><strong>Pickup Window:</strong> ${params.pickupTimeSlot || "-"}</p>
      <p><strong>Main Service Type:</strong> ${params.serviceType || "-"}</p>
      <p><strong>AI Recommended Installer:</strong> ${params.aiRecommendedInstaller || "-"}</p>
      <p><strong>Distance Tier:</strong> ${params.aiDistanceTier || "-"}</p>

      <hr style="margin: 16px 0;" />

      <h3>Job 1</h3>
      <p><strong>Route:</strong> ${params.pickupAddress || "-"} → ${params.dropoffAddress || "-"}</p>
      <p><strong>Job 1 Total:</strong> $${params.job1Total.toFixed(2)}</p>

      ${
        params.hasSecondJob
          ? `
      <h3>Job 2</h3>
      <p><strong>Drop Off:</strong> ${params.secondJobAddress || "-"}</p>
      <p><strong>Scheduled Date:</strong> ${params.secondJobDate || "-"}</p>
      <p><strong>Pickup Window:</strong> ${params.secondJobPickupTimeSlot || "-"}</p>
      <p><strong>Service Type:</strong> ${params.secondJobServiceType || "-"}</p>
      <p><strong>Job 2 Total:</strong> $${params.job2Total.toFixed(2)}</p>
      `
          : ""
      }

      <hr style="margin: 16px 0;" />

      <p><strong>Subtotal:</strong> $${params.subtotal.toFixed(2)}</p>
      <p><strong>HST (13%):</strong> $${params.hst.toFixed(2)}</p>
      <p><strong>Total:</strong> $${params.total.toFixed(2)}</p>

      <p>Your installer details will be sent once a job is accepted.</p>
      <p>Thank you for choosing 1-800TOPS.</p>
    </div>
  `;
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex justify-between gap-6 border-b border-zinc-700 pb-3">
      <span className="text-gray-300">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

function ServicesBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-black p-4">
      <h4 className="mb-3 text-lg font-semibold text-yellow-500">{title}</h4>
      <div className="space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <div key={item}>• {item}</div>
        ))}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-4 text-2xl font-semibold text-yellow-500">{title}</h2>
      {children}
    </div>
  );
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams();

  const bookingIdParam = searchParams.get("booking_id");
  const jobGroupIdParam = searchParams.get("job_group_id");
  const jobIdParam = searchParams.get("job_id");

  const activeBookingKey =
    bookingIdParam?.trim() ||
    jobGroupIdParam?.trim() ||
    jobIdParam?.trim() ||
    "";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    setBooking(null);
    setIsLoaded(false);
    setEmailStatus("idle");
    setEmailMessage("");

    const storedBooking = getStoredBooking(activeBookingKey);

    if (storedBooking) {
      setBooking(storedBooking);
    }

    setIsLoaded(true);
  }, [activeBookingKey]);

  useEffect(() => {
    if (!booking) return;

    try {
      const identity = getBookingIdentity(booking);

      localStorage.setItem("confirmedBooking_latest", JSON.stringify(booking));
      localStorage.setItem("confirmedBooking", JSON.stringify(booking));

      if (identity) {
        localStorage.setItem(
          `confirmedBooking_${identity}`,
          JSON.stringify(booking)
        );
      }
    } catch (error) {
      console.error("Error saving booking to localStorage:", error);
    }
  }, [booking]);

  const hasSecondJob = useMemo(() => {
    if (!booking) return false;

    return (
      toBoolean(booking.showSecondJob) ||
      Boolean(booking.secondJobAddress?.trim()) ||
      Boolean(booking.secondJobDate?.trim()) ||
      Boolean(booking.secondJobPickupTimeSlot?.trim()) ||
      Boolean(booking.secondJobServiceType?.trim()) ||
      toNumber(booking.secondJobSqft) > 0 ||
      toNumber(booking.secondJobCustomerTotal) > 0 ||
      toArray(booking.secondJobAddOns).length > 0 ||
      toArray(booking.secondJobJustServices).length > 0 ||
      toArray(booking.secondJobAdditionalServices).length > 0
    );
  }, [booking]);

  const mainAddOns = useMemo(() => toArray(booking?.addOnServices), [booking]);
  const mainJustServices = useMemo(() => toArray(booking?.justServices), [booking]);
  const mainAdditionalServices = useMemo(
    () => toArray(booking?.additionalServices),
    [booking]
  );

  const secondAddOns = useMemo(() => toArray(booking?.secondJobAddOns), [booking]);
  const secondJustServices = useMemo(
    () => toArray(booking?.secondJobJustServices),
    [booking]
  );
  const secondAdditionalServices = useMemo(
    () => toArray(booking?.secondJobAdditionalServices),
    [booking]
  );

  const job1Total = useMemo(() => toNumber(booking?.customerTotal), [booking]);
  const job2Total = useMemo(
    () => (hasSecondJob ? toNumber(booking?.secondJobCustomerTotal) : 0),
    [booking, hasSecondJob]
  );

  const subtotal = useMemo(() => {
    const storedSubtotal = toNumber(booking?.subtotal);
    if (storedSubtotal > 0) return storedSubtotal;
    return job1Total + job2Total;
  }, [booking, job1Total, job2Total]);

  const hst = useMemo(() => {
    const storedHst = toNumber(booking?.hst);
    if (storedHst > 0) return storedHst;
    return subtotal * 0.13;
  }, [booking, subtotal]);

  const total = useMemo(() => {
    const storedTotal = toNumber(booking?.finalTotal);
    if (storedTotal > 0) return storedTotal;
    return subtotal + hst;
  }, [booking, subtotal, hst]);

  const jobGroupId = booking?.jobGroupId || booking?.id || "-";
  const job1Id = booking?.jobId || booking?.id || "-";
  const job2Id = booking?.secondJobId || "-";

  useEffect(() => {
    if (!booking) return;

    const currentBooking = booking;
    const safeCustomerEmail = currentBooking.customerEmail?.trim() || "";

    if (!safeCustomerEmail) return;

    const emailIdentity =
      currentBooking.jobGroupId ||
      currentBooking.jobId ||
      currentBooking.id ||
      currentBooking.customerEmail ||
      currentBooking.phoneNumber ||
      "default";

    const emailKey = `confirmation_email_sent_${emailIdentity}`;

    async function sendEmailOnce() {
      try {
        if (localStorage.getItem(emailKey) === "true") {
          setEmailStatus("sent");
          setEmailMessage("Customer confirmation email already sent.");
          return;
        }

        setEmailStatus("sending");
        setEmailMessage("Sending customer confirmation email...");

        await sendCustomerEmail({
          to: safeCustomerEmail,
          subject: "Your Booking Has Been Confirmed",
          html: buildCustomerEmailHtml({
            customerName: currentBooking.customerName || "Customer",
            companyName: currentBooking.companyName || "",
            phoneNumber: currentBooking.phoneNumber || "",
            paymentMethod: currentBooking.paymentMethod || "",
            timeline: currentBooking.timeline || "",
            scheduledDate: currentBooking.scheduledDate || "",
            pickupTimeSlot: currentBooking.pickupTimeSlot || "",
            serviceType:
              currentBooking.serviceTypeLabel ||
              getServiceTypeLabel(currentBooking.serviceType),
            pickupAddress: currentBooking.pickupAddress || "",
            dropoffAddress: currentBooking.dropoffAddress || "",
            secondJobAddress: currentBooking.secondJobAddress || "",
            secondJobDate: currentBooking.secondJobDate || "",
            secondJobPickupTimeSlot: currentBooking.secondJobPickupTimeSlot || "",
            secondJobServiceType:
              currentBooking.secondJobServiceTypeLabel ||
              getServiceTypeLabel(currentBooking.secondJobServiceType),
            hasSecondJob,
            jobId: job1Id,
            secondJobId: job2Id,
            jobGroupId: String(jobGroupId),
            aiRecommendedInstaller: currentBooking.aiRecommendedInstaller || "",
            aiDistanceTier: currentBooking.aiDistanceTier || "",
            job1Total,
            job2Total,
            subtotal,
            hst,
            total,
          }),
        });

        localStorage.setItem(emailKey, "true");
        setEmailStatus("sent");
        setEmailMessage("Customer confirmation email sent successfully.");
      } catch (error) {
        console.error("Customer confirmation email error:", error);
        setEmailStatus("error");
        setEmailMessage("Failed to send customer confirmation email.");
      }
    }

    sendEmailOnce();
  }, [
    booking,
    hasSecondJob,
    job1Id,
    job2Id,
    jobGroupId,
    job1Total,
    job2Total,
    subtotal,
    hst,
    total,
  ]);

  const bookingReference =
    booking?.jobGroupId ||
    booking?.jobId ||
    booking?.id ||
    booking?.customerEmail ||
    booking?.phoneNumber ||
    "demo-booking-id";

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-3 text-5xl font-bold text-yellow-500">
            Booking Confirmed
          </h1>
          <p className="text-gray-300">Loading your booking details...</p>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-3 text-5xl font-bold text-yellow-500">
            Booking Confirmed
          </h1>
          <p className="text-gray-300">
            We could not find this booking confirmation.
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            Please return to checkout and submit the booking again, or open the
            exact confirmation link for that booking.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-5xl font-bold text-yellow-500">
            Booking Confirmed
          </h1>
          <p className="text-gray-300">
            Thank you for your business. Your booking has been received successfully.
          </p>

          {emailStatus === "sending" ? (
            <p className="mt-4 text-sm text-yellow-400">{emailMessage}</p>
          ) : null}

          {emailStatus === "sent" ? (
            <p className="mt-4 text-sm text-green-400">{emailMessage}</p>
          ) : null}

          {emailStatus === "error" ? (
            <p className="mt-4 text-sm text-red-400">{emailMessage}</p>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <StatusCard title="Booking References">
              <div className="space-y-4 text-base">
                <Row label="Booking Group ID" value={String(jobGroupId)} />
                <Row label="Job 1 ID" value={job1Id} />
                {hasSecondJob ? <Row label="Job 2 ID" value={job2Id} /> : null}
              </div>
            </StatusCard>

            <StatusCard title="Customer Information">
              <div className="space-y-4 text-base">
                <Row label="Customer" value={booking.customerName} />
                <Row label="Email" value={booking.customerEmail} />
                <Row label="Phone" value={booking.phoneNumber} />
                <Row label="Company" value={booking.companyName} />
                <Row label="Payment Method" value={booking.paymentMethod} />
              </div>
            </StatusCard>

            <StatusCard title="AI Booking Summary">
              <div className="space-y-4 text-base">
                <Row
                  label="Recommended Installer"
                  value={booking.aiRecommendedInstaller || "Standard Installer"}
                />
                <Row
                  label="Distance Tier"
                  value={booking.aiDistanceTier || "-"}
                />
              </div>
            </StatusCard>

            <StatusCard title="Job 1 Details">
              <div className="space-y-4 text-base">
                <Row label="Job 1 ID" value={job1Id} />
                <Row label="Pick Up Address" value={booking.pickupAddress} />
                <Row label="Drop Off Address" value={booking.dropoffAddress} />
                <Row label="Timeline" value={booking.timeline} />
                <Row label="Scheduled Date" value={booking.scheduledDate} />
                <Row label="Pickup Window" value={booking.pickupTimeSlot} />
                <Row
                  label="Service Type"
                  value={
                    booking.serviceTypeLabel ||
                    getServiceTypeLabel(booking.serviceType)
                  }
                />
                <Row label="Material Type" value={booking.materialType} />
                <Row label="Material Size" value={booking.materialSize} />
                <Row label="Job Size" value={sqftLabel(booking.sqft || booking.jobSize)} />
                <Row label="Customer Rate" value={`${money(booking.customerSqftRate)}/sqft`} />
                <Row label="Service Price" value={money(booking.servicePrice)} />
                <Row label="One-Way Distance" value={km(booking.oneWayKm)} />
                <Row label="Round-Trip Distance" value={km(booking.roundTripKm)} />
                <Row label="Chargeable Distance" value={km(booking.chargeableKm)} />
                <Row label="Base Mileage" value={money(booking.baseMileageCharge)} />
                <Row label="Mileage Discount" value={money(booking.mileageDiscount)} />
                <Row label="Mileage Charge" value={money(booking.mileageCharge)} />
                <Row
                  label="Return Fee Charged"
                  value={money(booking.returnFeeCharged)}
                />
                {toNumber(booking.waterfallQuantity) > 0 ? (
                  <Row label="Waterfall Quantity" value={String(booking.waterfallQuantity)} />
                ) : null}
                {toNumber(booking.outletPlugCutoutQuantity) > 0 ? (
                  <Row
                    label="Outlet Plug Cutout Quantity"
                    value={String(booking.outletPlugCutoutQuantity)}
                  />
                ) : null}
                {booking.disposalResponsibility ? (
                  <Row
                    label="Disposal Responsibility"
                    value={getDisposalResponsibilityLabel(
                      booking.disposalResponsibility
                    )}
                  />
                ) : null}
                <Row label="Job 1 Total" value={money(job1Total)} />
                {booking.sideNote ? <Row label="Side Note" value={booking.sideNote} /> : null}
              </div>

              <div className="mt-6 grid gap-4">
                <ServicesBox title="Add-On Services" items={mainAddOns} />
                <ServicesBox title="Just Services" items={mainJustServices} />
                <ServicesBox title="Additional Services" items={mainAdditionalServices} />
              </div>
            </StatusCard>

            {hasSecondJob ? (
              <StatusCard title="Job 2 Details">
                <div className="space-y-4 text-base">
                  <Row label="Job 2 ID" value={job2Id} />
                  <Row label="Pick Up Address" value={booking.pickupAddress} />
                  <Row label="Drop Off Address" value={booking.secondJobAddress} />
                  <Row label="Scheduled Date" value={booking.secondJobDate} />
                  <Row label="Pickup Window" value={booking.secondJobPickupTimeSlot} />
                  <Row
                    label="Service Type"
                    value={
                      booking.secondJobServiceTypeLabel ||
                      getServiceTypeLabel(booking.secondJobServiceType)
                    }
                  />
                  <Row label="Job Size" value={sqftLabel(booking.secondJobSqft)} />
                  <Row
                    label="Customer Rate"
                    value={`${money(booking.secondJobCustomerSqftRate)}/sqft`}
                  />
                  <Row label="Service Price" value={money(booking.secondJobServicePrice)} />
                  <Row label="One-Way Distance" value={km(booking.secondJobOneWayKm)} />
                  <Row
                    label="Round-Trip Distance"
                    value={km(booking.secondJobRoundTripKm)}
                  />
                  <Row
                    label="Chargeable Distance"
                    value={km(booking.secondJobChargeableKm)}
                  />
                  <Row
                    label="Base Mileage"
                    value={money(booking.secondJobBaseMileageCharge)}
                  />
                  <Row
                    label="Mileage Discount"
                    value={money(booking.secondJobMileageDiscount)}
                  />
                  <Row
                    label="Mileage Charge"
                    value={money(booking.secondJobMileageCharge)}
                  />
                  <Row
                    label="Return Fee Charged"
                    value={money(booking.secondJobReturnFeeCharged)}
                  />
                  {toNumber(booking.secondJobWaterfallQuantity) > 0 ? (
                    <Row
                      label="Waterfall Quantity"
                      value={String(booking.secondJobWaterfallQuantity)}
                    />
                  ) : null}
                  {toNumber(booking.secondJobOutletPlugCutoutQuantity) > 0 ? (
                    <Row
                      label="Outlet Plug Cutout Quantity"
                      value={String(booking.secondJobOutletPlugCutoutQuantity)}
                    />
                  ) : null}
                  {booking.secondJobDisposalResponsibility ? (
                    <Row
                      label="Disposal Responsibility"
                      value={getDisposalResponsibilityLabel(
                        booking.secondJobDisposalResponsibility
                      )}
                    />
                  ) : null}
                  <Row label="Job 2 Total" value={money(job2Total)} />
                  {booking.secondJobSideNote ? (
                    <Row label="Side Note" value={booking.secondJobSideNote} />
                  ) : null}
                </div>

                <div className="mt-6 grid gap-4">
                  <ServicesBox title="Add-On Services" items={secondAddOns} />
                  <ServicesBox title="Just Services" items={secondJustServices} />
                  <ServicesBox
                    title="Additional Services"
                    items={secondAdditionalServices}
                  />
                </div>
              </StatusCard>
            ) : null}

            <StatusCard title="What Happens Next">
              <div className="space-y-3 text-gray-300">
                <p>• Your booking is now in our system.</p>
                <p>• An installer will review and accept the job.</p>
                <p>• Once accepted, installer details will be sent to you.</p>
                <p>• Keep your booking reference for support and follow-up.</p>
                <p>
                  • If this job ever becomes incomplete later, use the same job
                  reference instead of creating a new booking.
                </p>
              </div>
            </StatusCard>
          </div>

          <div className="space-y-6">
            <StatusCard title="Final Summary">
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Job 1 Total</span>
                  <span>{money(job1Total)}</span>
                </div>

                {hasSecondJob ? (
                  <div className="flex justify-between">
                    <span>Job 2 Total</span>
                    <span>{money(job2Total)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between border-t border-zinc-700 pt-4">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>HST (13%)</span>
                  <span>{money(hst)}</span>
                </div>

                <div className="flex justify-between border-t border-zinc-700 pt-4 text-2xl font-bold text-yellow-500">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="mt-8 w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400"
              >
                Print / Save PDF
              </button>
            </StatusCard>

            <StatusCard title="Internal Pricing Snapshot">
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Job 1 Installer Pay</span>
                  <span>{money(booking.installerTotalPay)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Job 1 Company Profit</span>
                  <span>{money(booking.companyProfit)}</span>
                </div>

                {hasSecondJob ? (
                  <>
                    <div className="flex justify-between border-t border-zinc-700 pt-4">
                      <span>Job 2 Installer Pay</span>
                      <span>{money(booking.secondJobInstallerTotalPay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Job 2 Company Profit</span>
                      <span>{money(booking.secondJobCompanyProfit)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </StatusCard>
          </div>
        </div>
      </div>

      <SupportChatWidget
        bookingId={String(bookingReference)}
        senderType="customer"
      />
    </main>
  );
}