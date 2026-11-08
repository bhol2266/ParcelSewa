import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { orderedMillis } from "@/lib/late-orders";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { cookieOptions, nepalMobile, sessionValue, SESSION_COOKIE } from "@/lib/track-auth";

// The other way to sign in on /trackOrder (no SMS): the customer types the advance or remaining payment of any of
// their last 3 orders, give or take Rs. 30.
const LAST_ORDERS = 3;
const TOLERANCE = 30;
// Tiny amounts (and Rs. 0) are too easy to guess, so they never count.
const MIN_AMOUNT = 100;
// Wrong amounts allowed per number per day; with ±30, guessing must stay impractical.
const MAX_TRIES_PER_DAY = 5;

export async function POST(req: NextRequest) {
    const { mobile: raw, amount: rawAmount } = await req.json().catch(() => ({ mobile: "", amount: "" }));
    const mobile = nepalMobile(raw);
    if (!mobile) return NextResponse.json({ error: "invalid-number" }, { status: 400 });

    // The team (admin cookie) opens any customer's tracking with just the number.
    if (req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD) {
        const any = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", `+977${mobile}`)));
        if (any.empty) return NextResponse.json({ error: "no-orders" }, { status: 404 });
        const res = NextResponse.json({ ok: true });
        res.cookies.set(SESSION_COOKIE, sessionValue(mobile), cookieOptions);
        return res;
    }

    const amount = Number(String(rawAmount ?? "").replace(/[,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "invalid-amount" }, { status: 400 });

    const snap = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", `+977${mobile}`)));
    if (snap.empty) return NextResponse.json({ error: "no-orders" }, { status: 404 });

    // Wrong tries share the number's doc with the OTP limits.
    const ref = doc(db, "Track OTPs", mobile);
    const prev = (await getDoc(ref)).data();
    const today = new Date().toISOString().slice(0, 10);
    const tries = prev?.payDay === today ? prev.payTries ?? 0 : 0;
    if (tries >= MAX_TRIES_PER_DAY) return NextResponse.json({ error: "pay-limit" }, { status: 429 });

    const payments = snap.docs
        .map((d) => d.data())
        .sort((a, b) => orderedMillis(b) - orderedMillis(a))
        .slice(0, LAST_ORDERS)
        .flatMap((o) => {
            const advance = Number(o.advancePayment) || 0;
            return [advance, (Number(o.totalAmount) || 0) - advance];
        })
        .filter((p) => p >= MIN_AMOUNT);

    if (!payments.some((p) => Math.abs(p - amount) <= TOLERANCE)) {
        await setDoc(ref, { payDay: today, payTries: tries + 1 }, { merge: true });
        const left = MAX_TRIES_PER_DAY - tries - 1;
        return NextResponse.json({ error: left > 0 ? "wrong-amount" : "pay-limit", triesLeft: left }, { status: left > 0 ? 400 : 429 });
    }

    if (tries) await setDoc(ref, { payTries: 0 }, { merge: true });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionValue(mobile), cookieOptions);
    return res;
}
