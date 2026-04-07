"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ADMIN_EMAIL = "ultrapropm@gmail.com";
const RETURN_FEE_CUSTOMER = 200;
const RETURN_FEE_INSTALLER_PAY = 180;
const BASE_MILEAGE_RATE = 1.5;
const REBOOK_CUSTOMER_MILEAGE_PERCENT = 0.6;

type Booking = {
  id: string;
  job_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_type?: string | null;
  service_type_label?: string | null;
  material_type?: string | null;
  material_size?: string | null;
  job_size?: number | null;
  sqft?: number | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pickup_time_slot?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  installer_name?: string | null;
  installer_pay?: number | null;
  installer_pay_status?: string | null;
  status?: string | null;
  job_group_id?: string | number | null;
  job_number?: number | null;
  accepted_at?: string | null;

  incomplete_reason?: string | null;
  incomplete_note?: string | null;
  incomplete_photo_url?: string | null;
  incomplete_photo_path?: string | null;
  incomplete_reported_at?: string | null;

  completion_photo_url?: string | null;
  completion_photo_path?: string | null;
  completion_marked_at?: string | null;

  homeowner_signed_completion_required?: boolean | null;
  homeowner_signed_completion_url?: string | null;
  homeowner_signed_completion_path?: string | null;

  return_fee?: number | null;
  return_fee_charged?: number | null;
  return_fee_installer_pay?: number | null;
  mileage_fee?: number | null;

  customer_sqft_rate?: number | null;
  service_price?: number | null;
  one_way_km?: number | null;
  round_trip_km?: number | null;
  chargeable_km?: number | null;
  customer_mileage_charge?: number | null;

  add_on_services?: string[] | string | null;
  just_services?: string[] | string | null;
  side_note?: string | null;

  waterfall_quantity?: number | null;
  outlet_plug_cutout_quantity?: number | null;
  disposal_responsibility?: string | null;

  installer_base_pay?: number | null;
  installer_mileage_pay?: number | null;
  installer_addon_pay?: number | null;
  installer_cut_polish_pay?: number | null;
  installer_sink_pay?: number | null;
  installer_other_pay?: number | null;
  installer_subtotal_pay?: number | null;
  installer_hst_pay?: number | null;

  installer_payout_lines?:
    | {
        label?: string;
        amount?: number;
      }[]
    | null;
};

function money(value?: number | null) {
  return "$" + Number(value || 0).toFixed(2);
}

function getPickupWindow(job: Booking) {
  if (job.pickup_time_slot) {
    return job.pickup_time_slot;
  }

  const from = job.pickup_time_from || "";
  const to = job.pickup_time_to || "";

  if (from || to) {
    return [from, to].filter(Boolean).join(" - ");
  }

  return job.scheduled_time || "-";
}

function getHoursUntilJob(scheduledDate?: string | null) {
  if (!scheduledDate) return null;

  const target = new Date(`${scheduledDate}T09:00:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

function getServiceTypeLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "full_height_backsplash") return "Full Height Backsplash";
  if (value === "installation_3cm") return "3cm Installation";
  if (value === "installation_2cm_standard") return "2cm Standard Installation";
  if (value === "backsplash_tiling") return "Backsplash Tiling";
  if (value === "justServices") return "Just Services";
  return value;
}

function getDisposalResponsibilityLabel(value?: string | null) {
  if (!value) return "-";
  if (value === "customer") return "Customer / Shop Responsible";
  if (value === "installer") return "Installer Responsible";
  return value;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  if (typeof value === "string") {
    return value
      .split(" | ")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getPayoutLines(job: Booking) {
  const lines: { label: string; amount: number }[] = [];

  if (
    Array.isArray(job.installer_payout_lines) &&
    job.installer_payout_lines.length > 0
  ) {
    return job.installer_payout_lines.map((line) => ({
      label: line.label || "Payout Line",
      amount: Number(line.amount || 0),
    }));
  }

  if (Number(job.installer_base_pay || 0) > 0) {
    lines.push({
      label: "Base Install Pay",
      amount: Number(job.installer_base_pay || 0),
    });
  }

  if (Number(job.installer_mileage_pay || 0) > 0) {
    lines.push({
      label: "Mileage Pay",
      amount: Number(job.installer_mileage_pay || 0),
    });
  }

  if (Number(job.installer_addon_pay || 0) > 0) {
    lines.push({
      label: "Add-On Pay",
      amount: Number(job.installer_addon_pay || 0),
    });
  }

  if (Number(job.installer_cut_polish_pay || 0) > 0) {
    lines.push({
      label: "Cut / Polish Pay",
      amount: Number(job.installer_cut_polish_pay || 0),
    });
  }

  if (Number(job.installer_sink_pay || 0) > 0) {
    lines.push({
      label: "Sink / Reattach Pay",
      amount: Number(job.installer_sink_pay || 0),
    });
  }

  if (Number(job.installer_other_pay || 0) > 0) {
    lines.push({
      label: "Other Service Pay",
      amount: Number(job.installer_other_pay || 0),
    });
  }

  return lines;
}

function getDiscountedIncompleteMileage(job: Booking) {
  const chargeableKm = Number(job.chargeable_km || 0);
  const discountedMileage = chargeableKm * BASE_MILEAGE_RATE * REBOOK_CUSTOMER_MILEAGE_PERCENT;
  return Number(discountedMileage.toFixed(2));
}

function getIncompleteTotalDue(job: Booking, returnFee: number) {
  const discountedMileage = getDiscountedIncompleteMileage(job);
  return Number((Number(returnFee || 0) + discountedMileage).toFixed(2));
}

function getRebookUrl(job: Booking) {
  return `https://www.1800tops.com/rebook/${job.id}`;
}

async function sendCustomerEmail(params: {
  to: string;
  subject: string;
  html: string;
  type?: "assignment" | "completion" | "incomplete";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send email");
  }

  return result;
}

async function sendAdminEmail(params: {
  subject: string;
  html: string;
  type?: "installer_accepted" | "completion" | "incomplete";
}) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: params.subject,
      html: params.html,
      type: params.type,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send admin email");
  }

  return result;
}

