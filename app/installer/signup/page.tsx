"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function InstallerSignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [legalPayoutName, setLegalPayoutName] = useState("");

  const [streetAddress, setStreetAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Ontario");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Canada");

  const [yearsExperience, setYearsExperience] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [maxTravelKm, setMaxTravelKm] = useState("");
  const [hasTools, setHasTools] = useState("");
  const [hasTruck, setHasTruck] = useState("");
  const [hasHelper, setHasHelper] = useState("");

  const [isHstRegistered, setIsHstRegistered] = useState(false);
  const [hstNumber, setHstNumber] = useState("");

  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [transitNumber, setTransitNumber] = useState("");
  const [institutionNumber, setInstitutionNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [liabilityInsurance, setLiabilityInsurance] = useState<File | null>(null);
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<File | null>(null);

  const [agreePlatformPolicy, setAgreePlatformPolicy] = useState(false);
  const [agreeNoDirectDeals, setAgreeNoDirectDeals] = useState(false);
  const [agreeTruthfulInfo, setAgreeTruthfulInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function uploadInstallerFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    folder: string,
    installerKey: string
  ) {
    const safeFileName = file.name.replace(/\s+/g, "-");
    const filePath = `${installerKey}/${folder}/${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("installer-documents")
      .upload(filePath, file, {
        upsert: true,
      });

    if (error) {
      throw new Error(error.message || `Failed to upload ${folder} file.`);
    }

    return filePath;
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setBusinessName("");
    setLegalPayoutName("");
    setStreetAddress("");
    setUnit("");
    setCity("");
    setProvince("Ontario");
    setPostalCode("");
    setCountry("Canada");
    setYearsExperience("");
    setServiceArea("");
    setVehicleType("");
    setMaxTravelKm("");
    setHasTools("");
    setHasTruck("");
    setHasHelper("");
    setIsHstRegistered(false);
    setHstNumber("");
    setPayoutMethod("");
    setPayoutEmail("");
    setBankName("");
    setAccountHolderName("");
    setTransitNumber("");
    setInstitutionNumber("");
    setAccountNumber("");
    setLiabilityInsurance(null);
    setGovernmentId(null);
    setAdditionalDocs(null);
    setAgreePlatformPolicy(false);
    setAgreeNoDirectDeals(false);
    setAgreeTruthfulInfo(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !phone.trim() ||
      !businessName.trim() ||
      !legalPayoutName.trim() ||
      !streetAddress.trim() ||
      !city.trim() ||
      !province.trim() ||
      !postalCode.trim() ||
      !country.trim() ||
      !yearsExperience.trim() ||
      !serviceArea.trim() ||
      !vehicleType.trim() ||
      !maxTravelKm.trim() ||
      !hasTools.trim() ||
      !hasTruck.trim() ||
      !hasHelper.trim()
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    if (password.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (isHstRegistered && !hstNumber.trim()) {
      alert("Please enter your HST number.");
      return;
    }

    if (!liabilityInsurance) {
      alert("Please upload liability insurance.");
      return;
    }

    if (!governmentId) {
      alert("Please upload government ID.");
      return;
    }

    if (!payoutMethod.trim()) {
      alert("Please select a payout method.");
      return;
    }

    if (payoutMethod === "etransfer" && !payoutEmail.trim()) {
      alert("Please enter your e-transfer email.");
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
      alert("Please fill out all bank payout details.");
      return;
    }

    if (!agreePlatformPolicy || !agreeNoDirectDeals || !agreeTruthfulInfo) {
      alert("Please agree to all required policies before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const cleanEmail = email.trim().toLowerCase();
      const cleanFullName = fullName.trim();
      const cleanBusinessName = businessName.trim();
      const cleanLegalPayoutName = legalPayoutName.trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            role: "installer",
            full_name: cleanFullName,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message || "Failed to create installer login.");
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        throw new Error("Installer account was created incorrectly. Missing user id.");
      }

      const { error: roleProfileError } = await supabase.from("profiles").upsert(
        {
          id: authUserId,
          role: "installer",
        },
        {
          onConflict: "id",
        }
      );

      if (roleProfileError) {
        console.error("Installer role profile upsert error:", roleProfileError);
      }

      const installerKey =
        cleanEmail.replace(/[^a-z0-9]/g, "-") || authUserId;

      const liabilityInsuranceUrl = await uploadInstallerFile(
        supabase,
        liabilityInsurance,
        "liability-insurance",
        installerKey
      );

      const governmentIdUrl = await uploadInstallerFile(
        supabase,
        governmentId,
        "government-id",
        installerKey
      );

      let additionalDocsUrl = "";

      if (additionalDocs) {
        additionalDocsUrl = await uploadInstallerFile(
          supabase,
          additionalDocs,
          "additional-docs",
          installerKey
        );
      }

      const installerProfilePayload = {
        id: authUserId,
        user_id: authUserId,

        installer_name: cleanFullName,
        full_name: cleanFullName,
        name: cleanFullName,
        email: cleanEmail,
        phone: phone.trim(),

        business_name: cleanBusinessName,
        legal_payout_name: cleanLegalPayoutName,

        street_address: streetAddress.trim(),
        unit: unit.trim() || null,
        city: city.trim(),
        province: province.trim(),
        postal_code: postalCode.trim().toUpperCase(),
        country: country.trim(),

        years_experience: Number(yearsExperience || 0),
        service_area: serviceArea.trim(),
        vehicle_type: vehicleType.trim(),
        max_travel_km: Number(maxTravelKm || 0),

        has_tools: hasTools.trim() === "yes",
        has_truck: hasTruck.trim() === "yes",
        has_helper: hasHelper.trim() === "yes",

        is_hst_registered: isHstRegistered,
        hst_number: isHstRegistered ? hstNumber.trim() : null,

        payout_method: payoutMethod.trim(),
        etransfer_email: payoutMethod === "etransfer" ? payoutEmail.trim() : null,
        bank_name: payoutMethod === "bank" ? bankName.trim() : null,
        account_holder_name: payoutMethod === "bank" ? accountHolderName.trim() : null,
        transit_number: payoutMethod === "bank" ? transitNumber.trim() : null,
        institution_number: payoutMethod === "bank" ? institutionNumber.trim() : null,
        account_number: payoutMethod === "bank" ? accountNumber.trim() : null,

        liability_insurance_url: liabilityInsuranceUrl,
        government_id_url: governmentIdUrl,
        additional_docs_url: additionalDocsUrl || null,

        status: "pending",
        approval_status: "pending",
        is_active: false,
      };

      const { error: profileError } = await supabase
        .from("installer_profiles")
        .upsert(installerProfilePayload, {
          onConflict: "id",
        });

      if (profileError) {
        throw new Error(profileError.message || "Failed to submit application.");
      }

      alert(
        "Application submitted successfully. Your installer account was created and is now pending admin approval."
      );

      resetForm();
      router.push("/login");
    } catch (error: any) {
      console.error("Installer signup error:", error);
      alert(error?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Installer Application
          </p>

          <h1 className="mt-3 text-5xl font-bold text-yellow-500">
            Join 1-800TOPS
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-300">
            Submit your installer application for review. Approval is required
            before access is granted to the installer platform.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
        >
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Basic Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Email Address">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Create Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Business Name">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Legal Payout Name">
                <input
                  type="text"
                  value={legalPayoutName}
                  onChange={(e) => setLegalPayoutName(e.target.value)}
                  placeholder="Name for invoices / payout"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Address
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Street Address">
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Enter street address"
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </Field>
              </div>

              <Field label="Unit / Apartment (Optional)">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Unit / Suite"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="City">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Province">
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Province"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Postal Code">
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white uppercase outline-none"
                />
              </Field>

              <Field label="Country">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Work Profile
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Years of Experience">
                <input
                  type="number"
                  min="0"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="Enter years of experience"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Primary Service Area">
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="Example: Toronto / GTA"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Vehicle Type">
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="Example: Van / Pickup / Box Truck"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Maximum Travel Distance (KM)">
                <input
                  type="number"
                  min="0"
                  value={maxTravelKm}
                  onChange={(e) => setMaxTravelKm(e.target.value)}
                  placeholder="Example: 150"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Do You Have Your Own Tools?">
                <select
                  value={hasTools}
                  onChange={(e) => setHasTools(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>

              <Field label="Do You Have a Truck / Suitable Vehicle?">
                <select
                  value={hasTruck}
                  onChange={(e) => setHasTruck(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>

              <Field label="Do You Have a Helper Available?">
                <select
                  value={hasHelper}
                  onChange={(e) => setHasHelper(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Tax Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Are You HST Registered?">
                <select
                  value={isHstRegistered ? "yes" : "no"}
                  onChange={(e) => setIsHstRegistered(e.target.value === "yes")}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>

              {isHstRegistered ? (
                <Field label="HST Number">
                  <input
                    type="text"
                    value={hstNumber}
                    onChange={(e) => setHstNumber(e.target.value)}
                    placeholder="Enter HST number"
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </Field>
              ) : (
                <div />
              )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Payout Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Payout Method">
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="">Select payout method</option>
                  <option value="etransfer">E-Transfer</option>
                  <option value="bank">Bank Account</option>
                  <option value="accounting_software">Accounting Software</option>
                </select>
              </Field>

              {payoutMethod === "etransfer" ? (
                <Field label="E-Transfer Email">
                  <input
                    type="email"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    placeholder="Enter e-transfer email"
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </Field>
              ) : (
                <div />
              )}

              {payoutMethod === "bank" ? (
                <>
                  <Field label="Bank Name">
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter bank name"
                      className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </Field>

                  <Field label="Account Holder Name">
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Enter account holder name"
                      className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </Field>

                  <Field label="Transit Number">
                    <input
                      type="text"
                      value={transitNumber}
                      onChange={(e) => setTransitNumber(e.target.value)}
                      placeholder="Enter transit number"
                      className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </Field>

                  <Field label="Institution Number">
                    <input
                      type="text"
                      value={institutionNumber}
                      onChange={(e) => setInstitutionNumber(e.target.value)}
                      placeholder="Enter institution number"
                      className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Account Number">
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                        className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                      />
                    </Field>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-yellow-500">
              Documents
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Upload Liability Insurance">
                <input
                  type="file"
                  onChange={(e) => setLiabilityInsurance(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <Field label="Upload Government ID">
                <input
                  type="file"
                  onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Additional Documents (Optional)">
                  <input
                    type="file"
                    onChange={(e) => setAdditionalDocs(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-yellow-500/30 bg-black p-6">
            <h2 className="text-2xl font-bold text-yellow-500">
              Installer Policy Agreement
            </h2>

            <div className="mt-5 space-y-4 text-gray-300">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreePlatformPolicy}
                  onChange={(e) => setAgreePlatformPolicy(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand that approval is required before I can access the
                  installer platform or receive jobs through 1-800TOPS.
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeNoDirectDeals}
                  onChange={(e) => setAgreeNoDirectDeals(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I agree not to approach, solicit, or accept direct side
                  contracts, future jobs, or private payment arrangements from
                  any customer introduced through 1-800TOPS. Any attempt to go
                  behind the platform is a violation of company policy and may
                  result in permanent removal from the platform.
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeTruthfulInfo}
                  onChange={(e) => setAgreeTruthfulInfo(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I confirm that all information and documents submitted are
                  truthful, valid, and up to date.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-yellow-500 py-4 text-lg font-bold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>

            <p className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-yellow-500 transition hover:text-yellow-400"
              >
                Login
              </Link>
            </p>
          </div>
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