import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fabricator Partner Program | 1-800TOPS",
  description:
    "Partner with 1-800TOPS for fast, reliable countertop installation support. Built for fabricators, stone shops, contractors, and growing partners across Canada.",
  keywords: [
    "fabricator partner program",
    "stone shop installation partner",
    "countertop installation partner",
    "countertop fabricator support",
    "countertop installers for fabricators",
    "shop installation partner",
    "1-800TOPS",
  ],
  alternates: {
    canonical: "https://1800tops.com/fabricator-partner-program",
  },
  openGraph: {
    title: "Fabricator Partner Program | 1-800TOPS",
    description:
      "Built for fabricators, stone shops, and contractors who need fast installation support, repeat job flow, and scalable scheduling.",
    url: "https://1800tops.com/fabricator-partner-program",
    siteName: "1-800TOPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fabricator Partner Program | 1-800TOPS",
    description:
      "Fast, reliable installation support for fabricators, stone shops, and repeat partners across Canada.",
  },
};

const partnerBenefits = [
  {
    title: "Priority Scheduling",
    description:
      "Move jobs faster with preferred scheduling support for recurring installation demand.",
  },
  {
    title: "Repeat Order Flow",
    description:
      "Built for partners who need ongoing countertop installation support without constant back-and-forth.",
  },
  {
    title: "Cleaner Coordination",
    description:
      "Organized booking flow, clearer job details, and faster handoff from sale to install.",
  },
  {
    title: "Scalable Support",
    description:
      "Designed to help growing shops and contractors handle more installation volume with confidence.",
  },
];

const programFeatures = [
  "Countertop installation support",
  "Full height backsplash support",
  "Fast scheduling options",
  "Repeat monthly partner flow",
  "Structured booking and checkout",
  "Multi-job support",
  "Live job visibility",
  "Built for Canada-wide growth",
];

const idealFor = [
  "Stone shops",
  "Fabricators",
  "Kitchen companies",
  "Contractors",
  "Builders",
  "Showrooms",
];

const faqs = [
  {
    q: "Who is the Fabricator Partner Program for?",
    a: "It is built for fabricators, stone shops, contractors, builders, and companies that need repeat countertop installation support.",
  },
  {
    q: "Can partners send repeat jobs through 1-800TOPS?",
    a: "Yes. The program is built for recurring work, cleaner scheduling, and stronger support for repeat installation volume.",
  },
  {
    q: "Do you offer fast scheduling?",
    a: "Yes. Depending on location, schedule, and scope, same-day and next-day options may be available.",
  },
  {
    q: "Is this only for one-off jobs?",
    a: "No. The partner page is specifically positioned for ongoing relationships, repeat jobs, and scalable installation support.",
  },
  {
    q: "Can I still book directly online?",
    a: "Yes. Partners can still move through the booking flow online while using 1-800TOPS for ongoing install support.",
  },
  {
    q: "Is 1-800TOPS Canada-wide?",
    a: "Yes. 1-800TOPS is positioned as a Canada-wide platform, with expansion continuing and future US growth planned.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Fabricator Partner Program",
  serviceType: "Countertop Installation Partner Program",
  provider: {
    "@type": "Organization",
    name: "1-800TOPS",
    url: "https://1800tops.com",
  },
  areaServed: {
    "@type": "Country",
    name: "Canada",
  },
  url: "https://1800tops.com/fabricator-partner-program",
  description:
    "Partner program for fabricators, stone shops, contractors, and growing partners who need repeat countertop installation support.",
};

export default function FabricatorPartnerProgramPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-neutral-200 bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.18),transparent_30%),radial-gradient(circle_at_left,rgba(234,179,8,0.10),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
          <div className="max-w-5xl">
            <div className="mb-5 inline-flex rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1.5 text-sm font-medium text-yellow-300">
              1-800TOPS • Fabricator Partner Program
            </div>

            <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              A Partner Program Built for Fabricators, Stone Shops, and Repeat
              Installation Demand
            </h1>

            <p className="mt-6 max-w-4xl text-lg leading-8 text-neutral-300 md:text-xl">
              1-800TOPS helps fabricators, contractors, showrooms, and growing
              partners move jobs faster with cleaner coordination, stronger
              scheduling, and scalable countertop installation support.
            </p>

            <p className="mt-4 max-w-4xl text-lg leading-8 text-neutral-300">
              Built for Canada-wide growth, repeat job flow, and a more modern
              install experience from job intake to completion.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-6 py-3 text-base font-semibold text-black transition hover:bg-yellow-400"
              >
                Book Partner Job
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Back to Homepage
              </Link>
            </div>

            <div className="mt-10 grid gap-4 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Repeat Job Support</p>
                <p className="mt-1">
                  Built for ongoing installation demand and recurring work.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Priority Flow</p>
                <p className="mt-1">
                  Stronger scheduling support for serious partners.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Faster Handoff</p>
                <p className="mt-1">
                  Move from sold job to install with less friction.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Scalable Platform</p>
                <p className="mt-1">
                  Designed for shops and contractors that want to grow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Why this page matters for your growth
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              This page is not just another website page. It is designed to help
              1-800TOPS convert more serious partners by clearly positioning the
              business as a repeat-installation partner rather than only a
              direct-to-customer booking service.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              That gives fabricators and shops a stronger reason to work with
              you, and it gives Google more relevant content around partner,
              fabricator, and installation support keywords.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <h3 className="text-xl font-bold">Ideal partners</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {idealFor.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/book"
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Start Partner Booking
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <h2 className="text-3xl font-bold tracking-tight">
            What partners get with 1-800TOPS
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {partnerBenefits.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-neutral-700">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Built for repeat installation volume
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              Fabricators and shops do not just need installers. They need a
              system that helps them move jobs consistently, reduce scheduling
              friction, and support growth without constant follow-up.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              This page helps communicate that 1-800TOPS is built for volume,
              repeat work, and stronger long-term partner relationships.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {programFeatures.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-neutral-200 p-5"
                >
                  <p className="font-medium text-neutral-900">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-black p-8 text-white">
            <h2 className="text-3xl font-bold tracking-tight">
              Why shops will like this page
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-300">
              It speaks directly to the problems that fabricators and repeat
              partners care about: speed, reliability, scheduling, cleaner
              handoff, and the ability to keep jobs moving without chaos.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-300">
              It also helps position 1-800TOPS as a stronger commercial and
              partner-facing brand instead of only a consumer-facing installer.
            </p>

            <div className="mt-8">
              <Link
                href="/gta-countertop-installation"
                className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
              >
                View GTA Coverage
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>

            <div className="mt-10 space-y-6">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="text-lg font-semibold text-yellow-300">
                    {faq.q}
                  </h3>
                  <p className="mt-3 leading-7 text-neutral-300">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to grow with a real installation partner?
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
                If you are a fabricator, stone shop, contractor, or growing
                partner that needs stronger installation support, 1-800TOPS is
                built to help you move faster with cleaner coordination and
                repeat job support.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Book Partner Job
              </Link>
              <Link
                href="/countertop-installation"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-6 py-3 font-semibold text-neutral-900 transition hover:bg-white"
              >
                View Countertop Installation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}