"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_HOMEOWNER_ADMIN_EMAIL || "";

const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_HOMEOWNER_ADMIN_PASSWORD || "";

export default function HomeownerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError("Wrong email or password.");
      setLoading(false);
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      setError("Wrong email or password.");
      setLoading(false);
      return;
    }

    localStorage.setItem("homeowner_admin_logged_in", "true");
    localStorage.setItem("homeowner_admin_email", email);

    router.push("/homeowner-admin");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
          1800TOPS
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Homeowner Admin Login
        </h1>

        <p className="mt-3 text-gray-400">
          Login to manage homeowner service and estimate requests.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            required
          />

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            required
          />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-400 px-6 py-4 font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-xs text-gray-500">
          This login is only for the homeowner backend. It does not affect the
          main admin, installer portal, or fabricator booking system.
        </p>
      </div>
    </main>
  );
}