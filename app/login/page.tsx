"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ProfileRow = {
  id?: string;
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  company_name?: string | null;
};

type CustomerRow = {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  preferred_service_type?: string | null;
  preferred_payment_method?: string | null;
  preferred_city?: string | null;
  role?: string | null;
};

type InstallerProfileRow = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  installer_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
};

const AI_DEFAULTS = {
  customerTier: "new_customer",
  aiAutofillEnabled: true,
  aiRebookEnabled: true,
  aiQuoteAssistantEnabled: true,
  aiSalesAssistantEnabled: true,
  aiPreferredContactMethod: "email",
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function hasRealError(error: unknown) {
  if (!error) return false;
  if (typeof error !== "object") return true;
  return Object.keys(error as Record<string, unknown>).length > 0;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function tryUpsertProfile(
    userId: string,
    role: "admin" | "installer" | "customer"
  ) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        role,
      },
      {
        onConflict: "id",
      }
    );

    if (hasRealError(error)) {
      console.warn(`Profiles upsert warning for ${role}:`, error);
    }
  }

  async function resolveUserRole(userId: string, userEmail: string) {
    const normalizedEmail = normalizeEmail(userEmail);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (hasRealError(profileError)) {
      console.warn("Profile lookup warning:", profileError);
    }

    const profileRole = normalizeRole(profile?.role);
    if (
      profileRole === "admin" ||
      profileRole === "installer" ||
      profileRole === "customer"
    ) {
      return profileRole;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const metadataRole = normalizeRole(authUser?.user_metadata?.role);
    if (
      metadataRole === "admin" ||
      metadataRole === "installer" ||
      metadataRole === "customer"
    ) {
      await tryUpsertProfile(
        userId,
        metadataRole as "admin" | "installer" | "customer"
      );
      return metadataRole;
    }

    const { data: installerByUserId, error: installerByUserIdError } =
      await supabase
        .from("installer_profiles")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle<InstallerProfileRow>();

    if (hasRealError(installerByUserIdError)) {
      console.warn("Installer lookup by user_id warning:", installerByUserIdError);
    }

    if (installerByUserId) {
      await tryUpsertProfile(userId, "installer");
      return "installer";
    }

    const { data: installerById, error: installerByIdError } = await supabase
      .from("installer_profiles")
      .select("id, user_id")
      .eq("id", userId)
      .maybeSingle<InstallerProfileRow>();

    if (hasRealError(installerByIdError)) {
      console.warn("Installer lookup by id warning:", installerByIdError);
    }

    if (installerById) {
      await tryUpsertProfile(userId, "installer");
      return "installer";
    }

    const { data: customerById, error: customerByIdError } = await supabase
      .from("customers")
      .select("id, email, role")
      .eq("id", userId)
      .maybeSingle<CustomerRow>();

    if (hasRealError(customerByIdError)) {
      console.warn("Customer lookup by id warning:", customerByIdError);
    }

    if (customerById) {
      await tryUpsertProfile(userId, "customer");
      return "customer";
    }

    const { data: customerByEmail, error: customerByEmailError } = await supabase
      .from("customers")
      .select("id, email, role")
      .eq("email", normalizedEmail)
      .maybeSingle<CustomerRow>();

    if (hasRealError(customerByEmailError)) {
      console.warn("Customer lookup by email warning:", customerByEmailError);
    }

    if (customerByEmail) {
      await tryUpsertProfile(userId, "customer");
      return "customer";
    }

    return null;
  }

  async function loadCustomerLocalProfile(userId: string, userEmail: string) {
    try {
      const normalizedEmail = normalizeEmail(userEmail);
      let customerRow: CustomerRow | null = null;

      const { data: byId, error: byIdError } = await supabase
        .from("customers")
        .select(
          "id, email, full_name, phone, company_name, preferred_service_type, preferred_payment_method, preferred_city, role"
        )
        .eq("id", userId)
        .maybeSingle<CustomerRow>();

      if (hasRealError(byIdError)) {
        console.warn("Customer profile load by id warning:", byIdError);
      } else if (byId) {
        customerRow = byId;
      }

      if (!customerRow) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from("customers")
          .select(
            "id, email, full_name, phone, company_name, preferred_service_type, preferred_payment_method, preferred_city, role"
          )
          .eq("email", normalizedEmail)
          .maybeSingle<CustomerRow>();

        if (hasRealError(byEmailError)) {
          console.warn("Customer profile load by email warning:", byEmailError);
        } else if (byEmail) {
          customerRow = byEmail;
        }
      }

      localStorage.setItem(
        "customerAiProfile",
        JSON.stringify({
          fullName: customerRow?.full_name || "",
          companyName: customerRow?.company_name || "",
          phone: customerRow?.phone || "",
          email: customerRow?.email || normalizedEmail,
          preferredServiceType: customerRow?.preferred_service_type || "",
          preferredPaymentMethod: customerRow?.preferred_payment_method || "",
          preferredCity: customerRow?.preferred_city || "",
          ...AI_DEFAULTS,
        })
      );

      localStorage.setItem(
        "lastCustomerProfile",
        JSON.stringify({
          customerName: customerRow?.full_name || "",
          customerEmail: customerRow?.email || normalizedEmail,
          companyName: customerRow?.company_name || "",
          phoneNumber: customerRow?.phone || "",
        })
      );
    } catch (error) {
      console.warn("Customer local profile save warning:", error);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      alert("Email is required.");
      return;
    }

    if (!password.trim()) {
      alert("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Login succeeded, but user could not be loaded.");
      }

      const role = await resolveUserRole(user.id, user.email || normalizedEmail);

      if (role === "customer") {
        await loadCustomerLocalProfile(user.id, user.email || normalizedEmail);
        router.push("/customer");
        return;
      }

      if (role === "installer") {
        router.push("/installer");
        return;
      }

      if (role === "admin") {
        router.push("/admin");
        return;
      }

      alert(
        "Your account was found, but no valid role is connected yet. Please contact support."
      );
    } catch (error: any) {
      console.warn("Login warning:", error);
      alert(error?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      alert("Enter your email first.");
      return;
    }

    setLoading(true);

    try {
      const redirectBase =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "https://www.1800tops.com/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectBase,
      });

      if (error) {
        throw error;
      }

      alert("Password reset email sent.");
    } catch (error: any) {
      console.warn("Reset password warning:", error);
      alert(error?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-yellow-500">Login</h1>
            <p className="mt-3 text-gray-400">Login as admin, installer, or customer.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-500 py-4 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-700 py-3 font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400 disabled:opacity-60"
            >
              Forgot Password
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-gray-400">
            <p>
              Need a customer account?{" "}
              <Link
                href="/signup/customer"
                className="font-semibold text-yellow-500 transition hover:text-yellow-400"
              >
                Customer Sign Up
              </Link>
            </p>

            <p>
              Need an installer account?{" "}
              <Link
                href="/signup/installer"
                className="font-semibold text-yellow-500 transition hover:text-yellow-400"
              >
                Installer Sign Up
              </Link>
            </p>

            <p className="pt-2">
              <Link href="/" className="hover:text-yellow-400">
                Back to homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}