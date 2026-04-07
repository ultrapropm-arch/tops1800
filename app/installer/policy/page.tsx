"use client";

const POLICY_ITEMS = [
  "Installers must arrive on time and communicate quickly if delayed.",
  "Installers must review full job details before accepting a job.",
  "Accepted jobs are the installer’s responsibility unless admin approves a change.",
  "All countertop pieces must be checked and counted at pickup.",
  "Installers must verify pickup and drop-off addresses before leaving.",
  "Waiting time may be charged when applicable.",
  "If any paperwork requires a signature, installers must complete it properly.",
  "Installers must upload photo proof or completion proof when required.",
  "If a job cannot be completed, it must be marked incomplete with a clear reason and notes.",
  "Incomplete jobs caused by installer error may place payout on hold.",
  "Customer-caused or shop-caused incomplete jobs may qualify for return fee and mileage pay.",
  "Do not mark a job completed unless the work is actually finished.",
  "Payout status may move through unpaid, pending review, hold, ready, and paid.",
  "Admin may adjust payouts for disputes, return trips, grouped jobs, or corrected pricing.",
  "Professional behavior is required on every job site and pickup location.",
];

const PRICE_GROUPS = [
  {
    title: "Main Installation Rates",
    items: [
      { service: "3cm Installation", payout: "$7.00 / sqft" },
      { service: "2cm Standard Installation", payout: "$6.50 / sqft" },
      { service: "Full Height Backsplash", payout: "$7.00 / sqft" },
      { service: "Backsplash Tiling", payout: "$13.00 / sqft" },
    ],
  },
  {
    title: "Mileage / Return Visit",
    items: [
      { service: "Mileage", payout: "$1.00 / km" },
      { service: "Return Visit Pay", payout: "$180.00" },
      {
        service: "Rebook Mileage Pay",
        payout: "50% of customer mileage rate when rebook flow applies",
      },
    ],
  },
  {
    title: "Add-On Services",
    items: [
      { service: "Waterfall", payout: "$60.00 each" },
      { service: "Outlet Plug Cutout", payout: "$25.00 each" },
      { service: "Difficult / Stairs 7+ / Basement", payout: "$100.00" },
      { service: "Remeasure Backsplash - Full Height", payout: "$100.00" },
      { service: "Remeasure Backsplash - Low Height", payout: "$50.00" },
      { service: "Extra Helper", payout: "$110.00 each" },
      { service: "Condo / High-Rise", payout: "$50.00" },
      { service: "Sink Cutout Onsite", payout: "$100.00" },
      { service: "Cooktop Cutout", payout: "$100.00" },
      { service: "Marble / Granite Sealing", payout: "$25.00" },
      { service: "Plumbing Removal", payout: "$25.00" },
      { service: "Onsite Cutting", payout: "$100.00" },
      { service: "Onsite Polishing", payout: "$90.00" },
    ],
  },
  {
    title: "Removal / Disposal",
    items: [
      { service: "Vanity Removal - Customer Disposal", payout: "$40.00" },
      { service: "Vanity Removal - Installer Disposal", payout: "$110.00" },
      {
        service: "Backsplash Tile Removal - Customer Disposal",
        payout: "$190.00",
      },
      {
        service: "Backsplash Tile Removal - Installer Disposal",
        payout: "$320.00",
      },
      { service: "Stone Removal - Customer Disposal", payout: "$200.00" },
      { service: "Stone Removal - Installer Disposal", payout: "$325.00" },
      { service: "Laminate Removal - Customer Disposal", payout: "$100.00" },
      { service: "Laminate Removal - Installer Disposal", payout: "$250.00" },
    ],
  },
];

export default function InstallerPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-4xl font-bold text-yellow-500">
            Installer Policy & Price List
          </h1>
          <p className="mt-3 max-w-4xl text-gray-300">
            Review installer rules, payout structure, and service pricing in one
            place.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold text-yellow-500">
            Installer Policy
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {POLICY_ITEMS.map((item, index) => (
              <div
                key={`${index}-${item}`}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <p className="text-sm leading-7 text-gray-300">
                  <span className="font-semibold text-yellow-400">
                    {String(index + 1).padStart(2, "0")}.
                  </span>{" "}
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        {PRICE_GROUPS.map((group) => (
          <section
            key={group.title}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
          >
            <h2 className="text-2xl font-bold text-yellow-500">
              {group.title}
            </h2>

            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">
              <div className="grid grid-cols-2 border-b border-zinc-800 bg-black">
                <div className="p-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Service
                </div>
                <div className="p-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Installer Payout
                </div>
              </div>

              {group.items.map((item) => (
                <div
                  key={`${group.title}-${item.service}`}
                  className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-950 last:border-b-0"
                >
                  <div className="p-4 text-sm text-white">{item.service}</div>
                  <div className="p-4 text-sm font-semibold text-yellow-400">
                    {item.payout}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold text-yellow-500">
            Important Notes
          </h2>

          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <p>
              • Installer payout shown here is the standard payout guide. Final
              payout may vary if admin adjusts a job for return visits,
              disputes, grouped jobs, or corrected job details.
            </p>
            <p>
              • Mileage, return pay, and incomplete-job payouts depend on the
              final booking data and admin approval when needed.
            </p>
            <p>
              • Installers should always review the pay breakdown inside each
              job before accepting.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}