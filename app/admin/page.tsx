"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  email?: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type CustomerRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  company_name?: string | null;
  created_at?: string | null;
};

type Booking = {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  scheduled_date?: string | null;
  installer_name?: string | null;
  installer_email?: string | null;
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

type InstallerLiveStatus = {
  id: string;
  installer_user_id?: string | null;
  installer_email?: string | null;
  installer_name?: string | null;
  is_online?: boolean | null;
  last_seen?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const ADMIN_EMAILS = ["ultrapropm@gmail.com", "info@1800tops.com"];

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeText(value?: string | null) {
  return safeText(value).toLowerCase();
}

function hasRealError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return Boolean(
    e.message ||
      e.details ||
      e.hint ||
      e.code ||
      (Array.isArray(e.errors) && e.errors.length > 0)
  );
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

function getAiUrgencyLabel(job: Booking) {
  const existing = safeText(job.ai_urgency_label);
  if (existing) return existing;

  const status = normalizeText(job.status);
  if (status === "same-day" || status === "same_day") return "Same-Day Priority";
  if (status === "next-day" || status === "next_day") return "Next-Day Priority";
  return "";
}

function getAiGroupingLabel(job: Booking) {
  const existing = safeText(job.ai_grouping_label);
  if (existing) return existing;
  if (Number(job.one_way_km || 0) <= 40) return "Possible Group";
  return "";
}

function getAiRecommendedInstallerType(job: Booking) {
  const existing = safeText(job.ai_recommended_installer_type);
  if (existing) return existing;

  if (Number(job.one_way_km || 0) > 120) return "Long Distance Specialist";
  if (Number(job.installer_pay || 0) >= 500) return "Large Project Specialist";
  return "Standard Installer";
}

function isAvailableBooking(item: Booking) {
  const status = normalizeText(item.status);
  const hasInstaller =
    safeText(item.installer_name).length > 0 ||
    safeText(item.installer_email).length > 0;

  return (
    (status === "available" || status === "pending" || status === "open") &&
    !hasInstaller &&
    !isArchivedBooking(item)
  );
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
      status === "pending" ||
      status === "open"
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

    if (getAiRecommendedInstallerType(job) === "Long Distance Specialist") score += 15;
    if (getAiRecommendedInstallerType(job) === "Large Project Specialist") score += 10;

    if (getAiGroupingLabel(job) === "Strong Grouping") score += 15;
    else if (getAiGroupingLabel(job) === "Possible Group") score += 8;

    if (Number(job.installer_pay || 0) >= 500) score += 10;
    if (getAiUrgencyLabel(job) === "Same-Day Priority") score += 12;
    else if (getAiUrgencyLabel(job) === "Next-Day Priority") score += 6;
  }

  return Math.max(0, Math.min(100, score));
}

function isInstallerActuallyOnline(item: InstallerLiveStatus) {
  if (!item.is_online || !item.last_seen) return false;

  const lastSeenMs = new Date(item.last_seen).getTime();
  const nowMs = Date.now();
  const diffMinutes = (nowMs - lastSeenMs) / 1000 / 60;

  return diffMinutes <= 2;
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-500">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-yellow-500">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-gray-400">{subtitle}</p> : null}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
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
  const supabaseRef = useRef(createClient());

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showLiveInstallers, setShowLiveInstallers] = useState(false);

  const [installers, setInstallers] = useState<InstallerProfile[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [installerMessages, setInstallerMessages] = useState<InstallerSupportMessage[]>([]);
  const [customerMessages, setCustomerMessages] = useState<CustomerSupportMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AiSystemMessage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [liveInstallerStatus, setLiveInstallerStatus] = useState<InstallerLiveStatus[]>([]);

  useEffect(() => {
    void initializeAdminPage();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "installer_profiles" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "installer_support_messages" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_support_messages" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_ai_messages" }, async () => {
        await loadDashboard(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "installer_live_status" }, async () => {
        await loadDashboard(false);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthorized]);

  async function initializeAdminPage() {
    const supabase = supabaseRef.current;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const userEmail = safeText(user.email).toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, email")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (hasRealError(profileError)) {
        console.warn("ADMIN PROFILE CHECK WARNING:", profileError);
      }

      const isAdmin =
        normalizeText(profile?.role) === "admin" || ADMIN_EMAILS.includes(userEmail);

      if (!isAdmin) {
        router.replace("/login");
        return;
      }

      if (normalizeText(profile?.role) !== "admin") {
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: userEmail,
            role: "admin",
          },
          { onConflict: "id" }
        );

        if (hasRealError(upsertError)) {
          console.warn("ADMIN PROFILE UPSERT WARNING:", upsertError);
        }
      }

      setIsAuthorized(true);
      setCheckingAccess(false);
      await loadDashboard(true);
    } catch (error) {
      console.warn("ADMIN ACCESS CHECK FAILED:", error);
      router.replace("/login");
    }
  }

  async function loadDashboard(showLoader = true) {
    if (showLoader) setLoading(true);

    const supabase = supabaseRef.current;

    const [
      installersResult,
      profilesCustomersResult,
      tableCustomersResult,
      installerMessagesResult,
      customerMessagesResult,
      aiMessagesResult,
      bookingsResult,
      liveInstallerStatusResult,
    ] = await Promise.all([
      supabase.from("installer_profiles").select("*").order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false }),

      supabase
        .from("customers")
        .select("id, full_name, email, company_name, created_at")
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

      supabase.from("bookings").select("*").order("created_at", { ascending: false }),

      supabase.from("installer_live_status").select("*").order("updated_at", { ascending: false }),
    ]);

    if (hasRealError(installersResult.error)) {
      console.warn("INSTALLERS LOAD WARNING:", installersResult.error);
    }

    if (hasRealError(profilesCustomersResult.error)) {
      console.warn("CUSTOMER PROFILES LOAD WARNING:", profilesCustomersResult.error);
    }

    if (hasRealError(tableCustomersResult.error)) {
      console.warn("CUSTOMERS TABLE LOAD WARNING:", tableCustomersResult.error);
    }

    if (hasRealError(installerMessagesResult.error)) {
      console.warn("INSTALLER MESSAGES LOAD WARNING:", installerMessagesResult.error);
    }

    if (hasRealError(customerMessagesResult.error)) {
      console.warn("CUSTOMER MESSAGES LOAD WARNING:", customerMessagesResult.error);
    }

    if (hasRealError(aiMessagesResult.error)) {
      console.warn("AI MESSAGES LOAD WARNING:", aiMessagesResult.error);
    }

    if (hasRealError(bookingsResult.error)) {
      console.warn("BOOKINGS LOAD WARNING:", bookingsResult.error);
    }

    if (hasRealError(liveInstallerStatusResult.error)) {
      console.warn("LIVE INSTALLER STATUS LOAD WARNING:", liveInstallerStatusResult.error);
    }

    const safeBookings = ((bookingsResult.data as Booking[]) || []).map((item) => ({
      ...item,
      one_way_km: Number(item.one_way_km || 0),
      installer_pay: Number(item.installer_pay || 0),
    }));

    const customersFromProfiles = ((profilesCustomersResult.data as Profile[]) || []).map((item) => ({
      id: item.id,
      full_name: item.full_name,
      email: item.email,
      role: "customer",
      created_at: item.created_at,
    }));

    const customersFromTable = ((tableCustomersResult.data as CustomerRow[]) || []).map((item) => ({
      id: item.id,
      full_name: item.full_name || item.company_name || item.email || "Customer",
      email: item.email,
      role: "customer",
      created_at: item.created_at,
    }));

    const mergedCustomerMap = new Map<string, Profile>();

    [...customersFromTable, ...customersFromProfiles].forEach((item) => {
      if (!item?.id) return;
      mergedCustomerMap.set(item.id, item);
    });

    setInstallers((installersResult.data as InstallerProfile[]) || []);
    setCustomers(Array.from(mergedCustomerMap.values()));
    setInstallerMessages((installerMessagesResult.data as InstallerSupportMessage[]) || []);
    setCustomerMessages((customerMessagesResult.data as CustomerSupportMessage[]) || []);
    setAiMessages((aiMessagesResult.data as AiSystemMessage[]) || []);
    setBookings(safeBookings);
    setLiveInstallerStatus((liveInstallerStatusResult.data as InstallerLiveStatus[]) || []);

    if (showLoader) setLoading(false);
  }

  const liveInstallers = useMemo(() => {
    return liveInstallerStatus.filter(isInstallerActuallyOnline);
  }, [liveInstallerStatus]);

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
      (item) => normalizeText(getAiUrgencyLabel(item)) === "same-day priority"
    ).length;

    const nextDaySuggestions = availableSuggestions.filter(
      (item) => normalizeText(getAiUrgencyLabel(item)) === "next-day priority"
    ).length;

    const urgencySuggestions = availableSuggestions.filter((item) => {
      const urgency = normalizeText(getAiUrgencyLabel(item));
      return urgency === "same-day priority" || urgency === "next-day priority";
    }).length;

    const longDistanceSuggestions = availableSuggestions.filter(
      (item) => Number(item.one_way_km || 0) > 120
    ).length;

    const strongGrouping = availableSuggestions.filter(
      (item) => normalizeText(getAiGroupingLabel(item)) === "strong grouping"
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
      onlineInstallers: liveInstallers.length,
    };
  }, [installers, customers, installerMessages, customerMessages, aiMessages, bookings, liveInstallers]);

  const approvedInstallerList = useMemo(() => installers.filter(isApprovedInstaller).slice(0, 8), [installers]);
  const customerList = useMemo(() => customers.slice(0, 8), [customers]);

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

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-yellow-500">Admin Dashboard</h1>
          <p className="mt-2 text-gray-400">
            Live business view for bookings, customers, installers, payouts, messages, AI suggestions, and online installers.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            Loading dashboard...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Approved Installers"
                value={String(summary.approvedInstallers)}
                subtitle={`Total installers: ${summary.totalInstallers}`}
                href="/admin/installers"
              />
              <StatCard
                title="Installers Online"
                value={String(summary.onlineInstallers)}
                subtitle="Click to see live names"
                onClick={() => setShowLiveInstallers(true)}
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

            {showLiveInstallers ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
                <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-yellow-500">
                      Live Installers
                    </h2>

                    <button
                      type="button"
                      onClick={() => setShowLiveInstallers(false)}
                      className="text-gray-400 transition hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {liveInstallers.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
                      No installers online right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {liveInstallers.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-zinc-800 bg-black p-4"
                        >
                          <p className="font-semibold text-white">
                            {item.installer_name || item.installer_email || "Installer"}
                          </p>
                          <p className="mt-1 text-sm text-green-400">Online</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Last seen: {timeAgo(item.last_seen)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}