import { openai } from "./client";

type ServiceType = "installation_3cm" | "installation_2cm" | "backsplash";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type QuoteInput = {
  serviceType?: ServiceType;
  sqft?: number;
  distanceKm?: number; // one-way distance
  waterfalls?: number;
  outletCutouts?: number;
  sinkCutout?: boolean;
  cooktopCutout?: boolean;
  condoHighRise?: boolean;
  difficultAccess?: boolean;
  onsiteCutting?: boolean;
  onsitePolishing?: boolean;
  plumbingRemoval?: boolean;
  sealing?: boolean;
  remeasureFH?: boolean;
  remeasureLH?: boolean;
  extraHelpers?: number;
  removal?: boolean;
  city?: string;
  timeline?: "same-day" | "next-day" | "scheduled";
};

type LineItem = {
  label: string;
  amount: number;
};

const BOOKING_URL = "https://1800tops.com/book";
const MAX_ONE_WAY_SERVICE_KM = 200;
const CUSTOMER_MILEAGE_RATE = 1.5;
const FREE_ROUND_TRIP_KM = 120;
const MAX_ROUND_TRIP_BILLABLE_WINDOW_KM = 320;

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening)$/i.test(
    text.trim()
  );
}

function isAffirmative(text: string) {
  return /^(yes|yeah|yep|sure|ok|okay|go ahead|continue|proceed)$/i.test(
    text.trim()
  );
}

function isBookingIntent(text: string) {
  return /\b(book|booking|want to book|book now|go to booking|complete booking)\b/i.test(
    text
  );
}

function detectServiceType(text: string): ServiceType | undefined {
  const normalized = normalizeText(text);

  if (
    /\b2\s*cm\b/.test(normalized) ||
    normalized.includes("2cm") ||
    normalized.includes("2 cm")
  ) {
    return "installation_2cm";
  }

  if (
    /\b3\s*cm\b/.test(normalized) ||
    normalized.includes("3cm") ||
    normalized.includes("3 cm")
  ) {
    return "installation_3cm";
  }

  if (normalized.includes("backsplash")) {
    return "backsplash";
  }

  return undefined;
}

function detectQuoteInput(message: string): QuoteInput {
  const text = normalizeText(message);

  const sqftMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(sq\s*ft|sqft|square\s*feet|square\s*foot)\b/i
  );
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(km|kilometer|kilometers)\b/i);
  const waterfallMatch = text.match(/(\d+)\s*(waterfall|waterfalls)\b/i);
  const outletMatch = text.match(
    /(\d+)\s*(outlet|outlets|plug cutout|plug cutouts|outlet cutout|outlet cutouts)\b/i
  );
  const helperMatch = text.match(
    /(\d+)\s*(extra helper|extra helpers|helper|helpers)\b/i
  );

  let timeline: QuoteInput["timeline"];
  if (text.includes("same day") || text.includes("same-day")) timeline = "same-day";
  else if (text.includes("next day") || text.includes("next-day")) timeline = "next-day";
  else if (text.includes("scheduled") || text.includes("schedule")) timeline = "scheduled";

  const cityList = [
    "toronto",
    "mississauga",
    "brampton",
    "vaughan",
    "markham",
    "richmond hill",
    "oakville",
    "milton",
    "burlington",
    "hamilton",
    "scarborough",
    "north york",
    "etobicoke",
  ];

  const city = cityList.find((c) => text.includes(c));

  const sinkCutout =
    /\bno sink\b|\bno sink cutout\b/.test(text)
      ? false
      : /\bsink cutout\b|\bsink\b/.test(text)
      ? true
      : undefined;

  const cooktopCutout =
    /\bno cooktop\b|\bno cooktop cutout\b/.test(text)
      ? false
      : /\bcooktop cutout\b|\bcooktop\b/.test(text)
      ? true
      : undefined;

  const condoHighRise =
    /\bnot condo\b|\bno condo\b|\bhouse\b/.test(text)
      ? false
      : /\bcondo\b|\bhigh-rise\b|\bhigh rise\b/.test(text)
      ? true
      : undefined;

  const difficultAccess =
    /\bno stairs\b|\bno basement\b|\beasy access\b/.test(text)
      ? false
      : /\bstairs\b|\bbasement\b|\bdifficult access\b/.test(text)
      ? true
      : undefined;

  const onsiteCutting =
    /\bno onsite cutting\b/.test(text)
      ? false
      : /\bonsite cutting\b|\bon-site cutting\b/.test(text)
      ? true
      : undefined;

  const onsitePolishing =
    /\bno onsite polishing\b/.test(text)
      ? false
      : /\bonsite polishing\b|\bon-site polishing\b/.test(text)
      ? true
      : undefined;

  const plumbingRemoval =
    /\bno plumbing removal\b/.test(text)
      ? false
      : /\bplumbing removal\b/.test(text)
      ? true
      : undefined;

  const sealing =
    /\bno sealing\b/.test(text)
      ? false
      : /\bsealing\b|\bmarble sealing\b|\bgranite sealing\b/.test(text)
      ? true
      : undefined;

  const removal =
    /\bno removal\b|\bno disposal\b/.test(text)
      ? false
      : /\bremoval\b|\bremove\b|\bdisposal\b|\bhaul away\b|\btear out\b/.test(text)
      ? true
      : undefined;

  return {
    serviceType: detectServiceType(text),
    sqft: sqftMatch ? Number(sqftMatch[1]) : undefined,
    distanceKm: kmMatch ? Number(kmMatch[1]) : undefined,
    waterfalls: waterfallMatch ? Number(waterfallMatch[1]) : undefined,
    outletCutouts: outletMatch ? Number(outletMatch[1]) : undefined,
    sinkCutout,
    cooktopCutout,
    condoHighRise,
    difficultAccess,
    onsiteCutting,
    onsitePolishing,
    plumbingRemoval,
    sealing,
    remeasureFH: /\bremeasure backsplash fh\b/.test(text) ? true : undefined,
    remeasureLH: /\bremeasure backsplash lh\b/.test(text) ? true : undefined,
    extraHelpers: helperMatch ? Number(helperMatch[1]) : undefined,
    removal,
    city,
    timeline,
  };
}

