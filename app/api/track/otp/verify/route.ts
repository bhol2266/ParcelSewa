import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { cookieOptions, isConfigured, nepalMobile, sessionValue, SESSION_COOKIE, verifyOtp } from "@/lib/track-auth";

// Checks the code with NepalOTP and, if it matches, signs the customer in with a cookie for TRACK_SESSION_DAYS.
export async function POST(req: NextRequest) {
    if (!isConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

    const { mobile: raw, code } = await req.json().catch(() => ({ mobile: "", code: "" }));
    const mobile = nepalMobile(raw);
    if (!mobile || !/^\d{4,8}$/.test(String(code))) return NextResponse.json({ error: "wrong-code" }, { status: 400 });

    const ref = doc(db, "Track OTPs", mobile);
    const otp = (await getDoc(ref)).data();
    if (!otp?.otpId || Date.now() > otp.expiresAt) return NextResponse.json({ error: "expired" }, { status: 400 });

    const result = await verifyOtp(otp.otpId, String(code));
    if (result === "INVALID_OTP") return NextResponse.json({ error: "wrong-code" }, { status: 400 });
    if (result === "MAX_ATTEMPTS_EXCEEDED") return NextResponse.json({ error: "too-many" }, { status: 429 });
    if (result === "OTP_EXPIRED" || result === "OTP_NOT_FOUND") return NextResponse.json({ error: "expired" }, { status: 400 });
    if (result !== "ok") return NextResponse.json({ error: "verify-failed" }, { status: 502 });

    // NepalOTP invalidates a used code; forget it here too. The send limits (lastSentAt, sendsToday) stay.
    await updateDoc(ref, { otpId: "", expiresAt: 0 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionValue(mobile), cookieOptions);
    return res;
}
