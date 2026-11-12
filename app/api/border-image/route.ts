import { NextRequest, NextResponse } from "next/server";

// Serves an uploaded R2 photo from our own origin, so the admin page can read its pixels
// (the r2.dev bucket sends no CORS headers) and copy it to the clipboard for WhatsApp.
const R2_PUBLIC_URL = "https://pub-9030acd52c624ce0899f976b6f7ea284.r2.dev/";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url") || "";
    if (!url.startsWith(R2_PUBLIC_URL)) {
        return NextResponse.json({ error: "Only ParcelSewa photos can be loaded." }, { status: 400 });
    }
    const res = await fetch(url, { cache: "no-store" }).catch(() => null);
    if (!res?.ok || !res.body) {
        return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }
    return new NextResponse(res.body, {
        headers: {
            "Content-Type": res.headers.get("Content-Type") || "image/webp",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
