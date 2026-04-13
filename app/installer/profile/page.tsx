"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type InstallerProfile = {
  id?: string | null;
  user_id?: string | null;

  full_name?: string | null;
  installer_name?: string | null;
  name?: string | null;

  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;

  company_name?: string | null;
  business_name?: string | null;
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

  status?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
};

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function hasRealError(error: unknown) {
  if (!error) return false;
  if (typeof error !== "object") return true;

  const err = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  return Boolean(
    safeText(err.message) ||
      safeText(err.code) ||
      safeText(err.details) ||
      safeText(err.hint)
  );
}

function getResolvedFullName(profile?: InstallerProfile | null) {
  if (!profile) return "";
  return (
    safeText(profile.full_name) ||
    safeText(profile.installer_name) ||
    safeText(profile.name) ||
    ""
  );
}

function getResolvedPhone(profile?: InstallerProfile | null) {
  if (!profile) return "";
  return safeText(profile.phone) || safeText(profile.phone_number);
}

function getResolvedCompanyName(profile?: InstallerProfile | null) {
  if (!profile) return "";
  return safeText(profile.company_name) || safeText(profile.business_name);
}

function getApprovalLabel(profile?: InstallerProfile | null) {
  if (!profile) return "-";

  const approval = normalizeText(profile.approval_status);
  const status = normalizeText(profile.status);

  if (profile.is_active === false) return "Inactive";
  if (approval === "approved" || approval === "active") return "Approved";
  if (status === "approved" || status === "active") return "Approved";
  if (approval) return approval;
  if (status) return status;

  return "-";
}

