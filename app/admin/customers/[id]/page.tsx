"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  timeline?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  sqft?: number | null;
  job_size?: number | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getServiceTypeLabel(booking: Booking) {
  if (booking.service_type_label) return booking.service_type_label;

  const value = booking.service_type;
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getPickupWindow(booking: Booking) {
  if (booking.pickup_time_slot) return booking.pickup_time_slot;

  const from = safeText(booking.pickup_time_from);
  const to = safeText(booking.pickup_time_to);

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return booking.scheduled_time || "-";
}

function normalizeBookingStatus(status?: string | null): string {
  const value = safeText(status).toLowerCase();

  if (!value) return "new";
  if (value === "confirmed") return "pending";
  if (value === "assigned") return "accepted";
  if (value === "in progress") return "in_progress";
  if (value === "completed_pending_admin_review") return "completed";
  if (value === "canceled") return "cancelled";

  return value;
}

function isRecentlySeen(lastSeenAt?: string | null, isOnlineFlag?: boolean | null) {
  if (isOnlineFlag === true) return true;
  if (!lastSeenAt) return false;

  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - timestamp <= fiveMinutes;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-black p-3">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value || "-"}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  className = "text-yellow-500",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

export default function CustomerProfilePage() {
  const params = useParams();
  const rawId = params?.id;
  const customerId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] ?? "" : "";

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadCustomerBookings() {
      if (!customerId) {
        setBookings([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: firstData, error: firstError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", customerId)
          .limit(1);

        if (firstError || !firstData || firstData.length === 0) {
          setBookings([]);
          setLoading(false);
          return;
        }

        const firstBooking = firstData[0] as Booking;
        const email = normalizeEmail(firstBooking.customer_email);
        const phone = normalizePhone(firstBooking.phone_number);

        let query = supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });

        if (email) {
          query = query.eq("customer_email", email);
        } else if (phone) {
          query = query.eq("phone_number", safeText(firstBooking.phone_number));
        } else {
          query = query.eq("id", customerId);
        }

        const [{ data: allBookings, error: allError }, profileResult] = await Promise.all([
          query,
          supabase
            .from("customer_profiles")
            .select("id,user_id,email,customer_name,full_name,company_name,phone_number,is_online,last_seen_at"),
        ]);

        if (allError) {
          setBookings([]);
          setLoading(false);
          return;
        }

        const profiles = (profileResult.data as CustomerProfile[]) || [];

        const matchedProfile =
          profiles.find((profile) => normalizeEmail(profile.email) === email) ||
          profiles.find((profile) => normalizePhone(profile.phone_number) === phone) ||
          null;

        const resolvedName =
          safeText(firstBooking.customer_name) ||
          safeText(matchedProfile?.customer_name) ||
          safeText(matchedProfile?.full_name) ||
          "";

        const resolvedEmail =
          safeText(firstBooking.customer_email) || safeText(matchedProfile?.email);

        const resolvedCompany =
          safeText(firstBooking.company_name) || safeText(matchedProfile?.company_name);

        const resolvedPhone =
          safeText(firstBooking.phone_number) || safeText(matchedProfile?.phone_number);

        const resolvedLastSeen = safeText(matchedProfile?.last_seen_at);
        const resolvedOnline = isRecentlySeen(
          matchedProfile?.last_seen_at,
          matchedProfile?.is_online
        );

        setBookings((allBookings as Booking[]) || []);
        setCustomerName(resolvedName);
        setCustomerEmail(resolvedEmail);
        setCompanyName(resolvedCompany);
        setPhoneNumber(resolvedPhone);
        setLastSeenAt(resolvedLastSeen);
        setIsOnline(resolvedOnline);
      } catch (error) {
        console.error("CUSTOMER PROFILE LOAD ERROR:", error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    void loadCustomerBookings();
  }, [customerId]);

  const totalRevenue = useMemo(() => {
    return bookings.reduce(
      (sum, booking) => sum + Number(booking.customer_total ?? booking.final_total ?? 0),
      0
    );
  }, [bookings]);

  const totalJobs = useMemo(() => bookings.length, [bookings]);

  const completedJobs = useMemo(() => {
    return bookings.filter(
      (booking) => normalizeBookingStatus(booking.status) === "completed"
    ).length;
  }, [bookings]);

  const incompleteJobs = useMemo(() => {
    return bookings.filter(
      (booking) => normalizeBookingStatus(booking.status) === "incomplete"
    ).length;
  }, [bookings]);

  const activeJobs = useMemo(() => {
    return bookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      return status === "accepted" || status === "in_progress" || status === "pending";
    }).length;
  }, [bookings]);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-2xl border border-yellow-500 bg-zinc-900 p-6">
          <h1 className="mb-3 text-4xl font-bold text-yellow-500">Customer Profile</h1>
          <p className="text-zinc-300">
            Review customer information, online activity, and full booking history.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Jobs" value={String(totalJobs)} />
          <StatCard label="Total Revenue" value={money(totalRevenue)} />
          <StatCard label="Completed Jobs" value={String(completedJobs)} />
          <StatCard label="Active Jobs" value={String(activeJobs)} className="text-green-400" />
        </div>

        <div className="rounded-2xl border border-yellow-500 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="Customer Name" value={customerName} />
            <InfoRow label="Email" value={customerEmail} />
            <InfoRow label="Company" value={companyName} />
            <InfoRow label="Phone" value={phoneNumber} />
            <InfoRow label="Total Jobs" value={String(totalJobs)} />
            <InfoRow label="Total Revenue" value={money(totalRevenue)} />
            <InfoRow
              label="Online Status"
              value={isOnline ? "Online" : "Offline"}
            />
            <InfoRow label="Last Seen" value={formatDateTime(lastSeenAt)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-400">{completedJobs}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">Incomplete</p>
            <p className="mt-2 text-3xl font-bold text-red-400">{incompleteJobs}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">In Progress / Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">{activeJobs}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-yellow-500">Job History</h2>

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
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-zinc-700 bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {booking.job_id || booking.id}
                    </span>

                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      {normalizeBookingStatus(booking.status)}
                    </span>

                    <span className="rounded-full border border-zinc-700 bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {getServiceTypeLabel(booking)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label="Booking ID" value={booking.job_id || booking.id} />
                    <InfoRow label="Status" value={normalizeBookingStatus(booking.status)} />
                    <InfoRow label="Pickup Address" value={booking.pickup_address || "-"} />
                    <InfoRow label="Dropoff Address" value={booking.dropoff_address || "-"} />
                    <InfoRow label="Timeline" value={booking.timeline || "-"} />
                    <InfoRow label="Scheduled Date" value={booking.scheduled_date || "-"} />
                    <InfoRow label="Pickup Window" value={getPickupWindow(booking)} />
                    <InfoRow label="Service Type" value={getServiceTypeLabel(booking)} />
                    <InfoRow
                      label="Square Footage"
                      value={
                        booking.sqft != null || booking.job_size != null
                          ? `${Number(booking.sqft ?? booking.job_size ?? 0).toFixed(2)} sqft`
                          : "-"
                      }
                    />
                    <InfoRow label="Payment Method" value={booking.payment_method || "-"} />
                    <InfoRow
                      label="Customer Total"
                      value={money(booking.customer_total ?? booking.final_total ?? 0)}
                    />
                    <InfoRow label="Created" value={formatDateTime(booking.created_at)} />
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