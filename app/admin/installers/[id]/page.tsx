"use client";

export default function InstallerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-yellow-500">
          Installer Profile
        </h1>

        <p className="mt-4 text-zinc-400">
          Installer ID: {params.id}
        </p>
      </div>
    </main>
  );
}