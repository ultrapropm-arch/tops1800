import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const AI_CONFIG = {
  maxServiceDistanceKm: 200,
};

const HST_RATE = 0.13;

type BookingPayload = {
  customerName?: string;
  customerEmail?: string;
  companyName?: string;
  phoneNumber?: string;

  pickupAddress?: string;
  dropoffAddress?: string;

  timeline?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  pickupTimeSlot?: string;
  pickupTimeFrom?: string;
  pickupTimeTo?: string;

  serviceType?: string;
  serviceTypeLabel?: string;
  materialType?: string;
  materialSize?: string;
  jobSize?: number | string;
  sqft?: number | string;

  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;

  installerName?: string;
  reassignedInstallerName?: string;
  installerPay?: number | string;
  installerPayStatus?: string;
  companyProfit?: number | string;

  notes?: string;
  sideNote?: string;

  subtotal?: number | string;
  hst?: number | string;
  finalTotal?: number | string;

  customerSubtotal?: number | string;
  customerHst?: number | string;
  customerTotal?: number | string;

  companySubtotal?: number | string;
  companyHst?: number | string;

  timelineCharge?: number | string;
  servicePrice?: number | string;
  customerAddOnTotal?: number | string;
  customerJustServiceTotal?: number | string;
  customerMileageCharge?: number | string;
  mileageCharge?: number | string;
  customerSqftRate?: number | string;

  installerServicePayout?: number | string;
  installerBasePay?: number | string;
  installerMileagePay?: number | string;
  installerAddonPay?: number | string;
  installerJustServicePay?: number | string;
  installerCutPolishPay?: number | string;
  installerSinkPay?: number | string;
  installerOtherPay?: number | string;
  installerSubtotalPay?: number | string;
  installerHstPay?: number | string;
  installerReturnPay?: number | string;

  jobGroupId?: string | number;
  jobNumber?: number | string;

  incompleteReason?: string;
  incompleteNote?: string;
  incompleteNotes?: string;
  incompletePhotoUrl?: string;

  returnFee?: number | string;
  returnFeeCharged?: number | string;
  returnFeeInstallerPay?: number | string;
  mileageFee?: number | string;
  adminFeeNote?: string;
  redoRequested?: boolean;

  addOnServices?: string[] | string;
  justServices?: string[] | string;

  waterfallQuantity?: number | string;
  outletPlugCutoutQuantity?: number | string;
  disposalResponsibility?: string;

  completedPhotoUrl?: string;
  completionSignatureUrl?: string;
  hasSigningForm?: boolean;

  installerPayoutLines?:
    | {
        label?: string;
        amount?: number | string;
      }[]
    | null;

  oneWayKm?: number | string;
  roundTripKm?: number | string;
  chargeableKm?: number | string;
  distanceTier?: string;
  recommendedInstallerType?: string;
  dispatchScore?: number | string;
  priorityScore?: number | string;
  groupingLabel?: string;
  routeHint?: string;

  secondJob?: BookingPayload | null;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = String(value).trim();
  return parsed ? parsed : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return Boolean(value);
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeServiceType(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw === "installation_3cm") return "installation_3cm";
  if (raw === "installation_2cm_standard") return "installation_2cm_standard";
  if (raw === "full_height_backsplash") return "full_height_backsplash";
  if (raw === "backsplash_tiling") return "backsplash_tiling";
  if (raw === "justServices") return "justServices";

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (normalized === "3cm installation") return "installation_3cm";
  if (normalized === "2cm standard installation") return "installation_2cm_standard";
  if (normalized === "full height backsplash") return "full_height_backsplash";
  if (normalized === "backsplash tiling") return "backsplash_tiling";
  if (normalized === "just services") return "justServices";

  return raw;
}

