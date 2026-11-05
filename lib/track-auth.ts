// Server-only: OTP login for /trackOrder. Codes go out by SMS through Sparrow SMS; a signed cookie keeps the
// customer signed in for TRACK_SESSION_DAYS. Firebase phone auth can't send SMS to Nepal numbers (error -39).
import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { TRACK_SESSION_DAYS } from "./track-session";

// ── Fill these in ────────────────────────────────────────────────────────────
// Sparrow SMS dashboard → API: the token, and the approved sender identity ("from").
export const SPARROW_TOKEN = "";
export const SPARROW_FROM = "";
// Any long random string (e.g. 64 characters). It signs login cookies; changing it signs everyone out.
const SESSION_SECRET = "";
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "ps_track";
export const SESSION_MAX_AGE = TRACK_SESSION_DAYS * 86_400;

export const OTP_TTL_MS = 5 * 60_000;
export const RESEND_MS = 60_000;
export const MAX_SENDS_PER_DAY = 5;
export const MAX_ATTEMPTS = 5;

export const isConfigured = () => !!(SPARROW_TOKEN && SPARROW_FROM && SESSION_SECRET);

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");

// "98XXXXXXXX" from anything the customer typed; null unless it's a valid Nepal mobile number.
export function nepalMobile(value: unknown): string | null {
    const digits = String(value ?? "").replace(/\D/g, "").slice(-10);
    return /^9\d{9}$/.test(digits) ? digits : null;
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// The OTP store is readable like the rest of Firestore, so only a keyed hash of the code is saved.
export const hashCode = (mobile: string, code: string) =>
    createHash("sha256").update(`${SESSION_SECRET}:${mobile}:${code}`).digest("hex");

export function sameHash(a: string, b: string) {
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
    if (!body || !sig || !sameHash(sign(body), sig)) return null;
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

// Sparrow SMS v2: POST form fields token, from, to (10 digits), text. A 200 response_code means it was accepted.
export async function sendSms(mobile: string, text: string): Promise<boolean> {
    const res = await fetch("https://api.sparrowsms.com/v2/sms/", {
        method: "POST",
        body: new URLSearchParams({ token: SPARROW_TOKEN, from: SPARROW_FROM, to: mobile, text }),
        signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || Number(data.response_code) !== 200) {
        console.error("Sparrow SMS failed", res.status, data);
        return false;
    }
    return true;
}
