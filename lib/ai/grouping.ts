export type GroupingBooking = {
  id: string;
  job_id?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  timeline?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  company_profit?: number | null;
  ai_recommended_installer_type?: string | null;
};

export type GroupingMatch = {
  id: string;
  job_id?: string | null;
  score: number;
  reasons: string[];
};

export type GroupingResult = {
  groupingLabel: "Strong Grouping" | "Possible Group" | "Solo Route";
  routeHint: string;
  groupingScore: number;
  matchedJobIds: string[];
  matches: GroupingMatch[];
};

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function parseArea(text?: string | null) {
  const value = normalizeText(text);

  const areas = [
    "toronto",
    "north york",
    "scarborough",
    "etobicoke",
    "mississauga",
    "brampton",
    "vaughan",
    "markham",
    "richmond hill",
    "oakville",
    "ajax",
    "pickering",
    "milton",
    "burlington",
  ];

  return areas.find((area) => value.includes(area)) || "";
}

function getUrgencyWeight(booking: GroupingBooking) {
  const text = [
    booking.timeline || "",
    booking.pickup_time_slot || "",
    booking.scheduled_time || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("same")) return 20;
  if (text.includes("next")) return 10;
  return 0;
}

function getTimeSlotBucket(booking: GroupingBooking) {
  const text = [
    booking.pickup_time_slot || "",
    booking.scheduled_time || "",
    booking.timeline || "",
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("morning")) return "morning";
  if (text.includes("afternoon")) return "afternoon";
  if (text.includes("evening")) return "evening";
  return "open";
}

function compareBookings(
  current: GroupingBooking,
  candidate: GroupingBooking
): GroupingMatch {
  let score = 0;
  const reasons: string[] = [];

  const currentDate = safeText(current.scheduled_date);
  const candidateDate = safeText(candidate.scheduled_date);

  if (currentDate && candidateDate && currentDate === candidateDate) {
    score += 30;
    reasons.push("same scheduled date");
  }

  const currentPickupArea = parseArea(current.pickup_address);
  const currentDropoffArea = parseArea(current.dropoff_address);
  const candidatePickupArea = parseArea(candidate.pickup_address);
  const candidateDropoffArea = parseArea(candidate.dropoff_address);

  const areaSetCurrent = new Set([currentPickupArea, currentDropoffArea].filter(Boolean));
  const areaSetCandidate = new Set([candidatePickupArea, candidateDropoffArea].filter(Boolean));

  const sharedAreas = [...areaSetCurrent].filter((area) => areaSetCandidate.has(area));

  if (sharedAreas.length > 0) {
    score += 30;
    reasons.push(`same area: ${sharedAreas.join(", ")}`);
  }

  const currentTimeBucket = getTimeSlotBucket(current);
  const candidateTimeBucket = getTimeSlotBucket(candidate);

  if (currentTimeBucket === candidateTimeBucket && currentTimeBucket !== "open") {
    score += 15;
    reasons.push(`same time window: ${currentTimeBucket}`);
  } else if (currentTimeBucket === "open" || candidateTimeBucket === "open") {
    score += 5;
    reasons.push("flexible schedule");
  }

  if (
    normalizeText(current.service_type) &&
    normalizeText(current.service_type) === normalizeText(candidate.service_type)
  ) {
    score += 10;
    reasons.push("same service type");
  }

  if (
    normalizeText(current.ai_recommended_installer_type) &&
    normalizeText(current.ai_recommended_installer_type) ===
      normalizeText(candidate.ai_recommended_installer_type)
  ) {
    score += 10;
    reasons.push("same installer type");
  }

  const urgencyBoost =
    Math.min(getUrgencyWeight(current), getUrgencyWeight(candidate)) > 0 ? 5 : 0;

  if (urgencyBoost) {
    score += urgencyBoost;
    reasons.push("urgent route pairing");
  }

  const profitTotal =
    Number(current.company_profit || 0) + Number(candidate.company_profit || 0);

  if (profitTotal >= 400) {
    score += 10;
    reasons.push("strong combined profit");
  } else if (profitTotal >= 200) {
    score += 5;
    reasons.push("good combined profit");
  }

  return {
    id: safeText(candidate.id),
    job_id: safeText(candidate.job_id) || null,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export function findGroupingMatches(
  currentBooking: GroupingBooking,
  allOpenBookings: GroupingBooking[]
): GroupingResult {
  const candidates = allOpenBookings
    .filter((booking) => safeText(booking.id) && booking.id !== currentBooking.id)
    .map((booking) => compareBookings(currentBooking, booking))
    .sort((a, b) => b.score - a.score);

  const topMatches = candidates.filter((match) => match.score >= 45).slice(0, 3);
  const topScore = Number(topMatches[0]?.score || 0);

  let groupingLabel: GroupingResult["groupingLabel"] = "Solo Route";

  if (topScore >= 75) groupingLabel = "Strong Grouping";
  else if (topScore >= 45) groupingLabel = "Possible Group";

  let routeHint = "No nearby grouped route suggested yet.";

  if (topMatches.length > 0) {
    const top = topMatches[0];
    const matchLabel = safeText(top.job_id) || safeText(top.id) || "nearby job";
    const matchReasons =
      top.reasons.length > 0 ? top.reasons.join(" • ") : "similar route conditions";

    routeHint = `Pair with ${matchLabel} — ${matchReasons}`;
  }

  return {
    groupingLabel,
    routeHint,
    groupingScore: Math.max(0, Math.min(100, topScore)),
    matchedJobIds: topMatches
      .map((match) => safeText(match.id))
      .filter(Boolean),
    matches: topMatches,
  };
}