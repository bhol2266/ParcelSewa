/* eslint-disable @typescript-eslint/no-require-imports -- Node regression-test harness. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Loads lib/*.ts files (and their relative imports) as CommonJS without a build step.
const cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const file = path.join(__dirname, "../lib", `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = (cache[name] = { exports: {} });
  const localRequire = id => (id.startsWith("./") ? load(id.slice(2)) : require(id));
  new Function("exports", "require", "module", code)(mod.exports, localRequire, mod);
  return mod.exports;
}

const { cartPath, checkCartAccess } = load("cart-link");
const { cleanItems, cartQuotation, itemsOf, requestMessage } = load("cart");
const { ADMIN_PASSWORD } = load("admin-access");

test("the cart link is just the mobile number", () => {
  assert.equal(cartPath("9817254118"), "/cart?9817254118");
});

test("a cart link opens that number's cart; older links with a key still work", () => {
  assert.deepEqual(checkCartAccess(new URLSearchParams("9817254118"), undefined), { ok: true, mobile: "9817254118", admin: false });
  assert.deepEqual(checkCartAccess(new URLSearchParams("9817254118&t=mw5mplom&k=kqFttw3iJA7IU1nv2hZL4i"), undefined), { ok: true, mobile: "9817254118", admin: false });
  assert.deepEqual(checkCartAccess(new URLSearchParams("m=9817254118"), undefined), { ok: true, mobile: "9817254118", admin: false });
});

test("a link without a valid Nepal number is refused", () => {
  assert.deepEqual(checkCartAccess(new URLSearchParams(""), undefined), { ok: false, reason: "missing" });
  assert.deepEqual(checkCartAccess(new URLSearchParams("12345"), undefined), { ok: false, reason: "missing" });
});

test("the admin cookie marks the team's view", () => {
  assert.deepEqual(checkCartAccess(new URLSearchParams("9817254118"), ADMIN_PASSWORD), { ok: true, mobile: "9817254118", admin: true });
});

test("products are checked and cleaned", () => {
  assert.equal(typeof cleanItems([]), "string");
  assert.match(cleanItems([{ productUrl: "not a link", quantity: 1 }]), /Product 1/);
  assert.match(cleanItems([{ productUrl: "https://a.in/x", quantity: 0 }]), /quantity/);
  assert.deepEqual(cleanItems([{ productUrl: " https://a.in/x ", quantity: 2, details: [{ type: "size", label: "Size", value: " M " }, { type: "color", label: "Colour", value: "" }, { type: "bad", value: "x" }] }]),
    [{ productUrl: "https://a.in/x", quantity: 2, details: [{ type: "size", label: "Size", value: "M" }] }]);
});

test("older single-product requests still load", () => {
  assert.deepEqual(itemsOf({ productUrl: "https://a.in/x", quantity: 3, notes: "Blue" }),
    [{ productUrl: "https://a.in/x", quantity: 3, details: [{ type: "notes", label: "Notes", value: "Blue" }] }]);
});

test("the quotation lists each product, then matches the quotation calculator for the total", () => {
  const quote = cartQuotation([{ priceInr: 1000, quantity: 2 }, { priceInr: 500, quantity: 1 }], 30);
  assert.equal(quote.totalInr, 2500);
  assert.equal(quote.productNPR, 4000);
  assert.equal(quote.serviceNPR, 1200);
  assert.equal(quote.totalNPR, 5200);
  assert.match(quote.message, /^🛒 \*Products\*\n1\. INR 1,000 × 2 = INR 2,000\n2\. INR 500\n\n🇮🇳 INR 2,500 × 1\.6 = NPR 4,000 🇳🇵/);
  assert.match(quote.message, /\*TOTAL = NPR 5,200\* \+ courier charge \(180\/kg\)/);
});

test("a single product with quantity 1 gives exactly the calculator's message", () => {
  const { calculateAdminQuotation } = load("quotation-estimate");
  assert.equal(cartQuotation([{ priceInr: 1499, quantity: 1 }], "below_1500_1000").message, calculateAdminQuotation(1499, "below_1500_1000").message);
});

test("the WhatsApp message has no request ID or product count, and carries the cart link", () => {
  const message = requestMessage({ title: "🛒 *New Order Request*", deliveryLocation: "Balkumari Kathmandu", mobile: "+9779817254118", cartUrl: "https://www.parcelsewa.com/cart?9817254118&t=1&k=2",
    items: [{ productUrl: "https://amzn.in/d/026pcloo", quantity: 1, details: [] }, { productUrl: "https://amzn.in/d/09PmcqYW", quantity: 1, details: [{ type: "size", label: "Size", value: "M" }] }] });
  assert.equal(message, [
    "🛒 *New Order Request*", "", "*1.* 🔗 https://amzn.in/d/026pcloo", "    📦 Qty: 1", "", "*2.* 🔗 https://amzn.in/d/09PmcqYW", "    📦 Qty: 1", "    • Size: M",
    "", "📍 *Delivery Address:* Balkumari Kathmandu", "📞 *Customer WhatsApp:* +9779817254118", "", "✏️ *Add, remove or edit products:* https://www.parcelsewa.com/cart?9817254118&t=1&k=2",
  ].join("\n"));
});

test("sending the form again updates products already in the cart and adds new ones", () => {
  const { mergeItems, productsDiffer } = load("cart");
  const cart = [
    { productUrl: "https://amzn.in/d/a", quantity: 1, details: [], priceInr: 999 },
    { productUrl: "https://amzn.in/d/b", quantity: 1, details: [{ type: "size", label: "Size", value: "M" }] },
  ];
  const merged = mergeItems(cart, [
    { productUrl: "https://amzn.in/d/b", quantity: 2, details: [{ type: "size", label: "Size", value: "L" }] },
    { productUrl: "https://amzn.in/d/c", quantity: 1, details: [] },
  ]);
  assert.deepEqual(merged, [
    { productUrl: "https://amzn.in/d/a", quantity: 1, details: [], priceInr: 999 },
    { productUrl: "https://amzn.in/d/b", quantity: 2, details: [{ type: "size", label: "Size", value: "L" }] },
    { productUrl: "https://amzn.in/d/c", quantity: 1, details: [] },
  ]);
  assert.equal(productsDiffer(cart, merged), true);
});

test("sending the exact same form twice changes nothing and keeps the team's prices", () => {
  const { mergeItems, productsDiffer } = load("cart");
  const cart = [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [], priceInr: 999 }];
  const merged = mergeItems(cart, [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [] }]);
  assert.deepEqual(merged, cart);
  assert.equal(productsDiffer(cart, merged), false);
});

test("the customer's name appears above the address", () => {
  const message = requestMessage({ title: "🛒 *New Order Request*", name: "Sita Sharma", deliveryLocation: "Balkumari Kathmandu", mobile: "+9779817254118", items: [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [] }] });
  assert.match(message, /\n\n👤 \*Name:\* Sita Sharma\n📍 \*Delivery Address:\* Balkumari Kathmandu\n/);
});

test("product links map to the stores list, short links included", () => {
  const { storeFromUrl, orderStoreName } = load("cart");
  const stores = [{ name: "Amazon", url: "https://www.amazon.in" }, { name: "Flipkart", url: "https://www.flipkart.com" }, { name: "Myntra", url: "https://www.myntra.com" }];
  assert.equal(storeFromUrl("https://amzn.in/d/026pcloo", stores), "Amazon");
  assert.equal(storeFromUrl("https://www.amazon.in/dp/B0X", stores), "Amazon");
  assert.equal(storeFromUrl("https://dl.flipkart.com/s/abc", stores), "Flipkart");
  assert.equal(storeFromUrl("https://myntr.it/xyz", stores), "Myntra");
  assert.equal(storeFromUrl("https://www.nykaa.com/p/1", stores), "Nykaa");
  assert.equal(orderStoreName([{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [] }, { productUrl: "https://www.amazon.in/dp/b", quantity: 1, details: [] }, { productUrl: "https://myntr.it/c", quantity: 1, details: [] }], stores), "Amazon, Myntra");
});

test("commission and notes use the orders page's format", () => {
  const { commissionText, orderNotes } = load("cart");
  assert.equal(commissionText(30), "30%");
  assert.equal(commissionText("below_1500_1000"), "Flat NPR 1000");
  assert.equal(orderNotes([
    { productUrl: "https://a.in/1", quantity: 1, details: [] },
    { productUrl: "https://a.in/2", quantity: 2, details: [{ type: "size", label: "Size", value: "M" }, { type: "color", label: "Colour", value: "Blue" }] },
  ], " Need before Tihar "), "Product 2: Size: M, Colour: Blue\nNeed before Tihar");
});