async function uploadJobFile(
  file: File,
  folder: "completed-jobs" | "completion-signatures" | "incomplete-jobs",
  jobId: string
) {
  const supabase = createClient();
  const safeFileName = file.name.replace(/\s+/g, "-");
  const filePath = `${folder}/${jobId}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from("job-photos")
    .upload(filePath, file, {
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || "Failed to upload file.");
  }

  const { data } = supabase.storage.from("job-photos").getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: data.publicUrl,
  };
}

function assignmentEmailHtml(job: Booking, installerName?: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>An installer has been assigned to your booking with 1-800TOPS.</p>

      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Installer:</strong> ${installerName || job.installer_name || "-"}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Service:</strong> ${getServiceTypeLabel(
          job.service_type_label || job.service_type
        )}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      </div>
    </div>
  `;
}

function completionEmailHtml(
  job: Booking,
  completedPhotoUrl: string,
  signatureUrl?: string
) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>Your job has been completed successfully.</p>

      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Service:</strong> ${getServiceTypeLabel(
          job.service_type_label || job.service_type
        )}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
        <p><strong>Completion Photo:</strong> <a href="${completedPhotoUrl}">View Photo</a></p>
        ${
          signatureUrl
            ? `<p><strong>Signed Completion:</strong> <a href="${signatureUrl}">View Signed Form</a></p>`
            : `<p><strong>Signed Completion:</strong> No customer signing form was provided.</p>`
        }
      </div>

      <p>Thank you for choosing 1-800TOPS.</p>
    </div>
  `;
}

function incompleteEmailHtml(
  job: Booking,
  reason: string,
  note: string,
  returnFee: number,
  incompletePhotoUrl: string
) {
  const reasonLabel =
    reason === "customer"
      ? "Customer / Homeowner Issue"
      : reason === "shop"
        ? "Shop Issue"
        : reason === "installer"
          ? "Installer Issue"
          : reason || "-";

  const discountedMileageCharge = getDiscountedIncompleteMileage(job);
  const totalDue = getIncompleteTotalDue(job, returnFee);
  const rebookUrl = getRebookUrl(job);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>Hello ${job.customer_name || "Customer"},</p>
      <p>Your job could not be completed at this time.</p>

      <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px;">
        <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
        <p><strong>Company / Customer:</strong> ${job.company_name || job.customer_name || "-"}</p>
        <p><strong>Reason:</strong> ${reasonLabel}</p>
        <p><strong>Note:</strong> ${note || "-"}</p>
        <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
        <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
        <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
        <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
        <p><strong>Photo Proof:</strong> <a href="${incompletePhotoUrl}">View Photo</a></p>
      </div>

      ${
        returnFee > 0
          ? `
          <div style="margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 10px; background: #fafafa;">
            <p><strong>Return Visit Fee:</strong> ${money(returnFee)}</p>
            <p><strong>Discounted Mileage Charge:</strong> ${money(discountedMileageCharge)}</p>
            <p><strong>Total Due For Return Visit:</strong> ${money(totalDue)}</p>
          </div>
        `
          : ""
      }

      ${
        returnFee > 0
          ? `<p>A return visit fee has been applied because this was marked as a customer or shop-related issue.</p>`
          : ""
      }

      <p><strong>Please do not create a new booking.</strong></p>
      <p>Use the link below to continue this existing job when you are ready.</p>

      ${
        returnFee > 0
          ? `
            <div style="margin: 24px 0;">
              <a
                href="${rebookUrl}"
                style="
                  display: inline-block;
                  background: #d4af37;
                  color: #000;
                  text-decoration: none;
                  padding: 14px 22px;
                  border-radius: 10px;
                  font-weight: bold;
                "
              >
                Request Return Visit
              </a>
            </div>

            <p><strong>Payment options on the return-visit page:</strong></p>
            <ul>
              <li>Credit / Debit</li>
              <li>E-Transfer</li>
              <li>Pay Later</li>
            </ul>
          `
          : ""
      }

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />

      <p><strong>Important Job Policies:</strong></p>
      <ul>
        <li>Installer waiting time may be subject to additional charges.</li>
        <li>Please ensure all countertop pieces are counted and organized before pickup.</li>
        <li>If paperwork requires homeowner signature, provide it to the installer at pickup.</li>
      </ul>
    </div>
  `;
}

