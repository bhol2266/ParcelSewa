import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { TRACK_SESSION_DAYS } from "@/lib/track-session";

// Checking a Firebase ID token only needs the project ID (Google's public keys do the rest), so no service account.
const APP_NAME = "track-auth";
const adminApp = getApps().find((app) => app.name === APP_NAME)
    ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }, APP_NAME);

// Firestore Timestamps don't survive JSON, so send them as { __date: ms } and let the page turn them back into Dates.
function serialize(value: unknown): unknown {
    if (value instanceof Timestamp) return { __date: value.toMillis() };
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
    }
    return value;
}

export async function GET(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "signed-out" }, { status: 401 });

    let phone: string | undefined;
    let signedInAt: number;
    try {
        const decoded = await getAuth(adminApp).verifyIdToken(token);
        phone = decoded.phone_number;
        // auth_time is when the customer last entered an OTP, not when this token was refreshed.
        signedInAt = decoded.auth_time * 1000;
    } catch {
        return NextResponse.json({ error: "signed-out" }, { status: 401 });
    }
    if (!phone) return NextResponse.json({ error: "signed-out" }, { status: 401 });
    if (Date.now() - signedInAt > TRACK_SESSION_DAYS * 86_400_000) {
        return NextResponse.json({ error: "expired" }, { status: 401 });
    }

    const snap = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", phone)));
    const orders = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
    return NextResponse.json({ phone, orders }, { headers: { "Cache-Control": "no-store" } });
}