function getServiceTypeLabel(serviceType: string | null) {
  if (!serviceType) return null;
  if (serviceType === "installation_3cm") return "3cm Installation";
  if (serviceType === "installation_2cm_standard") return "2cm Standard Installation";
  if (serviceType === "full_height_backsplash") return "Full Height Backsplash";
  if (serviceType === "backsplash_tiling") return "Backsplash Tiling";
  if (serviceType === "justServices") return "Just Services";
  return serviceType;
}

function getDistanceTier(oneWayKm: number, finalTotal: number) {
  if (oneWayKm <= 80) return "Local Zone";
  if (oneWayKm <= 120 && finalTotal >= 2500) return "Extended Zone";
  if (oneWayKm <= 200 && finalTotal >= 5000) return "Premium Distance Zone";
  if (oneWayKm > 200) return "Outside Service Zone";
  return "Restricted Distance Zone";
}

function getRecommendedInstallerType(params: {
  oneWayKm: number;
  sqft: number;
  serviceType: string | null;
  finalTotal: number;
  sameDay: boolean;
  hasSecondJob: boolean;
  addOnCount: number;
}) {
  const {
    oneWayKm,
    sqft,
    serviceType,
    finalTotal,
    sameDay,
    hasSecondJob,
    addOnCount,
  } = params;

  if (sameDay && finalTotal >= 2500) return "Priority Same-Day Installer";
  if (hasSecondJob && finalTotal >= 5000) return "Senior Multi-Job Installer";
  if (oneWayKm > 120) return "Long Distance Specialist";
  if (sqft >= 80) return "Large Project Specialist";
  if (serviceType === "installation_3cm") return "3cm Stone Specialist";
  if (serviceType === "full_height_backsplash") return "Backsplash Specialist";
  if (serviceType === "backsplash_tiling") return "Tiling Specialist";
  if (addOnCount >= 4) return "Complex Add-On Installer";
  return "Standard Installer";
}

function buildAiFields(payload: BookingPayload, hasSecondJob: boolean, finalTotal: number) {
  const oneWayKm = toNumber(payload.oneWayKm);
  const sqft = toNumber(payload.sqft || payload.jobSize);
  const mileageFee = toNumber(payload.mileageFee ?? payload.customerMileageCharge ?? payload.mileageCharge);
  const timeline = String(payload.timeline || "").toLowerCase();
  const sameDay = timeline.includes("same");
  const nextDay = timeline.includes("next");
  const addOnCount = toArray(payload.addOnServices).length;

  let urgencyLabel = "Standard";
  if (sameDay) urgencyLabel = "Same-Day Priority";
  else if (nextDay) urgencyLabel = "Next-Day Priority";
  else urgencyLabel = "Open Scheduling";

  const recommendedInstallerType = getRecommendedInstallerType({
    oneWayKm,
    sqft,
    serviceType: normalizeServiceType(payload.serviceType),
    finalTotal,
    sameDay,
    hasSecondJob,
    addOnCount,
  });

  const distanceTier =
    toNullableString(payload.distanceTier) || getDistanceTier(oneWayKm, finalTotal);

  let dispatchScore = 50;
  if (sameDay) dispatchScore += 20;
  if (nextDay) dispatchScore += 10;
  if (sqft >= 80) dispatchScore += 10;
  if (finalTotal >= 2500) dispatchScore += 10;
  if (mileageFee >= 180) dispatchScore += 5;
  dispatchScore = Math.max(0, Math.min(100, dispatchScore));

  let priorityScore = 40;
  if (sameDay) priorityScore += 30;
  if (nextDay) priorityScore += 15;
  if (finalTotal >= 2500) priorityScore += 10;
  priorityScore = Math.max(0, Math.min(100, priorityScore));

  let groupingLabel = "Solo Route";
  if (hasSecondJob) groupingLabel = "Manual Group";
  if (toNullableString(payload.groupingLabel)) {
    groupingLabel = String(payload.groupingLabel);
  }

  let routeHint = "No grouping suggestion yet.";
  if (mileageFee >= 180) {
    routeHint = "Long-distance job. Best for dedicated installer or grouped run.";
  }
  if (toNullableString(payload.routeHint)) {
    routeHint = String(payload.routeHint);
  }

  return {
    ai_distance_tier: distanceTier,
    ai_recommended_installer_type:
      toNullableString(payload.recommendedInstallerType) || recommendedInstallerType,
    ai_dispatch_score: toNumber(payload.dispatchScore, dispatchScore),
    ai_priority_score: toNumber(payload.priorityScore, priorityScore),
    ai_grouping_label: groupingLabel,
    ai_route_hint: routeHint,
    ai_urgency_label: urgencyLabel,
  };
}

