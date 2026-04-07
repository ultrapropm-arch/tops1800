"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MessageStatus = "open" | "urgent" | "pending" | "resolved";
type MessagePriority = "low" | "medium" | "high";
type MessageCategory =
  | "general"
  | "job_issue"
  | "damage_report"
  | "payout_issue"
  | "customer_issue"
  | "schedule_issue"
  | "other";

type InstallerSupportMessage = {
  id: string;
  created_at?: string | null;
  installer_id?: string | null;
  installer_name?: string | null;
  subject?: string | null;
  message?: string | null;
  image_url?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
  admin_reply?: string | null;
};

type CustomerSupportMessage = {
  id: string;
  created_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  subject?: string | null;
  message?: string | null;
  image_url?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
  admin_reply?: string | null;
};

type AiSystemMessage = {
  id: string;
  created_at?: string | null;
  source?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  priority?: string | null;
};

type AdminTab = "installer" | "customer" | "ai";
type StatusFilter = "all" | "open" | "urgent" | "pending" | "resolved";

function getStatusClass(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "resolved") {
    return "border-green-500 text-green-400 bg-green-500/10";
  }

  if (value === "urgent") {
    return "border-red-500 text-red-400 bg-red-500/10";
  }

  if (value === "pending") {
    return "border-yellow-500 text-yellow-400 bg-yellow-500/10";
  }

  return "border-zinc-600 text-zinc-300 bg-zinc-800/40";
}

function getPriorityClass(priority?: string | null) {
  const value = (priority || "").toLowerCase();

  if (value === "high") {
    return "border-red-500 text-red-400 bg-red-500/10";
  }

  if (value === "low") {
    return "border-blue-500 text-blue-300 bg-blue-500/10";
  }

  return "border-yellow-500 text-yellow-400 bg-yellow-500/10";
}

function getCategoryLabel(category?: string | null) {
  const value = (category || "").toLowerCase();

  if (value === "job_issue") return "Job Issue";
  if (value === "damage_report") return "Damage Report";
  if (value === "payout_issue") return "Payout Issue";
  if (value === "customer_issue") return "Customer Issue";
  if (value === "schedule_issue") return "Schedule Issue";
  if (value === "general") return "General";
  if (value === "other") return "Other";

  return "General";
}

function countOpen(items: { status?: string | null }[]) {
  return items.filter((item) => (item.status || "open").toLowerCase() !== "resolved")
    .length;
}