export default function InstallerProfilePage() {
  const [profileId, setProfileId] = useState("");
  const [profileUserId, setProfileUserId] = useState("");

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
  const [approvalLabel, setApprovalLabel] = useState("-");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function findInstallerProfile() {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const savedEmail = localStorage.getItem("installerPortalEmail") || "";
    const savedId = localStorage.getItem("installerPortalId") || "";

    if (hasRealError(authError)) {
      console.warn("Auth warning while loading installer profile:", authError);
    }

    let profile: InstallerProfile | null = null;

    if (user?.id) {
      const byUserId = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!hasRealError(byUserId.error) && byUserId.data) {
        profile = byUserId.data as InstallerProfile;
      }
    }

    if (!profile && user?.id) {
      const byId = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!hasRealError(byId.error) && byId.data) {
        profile = byId.data as InstallerProfile;
      }
    }

    if (!profile && user?.email) {
      const byEmail = await supabase
        .from("installer_profiles")
        .select("*")
        .ilike("email", user.email)
        .maybeSingle();

      if (!hasRealError(byEmail.error) && byEmail.data) {
        profile = byEmail.data as InstallerProfile;
      }
    }

    if (!profile && savedId) {
      const bySavedId = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("id", savedId)
        .maybeSingle();

      if (!hasRealError(bySavedId.error) && bySavedId.data) {
        profile = bySavedId.data as InstallerProfile;
      }
    }

    if (!profile && savedEmail) {
      const bySavedEmail = await supabase
        .from("installer_profiles")
        .select("*")
        .ilike("email", savedEmail)
        .maybeSingle();

      if (!hasRealError(bySavedEmail.error) && bySavedEmail.data) {
        profile = bySavedEmail.data as InstallerProfile;
      }
    }

    return {
      profile,
      authUserId: user?.id || "",
      authEmail: user?.email || "",
    };
  }

  async function loadProfile() {
    setLoading(true);

    try {
      const { profile, authUserId, authEmail } = await findInstallerProfile();

      if (!profile) {
        if (authUserId) setProfileUserId(authUserId);
        if (authEmail) setEmail(authEmail);
        setLoading(false);
        return;
      }

      setProfileId(safeText(profile.id));
      setProfileUserId(safeText(profile.user_id) || authUserId);

      setFullName(getResolvedFullName(profile));
      setEmail(safeText(profile.email) || authEmail);
      setPhone(getResolvedPhone(profile));
      setCompanyName(getResolvedCompanyName(profile));
      setCompanyAddress(safeText(profile.company_address));
      setYearsExperience(
        profile.years_experience !== null && profile.years_experience !== undefined
          ? String(profile.years_experience)
          : ""
      );
      setServiceArea(safeText(profile.service_area));
      setVehicleType(safeText(profile.vehicle_type));
      setHasTools(safeText(profile.has_tools));
      setPayoutEmail(safeText(profile.payout_email));
      setPayoutMethod(safeText(profile.payout_method));
      setBankName(safeText(profile.bank_name));
      setAccountHolderName(safeText(profile.account_holder_name));
      setTransitNumber(safeText(profile.transit_number));
      setInstitutionNumber(safeText(profile.institution_number));
      setAccountNumber(safeText(profile.account_number));
      setApprovalLabel(getApprovalLabel(profile));

      localStorage.setItem("installerPortalId", safeText(profile.id));
      localStorage.setItem("installerPortalEmail", safeText(profile.email) || authEmail);
      localStorage.setItem("installerPortalName", getResolvedFullName(profile));
    } catch (error) {
      console.error("PROFILE LOAD ERROR:", error);
      alert("Could not load installer profile.");
    } finally {
      setLoading(false);
    }
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

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (hasRealError(authError)) {
        console.warn("Auth warning while saving installer profile:", authError);
      }

      const resolvedUserId = safeText(profileUserId) || safeText(user?.id);
      const resolvedEmail = email.trim();

      const payload = {
        user_id: resolvedUserId || null,
        full_name: fullName.trim(),
        installer_name: fullName.trim(),
        email: resolvedEmail,
        phone: phone.trim(),
        phone_number: phone.trim(),
        company_name: companyName.trim(),
        business_name: companyName.trim(),
        company_address: companyAddress.trim(),
        years_experience: yearsExperience.trim() ? Number(yearsExperience) : 0,
        service_area: serviceArea.trim(),
        vehicle_type: vehicleType.trim(),
        has_tools: hasTools.trim(),
        payout_email: payoutMethod === "etransfer" ? payoutEmail.trim() : resolvedEmail,
        payout_method: payoutMethod.trim(),
        bank_name: payoutMethod === "bank" ? bankName.trim() : "",
        account_holder_name: payoutMethod === "bank" ? accountHolderName.trim() : "",
        transit_number: payoutMethod === "bank" ? transitNumber.trim() : "",
        institution_number: payoutMethod === "bank" ? institutionNumber.trim() : "",
        account_number: payoutMethod === "bank" ? accountNumber.trim() : "",
      };

      let error: unknown = null;
      let savedProfileId = profileId;

      if (profileId) {
        const result = await supabase
          .from("installer_profiles")
          .update(payload)
          .eq("id", profileId)
          .select("id")
          .maybeSingle();

        error = result.error;
        if (!hasRealError(error) && result.data?.id) {
          savedProfileId = String(result.data.id);
        }
      } else if (resolvedUserId) {
        const existing = await supabase
          .from("installer_profiles")
          .select("id")
          .eq("user_id", resolvedUserId)
          .maybeSingle();

        if (!hasRealError(existing.error) && existing.data?.id) {
          const result = await supabase
            .from("installer_profiles")
            .update(payload)
            .eq("id", existing.data.id)
            .select("id")
            .maybeSingle();

          error = result.error;
          if (!hasRealError(error) && result.data?.id) {
            savedProfileId = String(result.data.id);
          }
        } else {
          const result = await supabase
            .from("installer_profiles")
            .upsert(payload, { onConflict: "email" })
            .select("id")
            .maybeSingle();

          error = result.error;
          if (!hasRealError(error) && result.data?.id) {
            savedProfileId = String(result.data.id);
          }
        }
      } else {
        const result = await supabase
          .from("installer_profiles")
          .upsert(payload, { onConflict: "email" })
          .select("id")
          .maybeSingle();

        error = result.error;
        if (!hasRealError(error) && result.data?.id) {
          savedProfileId = String(result.data.id);
        }
      }

      if (hasRealError(error)) {
        const err = error as { message?: string };
        console.error("Profile save error:", error);
        alert(err.message || "Could not save profile.");
        setSaving(false);
        return;
      }

      setProfileId(savedProfileId);
      setProfileUserId(resolvedUserId);

      localStorage.setItem("installerPortalName", fullName.trim());
      localStorage.setItem("installerPortalEmail", resolvedEmail);
      if (savedProfileId) {
        localStorage.setItem("installerPortalId", savedProfileId);
      }

      localStorage.setItem(
        "installerProfile",
        JSON.stringify({
          profileId: savedProfileId,
          profileUserId: resolvedUserId,
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

      alert("Profile saved successfully.");
      await loadProfile();
    } catch (error) {
      console.error("PROFILE SAVE ERROR:", error);
      alert("Could not save profile.");
    } finally {
      setSaving(false);
    }
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

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Profile Status</p>
            <p className="mt-2 text-lg font-semibold text-white">{approvalLabel}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Installer ID</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {profileId || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Linked User ID</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {profileUserId || "-"}
            </p>
          </div>
        </div>
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