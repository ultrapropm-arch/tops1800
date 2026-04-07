"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type InstallerProfile = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  years_experience?: number | null;
  service_area?: string | null;
  vehicle_type?: string | null;
  has_tools?: string | null;
  payout_email?: string | null;
  payout_method?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  account_number?: string | null;
};

export default function InstallerProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [hasTools, setHasTools] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [transitNumber, setTransitNumber] = useState("");
  const [institutionNumber, setInstitutionNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const supabase = createClient();

    const savedEmail = localStorage.getItem("installerPortalEmail") || "";
    const savedId = localStorage.getItem("installerPortalId") || "";

    let profile: InstallerProfile | null = null;

    if (savedId) {
      const { data, error } = await supabase
        .from("installer_profiles")
        .select(
          "id, full_name, email, phone, company_name, company_address, years_experience, service_area, vehicle_type, has_tools, payout_email, payout_method, bank_name, account_holder_name, transit_number, institution_number, account_number"
        )
        .eq("id", savedId)
        .maybeSingle<InstallerProfile>();

      if (!error && data) {
        profile = data;
      }
    }

    if (!profile && savedEmail) {
      const { data, error } = await supabase
        .from("installer_profiles")
        .select(
          "id, full_name, email, phone, company_name, company_address, years_experience, service_area, vehicle_type, has_tools, payout_email, payout_method, bank_name, account_holder_name, transit_number, institution_number, account_number"
        )
        .ilike("email", savedEmail)
        .maybeSingle<InstallerProfile>();

      if (!error && data) {
        profile = data;
      }
    }

    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setCompanyName(profile.company_name || "");
      setCompanyAddress(profile.company_address || "");
      setYearsExperience(
        profile.years_experience !== null && profile.years_experience !== undefined
          ? String(profile.years_experience)
          : ""
      );
      setServiceArea(profile.service_area || "");
      setVehicleType(profile.vehicle_type || "");
      setHasTools(profile.has_tools || "");
      setPayoutEmail(profile.payout_email || "");
      setPayoutMethod(profile.payout_method || "");
      setBankName(profile.bank_name || "");
      setAccountHolderName(profile.account_holder_name || "");
      setTransitNumber(profile.transit_number || "");
      setInstitutionNumber(profile.institution_number || "");
      setAccountNumber(profile.account_number || "");
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!email.trim()) {
      alert("Email is required.");
      return;
    }

    if (!fullName.trim()) {
      alert("Full name is required.");
      return;
    }

    if (payoutMethod === "etransfer" && !payoutEmail.trim()) {
      alert("Please enter your payout email.");
      return;
    }

    if (
      payoutMethod === "bank" &&
      (!bankName.trim() ||
        !accountHolderName.trim() ||
        !transitNumber.trim() ||
        !institutionNumber.trim() ||
        !accountNumber.trim())
    ) {
      alert("Please fill out all bank details.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const savedId = localStorage.getItem("installerPortalId") || "";

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      company_address: companyAddress.trim(),
      years_experience: Number(yearsExperience || 0),
      service_area: serviceArea.trim(),
      vehicle_type: vehicleType.trim(),
      has_tools: hasTools.trim(),
      payout_email: payoutMethod === "etransfer" ? payoutEmail.trim() : email.trim(),
      payout_method: payoutMethod.trim(),
      bank_name: payoutMethod === "bank" ? bankName.trim() : "",
      account_holder_name: payoutMethod === "bank" ? accountHolderName.trim() : "",
      transit_number: payoutMethod === "bank" ? transitNumber.trim() : "",
      institution_number: payoutMethod === "bank" ? institutionNumber.trim() : "",
      account_number: payoutMethod === "bank" ? accountNumber.trim() : "",
    };

    let error = null;

    if (savedId) {
      const updateResult = await supabase
        .from("installer_profiles")
        .update(payload)
        .eq("id", savedId);

      error = updateResult.error;
    } else {
      const updateResult = await supabase
        .from("installer_profiles")
        .update(payload)
        .ilike("email", email.trim());

      error = updateResult.error;
    }

    if (error) {
      console.error("Profile save error:", error);
      alert(error.message || "Could not save profile.");
      setSaving(false);
      return;
    }

    localStorage.setItem("installerPortalName", fullName.trim());
    localStorage.setItem("installerPortalEmail", email.trim());

    localStorage.setItem(
      "installerProfile",
      JSON.stringify({
        fullName,
        email,
        phone,
        companyName,
        companyAddress,
        yearsExperience,
        serviceArea,
        vehicleType,
        hasTools,
        payoutEmail,
        payoutMethod,
        bankName,
        accountHolderName,
        transitNumber,
        institutionNumber,
        accountNumber,
      })
    );

    setSaving(false);
    alert("Profile saved successfully.");
  }

  return (
    <main className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-4xl font-bold text-yellow-500">
          Installer Profile
        </h1>

        <p className="mt-3 max-w-3xl text-gray-300">
          Manage your personal details, company information, service area, and
          payout information.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Loading profile...
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              Contact Information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Service Area
                </label>
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="Example: Toronto / GTA"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              Company Information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="Enter years of experience"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-400">
                  Company Address
                </label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Enter company address"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Vehicle Type
                </label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="Example: Van / Pickup / Box Truck"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Own Tools
                </label>
                <select
                  value={hasTools}
                  onChange={(e) => setHasTools(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              Payout Information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select</option>
                  <option value="etransfer">E-Transfer</option>
                  <option value="bank">Bank Account</option>
                  <option value="accounting_software">Accounting Software</option>
                </select>
              </div>

              {payoutMethod === "etransfer" ? (
                <div>
                  <label className="mb-2 block text-sm text-gray-400">
                    Payout Email
                  </label>
                  <input
                    type="email"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    placeholder="Enter payout email"
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>
              ) : null}

              {payoutMethod === "bank" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm text-gray-400">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter bank name"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-400">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Enter account holder name"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-400">
                      Transit Number
                    </label>
                    <input
                      type="text"
                      value={transitNumber}
                      onChange={(e) => setTransitNumber(e.target.value)}
                      placeholder="Enter transit number"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-400">
                      Institution Number
                    </label>
                    <input
                      type="text"
                      value={institutionNumber}
                      onChange={(e) => setInstitutionNumber(e.target.value)}
                      placeholder="Enter institution number"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-gray-400">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>
                </>
              ) : null}

              {payoutMethod === "accounting_software" ? (
                <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-400">
                  This payout method means admin may pay you through external
                  accounting software instead of direct bank or e-transfer.
                </div>
              ) : null}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}