import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Service Areas | Countertop Installation Across Ontario | 1800TOPS",
  description:
    "1800TOPS provides countertop installation across Ontario including Toronto, Mississauga, Vaughan, Brampton, London, and the GTA. Same-day and next-day service available.",
  keywords: [
    "Ontario countertop installation",
    "countertop installation service areas",
    "Toronto countertop installation",
    "Mississauga countertop installation",
    "Vaughan countertop installation",
    "Brampton countertop installation",
    "London Ontario countertop installation",
    "GTA countertop installation",
  ],
};

const locations = [
  {
    name: "Toronto",
    link: "/toronto-countertop-installation",
    description:
      "Professional countertop installation services across Toronto with fast scheduling and reliable service.",
  },
  {
    name: "Mississauga",
    link: "/mississauga-countertop-installation",
    description:
      "Countertop installation in Mississauga for homeowners, contractors, and stone shops.",
  },
  {
    name: "Vaughan",
    link: "/vaughan-countertop-installation",
    description:
      "Fast and dependable countertop installation service in Vaughan.",
  },
  {
    name: "Brampton",
    link: "/brampton-countertop-installation",
    description:
      "Reliable countertop installation in Brampton for residential and commercial projects.",
  },
  {
    name: "London",
    link: "/london-countertop-installation",
    description:
      "Countertop installation in London, Ontario with flexible scheduling and online booking.",
  },
  {
    name: "GTA",
    link: "/gta-countertop-installation",
    description:
      "Explore countertop installation coverage across the Greater Toronto Area.",
  },
];

export default function LocationsPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* HERO */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Countertop Installation Service Areas
          </h1>

          <p className="mt-6 text-lg text-neutral-300 max-w-3xl">
            1800TOPS provides fast, reliable countertop installation across Ontario.
            Serving homeowners, contractors, builders, and stone shops with
            same-day, next-day, and scheduled installation options.
          </p>
        </div>
      </section>

      {/* LOCATIONS GRID */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">Our Service Locations</h2>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <Link
              key={loc.name}
              href={loc.link}
              className="border p-6 rounded-2xl hover:shadow-lg transition"
            >
              <h3 className="text-xl font-bold">{loc.name}</h3>
              <p className="mt-2 text-neutral-600">{loc.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">Built for Fast Project Flow</h2>

          <p className="mt-6 text-lg text-neutral-700 max-w-4xl">
            1800TOPS is built for homeowners, contractors, builders, kitchen companies,
            and stone shops that need a cleaner way to book countertop installation.
            Use the booking flow to enter job details, choose the schedule, move through
            checkout, select a payment option, receive booking confirmation, and track
            the job through installer dispatch and completion.
          </p>

          <p className="mt-4 text-lg text-neutral-700 max-w-4xl">
            Explore each service area page to find local countertop installation coverage,
            available scheduling options, and fast online booking access.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold">
            Ready to book your installation?
          </h2>

          <p className="mt-4 text-neutral-300 max-w-3xl">
            Book online in minutes and get matched with a professional installer.
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