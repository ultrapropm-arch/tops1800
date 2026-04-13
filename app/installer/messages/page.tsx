"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MessageStatus = "open" | "urgent" | "resolved" | "pending";

type MessageCategory =
  | "general"
  | "job_issue"
  | "damage_report"
  | "payout_issue"
  | "customer_issue"
  | "schedule_issue"
  | "other";

type MessageItem = {
  id: string;
  installer_name?: string | null;
  installer_email?: string | null;
  installer_user_id?: string | null;
  subject?: string | null;
  message?: string | null;
  status?: string | null;
  created_at?: string | null;
  category?: string | null;
  priority?: string | null;
  admin_reply?: string | null;
};

type InstallerProfile = {
  id?: string | null;
  user_id?: string | null;
  installer_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  approval_status?: string | null;
  status?: string | null;
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

function getResolvedInstallerName(profile?: InstallerProfile | null, fallbackEmail?: string | null) {
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

function getStatusClass(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "resolved") {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }

  if (value === "urgent") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (value === "pending") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }

  return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
}

function getCategoryLabel(category?: string | null) {
  const value = (category || "").toLowerCase();

  if (value === "general") return "General";
  if (value === "job_issue") return "Job Issue";
  if (value === "damage_report") return "Damage Report";
  if (value === "payout_issue") return "Payout Issue";
  if (value === "customer_issue") return "Customer Issue";
  if (value === "schedule_issue") return "Schedule Issue";
  if (value === "other") return "Other";

  return "General";
}

function getPriorityLabel(priority?: string | null) {
  const value = (priority || "").toLowerCase();

  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  if (value === "low") return "Low";

  return "Medium";
}

