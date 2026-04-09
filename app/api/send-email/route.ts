import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const ADMIN_PHONE = "647-795-4392";
const ADMIN_EMAIL = "ultrapropm@gmail.com";
const DEFAULT_FROM = "1800TOPS <info@mail.1800tops.com>";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

type EmailType =
  | "assignment"
  | "completion"
  | "incomplete"
  | "resume_request"
  | "installer_accepted"
  | "new_job_available"
  | "standard";

type SendEmailBody = {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  type?: string;
  sendAdminCopy?: boolean;
  sendApprovedInstallers?: boolean;
  jobReadyUrl?: string;
  jobId?: string;
  replyTo?: string | string[];
};

type InstallerProfileRow = {
  email?: string | null;
  approval_status?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

function normalizeEmailList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function dedupeEmails(emails: string[]) {
  return Array.from(new Set(emails));
}

function sanitizeEmailList(value: unknown) {
  return dedupeEmails(normalizeEmailList(value).filter(isValidEmail));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeType(value: unknown): EmailType {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (type === "assignment") return "assignment";
  if (type === "completion") return "completion";
  if (type === "incomplete") return "incomplete";
  if (type === "resume_request") return "resume_request";
  if (type === "installer_accepted") return "installer_accepted";
  if (type === "new_job_available") return "new_job_available";
  return "standard";
}

function buildPolicyBlock() {
  return `
    <hr style="margin:20px 0;" />
    <p style="font-weight:bold;">Important Job Policies:</p>
    <ul>
      <li>Installer waiting time may be subject to additional charges.</li>
      <li>Please ensure all countertop pieces are counted and organized before pickup.</li>
      <li>If any paperwork requires homeowner signature, provide it to the installer at pickup.</li>
    </ul>
    <p style="margin-top:10px;">
      For any questions, contact admin at <strong>${ADMIN_PHONE}</strong>.
    </p>
  `;
}

function buildActionButton(url: string, label: string) {
  return `
    <div style="margin: 24px 0;">
      <a
        href="${escapeHtml(url)}"
        style="
          display:inline-block;
          background:#eab308;
          color:#000;
          text-decoration:none;
          padding:14px 22px;
          border-radius:10px;
          font-weight:bold;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function buildShell(title: string, intro: string, contentHtml: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(intro)}</p>
      ${contentHtml}
    </div>
  `;
}

function buildAssignmentEmail(html: string) {
  return buildShell(
    "Installer Assigned",
    "Your job has been assigned to our installer team.",
    `
      ${html}
      ${buildPolicyBlock()}
    `
  );
}

function buildCompletionEmail(html: string) {
  return buildShell(
    "Job Completed",
    "Your job has been marked as completed.",
    `
      ${html}
      <p>If you have any concerns, please contact admin.</p>
      ${buildPolicyBlock()}
    `
  );
}

function buildIncompleteEmail(
  html: string,
  options?: { jobReadyUrl?: string }
) {
  const buttonHtml =
    options?.jobReadyUrl && options.jobReadyUrl.trim()
      ? buildActionButton(options.jobReadyUrl, "Click Here When Job Is Ready")
      : "";

  return buildShell(
    "Job Incomplete Notice",
    "Your job could not be completed at this time.",
    `
      ${html}
      <p>
        Please resolve the issue and contact us when this job is ready.
        <strong> Do not create a new booking.</strong> We will continue your existing job.
      </p>
      <p>
        When the job is ready, please click the button below so our team can review
        your request and arrange the next step.
      </p>
      ${buttonHtml}
      <p>
        Once submitted, admin will review the request, check the original installer first,
        and schedule the return visit.
      </p>
      ${buildPolicyBlock()}
    `
  );
}

function buildResumeRequestEmail(html: string) {
  return buildShell(
    "Job Ready Request Received",
    "We received a request to continue an incomplete job.",
    `
      ${html}
      <p>
        Our admin team will review the requested date and pickup window, then check installer availability.
      </p>
      ${buildPolicyBlock()}
    `
  );
}

function buildInstallerAcceptedEmail(html: string) {
  return buildShell(
    "Installer Accepted Job",
    "An installer has accepted this job.",
    `
      ${html}
      ${buildPolicyBlock()}
    `
  );
}

function buildNewJobAvailableEmail(html: string) {
  return buildShell(
    "New Available Job",
    "A new job is now available in the installer portal.",
    `
      ${html}
      <p>Please log in to the installer portal to review and accept this job if it fits your route.</p>
      ${buildPolicyBlock()}
    `
  );
}

function buildAdminEmail(html: string, heading = "New Booking Received") {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>${escapeHtml(heading)}</h2>
      ${html}
      ${buildPolicyBlock()}
    </div>
  `;
}

function getAdminHeadingByType(type: EmailType) {
  if (type === "assignment") return "Installer Assigned";
  if (type === "completion") return "Job Completed";
  if (type === "incomplete") return "Job Marked Incomplete";
  if (type === "resume_request") return "Resume Job Request Received";
  if (type === "installer_accepted") return "Installer Accepted Job";
  if (type === "new_job_available") return "New Available Job";
  return "New Booking Received";
}

function wrapHtmlByType(
  type: EmailType,
  html: string,
  options?: { jobReadyUrl?: string }
) {
  if (type === "assignment") return buildAssignmentEmail(html);
  if (type === "completion") return buildCompletionEmail(html);
  if (type === "incomplete") return buildIncompleteEmail(html, options);
  if (type === "resume_request") return buildResumeRequestEmail(html);
  if (type === "installer_accepted") return buildInstallerAcceptedEmail(html);
  if (type === "new_job_available") return buildNewJobAvailableEmail(html);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      ${html}
      ${buildPolicyBlock()}
    </div>
  `;
}

function buildJobReadyUrl(
  appUrl: string,
  providedJobReadyUrl?: string,
  jobId?: string
) {
  const directUrl = String(providedJobReadyUrl || "").trim();
  if (directUrl) return directUrl;

  const cleanJobId = String(jobId || "").trim();
  if (!cleanJobId) return "";

  return `${appUrl}/job-ready?jobId=${encodeURIComponent(cleanJobId)}`;
}

function emailAlreadyIncluded(
  target: string,
  lists: { to: string[]; cc: string[]; bcc: string[] }
) {
  const value = target.trim().toLowerCase();
  return (
    lists.to.includes(value) ||
    lists.cc.includes(value) ||
    lists.bcc.includes(value)
  );
}

async function getApprovedInstallerEmails() {
  if (!supabaseAdmin) {
    console.error(
      "SUPABASE ADMIN CLIENT NOT CONFIGURED. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("installer_profiles")
    .select("email, approval_status, status, is_active")
    .not("email", "is", null);

  if (error) {
    console.error("LOAD APPROVED INSTALLERS ERROR:", error);
    return [];
  }

  const approvedEmails = ((data || []) as InstallerProfileRow[])
    .filter((installer) => {
      const approval = String(
        installer.approval_status || installer.status || ""
      )
        .trim()
        .toLowerCase();

      const isApproved =
        !approval || approval === "approved" || approval === "active";

      const isActive = installer.is_active !== false;
      const email = String(installer.email || "").trim().toLowerCase();

      return Boolean(email) && isApproved && isActive && isValidEmail(email);
    })
    .map((installer) => String(installer.email || "").trim().toLowerCase());

  return dedupeEmails(approvedEmails);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailBody;

    let to = sanitizeEmailList(body?.to);
    let cc = sanitizeEmailList(body?.cc);
    let bcc = sanitizeEmailList(body?.bcc);
    const replyTo = sanitizeEmailList(body?.replyTo);

    const subject = String(body?.subject || "").trim();
    const rawHtml = String(body?.html || "").trim();
    const rawText = String(body?.text || "").trim();
    const type = normalizeType(body?.type);
    const sendAdminCopy = Boolean(body?.sendAdminCopy);
    const sendApprovedInstallers = Boolean(body?.sendApprovedInstallers);

    const appUrl =
      String(process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
      "http://1800tops.com";

    const jobReadyUrl = buildJobReadyUrl(appUrl, body?.jobReadyUrl, body?.jobId);

    if (sendApprovedInstallers) {
      const installerEmails = await getApprovedInstallerEmails();

      const filteredInstallerEmails = installerEmails.filter(
        (email) =>
          !emailAlreadyIncluded(email, {
            to,
            cc,
            bcc,
          })
      );

      if (filteredInstallerEmails.length) {
        bcc = dedupeEmails([...bcc, ...filteredInstallerEmails]);
      }

      if (!to.length) {
        to = [ADMIN_EMAIL.toLowerCase()];
      }
    }

    if (!to.length) {
      return NextResponse.json(
        { error: "Missing valid recipient email in 'to'" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Missing required field: subject" },
        { status: 400 }
      );
    }

    if (!rawHtml) {
      return NextResponse.json(
        { error: "Missing required field: html" },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY in environment" },
        { status: 500 }
      );
    }

    const finalHtml = wrapHtmlByType(type, rawHtml, { jobReadyUrl });
    const finalText = rawText || stripHtml(finalHtml);

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html: finalHtml,
      text: finalText,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      ...(replyTo.length ? { replyTo } : {}),
    });

    if (error) {
      console.error("RESEND SEND ERROR:", error);
      return NextResponse.json(
        {
          error: error.message || "Failed to send email",
          details: error,
        },
        { status: 500 }
      );
    }

    let adminData = null;

    if (
      sendAdminCopy &&
      !emailAlreadyIncluded(ADMIN_EMAIL, { to, cc, bcc })
    ) {
      const adminHeading = getAdminHeadingByType(type);

      const adminResult = await resend.emails.send({
        from: DEFAULT_FROM,
        to: [ADMIN_EMAIL],
        subject: `Admin Copy - ${subject}`,
        html: buildAdminEmail(rawHtml, adminHeading),
        text: stripHtml(buildAdminEmail(rawHtml, adminHeading)),
      });

      if (adminResult.error) {
        console.error("ADMIN EMAIL ERROR:", adminResult.error);
      } else {
        adminData = adminResult.data;
      }
    }

    return NextResponse.json({
      success: true,
      data,
      adminData,
      installerNotificationCount: sendApprovedInstallers ? bcc.length : 0,
    });
  } catch (error: unknown) {
    console.error("EMAIL ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to send email";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}