function adminAcceptedEmailHtml(job: Booking, installerName: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Status:</strong> accepted</p>
      <p><strong>Installer Payout:</strong> ${money(job.installer_pay)}</p>
    </div>
  `;
}

function adminCompletionEmailHtml(
  job: Booking,
  installerName: string,
  completedPhotoUrl: string,
  hasSigningForm: boolean,
  signatureUrl?: string
) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Job Completed</h2>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Completion Photo:</strong> <a href="${completedPhotoUrl}">View Photo</a></p>
      <p><strong>Customer Provided Signing Form:</strong> ${
        hasSigningForm ? "Yes" : "No"
      }</p>
      ${
        signatureUrl
          ? `<p><strong>Signed Completion:</strong> <a href="${signatureUrl}">View Signed Form</a></p>`
          : ""
      }
      <p><strong>Status:</strong> completed</p>
    </div>
  `;
}

function adminIncompleteEmailHtml(
  job: Booking,
  installerName: string,
  reason: string,
  note: string,
  returnFee: number,
  installerPayStatus: string,
  incompletePhotoUrl: string
) {
  const reasonLabel =
    reason === "customer"
      ? "Customer / Homeowner Issue"
      : reason === "shop"
        ? "Shop Issue"
        : reason === "installer"
          ? "Installer Issue"
          : reason || "-";

  const discountedMileageCharge = getDiscountedIncompleteMileage(job);
  const totalDue = getIncompleteTotalDue(job, returnFee);
  const rebookUrl = getRebookUrl(job);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Job Incomplete</h2>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      <p><strong>Note:</strong> ${note || "-"}</p>
      <p><strong>Photo Proof:</strong> <a href="${incompletePhotoUrl}">View Photo</a></p>
      <p><strong>Customer Return Fee:</strong> ${money(returnFee)}</p>
      <p><strong>Discounted Mileage Charge:</strong> ${money(discountedMileageCharge)}</p>
      <p><strong>Total Due For Return Visit:</strong> ${money(totalDue)}</p>
      <p><strong>Installer Return Pay:</strong> ${money(
        returnFee > 0 ? RETURN_FEE_INSTALLER_PAY : 0
      )}</p>
      <p><strong>Installer Pay Status:</strong> ${installerPayStatus}</p>
      <p><strong>Rebook Link:</strong> <a href="${rebookUrl}">${rebookUrl}</a></p>
      <p><strong>Status:</strong> incomplete</p>
    </div>
  `;
}

function adminCancelRequestEmailHtml(
  job: Booking,
  installerName: string,
  reason: string,
  hoursNotice: number | null
) {
  const lateCancel = hoursNotice !== null && hoursNotice < 48;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p><strong>Installer Cancel Request</strong></p>
      <p><strong>Job ID:</strong> ${job.job_id || job.id}</p>
      <p><strong>Installer:</strong> ${installerName || "-"}</p>
      <p><strong>Customer / Company:</strong> ${job.company_name || job.customer_name || "-"}</p>
      <p><strong>Service:</strong> ${getServiceTypeLabel(
        job.service_type_label || job.service_type
      )}</p>
      <p><strong>Date:</strong> ${job.scheduled_date || "-"}</p>
      <p><strong>Pickup Window:</strong> ${getPickupWindow(job)}</p>
      <p><strong>Pick Up:</strong> ${job.pickup_address || "-"}</p>
      <p><strong>Drop Off:</strong> ${job.dropoff_address || "-"}</p>
      <p><strong>Cancel Reason:</strong> ${reason || "-"}</p>
      <p><strong>Notice Given:</strong> ${
        hoursNotice === null ? "-" : `${hoursNotice.toFixed(1)} hours`
      }</p>
      <p><strong>Policy Result:</strong> ${
        lateCancel
          ? "Late cancellation request (under 48 hours)"
          : "Within policy (48+ hours notice)"
      }</p>
      <p><strong>Next Step:</strong> Review and reassign if approved.</p>
    </div>
  `;
}

function Info({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p
        className={
          highlight
            ? "mt-1 font-semibold text-yellow-400"
            : "mt-1 text-white"
        }
      >
        {value || "-"}
      </p>
    </div>
  );
}

function ServiceBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <p className="mb-3 text-lg font-semibold text-yellow-400">{title}</p>
      <div className="space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>
    </div>
  );
}

