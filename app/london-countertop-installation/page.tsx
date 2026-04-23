import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "London Ontario Countertop Installation | Same-Day Service | 1800TOPS",
  description:
    "Countertop installation in London, Ontario. Same-day and next-day installs available. Trusted by homeowners, contractors, and stone shops. Book online instantly.",
  keywords: [
    "London Ontario countertop installation",
    "countertop installers London Ontario",
    "quartz installation London Ontario",
    "granite installation London Ontario",
    "same day countertop London Ontario",
    "backsplash installation London",
  ],
};

export default function LondonCountertopPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">

      {/* HERO */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            London Ontario Countertop Installation
          </h1>

          <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
            1800TOPS provides professional countertop installation across London, Ontario.
            Built for homeowners, contractors, and stone shops needing fast,
            reliable installs with no scheduling delays.
          </p>

          <p className="mt-4 text-lg text-neutral-300 max-w-3xl">
            Same-day and next-day installation available depending on job scope,
            location, and installer availability.
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

      {/* COVERAGE */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Serving London and Surrounding Areas
        </h2>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {["London", "St. Thomas", "Woodstock"].map((city) => (
            <div key={city} className="border p-6 rounded-2xl">
              <h3 className="font-bold text-lg">{city}</h3>
              <p className="mt-2 text-neutral-600">
                Countertop installation services available with fast scheduling
                and flexible booking options.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            London Countertop Installation Services
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

      {/* BUSINESS SECTION */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Built for Contractors and Stone Shops
        </h2>

        <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
          1800TOPS helps contractors, kitchen companies, and stone shops in London
          scale installation capacity, reduce delays, and complete jobs faster.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">Repeat Jobs</h3>
            <p className="mt-2 text-neutral-600">
              Built to support ongoing installation demand.
            </p>
          </div>

          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">Fast Turnaround</h3>
            <p className="mt-2 text-neutral-600">
              Same-day and next-day installs available.
            </p>
          </div>

          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">AI Dispatch Ready</h3>
            <p className="mt-2 text-neutral-600">
              Smart routing and job grouping for efficiency.
            </p>
          </div>

          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">Scalable Platform</h3>
            <p className="mt-2 text-neutral-600">
              Expand your business without hiring delays.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Ready to book countertop installation in London?
          </h2>

          <p className="mt-4 text-neutral-300 max-w-3xl">
            Book online instantly and get matched with a professional installer.
            Fast, reliable, and built for modern projects.
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