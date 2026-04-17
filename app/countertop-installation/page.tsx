import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Canada-Wide Countertop Installation | Same-Day Service | 1800TOPS",
  description:
    "1800TOPS provides Canada-wide countertop installation for homeowners, contractors, kitchen companies, and stone shops, with US expansion launching soon. Fast booking, same-day options, backsplash service, and scalable install support.",
  keywords: [
    "canada wide countertop installation",
    "countertop installation canada",
    "countertop installers canada",
    "quartz countertop installation",
    "granite countertop installation",
    "same day countertop installation",
    "backsplash installation",
    "stone shop installation partner",
    "countertop installation for shops",
    "1800TOPS",
  ],
  alternates: {
    canonical: "https://1800tops.com/countertop-installation",
  },
  openGraph: {
    title: "Canada-Wide Countertop Installation | 1800TOPS",
    description:
      "Canada-wide countertop installation with fast booking, same-day options, and scalable support for homeowners, contractors, and stone shops. US expansion coming soon.",
    url: "https://1800tops.com/countertop-installation",
    siteName: "1800TOPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Canada-Wide Countertop Installation | 1800TOPS",
    description:
      "Fast, scalable countertop installation across Canada with support for shops, contractors, and repeat jobs. US expansion coming soon.",
  },
};

const faqs = [
  {
    question: "What countertop materials do you install?",
    answer:
      "1800TOPS supports quartz, granite, porcelain, and other eligible stone countertop installation projects depending on job scope and service requirements.",
  },
  {
    question: "Is 1800TOPS available across Canada?",
    answer:
      "Yes. 1800TOPS is positioned as a Canada-wide countertop installation platform, with service expansion continuing across more cities and regions.",
  },
  {
    question: "Are you launching in the United States too?",
    answer:
      "Yes. 1800TOPS is currently Canada-wide and preparing for US expansion soon.",
  },
  {
    question: "Do you offer same-day countertop installation?",
    answer:
      "Yes. Same-day and next-day service may be available depending on location, schedule, and job scope.",
  },
  {
    question: "Do you work with stone shops and contractors?",
    answer:
      "Yes. 1800TOPS is built to support homeowners, kitchen companies, contractors, builders, and stone shops that need fast, organized installation support.",
  },
  {
    question: "How much does countertop installation cost?",
    answer:
      "Pricing depends on square footage, service type, timeline, travel distance, and add-on services such as waterfalls, cutouts, onsite work, difficult access, and extra helpers.",
  },
  {
    question: "Do you install backsplashes too?",
    answer:
      "Yes. Full-height backsplash installation and related add-on services can be included depending on the project.",
  },
  {
    question: "Can shops use 1800TOPS for repeat jobs?",
    answer:
      "Yes. 1800TOPS is designed to support repeat installations, ongoing shop volume, organized booking flow, and scalable dispatch support.",
  },
];

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Countertop Installation",
  serviceType: "Countertop Installation",
  provider: {
    "@type": "Organization",
    name: "1800TOPS",
    url: "https://1800tops.com",
    email: "info@1800tops.com",
  },
  areaServed: [
    {
      "@type": "Country",
      name: "Canada",
    },
    {
      "@type": "Country",
      name: "United States",
    },
  ],
  url: "https://1800tops.com/countertop-installation",
  description:
    "Canada-wide countertop installation service by 1800TOPS with fast booking, same-day options, backsplash support, and scalable service for homeowners, contractors, and stone shops.",
  offers: {
    "@type": "Offer",
    url: "https://1800tops.com/book",
    priceCurrency: "CAD",
    availability: "https://schema.org/InStock",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function CountertopInstallationPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-neutral-200 bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.18),transparent_30%),radial-gradient(circle_at_left,rgba(234,179,8,0.10),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
          <div className="max-w-5xl">
            <div className="mb-5 inline-flex rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1.5 text-sm font-medium text-yellow-300">
              1800TOPS • Canada-Wide • US Expansion Soon
            </div>

            <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Canada-Wide Countertop Installation Built for Homeowners, Contractors,
              and Stone Shops
            </h1>

            <p className="mt-6 max-w-4xl text-lg leading-8 text-neutral-300 md:text-xl">
              1800TOPS provides Canada-wide countertop installation for
              homeowners, contractors, kitchen companies, and stone shops, with
              expansion into the United States coming soon.
            </p>

            <p className="mt-4 max-w-4xl text-lg leading-8 text-neutral-300">
              Serving major cities across Canada with fast booking, flexible
              scheduling, same-day options, and scalable installation support
              for residential, commercial, and repeat-volume projects.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-6 py-3 text-base font-semibold text-black transition hover:bg-yellow-400"
              >
                Book Installation
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
                <p className="font-semibold text-white">Canada-Wide Coverage</p>
                <p className="mt-1">
                  Positioned for service across major Canadian markets.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Fast Scheduling</p>
                <p className="mt-1">
                  Same-day and next-day options when available.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Stone Shop Friendly</p>
                <p className="mt-1">
                  Built to support recurring installs and partner workflows.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">AI-Powered Growth</p>
                <p className="mt-1">
                  AI quoting, dispatch direction, and scalable booking flow.
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
              Professional countertop installation with a scalable platform model
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              1800TOPS is not just another installation company page. It is
              positioned as a fast, scalable countertop installation platform
              that supports single residential jobs, contractor demand, and
              repeat shop volume.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              That gives you stronger SEO positioning, stronger conversion
              messaging, and a clearer value proposition for shops that need a
              dependable installation partner rather than a one-off installer.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              This page is built to target countertop installation searches
              while also helping AI search understand that 1800TOPS serves
              homeowners, kitchen companies, builders, and stone shops across
              Canada.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <h3 className="text-xl font-bold">Core service focus</h3>
            <ul className="mt-5 space-y-3 text-neutral-700">
              <li>• Quartz countertop installation</li>
              <li>• Granite countertop installation</li>
              <li>• Full-height backsplash installation</li>
              <li>• Same-day and next-day scheduling options</li>
              <li>• Residential and commercial job support</li>
              <li>• Shop, builder, and contractor partnerships</li>
            </ul>

            <div className="mt-6">
              <Link
                href="/book"
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Start Your Booking
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <h2 className="text-3xl font-bold tracking-tight">
            What our countertop installation service includes
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Installation support</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Reliable countertop installation flow for homeowners, contractors,
                kitchen companies, and stone shops.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Material flexibility</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Support for quartz, granite, porcelain, and other eligible
                surfaces depending on project requirements.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Add-on services</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Waterfalls, outlet cutouts, onsite work, polishing, difficult
                access, extra helpers, and more.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Online booking flow</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Structured booking, checkout, and confirmation designed for speed
                and scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Built to attract and convert stone shops
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              To push harder toward shops, the page now clearly positions
              1800TOPS as a scalable installation partner instead of only a
              direct-to-homeowner service.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              That matters because stone shops are looking for speed,
              reliability, repeat-job support, organized booking, and a company
              that can help them close more sales without slowing down their
              workflow.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="font-bold">Repeat volume support</h3>
                <p className="mt-2 text-neutral-700">
                  Position 1800TOPS as a partner for ongoing installation demand.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="font-bold">Fast turnaround</h3>
                <p className="mt-2 text-neutral-700">
                  Strong for shops needing quick install scheduling and reduced delays.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="font-bold">Clear booking system</h3>
                <p className="mt-2 text-neutral-700">
                  Simple job intake helps shops send work through faster.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="font-bold">Scalable partner message</h3>
                <p className="mt-2 text-neutral-700">
                  Better positioning for growing shop relationships across Canada.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-black p-8 text-white">
            <h2 className="text-3xl font-bold tracking-tight">
              AI features that help push harder to shops
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-300">
              1800TOPS is positioned around AI-supported growth, which helps the
              brand stand out more strongly with stone shops, contractors, and
              larger partners.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-yellow-300">
                  AI instant quote direction
                </h3>
                <p className="mt-2 text-neutral-300">
                  Helps shops move faster when pricing and qualifying new install
                  requests.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-yellow-300">
                  AI dispatch support
                </h3>
                <p className="mt-2 text-neutral-300">
                  Positions 1800TOPS as a modern install platform, not just a
                  manual scheduling business.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-yellow-300">
                  AI route grouping potential
                </h3>
                <p className="mt-2 text-neutral-300">
                  Useful for shops with repeat jobs, grouped installs, and wider
                  service-area demand.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-yellow-300">
                  AI customer support and intake
                </h3>
                <p className="mt-2 text-neutral-300">
                  Creates a more responsive experience for incoming shop and
                  contractor leads.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
              >
                Book a Shop Installation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Materials and project types we support
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Quartz</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Popular for kitchen renovations, residential projects, and modern
                stone-shop volume.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Granite</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Strong fit for natural stone installs and custom projects.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Backsplashes</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Full-height backsplash work can be included when required.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Multi-service jobs</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Designed to support more detailed job scopes and repeat-volume work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Same-day and next-day availability
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              Speed is one of the strongest parts of the 1800TOPS offer.
              Depending on job timing, location, and scope, customers and shop
              partners may be able to book same-day or next-day service.
            </p>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              This helps position 1800TOPS as a higher-speed alternative to
              slower traditional install workflows and makes the service more
              attractive for shops that need reliable turnaround.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
            <h2 className="text-3xl font-bold tracking-tight">
              What affects countertop installation cost
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-700">
              Pricing depends on job size, material type, timeline, mileage, and
              add-on services. Projects with waterfalls, cutouts, onsite
              polishing, difficult access, condos, extra helpers, or full-height
              backsplashes may cost more.
            </p>
            <div className="mt-6">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Check Booking Availability
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Why choose 1800TOPS
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-yellow-300">
                Canada-wide positioning
              </h3>
              <p className="mt-3 leading-7 text-neutral-300">
                Stronger authority positioning for customers, shops, and search engines.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-yellow-300">
                Fast booking flow
              </h3>
              <p className="mt-3 leading-7 text-neutral-300">
                Built to move users smoothly from service selection to checkout
                and confirmation.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-yellow-300">
                Shop-friendly growth model
              </h3>
              <p className="mt-3 leading-7 text-neutral-300">
                Better fit for repeat jobs, business relationships, and scaling
                partnerships.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-yellow-300">
                AI-powered brand edge
              </h3>
              <p className="mt-3 leading-7 text-neutral-300">
                AI quoting, AI dispatch direction, and scalable support help the
                brand feel more modern and higher value.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <h2 className="text-3xl font-bold tracking-tight">
          Frequently asked questions
        </h2>

        <div className="mt-10 space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-neutral-900">
                {faq.question}
              </h3>
              <p className="mt-3 leading-7 text-neutral-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 md:px-10 lg:px-12">
        <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to book countertop installation or partner as a shop?
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
                1800TOPS is built for fast booking, scalable installation, and
                stronger partner support across Canada, with US expansion coming
                soon. Whether you are a homeowner booking one install or a stone
                shop looking for repeat installation support, the platform is
                designed to help you move faster.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Book Now
              </Link>
              <Link
                href="/backsplash-installation"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-6 py-3 font-semibold text-neutral-900 transition hover:bg-white"
              >
                View Backsplash Service
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}