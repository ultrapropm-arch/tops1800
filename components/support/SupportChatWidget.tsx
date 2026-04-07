"use client";

import { useState } from "react";

type SupportChatWidgetProps = {
  bookingId?: string;
  senderType?: "customer" | "installer";
};

export default function SupportChatWidget({
  bookingId = "general-support",
  senderType = "customer",
}: SupportChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  async function sendMessage() {
    if (!subject.trim() || !message.trim()) {
      alert("Please enter a subject and message.");
      return;
    }

    setSending(true);

    try {
      console.log({
        bookingId,
        senderType,
        name,
        email,
        companyName,
        subject,
        message,
        image,
      });

      alert("Message ready to send.");
      setName("");
      setEmail("");
      setCompanyName("");
      setSubject("");
      setMessage("");
      setImage(null);
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-yellow-500 px-5 py-3 font-semibold text-black shadow-lg hover:bg-yellow-400"
      >
        Chat
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] rounded-2xl border border-yellow-500 bg-zinc-950 p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-yellow-500">
                Contact Support
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Send a message and one photo if needed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder={senderType === "installer" ? "Installer Name" : "Your Name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />

            {senderType === "customer" && (
              <>
                <input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />

                <input
                  type="text"
                  placeholder="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                />
              </>
            )}

            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />

            <textarea
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-300"
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={sending}
              className="w-full rounded-xl bg-yellow-500 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}