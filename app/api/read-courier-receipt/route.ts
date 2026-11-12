import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";

// Reads a courier receipt photo (already uploaded to our R2 bucket) with Claude and returns the consignee's
// name, phone and the tracking number, so the admin page can attach the receipt to the right order.
const R2_PUBLIC_URL = "https://pub-9030acd52c624ce0899f976b6f7ea284.r2.dev/";

const PROMPT = `This is a photo of a Nepali courier receipt / shipping label (for example expoXpress / Xpress Delivery and Cargo, Aramex). It may be rotated or blurry.
Read the CONSIGNEE (receiver) details, not the sender. Reply with ONLY a JSON object, no other text:
{"name": "consignee name or empty", "phone": "consignee 10-digit mobile or empty", "address": "consignee address or empty", "trackingNumber": "the long number printed under the barcode, digits only, or empty", "code": "short shipment code like POQRUV3 or empty", "cod": "COD amount as digits or empty", "readable": true or false}
Set "readable" to false if you can't read the consignee clearly. Never guess digits you can't see.`;

// Team only: each read costs Claude credit.
export async function POST(req: NextRequest) {
    if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { url } = await req.json().catch(() => ({ url: "" }));
    if (typeof url !== "string" || !url.startsWith(R2_PUBLIC_URL)) {
        return NextResponse.json({ error: "Only uploaded ParcelSewa photos can be read." }, { status: 400 });
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: "Receipt reading isn't set up (no Claude API key)." }, { status: 503 });

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-sonnet-5-5",
                max_tokens: 400,
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "url", url } },
                        { type: "text", text: PROMPT },
                    ],
                }],
            }),
            signal: AbortSignal.timeout(60_000),
        });
        const data = await res.json();
        if (!res.ok) {
            console.error("Receipt read failed", res.status, data?.error);
            return NextResponse.json({ error: "Couldn't read the receipt right now." }, { status: 502 });
        }
        const text: string = (data.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
        const json = text.match(/\{[\s\S]*\}/)?.[0];
        if (!json) return NextResponse.json({ error: "Couldn't read the receipt." }, { status: 422 });
        const parsed = JSON.parse(json);
        const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");
        return NextResponse.json({
            name: str(parsed.name),
            phone: str(parsed.phone).replace(/\D/g, "").slice(-10),
            address: str(parsed.address),
            trackingNumber: str(parsed.trackingNumber).replace(/\D/g, ""),
            code: str(parsed.code).toUpperCase(),
            cod: str(parsed.cod).replace(/\D/g, ""),
            readable: parsed.readable !== false,
        });
    } catch (err) {
        console.error("Receipt read threw", err);
        return NextResponse.json({ error: "Couldn't read the receipt right now." }, { status: 502 });
    }
}
