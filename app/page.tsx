"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const INSTAGRAM_URL =
  "https://www.instagram.com/ultrapro_contracting_inc?igsh=MWY5cjFnajV4ZTVlZg==";

const trustStats = [
  { value: "30+", label: "Installers Across Ontario" },
  { value: "24 Hours", label: "Guaranteed Install Target" },
  { value: "Live", label: "Job Tracking" },
];

const coreBenefits = [
  {
    title: "Guaranteed Install Within 24 Hours",
    description:
      "Built for fast-moving countertop jobs that need reliable scheduling without costly delays.",
  },
  {
    title: "Fully Insured & Vetted Crews",
    description:
      "Professional installation crews you can trust to represent your company properly on site.",
  },
  {
    title: "No Back-and-Forth Scheduling",
    description:
      "A cleaner booking flow that removes the usual confusion, follow-ups, and scheduling headaches.",
  },
  {
    title: "Live Job Tracking",
    description:
      "Stay updated with better visibility from booking to dispatch to completed installation.",
  },
];

const workFlow = [
  {
    step: "01",
    title: "Submit Job Details",
    description:
      "Enter the address, timeline, square footage, and services you need in one clean flow.",
    points: [
      "Choose same-day, next-day, or scheduled install",
      "Add square footage, service type, and add-ons",
      "Enter pickup and drop-off details",
    ],
  },
  {
    step: "02",
    title: "Review Quote Fast",
    description:
      "See pricing, mileage, add-ons, and project details quickly without the usual back-and-forth.",
    points: [
      "View service pricing clearly",
      "See mileage, add-ons, and total cost",
      "Confirm the right job details before checkout",
    ],
  },
  {
    step: "03",
    title: "We Dispatch The Right Crew",
    description:
      "We coordinate the installer based on job type, timing, distance, and availability.",
    points: [
      "Installer gets matched to the job",
      "Booking moves into live scheduling flow",
      "You track progress until completion",
    ],
  },
];

const handleItems = [
  "Countertop Installation",
  "Full Height Backsplash",
  "Backsplash Tiling",
  "Sink & Cooktop Cutouts",
  "Removal & Disposal",
  "Onsite Cutting & Polishing",
  "Repairs & Sealing",
  "Condo / High-Rise Jobs",
  "Multi-Job Scheduling",
];

const partnerBenefits = [
  {
    title: "Priority Installs",
    description:
      "Move jobs faster with preferred scheduling access for recurring fabricator demand.",
  },
  {
    title: "Discounted Monthly Rates",
    description:
      "Subscription pricing built for fabricators and partners who need volume-based install support.",
  },
  {
    title: "Repeat Order Flow",
    description:
      "A stronger system for ongoing work, repeat installs, and scalable project volume.",
  },
];