export default function AdminMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [tab, setTab] = useState<AdminTab>("installer");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [installerMessages, setInstallerMessages] = useState<
    InstallerSupportMessage[]
  >([]);
  const [customerMessages, setCustomerMessages] = useState<
    CustomerSupportMessage[]
  >([]);
  const [aiMessages, setAiMessages] = useState<AiSystemMessage[]>([]);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);

    const supabase = createClient();

    const installerResponse = await supabase
      .from("installer_support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    const customerResponse = await supabase
      .from("customer_support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    const aiResponse = await supabase
      .from("admin_ai_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (installerResponse.error) {
      console.error("Error loading installer messages:", installerResponse.error);
      alert("Could not load installer messages.");
      setLoading(false);
      return;
    }

    if (customerResponse.error) {
      console.error("Error loading customer messages:", customerResponse.error);
      alert("Could not load customer messages.");
      setLoading(false);
      return;
    }

    if (aiResponse.error) {
      console.error("Error loading AI messages:", aiResponse.error);
    }

    setInstallerMessages(
      (installerResponse.data as InstallerSupportMessage[]) || []
    );
    setCustomerMessages(
      (customerResponse.data as CustomerSupportMessage[]) || []
    );
    setAiMessages((aiResponse.data as AiSystemMessage[]) || []);
    setLoading(false);
  }

  function matchesStatus(status?: string | null) {
    const value = (status || "open").toLowerCase();

    if (statusFilter === "all") return true;
    return value === statusFilter;
  }

  const filteredInstallerMessages = useMemo(() => {
    const term = search.trim().toLowerCase();

    return installerMessages.filter((item) => {
      if (!matchesStatus(item.status)) return false;
      if (!term) return true;

      return (
        (item.installer_name || "").toLowerCase().includes(term) ||
        (item.subject || "").toLowerCase().includes(term) ||
        (item.message || "").toLowerCase().includes(term) ||
        (item.status || "").toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term) ||
        (item.priority || "").toLowerCase().includes(term) ||
        (item.admin_reply || "").toLowerCase().includes(term)
      );
    });
  }, [installerMessages, search, statusFilter]);

  const filteredCustomerMessages = useMemo(() => {
    const term = search.trim().toLowerCase();

    return customerMessages.filter((item) => {
      if (!matchesStatus(item.status)) return false;
      if (!term) return true;

      return (
        (item.customer_name || "").toLowerCase().includes(term) ||
        (item.customer_email || "").toLowerCase().includes(term) ||
        (item.company_name || "").toLowerCase().includes(term) ||
        (item.subject || "").toLowerCase().includes(term) ||
        (item.message || "").toLowerCase().includes(term) ||
        (item.status || "").toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term) ||
        (item.priority || "").toLowerCase().includes(term) ||
        (item.admin_reply || "").toLowerCase().includes(term)
      );
    });
  }, [customerMessages, search, statusFilter]);

  const filteredAiMessages = useMemo(() => {
    const term = search.trim().toLowerCase();

    return aiMessages.filter((item) => {
      if (!matchesStatus(item.status)) return false;
      if (!term) return true;

      return (
        (item.title || "").toLowerCase().includes(term) ||
        (item.message || "").toLowerCase().includes(term) ||
        (item.status || "").toLowerCase().includes(term) ||
        (item.priority || "").toLowerCase().includes(term) ||
        (item.source || "").toLowerCase().includes(term)
      );
    });
  }, [aiMessages, search, statusFilter]);

  async function updateInstallerMessageStatus(id: string, status: MessageStatus) {
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("installer_support_messages")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating installer message:", error);
      alert("Could not update installer message.");
      setSavingId("");
      return;
    }

    await loadMessages();
    setSavingId("");
  }

  async function updateCustomerMessageStatus(id: string, status: MessageStatus) {
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("customer_support_messages")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating customer message:", error);
      alert("Could not update customer message.");
      setSavingId("");
      return;
    }

    await loadMessages();
    setSavingId("");
  }

  async function updateAiMessageStatus(id: string, status: MessageStatus) {
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("admin_ai_messages")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating AI message:", error);
      alert("Could not update AI message.");
      setSavingId("");
      return;
    }

    await loadMessages();
    setSavingId("");
  }

  async function saveInstallerReply(id: string) {
    const reply = (replyDrafts[id] || "").trim();
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("installer_support_messages")
      .update({
        admin_reply: reply,
        status: reply ? "pending" : "open",
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving installer reply:", error);
      alert("Could not save installer reply.");
      setSavingId("");
      return;
    }

    await loadMessages();
    setSavingId("");
  }

  async function saveCustomerReply(id: string) {
    const reply = (replyDrafts[id] || "").trim();
    setSavingId(id);

    const supabase = createClient();

    const { error } = await supabase
      .from("customer_support_messages")
      .update({
        admin_reply: reply,
        status: reply ? "pending" : "open",
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving customer reply:", error);
      alert("Could not save customer reply.");
      setSavingId("");
      return;
    }

    await loadMessages();
    setSavingId("");
  }

  const openInstallerCount = countOpen(installerMessages);
  const openCustomerCount = countOpen(customerMessages);
  const openAiCount = countOpen(aiMessages);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-500">Messages</h1>
            <p className="mt-2 text-gray-400">
              Review installer, customer, and AI/system messages in one place.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-[560px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, subject, message, status, category..."
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white placeholder:text-gray-500 outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["urgent", "Urgent"],
                  ["pending", "Pending"],
                  ["resolved", "Resolved"],
                ] as [StatusFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    statusFilter === value
                      ? "bg-yellow-500 text-black"
                      : "border border-zinc-700 bg-black text-white hover:border-yellow-500 hover:text-yellow-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setTab("installer")}
          className={[
            "rounded-2xl border p-5 text-left transition",
            tab === "installer"
              ? "border-yellow-500 bg-zinc-900"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
          ].join(" ")}
        >
          <p className="text-sm text-gray-400">Installer Messages</p>
          <p className="mt-2 text-3xl font-bold text-yellow-500">
            {openInstallerCount}
          </p>
          <p className="mt-1 text-sm text-gray-400">Open or unresolved</p>
        </button>

        <button
          type="button"
          onClick={() => setTab("customer")}
          className={[
            "rounded-2xl border p-5 text-left transition",
            tab === "customer"
              ? "border-yellow-500 bg-zinc-900"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
          ].join(" ")}
        >
          <p className="text-sm text-gray-400">Customer Messages</p>
          <p className="mt-2 text-3xl font-bold text-yellow-500">
            {openCustomerCount}
          </p>
          <p className="mt-1 text-sm text-gray-400">Open or unresolved</p>
        </button>

        <button
          type="button"
          onClick={() => setTab("ai")}
          className={[
            "rounded-2xl border p-5 text-left transition",
            tab === "ai"
              ? "border-yellow-500 bg-zinc-900"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
          ].join(" ")}
        >
          <p className="text-sm text-gray-400">AI / System Messages</p>
          <p className="mt-2 text-3xl font-bold text-yellow-500">
            {openAiCount}
          </p>
          <p className="mt-1 text-sm text-gray-400">Open or unresolved</p>
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Loading messages...
        </div>
      ) : tab === "installer" ? (
        filteredInstallerMessages.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No installer messages found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInstallerMessages.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3 text-sm text-gray-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-yellow-500">
                        {item.installer_name || "Installer Message"}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {(item.status || "open").toUpperCase()}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {(item.priority || "medium").toUpperCase()}
                      </span>

                      <span className="rounded-full border border-zinc-600 bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-300">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <p>Subject: {item.subject || "-"}</p>
                    <p>Message: {item.message || "-"}</p>
                    <p>
                      Sent:{" "}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"}
                    </p>

                    <div>
                      <span className="font-semibold text-white">Photo:</span>{" "}
                      {item.image_url ? (
                        <Link
                          href={item.image_url}
                          target="_blank"
                          className="text-yellow-400 underline"
                        >
                          View Photo
                        </Link>
                      ) : (
                        <span>-</span>
                      )}
                    </div>

                    {item.admin_reply ? (
                      <div className="rounded-xl border border-zinc-700 bg-black p-3">
                        <p className="text-sm font-semibold text-yellow-400">
                          Saved Admin Reply
                        </p>
                        <p className="mt-2 text-sm text-gray-300">
                          {item.admin_reply}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-zinc-700 bg-black p-3">
                      <p className="mb-2 text-sm font-semibold text-yellow-400">
                        Admin Reply
                      </p>
                      <textarea
                        value={replyDrafts[item.id] ?? item.admin_reply ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a reply or internal response..."
                        className="min-h-[110px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveInstallerReply(item.id)}
                        disabled={savingId === item.id}
                        className="mt-3 rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {savingId === item.id ? "Saving..." : "Save Reply"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:w-[320px]">
                    <button
                      type="button"
                      onClick={() => updateInstallerMessageStatus(item.id, "open")}
                      disabled={savingId === item.id}
                      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Mark Open
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateInstallerMessageStatus(item.id, "urgent")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                    >
                      Mark Urgent
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateInstallerMessageStatus(item.id, "pending")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
                    >
                      Mark Pending
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateInstallerMessageStatus(item.id, "resolved")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "customer" ? (
        filteredCustomerMessages.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No customer messages found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomerMessages.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3 text-sm text-gray-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-yellow-500">
                        {item.customer_name || "Customer Message"}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {(item.status || "open").toUpperCase()}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {(item.priority || "medium").toUpperCase()}
                      </span>

                      <span className="rounded-full border border-zinc-600 bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-300">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <p>Email: {item.customer_email || "-"}</p>
                    <p>Company: {item.company_name || "-"}</p>
                    <p>Subject: {item.subject || "-"}</p>
                    <p>Message: {item.message || "-"}</p>
                    <p>
                      Sent:{" "}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"}
                    </p>

                    <div>
                      <span className="font-semibold text-white">Photo:</span>{" "}
                      {item.image_url ? (
                        <Link
                          href={item.image_url}
                          target="_blank"
                          className="text-yellow-400 underline"
                        >
                          View Photo
                        </Link>
                      ) : (
                        <span>-</span>
                      )}
                    </div>

                    {item.admin_reply ? (
                      <div className="rounded-xl border border-zinc-700 bg-black p-3">
                        <p className="text-sm font-semibold text-yellow-400">
                          Saved Admin Reply
                        </p>
                        <p className="mt-2 text-sm text-gray-300">
                          {item.admin_reply}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-zinc-700 bg-black p-3">
                      <p className="mb-2 text-sm font-semibold text-yellow-400">
                        Admin Reply
                      </p>
                      <textarea
                        value={replyDrafts[item.id] ?? item.admin_reply ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a reply or internal response..."
                        className="min-h-[110px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveCustomerReply(item.id)}
                        disabled={savingId === item.id}
                        className="mt-3 rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {savingId === item.id ? "Saving..." : "Save Reply"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:w-[320px]">
                    <button
                      type="button"
                      onClick={() => updateCustomerMessageStatus(item.id, "open")}
                      disabled={savingId === item.id}
                      className="rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Mark Open
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateCustomerMessageStatus(item.id, "urgent")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                    >
                      Mark Urgent
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateCustomerMessageStatus(item.id, "pending")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
                    >
                      Mark Pending
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateCustomerMessageStatus(item.id, "resolved")
                      }
                      disabled={savingId === item.id}
                      className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredAiMessages.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          No AI/system messages found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAiMessages.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-3 text-sm text-gray-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-yellow-500">
                      {item.title || "AI / System Message"}
                    </h2>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                        item.status
                      )}`}
                    >
                      {(item.status || "open").toUpperCase()}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(
                        item.priority
                      )}`}
                    >
                      {(item.priority || "medium").toUpperCase()}
                    </span>

                    <span className="rounded-full border border-zinc-600 bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {item.source || "AI"}
                    </span>
                  </div>

                  <p>Message: {item.message || "-"}</p>
                  <p>
                    Created:{" "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:w-[320px]">
                  <button
                    type="button"
                    onClick={() => updateAiMessageStatus(item.id, "open")}
                    disabled={savingId === item.id}
                    className="rounded-xl border border-zinc-700 bg-black px-4 py-3 font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Mark Open
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAiMessageStatus(item.id, "urgent")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    Mark Urgent
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAiMessageStatus(item.id, "pending")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
                  >
                    Mark Pending
                  </button>

                  <button
                    type="button"
                    onClick={() => updateAiMessageStatus(item.id, "resolved")}
                    disabled={savingId === item.id}
                    className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}