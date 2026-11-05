import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { readSession } from "@/lib/track-auth";

// Firestore Timestamps don't survive JSON, so send them as { __date: ms } and let the page turn them back into Dates.
function serialize(value: unknown): unknown {
    if (value instanceof Timestamp) return { __date: value.toMillis() };
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
    }
    return value;
}

// Returns the signed-in customer's orders. The number comes from the signed login cookie, never from the request.
export async function GET(req: NextRequest) {
    const session = readSession(req);
    if (session === "expired") return NextResponse.json({ error: "expired" }, { status: 401 });
    if (!session) return NextResponse.json({ error: "signed-out" }, { status: 401 });

    const phone = `+977${session.mobile}`;
    const snap = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", phone)));
    const orders = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
    return NextResponse.json({ phone, orders }, { headers: { "Cache-Control": "no-store" } });
}
