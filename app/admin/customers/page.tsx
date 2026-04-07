"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type CustomerSummary = {
  id: string;
  customer_name: string;
  customer_email: string;
  company_name: string;
  phone_number: string;
  total_jobs: number;
  total_revenue: number;
  last_booking_date: string;
};

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading customers:", error);
      alert("Could not load customers.");
      setCustomers([]);
      setLoading(false);
      return;
    }

    const bookings = (data as Booking[]) || [];

    const grouped = new Map<string, CustomerSummary>();

    for (const booking of bookings) {
      const email = (booking.customer_email || "").trim().toLowerCase();
      const phone = (booking.phone_number || "").trim();
      const idKey = email || phone || booking.id;

      if (!grouped.has(idKey)) {
        grouped.set(idKey, {
          id: booking.id,
          customer_name: booking.customer_name || "No customer name",
          customer_email: booking.customer_email || "",
          company_name: booking.company_name || "",
          phone_number: booking.phone_number || "",
          total_jobs: 0,
          total_revenue: 0,
          last_booking_date: booking.created_at || "",
        });
      }

      const customer = grouped.get(idKey)!;

      customer.total_jobs += 1;
      customer.total_revenue += Number(booking.customer_total || 0);

      if (
        booking.created_at &&
        (!customer.last_booking_date ||
          new Date(booking.created_at).getTime() >
            new Date(customer.last_booking_date).getTime())
      ) {
        customer.last_booking_date = booking.created_at;
      }

      if (!customer.customer_name && booking.customer_name) {
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

    setCustomers(
      Array.from(grouped.values()).sort(
        (a, b) =>
          new Date(b.last_booking_date || 0).getTime() -
          new Date(a.last_booking_date || 0).getTime()
      )
    );

    setLoading(false);
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

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-yellow-500">
          Admin Dashboard / Customers
        </h1>

        <p className="mb-8 text-gray-300">
          View all customers, total jobs completed, revenue by customer, and
          open each customer profile.
        </p>

        {loading ? (
          <div className="text-gray-300">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="text-gray-300">No customers found.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-black text-gray-300">
                <tr>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Phone</th>
                  <th className="px-4 py-4">Company</th>
                  <th className="px-4 py-4">Total Jobs</th>
                  <th className="px-4 py-4">Total Revenue</th>
                  <th className="px-4 py-4">Last Booking</th>
                  <th className="px-4 py-4">Open</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={`${customer.customer_email}-${customer.phone_number}-${customer.id}`}
                    className="border-b border-zinc-800"
                  >
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