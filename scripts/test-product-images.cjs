/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS regression-test harness. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/product-images.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
new Function("exports", "require", "module", source)(loaded.exports, require, loaded);
const { extractStoreImages, fetchAjioImage, fetchFlipkartImage, isStoreUrl } = loaded.exports;
const flipkart = "https://www.flipkart.com/nike-shoes/p/itm123";
const ajio = "https://www.ajio.com/backpack/p/700737231_blue";
const shoe = "https://rukminim2.flixcart.com/image/1500/1500/shoe/main.jpeg";
const promo = "https://rukminim1.flixcart.com/www/800/800/promos/2025/sale.png";
const bag = "https://assets.ajio.com/medias/root/-473Wx593H-700737231-blue-MODEL.jpg";

test("block-page metadata and recommendations do not produce a Flipkart image", () => {
    assert.deepEqual(extractStoreImages(`<meta property="og:image" content="${promo}"><img src="${shoe}">`, flipkart, "flipkart"), []);
});
test("valid main image accepts reordered attributes and decodes entities", () => {
    assert.deepEqual(extractStoreImages(`<meta content="${shoe}?q=90&amp;x=1" property="og:image">`, flipkart, "flipkart"), [`${shoe}?q=90&x=1`]);
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
        assert.equal(await fetchFlipkartImage(flipkart, "", "https://backend.test"), shoe);
        assert.deepEqual(calls, [flipkart, "https://backend.test/html"]);
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