function getPriorityClass(priority?: string | null) {
  const value = (priority || "").toLowerCase();

  if (value === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (value === "low") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
}

function getAiSuggestion(category: MessageCategory) {
  if (category === "job_issue") {
    return "Include job ID, date, what happened, and whether the job can still continue.";
  }

  if (category === "damage_report") {
    return "Include job ID, what was damaged, when it happened, and if photos were taken.";
  }

  if (category === "payout_issue") {
    return "Include job ID, expected pay, actual pay shown, and what looks incorrect.";
  }

  if (category === "customer_issue") {
    return "Include job ID, customer/company name, what happened, and whether admin needs to call.";
  }

  if (category === "schedule_issue") {
    return "Include job ID, date/time conflict, and what new timing is possible.";
  }

  if (category === "other") {
    return "Write the issue clearly with job ID if related.";
  }

  return "Add clear details so admin can solve it faster.";
}

export default function InstallerMessagesPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [installerName, setInstallerName] = useState("");
  const [installerEmail, setInstallerEmail] = useState("");
  const [installerUserId, setInstallerUserId] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<MessageCategory>("general");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void initializePage();
  }, []);

  async function findInstallerIdentity() {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (hasRealError(authError)) {
      console.warn("Installer message auth warning:", authError);
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

    const savedName = localStorage.getItem("installerPortalName") || "";
    const savedEmail = localStorage.getItem("installerPortalEmail") || "";
    const savedId = localStorage.getItem("installerPortalId") || "";

    const resolvedName =
      getResolvedInstallerName(profile, user?.email) || savedName;
    const resolvedEmail = safeText(profile?.email) || safeText(user?.email) || savedEmail;
    const resolvedUserId = safeText(profile?.user_id) || safeText(user?.id) || savedId;

    if (resolvedName) localStorage.setItem("installerPortalName", resolvedName);
    if (resolvedEmail) localStorage.setItem("installerPortalEmail", resolvedEmail);
    if (resolvedUserId) localStorage.setItem("installerPortalId", resolvedUserId);

    return {
      installerName: resolvedName,
      installerEmail: resolvedEmail,
      installerUserId: resolvedUserId,
    };
  }

  async function initializePage() {
    setLoading(true);

    try {
      const identity = await findInstallerIdentity();

      setInstallerName(identity.installerName);
      setInstallerEmail(identity.installerEmail);
      setInstallerUserId(identity.installerUserId);

      await loadMessages(
        identity.installerName,
        identity.installerEmail,
        identity.installerUserId
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(
    currentInstallerName?: string,
    currentInstallerEmail?: string,
    currentInstallerUserId?: string
  ) {
    const supabase = createClient();

    const name = safeText(currentInstallerName || installerName);
    const email = safeText(currentInstallerEmail || installerEmail).toLowerCase();
    const userId = safeText(currentInstallerUserId || installerUserId);

    const { data, error } = await supabase
      .from("installer_support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading installer messages:", error);
      alert(error.message || "Could not load messages.");
      return;
    }

    const filtered = ((data as MessageItem[]) || []).filter((item) => {
      const messageInstallerName = safeText(item.installer_name).toLowerCase();
      const messageInstallerEmail = safeText(item.installer_email).toLowerCase();
      const messageInstallerUserId = safeText(item.installer_user_id);

      return Boolean(
        (name && messageInstallerName === name.toLowerCase()) ||
          (email && messageInstallerEmail === email) ||
          (userId && messageInstallerUserId === userId)
      );
    });

    setMessages(filtered);
  }

  async function handleSend() {
    const cleanInstallerName = installerName.trim();
    const cleanInstallerEmail = installerEmail.trim();
    const cleanInstallerUserId = installerUserId.trim();

    if (!cleanInstallerName) {
      alert("Please log in to your installer account first.");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      alert("Please enter a subject and message.");
      return;
    }

    setSending(true);

    try {
      const supabase = createClient();
      const autoStatus: MessageStatus = priority === "high" ? "urgent" : "open";

      const { error } = await supabase.from("installer_support_messages").insert({
        installer_name: cleanInstallerName,
        installer_email: cleanInstallerEmail || null,
        installer_user_id: cleanInstallerUserId || null,
        subject: subject.trim(),
        message: body.trim(),
        status: autoStatus,
        category,
        priority,
      });

      if (error) {
        console.error("Error sending installer message:", error);
        alert(error.message || "Could not send message.");
        setSending(false);
        return;
      }

      setSubject("");
      setBody("");
      setCategory("general");
      setPriority("medium");

      await loadMessages(cleanInstallerName, cleanInstallerEmail, cleanInstallerUserId);
      alert("Message sent successfully.");
    } catch (error) {
      console.error("SEND INSTALLER MESSAGE ERROR:", error);
      alert("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return messages;

    return messages.filter((item) => {
      return (
        (item.subject || "").toLowerCase().includes(term) ||
        (item.message || "").toLowerCase().includes(term) ||
        (item.status || "").toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term) ||
        (item.priority || "").toLowerCase().includes(term) ||
        (item.admin_reply || "").toLowerCase().includes(term)
      );
    });
  }, [messages, search]);

  const summary = useMemo(() => {
    return {
      total: messages.length,
      open: messages.filter((m) => (m.status || "").toLowerCase() === "open").length,
      urgent: messages.filter((m) => (m.status || "").toLowerCase() === "urgent").length,
      pending: messages.filter((m) => (m.status || "").toLowerCase() === "pending").length,
      resolved: messages.filter((m) => (m.status || "").toLowerCase() === "resolved").length,
    };
  }, [messages]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-4xl font-bold text-yellow-500">Messages</h1>
        <p className="mt-3 max-w-3xl text-gray-300">
          Contact admin for support, complaints, damage reports, payout issues,
          schedule conflicts, or job concerns.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Installer Name</p>
            <p className="mt-1 font-semibold text-white">
              {installerName || "Not set yet"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Installer Email</p>
            <p className="mt-1 font-semibold text-white">
              {installerEmail || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <p className="text-sm text-gray-400">Installer User ID</p>
            <p className="mt-1 break-all font-semibold text-white">
              {installerUserId || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-gray-400">Total Messages</p>
          <p className="mt-2 text-3xl font-bold text-yellow-500">{summary.total}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-gray-400">Open</p>
          <p className="mt-2 text-3xl font-bold text-yellow-500">{summary.open}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-gray-400">Urgent</p>
          <p className="mt-2 text-3xl font-bold text-red-400">{summary.urgent}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-gray-400">Pending</p>
          <p className="mt-2 text-3xl font-bold text-yellow-400">{summary.pending}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-gray-400">Resolved</p>
          <p className="mt-2 text-3xl font-bold text-green-400">{summary.resolved}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold text-yellow-500">Send a Message</h2>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-gray-400">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MessageCategory)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="general">General</option>
                  <option value="job_issue">Job Issue</option>
                  <option value="damage_report">Damage Report</option>
                  <option value="payout_issue">Payout Issue</option>
                  <option value="customer_issue">Customer Issue</option>
                  <option value="schedule_issue">Schedule Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "low" | "medium" | "high")
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High / Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here"
                className="min-h-[160px] w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {sending ? "Sending..." : "Tap to Send Message"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold text-yellow-500">AI Help</h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm font-semibold text-yellow-400">Suggested Details</p>
              <p className="mt-2 text-sm text-gray-300">
                {getAiSuggestion(category)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm font-semibold text-yellow-400">Quick Tip</p>
              <p className="mt-2 text-sm text-gray-300">
                High priority messages are automatically marked urgent so admin
                can notice them faster.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-4">
              <p className="text-sm font-semibold text-yellow-400">Best Practice</p>
              <p className="mt-2 text-sm text-gray-300">
                Add job ID, date, and clear issue details to reduce back-and-forth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-yellow-500">Recent Messages</h2>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, message, category, status..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none md:max-w-md"
          />
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
              Loading messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-black p-4 text-gray-400">
              No messages found.
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-yellow-400">
                    {message.subject || "No subject"}
                  </p>

                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClass(
                      message.status
                    )}`}
                  >
                    {(message.status || "open").replaceAll("_", " ").toUpperCase()}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${getPriorityClass(
                      message.priority
                    )}`}
                  >
                    {getPriorityLabel(message.priority)}
                  </span>

                  <span className="rounded-full border border-zinc-700 bg-zinc-800/40 px-2 py-1 text-xs font-semibold text-zinc-300">
                    {getCategoryLabel(message.category)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-300">
                  {message.message || "-"}
                </p>

                {message.admin_reply ? (
                  <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
                    <p className="text-sm font-semibold text-yellow-400">Admin Reply</p>
                    <p className="mt-2 text-sm text-gray-300">{message.admin_reply}</p>
                  </div>
                ) : null}

                <p className="mt-3 text-xs text-gray-500">
                  {message.created_at
                    ? new Date(message.created_at).toLocaleString()
                    : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}