const stepByStepFlow = [
  "Submit the job",
  "Review quote",
  "Confirm booking",
  "Installer dispatch",
  "Live tracking",
  "Job completed",
];

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstantQuote() {
  const baseRates: Record<string, number> = {
    installation_3cm: 10,
    installation_2cm: 9,
    backsplash: 10,
  };

  const addonRates = {
    waterfall: 100,
    outlet: 50,
    sink: 180,
  };

  const [service, setService] = useState("installation_3cm");
  const [sqft, setSqft] = useState<number>(50);
  const [distance, setDistance] = useState<number>(10);
  const [waterfalls, setWaterfalls] = useState<number>(0);
  const [outlets, setOutlets] = useState<number>(0);
  const [sinkCutout, setSinkCutout] = useState<boolean>(false);

  const serviceTotal = useMemo(() => {
    return (baseRates[service] || 0) * sqft;
  }, [service, sqft]);

  const addonTotal = useMemo(() => {
    return (
      waterfalls * addonRates.waterfall +
      outlets * addonRates.outlet +
      (sinkCutout ? addonRates.sink : 0)
    );
  }, [waterfalls, outlets, sinkCutout]);

  const mileageTotal = useMemo(() => {
    return distance * 1.5;
  }, [distance]);

  const total = useMemo(() => {
    return serviceTotal + addonTotal + mileageTotal;
  }, [serviceTotal, addonTotal, mileageTotal]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5">
        <p className="text-lg font-semibold text-white">Quick Estimate</p>
        <p className="mt-1 text-sm text-zinc-400">
          Use this for a fast idea of price before starting the full booking flow.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-zinc-400">Service Type</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          >
            <option value="installation_3cm">3cm Installation</option>
            <option value="installation_2cm">2cm Installation</option>
            <option value="backsplash">Backsplash</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Square Feet</label>
          <input
            type="number"
            min={0}
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value) || 0)}
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Distance (km)</label>
          <input
            type="number"
            min={0}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value) || 0)}
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Waterfalls</label>
          <input
            type="number"
            min={0}
            value={waterfalls}
            onChange={(e) => setWaterfalls(Number(e.target.value) || 0)}
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Outlet Cutouts</label>
          <input
            type="number"
            min={0}
            value={outlets}
            onChange={(e) => setOutlets(Number(e.target.value) || 0)}
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={sinkCutout}
            onChange={(e) => setSinkCutout(e.target.checked)}
          />
          Sink Cutout
        </label>

        <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-black p-4">
          <div className="space-y-2 text-sm text-zinc-400">
            <div className="flex justify-between">
              <span>Service</span>
              <span>${serviceTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Add-ons</span>
              <span>${addonTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mileage</span>
              <span>${mileageTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm text-zinc-400">Estimated Total</span>
            <span className="text-2xl font-bold text-yellow-500">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        <Link
          href="/book"
          className="block w-full rounded-2xl bg-yellow-500 px-6 py-4 text-center font-bold text-black transition hover:bg-yellow-400"
        >
          Continue To Full Booking
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [openMessage, setOpenMessage] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function sendMessage() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      alert("Please fill out all fields.");
      return;
    }

    alert("Your message has been submitted.");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setOpenMessage(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-yellow-500">
              1-800TOPS
            </h1>
            <p className="text-sm text-zinc-400">Sell It. We Install It.</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-400"
            >
              <InstagramIcon />
            </a>

            <Link
              href="/login"
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:border-yellow-500 hover:text-yellow-400"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:border-yellow-500 hover:text-yellow-400"
            >
              Sign Up
            </Link>

            <Link
              href="/book"
              className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-yellow-400"
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-20 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_30%),radial-gradient(circle_at_left,rgba(255,255,255,0.04),transparent_25%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
                Guaranteed Install Within 24 Hours
              </p>

              <h2 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
                Same-Day Countertop Installation.
                <span className="block text-yellow-500">
                  No Delays. No Headaches.
                </span>
              </h2>

              <p className="mt-5 text-2xl font-semibold text-white md:text-3xl">
                Sell It. We Install It.
              </p>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
                1-800TOPS helps fabricators, contractors, builders, and showrooms
                book fast, reliable countertop installation with less chaos,
                cleaner coordination, and stronger project flow.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#instant-quote"
                  className="rounded-2xl bg-yellow-500 px-7 py-4 text-center font-bold text-black transition hover:bg-yellow-400"
                >
                  Get Instant Quote
                </a>

                <Link
                  href="/book"
                  className="rounded-2xl border border-yellow-500 px-7 py-4 text-center font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
                >
                  Book Installation / Services
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-400">
                <span>30+ Installers Across Ontario</span>
                <span>•</span>
                <span>Fully Insured & Vetted Crews</span>
                <span>•</span>
                <span>No Back-and-Forth Scheduling</span>
                <span>•</span>
                <span>Live Job Tracking</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                      Trusted Installation Platform
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-yellow-500">
                      Built for Real Job Flow
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-400">
                    30+ Installers
                  </div>
                </div>

                <div className="space-y-4">
                  {coreBenefits.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                    >
                      <p className="text-lg font-semibold text-white">
                        {card.title}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {trustStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-yellow-500">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="instant-quote" className="px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
                Instant Quote
              </p>

              <h3 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Quote jobs faster with a cleaner booking flow
              </h3>

              <p className="mt-4 max-w-2xl text-zinc-300">
                Enter job details, timeline, services, and mileage to get moving
                faster. Built for serious project flow, not slow scheduling.
              </p>

              <div className="mt-6 space-y-3 text-sm text-zinc-400">
                <p>• Same-day, next-day, or scheduled options</p>
                <p>• Mileage, add-ons, and return-visit logic built in</p>
                <p>• Multi-job booking support for growing partners</p>
                <p>• Stronger foundation for dispatch, tracking, and scale</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-6">
              <InstantQuote />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-black px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
              How It Works
            </p>
            <h3 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Simple booking. Faster installs.
            </h3>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-300">
              Built to make the process easier from first job submission to final
              installation completion.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workFlow.map((item) => (
              <div
                key={item.step}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8"
              >
                <div className="mb-5 inline-flex rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-400">
                  {item.step}
                </div>

                <p className="text-2xl font-bold text-white">{item.title}</p>
                <p className="mt-4 leading-7 text-zinc-400">
                  {item.description}
                </p>

                <div className="mt-5 space-y-2 border-t border-zinc-800 pt-5 text-sm text-zinc-300">
                  {item.points.map((point) => (
                    <p key={point}>• {point}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <div className="grid gap-4 md:grid-cols-6">
              {stepByStepFlow.map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-zinc-800 bg-black p-4 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
              What We Handle
            </p>
            <h3 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Professional installation and service support
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {handleItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-zinc-800 bg-black p-5"
              >
                <p className="font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-black px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
              Fabricator Partner Program
            </p>
            <h3 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Subscription plans built for fabricators
            </h3>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-300">
              Built for repeat work, faster scheduling, and stronger support for
              growing installation volume.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {partnerBenefits.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8"
              >
                <p className="text-2xl font-bold text-yellow-500">
                  {item.title}
                </p>
                <p className="mt-3 text-zinc-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-zinc-950 px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-yellow-500/20 bg-black p-10 text-center md:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-500">
            Ready To Start
          </p>

          <h3 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            Book your next countertop installation with confidence
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-zinc-300">
            A more modern platform for serious partners who want stronger
            scheduling, cleaner communication, and reliable installation support.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="rounded-2xl bg-yellow-500 px-8 py-4 font-bold text-black transition hover:bg-yellow-400"
            >
              Book Installation / Services
            </Link>

            <button
              type="button"
              onClick={() => setOpenMessage(true)}
              className="rounded-2xl border border-zinc-700 px-8 py-4 font-semibold transition hover:border-yellow-500 hover:text-yellow-400"
            >
              Contact Support
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 bg-black px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <p>© 1-800TOPS. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/book" className="transition hover:text-yellow-400">
              Book
            </Link>
            <Link href="/login" className="transition hover:text-yellow-400">
              Login
            </Link>
            <Link href="/policies" className="transition hover:text-yellow-400">
              Policies
            </Link>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-yellow-500 hover:text-yellow-400"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => setOpenMessage(true)}
        className="fixed bottom-6 right-6 rounded-full bg-yellow-500 px-5 py-3 font-bold text-black shadow-lg shadow-black/40 transition hover:bg-yellow-400"
      >
        Message
      </button>

      {openMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-2xl font-bold text-yellow-500">
                Contact Support
              </h4>

              <button
                type="button"
                onClick={() => setOpenMessage(false)}
                className="text-gray-400 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />

              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />

              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />

              <textarea
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[140px] w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />

              <button
                type="button"
                onClick={sendMessage}
                className="w-full rounded-2xl bg-yellow-500 py-3 font-bold text-black transition hover:bg-yellow-400"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}