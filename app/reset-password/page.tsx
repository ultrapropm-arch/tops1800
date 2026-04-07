"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message || "Failed to reset password.");
      setLoading(false);
      return;
    }

    alert("Password updated successfully.");
    setLoading(false);
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-3xl font-bold text-yellow-500 text-center">
            Reset Password
          </h1>

          <p className="mt-3 text-center text-gray-400 text-sm">
            Enter your new password below.
          </p>

          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                placeholder="Enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}