export default function InstallerJobDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Booking | null>(null);
  const [groupJobs, setGroupJobs] = useState<Booking[]>([]);
  const [installerName, setInstallerName] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [showIncompleteBox, setShowIncompleteBox] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [incompleteNote, setIncompleteNote] = useState("");
  const [incompletePhoto, setIncompletePhoto] = useState<File | null>(null);

  const [showCompleteBox, setShowCompleteBox] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [hasSigningForm, setHasSigningForm] = useState("");
  const [completionSignature, setCompletionSignature] = useState<File | null>(
    null
  );

  const [showCancelBox, setShowCancelBox] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("installerPortalName") || "";
    setInstallerName(savedName);

    if (jobId) {
      void loadJobDetails();
    }
  }, [jobId]);

  async function loadJobDetails() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", jobId)
      .maybeSingle<Booking>();

    if (error || !data) {
      console.error("Error loading job:", error);
      alert("Could not load job details.");
      setLoading(false);
      return;
    }

    setJob(data);
    setIncompleteReason(data.incomplete_reason || "");
    setIncompleteNote(data.incomplete_note || "");
    setHasSigningForm(
      data.homeowner_signed_completion_required === true
        ? "yes"
        : data.homeowner_signed_completion_required === false
          ? "no"
          : ""
    );

    if (data.job_group_id) {
      const { data: groupData, error: groupError } = await supabase
        .from("bookings")
        .select("*")
        .eq("job_group_id", data.job_group_id)
        .order("job_number", { ascending: true });

      if (groupError) {
        console.error("Error loading grouped jobs:", groupError);
        setGroupJobs([data]);
      } else {
        setGroupJobs((groupData as Booking[]) || [data]);
      }
    } else {
      setGroupJobs([data]);
    }

    setLoading(false);
  }

  const normalizedInstallerName = installerName.trim().toLowerCase();

  const currentJobAvailable = useMemo(() => {
    if (!job) return false;

    return (
      (job.status || "").toLowerCase() === "available" &&
      (!job.installer_name || job.installer_name.trim() === "")
    );
  }, [job]);

  const currentJobAssignedToMe = useMemo(() => {
    if (!job) return false;

    return (
      normalizedInstallerName !== "" &&
      (job.installer_name || "").trim().toLowerCase() === normalizedInstallerName
    );
  }, [job, normalizedInstallerName]);

  const availableJobsInGroup = useMemo(() => {
    return groupJobs.filter((item) => {
      return (
        (item.status || "").toLowerCase() === "available" &&
        (!item.installer_name || item.installer_name.trim() === "")
      );
    });
  }, [groupJobs]);

  const totalAvailableGroupPay = useMemo(() => {
    return availableJobsInGroup.reduce(
      (sum, item) => sum + Number(item.installer_pay || 0),
      0
    );
  }, [availableJobsInGroup]);

  const hoursUntilJob = useMemo(() => {
    return getHoursUntilJob(job?.scheduled_date);
  }, [job]);

  const isLateCancel = useMemo(() => {
    return hoursUntilJob !== null && hoursUntilJob < 48;
  }, [hoursUntilJob]);

  const payoutLines = useMemo(() => {
    return job ? getPayoutLines(job) : [];
  }, [job]);

  const addOnServices = useMemo(() => {
    return toArray(job?.add_on_services);
  }, [job]);

  const justServices = useMemo(() => {
    return toArray(job?.just_services);
  }, [job]);

  async function acceptThisJob() {
    if (!job) return;

    if (!installerName.trim()) {
      alert("Enter your installer name first.");
      return;
    }

    setActionLoading("accept-one");

    const supabase = createClient();

    const { error } = await supabase
      .from("bookings")
      .update({
        installer_name: installerName.trim(),
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (error) {
      console.error(error);
      alert("Failed to accept job.");
      setActionLoading("");
      return;
    }

    try {
      if (job.customer_email) {
        await sendCustomerEmail({
          to: job.customer_email,
          subject: "Your Installer Has Been Assigned",
          type: "assignment",
          html: assignmentEmailHtml(job, installerName.trim()),
        });
      }
    } catch (emailError) {
      console.error("Assignment email error:", emailError);
    }

    try {
      await sendAdminEmail({
        subject: `Installer Accepted Job - ${job.job_id || job.id}`,
        type: "installer_accepted",
        html: adminAcceptedEmailHtml(job, installerName.trim()),
      });
    } catch (emailError) {
      console.error("Admin accepted email error:", emailError);
    }

    setActionLoading("");
    alert("Job accepted ✅");
    await loadJobDetails();
  }

  async function acceptAllAvailableJobs() {
    if (!installerName.trim()) {
      alert("Enter your installer name first.");
      return;
    }

    if (availableJobsInGroup.length === 0) {
      alert("No available jobs left in this group.");
      return;
    }

    setActionLoading("accept-all");

    const supabase = createClient();
    const jobIds = availableJobsInGroup.map((item) => item.id);

    const { error } = await supabase
      .from("bookings")
      .update({
        installer_name: installerName.trim(),
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .in("id", jobIds);

    if (error) {
      console.error(error);
      alert("Failed to accept available jobs in this group.");
      setActionLoading("");
      return;
    }

    for (const item of availableJobsInGroup) {
      try {
        if (item.customer_email) {
          await sendCustomerEmail({
            to: item.customer_email,
            subject: "Your Installer Has Been Assigned",
            type: "assignment",
            html: assignmentEmailHtml(item, installerName.trim()),
          });
        }
      } catch (emailError) {
        console.error("Assignment email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Installer Accepted Job - ${item.job_id || item.id}`,
          type: "installer_accepted",
          html: adminAcceptedEmailHtml(item, installerName.trim()),
        });
      } catch (emailError) {
        console.error("Admin accepted email error:", emailError);
      }
    }

    setActionLoading("");
    alert("Available group jobs accepted ✅");
    await loadJobDetails();
  }

  async function completeJob() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can complete this job.");
      return;
    }

    if (!completionPhoto) {
      alert("Please upload a completion photo before completing the job.");
      return;
    }

    if (!hasSigningForm) {
      alert("Please select whether the customer provided a signing form.");
      return;
    }

    if (hasSigningForm === "yes" && !completionSignature) {
      alert("Please upload the signed completion form.");
      return;
    }

    setActionLoading("complete");

    try {
      const completedPhotoUpload = await uploadJobFile(
        completionPhoto,
        "completed-jobs",
        job.id
      );

      let signatureUpload:
        | {
            filePath: string;
            publicUrl: string;
          }
        | undefined;

      const signingFormProvided = hasSigningForm === "yes";

      if (signingFormProvided && completionSignature) {
        signatureUpload = await uploadJobFile(
          completionSignature,
          "completion-signatures",
          job.id
        );
      }

      const supabase = createClient();

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "completed_pending_admin_review",
          installer_pay_status: "pending_review",
          completion_photo_url: completedPhotoUpload.publicUrl,
          completion_photo_path: completedPhotoUpload.filePath,
          homeowner_signed_completion_required: signingFormProvided,
          homeowner_signed_completion_url: signatureUpload?.publicUrl || null,
          homeowner_signed_completion_path: signatureUpload?.filePath || null,
          completion_marked_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) {
        console.error("COMPLETE JOB DB ERROR:", error);
        alert(error.message || "Failed to complete job.");
        setActionLoading("");
        return;
      }

      try {
        if (job.customer_email) {
          await sendCustomerEmail({
            to: job.customer_email,
            subject: "Your Job Has Been Completed",
            type: "completion",
            html: completionEmailHtml(
              job,
              completedPhotoUpload.publicUrl,
              signatureUpload?.publicUrl
            ),
          });
        }
      } catch (emailError) {
        console.error("Completion email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Job Completed - ${job.job_id || job.id}`,
          type: "completion",
          html: adminCompletionEmailHtml(
            job,
            installerName.trim(),
            completedPhotoUpload.publicUrl,
            signingFormProvided,
            signatureUpload?.publicUrl
          ),
        });
      } catch (emailError) {
        console.error("Admin completion email error:", emailError);
      }

      setCompletionPhoto(null);
      setCompletionSignature(null);
      setHasSigningForm("");
      setShowCompleteBox(false);

      setActionLoading("");
      alert("Job marked complete ✅");
      await loadJobDetails();
    } catch (error: any) {
      console.error("COMPLETE JOB ERROR:", error);
      alert(error?.message || "Failed to complete job.");
      setActionLoading("");
    }
  }

  async function markIncomplete() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can mark this job incomplete.");
      return;
    }

    if (!incompleteReason.trim()) {
      alert("Please select an incomplete reason.");
      return;
    }

    if (!incompletePhoto) {
      alert("Please upload a photo before confirming incomplete.");
      return;
    }

    setActionLoading("incomplete");

    try {
      const incompletePhotoUpload = await uploadJobFile(
        incompletePhoto,
        "incomplete-jobs",
        job.id
      );

      const supabase = createClient();

      const normalizedReason = incompleteReason.trim().toLowerCase();
      const isCustomerOrShop =
        normalizedReason === "customer" || normalizedReason === "shop";

      const returnFeeCharged = isCustomerOrShop ? RETURN_FEE_CUSTOMER : 0;
      const returnFeeInstallerPay = isCustomerOrShop
        ? RETURN_FEE_INSTALLER_PAY
        : 0;

      const installerPayStatus =
        normalizedReason === "installer" ? "hold" : "pending";

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "incomplete",
          incomplete_reason: normalizedReason,
          incomplete_note: incompleteNote.trim(),
          incomplete_photo_url: incompletePhotoUpload.publicUrl,
          incomplete_photo_path: incompletePhotoUpload.filePath,
          incomplete_reported_at: new Date().toISOString(),
          return_fee: returnFeeCharged,
          return_fee_charged: returnFeeCharged,
          return_fee_installer_pay: returnFeeInstallerPay,
          installer_pay_status: installerPayStatus,
        })
        .eq("id", job.id);

      if (error) {
        console.error("MARK INCOMPLETE DB ERROR:", error);
        alert(error.message || "Failed to mark job incomplete.");
        setActionLoading("");
        return;
      }

      try {
        if (job.customer_email && isCustomerOrShop) {
          await sendCustomerEmail({
            to: job.customer_email,
            subject: "Your Job Requires Follow-Up",
            type: "incomplete",
            html: incompleteEmailHtml(
              job,
              normalizedReason,
              incompleteNote.trim(),
              returnFeeCharged,
              incompletePhotoUpload.publicUrl
            ),
          });
        }
      } catch (emailError) {
        console.error("Incomplete email error:", emailError);
      }

      try {
        await sendAdminEmail({
          subject: `Job Marked Incomplete - ${job.job_id || job.id}`,
          type: "incomplete",
          html: adminIncompleteEmailHtml(
            job,
            installerName.trim(),
            normalizedReason,
            incompleteNote.trim(),
            returnFeeCharged,
            installerPayStatus,
            incompletePhotoUpload.publicUrl
          ),
        });
      } catch (emailError) {
        console.error("Admin incomplete email error:", emailError);
      }

      setIncompletePhoto(null);
      setShowIncompleteBox(false);

      setActionLoading("");
      alert("Job marked incomplete ⚠️");
      await loadJobDetails();
    } catch (error: any) {
      console.error("INCOMPLETE JOB ERROR:", error);
      alert(error?.message || "Failed to mark job incomplete.");
      setActionLoading("");
    }
  }

  async function requestCancelJob() {
    if (!job) return;

    if (!currentJobAssignedToMe) {
      alert("Only the assigned installer can request cancellation.");
      return;
    }

    if (!cancelReason.trim()) {
      alert("Please enter a cancellation reason.");
      return;
    }

    setActionLoading("cancel-request");

    const supabase = createClient();

    const noticeText =
      hoursUntilJob === null
        ? "Notice hours unknown"
        : `${hoursUntilJob.toFixed(1)} hours notice`;

    const policyText =
      hoursUntilJob !== null && hoursUntilJob < 48
        ? "Late cancellation request - under 48 hours notice."
        : "Within cancellation policy - 48+ hours notice.";

    const cancelNote = `Installer cancel request: ${cancelReason.trim()} | ${noticeText} | ${policyText}`;

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "pending",
        installer_name: "",
        accepted_at: null,
        installer_pay_status: "unpaid",
        incomplete_reason: "installer_cancel_request",
        incomplete_note: cancelNote,
      })
      .eq("id", job.id);

    if (error) {
      console.error(error);
      alert("Failed to request cancellation.");
      setActionLoading("");
      return;
    }

    try {
      await sendAdminEmail({
        subject: `Installer Cancel Request - ${job.job_id || job.id}`,
        type: "incomplete",
        html: adminCancelRequestEmailHtml(
          job,
          installerName.trim(),
          cancelReason.trim(),
          hoursUntilJob
        ),
      });
    } catch (emailError) {
      console.error("Admin cancel request email error:", emailError);
    }

    setActionLoading("");
    setShowCancelBox(false);
    alert("Cancellation request sent to admin ✅");
    await loadJobDetails();
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-500">Job Details</h1>
            <p className="mt-2 text-gray-400">
              Review full job details, payout breakdown, and manage acceptance,
              incomplete status, cancellation request, or completion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-500 hover:text-yellow-400"
          >
            Back
          </button>
        </div>
      </div>

      {loading || !job ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-gray-300">
          Loading job details...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500">
              {job.company_name || job.customer_name || "Job"}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Job ID" value={job.job_id || job.id} />
              <Info label="Customer" value={job.customer_name} />
              <Info label="Phone" value={job.phone_number} />
              <Info
                label="Service Type"
                value={getServiceTypeLabel(
                  job.service_type_label || job.service_type
                )}
              />
              <Info label="Material Type" value={job.material_type} />
              <Info label="Material Size" value={job.material_size} />
              <Info
                label="Job Size"
                value={
                  job.job_size !== null && job.job_size !== undefined
                    ? `${job.job_size} sqft`
                    : job.sqft !== null && job.sqft !== undefined
                      ? `${job.sqft} sqft`
                      : "-"
                }
              />
              <Info label="Date" value={job.scheduled_date} />
              <Info label="Pickup Window" value={getPickupWindow(job)} />
              <Info label="Pick Up" value={job.pickup_address} />
              <Info label="Drop Off" value={job.dropoff_address} />
              <Info label="Status" value={job.status} />
              <Info
                label="Installer Payout"
                value={money(job.installer_pay)}
                highlight
              />
              <Info
                label="Installer Pay Status"
                value={job.installer_pay_status}
              />
              <Info
                label="Customer Rate"
                value={
                  Number(job.customer_sqft_rate || 0) > 0
                    ? `${money(job.customer_sqft_rate)}/sqft`
                    : "-"
                }
              />
              <Info label="Service Price" value={money(job.service_price)} />
              <Info
                label="Installer Subtotal"
                value={money(job.installer_subtotal_pay)}
              />
              <Info
                label="Installer HST"
                value={money(job.installer_hst_pay)}
              />
              <Info
                label="Mileage Fee"
                value={money(
                  job.installer_mileage_pay &&
                    Number(job.installer_mileage_pay) > 0
                    ? job.installer_mileage_pay
                    : job.mileage_fee
                )}
              />
              <Info
                label="Customer Return Fee"
                value={money(job.return_fee_charged || job.return_fee)}
              />
              <Info
                label="Installer Return Pay"
                value={money(job.return_fee_installer_pay)}
              />
              <Info label="Incomplete Reason" value={job.incomplete_reason} />
              <Info label="Incomplete Note" value={job.incomplete_note} />
              <Info
                label="Waterfall Quantity"
                value={
                  Number(job.waterfall_quantity || 0) > 0
                    ? String(job.waterfall_quantity)
                    : "-"
                }
              />
              <Info
                label="Outlet Plug Cutout Quantity"
                value={
                  Number(job.outlet_plug_cutout_quantity || 0) > 0
                    ? String(job.outlet_plug_cutout_quantity)
                    : "-"
                }
              />
              <Info
                label="Disposal Responsibility"
                value={getDisposalResponsibilityLabel(
                  job.disposal_responsibility
                )}
              />
              <Info
                label="Customer Provided Signing Form"
                value={
                  job.homeowner_signed_completion_required === true
                    ? "Yes"
                    : job.homeowner_signed_completion_required === false
                      ? "No"
                      : "-"
                }
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ServiceBox title="Add-On Services" items={addOnServices} />
              <ServiceBox title="Just Services" items={justServices} />
            </div>

            {job.side_note ? (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
                <h3 className="text-xl font-semibold text-yellow-400">
                  Side Note
                </h3>
                <p className="mt-3 text-sm text-gray-300">{job.side_note}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5">
              <h3 className="text-xl font-semibold text-yellow-400">
                Payout Breakdown
              </h3>

              {payoutLines.length > 0 ? (
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  {payoutLines.map((line) => (
                    <div
                      key={line.label}
                      className="flex items-center justify-between border-b border-zinc-800 pb-3"
                    >
                      <span>{line.label}</span>
                      <span>{money(line.amount)}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Subtotal Pay</span>
                    <span>{money(job.installer_subtotal_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>HST Pay</span>
                    <span>{money(job.installer_hst_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-700 pt-4 text-base font-semibold text-yellow-400">
                    <span>Total Payout</span>
                    <span>{money(job.installer_pay)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Subtotal Pay</span>
                    <span>{money(job.installer_subtotal_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>HST Pay</span>
                    <span>{money(job.installer_hst_pay)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span>Total Job Payout</span>
                    <span>{money(job.installer_pay)}</span>
                  </div>

                  {Number(job.mileage_fee || 0) > 0 ? (
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <span>Mileage Applies</span>
                      <span>{money(job.mileage_fee)}</span>
                    </div>
                  ) : null}

                  {Number(job.return_fee_charged || job.return_fee || 0) > 0 ? (
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <span>Customer Return Fee</span>
                      <span>{money(job.return_fee_charged || job.return_fee)}</span>
                    </div>
                  ) : null}

                  {Number(job.return_fee_installer_pay || 0) > 0 ? (
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <span>Installer Return Pay</span>
                      <span>{money(job.return_fee_installer_pay)}</span>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-gray-400">
                    Detailed line-item payout fields will display here
                    automatically when they are saved in the booking record.
                  </div>
                </div>
              )}
            </div>

            {hoursUntilJob !== null ? (
              <div
                className={`mt-6 rounded-xl border p-4 text-sm ${
                  isLateCancel
                    ? "border-red-500 bg-red-950 text-red-300"
                    : "border-zinc-700 bg-black text-gray-300"
                }`}
              >
                <p>
                  Time until scheduled job:{" "}
                  <strong>{hoursUntilJob.toFixed(1)} hours</strong>
                </p>
                <p className="mt-1">
                  Installer cancellation policy:{" "}
                  <strong>48 hours notice</strong>.
                </p>
                {isLateCancel ? (
                  <p className="mt-1">
                    This is a <strong>late cancellation request</strong>{" "}
                    because it is under 48 hours.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {currentJobAvailable ? (
                <button
                  type="button"
                  onClick={() => void acceptThisJob()}
                  disabled={actionLoading === "accept-one"}
                  className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
                >
                  {actionLoading === "accept-one"
                    ? "Accepting..."
                    : "Accept This Job"}
                </button>
              ) : null}

              {availableJobsInGroup.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void acceptAllAvailableJobs()}
                  disabled={actionLoading === "accept-all"}
                  className="rounded-xl border border-yellow-500 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-500 hover:text-black disabled:opacity-60"
                >
                  {actionLoading === "accept-all"
                    ? "Accepting..."
                    : `Accept All Available Jobs (${availableJobsInGroup.length})`}
                </button>
              ) : null}

              {currentJobAssignedToMe &&
              (job.status || "").toLowerCase() !== "completed" &&
              (job.status || "").toLowerCase() !==
                "completed_pending_admin_review" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCompleteBox((prev) => !prev)}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500"
                  >
                    {showCompleteBox ? "Close Complete" : "Complete Job"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowIncompleteBox((prev) => !prev)}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500"
                  >
                    {showIncompleteBox ? "Close Incomplete" : "Mark Incomplete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelBox((prev) => !prev)}
                    className="rounded-xl border border-red-500 px-5 py-3 font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    {showCancelBox
                      ? "Close Cancel Request"
                      : "Request Cancel Job"}
                  </button>
                </>
              ) : null}
            </div>

            {showCompleteBox ? (
              <div className="mt-6 rounded-2xl border border-green-500 bg-black p-5">
                <h3 className="text-xl font-semibold text-green-400">
                  Complete Job
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Completion Photo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCompletionPhoto(e.target.files?.[0] || null)
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Did customer provide a signing form?{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={hasSigningForm}
                      onChange={(e) => setHasSigningForm(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {hasSigningForm === "yes" ? (
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-gray-300">
                        Upload Signed Completion Form{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setCompletionSignature(e.target.files?.[0] || null)
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p>
                    Completion photo is <strong>required</strong>.
                  </p>
                  <p className="mt-1">
                    Signed completion upload is only required if the customer
                    provided a signing form.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void completeJob()}
                    disabled={actionLoading === "complete"}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-60"
                  >
                    {actionLoading === "complete"
                      ? "Completing..."
                      : "Confirm Complete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompleteBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-green-400 hover:text-green-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {showIncompleteBox ? (
              <div className="mt-6 rounded-2xl border border-red-500 bg-black p-5">
                <h3 className="text-xl font-semibold text-red-400">
                  Mark Job Incomplete
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={incompleteReason}
                      onChange={(e) => setIncompleteReason(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">Select reason</option>
                      <option value="customer">
                        Customer / Homeowner Issue
                      </option>
                      <option value="shop">Shop Issue</option>
                      <option value="installer">Installer Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-300">
                      Photo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setIncompletePhoto(e.target.files?.[0] || null)
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-4 file:py-2 file:font-semibold file:text-black"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-gray-300">
                      Notes
                    </label>
                    <textarea
                      value={incompleteNote}
                      onChange={(e) => setIncompleteNote(e.target.value)}
                      rows={4}
                      placeholder="Enter what happened..."
                      className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-gray-300">
                  <p>
                    If reason is <strong>customer</strong> or{" "}
                    <strong>shop</strong>, a
                    <strong> return fee will be applied</strong>.
                  </p>
                  <p className="mt-1">
                    If reason is <strong>installer</strong>, installer payout
                    will be <strong>held until completion</strong>.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void markIncomplete()}
                    disabled={actionLoading === "incomplete"}
                    className="rounded-xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                  >
                    {actionLoading === "incomplete"
                      ? "Saving..."
                      : "Confirm Incomplete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowIncompleteBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-red-400 hover:text-red-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {showCancelBox ? (
              <div className="mt-6 rounded-2xl border border-red-500 bg-black p-5">
                <h3 className="text-xl font-semibold text-red-400">
                  Request Job Cancellation
                </h3>

                <div className="mt-4">
                  <label className="mb-2 block text-sm text-gray-300">
                    Cancellation Reason
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    placeholder="Explain why you need to cancel this job..."
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none"
                  />
                </div>

                <div
                  className={`mt-4 rounded-xl border p-4 text-sm ${
                    isLateCancel
                      ? "border-red-500 bg-red-950 text-red-300"
                      : "border-zinc-800 bg-zinc-950 text-gray-300"
                  }`}
                >
                  <p>
                    Installer cancellation policy requires{" "}
                    <strong>48 hours notice</strong>.
                  </p>
                  <p className="mt-1">
                    Current notice:{" "}
                    <strong>
                      {hoursUntilJob === null
                        ? "-"
                        : `${hoursUntilJob.toFixed(1)} hours`}
                    </strong>
                  </p>
                  <p className="mt-1">
                    {isLateCancel
                      ? "This request is under 48 hours and will be treated as a late cancellation request."
                      : "This request is within policy and will be sent to admin for review."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void requestCancelJob()}
                    disabled={actionLoading === "cancel-request"}
                    className="rounded-xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                  >
                    {actionLoading === "cancel-request"
                      ? "Sending..."
                      : "Send Cancel Request"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelBox(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white hover:border-red-400 hover:text-red-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {groupJobs.length > 1 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-yellow-500">
                    Group Jobs
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Each job keeps its own details and its own installer payout.
                  </p>
                </div>

                <div className="text-sm font-semibold text-yellow-400">
                  Total Available Group Pay: {money(totalAvailableGroupPay)}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {groupJobs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-lg font-semibold text-yellow-400">
                      {item.job_number ? `Job ${item.job_number}` : "Grouped Job"}
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-gray-300">
                      <p>Job ID: {item.job_id || item.id}</p>
                      <p>Customer: {item.customer_name || "-"}</p>
                      <p>Company: {item.company_name || "-"}</p>
                      <p>
                        Service:{" "}
                        {getServiceTypeLabel(
                          item.service_type_label || item.service_type
                        )}
                      </p>
                      <p>Date: {item.scheduled_date || "-"}</p>
                      <p>Pickup Window: {getPickupWindow(item)}</p>
                      <p>Pick Up: {item.pickup_address || "-"}</p>
                      <p>Drop Off: {item.dropoff_address || "-"}</p>
                      <p>Status: {item.status || "-"}</p>
                      <p>Incomplete Reason: {item.incomplete_reason || "-"}</p>
                      <p className="font-semibold text-yellow-400">
                        Installer Payout: {money(item.installer_pay)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}