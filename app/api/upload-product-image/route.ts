import { NextRequest, NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

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
    const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL } = process.env;
    if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
        return NextResponse.json({ error: "Image upload is not configured." }, { status: 500 });
    }

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

    return NextResponse.json({ url: `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` });
}
