"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type InstallerProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  approval_status?: string | null;
};

export default function InstallerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      alert("Please enter your email.");
      return;
    }

    if (!trimmedPassword) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

    if (authError) {
      console.error("Installer auth login error:", authError);
      alert(authError.message || "Invalid email or password.");
      setLoading(false);
      return;
    }

    if (!authData.user) {
      alert("Could not log in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("installer_profiles")
      .select("id, full_name, email, approval_status")
      .ilike("email", trimmedEmail)
      .maybeSingle<InstallerProfile>();

    if (error) {
      console.error("Installer profile lookup error:", error);
      alert(error.message || "Could not load installer profile.");
      setLoading(false);
      return;
    }

    if (!data) {
      await supabase.auth.signOut();
      alert("Installer profile not found.");
      setLoading(false);
      return;
    }

    const approvalStatus = (data.approval_status || "pending").toLowerCase();

    if (approvalStatus !== "approved") {
      await supabase.auth.signOut();

      if (approvalStatus === "rejected") {
        alert("Your installer application was rejected. Please contact admin.");
      } else {
        alert("Your installer application is still pending approval.");
      }

      setLoading(false);
      return;
    }

    localStorage.setItem("installerPortalId", data.id || "");
    localStorage.setItem("installerPortalName", data.full_name || "");
    localStorage.setItem("installerPortalEmail", data.email || "");

    setLoading(false);
    router.push("/installer");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
            1800TOPS
          </p>

          <h1 className="mt-3 text-4xl font-bold text-yellow-500">
            Installer Login
          </h1>

          <p className="mt-3 text-gray-300">
            Only approved installers can access the installer portal.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading}
              className="w-full rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? "Checking..." : "Login"}
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            Not approved yet?{" "}
            <Link
              href="/installer/signup"
              className="font-semibold text-yellow-400 hover:text-yellow-300"
            >
              Submit installer application
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}