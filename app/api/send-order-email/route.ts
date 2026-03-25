// app/api/send-order-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SMTP_USER = "ukdevelopers007@gmail.com";
const SMTP_PASS = "hjwv mhve mcjl fsjb";
const RECIPIENT_EMAIL = "ukdevelopers007@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productUrl, quantity, mobile, deliveryLocation, notes } = body;

    // Basic validation
    if (!productUrl || !deliveryLocation || !mobile || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const submittedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Strip non-numeric characters for the WhatsApp link (keep + for country code)
    const whatsappNumber = mobile.replace(/[\s\-\(\)]/g, "");
    const whatsappUrl = `https://wa.me/${whatsappNumber.startsWith("+") ? whatsappNumber.slice(1) : whatsappNumber}`;

    const mailOptions = {
      from: `"Order Request System" <${SMTP_USER}>`,
      to: RECIPIENT_EMAIL,
      subject: `📦 New Order Request — ${new Date().toLocaleDateString("en-IN")}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>New Order Request</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:#002f5c;padding:28px 32px;">
                      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                        📦 New Order Request
                      </h1>
                      <p style="margin:6px 0 0;color:#a8c4e0;font-size:13px;">
                        Submitted on ${submittedAt}
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:28px 32px;">
                      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                        A new order request has been submitted. Review the details below and send a quotation to the customer.
                      </p>

                      <!-- Details Table -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                        
                        <tr>
                          <td style="padding:12px 16px;background:#f8fafc;border-radius:8px 8px 0 0;border-bottom:1px solid #e5e7eb;width:36%;">
                            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Product URL</span>
                          </td>
                          <td style="padding:12px 16px;background:#f8fafc;border-radius:0 8px 0 0;border-bottom:1px solid #e5e7eb;">
                            <a href="${productUrl}" style="color:#002f5c;font-size:13px;word-break:break-all;text-decoration:underline;">
                              ${productUrl}
                            </a>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Quantity</span>
                          </td>
                          <td style="padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:14px;font-weight:600;color:#111827;">${quantity}</span>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Mobile (WhatsApp)</span>
                          </td>
                          <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:14px;color:#111827;">${mobile}</span>
                            &nbsp;
                            <a href="${whatsappUrl}"
                               target="_blank"
                               style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:4px 10px;background:#25d366;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;border-radius:4px;vertical-align:middle;">
                              💬 Open WhatsApp
                            </a>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Delivery Location</span>
                          </td>
                          <td style="padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;">
                            <span style="font-size:14px;color:#111827;">${deliveryLocation}</span>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 16px;background:#f8fafc;border-radius:0 0 0 8px;">
                            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Notes</span>
                          </td>
                          <td style="padding:12px 16px;background:#f8fafc;border-radius:0 0 8px 0;">
                            <span style="font-size:13px;color:#4b5563;font-style:${notes ? "normal" : "italic"};">
                              ${notes || "None provided"}
                            </span>
                          </td>
                        </tr>

                      </table>

                      <!-- CTA -->
                      <div style="margin-top:28px;padding:16px;background:#fff8f0;border-left:4px solid #f48b28;border-radius:4px;">
                        <p style="margin:0;font-size:13px;color:#7c4a00;line-height:1.6;">
                          <strong>Action required:</strong> Review this request and send a quotation in NPR to the customer's WhatsApp number above within a few hours.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
                      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                        This email was generated automatically when a customer submitted an order request.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Email sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 }
    );
  }
}