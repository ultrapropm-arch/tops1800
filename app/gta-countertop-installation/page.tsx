import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GTA Countertop Installation | Toronto, Mississauga, Vaughan | 1800TOPS",
  description:
    "Countertop installation across the GTA including Toronto, Mississauga, Vaughan, and Brampton. Same-day service available. Built for homeowners, contractors, and stone shops.",
  keywords: [
    "GTA countertop installation",
    "Toronto countertop installers",
    "Mississauga countertop installation",
    "Vaughan countertop installation",
    "Brampton countertop installers",
    "quartz installation GTA",
    "granite installation Toronto",
    "same day countertop GTA",
  ],
};

export default function GTACountertopPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">

      {/* HERO */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            GTA Countertop Installation
          </h1>

          <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
            1800TOPS provides countertop installation across the Greater Toronto Area,
            including Toronto, Mississauga, Vaughan, and Brampton. Built for
            homeowners, contractors, and stone shops needing fast, reliable installs.
          </p>

          <p className="mt-4 text-lg text-neutral-300 max-w-3xl">
            Same-day and next-day installation available depending on job scope,
            location, and schedule.
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
          Serving the entire GTA
        </h2>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Toronto", "Mississauga", "Vaughan", "Brampton"].map((city) => (
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
            GTA Countertop Installation Services
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

      {/* SHOP PUSH */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Built for Stone Shops and Contractors
        </h2>

        <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
          1800TOPS is designed to support repeat installation demand across the GTA.
          Stone shops, kitchen companies, and contractors can use the platform to
          move jobs faster, reduce scheduling delays, and scale installation capacity.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">Repeat Jobs</h3>
            <p className="mt-2 text-neutral-600">
              Built to handle ongoing installation volume.
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
              Positioned for smart routing and grouping of jobs.
            </p>
          </div>

          <div className="border p-6 rounded-2xl">
            <h3 className="font-bold">Scalable Platform</h3>
            <p className="mt-2 text-neutral-600">
              Designed for growth across multiple cities.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Ready to book GTA countertop installation?
          </h2>

          <p className="mt-4 text-neutral-300 max-w-3xl">
            Book your installation online and move through checkout in minutes.
            1800TOPS is built for speed, scale, and reliability.
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