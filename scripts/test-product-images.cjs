/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS regression-test harness. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const load = (file, req) => {
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib", file), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mod = { exports: {} };
    new Function("exports", "require", "module", code)(mod.exports, req, mod);
    return mod;
};
const parse = load("product-image-parse.ts", require);
const loaded = load("product-images.ts", id => id === "./product-image-parse" ? parse.exports : require(id));
const parseImg = parse.exports;
const price = load("product-price-parse.ts", require).exports;
const { extractStoreImages, fetchAjioImage, fetchFlipkartImage, isStoreUrl } = loaded.exports;
const flipkart = "https://www.flipkart.com/nike-shoes/p/itm123";
const ajio = "https://www.ajio.com/backpack/p/700737231_blue";
const shoe = "https://rukminim2.flixcart.com/image/1500/1500/shoe/main.jpeg";
const promo = "https://rukminim1.flixcart.com/www/800/800/promos/2025/sale.png";
const shoeLarge = "https://rukminim2.flixcart.com/image/832/832/shoe/main.jpeg?q=90";
const bag = "https://assets.ajio.com/medias/root/-473Wx593H-700737231-blue-MODEL.jpg";

test("block-page metadata and recommendations do not produce a Flipkart image", () => {
    assert.deepEqual(extractStoreImages(`<meta property="og:image" content="${promo}"><img src="${shoe}">`, flipkart, "flipkart"), []);
});
test("valid main image accepts reordered attributes and decodes entities", () => {
    assert.deepEqual(extractStoreImages(`<meta content="${shoe}?q=90&amp;x=1" property="og:image">`, flipkart, "flipkart"), [`${shoeLarge}&x=1`]);
});
test("Ajio rejects other products and colors", () => {
    assert.deepEqual(extractStoreImages(`<img src="${bag}"><img src="${bag.replace('-blue-', '-red-')}"><img src="${bag.replace('700737231', '999999999')}">`, ajio, "ajio"), [bag]);
});
test("store routing rejects lookalike hosts", () => {
    assert.equal(isStoreUrl(new URL("https://www.ajio.com/p/1"), "ajio.com"), true);
    assert.equal(isStoreUrl(new URL("https://ajio.com.evil.test/p/1"), "ajio.com"), false);
});
test("Flipkart uses backend fallback when direct fetch contains a promotion", async () => {
    const originalFetch = global.fetch;
    const calls = [];
    try {
        global.fetch = async url => {
            calls.push(url);
            return new Response(url.endsWith("/html") ? JSON.stringify({ candidates: [promo, shoe] }) : `<meta property="og:image" content="${promo}">`);
        };
        assert.equal(await fetchFlipkartImage(flipkart, "", "https://backend.test"), shoeLarge);
        assert.deepEqual(calls, [flipkart, flipkart, flipkart, flipkart, "https://backend.test/html"]);
    } finally { global.fetch = originalFetch; }
});
test("Ajio calls backend directly and preserves the requested variant", async () => {
    const originalFetch = global.fetch;
    try {
        global.fetch = async (url, options) => {
            assert.equal(url, "https://backend.test/html");
            assert.equal(JSON.parse(options.body).url, ajio);
            return new Response(JSON.stringify({ candidates: [bag.replace('-blue-', '-red-'), bag] }));
        };
        assert.equal(await fetchAjioImage(ajio, "red", "https://backend.test"), bag);
    } finally { global.fetch = originalFetch; }
});
test("backend errors and promotion-only results remain failures", async () => {
    const originalFetch = global.fetch;
    try {
        global.fetch = async () => new Response(JSON.stringify({ candidates: [promo] }));
        assert.equal(await fetchFlipkartImage(flipkart, "", "https://backend.test"), null);
        global.fetch = async () => new Response("service unavailable", { status: 503 });
        assert.equal(await fetchAjioImage(ajio, "", "https://backend.test"), null);
    } finally { global.fetch = originalFetch; }
});

