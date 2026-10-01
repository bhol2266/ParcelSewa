const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
};

export function isStoreUrl(url: URL, domain: string): boolean {
    return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
}

function decode(value: string): string {
    return value.replace(/\\u002[fF]/g, "/").replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/").replace(/&amp;|&#38;/g, "&")
        .replace(/&quot;|&#34;/g, '"');
}

function imageUrl(value: string, base: string): string | null {
    try {
        const url = new URL(decode(value), base);
        if (url.protocol !== "https:" && url.protocol !== "http:") return null;
        if (/placeholder|sprite|logo|banner/i.test(url.pathname)) return null;
        // Flipkart embeds size placeholders in its page state.
        return url.href.replace(/\{(?:@)?width\}/g, "1500")
            .replace(/\{(?:@)?height\}/g, "1500")
            .replace(/\{(?:@)?quality\}/g, "90")
            .replace(/%7B(?:@|%40)?width%7D/gi, "1500")
            .replace(/%7B(?:@|%40)?height%7D/gi, "1500")
            .replace(/%7B(?:@|%40)?quality%7D/gi, "90");
    } catch {
        return null;
    }
}

function collectImages(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(collectImages);
    if (!value || typeof value !== "object") return [];
    const object = value as Record<string, unknown>;
    // Limit traversal to image fields, excluding related/recommended products.
    return [object.url, object.contentUrl, object.image, object.images,
        object.galleryImages, object.primaryImage, object.imageUrl].flatMap(collectImages);
}

export function extractStoreImages(html: string, productUrl: string, store: "ajio" | "flipkart"): string[] {
    const candidates: string[] = [];
    // Attribute order varies between the two stores.
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
            .map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
        if (/^(og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(attrs.property || attrs.name || "")) {
            if (attrs.content) candidates.push(attrs.content);
        }
    }
    for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const visit = (value: unknown): void => {
                if (Array.isArray(value)) { value.forEach(visit); return; }
                if (!value || typeof value !== "object") return;
                const object = value as Record<string, unknown>;
                const types = Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]];
                if (types.includes("Product")) candidates.push(...collectImages(object.image));
                if (object["@graph"]) visit(object["@graph"]);
            };
            visit(JSON.parse(script[1]));
        } catch { /* Some pages contain malformed structured data. */ }
    }
    // CDN URLs in embedded state/lazy-loaded galleries are a last resort.
    const decoded = decode(html);
    const cdn = store === "ajio"
        ? /https?:\/\/assets\.ajio\.com\/medias\/[^\s"'<>\\]+/gi
        : /https?:\/\/rukminim\d*\.flixcart\.com\/image\/[^\s"'<>\\]+/gi;
    const productCode = new URL(productUrl).pathname.match(/\/p\/([^/]+)/)?.[1]?.split("_")[0];
    for (const match of decoded.matchAll(cdn)) {
        // Ajio recommendation images share the same CDN; retain this product only.
        if (store === "ajio" && productCode && !match[0].includes(productCode)) continue;
        candidates.push(match[0]);
    }
    return [...new Set(candidates.map(value => imageUrl(value, productUrl))
        .filter((value): value is string => value !== null))];
}

async function readPublicPage(url: string, json = false): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: { ...HEADERS, Accept: json ? "application/json" : "text/html", Referer: `${new URL(url).origin}/` },
            signal: AbortSignal.timeout(12000),
            cache: "no-store",
            redirect: "error",
        });
        return response.ok ? await response.text() : null;
    } catch {
        return null;
    }
}

async function backendImages(productUrl: string, backendUrl: string, store: "ajio" | "flipkart"): Promise<string[]> {
    try {
        const response = await fetch(`${backendUrl}/html`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: productUrl }),
            signal: AbortSignal.timeout(35000),
        });
        if (!response.ok) return [];
        const data = await response.json();
        if (data.error) return [];
        const candidates = Array.isArray(data.candidates) ? data.candidates : [];
        const images = candidates.filter((value: unknown): value is string => typeof value === "string")
            .map((value: string) => imageUrl(value, productUrl))
            .filter((value: string | null): value is string => value !== null);
        // A backend that returns raw HTML can also use the dedicated parser.
        if (typeof data.html === "string") images.unshift(...extractStoreImages(data.html, productUrl, store));
        return images;
    } catch {
        return [];
    }
}

function chooseImage(images: string[], notes: string): string | null {
    const hints = notes.toLowerCase().match(/\b(?:black|white|blue|red|green|grey|gray|pink|yellow|brown|beige|navy)\b/g) || [];
    return images.find(image => hints.some(hint => image.toLowerCase().includes(hint))) || images[0] || null;
}

export async function fetchAjioImage(productUrl: string, notes: string, backendUrl: string): Promise<string | null> {
    const url = new URL(productUrl);
    if (!isStoreUrl(url, "ajio.com")) return null;
    const code = url.pathname.match(/\/p\/([^/]+)/)?.[1];
    if (code) {
        const body = await readPublicPage(`${url.origin}/api/p/${encodeURIComponent(code)}`, true);
        if (body) {
            try {
                const data = JSON.parse(body);
                const images = collectImages({ images: data.images, galleryImages: data.galleryImages,
                    primaryImage: data.primaryImage, image: data.image, imageUrl: data.imageUrl })
                    .map(value => imageUrl(value, productUrl))
                    .filter((value): value is string => value !== null);
                if (images.length) return chooseImage(images, notes);
            } catch { /* Fall through to the product page and backend. */ }
        }
    }
    const html = await readPublicPage(productUrl);
    const images = html ? extractStoreImages(html, productUrl, "ajio") : [];
    if (images.length) return chooseImage(images, notes);
    return chooseImage(await backendImages(productUrl, backendUrl, "ajio"), notes);
}

export async function fetchFlipkartImage(productUrl: string, notes: string, backendUrl: string): Promise<string | null> {
    if (!isStoreUrl(new URL(productUrl), "flipkart.com")) return null;
    const html = await readPublicPage(productUrl);
    const images = html ? extractStoreImages(html, productUrl, "flipkart") : [];
    if (images.length) return chooseImage(images, notes);
    return chooseImage(await backendImages(productUrl, backendUrl, "flipkart"), notes);
}
