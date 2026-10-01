// Pure parsing helpers shared by the server route and the browser (extension) path.
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
        if (/placeholder|sprite|logo|banner|\/promos\//i.test(url.pathname)) return null;
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

export function storeImageUrl(value: string, productUrl: string, store: "ajio" | "flipkart"): string | null {
    const normalized = imageUrl(value, productUrl);
    if (!normalized) return null;
    const url = new URL(normalized);
    if (store === "flipkart") {
        if (!/^rukminim\d*\.flixcart\.com$/i.test(url.hostname) || !url.pathname.startsWith("/image/")) return null;
        // og:image is a 300px thumbnail; the CDN serves any requested size.
        url.pathname = url.pathname.replace(/^\/image\/\d+\/\d+\//, "/image/832/832/");
        url.searchParams.set("q", "90");
        return url.href;
    }
    const product = new URL(productUrl).pathname.match(/\/p\/([^/]+)/)?.[1] || "";
    const [code, ...colorParts] = product.split("_");
    // Ajio numeric SKU IDs append a size suffix to the nine-digit image style code.
    const codes = /^\d{12}$/.test(code) ? [code, code.slice(0, 9)] : [code];
    const color = colorParts.join("-").toLowerCase();
    return url.hostname === "assets.ajio.com" && url.pathname.startsWith("/medias/")
        && code && codes.some(candidate => url.pathname.includes(`-${candidate}-`))
        && (!color || url.pathname.toLowerCase().includes(`-${code}-${color}-`)) ? normalized : null;
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
    // Flipkart's raw page state includes recommendations. Only trust its product metadata.
    const cdn = /https?:\/\/assets\.ajio\.com\/medias\/[^\s"'<>\\]+/gi;
    const productCode = new URL(productUrl).pathname.match(/\/p\/([^/]+)/)?.[1]?.split("_")[0];
    // Numeric SKU codes carry a 3-digit suffix that image URLs omit.
    const productCodes = productCode ? [productCode, ...(/^\d{12}$/.test(productCode) ? [productCode.slice(0, 9)] : [])] : [];
    for (const match of decoded.matchAll(cdn)) {
        // Ajio recommendation images share the same CDN; retain this product only.
        if (store !== "ajio" || (productCodes.length && !productCodes.some(code => match[0].includes(code)))) continue;
        candidates.push(match[0]);
    }
    const images = [...new Set(candidates.map(value => storeImageUrl(value, productUrl, store))
        .filter((value): value is string => value !== null))];
    // Ajio's meta tag is a 78x98 thumbnail; its gallery has the same photo in larger files.
    const width = (value: string) => Number(value.match(/-(\d+)Wx\d+H-/)?.[1] || 0);
    return store === "ajio" ? images.sort((a, b) => width(b) - width(a)) : images;
}

export function chooseImage(images: string[], notes: string): string | null {
    const hints = notes.toLowerCase().match(/\b(?:black|white|blue|red|green|grey|gray|pink|yellow|brown|beige|navy)\b/g) || [];
    return images.find(image => hints.some(hint => image.toLowerCase().includes(hint))) || images[0] || null;
}

/** Main product images from any store page: og:image / twitter:image first, then Product structured data. */
export function extractGenericImages(html: string, pageUrl: string): string[] {
    const candidates: string[] = [];
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
            .map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
        if (/^(og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(attrs.property || attrs.name || "") && attrs.content) {
            candidates.push(attrs.content);
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
    // Amazon has no og:image; its main picture is the first high-resolution gallery entry.
    const amazon = html.match(/data-old-hires="(https:\/\/[^"]+)"/) || html.match(/"hiRes"\s*:\s*"(https:[^"]+)"/);
    if (amazon) candidates.push(amazon[1]);
    return [...new Set(candidates.map(value => imageUrl(value, pageUrl)).filter((value): value is string => value !== null))];
}