function makeJobId(groupId: string | number, jobNumber: number) {
  return `JOB-${groupId}-${jobNumber}`;
}

function normalizeMoneyPayload(payload: BookingPayload) {
  const rawCustomerSubtotal = toNumber(
    payload.customerSubtotal ?? payload.subtotal
  );

  const rawCustomerHst = toNumber(
    payload.customerHst ?? payload.hst
  );

  const rawCustomerTotal = toNumber(
    payload.customerTotal ?? payload.finalTotal
  );

  const customerSubtotal =
    rawCustomerSubtotal > 0
      ? round2(rawCustomerSubtotal)
      : round2(
          toNumber(payload.servicePrice) +
            toNumber(payload.customerAddOnTotal) +
            toNumber(payload.customerJustServiceTotal) +
            toNumber(payload.customerMileageCharge ?? payload.mileageCharge ?? payload.mileageFee) +
            toNumber(payload.timelineCharge) +
            toNumber(payload.returnFeeCharged ?? payload.returnFee)
        );

  const customerHst =
    rawCustomerHst > 0 ? round2(rawCustomerHst) : round2(customerSubtotal * HST_RATE);

  const customerTotal =
    rawCustomerTotal > 0 ? round2(rawCustomerTotal) : round2(customerSubtotal + customerHst);

  const installerBasePay = round2(
    toNumber(payload.installerBasePay ?? payload.installerServicePayout)
  );
  const installerMileagePay = round2(toNumber(payload.installerMileagePay));
  const installerAddonPay = round2(toNumber(payload.installerAddonPay));
  const installerJustServicePay = round2(toNumber(payload.installerJustServicePay));
  const installerCutPolishPay = round2(toNumber(payload.installerCutPolishPay));
  const installerSinkPay = round2(toNumber(payload.installerSinkPay));
  const installerOtherPay = round2(toNumber(payload.installerOtherPay));

  const rawInstallerSubtotal = toNumber(payload.installerSubtotalPay);
  const rawInstallerHst = toNumber(payload.installerHstPay);
  const rawInstallerReturnPay = toNumber(
    payload.installerReturnPay ?? payload.returnFeeInstallerPay
  );
  const rawInstallerTotal = toNumber(payload.installerPay);

  const installerSubtotalPay =
    rawInstallerSubtotal > 0
      ? round2(rawInstallerSubtotal)
      : round2(
          installerBasePay +
            installerMileagePay +
            installerAddonPay +
            installerJustServicePay +
            installerCutPolishPay +
            installerSinkPay +
            installerOtherPay
        );

  const installerHstPay =
    rawInstallerHst > 0
      ? round2(rawInstallerHst)
      : round2(installerSubtotalPay * HST_RATE);

  const installerReturnPay = round2(rawInstallerReturnPay);

  const installerPay =
    rawInstallerTotal > 0
      ? round2(rawInstallerTotal)
      : round2(installerSubtotalPay + installerHstPay + installerReturnPay);

  const rawCompanySubtotal = toNumber(payload.companySubtotal);
  const rawCompanyHst = toNumber(payload.companyHst);
  const rawCompanyProfit = toNumber(payload.companyProfit);

  const companySubtotal =
    rawCompanySubtotal !== 0
      ? round2(rawCompanySubtotal)
      : round2(customerSubtotal - installerSubtotalPay);

  const companyHst =
    rawCompanyHst !== 0
      ? round2(rawCompanyHst)
      : round2(customerHst - installerHstPay);

  const companyProfit =
    rawCompanyProfit !== 0
      ? round2(rawCompanyProfit)
      : round2(customerTotal - installerPay);

  return {
    customerSubtotal,
    customerHst,
    customerTotal,

    installerBasePay,
    installerMileagePay,
    installerAddonPay,
    installerJustServicePay,
    installerCutPolishPay,
    installerSinkPay,
    installerOtherPay,
    installerSubtotalPay,
    installerHstPay,
    installerReturnPay,
    installerPay,

    companySubtotal,
    companyHst,
    companyProfit,
  };
}