test("Ajio numeric SKU URLs accept the image style ID", () => {
    const url = "https://luxe.ajio.com/nike/p/469763484007";
    const image = "https://assets.ajio.com/medias/root/-473Wx593H-469763484-blackgrey-MODEL.jpg";
    assert.deepEqual(extractStoreImages(`<meta property="og:image" content="${image}">`, url, "ajio"), [image]);
});

test("backend jobs poll until complete before returning the validated product image", async () => {
    const originalFetch = global.fetch;
    let polls = 0;
    try {
        global.fetch = async (url, options) => {
            if (url.endsWith("/html")) {
                assert.equal(JSON.parse(options.body).async, true);
                return new Response(JSON.stringify({ jobId: "job-123" }), { status: 202 });
            }
            assert.equal(url, "https://backend.test/image-jobs/job-123");
            polls++;
            return polls === 1 ? new Response(JSON.stringify({ status: "pending" }), { status: 202 })
                : new Response(JSON.stringify({ candidates: [bag] }));
        };
        assert.equal(await fetchAjioImage(ajio, "", "https://backend.test"), bag);
        assert.equal(polls, 2);
    } finally { global.fetch = originalFetch; }
});

test("Flipkart direct fetch uses a crawler user agent and upsizes the thumbnail", async () => {
    const originalFetch = global.fetch;
    try {
        global.fetch = async (url, options) => {
            assert.equal(url, flipkart);
            assert.match(options.headers["User-Agent"], /Googlebot/);
            return new Response(`<meta property="og:image" content="https://rukminim2.flixcart.com/image/300/300/shoe/main.jpeg">`);
        };
        assert.equal(await fetchFlipkartImage(flipkart, "", "https://backend.test"), shoeLarge);
    } finally { global.fetch = originalFetch; }
});

test("Ajio numeric SKU pages prefer the largest gallery image over the meta thumbnail", () => {
    const url = "https://www.ajio.com/nike/p/469763484007";
    const root = "https://assets.ajio.com/medias/sys_master/root/20250714/uiUa";
    const small = `${root}/a/-78Wx98H-469763484-blackgrey-MODEL.jpg`;
    const large = `${root}/b/-1117Wx1400H-469763484-blackgrey-MODEL.jpg`;
    const other = `${root}/c/-1117Wx1400H-111111111-red-MODEL.jpg`;
    assert.deepEqual(extractStoreImages(`<meta property="og:image" content="${small}"><script>"${other}","${large}"</script>`, url, "ajio"), [large, small]);
});

test("price is read from structured data, Flipkart state, Amazon and meta tags", () => {
    const ld = p => `<script type="application/ld+json">${JSON.stringify(p)}</script>`;
    assert.equal(price.extractPrice(ld({ "@type": "Product", offers: { "@type": "Offer", priceCurrency: "INR", price: "1,299.00" } })), 1299);
    assert.equal(price.extractPrice(ld({ "@graph": [{ "@type": "Organization" }, { "@type": "Product", offers: [{ price: 448 }] }] })), 448);
    assert.equal(price.extractPrice(ld({ "@type": "Product", offers: { priceCurrency: "USD", price: "10" } })), null);
    assert.equal(price.extractPrice('<script>{"fsp":448,"finalPrice":460,"mrp":899}</script>'), 448);
    assert.equal(price.extractPrice('<span class="a-price a-text-price"><span class="a-offscreen">₹999</span></span><span class="a-price aok-align-center"><span class="a-offscreen">₹749.00</span></span>'), 749);
    assert.equal(price.extractPrice('<meta property="product:price:amount" content="2,499">'), 2499);
    assert.equal(price.extractPrice("<html>blocked</html>"), null);
});
test("expected total matches the quotation calculator and excludes courier", () => {
    assert.deepEqual(price.expectedTotal(1000, "20%"), { npr: 1600, commission: 320, total: 1920 });
    assert.deepEqual(price.expectedTotal(1000, "800"), { npr: 1600, commission: 800, total: 2400 });
    assert.equal(price.expectedTotal(1000, ""), null);
});

