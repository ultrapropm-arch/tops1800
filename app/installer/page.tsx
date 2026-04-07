"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  installer_name?: string | null;
  reassigned_installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_notes?: string | null;
  mileage_fee?: number | null;
  return_fee?: number | null;
  is_archived?: boolean | null;
  created_at?: string | null;
};

type InstallerSupportMessage = {
  id: string;
  installer_name?: string | null;
  status?: string | null;
};

type PortalCard = {
  title: string;
  description: string;
  href: string;
};

type InstallerProfile = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  installer_name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  status?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  [key: string]: unknown;
};

type ProfileRow = {
  role?: string | null;
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
  return Object.keys(error as Record<string, unknown>).length > 0;
}

function normalizeBooking(raw: Booking): Booking {
  return {
    ...raw,
    installer_name: safeText(raw.installer_name),
    reassigned_installer_name: safeText(raw.reassigned_installer_name),
    status: normalizeText(raw.status),
    installer_pay: Number(raw.installer_pay || 0),
    mileage_fee: Number(raw.mileage_fee || 0),
    return_fee: Number(raw.return_fee || 0),
  };
}

function getInstallerDisplayName(
  profile: InstallerProfile | null,
  fallbackEmail?: string | null
) {
  if (!profile) return safeText(fallbackEmail) || "";

  return (
    safeText(profile.installer_name) ||
    safeText(profile.full_name) ||
    safeText(profile.name) ||
    safeText(profile.business_name) ||
    safeText(profile.company_name) ||
    safeText(profile.email) ||
    safeText(fallbackEmail) ||
    ""
  );
}

function isApprovedInstallerProfile(profile: InstallerProfile | null) {
  if (!profile) return false;

  const approval = normalizeText(profile.approval_status);
  const status = normalizeText(profile.status);

  if (!approval && !status) return true;

  return (
    approval === "approved" ||
    approval === "active" ||
    status === "approved" ||
    status === "active"
  );
}

function normalizeBookingStatus(status?: string | null): string {
  const value = normalizeText(status);

  if (!value) return "new";
  if (value === "confirmed") return "accepted";
  if (value === "assigned") return "in_progress";
  if (value === "in progress") return "in_progress";
  if (value === "completed_pending_admin_review") return "completed";
  if (value === "canceled") return "cancelled";

  return value;
}

function bookingBelongsToInstaller(
  booking: Booking,
  normalizedInstallerName: string
) {
  if (!normalizedInstallerName) return false;

  return (
    normalizeText(booking.installer_name) === normalizedInstallerName ||
    normalizeText(booking.reassigned_installer_name) === normalizedInstallerName
  );
}

