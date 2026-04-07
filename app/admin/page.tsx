"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type InstallerProfile = {
  id: string;
  user_id?: string | null;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  approval_status?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type Booking = {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  status?: string | null;
  is_archived?: boolean | null;
  one_way_km?: number | null;
  installer_pay?: number | null;
  ai_urgency_label?: string | null;
  ai_grouping_label?: string | null;
  ai_recommended_installer_type?: string | null;
  ai_dispatch_score?: number | null;
  ai_priority_score?: number | null;
  created_at?: string | null;
};

type InstallerSupportMessage = {
  id: string;
  installer_name?: string | null;
  subject?: string | null;
  message?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type CustomerSupportMessage = {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  subject?: string | null;
  message?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type AiSystemMessage = {
  id: string;
  title?: string | null;
  message?: string | null;
  source?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type RecentMessageItem = {
  id: string;
  sender_name: string;
  sender_type: string;
  message: string;
  created_at?: string | null;
  status?: string | null;
};

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function timeAgo(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(diffMs / 1000 / 60 / 60);
  const days = Math.floor(diffMs / 1000 / 60 / 60 / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getInstallerDisplayName(item: InstallerProfile) {
  return (
    safeText(item.installer_name) ||
    safeText(item.full_name) ||
    safeText(item.name) ||
    safeText(item.business_name) ||
    safeText(item.company_name) ||
    "Installer"
  );
}

function isApprovedInstaller(item: InstallerProfile) {
  const approval = normalizeText(item.approval_status);
  const status = normalizeText(item.status);

  return (
    approval === "approved" ||
    approval === "active" ||
    status === "approved" ||
    status === "active"
  );
}

function isArchivedBooking(item: Booking) {
  return item.is_archived === true;
}

function isAvailableBooking(item: Booking) {
  const status = normalizeText(item.status);
  const hasInstaller = safeText(item.installer_name).length > 0;

  return (status === "available" || status === "pending") && !hasInstaller && !isArchivedBooking(item);
}

function isActiveBooking(item: Booking) {
  const status = normalizeText(item.status);

  return (
    !isArchivedBooking(item) &&
    (
      status === "accepted" ||
      status === "assigned" ||
      status === "confirmed" ||
      status === "in_progress" ||
      status === "in progress" ||
      status === "available" ||
      status === "pending"
    )
  );
}

function isOldBooking(item: Booking) {
  const status = normalizeText(item.status);

  return (
    isArchivedBooking(item) ||
    status === "completed" ||
    status === "completed_pending_admin_review" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

function getAiBestMatchScore(job: Booking) {
  let score = Number(job.ai_dispatch_score || job.ai_priority_score || 0);

  if (!score) {
    score = 55;

    if ((job.ai_recommended_installer_type || "") === "Long Distance Specialist") {
      score += 15;
    }

    if ((job.ai_recommended_installer_type || "") === "Large Project Specialist") {
      score += 10;
    }

    if ((job.ai_grouping_label || "") === "Strong Grouping") {
      score += 15;
    } else if ((job.ai_grouping_label || "") === "Possible Group") {
      score += 8;
    }

    if (Number(job.installer_pay || 0) >= 500) {
      score += 10;
    }

    if ((job.ai_urgency_label || "") === "Same-Day Priority") {
      score += 12;
    } else if ((job.ai_urgency_label || "") === "Next-Day Priority") {
      score += 6;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function StatCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-500">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-yellow-500">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-gray-400">{subtitle}</p> : null}
    </div>
  );

  if (!href) return content;

  return <Link href={href}>{content}</Link>;
}

function QuickLinkCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-500"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xl font-semibold text-yellow-500">{title}</p>
        {badge ? (
          <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [installers, setInstallers] = useState<InstallerProfile[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [installerMessages, setInstallerMessages] = useState<InstallerSupportMessage[]>([]);
  const [customerMessages, setCustomerMessages] = useState<CustomerSupportMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AiSystemMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    void initializeAdminPage();
  }, []);

  async function initializeAdminPage() {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("ADMIN PROFILE CHECK ERROR:", profileError);
        router.replace("/login");
        return;
      }

      if ((profile?.role || "") !== "admin") {
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      setCheckingAccess(false);
      await loadDashboard();
    } catch (error) {
      console.error("ADMIN ACCESS CHECK FAILED:", error);
      router.replace("/login");
    }
  }

  async function loadDashboard() {
    setLoading(true);

    const supabase = createClient();

    const [
      installersResult,
      customersResult,
      installerMessagesResult,
      customerMessagesResult,
      aiMessagesResult,
      bookingsResult,
    ] = await Promise.all([
      supabase
        .from("installer_profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false }),

      supabase
        .from("installer_support_messages")
        .select("id, installer_name, subject, message, created_at, status")
        .order("created_at", { ascending: false }),

      supabase
        .from("customer_support_messages")
        .select("id, customer_name, customer_email, company_name, subject, message, created_at, status")
        .order("created_at", { ascending: false }),

      supabase
        .from("admin_ai_messages")
        .select("id, title, message, source, created_at, status")
        .order("created_at", { ascending: false }),

      supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (installersResult.error) {
      console.error("INSTALLERS LOAD ERROR:", installersResult.error);
    }

    if (customersResult.error) {
      console.error("CUSTOMERS LOAD ERROR:", customersResult.error);
    }

    if (installerMessagesResult.error) {
      console.error("INSTALLER MESSAGES LOAD ERROR:", installerMessagesResult.error);
    }

    if (customerMessagesResult.error) {
      console.error("CUSTOMER MESSAGES LOAD ERROR:", customerMessagesResult.error);
    }

    if (aiMessagesResult.error) {
      console.error("AI MESSAGES LOAD ERROR:", aiMessagesResult.error);
    }

    if (bookingsResult.error) {
      console.error("BOOKINGS LOAD ERROR:", bookingsResult.error);
    }

    const safeBookings = ((bookingsResult.data as Booking[]) || []).map((item) => ({
      ...item,
      one_way_km: Number(item.one_way_km || 0),
      installer_pay: Number(item.installer_pay || 0),
    }));

    setInstallers((installersResult.data as InstallerProfile[]) || []);
    setCustomers((customersResult.data as Profile[]) || []);
    setInstallerMessages((installerMessagesResult.data as InstallerSupportMessage[]) || []);
    setCustomerMessages((customerMessagesResult.data as CustomerSupportMessage[]) || []);
    setAiMessages((aiMessagesResult.data as AiSystemMessage[]) || []);
    setBookings(safeBookings);

    setLoading(false);
  }

  const summary = useMemo(() => {
    const totalInstallers = installers.length;
    const approvedInstallers = installers.filter(isApprovedInstaller).length;

    const totalCustomers = customers.length;

    const installerMessageCount = installerMessages.filter(
      (item) => normalizeText(item.status || "open") !== "resolved"
    ).length;

    const customerMessageCount = customerMessages.filter(
      (item) => normalizeText(item.status || "open") !== "resolved"
    ).length;

    const aiMessageCount = aiMessages.filter(
      (item) => normalizeText(item.status || "open") !== "resolved"
    ).length;

    const allJobsCount = bookings.length;
    const activeJobsCount = bookings.filter(isActiveBooking).length;
    const oldJobsCount = bookings.filter(isOldBooking).length;

    const availableSuggestions = bookings.filter(isAvailableBooking);

    const sameDaySuggestions = availableSuggestions.filter(
      (item) => normalizeText(item.ai_urgency_label) === "same-day priority"
    ).length;

    const nextDaySuggestions = availableSuggestions.filter(
      (item) => normalizeText(item.ai_urgency_label) === "next-day priority"
    ).length;

    const urgencySuggestions = availableSuggestions.filter((item) => {
      const urgency = normalizeText(item.ai_urgency_label);
      return urgency === "same-day priority" || urgency === "next-day priority";
    }).length;

    const longDistanceSuggestions = availableSuggestions.filter(
      (item) => Number(item.one_way_km || 0) > 120
    ).length;

    const strongGrouping = availableSuggestions.filter(
      (item) => normalizeText(item.ai_grouping_label) === "strong grouping"
    ).length;

    const topAiMatches = availableSuggestions.filter(
      (item) => getAiBestMatchScore(item) >= 85
    ).length;

    return {
      totalInstallers,
      approvedInstallers,
      totalCustomers,
      installerMessageCount,
      customerMessageCount,
      aiMessageCount,
      allJobsCount,
      activeJobsCount,
      oldJobsCount,
      availableSuggestions: availableSuggestions.length,
      sameDaySuggestions,
      nextDaySuggestions,
      urgencySuggestions,
      longDistanceSuggestions,
      strongGrouping,
      topAiMatches,
    };
  }, [installers, customers, installerMessages, customerMessages, aiMessages, bookings]);

  const approvedInstallerList = useMemo(() => {
    return installers.filter(isApprovedInstaller).slice(0, 8);
  }, [installers]);

  const customerList = useMemo(() => {
    return customers.slice(0, 8);
  }, [customers]);

  const recentMessages = useMemo<RecentMessageItem[]>(() => {
    const installerItems: RecentMessageItem[] = installerMessages.map((item) => ({
      id: `installer-${item.id}`,
      sender_name: item.installer_name || "Installer",
      sender_type: "installer",
      message: item.message || item.subject || "-",
      created_at: item.created_at,
      status: item.status,
    }));

    const customerItems: RecentMessageItem[] = customerMessages.map((item) => ({
      id: `customer-${item.id}`,
      sender_name: item.company_name || item.customer_name || "Customer",
      sender_type: "customer",
      message: item.message || item.subject || "-",
      created_at: item.created_at,
      status: item.status,
    }));

    const aiItems: RecentMessageItem[] = aiMessages.map((item) => ({
      id: `ai-${item.id}`,
      sender_name: item.source || "AI System",
      sender_type: "ai",
      message: item.message || item.title || "-",
      created_at: item.created_at,
      status: item.status,
    }));

    return [...installerItems, ...customerItems, ...aiItems]
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [installerMessages, customerMessages, aiMessages]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Checking admin access...
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-yellow-500">Admin Dashboard</h1>
          <p className="mt-2 text-gray-400">
            Live business view for bookings, customers, installers, payouts, messages, and AI suggestions.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading dashboard...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Approved Installers"
                value={String(summary.approvedInstallers)}
                subtitle={`Total installers: ${summary.totalInstallers}`}
                href="/admin/installers"
              />
              <StatCard
                title="Customer Accounts"
                value={String(summary.totalCustomers)}
                subtitle="Total customer profiles"
                href="/admin/customers"
              />
              <StatCard
                title="Installer Messages"
                value={String(summary.installerMessageCount)}
                subtitle="Open or unresolved"
                href="/admin/messages"
              />
              <StatCard
                title="Customer Messages"
                value={String(summary.customerMessageCount)}
                subtitle={`AI / system: ${summary.aiMessageCount}`}
                href="/admin/messages"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard
                title="All Jobs"
                value={String(summary.allJobsCount)}
                subtitle="Entire system"
                href="/admin/bookings"
              />
              <StatCard
                title="Active Jobs"
                value={String(summary.activeJobsCount)}
                subtitle="Pending, available, assigned, accepted"
                href="/admin/bookings"
              />
              <StatCard
                title="Old Jobs"
                value={String(summary.oldJobsCount)}
                subtitle="Archived / completed / cancelled"
                href="/admin/old-jobs"
              />
              <StatCard
                title="AI Suggestions"
                value={String(summary.availableSuggestions)}
                subtitle="Open AI-ranked jobs"
                href="/admin/ai-suggestions"
              />
              <StatCard
                title="Urgency"
                value={String(summary.urgencySuggestions)}
                subtitle="Same day + next day"
                href="/admin/ai-suggestions"
              />
              <StatCard
                title="Top AI Match"
                value={String(summary.topAiMatches)}
                subtitle={`Strong grouping: ${summary.strongGrouping}`}
                href="/admin/ai-suggestions"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <QuickLinkCard
                title="Calendar"
                description="See all current jobs in calendar view with urgency on the side."
                href="/admin/calendar"
                badge={summary.urgencySuggestions ? String(summary.urgencySuggestions) : undefined}
              />
              <QuickLinkCard
                title="Bookings"
                description="View all current active bookings."
                href="/admin/bookings"
                badge={summary.activeJobsCount ? String(summary.activeJobsCount) : undefined}
              />
              <QuickLinkCard
                title="Old Jobs"
                description="View archived, completed, and older jobs."
                href="/admin/old-jobs"
                badge={summary.oldJobsCount ? String(summary.oldJobsCount) : undefined}
              />
              <QuickLinkCard
                title="AI Suggestions"
                description="Open same-day, long-distance, grouped routes, and top AI matches."
                href="/admin/ai-suggestions"
                badge={summary.availableSuggestions ? String(summary.availableSuggestions) : undefined}
              />
              <QuickLinkCard
                title="Messages"
                description="View customer, installer, and AI/system conversations."
                href="/admin/messages"
                badge={
                  summary.installerMessageCount + summary.customerMessageCount + summary.aiMessageCount
                    ? String(
                        summary.installerMessageCount +
                          summary.customerMessageCount +
                          summary.aiMessageCount
                      )
                    : undefined
                }
              />
              <QuickLinkCard
                title="Payouts"
                description="Review installer payout and hold/ready/paid flow."
                href="/admin/payouts"
              />
            </div>

            <div className="grid gap-8 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-yellow-500">
                    Recent Messages
                  </h2>
                  <Link
                    href="/admin/messages"
                    className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                  >
                    View all
                  </Link>
                </div>

                {recentMessages.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                    No messages yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentMessages.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-zinc-800 bg-black p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-white">
                              {item.sender_name || "Unknown Sender"}
                            </p>
                            <p className="text-sm text-gray-400">
                              {(item.sender_type || "-").toUpperCase()}
                            </p>
                          </div>

                          <p className="text-sm text-gray-400">
                            {timeAgo(item.created_at)}
                          </p>
                        </div>

                        <p className="mt-3 text-sm text-gray-300">
                          {item.message || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-yellow-500">
                      Approved Installers
                    </h2>
                    <Link
                      href="/admin/installers"
                      className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                    >
                      View all
                    </Link>
                  </div>

                  {approvedInstallerList.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No approved installers yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {approvedInstallerList.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-800 bg-black p-3"
                        >
                          <p className="font-semibold text-white">
                            {getInstallerDisplayName(item)}
                          </p>
                          <p className="text-sm text-green-400">Approved</p>
                          <p className="text-xs text-gray-500">
                            Status: {safeText(item.approval_status) || safeText(item.status) || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-yellow-500">
                      Customer Accounts
                    </h2>
                    <Link
                      href="/admin/customers"
                      className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                    >
                      View all
                    </Link>
                  </div>

                  {customerList.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No customer accounts yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerList.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-800 bg-black p-3"
                        >
                          <p className="font-semibold text-white">
                            {item.full_name || item.email || "Customer"}
                          </p>
                          <p className="text-sm text-yellow-400">Customer</p>
                          <p className="text-xs text-gray-500">
                            Created: {timeAgo(item.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-yellow-500">
                      AI Control
                    </h2>
                    <Link
                      href="/admin/ai-suggestions"
                      className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                    >
                      Open
                    </Link>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-800 bg-black p-3">
                      <p className="text-sm text-gray-400">Urgent Same-Day</p>
                      <p className="mt-1 text-xl font-bold text-red-400">
                        {summary.sameDaySuggestions}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-black p-3">
                      <p className="text-sm text-gray-400">Next-Day</p>
                      <p className="mt-1 text-xl font-bold text-yellow-400">
                        {summary.nextDaySuggestions}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-black p-3">
                      <p className="text-sm text-gray-400">Long Distance</p>
                      <p className="mt-1 text-xl font-bold text-blue-300">
                        {summary.longDistanceSuggestions}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-black p-3">
                      <p className="text-sm text-gray-400">Top AI Match</p>
                      <p className="mt-1 text-xl font-bold text-purple-300">
                        {summary.topAiMatches}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}