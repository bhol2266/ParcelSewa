import { chooseImage, extractStoreImages, isStoreUrl, storeImageUrl } from "./product-image-parse";

export { extractStoreImages, isStoreUrl };

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
};
// Flipkart serves a 500 bot-check page to browser user agents but full HTML to crawlers.
const CRAWLER_UAS = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

// Optional proxy with an Indian exit IP (e.g. http://user:pass@host:port). Both stores block most datacenter IPs.
async function proxyDispatcher(): Promise<object | undefined> {
    const proxy = process.env.STORE_PROXY_URL;
    if (!proxy) return undefined;
    const { ProxyAgent } = await import("undici");
    return new ProxyAgent(proxy);
}

async function readPublicPage(url: string, userAgent = HEADERS["User-Agent"], diag?: string[]): Promise<string | null> {
    try {
        const dispatcher = await proxyDispatcher();
        const response = await fetch(url, {
            ...(dispatcher ? { dispatcher } : {}),
            headers: { ...HEADERS, "User-Agent": userAgent, Accept: "text/html", Referer: `${new URL(url).origin}/` },
            signal: AbortSignal.timeout(12000),
            cache: "no-store",
            // Store links often redirect (non-www, dl.flipkart.com); verify the final host below.
            redirect: "follow",
        });
        const final = new URL(response.url || url);
        const trusted = ["flipkart.com", "ajio.com"].some(domain => isStoreUrl(final, domain));
        diag?.push(`direct ${response.status}${trusted ? "" : ` redirected to ${final.hostname}`}`);
        return response.ok && trusted ? await response.text() : null;
    } catch (error) {
        diag?.push(`direct failed: ${error instanceof Error ? error.message : "unknown"}`);
        return null;
    }
}

async function backendImages(productUrl: string, backendUrl: string, store: "ajio" | "flipkart"): Promise<string[]> {
    try {
        const response = await fetch(`${backendUrl}/html`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: productUrl, async: true }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return [];
        let data = await response.json();
        if (response.status === 202) {
            if (typeof data.jobId !== "string" || !/^[\w-]+$/.test(data.jobId)) return [];
            const jobUrl = `${backendUrl}/image-jobs/${encodeURIComponent(data.jobId)}`;
            const deadline = Date.now() + 150000;
            let complete = false;
            while (Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const poll = await fetch(jobUrl, { signal: AbortSignal.timeout(10000), cache: "no-store" });
                if (!poll.ok) return [];
                if (poll.status === 202) continue;
                data = await poll.json();
                complete = true;
                break;
            }
            if (!complete) return [];
        }
        if (data.error) return [];
        const candidates = Array.isArray(data.candidates) ? data.candidates : [];
        const images = candidates.filter((value: unknown): value is string => typeof value === "string")
            .map((value: string) => storeImageUrl(value, productUrl, store))
            .filter((value: string | null): value is string => value !== null);
        // A backend that returns raw HTML can also use the dedicated parser.
        if (typeof data.html === "string") images.unshift(...extractStoreImages(data.html, productUrl, store));
        return images;
    } catch {
        return [];
    }
}

export async function fetchAjioImage(productUrl: string, notes: string, backendUrl: string, diag?: string[]): Promise<string | null> {
    if (!isStoreUrl(new URL(productUrl), "ajio.com")) return null;
    // Ajio blocks datacenter IPs, so a direct fetch only works through STORE_PROXY_URL.
    if (process.env.STORE_PROXY_URL) {
        const html = await readPublicPage(productUrl, HEADERS["User-Agent"], diag);
        const images = html ? extractStoreImages(html, productUrl, "ajio") : [];
        if (images.length) return chooseImage(images, notes);
    }
    return chooseImage(await backendImages(productUrl, backendUrl, "ajio"), notes);
}

export async function fetchFlipkartImage(productUrl: string, notes: string, backendUrl: string, diag?: string[]): Promise<string | null> {
    if (!isStoreUrl(new URL(productUrl), "flipkart.com")) return null;
    // The apex domain does not accept connections; Flipkart only serves www.
    const pageUrl = new URL(productUrl);
    if (pageUrl.hostname === "flipkart.com") pageUrl.hostname = "www.flipkart.com";
    // Which crawler identity Flipkart accepts varies by source IP, so try several.
    for (const userAgent of CRAWLER_UAS) {
        const html = await readPublicPage(pageUrl.href, userAgent, diag);
        const images = html ? extractStoreImages(html, productUrl, "flipkart") : [];
        if (html) diag?.push(`direct page had ${images.length} product images`);
        if (images.length) return chooseImage(images, notes);
    }
    const fromBackend = await backendImages(productUrl, backendUrl, "flipkart");
    diag?.push(`backend ${fromBackend.length} images`);
    return chooseImage(fromBackend, notes);
}
