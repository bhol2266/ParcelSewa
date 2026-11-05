import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

// Before sending an OTP, the track page asks whether the number has any orders, so the 10 free SMS a day
// aren't spent on numbers we'd show nothing for. Only a yes/no comes back, never order details.
export async function POST(req: NextRequest) {
    const { mobile } = await req.json().catch(() => ({ mobile: "" }));
    const digits = String(mobile ?? "").replace(/\D/g, "").slice(-10);
    if (!/^9\d{9}$/.test(digits)) return NextResponse.json({ error: "invalid-number" }, { status: 400 });

    const snap = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", `+977${digits}`), limit(1)));
    return NextResponse.json({ exists: !snap.empty }, { headers: { "Cache-Control": "no-store" } });
}
