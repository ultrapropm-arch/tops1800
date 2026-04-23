import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "GTA Countertop Installation | Toronto, Mississauga, Vaughan | 1800TOPS",
  description:
    "Countertop installation across the GTA including Toronto, Mississauga, Vaughan, and Brampton. Same-day and next-day service available. Built for homeowners, contractors, builders, and stone shops.",
  keywords: [
    "GTA countertop installation",
    "Toronto countertop installers",
    "Mississauga countertop installation",
    "Vaughan countertop installation",
    "Brampton countertop installers",
    "quartz installation GTA",
    "granite installation Toronto",
    "same day countertop GTA",
    "countertop installation contractors GTA",
    "countertop installation stone shops Toronto",
  ],
};

const cities = ["Toronto", "Mississauga", "Vaughan", "Brampton"];

const services = [
  {
    title: "Quartz Installation",
    description:
      "Professional quartz countertop installation across the GTA with fast scheduling and dependable service.",
  },
  {
    title: "Granite Installation",
    description:
      "Experienced granite countertop installers for residential and contractor jobs throughout Toronto and surrounding cities.",
  },
  {
    title: "Backsplash Installation",
    description:
      "Clean, accurate backsplash installation for kitchens, custom projects, and full countertop packages.",
  },
  {
    title: "Same-Day Installs",
    description:
      "Same-day and next-day countertop installation available depending on scope, location, and scheduling.",
  },
];

const shopFeatures = [
  {
    title: "Repeat Jobs",
    description: "Built to handle ongoing installation volume.",
  },
  {
    title: "Fast Turnaround",
    description: "Same-day and next-day installs available.",
  },
  {
    title: "AI Dispatch Ready",
    description: "Positioned for smart routing and grouping of jobs.",
  },
  {
    title: "Scalable Platform",
    description: "Designed for growth across multiple cities.",
  },
];

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
            1800TOPS provides countertop installation across the Greater Toronto
            Area, including Toronto, Mississauga, Vaughan, and Brampton. Built
            for homeowners, contractors, and stone shops needing fast, reliable
            installs.
          </p>

          <p className="mt-4 text-lg text-neutral-300 max-w-3xl">
            Same-day and next-day installation available depending on job scope,
            location, and schedule.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/book"
              className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-400 transition"
            >
              Book Installation
            </Link>

            <Link
              href="/countertop-installation"
              className="border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10 transition"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Serving the Entire GTA Countertop Installation Market
        </h2>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cities.map((city) => (
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
            {services.map((service) => (
              <div key={service.title} className="bg-white p-6 rounded-2xl border">
                <h3 className="font-bold">{service.title}</h3>
                <p className="mt-2 text-neutral-600 text-sm leading-6">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO CONTENT */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-bold">
            GTA Countertop Installation Experts
          </h2>

          <p className="mt-6 text-lg text-neutral-700 leading-8">
            1800TOPS provides professional countertop installation services
            across the Greater Toronto Area, serving homeowners, contractors,
            builders, and stone fabrication shops. Our team specializes in
            quartz, granite, and custom stone installations, delivering fast,
            reliable results with a focus on precision and efficiency.
          </p>

          <p className="mt-6 text-lg text-neutral-700 leading-8">
            We understand the demands of the GTA market, where timing and
            coordination are critical. That is why our platform is built to
            handle both single residential jobs and high-volume installation
            needs for contractors and businesses. Whether you need a one-time
            install or ongoing daily scheduling, 1800TOPS helps keep projects
            moving on time and with less back-and-forth.
          </p>

          <p className="mt-6 text-lg text-neutral-700 leading-8">
            Our installers are experienced, vetted, and equipped to handle a
            wide range of installation types, including full kitchen installs,
            backsplash installations, and on-site adjustments. We work across
            Toronto, Mississauga, Brampton, Vaughan, and surrounding GTA areas,
            providing consistent service across the region.
          </p>

          <p className="mt-6 text-lg text-neutral-700 leading-8">
            If you are looking for dependable countertop installers in the GTA,
            1800TOPS offers a streamlined booking process, transparent service
            flow, and fast turnaround times for both residential and commercial
            projects.
          </p>
        </div>
      </section>

      {/* SHOP PUSH */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold">
          Built for Stone Shops and Contractors
        </h2>

        <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
          1800TOPS is designed to support repeat installation demand across the
          GTA. Stone shops, kitchen companies, and contractors can use the
          platform to move jobs faster, reduce scheduling delays, and scale
          installation capacity.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {shopFeatures.map((feature) => (
            <div key={feature.title} className="border p-6 rounded-2xl">
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-2 text-neutral-600">{feature.description}</p>
            </div>
          ))}
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
              className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-400 transition"
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}