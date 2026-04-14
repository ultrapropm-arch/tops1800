"use client";

import { useState } from "react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SupportChatWidgetProps = {
  bookingId?: string;
  senderType?: "customer" | "admin" | "installer";
};

const BOOKING_URL = "https://1800tops.com/book";

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
          content:
            data?.reply || "I couldn’t generate a response right now.",
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

  function messageHasBookingLink(content: string) {
    return content.includes(BOOKING_URL);
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
          className={`fixed z-50 flex flex-col rounded-2xl bg-[#111] text-white shadow-2xl transition-all duration-200 ${
            expanded
              ? "inset-2"
              : "bottom-20 left-3 right-3 h-[72vh] md:bottom-20 md:left-auto md:right-6 md:h-[560px] md:w-[390px]"
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
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                {expanded ? "Shrink" : "Expand"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const showBookingButton =
                !isUser && messageHasBookingLink(message.content);

              return (
                <div
                  key={index}
                  className={isUser ? "ml-auto max-w-[85%]" : "max-w-[85%]"}
                >
                  <div
                    className={
                      isUser
                        ? "rounded-2xl bg-yellow-400 p-3 text-black"
                        : "rounded-2xl bg-white/10 p-3 text-white"
                    }
                  >
                    <p className="whitespace-pre-line text-sm leading-6">
                      {message.content.replace(BOOKING_URL, "").trim() || message.content}
                    </p>
                  </div>

                  {showBookingButton && (
                    <div className="mt-2">
                      <Link
                        href="/book"
                        className="inline-flex rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-300"
                      >
                        Book Now
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-white/10 p-3 text-sm text-white">
                Typing...
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="Type your job details..."
                className="flex-1 rounded-xl p-3 text-black outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading}
                className="rounded-xl bg-yellow-400 px-4 font-semibold text-black disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}