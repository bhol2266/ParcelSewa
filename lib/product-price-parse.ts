// Reads a product's selling price (INR) from a store page's HTML. Pure parsing, safe to run in the browser.

export function parsePriceNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    if (typeof value !== "string") return null;
    const match = value.replace(/&nbsp;|\s/g, "").match(/\d[\d,]*(?:\.\d+)?/);
    if (!match) return null;
    const number = Number(match[0].replace(/,/g, ""));
    return Number.isFinite(number) && number > 0 ? number : null;
}

// WooCommerce lists [ListPrice, sale price] as an array; the list price is the struck-through one.
function specPrice(spec: unknown): number | null {
    const specs = (Array.isArray(spec) ? spec : [spec]).filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    const current = specs.filter(item => !/ListPrice|Strikethrough|SRP|MSRP/i.test(String(item.priceType ?? "")));
    for (const item of current.length ? current : specs) {
        const currency = item.priceCurrency;
        if (typeof currency === "string" && currency.toUpperCase() !== "INR") continue;
        const price = parsePriceNumber(item.price);
        if (price) return price;
    }
    return null;
}

function offerPrice(offer: unknown): number | null {
    if (Array.isArray(offer)) {
        for (const item of offer) {
            const price = offerPrice(item);
            if (price) return price;
        }
        return null;
    }
    if (!offer || typeof offer !== "object") return null;
    const object = offer as Record<string, unknown>;
    const currency = object.priceCurrency;
    if (typeof currency === "string" && currency.toUpperCase() !== "INR") return null;
    return parsePriceNumber(object.price) ?? parsePriceNumber(object.lowPrice)
        ?? specPrice(object.priceSpecification) ?? offerPrice(object.offers);
}

function productPrice(value: unknown): number | null {
    if (Array.isArray(value)) {
        for (const item of value) {
            const price = productPrice(item);
            if (price) return price;
        }
        return null;
    }
    if (!value || typeof value !== "object") return null;
    const object = value as Record<string, unknown>;
    const types = Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]];
    if (types.includes("Product") || types.includes("ProductGroup")) {
        const price = offerPrice(object.offers) ?? productPrice(object.hasVariant);
        if (price) return price;
    }
    return object["@graph"] ? productPrice(object["@graph"]) : null;
}

function metaContent(html: string, names: RegExp): string | null {
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
            .map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
        const key = attrs.property || attrs.name || attrs.itemprop || "";
        if (names.test(key) && attrs.content) return attrs.content;
    }
    return null;
}

export function extractPrice(html: string): number | null {
    // 1. Structured data is the most reliable source (Myntra, Flipkart and most Indian stores).
    for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const price = productPrice(JSON.parse(script[1]));
            if (price) return price;
        } catch { /* Some pages contain malformed structured data. */ }
    }
    // 2. Open Graph / product meta tags. Prefer the sale price over the list price.
    const meta = parsePriceNumber(metaContent(html, /^(?:product:sale_price:amount|og:price:amount|product:price:amount|price)$/i));
    if (meta) return meta;
    // 3. Flipkart page state: "fsp" is the selling price ("mrp" is the struck-through list price).
    const flipkart = html.match(/"fsp"\s*:\s*(\d+(?:\.\d+)?)/);
    if (flipkart) return parsePriceNumber(flipkart[1]);
    // 4. Amazon: the price to pay is the first non-struck-through a-price block.
    const amazon = html.match(/<span class="a-price(?![^"]*a-text-price)[^"]*"[^>]*>\s*<span class="a-offscreen">([^<]+)</i);
    if (amazon) return parsePriceNumber(amazon[1]);
    // 4b. WooCommerce: a screen-reader label always states the current (sale) price.
    const woo = html.match(/Current price is:\s*(?:&#8377;|₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    if (woo) return parsePriceNumber(woo[1]);
    // 5. Myntra page state: "discounted" is the selling price.
    const myntra = html.match(/"discounted"\s*:\s*(\d+(?:\.\d+)?)/);
    if (myntra) return parsePriceNumber(myntra[1]);
    // 6. Ajio page state / markup (offer price is the selling price; untested against a live page).
    const ajio = html.match(/"offerPrice"\s*:\s*\{[^}]*?"value"\s*:\s*(\d+(?:\.\d+)?)/)
        || html.match(/class="prod-sp"[^>]*>\s*(?:&#8377;|₹|Rs\.?)\s*([\d,]+)/i);
    if (ajio) return parsePriceNumber(ajio[1]);
    // 7. Microdata price.
    const microdata = html.match(/itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/i)
        || html.match(/content\s*=\s*["']([^"']+)["'][^>]*itemprop\s*=\s*["']price["']/i);
    if (microdata) return parsePriceNumber(microdata[1]);
    // 8. Last resort for Ajio's rendered page: the first standalone price element is the selling price
    //    (the "MRP" and "Get it for" coupon prices come after it and are not plain price elements).
    if (/ajio\.com/i.test(html)) {
        const standalone = html.match(/>\s*(?:&#8377;|₹)\s?([\d,]+(?:\.\d+)?)\s*</);
        if (standalone) return parsePriceNumber(standalone[1]);
    }
    return null;
}

// ── Order total ────────────────────────────────────────────────────────────

export const INR_TO_NPR = 1.6;

/** Commission option as stored on an order ("20%", or a flat NPR amount such as "800"). */
export function commissionAmount(commission: unknown, nprProducts: number): number | null {
    const text = String(commission ?? "").trim();
    const percent = text.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (percent) return Math.round((nprProducts * Number(percent[1])) / 100);
    const flat = text.match(/^(?:flat\s*)?(?:npr\s*)?(\d+(?:\.\d+)?)$/i);
    return flat ? Number(flat[1]) : null;
}

/** Expected order total in NPR (products x 1.6 + commission, courier excluded), matching the quotation calculator. */
export function expectedTotal(inrProducts: number, commission: unknown): { npr: number; commission: number; total: number } | null {
    const npr = Math.round(inrProducts * INR_TO_NPR);
    const fee = commissionAmount(commission, npr);
    return fee === null ? null : { npr, commission: fee, total: npr + fee };
}
