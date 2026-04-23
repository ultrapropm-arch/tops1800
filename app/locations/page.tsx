import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Service Areas | Countertop Installation Across Ontario | 1800TOPS",
  description:
    "1800TOPS provides countertop installation across Ontario including Toronto, Mississauga, Vaughan, Brampton, and London. Same-day service available.",
};

export default function LocationsPage() {
  const locations = [
    {
      name: "Toronto",
      link: "/toronto-countertop-installation",
    },
    {
      name: "Mississauga",
      link: "/mississauga-countertop-installation",
    },
    {
      name: "Vaughan",
      link: "/vaughan-countertop-installation",
    },
    {
      name: "Brampton",
      link: "/brampton-countertop-installation",
    },
    {
      name: "London",
      link: "/london-countertop-installation",
    },
  ];

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
            Serving homeowners, contractors, and stone shops with same-day and
            next-day installation options.
          </p>
        </div>
      </section>

      {/* LOCATIONS GRID */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Our Service Locations
        </h2>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <Link
              key={loc.name}
              href={loc.link}
              className="border p-6 rounded-2xl hover:shadow-lg transition"
            >
              <h3 className="text-xl font-bold">{loc.name}</h3>
              <p className="mt-2 text-neutral-600">
                Countertop installation services available with fast scheduling.
              </p>
            </Link>
          ))}
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