import { openai } from "./client";

type QuoteInput = {
  serviceType?: "installation_3cm" | "installation_2cm" | "backsplash";
  sqft?: number;
  distanceKm?: number;
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
  city?: string;
  timeline?: "same-day" | "next-day" | "scheduled";
};

function detectQuoteInput(message: string): QuoteInput {
  const text = message.toLowerCase();

  const sqftMatch = text.match(/(\d+(?:\.\d+)?)\s*(sq\s*ft|sqft|square\s*feet|square\s*foot)/i);
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(km|kilometer|kilometers)/i);
  const waterfallMatch = text.match(/(\d+)\s*(waterfall|waterfalls)/i);
  const outletMatch = text.match(/(\d+)\s*(outlet|outlets|plug cutout|plug cutouts|outlet cutout|outlet cutouts)/i);
  const helperMatch = text.match(/(\d+)\s*(extra helper|extra helpers|helper|helpers)/i);

  let serviceType: QuoteInput["serviceType"];
  if (text.includes("3cm")) serviceType = "installation_3cm";
  else if (text.includes("2cm")) serviceType = "installation_2cm";
  else if (text.includes("backsplash")) serviceType = "backsplash";

  let timeline: QuoteInput["timeline"];
  if (text.includes("same day") || text.includes("same-day")) timeline = "same-day";
  else if (text.includes("next day") || text.includes("next-day")) timeline = "next-day";
  else if (text.includes("scheduled") || text.includes("schedule")) timeline = "scheduled";

  return {
    serviceType,
    sqft: sqftMatch ? Number(sqftMatch[1]) : undefined,
    distanceKm: kmMatch ? Number(kmMatch[1]) : undefined,
    waterfalls: waterfallMatch ? Number(waterfallMatch[1]) : undefined,
    outletCutouts: outletMatch ? Number(outletMatch[1]) : undefined,
    sinkCutout: /sink cutout|sink/i.test(text) ? true : undefined,
    cooktopCutout: /cooktop cutout|cooktop/i.test(text) ? true : undefined,
    condoHighRise: /condo|high-rise|high rise/i.test(text) ? true : undefined,
    difficultAccess: /stairs|basement|difficult access/i.test(text) ? true : undefined,
    onsiteCutting: /onsite cutting|on-site cutting/i.test(text) ? true : undefined,
    onsitePolishing: /onsite polishing|on-site polishing/i.test(text) ? true : undefined,
    plumbingRemoval: /plumbing removal/i.test(text) ? true : undefined,
    sealing: /sealing|marble sealing|granite sealing/i.test(text) ? true : undefined,
    remeasureFH: /remeasure backsplash fh/i.test(text) ? true : undefined,
    remeasureLH: /remeasure backsplash lh/i.test(text) ? true : undefined,
    extraHelpers: helperMatch ? Number(helperMatch[1]) : undefined,
    city: (() => {
      const cities = [
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
      return cities.find((c) => text.includes(c));
    })(),
    timeline,
  };
}

function calculateQuote(input: QuoteInput) {
  const serviceRates = {
    installation_3cm: 10,
    installation_2cm: 9,
    backsplash: 10,
  } as const;

  const serviceLabelMap = {
    installation_3cm: "3cm Installation",
    installation_2cm: "2cm Installation",
    backsplash: "Full Height Backsplash",
  } as const;

  const lineItems: Array<{ label: string; amount: number }> = [];

  if (input.serviceType && input.sqft) {
    const rate = serviceRates[input.serviceType];
    lineItems.push({
      label: `${serviceLabelMap[input.serviceType]} (${input.sqft} sqft × $${rate})`,
      amount: input.sqft * rate,
    });
  }

  if (input.distanceKm) {
    lineItems.push({
      label: `Mileage (${input.distanceKm} km × $1.40)`,
      amount: input.distanceKm * 1.4,
    });
  }

  if (input.waterfalls) {
    lineItems.push({
      label: `Waterfalls (${input.waterfalls} × $100)`,
      amount: input.waterfalls * 100,
    });
  }

  if (input.outletCutouts) {
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
    lineItems.push({ label: "Difficult Access / Stairs / Basement", amount: 180 });
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

  if (input.extraHelpers) {
    lineItems.push({
      label: `Extra Helpers (${input.extraHelpers} × $200)`,
      amount: input.extraHelpers * 200,
    });
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return { lineItems, total };
}

function getMissingFields(input: QuoteInput) {
  const missing: string[] = [];

  if (!input.serviceType) missing.push("service type");
  if (!input.sqft) missing.push("square footage");

  if (
    input.serviceType === "installation_3cm" ||
    input.serviceType === "installation_2cm" ||
    input.serviceType === "backsplash"
  ) {
    if (input.distanceKm === undefined) missing.push("distance in km");
  }

  if (input.waterfalls === undefined) missing.push("number of waterfalls");
  if (input.outletCutouts === undefined) missing.push("number of outlet cutouts");
  if (input.sinkCutout === undefined) missing.push("whether you need a sink cutout");
  if (input.cooktopCutout === undefined) missing.push("whether you need a cooktop cutout");
  if (input.condoHighRise === undefined) missing.push("whether this is a condo or high-rise");
  if (input.difficultAccess === undefined) missing.push("whether there are stairs, basement access, or difficult access");
  if (!input.timeline) missing.push("timing: same-day, next-day, or scheduled");

  return missing;
}

export async function supportReply(message: string) {
  if (!openai) return "AI not configured.";

  const parsed = detectQuoteInput(message);
  const missing = getMissingFields(parsed);
  const { lineItems, total } = calculateQuote(parsed);

  const breakdown =
    lineItems.length > 0
      ? lineItems.map((item) => `• ${item.label} = $${item.amount.toFixed(2)}`).join("\n")
      : "• No pricing items calculated yet.";

  const missingPrompt =
    missing.length > 0
      ? `Ask only the most important missing questions from this list:\n${missing
          .slice(0, 5)
          .map((m) => `- ${m}`)
          .join("\n")}`
      : `You have enough information to give the estimate and ask if the customer wants to continue to booking.`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are the 1800TOPS AI sales assistant.

Use ONLY the pricing breakdown and totals provided to you.
Do NOT invent any market pricing.
Do NOT change any amounts.
Keep replies short, clean, and sales-focused.

If enough details are available:
- show the estimate clearly
- ask whether the customer wants to continue to booking
- tell them they can book here: https://1800tops.com/book

If details are missing:
- show any partial estimate already available
- ask only a few short missing questions
- always ask if they need any additional services

Tone:
- professional
- direct
- helpful
          `.trim(),
        },
        {
          role: "user",
          content: `
Customer message:
${message}

Detected details:
${JSON.stringify(parsed, null, 2)}

Pricing breakdown:
${breakdown}

Current total:
$${total.toFixed(2)}

Instructions:
${missingPrompt}
          `.trim(),
        },
      ],
    });

    return res.choices[0]?.message?.content || "No response.";
  } catch (error) {
    console.error("OpenAI support error:", error);
    return "AI failed.";
  }
}