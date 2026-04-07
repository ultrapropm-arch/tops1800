"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type CustomerSignupForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  preferredServiceType: string;
  preferredPaymentMethod: string;
  preferredCity: string;
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

export default function CustomerSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CustomerSignupForm>({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    preferredServiceType: "",
    preferredPaymentMethod: "",
    preferredCity: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function saveCustomerAiProfileLocally() {
    try {
      localStorage.setItem(
        "customerAiProfile",
        JSON.stringify({
          fullName: form.fullName.trim(),
          email: normalizeEmail(form.email),
          phone: form.phone.trim(),
          company: form.company.trim(),
          preferredServiceType: form.preferredServiceType,
          preferredPaymentMethod: form.preferredPaymentMethod,
          preferredCity: form.preferredCity.trim(),
          ...AI_DEFAULTS,
        })
      );
    } catch (error) {
      console.error("Failed to save local AI profile:", error);
    }
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fullName = form.fullName.trim();
    const email = normalizeEmail(form.email);
    const phone = form.phone.trim();
    const company = form.company.trim();
    const password = form.password;
    const preferredServiceType = form.preferredServiceType || "";
    const preferredPaymentMethod = form.preferredPaymentMethod || "";
    const preferredCity = form.preferredCity.trim();

    if (!fullName) {
      alert("Full name is required.");
      return;
    }

    if (!email) {
      alert("Email is required.");
      return;
    }

    if (!password.trim()) {
      alert("Password is required.");
      return;
    }

    if (password.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "customer",
            full_name: fullName,
            phone_number: phone,
            company_name: company,
            preferred_service_type: preferredServiceType,
            preferred_payment_method: preferredPaymentMethod,
            preferred_city: preferredCity,
            ai_customer_tier: AI_DEFAULTS.customerTier,
            ai_autofill_enabled: AI_DEFAULTS.aiAutofillEnabled,
            ai_rebook_enabled: AI_DEFAULTS.aiRebookEnabled,
            ai_quote_assistant_enabled: AI_DEFAULTS.aiQuoteAssistantEnabled,
            ai_sales_assistant_enabled: AI_DEFAULTS.aiSalesAssistantEnabled,
            ai_preferred_contact_method: AI_DEFAULTS.aiPreferredContactMethod,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user?.id) {
        throw new Error("Could not create customer account.");
      }

      saveCustomerAiProfileLocally();

      alert("Customer account created successfully ✅");
      router.push("/login");
    } catch (error: any) {
      console.error("Customer signup error:", error);
      alert(error?.message || "Something went wrong while creating the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Customer Account
          </p>

          <h1 className="mt-3 text-5xl font-bold text-yellow-500">
            Create Customer Account
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-300">
            Create your customer account for faster booking, saved preferences,
            AI autofill, and smoother rebooking.
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
        >
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Basic Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Company Name">
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Phone">
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Password">
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-3xl border border-yellow-500/30 bg-black p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              AI Customer Preferences
            </h2>

            <p className="mt-3 text-gray-300">
              These help the system autofill future bookings, suggest rebooks,
              and improve quote recommendations.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <Field label="Preferred Service">
                <select
                  name="preferredServiceType"
                  value={form.preferredServiceType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                >
                  <option value="">Select service</option>
                  <option value="installation_3cm">3cm Installation</option>
                  <option value="installation_2cm_standard">
                    2cm Standard Installation
                  </option>
                  <option value="full_height_backsplash">
                    Full Height Backsplash
                  </option>
                  <option value="backsplash_tiling">Backsplash Tiling</option>
                  <option value="justServices">Just Services</option>
                </select>
              </Field>

              <Field label="Preferred Payment">
                <select
                  name="preferredPaymentMethod"
                  value={form.preferredPaymentMethod}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                >
                  <option value="">Select payment</option>
                  <option value="creditDebit">Credit / Debit</option>
                  <option value="etransfer">E-Transfer</option>
                  <option value="cashPickup">Cash Pickup</option>
                  <option value="chequePickup">Cheque Pickup</option>
                  <option value="weeklyInvoice">Weekly Invoice</option>
                  <option value="payLater">Pay Later</option>
                </select>
              </Field>

              <Field label="Preferred City">
                <input
                  name="preferredCity"
                  value={form.preferredCity}
                  onChange={handleChange}
                  placeholder="Toronto / GTA / City"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              Customer Account Features
            </h2>

            <div className="mt-5 grid gap-3 text-sm text-gray-300 md:grid-cols-2">
              <p>• AI autofill for faster future bookings</p>
              <p>• Saved customer preferences</p>
              <p>• AI rebook suggestions</p>
              <p>• Improved quote recommendations</p>
              <p>• Easier repeat booking flow</p>
              <p>• Better support tied to your account</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-2xl bg-yellow-500 py-4 text-lg font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60"
          >
            {loading ? "Creating Customer Account..." : "Create Customer Account"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-yellow-500 transition hover:text-yellow-400"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}