import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Toronto Countertop Installation | Same-Day Installers | 1800TOPS",
  description:
    "Professional countertop installation in Toronto. Same-day and next-day service available. Quartz, granite, and backsplash installs for homeowners and contractors.",
  keywords: [
    "Toronto countertop installation",
    "countertop installers Toronto",
    "quartz installation Toronto",
    "granite installers Toronto",
    "same day countertop Toronto",
    "kitchen countertop installation Toronto",
  ],
};

export default function TorontoPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">

      {/* HERO */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Toronto Countertop Installation
          </h1>

          <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
            1800TOPS provides fast, reliable countertop installation across Toronto.
            Built for homeowners, contractors, and stone shops that need installs
            done right and on time.
          </p>

          <p className="mt-4 text-lg text-neutral-300 max-w-3xl">
            Same-day and next-day installation available depending on job scope,
            location, and scheduling.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/book"
              className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-400"
            >
              Book Installation
            </Link>

            <Link
              href="/countertop-installation"
              className="border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* SEO CONTENT */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Toronto Countertop Installation Experts
        </h2>

        <p className="mt-6 text-lg text-neutral-700">
          1800TOPS provides professional countertop installation services across
          Toronto, delivering fast, reliable results for residential and commercial
          projects. Our experienced installers specialize in quartz, granite, and
          custom countertop installations with precision and efficiency.
        </p>

        <p className="mt-4 text-lg text-neutral-700">
          Whether you need a one-time kitchen install or ongoing daily scheduling,
          our platform is designed to simplify the process. We help contractors,
          builders, and stone shops complete installations faster without delays
          or back-and-forth coordination.
        </p>

        <p className="mt-4 text-lg text-neutral-700">
          Our team is fully vetted, insured, and equipped to handle everything from
          full kitchen installations to backsplash installs and on-site adjustments.
          With flexible booking options, you can schedule instantly or request
          service right away.
        </p>
      </section>

      {/* SERVICES */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Toronto Countertop Installation Services
          </h2>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-bold">Quartz Installation</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-bold">Granite Installation</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-bold">Backsplash Installation</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-bold">Same-Day Installs</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Ready to book countertop installation in Toronto?
          </h2>

          <p className="mt-4 text-neutral-300 max-w-3xl">
            Book your installation online in minutes. 1800TOPS is built for speed,
            reliability, and professional execution.
          </p>

          <div className="mt-8">
            <Link
              href="/book"
              className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-400"
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}