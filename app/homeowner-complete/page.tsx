"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

function HomeownerCompleteContent() {
  const searchParams = useSearchParams();

  const job = searchParams.get("job") || "";
  const token = searchParams.get("token") || "";

  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!job || !token) {
      setError("Missing job or token.");
      return;
    }

    if (!photo) {
      setError("Please upload one completion photo.");
      return;
    }

    try {
      setLoading(true);

      const fileExt = photo.name.split(".").pop();
      const fileName = `homeowner-completions/${job}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("job-photos")
        .upload(fileName, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setError("Photo upload failed.");
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("job-photos")
        .getPublicUrl(fileName);

      const photoUrl = publicUrlData.publicUrl;

      const { data, error: fetchError } = await supabase
        .from("homeowner_bookings")
        .select("id, completion_token, notes")
        .or(`job_number.eq.${job},id.eq.${job}`)
        .single();

      if (fetchError || !data) {
        console.error(fetchError);
        setError("Job not found.");
        setLoading(false);
        return;
      }

      if (data.completion_token !== token) {
        setError("Invalid completion link.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("homeowner_bookings")
        .update({
          status: "completed",
          completion_photo_url: photoUrl,
          completion_notes: notes || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updateError) {
        console.error(updateError);
        setError("Could not complete job.");
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }

    setLoading(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white flex items-center justify-center">
        <div className="max-w-xl rounded-3xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <h1 className="text-4xl font-black text-green-400">
            Job Completed
          </h1>

          <p className="mt-4 text-gray-300">
            Thank you. The homeowner job has been marked complete and the photo
            was uploaded.
          </p>

          <p className="mt-4 text-yellow-400 font-bold">Job #{job}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
          1800TOPS
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-black">Complete Homeowner Job</h1>

          <p className="mt-3 text-gray-400">
            Upload one completion photo and mark this job complete.
          </p>

          <div className="mt-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5">
            <p className="text-sm text-gray-300">Job Number</p>
            <p className="text-3xl font-black text-yellow-400">
              {job || "Missing"}
            </p>
          </div>

          <form onSubmit={handleComplete} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Completion Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-white/20 bg-black p-4 text-white"
                required
              />
            </div>

            <textarea
              placeholder="Optional completion notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-28 w-full rounded-xl border border-white/20 bg-black p-4 text-white outline-none focus:border-yellow-400"
            />

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-6 py-4 text-lg font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
            >
              {loading ? "Completing..." : "Upload Photo & Complete Job"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function HomeownerCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-6 py-10 text-white">
          Loading completion page...
        </main>
      }
    >
      <HomeownerCompleteContent />
    </Suspense>
  );
}