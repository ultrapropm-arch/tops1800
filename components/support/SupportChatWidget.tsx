"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SupportChatWidgetProps = {
  bookingId?: string;
  senderType?: "customer" | "admin" | "installer";
};

export default function SupportChatWidget({
  bookingId,
  senderType = "customer",
}: SupportChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: bookingId
        ? `Hi 👋 I’m the 1800TOPS assistant. I can help with your booking #${bookingId}.`
        : "Hi 👋 I’m the 1800TOPS assistant. Tell me your job details and I’ll help you get a quote.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          bookingId,
          senderType,
        }),
      });

      const data = await res.json();

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data?.reply || "I couldn’t generate a response right now.",
        },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Error connecting to AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-yellow-400 px-5 py-3 font-bold text-black shadow-lg"
      >
        {open ? "Close" : "💬 Get Quote"}
      </button>

      {open && (
        <div
          className={`fixed z-50 flex flex-col rounded-xl bg-[#111] text-white shadow-xl transition-all duration-200 ${
            expanded
              ? "bottom-4 right-4 h-[85vh] w-[min(900px,calc(100vw-2rem))]"
              : "bottom-20 right-6 h-[500px] w-[360px] max-w-[calc(100vw-2rem)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h3 className="font-bold">1800TOPS AI</h3>
              <p className="text-sm text-gray-400">
                {bookingId
                  ? `Booking support for ${bookingId}`
                  : "Describe your job to get a quote"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="rounded border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                {expanded ? "Shrink" : "Expand"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[80%] rounded bg-yellow-400 p-3 text-black"
                    : "max-w-[80%] rounded bg-white/10 p-3"
                }
              >
                {message.content}
              </div>
            ))}

            {loading && (
              <div className="max-w-[80%] rounded bg-white/10 p-3">
                Typing...
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 rounded p-3 text-black"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading}
              className="rounded bg-yellow-400 px-4 text-black disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}