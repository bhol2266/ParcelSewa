import { chooseImage, extractGenericImages, extractStoreImages, isStoreUrl } from "./product-image-parse";
import { extractPrice } from "./product-price-parse";

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

/** Returns the product image (or null) plus a short note on what the extension did, for the progress log. */
export async function fetchStoreImageViaExtension(productUrl: string, notes: string): Promise<{ image: string | null; note: string }> {
    let url: URL;
    try { url = new URL(productUrl); } catch { return { image: null, note: "" }; }
    const store = isStoreUrl(url, "flipkart.com") ? "flipkart" : isStoreUrl(url, "ajio.com") ? "ajio" : null;
    // Other stores (WooCommerce, Shopify, ...) use the generic og:image / structured-data reader.
    if (url.protocol !== "https:" || /myntra\.com$/i.test(url.hostname)) return { image: null, note: "" };
    if (!(await hasExtension())) return { image: null, note: "Extension not detected on this page (install it, then refresh); using server" };
    const tried: string[] = [];
    if (store === "flipkart" && url.hostname === "flipkart.com") url.hostname = "www.flipkart.com";
    // Ajio blocks plain fetches, so it needs a real page load; Flipkart tries the cheap fetches first.
    for (const mode of store === "ajio" ? ["tab"] : store === "flipkart" ? ["browser", "crawler", "tab"] : ["browser", "tab"]) {
        const reply = await send({ type: "PARCELSEWA_FETCH_HTML", url: url.href, mode }, "PARCELSEWA_HTML_RESULT", 45000);
        if (!reply?.ok || !reply.html) { tried.push(`${mode}: ${reply ? reply.error || `HTTP ${reply.status}` : "no response"}`); continue; }
        const images = store ? extractStoreImages(reply.html, productUrl, store) : extractGenericImages(reply.html, productUrl);
        const image = chooseImage(images, notes);
        if (image) return { image, note: `Found via extension (${mode})` };
        tried.push(`${mode}: page had no product image`);
    }
    return { image: null, note: `Extension found nothing (${tried.join("; ")}); using server` };
}

/** Reads a product's selling price (INR) from any store page, trying cheap fetches before a real page load. */
export async function fetchProductPriceViaExtension(productUrl: string): Promise<{ price: number | null; note: string }> {
    if (!(await hasExtension())) return { price: null, note: "Extension not detected (install it, then refresh the page)" };
    const tried: string[] = [];
    for (const mode of ["browser", "crawler", "tab"]) {
        const reply = await send({ type: "PARCELSEWA_FETCH_HTML", url: productUrl, mode }, "PARCELSEWA_HTML_RESULT", 45000);
        if (!reply?.ok || !reply.html) { tried.push(`${mode}: ${reply ? reply.error || `HTTP ${reply.status}` : "no response"}`); continue; }
        const price = extractPrice(reply.html);
        if (price) return { price, note: mode };
        tried.push(`${mode}: no price on page`);
    }
    return { price: null, note: tried.join("; ") };
}