function buildBookingRow(
  payload: BookingPayload,
  options: {
    jobGroupId: string | number;
    jobNumber: number;
    hasSecondJob: boolean;
  }
) {
  const serviceType = normalizeServiceType(payload.serviceType);
  const serviceTypeLabel =
    toNullableString(payload.serviceTypeLabel) || getServiceTypeLabel(serviceType);

  const money = normalizeMoneyPayload(payload);
  const status = toNullableString(payload.status) || "available";
  const paymentStatus = toNullableString(payload.paymentStatus) || "pending";
  const installerPayStatus =
    toNullableString(payload.installerPayStatus) ||
    (money.installerPay > 0 ? "unpaid" : null);

  const jobId =
    toNullableString((payload as { jobId?: string }).jobId) ||
    makeJobId(options.jobGroupId, options.jobNumber);

  const aiFields = buildAiFields(payload, options.hasSecondJob, money.customerTotal);

  const customerMileageCharge = round2(
    toNumber(payload.customerMileageCharge ?? payload.mileageCharge ?? payload.mileageFee)
  );

  return {
    job_id: jobId,
    created_at: new Date().toISOString(),

    customer_name: toNullableString(payload.customerName),
    customer_email: toNullableString(payload.customerEmail),
    company_name: toNullableString(payload.companyName),
    phone_number: toNullableString(payload.phoneNumber),

    pickup_address: toNullableString(payload.pickupAddress),
    dropoff_address: toNullableString(payload.dropoffAddress),

    timeline: toNullableString(payload.timeline),
    scheduled_date: toNullableString(payload.scheduledDate),
    scheduled_time: toNullableString(payload.scheduledTime),
    pickup_time_slot: toNullableString(payload.pickupTimeSlot),
    pickup_time_from: toNullableString(payload.pickupTimeFrom),
    pickup_time_to: toNullableString(payload.pickupTimeTo),

    service_type: serviceType,
    service_type_label: serviceTypeLabel,
    material_type: toNullableString(payload.materialType),
    material_size: toNullableString(payload.materialSize),
    job_size: toNullableNumber(payload.jobSize),
    sqft: toNullableNumber(payload.sqft ?? payload.jobSize),

    payment_method: toNullableString(payload.paymentMethod),
    payment_status: paymentStatus,
    status,

    installer_name: toNullableString(payload.installerName),
    reassigned_installer_name: toNullableString(payload.reassignedInstallerName),
    installer_pay: money.installerPay,
    installer_pay_status: installerPayStatus,
    company_profit: money.companyProfit,

    notes: toNullableString(payload.notes),
    side_note: toNullableString(payload.sideNote),

    subtotal: money.customerSubtotal,
    hst: money.customerHst,
    final_total: money.customerTotal,

    job_group_id: String(options.jobGroupId),
    job_number: options.jobNumber,

    incomplete_reason: toNullableString(payload.incompleteReason),
    incomplete_note: toNullableString(payload.incompleteNote),
    incomplete_notes: toNullableString(payload.incompleteNotes),
    incomplete_photo_url: toNullableString(payload.incompletePhotoUrl),

    return_fee: toNullableNumber(payload.returnFee ?? payload.returnFeeCharged),
    return_fee_charged: toNullableNumber(payload.returnFeeCharged ?? payload.returnFee),
    return_fee_installer_pay: money.installerReturnPay,
    mileage_fee: customerMileageCharge,
    admin_fee_note: toNullableString(payload.adminFeeNote),
    redo_requested: toBoolean(payload.redoRequested),

    add_on_services: toArray(payload.addOnServices),
    just_services: toArray(payload.justServices),

    waterfall_quantity: toNullableNumber(payload.waterfallQuantity),
    outlet_plug_cutout_quantity: toNullableNumber(payload.outletPlugCutoutQuantity),
    disposal_responsibility: toNullableString(payload.disposalResponsibility),

    installer_base_pay: money.installerBasePay,
    installer_mileage_pay: money.installerMileagePay,
    installer_addon_pay: round2(money.installerAddonPay + money.installerJustServicePay),
    installer_cut_polish_pay: money.installerCutPolishPay,
    installer_sink_pay: money.installerSinkPay,
    installer_other_pay: money.installerOtherPay,
    installer_subtotal_pay: money.installerSubtotalPay,
    installer_hst_pay: money.installerHstPay,

    completed_photo_url: toNullableString(payload.completedPhotoUrl),
    completion_signature_url: toNullableString(payload.completionSignatureUrl),
    has_signing_form:
      payload.hasSigningForm === undefined ? null : toBoolean(payload.hasSigningForm),

    installer_payout_lines: Array.isArray(payload.installerPayoutLines)
      ? payload.installerPayoutLines.map((line) => ({
          label: toNullableString(line?.label) || "Payout Line",
          amount: round2(toNumber(line?.amount)),
        }))
      : null,

    one_way_km: toNullableNumber(payload.oneWayKm),
    round_trip_km: toNullableNumber(payload.roundTripKm),
    chargeable_km: toNullableNumber(payload.chargeableKm),

    ...aiFields,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const data = (await req.json()) as BookingPayload;

    if (!data.customerName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (!data.customerEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer email is required." },
        { status: 400 }
      );
    }

    if (!data.pickupAddress?.trim()) {
      return NextResponse.json(
        { success: false, error: "Pick up address is required." },
        { status: 400 }
      );
    }

    const mainOneWayKm = toNumber(data.oneWayKm);
    const secondOneWayKm = toNumber(data.secondJob?.oneWayKm);
    const maxDistance = Math.max(mainOneWayKm, secondOneWayKm);

    if (maxDistance > AI_CONFIG.maxServiceDistanceKm) {
      return NextResponse.json(
        {
          success: false,
          error: `Booking is outside the current service limit of ${AI_CONFIG.maxServiceDistanceKm} km one-way.`,
        },
        { status: 400 }
      );
    }

    const jobGroupId = data.jobGroupId || Date.now();
    const hasSecondJob = Boolean(
      data.secondJob &&
        (
          toNullableString(data.secondJob.pickupAddress) ||
          toNullableString(data.secondJob.dropoffAddress) ||
          toNullableString(data.secondJob.serviceType) ||
          toNumber(data.secondJob.finalTotal ?? data.secondJob.customerTotal) > 0
        )
    );

    const rows = [
      buildBookingRow(data, {
        jobGroupId,
        jobNumber: 1,
        hasSecondJob,
      }),
    ];

    if (hasSecondJob && data.secondJob) {
      rows.push(
        buildBookingRow(data.secondJob, {
          jobGroupId,
          jobNumber: 2,
          hasSecondJob,
        })
      );
    }

    const { data: insertedRows, error } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id, job_id, job_group_id, job_number");

    if (error) {
      console.error("BOOKING INSERT ERROR:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Booking saved to database",
      jobGroupId: String(jobGroupId),
      jobs: insertedRows || [],
    });
  } catch (error) {
    console.error("BOOKING ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to save booking" },
      { status: 500 }
    );
  }
}