test("Ajio rendered page uses the selling price, not the MRP or coupon price", () => {
    const html = '<link href="https://www.ajio.com/"><div class="prod-sp">₹1,139</div><div class="prod-cp">MRP <span>₹1,899</span></div><div>Get it for <span>₹797</span></div>';
    assert.equal(price.extractPrice(html), 1139);
    assert.equal(price.extractPrice('<link href="https://www.ajio.com/"><div class="x">&#8377;1,139</div><div>Get it for ₹797</div>'), 1139);
    assert.equal(price.extractPrice("<div>₹500</div>"), null);
});

test("WooCommerce sale price is read from the priceSpecification array and screen-reader text", () => {
    const ld = { "@type": "Product", offers: [{ "@type": "Offer", priceSpecification: [
        { "@type": "UnitPriceSpecification", price: "2000.00", priceCurrency: "INR", priceType: "https://schema.org/ListPrice" },
        { "@type": "UnitPriceSpecification", price: "1600.00", priceCurrency: "INR" }] }] };
    assert.equal(price.extractPrice(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`), 1600);
    assert.equal(price.extractPrice('<del>&#8377;2,000.00</del><span class="screen-reader-text">Current price is: &#8377;1,600.00.</span>'), 1600);
});
test("generic stores expose the main image through og:image, resolving relative URLs", () => {
    assert.deepEqual(parseImg.extractGenericImages('<meta property="og:image" content="/uploads/book.jpeg">', "https://shop.example.in/product/book/"), ["https://shop.example.in/uploads/book.jpeg"]);
    assert.deepEqual(parseImg.extractGenericImages('<meta property="og:image" content="https://shop.example.in/logo.png">', "https://shop.example.in/p/1"), []);
});

test("expected total matches the quotation calculator for every commission option", () => {
    const options = { "5%": 5, "10%": 10, "15%": 15, "20%": 20, "25%": 25, "30%": 30, "35%": 35, "40%": 40, "50%": 50 };
    const flats = { "Flat NPR 700": 700, "Flat NPR 800": 800, "Flat NPR 1000": 1000, "below_1500_800": 800, "below_1500_1000": 1000, "Below order IC 1500 (Flat NPR 800)": 800 };
    for (const inr of [1, 100, 499, 999.5, 1234.5, 1499, 5000, 12345, 99999.99, 0.3]) {
        const npr = Math.round(inr * 1.6);
        for (const [text, rate] of Object.entries(options)) {
            assert.equal(price.expectedTotal(inr, text).total, npr + Math.round((npr * rate) / 100), `${text} on ${inr}`);
        }
        for (const [text, fee] of Object.entries(flats)) {
            assert.equal(price.expectedTotal(inr, text).total, npr + fee, `${text} on ${inr}`);
        }
    }
});

test("Amazon layouts with an empty first price block still yield the price to pay", () => {
    const html = '<span class="a-price aok-align-center priceToPay" data-a-size="xl"><span class="a-offscreen"> </span><span aria-hidden="true">x</span></span>'
        + '<span class="a-price a-text-price apex-basisprice-value" data-a-strike="true"><span class="a-offscreen">₹2,199</span></span>'
        + '<span class="a-price aok-align-center apex-pricetopay-value" data-a-size="xl"><span class="a-offscreen">₹599.00</span></span>';
    assert.equal(price.extractPrice(html), 599);
    assert.equal(price.extractPrice('<script>{"priceAmount":599.00}</script>'), 599);
});

test("Amazon pages without og:image expose the main high-resolution image", () => {
    const html = '<img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/617PDdtPDJL._SL1500_.jpg"><img data-old-hires="https://m.media-amazon.com/images/I/61W107uiJJL._SL1500_.jpg">';
    assert.deepEqual(parseImg.extractGenericImages(html, "https://www.amazon.in/dp/B07BYX6L4M"), ["https://m.media-amazon.com/images/I/617PDdtPDJL._SL1500_.jpg"]);
    assert.deepEqual(parseImg.extractGenericImages('<script>{"hiRes":"https://m.media-amazon.com/images/I/aaa._SL1500_.jpg"}</script>', "https://www.amazon.in/dp/X"), ["https://m.media-amazon.com/images/I/aaa._SL1500_.jpg"]);
});
