// Client helpers for sending product photos to /api/upload-product-image (Cloudflare R2).

// Phone photos are often over Vercel's 4.5 MB body limit, so resize to a sensible product-image size first.
function shrinkImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
        if (file.type === "image/gif") return resolve(file);
        const img = new Image();
        const src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(src);
            const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => resolve(blob || file), "image/webp", 0.85);
        };
        img.onerror = () => {
            URL.revokeObjectURL(src);
            resolve(file);
        };
        img.src = src;
    });
}

/** Uploads each image and returns the public URLs, plus a message for each one that failed. */
export async function uploadProductImages(files: File[]): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];
    for (const file of files) {
        try {
            const body = new FormData();
            body.append("file", await shrinkImage(file), file.name);
            const res = await fetch("/api/upload-product-image", { method: "POST", body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            urls.push(data.url);
        } catch (err) {
            errors.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
        }
    }
    return { urls, errors };
}

/** Image files from a paste event (screenshots and copied images); empty when the clipboard holds text. */
export function pastedImages(e: ClipboardEvent): File[] {
    return Array.from(e.clipboardData?.files || [])
        .filter((f) => f.type.startsWith("image/"))
        .map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `pasted-${Date.now()}-${i}.png`, { type: f.type })));
}

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
