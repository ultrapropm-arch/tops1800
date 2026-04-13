"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  timeline?: string | null;
  scheduled_date?: string | null;
  pickup_time_slot?: string | null;
  service_type?: string | null;
  sqft?: number | null;
  customer_total?: number | null;
  final_total?: number | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type CustomerProfile = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  customer_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  is_online?: boolean | null;
  last_seen_at?: string | null;
};

type CustomerSummary = {
  id: string;
  profile_id?: string | null;
  customer_name: string;
  customer_email: string;
  company_name: string;
  phone_number: string;
  total_jobs: number;
  total_revenue: number;
  last_booking_date: string;
  is_online: boolean;
  last_seen_at: string;
};

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeEmail(value?: string | null) {
  return safeText(value).toLowerCase();
}

function normalizePhone(value?: string | null) {
  return safeText(value).replace(/\D/g, "");
}

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function isRecentlySeen(lastSeenAt?: string | null, isOnlineFlag?: boolean | null) {
  if (isOnlineFlag === true) return true;
  if (!lastSeenAt) return false;

  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - timestamp <= fiveMinutes;
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);

    try {
      const supabase = createClient();

      const [{ data: bookingData, error: bookingError }, profileResult] =
        await Promise.all([
          supabase.from("bookings").select("*").order("created_at", { ascending: false }),
          supabase
            .from("customer_profiles")
            .select("id,user_id,email,customer_name,full_name,company_name,phone_number,is_online,last_seen_at")
            .order("last_seen_at", { ascending: false }),
        ]);

      if (bookingError) {
        console.error("Error loading customers from bookings:", bookingError);
        alert("Could not load customers.");
        setCustomers([]);
        setLoading(false);
        return;
      }

      const bookings = (bookingData as Booking[]) || [];

      const profiles: CustomerProfile[] = profileResult.error
        ? []
        : ((profileResult.data as CustomerProfile[]) || []);

      const profilesByEmail = new Map<string, CustomerProfile>();
      const profilesByPhone = new Map<string, CustomerProfile>();

      for (const profile of profiles) {
        const email = normalizeEmail(profile.email);
        const phone = normalizePhone(profile.phone_number);

        if (email) profilesByEmail.set(email, profile);
        if (phone) profilesByPhone.set(phone, profile);
      }

      const grouped = new Map<string, CustomerSummary>();

      for (const booking of bookings) {
        const email = normalizeEmail(booking.customer_email);
        const phone = normalizePhone(booking.phone_number);
        const idKey = email || phone || booking.id;

        const matchedProfile =
          (email ? profilesByEmail.get(email) : undefined) ||
          (phone ? profilesByPhone.get(phone) : undefined) ||
          null;

        if (!grouped.has(idKey)) {
          const displayName =
            safeText(booking.customer_name) ||
            safeText(matchedProfile?.customer_name) ||
            safeText(matchedProfile?.full_name) ||
            "No customer name";

          const displayCompany =
            safeText(booking.company_name) ||
            safeText(matchedProfile?.company_name) ||
            "";

          const displayPhone =
            safeText(booking.phone_number) ||
            safeText(matchedProfile?.phone_number) ||
            "";

          const lastSeenAt = safeText(matchedProfile?.last_seen_at);
          const onlineNow = isRecentlySeen(lastSeenAt, matchedProfile?.is_online);

          grouped.set(idKey, {
            id: booking.id,
            profile_id: matchedProfile?.id || null,
            customer_name: displayName,
            customer_email: safeText(booking.customer_email) || safeText(matchedProfile?.email),
            company_name: displayCompany,
            phone_number: displayPhone,
            total_jobs: 0,
            total_revenue: 0,
            last_booking_date: booking.created_at || "",
            is_online: onlineNow,
            last_seen_at: lastSeenAt,
          });
        }

        const customer = grouped.get(idKey)!;
        const revenue = Number(booking.customer_total ?? booking.final_total ?? 0);

        customer.total_jobs += 1;
        customer.total_revenue += revenue;

        if (
          booking.created_at &&
          (!customer.last_booking_date ||
            new Date(booking.created_at).getTime() >
              new Date(customer.last_booking_date).getTime())
        ) {
          customer.last_booking_date = booking.created_at;
        }

        if ((!customer.customer_name || customer.customer_name === "No customer name") && booking.customer_name) {
          customer.customer_name = booking.customer_name;
        }

        if (!customer.customer_email && booking.customer_email) {
          customer.customer_email = booking.customer_email;
        }

        if (!customer.company_name && booking.company_name) {
          customer.company_name = booking.company_name;
        }

        if (!customer.phone_number && booking.phone_number) {
          customer.phone_number = booking.phone_number;
        }
      }

      const mergedCustomers = Array.from(grouped.values());

      for (const profile of profiles) {
        const email = normalizeEmail(profile.email);
        const phone = normalizePhone(profile.phone_number);
        const idKey = email || phone;

        if (!idKey) continue;
        if (grouped.has(idKey)) continue;

        const lastSeenAt = safeText(profile.last_seen_at);
        const onlineNow = isRecentlySeen(lastSeenAt, profile.is_online);

        mergedCustomers.push({
          id: profile.id || idKey,
          profile_id: profile.id || null,
          customer_name:
            safeText(profile.customer_name) ||
            safeText(profile.full_name) ||
            "No customer name",
          customer_email: safeText(profile.email),
          company_name: safeText(profile.company_name),
          phone_number: safeText(profile.phone_number),
          total_jobs: 0,
          total_revenue: 0,
          last_booking_date: "",
          is_online: onlineNow,
          last_seen_at: lastSeenAt,
        });
      }

      setCustomers(
        mergedCustomers.sort((a, b) => {
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;

          return (
            new Date(b.last_booking_date || b.last_seen_at || 0).getTime() -
            new Date(a.last_booking_date || a.last_seen_at || 0).getTime()
          );
        })
      );
    } catch (error) {
      console.error("Unexpected customer load error:", error);
      alert("Could not load customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) => {
      return (
        safeText(customer.customer_name).toLowerCase().includes(term) ||
        safeText(customer.customer_email).toLowerCase().includes(term) ||
        safeText(customer.phone_number).toLowerCase().includes(term) ||
        safeText(customer.company_name).toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const summary = useMemo(() => {
    const totalCustomers = customers.length;
    const onlineCustomers = customers.filter((customer) => customer.is_online).length;
    const totalRevenue = customers.reduce(
      (sum, customer) => sum + Number(customer.total_revenue || 0),
      0
    );
    const totalJobs = customers.reduce(
      (sum, customer) => sum + Number(customer.total_jobs || 0),
      0
    );

    return {
      totalCustomers,
      onlineCustomers,
      totalRevenue,
      totalJobs,
    };
  }, [customers]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="mb-2 text-4xl font-bold text-yellow-500">
            Admin Dashboard / Customers
          </h1>

          <p className="text-gray-300">
            View all customers, total jobs, revenue by customer, profile access, and
            customer online activity when profile presence is available.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {summary.totalCustomers}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Online Now</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {summary.onlineCustomers}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total Jobs</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {summary.totalJobs}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {money(summary.totalRevenue)}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, phone, company..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
          />

          <button
            type="button"
            onClick={() => void loadCustomers()}
            className="rounded-xl border border-zinc-700 bg-black px-5 py-3 font-semibold text-white transition hover:border-yellow-500 hover:text-yellow-400"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-300">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-black text-gray-300">
                <tr>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Phone</th>
                  <th className="px-4 py-4">Company</th>
                  <th className="px-4 py-4">Total Jobs</th>
                  <th className="px-4 py-4">Total Revenue</th>
                  <th className="px-4 py-4">Last Booking</th>
                  <th className="px-4 py-4">Last Seen</th>
                  <th className="px-4 py-4">Open</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={`${customer.customer_email}-${customer.phone_number}-${customer.id}`}
                    className="border-b border-zinc-800"
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          customer.is_online
                            ? "border-green-500/30 bg-green-500/10 text-green-400"
                            : "border-zinc-700 bg-zinc-800/40 text-zinc-300"
                        }`}
                      >
                        {customer.is_online ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-white">
                      {customer.customer_name || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {customer.customer_email || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {customer.phone_number || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {customer.company_name || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {customer.total_jobs}
                    </td>

                    <td className="px-4 py-4 font-semibold text-yellow-500">
                      {money(customer.total_revenue)}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {formatDate(customer.last_booking_date)}
                    </td>

                    <td className="px-4 py-4 text-gray-300">
                      {formatDate(customer.last_seen_at)}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex rounded-lg border border-yellow-500 px-3 py-2 text-yellow-500 transition hover:bg-yellow-500 hover:text-black"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}