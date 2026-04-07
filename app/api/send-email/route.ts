import { NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_PHONE = "647-795-4392";
const ADMIN_EMAIL = "ultrapropm@gmail.com";
const DEFAULT_FROM = "1800TOPS <info@mail.1800tops.com>";

type EmailType =
  | "assignment"
  | "completion"
  | "incomplete"
  | "resume_request"
  | "installer_accepted"
  | "standard";

type SendEmailBody = {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  html?: string;
  type?: string;
  sendAdminCopy?: boolean;
  jobReadyUrl?: string;
  jobId?: string;
  replyTo?: string | string[];
};

function normalizeEmailList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
        href="${url}"
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
      <h2>${title}</h2>
      <p>${intro}</p>
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

function buildAdminEmail(html: string, heading = "New Booking Received") {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>${heading}</h2>
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

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      ${html}
      ${buildPolicyBlock()}
    </div>
  `;
}

function buildJobReadyUrl(appUrl: string, providedJobReadyUrl?: string, jobId?: string) {
  const directUrl = String(providedJobReadyUrl || "").trim();
  if (directUrl) return directUrl;

  const cleanJobId = String(jobId || "").trim();
  if (!cleanJobId) return "";

  return `${appUrl}/job-ready?jobId=${encodeURIComponent(cleanJobId)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailBody;

    const to = normalizeEmailList(body?.to);
    const cc = normalizeEmailList(body?.cc);
    const bcc = normalizeEmailList(body?.bcc);
    const replyTo = normalizeEmailList(body?.replyTo);

    const subject = String(body?.subject || "").trim();
    const rawHtml = String(body?.html || "").trim();
    const type = normalizeType(body?.type);
    const sendAdminCopy = Boolean(body?.sendAdminCopy);

    const appUrl =
      String(process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
      "http://localhost:3000";

    const jobReadyUrl = buildJobReadyUrl(appUrl, body?.jobReadyUrl, body?.jobId);

    if (!to.length) {
      return NextResponse.json(
        { error: "Missing required field: to" },
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
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      replyTo: replyTo.length ? replyTo : undefined,
      subject,
      html: finalHtml,
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

    if (sendAdminCopy) {
      const adminHeading = getAdminHeadingByType(type);

      const adminResult = await resend.emails.send({
        from: DEFAULT_FROM,
        to: [ADMIN_EMAIL],
        subject: `Admin Copy - ${subject}`,
        html: buildAdminEmail(rawHtml, adminHeading),
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
    });
  } catch (error: unknown) {
    console.error("EMAIL ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Failed to send email";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}