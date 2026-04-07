"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InstallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideSidebar =
    pathname === "/installer/signup" || pathname === "/installer/login";

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <aside className="border-r border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-yellow-500">1800TOPS</h1>
            <p className="mt-2 text-sm text-gray-400">Installer Portal</p>
          </div>

          <nav className="space-y-3">
            <NavLink href="/installer" label="Dashboard" pathname={pathname} />
            <NavLink
              href="/installer/jobs"
              label="Available Jobs"
              pathname={pathname}
            />
            <NavLink
              href="/installer/assigned"
              label="My Assigned Jobs"
              pathname={pathname}
            />
            <NavLink
              href="/installer/calendar"
              label="My Calendar"
              pathname={pathname}
            />
            <NavLink
              href="/installer/payouts"
              label="My Payouts"
              pathname={pathname}
            />
            <NavLink
              href="/installer/profile"
              label="My Profile"
              pathname={pathname}
            />
            <NavLink
              href="/installer/policy"
              label="Company Policy"
              pathname={pathname}
            />
            <NavLink
              href="/installer/messages"
              label="Messages"
              pathname={pathname}
            />
          </nav>
        </aside>

        <main className="min-h-screen bg-black">
          <div className="border-b border-zinc-800 px-8 py-6">
            <h2 className="text-3xl font-bold text-yellow-500">
              Installer Portal
            </h2>
            <p className="mt-2 text-gray-400">
              View jobs, calendar, payouts, profile, messages, and company
              policy.
            </p>
          </div>

          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active =
    pathname === href || (href !== "/installer" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-yellow-500 text-black"
          : "text-gray-300 hover:bg-zinc-900 hover:text-yellow-400"
      }`}
    >
      {label}
    </Link>
  );
}