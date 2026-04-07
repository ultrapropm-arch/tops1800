"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/ai-suggestions", label: "AI Suggestions" },
  { href: "/admin/bookings", label: "All Bookings" },
  { href: "/admin/bookings/available", label: "Bookings Available" },
  { href: "/admin/bookings/pending", label: "Pending Bookings" },
  { href: "/admin/bookings/incomplete", label: "Incomplete Bookings" },
  { href: "/admin/bookings/completed", label: "Completed Bookings" },
  { href: "/admin/bookings/cancelled", label: "Cancelled Bookings" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/installers", label: "Installers" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/calendar", label: "Calendar" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
          <div className="border-b border-zinc-800 px-6 py-6">
            <h1 className="text-3xl font-bold text-yellow-500">1800TOPS</h1>
            <p className="mt-2 text-sm text-gray-400">Admin Backend</p>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-yellow-500 text-black"
                      : "text-gray-300 hover:bg-zinc-900 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 lg:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-500">
                    Admin Panel
                  </h2>
                  <p className="text-sm text-gray-400">
                    Manage bookings, customers, installers, payouts, and scheduling.
                  </p>
                </div>

                <Link
                  href="/"
                  className="rounded-xl border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
                >
                  Back to Website
                </Link>
              </div>

              <div className="overflow-x-auto lg:hidden">
                <div className="flex min-w-max gap-2">
                  {navItems.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition",
                          active
                            ? "bg-yellow-500 text-black"
                            : "border border-zinc-700 bg-zinc-900 text-gray-300 hover:text-white",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}