function mergeQuoteInputs(base: QuoteInput, next: QuoteInput): QuoteInput {
  return {
    serviceType: next.serviceType ?? base.serviceType,
    sqft: next.sqft ?? base.sqft,
    distanceKm: next.distanceKm ?? base.distanceKm,
    waterfalls: next.waterfalls ?? base.waterfalls,
    outletCutouts: next.outletCutouts ?? base.outletCutouts,
    sinkCutout: next.sinkCutout ?? base.sinkCutout,
    cooktopCutout: next.cooktopCutout ?? base.cooktopCutout,
    condoHighRise: next.condoHighRise ?? base.condoHighRise,
    difficultAccess: next.difficultAccess ?? base.difficultAccess,
    onsiteCutting: next.onsiteCutting ?? base.onsiteCutting,
    onsitePolishing: next.onsitePolishing ?? base.onsitePolishing,
    plumbingRemoval: next.plumbingRemoval ?? base.plumbingRemoval,
    sealing: next.sealing ?? base.sealing,
    remeasureFH: next.remeasureFH ?? base.remeasureFH,
    remeasureLH: next.remeasureLH ?? base.remeasureLH,
    extraHelpers: next.extraHelpers ?? base.extraHelpers,
    removal: next.removal ?? base.removal,
    city: next.city ?? base.city,
    timeline: next.timeline ?? base.timeline,
  };
}

function getMissingFieldKeys(input: QuoteInput) {
  const missing: string[] = [];

  if (!input.serviceType) missing.push("serviceType");
  if (!input.sqft) missing.push("sqft");
  if (input.distanceKm === undefined) missing.push("distanceKm");

  return missing;
}

function applySmartSingleNumber(
  message: string,
  current: QuoteInput,
  previousMissingFields: string[]
): QuoteInput {
  const text = normalizeText(message);
  const plainNumber = text.match(/^(\d+(?:\.\d+)?)$/);

  if (!plainNumber) return current;

  const value = Number(plainNumber[1]);

  if (!current.sqft && previousMissingFields.includes("sqft")) {
    return { ...current, sqft: value };
  }

  if (current.distanceKm === undefined && previousMissingFields.includes("distanceKm")) {
    return { ...current, distanceKm: value };
  }

  if (current.waterfalls === undefined && previousMissingFields.includes("waterfalls")) {
    return { ...current, waterfalls: value };
  }

  if (current.outletCutouts === undefined && previousMissingFields.includes("outletCutouts")) {
    return { ...current, outletCutouts: value };
  }

  if (current.extraHelpers === undefined && previousMissingFields.includes("extraHelpers")) {
    return { ...current, extraHelpers: value };
  }

  if (!current.sqft && current.serviceType) {
    return { ...current, sqft: value };
  }

  if (current.distanceKm === undefined && current.sqft) {
    return { ...current, distanceKm: value };
  }

  return current;
}

function buildQuoteInputFromMessages(messages: ChatMessage[]) {
  let combined: QuoteInput = {};
  let previousMissingFields: string[] = ["serviceType", "sqft", "distanceKm"];

  for (const msg of messages) {
    if (msg.role !== "user") continue;

    const parsed = detectQuoteInput(msg.content);
    combined = mergeQuoteInputs(combined, parsed);
    combined = applySmartSingleNumber(msg.content, combined, previousMissingFields);
    previousMissingFields = getMissingFieldKeys(combined);
  }

  return combined;
}

