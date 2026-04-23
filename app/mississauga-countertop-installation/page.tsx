import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mississauga Countertop Installation | Same-Day Installers | 1800TOPS",
  description:
    "Professional countertop installation in Mississauga. Same-day and next-day service available. Quartz, granite, and backsplash installs for homeowners and contractors.",
  keywords: [
    "Mississauga countertop installation",
    "countertop installers Mississauga",
    "quartz installation Mississauga",
    "granite installers Mississauga",
    "same day countertop Mississauga",
    "kitchen countertop installation Mississauga",
  ],
};

export default function MississaugaPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* HERO */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Mississauga Countertop Installation
          </h1>

          <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
            1800TOPS provides fast, reliable countertop installation across Mississauga.
            Built for homeowners, contractors, and stone shops that need installs
            done efficiently and professionally.
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
          Mississauga Countertop Installation Experts
        </h2>

        <p className="mt-6 text-lg text-neutral-700">
          1800TOPS provides professional countertop installation services across
          Mississauga, delivering fast and reliable results for residential and
          commercial projects. Our installers specialize in quartz, granite, and
          custom countertop installations with precision and efficiency.
        </p>

        <p className="mt-4 text-lg text-neutral-700">
          Whether you need a one-time kitchen install or ongoing daily scheduling,
          our platform helps contractors, builders, and stone shops move jobs faster
          without delays or scheduling issues.
        </p>

        <p className="mt-4 text-lg text-neutral-700">
          Our installers are vetted, insured, and experienced in handling full kitchen
          installations, backsplash work, and on-site adjustments. You can book instantly
          or request service right away depending on your project needs.
        </p>
      </section>

      {/* SERVICES */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Mississauga Countertop Installation Services
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

      {/* SERVICE AREAS */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Explore Other Service Areas
        </h2>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/toronto-countertop-installation" className="underline">
            Toronto
          </Link>
          <Link href="/mississauga-countertop-installation" className="underline">
            Mississauga
          </Link>
          <Link href="/vaughan-countertop-installation" className="underline">
            Vaughan
          </Link>
          <Link href="/brampton-countertop-installation" className="underline">
            Brampton
          </Link>
          <Link href="/london-countertop-installation" className="underline">
            London
          </Link>
          <Link href="/locations" className="underline font-semibold">
            View All Locations
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Ready to book countertop installation in Mississauga?
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