"use client";

import Link from "next/link";

export default function SignupChoicePage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Join 1-800TOPS
          </p>

          <h1 className="mt-3 text-5xl font-bold text-yellow-500">
            Choose Your Account Type
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
            Select how you want to join the platform.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/signup/customer"
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-yellow-500 hover:bg-zinc-950"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-500">
              Customer
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              Customer Sign Up
            </h2>

            <p className="mt-4 text-gray-300">
              Book jobs faster, save preferences, and use AI-powered features.
            </p>

            <div className="mt-6 space-y-1 text-sm text-gray-400">
              <p>• Faster bookings</p>
              <p>• Saved preferences</p>
              <p>• AI autofill</p>
              <p>• Rebook suggestions</p>
            </div>

            <div className="mt-8 inline-block rounded-2xl bg-yellow-500 px-5 py-3 font-bold text-black">
              Continue as Customer
            </div>
          </Link>

          <Link
            href="/installer/signup"
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-yellow-500 hover:bg-zinc-950"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-500">
              Installer
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              Installer Sign Up
            </h2>

            <p className="mt-4 text-gray-300">
              Apply to join the platform, upload documents, and receive jobs.
            </p>

            <div className="mt-6 space-y-1 text-sm text-gray-400">
              <p>• Application review</p>
              <p>• Document upload</p>
              <p>• Get job requests</p>
              <p>• Weekly payouts</p>
            </div>

            <div className="mt-8 inline-block rounded-2xl bg-yellow-500 px-5 py-3 font-bold text-black">
              Continue as Installer
            </div>
          </Link>
        </div>

        <p className="mt-10 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-yellow-500 hover:text-yellow-400"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}