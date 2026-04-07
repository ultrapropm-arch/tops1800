import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Booking = {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  timeline?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  sqft?: number | null;
  job_size?: number | null;
  one_way_km?: number | null;
  installer_pay?: number | null;
  status?: string | null;
  installer_name?: string | null;
  job_group_id?: string | number | null;
  is_archived?: boolean | null;
  final_total?: number | null;
  company_profit?: number | null;
  payment_status?: string | null;
  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;

  ai_distance_tier?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  ai_grouping_label?: string | null;
  ai_route_hint?: string | null;
  ai_urgency_label?: string | null;
};

type AiDispatchFields = {
  ai_distance_tier: string;
  ai_recommended_installer_type: string;
  ai_dispatch_score: number;
  ai_priority_score: number;
  ai_grouping_label: string;
  ai_route_hint: string;
  ai_urgency_label: string;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getRouteClusterKey(address?: string | null) {
  if (!address) return "";

  return address
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function getUrgencyLabel(job: Booking) {
  const text = [
    job.timeline || "",
    job.pickup_time_slot || "",
    job.scheduled_time || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("same")) return "Same-Day Priority";
  if (text.includes("next")) return "Next-Day Priority";

  return "Open Scheduling";
}

function getDistanceTier(oneWayKm: number) {
  if (oneWayKm > 180) return "Extreme Distance";
  if (oneWayKm > 120) return "Long Distance";
  if (oneWayKm > 70) return "Outer Zone";
  return "Standard Zone";
}

function getRecommendedInstallerType(params: {
  serviceType: string;
  sqft: number;
  oneWayKm: number;
  installerPay: number;
  addOnCount: number;
}) {
  const { serviceType, sqft, oneWayKm, installerPay, addOnCount } = params;

  if (oneWayKm > 120) return "Long Distance Specialist";
  if (sqft >= 80) return "Large Project Specialist";
  if (serviceType === "installation_3cm") return "3cm Stone Specialist";
  if (serviceType === "full_height_backsplash") return "Backsplash Specialist";
  if (serviceType === "backsplash_tiling") return "Tiling Specialist";
  if (addOnCount >= 3) return "Complex Job Specialist";
  if (installerPay >= 600) return "Top Earner Job Specialist";

  return "Standard Installer";
}

function buildRouteHint(params: {
  sameDateNearbyJobs: Booking[];
  oneWayKm: number;
  urgencyLabel: string;
  serviceType: string;
  installerPay: number;
}) {
  const {
    sameDateNearbyJobs,
    oneWayKm,
    urgencyLabel,
    serviceType,
    installerPay,
  } = params;

  if (sameDateNearbyJobs.length >= 2) {
    return "Bundle this with nearby same-date jobs for better route efficiency.";
  }

  if (sameDateNearbyJobs.length === 1) {
    return "Possible nearby grouped run available.";
  }

  if (urgencyLabel === "Same-Day Priority") {
    return "Prioritize fast installer outreach for same-day coverage.";
  }

  if (oneWayKm > 120) {
    return "Best handled as a dedicated long-distance trip.";
  }

  if (serviceType === "full_height_backsplash") {
    return "Prefer an installer strong with backsplash detail work.";
  }

  if (installerPay >= 600) {
    return "High-value payout job. Offer to stronger installers first.";
  }

  return "Standard dispatch flow recommended.";
}

function buildAiForJob(job: Booking, allJobs: Booking[]): AiDispatchFields {
  const oneWayKm = toNumber(job.one_way_km);
  const installerPay = toNumber(job.installer_pay);
  const sqft = toNumber(job.sqft || job.job_size);
  const finalTotal = toNumber(job.final_total);
  const companyProfit =
    job.company_profit !== null && job.company_profit !== undefined
      ? toNumber(job.company_profit)
      : finalTotal - installerPay;

  const serviceType = normalizeText(job.service_type);
  const urgencyLabel = getUrgencyLabel(job);
  const distanceTier = getDistanceTier(oneWayKm);

  const addOnCount =
    toArray(job.add_on_services).length + toArray(job.just_services).length;

  const recommendedInstallerType = getRecommendedInstallerType({
    serviceType,
    sqft,
    oneWayKm,
    installerPay,
    addOnCount,
  });

  const clusterKey = getRouteClusterKey(job.dropoff_address || job.pickup_address);

  const sameDateNearbyJobs = allJobs.filter((item) => {
    if (item.id === job.id) return false;
    if ((item.scheduled_date || "") !== (job.scheduled_date || "")) return false;

    const otherKey = getRouteClusterKey(item.dropoff_address || item.pickup_address);
    return Boolean(clusterKey) && Boolean(otherKey) && clusterKey === otherKey;
  });

  let groupingLabel = "Solo Route";
  if (sameDateNearbyJobs.length >= 2) groupingLabel = "Strong Grouping";
  else if (sameDateNearbyJobs.length === 1) groupingLabel = "Possible Group";

  const routeHint = buildRouteHint({
    sameDateNearbyJobs,
    oneWayKm,
    urgencyLabel,
    serviceType,
    installerPay,
  });

  let dispatchScore = 50;

  if (urgencyLabel === "Same-Day Priority") dispatchScore += 22;
  else if (urgencyLabel === "Next-Day Priority") dispatchScore += 10;

  if (groupingLabel === "Strong Grouping") dispatchScore += 16;
  else if (groupingLabel === "Possible Group") dispatchScore += 8;

  if (installerPay >= 700) dispatchScore += 12;
  else if (installerPay >= 500) dispatchScore += 8;

  if (sqft >= 80) dispatchScore += 8;
  else if (sqft >= 50) dispatchScore += 4;

  if (oneWayKm > 180) dispatchScore += 10;
  else if (oneWayKm > 120) dispatchScore += 7;
  else if (oneWayKm > 70) dispatchScore += 4;

  if (addOnCount >= 3) dispatchScore += 8;
  else if (addOnCount >= 1) dispatchScore += 3;

  if (companyProfit >= 300) dispatchScore += 6;
  else if (companyProfit <= 0) dispatchScore -= 8;

  let priorityScore = 45;

  if (urgencyLabel === "Same-Day Priority") priorityScore += 30;
  else if (urgencyLabel === "Next-Day Priority") priorityScore += 15;

  if (installerPay >= 700) priorityScore += 12;
  else if (installerPay >= 500) priorityScore += 8;

  if (sqft >= 80) priorityScore += 8;
  if (oneWayKm > 120) priorityScore += 6;
  if (groupingLabel === "Strong Grouping") priorityScore += 10;
  if (companyProfit >= 300) priorityScore += 4;

  dispatchScore = Math.max(0, Math.min(100, dispatchScore));
  priorityScore = Math.max(0, Math.min(100, priorityScore));

  return {
    ai_distance_tier: distanceTier,
    ai_recommended_installer_type: recommendedInstallerType,
    ai_dispatch_score: dispatchScore,
    ai_priority_score: priorityScore,
    ai_grouping_label: groupingLabel,
    ai_route_hint: routeHint,
    ai_urgency_label: urgencyLabel,
  };
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("is_archived", false)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const bookings = (data as Booking[]) || [];

    const targetJobs = bookings.filter((job) => {
      const status = normalizeText(job.status);
      return status === "available" && !normalizeText(job.installer_name);
    });

    const results: Array<{
      id: string;
      job_id: string;
      updated: boolean;
      ai_dispatch_score?: number;
      ai_priority_score?: number;
      ai_grouping_label?: string;
      ai_urgency_label?: string;
      error?: string;
    }> = [];

    for (const job of targetJobs) {
      const aiFields = buildAiForJob(job, targetJobs);

      const { error: updateError } = await supabase
        .from("bookings")
        .update(aiFields)
        .eq("id", job.id);

      if (updateError) {
        results.push({
          id: job.id,
          job_id: job.job_id || job.id,
          updated: false,
          error: updateError.message,
        });
        continue;
      }

      results.push({
        id: job.id,
        job_id: job.job_id || job.id,
        updated: true,
        ai_dispatch_score: aiFields.ai_dispatch_score,
        ai_priority_score: aiFields.ai_priority_score,
        ai_grouping_label: aiFields.ai_grouping_label,
        ai_urgency_label: aiFields.ai_urgency_label,
      });
    }

    return NextResponse.json({
      success: true,
      processed: targetJobs.length,
      updated: results.filter((item) => item.updated).length,
      failed: results.filter((item) => !item.updated).length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI dispatch error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}