import { chooseImage, extractStoreImages, isStoreUrl } from "./product-image-parse";

// Talks to the ParcelSewa Store Fetcher Chrome extension (see /extension) through its content script.
type Reply = { ok: boolean; status?: number; html?: string; error?: string };

function send(message: Record<string, unknown>, replyType: string, timeoutMs: number): Promise<Reply | null> {
    return new Promise(resolve => {
        const id = Math.random().toString(36).slice(2);
        const timer = setTimeout(() => { window.removeEventListener("message", onMessage); resolve(null); }, timeoutMs);
        function onMessage(event: MessageEvent) {
            if (event.source !== window || event.data?.type !== replyType || event.data.id !== id) return;
            clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            resolve(event.data);
        }
        window.addEventListener("message", onMessage);
        window.postMessage({ ...message, id }, "*");
    });
}

export const hasExtension = async () => !!(await send({ type: "PARCELSEWA_PING" }, "PARCELSEWA_PONG", 600));

/** Returns the product image, or null when the extension is missing or the store gave nothing usable. */
export async function fetchStoreImageViaExtension(productUrl: string, notes: string): Promise<string | null> {
    let url: URL;
    try { url = new URL(productUrl); } catch { return null; }
    const store = isStoreUrl(url, "flipkart.com") ? "flipkart" : isStoreUrl(url, "ajio.com") ? "ajio" : null;
    if (!store || !(await hasExtension())) return null;
    if (store === "flipkart" && url.hostname === "flipkart.com") url.hostname = "www.flipkart.com";
    // Ajio blocks plain fetches, so it needs a real page load; Flipkart tries the cheap fetches first.
    for (const mode of store === "ajio" ? ["tab"] : ["browser", "crawler", "tab"]) {
        const reply = await send({ type: "PARCELSEWA_FETCH_HTML", url: url.href, mode }, "PARCELSEWA_HTML_RESULT", 45000);
        if (!reply?.ok || !reply.html) continue;
        const image = chooseImage(extractStoreImages(reply.html, productUrl, store), notes);
        if (image) return image;
    }
    return null;
}
