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

const paramsOf = cartLink => new URLSearchParams(cartLink.split("?")[1]);

test("a signed cart link opens that number's cart", () => {
  const access = checkCartAccess(paramsOf(cartPath("9817254118")), undefined);
  assert.equal(access.ok, true);
  assert.equal(access.mobile, "9817254118");
  assert.equal(access.admin, false);
});

test("the link starts with the mobile number", () => {
  assert.match(cartPath("9817254118"), /^\/cart\?9817254118&t=[0-9a-z]+&k=[\w-]{22}$/);
});

test("changing the number or key in a link is refused", () => {
  const params = paramsOf(cartPath("9817254118"));
  const otherNumber = new URLSearchParams(params.toString().replace("9817254118", "9817254119"));
  assert.deepEqual(checkCartAccess(otherNumber, undefined), { ok: false, reason: "invalid" });
  params.set("k", "x".repeat(22));
  assert.deepEqual(checkCartAccess(params, undefined), { ok: false, reason: "invalid" });
  assert.deepEqual(checkCartAccess(new URLSearchParams("9817254118"), undefined), { ok: false, reason: "invalid" });
});

test("links stop working after 7 days", () => {
  const day = 86_400_000;
  assert.equal(checkCartAccess(paramsOf(cartPath("9817254118", Date.now() - 6.9 * day)), undefined).ok, true);
  assert.deepEqual(checkCartAccess(paramsOf(cartPath("9817254118", Date.now() - 7.1 * day)), undefined), { ok: false, reason: "expired" });
});

test("the admin cookie opens any cart without a key", () => {
  const access = checkCartAccess(new URLSearchParams("9817254118"), ADMIN_PASSWORD);
  assert.deepEqual(access, { ok: true, mobile: "9817254118", admin: true, expiresAt: null });
  assert.equal(checkCartAccess(new URLSearchParams(""), ADMIN_PASSWORD).ok, false);
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
