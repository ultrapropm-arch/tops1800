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
    } catch (error) {
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
        <div className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-xl bg-[#111] text-white shadow-xl">
          <div className="border-b border-white/10 p-4">
            <h3 className="font-bold">1800TOPS AI</h3>
            <p className="text-sm text-gray-400">
              {bookingId
                ? `Booking support for ${bookingId}`
                : "Describe your job to get a quote"}
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[80%] rounded bg-yellow-400 p-2 text-black"
                    : "max-w-[80%] rounded bg-white/10 p-2"
                }
              >
                {message.content}
              </div>
            ))}

            {loading && (
              <div className="max-w-[80%] rounded bg-white/10 p-2">
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
              className="flex-1 rounded p-2 text-black"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading}
              className="rounded bg-yellow-400 px-3 text-black disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}