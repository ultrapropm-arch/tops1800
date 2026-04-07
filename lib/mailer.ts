import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.zohocloud.ca",
  port: 465,
  secure: true,
  auth: {
    user: "info@1800tops.com",
    pass: process.env.EMAIL_PASS || "",
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: `"1800TOPS" <info@1800tops.com>`,
    to,
    subject,
    html,
  });
}