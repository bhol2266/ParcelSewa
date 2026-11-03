import { NextRequest, NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

// Server-only route, so these keys never reach the browser.
const R2_ENDPOINT = "https://9aeac94ae706da39970cfebc2424b877.eu.r2.cloudflarestorage.com";
const R2_BUCKET = "aivideogenerator";
const R2_ACCESS_KEY_ID = "a7a30d7f72c216cefa17630f0cd90949";
const R2_SECRET_ACCESS_KEY = "5fc8d2119c436dd99904f96e973782f9bd54a72b5ab984db34ff27ca00bece86";
const R2_PUBLIC_URL = "https://pub-9030acd52c624ce0899f976b6f7ea284.r2.dev";

// Vercel rejects request bodies over 4.5 MB, so the client shrinks images before sending.
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
};

export async function POST(req: NextRequest) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No image was sent." }, { status: 400 });
    }

    const ext = EXTENSIONS[file.type];
    if (!ext) {
        return NextResponse.json({ error: "Only JPG, PNG, WebP, GIF or AVIF images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Image is larger than 4 MB." }, { status: 413 });
    }

    const key = `parcelsewa/products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const r2 = new AwsClient({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        service: "s3",
        region: "auto",
    });

    const res = await r2.fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
        method: "PUT",
        body: await file.arrayBuffer(),
        headers: { "Content-Type": file.type },
    });
    if (!res.ok) {
        console.error("R2 upload failed", res.status, await res.text());
        return NextResponse.json({ error: "Upload to storage failed." }, { status: 502 });
    }

    return NextResponse.json({ url: `${R2_PUBLIC_URL}/${key}` });
}