export default function InstallerDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [installerName, setInstallerName] = useState("");
  const [installerEmail, setInstallerEmail] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<InstallerSupportMessage[]>([]);

  useEffect(() => {
    void initializeInstallerDashboard();
  }, []);

  async function initializeInstallerDashboard() {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (hasRealError(userError) || !user) {
        if (hasRealError(userError)) {
          console.warn("Auth get user warning:", userError);
        }
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (hasRealError(profileError)) {
        console.warn("Installer profile check warning:", profileError);
      }

      const profileRole = normalizeText(profile?.role);

      if (profileRole && profileRole !== "installer") {
        router.replace("/login");
        return;
      }

      let installerProfile: InstallerProfile | null = null;

      const byUserId = await supabase
        .from("installer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (hasRealError(byUserId.error)) {
        console.warn("Installer profile by user_id warning:", byUserId.error);
      } else if (byUserId.data) {
        installerProfile = byUserId.data as InstallerProfile;
      }

      if (!installerProfile) {
        const byId = await supabase
          .from("installer_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (hasRealError(byId.error)) {
          console.warn("Installer profile by id warning:", byId.error);
        } else if (byId.data) {
          installerProfile = byId.data as InstallerProfile;
        }
      }

      if (!installerProfile && user.email) {
        const byEmail = await supabase
          .from("installer_profiles")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (hasRealError(byEmail.error)) {
          console.warn("Installer profile by email warning:", byEmail.error);
        } else if (byEmail.data) {
          installerProfile = byEmail.data as InstallerProfile;
        }
      }

      if (!installerProfile) {
        alert("No installer profile found for this account.");
        router.replace("/login");
        return;
      }

      if (!isApprovedInstallerProfile(installerProfile)) {
        alert("Your installer account is not approved yet.");
        router.replace("/login");
        return;
      }

      const cleanInstallerName = getInstallerDisplayName(installerProfile, user.email);
      const cleanInstallerEmail = safeText(installerProfile.email) || safeText(user.email);

      if (!cleanInstallerName) {
        alert("Installer profile name not found.");
        router.replace("/login");
        return;
      }

      if (!installerProfile.user_id && installerProfile.id) {
        const { error: backfillError } = await supabase
          .from("installer_profiles")
          .update({ user_id: user.id })
          .eq("id", installerProfile.id);

        if (hasRealError(backfillError)) {
          console.warn("Installer profile user_id backfill warning:", backfillError);
        }
      }

      setInstallerName(cleanInstallerName);
      setInstallerEmail(cleanInstallerEmail);
      setIsAuthorized(true);
      setCheckingAccess(false);

      await loadDashboardData(cleanInstallerName);
    } catch (error) {
      console.warn("Installer access check warning:", error);
      alert("Installer login failed.");
      router.replace("/login");
    }
  }

  async function loadDashboardData(currentInstallerName: string) {
    setLoading(true);

    const supabase = createClient();

    const bookingsResponse = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    const messagesResponse = await supabase
      .from("installer_support_messages")
      .select("id, installer_name, status")
      .order("created_at", { ascending: false });

    if (hasRealError(bookingsResponse.error)) {
      console.warn("Error loading installer dashboard:", bookingsResponse.error);
      alert(bookingsResponse.error?.message || "Could not load dashboard.");
      setLoading(false);
      return;
    }

    if (hasRealError(messagesResponse.error)) {
      console.warn("Error loading installer messages:", messagesResponse.error);
      alert("Could not load installer dashboard.");
      setLoading(false);
      return;
    }

    const safeBookings = ((bookingsResponse.data as Booking[]) || []).map(normalizeBooking);

    setBookings(safeBookings);
    setMessages((messagesResponse.data as InstallerSupportMessage[]) || []);

    if (currentInstallerName) {
      localStorage.setItem("installerPortalName", currentInstallerName);
    }

    setLoading(false);
  }

  function money(value?: number | null) {
    return "$" + Number(value || 0).toFixed(2);
  }

  function getPickupWindow(job: Booking) {
    if (job.pickup_time_slot) {
      return job.pickup_time_slot;
    }

    const from = job.pickup_time_from || "";
    const to = job.pickup_time_to || "";

    if (from || to) {
      return [from, to].filter(Boolean).join(" - ");
    }

    return job.scheduled_time || "Not set";
  }

  const normalizedInstallerName = normalizeText(installerName);

  const availableJobsCount = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      const noInstaller =
        !safeText(booking.installer_name) && !safeText(booking.reassigned_installer_name);

      return (
        booking.is_archived !== true &&
        noInstaller &&
        (status === "available" || status === "pending" || status === "new")
      );
    }).length;
  }, [bookings]);

  const myJobs = useMemo(() => {
    if (!normalizedInstallerName) return [];

    return bookings.filter((booking) =>
      bookingBelongsToInstaller(booking, normalizedInstallerName)
    );
  }, [bookings, normalizedInstallerName]);

  const myAssignedJobs = useMemo(() => {
    return myJobs.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);

      return (
        booking.is_archived !== true &&
        (status === "accepted" || status === "in_progress")
      );
    });
  }, [myJobs]);

  const myIncompleteJobs = useMemo(() => {
    return myJobs.filter((booking) => {
      return booking.is_archived !== true && normalizeBookingStatus(booking.status) === "incomplete";
    });
  }, [myJobs]);

  const myCompletedJobs = useMemo(() => {
    return myJobs.filter((booking) => {
      return normalizeBookingStatus(booking.status) === "completed";
    });
  }, [myJobs]);

  const myGroupJobsCount = useMemo(() => {
    const grouped = new Set<string>();

    myJobs.forEach((booking) => {
      if (booking.job_group_id) {
        grouped.add(String(booking.job_group_id));
      }
    });

    return grouped.size;
  }, [myJobs]);

  const readyPayoutTotal = useMemo(() => {
    return myJobs
      .filter((booking) => normalizeText(booking.installer_pay_status) === "ready")
      .reduce((sum, booking) => sum + Number(booking.installer_pay || 0), 0);
  }, [myJobs]);

  const paidOutTotal = useMemo(() => {
    return myJobs
      .filter((booking) => normalizeText(booking.installer_pay_status) === "paid")
      .reduce((sum, booking) => sum + Number(booking.installer_pay || 0), 0);
  }, [myJobs]);

  const holdPayoutTotal = useMemo(() => {
    return myJobs
      .filter((booking) => normalizeText(booking.installer_pay_status) === "hold")
      .reduce((sum, booking) => sum + Number(booking.installer_pay || 0), 0);
  }, [myJobs]);

  const pendingReviewPayoutTotal = useMemo(() => {
    return myJobs
      .filter((booking) => normalizeText(booking.installer_pay_status) === "pending_review")
      .reduce((sum, booking) => sum + Number(booking.installer_pay || 0), 0);
  }, [myJobs]);

  const recentAssignedJobs = useMemo(() => {
    return myAssignedJobs.slice(0, 5);
  }, [myAssignedJobs]);

  const recentIncompleteJobs = useMemo(() => {
    return myIncompleteJobs.slice(0, 4);
  }, [myIncompleteJobs]);

  const myOpenMessages = useMemo(() => {
    if (!normalizedInstallerName) return 0;

    return messages.filter((item) => {
      const belongsToMe =
        normalizeText(item.installer_name) === normalizedInstallerName;

      return belongsToMe && normalizeText(item.status) !== "resolved";
    }).length;
  }, [messages, normalizedInstallerName]);

  const cards: PortalCard[] = [
    {
      title: "Available Jobs",
      description: "Review open jobs and accept work.",
      href: "/installer/jobs",
    },
    {
      title: "My Assigned Jobs",
      description: "See active assigned jobs and payout per job.",
      href: "/installer/assigned",
    },
    {
      title: "My Incomplete Jobs",
      description: "Track unfinished jobs that still need follow-up.",
      href: "/installer/incomplete",
    },
    {
      title: "My Payouts",
      description: "Track unpaid, hold, ready, and paid payouts.",
      href: "/installer/payouts",
    },
    {
      title: "Messages",
      description: "Contact admin about support, issues, and complaints.",
      href: "/installer/messages",
    },
    {
      title: "My Profile",
      description: "Review your contact and payout details.",
      href: "/installer/profile",
    },
    {
      title: "My Calendar",
      description: "View your job schedule by date.",
      href: "/installer/calendar",
    },
    {
      title: "Company Policy",
      description: "Read installer rules and job procedures.",
      href: "/installer/policy",
    },
  ];

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Checking installer access...
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-4xl font-bold text-yellow-500">
          Installer Dashboard
        </h1>

        <p className="mt-3 max-w-3xl text-gray-300">
          View available jobs, track assigned work, monitor incomplete jobs,
          review payout status, and manage your installer workflow in one place.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Logged In Installer
            </label>

            <input
              type="text"
              value={installerName}
              readOnly
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">
              Email
            </label>

            <input
              type="text"
              value={installerEmail}
              readOnly
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-gray-300">Loading dashboard...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-8">
            <MetricCard label="Available Jobs" value={String(availableJobsCount)} />
            <MetricCard label="My Assigned Jobs" value={String(myAssignedJobs.length)} />
            <MetricCard label="My Incomplete Jobs" value={String(myIncompleteJobs.length)} />
            <MetricCard label="My Group Jobs" value={String(myGroupJobsCount)} />
            <MetricCard label="Completed Jobs" value={String(myCompletedJobs.length)} />
            <MetricCard label="Ready Payouts" value={money(readyPayoutTotal)} />
            <MetricCard label="On Hold" value={money(holdPayoutTotal)} />
            <MetricCard label="Paid Out" value={money(paidOutTotal)} />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Pending Review Payouts" value={money(pendingReviewPayoutTotal)} />
            <MetricCard label="Open Messages" value={String(myOpenMessages)} />
            <MetricCard label="All My Jobs" value={String(myJobs.length)} />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold text-yellow-500">
                Portal Sections
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {cards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="rounded-2xl border border-zinc-800 bg-black p-5 transition hover:border-yellow-500 hover:bg-zinc-950"
                  >
                    <h3 className="text-xl font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                      {card.description}
                    </p>
                    <div className="mt-4 text-sm font-semibold text-yellow-400">
                      Open Section
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold text-yellow-500">
                  Recent Assigned Jobs
                </h2>

                <div className="mt-4 space-y-4">
                  {recentAssignedJobs.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No active assigned jobs right now.
                    </div>
                  ) : (
                    recentAssignedJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={"/installer/jobs/" + job.id}
                        className="block rounded-xl border border-zinc-800 bg-black p-4 transition hover:border-yellow-500"
                      >
                        <p className="text-lg font-semibold text-yellow-400">
                          {job.company_name || job.customer_name || "Assigned Job"}
                        </p>
                        <p className="mt-1 text-sm text-gray-300">
                          Date: {job.scheduled_date || "-"}
                        </p>
                        <p className="text-sm font-semibold text-yellow-400">
                          Pickup Window: {getPickupWindow(job)}
                        </p>
                        <p className="text-sm text-gray-300">
                          Pick Up: {job.pickup_address || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Drop Off: {job.dropoff_address || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Status: {job.status || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Payout Status: {job.installer_pay_status || "-"}
                        </p>
                        <p className="text-sm font-semibold text-yellow-400">
                          Payout: {money(job.installer_pay)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold text-yellow-500">
                  Incomplete Jobs
                </h2>

                <div className="mt-4 space-y-4">
                  {recentIncompleteJobs.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No incomplete jobs right now.
                    </div>
                  ) : (
                    recentIncompleteJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={"/installer/jobs/" + job.id}
                        className="block rounded-xl border border-zinc-800 bg-black p-4 transition hover:border-yellow-500"
                      >
                        <p className="text-lg font-semibold text-yellow-400">
                          {job.company_name || job.customer_name || "Incomplete Job"}
                        </p>
                        <p className="mt-1 text-sm text-gray-300">
                          Date: {job.scheduled_date || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Pickup Window: {getPickupWindow(job)}
                        </p>
                        <p className="text-sm text-gray-300">
                          Reason: {job.incomplete_reason || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Note: {job.incomplete_notes || job.incomplete_note || "-"}
                        </p>
                        <p className="text-sm text-gray-300">
                          Payout Status: {job.installer_pay_status || "-"}
                        </p>
                        <p className="text-sm font-semibold text-yellow-400">
                          Payout: {money(job.installer_pay)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold text-yellow-500">
                  Messages
                </h2>

                <div className="mt-4 space-y-4">
                  <Link
                    href="/installer/messages"
                    className="block rounded-xl border border-zinc-800 bg-black p-4 transition hover:border-yellow-500"
                  >
                    <p className="text-lg font-semibold text-yellow-400">
                      Support Messages
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      Open / unresolved: {myOpenMessages}
                    </p>
                  </Link>

                  <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-gray-400">
                    Use Messages to report damage, complaints, incomplete job issues,
                    schedule problems, and payout questions.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-yellow-500">{value}</p>
    </div>
  );
}