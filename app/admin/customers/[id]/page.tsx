"use client";

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

export default function CustomerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    async function loadCustomerBookings() {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", params.id)
        .limit(1);

      if (error || !data || data.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const firstBooking = data[0];
      const email = firstBooking.customer_email || "";
      const phone = firstBooking.phone_number || "";

      let query = supabase.from("bookings").select("*").order("created_at", {
        ascending: false,
      });

      if (email) {
        query = query.eq("customer_email", email);
      } else if (phone) {
        query = query.eq("phone_number", phone);
      } else {
        query = query.eq("id", params.id);
      }

      const { data: allBookings, error: bookingsError } = await query;

      if (bookingsError) {
        setBookings([]);
        setLoading(false);
        return;
      }

      setBookings(allBookings || []);
      setCustomerName(firstBooking.customer_name || "");
      setCustomerEmail(firstBooking.customer_email || "");
      setCompanyName(firstBooking.company_name || "");
      setPhoneNumber(firstBooking.phone_number || "");
      setLoading(false);
    }

    loadCustomerBookings();
  }, [params.id, supabase]);

  const totalRevenue = bookings.reduce((sum, booking) => {
    return sum + Number(booking.customer_total || 0);
  }, 0);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-4xl font-bold text-yellow-500">
          Customer Profile
        </h1>

        <div className="mb-8 rounded-2xl border border-yellow-500 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="Customer Name" value={customerName} />
            <InfoRow label="Email" value={customerEmail} />
            <InfoRow label="Company" value={companyName} />
            <InfoRow label="Phone" value={phoneNumber} />
            <InfoRow label="Total Jobs" value={String(bookings.length)} />
            <InfoRow
              label="Total Revenue"
              value={`$${totalRevenue.toFixed(2)}`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-yellow-500">
            Job History
          </h2>

          {loading ? (
            <p className="text-zinc-300">Loading customer jobs...</p>
          ) : bookings.length === 0 ? (
            <p className="text-zinc-300">No jobs found for this customer.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-zinc-700 bg-black p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label="Booking ID" value={booking.id} />
                    <InfoRow label="Status" value={booking.status || "-"} />
                    <InfoRow
                      label="Pickup Address"
                      value={booking.pickup_address || "-"}
                    />
                    <InfoRow
                      label="Dropoff Address"
                      value={booking.dropoff_address || "-"}
                    />
                    <InfoRow label="Timeline" value={booking.timeline || "-"} />
                    <InfoRow
                      label="Scheduled Date"
                      value={booking.scheduled_date || "-"}
                    />
                    <InfoRow
                      label="Pickup Window"
                      value={booking.pickup_time_slot || "-"}
                    />
                    <InfoRow
                      label="Service Type"
                      value={booking.service_type || "-"}
                    />
                    <InfoRow
                      label="Square Footage"
                      value={
                        booking.sqft
                          ? `${Number(booking.sqft).toFixed(2)} sqft`
                          : "-"
                      }
                    />
                    <InfoRow
                      label="Payment Method"
                      value={booking.payment_method || "-"}
                    />
                    <InfoRow
                      label="Customer Total"
                      value={`$${Number(booking.customer_total || 0).toFixed(
                        2
                      )}`}
                    />
                    <InfoRow
                      label="Created"
                      value={booking.created_at || "-"}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-black p-3">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value || "-"}</p>
    </div>
  );
}