function calculateCustomerMileage(distanceKm?: number) {
  if (typeof distanceKm !== "number" || Number.isNaN(distanceKm) || distanceKm <= 0) {
    return {
      originalOneWayKm: 0,
      usedOneWayKm: 0,
      roundTripKm: 0,
      chargeableKm: 0,
      amount: 0,
      capped: false,
    };
  }

  const originalOneWayKm = distanceKm;
  const usedOneWayKm = Math.min(distanceKm, MAX_ONE_WAY_SERVICE_KM);
  const capped = originalOneWayKm > MAX_ONE_WAY_SERVICE_KM;

  const roundTripKm = usedOneWayKm * 2;
  const eligibleRoundTripKm = Math.min(roundTripKm, MAX_ROUND_TRIP_BILLABLE_WINDOW_KM);
  const chargeableKm = Math.max(0, eligibleRoundTripKm - FREE_ROUND_TRIP_KM);
  const amount = chargeableKm * CUSTOMER_MILEAGE_RATE;

  return {
    originalOneWayKm,
    usedOneWayKm,
    roundTripKm,
    chargeableKm,
    amount,
    capped,
  };
}

function calculateQuote(input: QuoteInput) {
  const lineItems: LineItem[] = [];
  const notes: string[] = [];

  if (input.serviceType && input.sqft) {
    if (input.serviceType === "installation_3cm") {
      lineItems.push({
        label: `3cm Installation (${input.sqft} sqft × $10)`,
        amount: input.sqft * 10,
      });
    }

    if (input.serviceType === "installation_2cm") {
      lineItems.push({
        label: `2cm Installation (${input.sqft} sqft × $9)`,
        amount: input.sqft * 9,
      });
    }

    if (input.serviceType === "backsplash") {
      lineItems.push({
        label: `Full Height Backsplash (${input.sqft} sqft × $10)`,
        amount: input.sqft * 10,
      });
    }
  }

  if (typeof input.distanceKm === "number") {
    const mileage = calculateCustomerMileage(input.distanceKm);

    if (mileage.amount > 0) {
      lineItems.push({
        label: `Mileage (${mileage.chargeableKm} extra km × $1.50, first 120 km round-trip free)`,
        amount: mileage.amount,
      });
    }

    if (mileage.amount === 0) {
      notes.push(
        `Mileage is $0.00 so far because the first ${FREE_ROUND_TRIP_KM} km round-trip is free.`
      );
    }

    if (mileage.capped) {
      notes.push(
        `Distance entered is above the ${MAX_ONE_WAY_SERVICE_KM} km one-way service limit. This rough quote used ${MAX_ONE_WAY_SERVICE_KM} km one-way max.`
      );
    }
  }

  if (typeof input.waterfalls === "number" && input.waterfalls > 0) {
    lineItems.push({
      label: `Waterfalls (${input.waterfalls} × $100)`,
      amount: input.waterfalls * 100,
    });
  }

  if (typeof input.outletCutouts === "number" && input.outletCutouts > 0) {
    lineItems.push({
      label: `Outlet Cutouts (${input.outletCutouts} × $50)`,
      amount: input.outletCutouts * 50,
    });
  }

  if (input.sinkCutout) {
    lineItems.push({ label: "Sink Cutout Onsite", amount: 180 });
  }

  if (input.cooktopCutout) {
    lineItems.push({ label: "Cooktop Cutout", amount: 180 });
  }

  if (input.condoHighRise) {
    lineItems.push({ label: "Condo / High-Rise", amount: 80 });
  }

  if (input.difficultAccess) {
    lineItems.push({
      label: "Difficult Access / Stairs 7+ / Basement",
      amount: 180,
    });
  }

  if (input.onsiteCutting) {
    lineItems.push({ label: "Onsite Cutting", amount: 175 });
  }

  if (input.onsitePolishing) {
    lineItems.push({ label: "Onsite Polishing", amount: 175 });
  }

  if (input.plumbingRemoval) {
    lineItems.push({ label: "Plumbing Removal", amount: 50 });
  }

  if (input.sealing) {
    lineItems.push({ label: "Marble / Granite Sealing", amount: 50 });
  }

  if (input.remeasureFH) {
    lineItems.push({ label: "Remeasure Backsplash FH", amount: 180 });
  }

  if (input.remeasureLH) {
    lineItems.push({ label: "Remeasure Backsplash LH", amount: 80 });
  }

  if (typeof input.extraHelpers === "number" && input.extraHelpers > 0) {
    lineItems.push({
      label: `Extra Helpers (${input.extraHelpers} × $200)`,
      amount: input.extraHelpers * 200,
    });
  }

  if (input.removal) {
    notes.push("Removal requested. I can include it once the removal scope is confirmed.");
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return { lineItems, total, notes };
}

function getStraightQuestions(input: QuoteInput) {
  const questions: string[] = [];

  if (!input.serviceType) {
    questions.push("Is it 2cm installation, 3cm installation, or full height backsplash?");
  }

  if (!input.sqft) {
    questions.push("How many sqft is it?");
  }

  if (input.distanceKm === undefined) {
    questions.push(
      "What is the one-way distance in km? We use your booking mileage rule with the first 120 km round-trip free."
    );
  }

  const extrasUnknown =
    input.removal === undefined &&
    input.waterfalls === undefined &&
    input.extraHelpers === undefined &&
    input.onsiteCutting === undefined &&
    input.onsitePolishing === undefined &&
    input.sinkCutout === undefined &&
    input.cooktopCutout === undefined &&
    input.outletCutouts === undefined &&
    input.plumbingRemoval === undefined &&
    input.sealing === undefined;

  if (extrasUnknown) {
    questions.push(
      "Do you need any extras like removal, waterfall, extra helper, sink cutout, cooktop cutout, outlet cutouts, plumbing removal, sealing, or onsite services?"
    );
  }

  if (!input.timeline) {
    questions.push("Do you need same-day, next-day, or scheduled service?");
  }

  return questions.slice(0, 2);
}

function buildIntro(input: QuoteInput) {
  const parts: string[] = [];

  if (input.serviceType === "installation_3cm") parts.push("3cm installation");
  if (input.serviceType === "installation_2cm") parts.push("2cm installation");
  if (input.serviceType === "backsplash") parts.push("full height backsplash");
  if (input.sqft) parts.push(`${input.sqft} sqft`);
  if (input.city) parts.push(`in ${titleCase(input.city)}`);

  return parts.length ? `Got it — ${parts.join(", ")}.` : "Got it.";
}

function shouldTreatAsBookingYes(messages: ChatMessage[]) {
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const lastAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";

  const userText = normalizeText(lastUserMessage);
  const assistantText = normalizeText(lastAssistantMessage);

  if (!isAffirmative(userText)) return false;

  return (
    assistantText.includes("do you want to book") ||
    assistantText.includes("would you like to book") ||
    assistantText.includes("book here") ||
    assistantText.includes(BOOKING_URL.toLowerCase())
  );
}

function buildDeterministicQuoteReply(messages: ChatMessage[]) {
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const lastText = normalizeText(lastUserMessage);

  if (isGreeting(lastText)) {
    return "Hi 👋 What would you like quoted today? Send me the type of job, sqft, and one-way distance in km.";
  }

  if (isBookingIntent(lastText) || shouldTreatAsBookingYes(messages)) {
    return `Perfect — you can book here:\n👉 ${BOOKING_URL}`;
  }

  const parsed = buildQuoteInputFromMessages(messages);
  const { lineItems, total, notes } = calculateQuote(parsed);
  const followUps = getStraightQuestions(parsed);
  const intro = buildIntro(parsed);

  if (!parsed.serviceType && !parsed.sqft && !parsed.distanceKm) {
    return "What are you looking for today — 2cm installation, 3cm installation, or full height backsplash?";
  }

  const notesBlock = notes.length > 0 ? `\n\n${notes.map((note) => `• ${note}`).join("\n")}` : "";

  if (lineItems.length > 0) {
    const breakdown = lineItems
      .map((item) => `• ${item.label} = ${formatCurrency(item.amount)}`)
      .join("\n");

    if (followUps.length > 0) {
      return `${intro}

Here is your rough quote so far:

${breakdown}

Current total: ${formatCurrency(total)}${notesBlock}

${followUps.join("\n")}`;
    }

    return `${intro}

Here is your estimate:

${breakdown}

Estimated total: ${formatCurrency(total)}${notesBlock}

Do you want to book?

👉 ${BOOKING_URL}`;
  }

  if (followUps.length > 0) {
    return `${intro}

${followUps.join("\n")}`;
  }

  return `Do you want to book?

👉 ${BOOKING_URL}`;
}

export async function supportReply(messages: ChatMessage[]) {
  const deterministicReply = buildDeterministicQuoteReply(messages);

  if (!openai) {
    return deterministicReply;
  }

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are the 1800TOPS quote assistant.

Rewrite the draft reply so it sounds:
- direct
- natural
- short
- sales-focused

Rules:
- keep all prices exactly the same
- keep all totals exactly the same
- keep the booking link exactly the same
- keep the booking mileage logic exactly the same
- do not ask repeated questions
- ask straightforward questions only
- when enough info is available, clearly ask: "Do you want to book?"
- do not add fake pricing
- do not remove important notes about mileage or service limits
          `.trim(),
        },
        {
          role: "user",
          content: deterministicReply,
        },
      ],
    });

    return res.choices[0]?.message?.content?.trim() || deterministicReply;
  } catch {
    return deterministicReply;
  }
}