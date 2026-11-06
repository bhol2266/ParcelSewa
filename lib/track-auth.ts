// Server-only: OTP login for /trackOrder. NepalOTP generates, texts and checks the codes; a signed cookie keeps the
// customer signed in for TRACK_SESSION_DAYS. Firebase phone auth can't send SMS to Nepal numbers (error -39).
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { TRACK_SESSION_DAYS } from "./track-session";

// NepalOTP dashboard → Apps → API key (npot_live_… sends real SMS; npot_test_… always uses code 123456).
const NEPALOTP_API_KEY = "npot_live_Ef0ChER3oAnwX01vdYqw3SqdkFeeTh0DvL4MHHFd";
// Signs login cookies; changing it signs every customer out.
const SESSION_SECRET = "4SPBPXFFsMaHLQ6iRaUHXdkd_PanGx5O4XrIIWDDb2MHU-9w";

const NEPALOTP_URL = "https://nepalotp.com/api/v1";

export const SESSION_COOKIE = "ps_track";
export const SESSION_MAX_AGE = TRACK_SESSION_DAYS * 86_400;

// NepalOTP codes expire after 5 minutes and allow 3 tries; these limits keep SMS spend down on our side too.
export const OTP_TTL_MS = 5 * 60_000;
export const RESEND_MS = 60_000;
export const MAX_SENDS_PER_DAY = 5;

export const isConfigured = () => !!(NEPALOTP_API_KEY && SESSION_SECRET);

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");

/** Signs other server-made links (e.g. /cart) with CART_LINK_SECRET when set, otherwise this login's secret. */
export const signLink = (data: string) => createHmac("sha256", process.env.CART_LINK_SECRET || SESSION_SECRET).update(`link:${data}`).digest("base64url");

// "98XXXXXXXX" from anything the customer typed; null unless it's a valid Nepal mobile number.
export function nepalMobile(value: unknown): string | null {
    const digits = String(value ?? "").replace(/\D/g, "").slice(-10);
    return /^9\d{9}$/.test(digits) ? digits : null;
}

function sameText(a: string, b: string) {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

// Cookie value: base64url({ m: mobile, t: signed-in-at ms }).signature
export function sessionValue(mobile: string, signedInAt = Date.now()) {
    const body = b64url(JSON.stringify({ m: mobile, t: signedInAt }));
    return `${body}.${sign(body)}`;
}

export type Session = { mobile: string; signedInAt: number } | "expired" | null;

export function readSession(req: NextRequest): Session {
    const raw = req.cookies.get(SESSION_COOKIE)?.value;
    if (!raw || !SESSION_SECRET) return null;
    const [body, sig] = raw.split(".");
    if (!body || !sig || !sameText(sign(body), sig)) return null;
    try {
        const { m, t } = JSON.parse(Buffer.from(body, "base64url").toString());
        const mobile = nepalMobile(m);
        if (!mobile || typeof t !== "number") return null;
        if (Date.now() - t > SESSION_MAX_AGE * 1000) return "expired";
        return { mobile, signedInAt: t };
    } catch {
        return null;
    }
}

export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
};

// NepalOTP replies { success, code?, message, otp_id?, data }; errors keep code/message/data at the top level.
type NepalOtpReply = { success?: boolean; code?: string; message?: string; otp_id?: string; data?: Record<string, unknown> };

async function nepalOtp(path: string, body: Record<string, string>): Promise<NepalOtpReply & { status: number }> {
    const res = await fetch(`${NEPALOTP_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": NEPALOTP_API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as NepalOtpReply;
    return { ...data, status: res.status };
}

// Texts "Your OTP is: 123456…" to the number. Returns the otp_id to verify against, or NepalOTP's error code.
export async function sendOtp(mobile: string): Promise<{ otpId: string } | { error: string; retryAfter?: number }> {
    const reply = await nepalOtp("/otp/send", { phone: `+977${mobile}`, reference: "trackOrder" });
    if (reply.success && reply.otp_id) return { otpId: reply.otp_id };
    console.error("NepalOTP send failed", reply.status, reply.code, reply.message);
    const retryAfter = Number(reply.data?.retry_after) || undefined;
    return { error: reply.code ?? `HTTP_${reply.status}`, retryAfter };
}

// "ok", or NepalOTP's error code: INVALID_OTP, OTP_EXPIRED, MAX_ATTEMPTS_EXCEEDED, OTP_NOT_FOUND, …
export async function verifyOtp(otpId: string, code: string): Promise<"ok" | string> {
    const reply = await nepalOtp("/otp/verify", { otp_id: otpId, otp: code });
    if (reply.success) return "ok";
    if (reply.code !== "INVALID_OTP") console.error("NepalOTP verify failed", reply.status, reply.code, reply.message);
    return reply.code ?? `HTTP_${reply.status}`;
}
