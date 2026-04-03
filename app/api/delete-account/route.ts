// app/api/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SMTP_USER = "ukdevelopers007@gmail.com";
const SMTP_PASS = "hjwv mhve mcjl fsjb";
const ADMIN_EMAIL = "admin@uktechdeveloper.co.uk";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { name, email, reason } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const submittedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

    // ── Email to admin ────────────────────────────────────────────────────────
    await transporter.sendMail({
      from: `"HuggAI – Account Deletion" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `⚠️ Account Deletion Request – ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #e11d48; padding: 20px 24px;">
            <h2 style="color: white; margin: 0; font-size: 18px;">⚠️ New Account Deletion Request</h2>
            <p style="color: #fecdd3; margin: 4px 0 0; font-size: 13px;">HuggAI – AI Video Maker · UK Developers</p>
          </div>
          <div style="padding: 24px; background: #fff;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 130px; font-weight: 600;">Full Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 700;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600;">Reason</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${reason?.trim() || "<em style='color:#9ca3af'>Not provided</em>"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">Submitted At</td>
                <td style="padding: 10px 0; color: #111827;">${submittedAt} (UK)</td>
              </tr>
            </table>
            <div style="margin-top: 20px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 16px;">
              <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
                Action required: Process this deletion request within <strong>30 days</strong> per UK GDPR requirements.
              </p>
            </div>
          </div>
          <div style="padding: 14px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification from HuggAI · UK Developers</p>
          </div>
        </div>
      `,
    });

    // ── Confirmation email to user ────────────────────────────────────────────
    await transporter.sendMail({
      from: `"UK Developers – HuggAI" <${SMTP_USER}>`,
      to: email,
      subject: "Your HuggAI account deletion request has been received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #111827; padding: 20px 24px;">
            <h2 style="color: white; margin: 0; font-size: 18px;">HuggAI – AI Video Maker</h2>
            <p style="color: #9ca3af; margin: 4px 0 0; font-size: 13px;">by UK Developers</p>
          </div>
          <div style="padding: 28px 24px; background: #fff;">
            <p style="font-size: 15px; color: #111827; font-weight: 700; margin-top: 0;">Hi ${name},</p>
            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              We have received your request to permanently delete your <strong>HuggAI</strong> account associated with <strong>${email}</strong>.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">✓ What happens next:</p>
              <ul style="margin: 10px 0 0; padding-left: 18px; font-size: 13px; color: #166534; line-height: 1.8;">
                <li>We will verify your identity using this email address.</li>
                <li>Your account, videos, images and prompts will be deleted within <strong>30 days</strong>.</li>
                <li>Billing records may be kept for up to 30 additional days as required by law.</li>
                <li>You will receive a confirmation email once deletion is complete.</li>
              </ul>
            </div>
            <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
              If you did not make this request or have changed your mind, please contact us immediately at
              <a href="mailto:enquiry@uktechdeveloper.co.uk" style="color: #e11d48;">enquiry@uktechdeveloper.co.uk</a>
            </p>
          </div>
          <div style="padding: 14px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">© 2025 UK Developers · HuggAI – AI Video & Image Maker</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account email error:", err);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }
}