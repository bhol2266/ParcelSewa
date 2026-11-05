import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { cookieOptions, hashCode, isConfigured, MAX_ATTEMPTS, nepalMobile, sameHash, sessionValue, SESSION_COOKIE } from "@/lib/track-auth";

// Checks the code and, if it matches, signs the customer in with a cookie that lasts TRACK_SESSION_DAYS.
export async function POST(req: NextRequest) {
    if (!isConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

    const { mobile: raw, code } = await req.json().catch(() => ({ mobile: "", code: "" }));
    const mobile = nepalMobile(raw);
    if (!mobile || !/^\d{6}$/.test(String(code))) return NextResponse.json({ error: "wrong-code" }, { status: 400 });

    const ref = doc(db, "Track OTPs", mobile);
    const otp = (await getDoc(ref)).data();
    if (!otp?.hash || Date.now() > otp.expiresAt) return NextResponse.json({ error: "expired" }, { status: 400 });
    if ((otp.attempts ?? 0) >= MAX_ATTEMPTS) return NextResponse.json({ error: "too-many" }, { status: 429 });

    if (!sameHash(hashCode(mobile, String(code)), otp.hash)) {
        await updateDoc(ref, { attempts: increment(1) });
        return NextResponse.json({ error: "wrong-code" }, { status: 400 });
    }

    // Used codes can't be reused; the send limits (lastSentAt, sendsToday) stay in place.
    await updateDoc(ref, { hash: "", expiresAt: 0 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionValue(mobile), cookieOptions);
    return res;
}
