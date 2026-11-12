import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";

// Reads a courier receipt photo (already uploaded to our R2 bucket): consignee name, phone and tracking number, so the
// admin page can attach the receipt to the right order. Claude runs on the ParcelSewa backend (Cronjob server), which
// holds the Anthropic key, like the cart's price lookup:
//   POST {backend}/read-receipt { url } -> 200 { name, phone, address, trackingNumber, code, cod, readable }
const BACKEND = (process.env.CRONJOB_API_URL || "https://backend.uktechdeveloper.co.uk/parcelsewa").replace(/\/$/, "");
const R2_PUBLIC_URL = "https://pub-9030acd52c624ce0899f976b6f7ea284.r2.dev/";
const tokenHeader = (): Record<string, string> => (process.env.PARCELSEWA_PRICE_TOKEN ? { "x-parcelsewa-token": process.env.PARCELSEWA_PRICE_TOKEN } : {});

// Team only: each read costs Claude credit.
export async function POST(req: NextRequest) {
    if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { url } = await req.json().catch(() => ({ url: "" }));
    if (typeof url !== "string" || !url.startsWith(R2_PUBLIC_URL)) {
        return NextResponse.json({ error: "Only uploaded ParcelSewa photos can be read." }, { status: 400 });
    }
    try {
        const res = await fetch(`${BACKEND}/read-receipt`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...tokenHeader() },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(60_000),
        });
        const data = await res.json().catch(() => ({ error: `Backend error ${res.status}` }));
        if (res.status === 404) return NextResponse.json({ error: "The receipt reader isn't on the backend yet." }, { status: 502 });
        return NextResponse.json(data, { status: res.status, headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({ error: "The receipt reader didn't answer. Try again." }, { status: 502 });
    }
}
