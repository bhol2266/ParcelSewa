import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { isConfigured, MAX_SENDS_PER_DAY, nepalMobile, OTP_TTL_MS, RESEND_MS, sendOtp } from "@/lib/track-auth";

// Texts a code (through NepalOTP) to a number that has orders. Each SMS costs credit, so numbers without orders get
// none, and a number can be sent one code a minute and five a day.
export async function POST(req: NextRequest) {
    if (!isConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

    const { mobile: raw } = await req.json().catch(() => ({ mobile: "" }));
    const mobile = nepalMobile(raw);
    if (!mobile) return NextResponse.json({ error: "invalid-number" }, { status: 400 });

    const orders = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", `+977${mobile}`), limit(1)));
    if (orders.empty) return NextResponse.json({ error: "no-orders" }, { status: 404 });

    const ref = doc(db, "Track OTPs", mobile);
    const prev = (await getDoc(ref)).data();
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    if (prev?.lastSentAt && now - prev.lastSentAt < RESEND_MS) {
        return NextResponse.json({ error: "wait", retryIn: Math.ceil((RESEND_MS - (now - prev.lastSentAt)) / 1000) }, { status: 429 });
    }
    const sendsToday = prev?.day === today ? prev.sendsToday ?? 0 : 0;
    if (sendsToday >= MAX_SENDS_PER_DAY) return NextResponse.json({ error: "daily-limit" }, { status: 429 });

    const sent = await sendOtp(mobile);
    if ("error" in sent) {
        if (sent.error === "RATE_LIMIT_EXCEEDED") {
            return NextResponse.json({ error: "wait", retryIn: Math.min(sent.retryAfter ?? 60, 3600) }, { status: 429 });
        }
        if (sent.error === "VALIDATION_ERROR") return NextResponse.json({ error: "invalid-number" }, { status: 400 });
        return NextResponse.json({ error: "sms-failed" }, { status: 502 });
    }
    await setDoc(ref, { otpId: sent.otpId, expiresAt: now + OTP_TTL_MS, lastSentAt: now, day: today, sendsToday: sendsToday + 1 });
    return NextResponse.json({ sent: true });
}
