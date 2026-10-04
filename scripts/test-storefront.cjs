/* eslint-disable @typescript-eslint/no-require-imports -- Node regression-test harness. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/storefront-estimate.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("exports", "require", "module", code)(mod.exports, require, mod);
const { calculateStorefrontEstimate: estimate, getDefaultServiceRate } = mod.exports;

test("public estimate keeps flat NPR fees and converts shipping correctly", () => {
  assert.deepEqual(estimate(1000, .5), { productNPR: 1600, serviceNPR: 1000, shippingNPR: 192, totalNPR: 2792 });
});
test("fee boundaries apply 30% through INR 20,000 and 25% above it", () => {
  assert.equal(estimate(1499.99, 1).serviceNPR, 1000);
  assert.equal(estimate(1500, 1).serviceNPR, 720);
  assert.equal(estimate(10000, 1).serviceNPR, 4800);
  assert.equal(estimate(20000, 1).serviceNPR, 9600);
  assert.ok(Math.abs(estimate(20000.01, 1).serviceNPR - 8000.004) < 0.00001);
});
test("breakdown totals use the revised service fees for representative orders", () => {
  for (const [price, weight, expected] of [[2499, 1, 5437.92], [10000, 2, 21136], [500, .25, 1968]]) {
    assert.ok(Math.abs(estimate(price, weight).totalNPR - expected) < .000001);
  }
});
test("admin defaults match the same service tiers", () => {
  assert.equal(getDefaultServiceRate(1499.99), "below_1500_1000");
  assert.equal(getDefaultServiceRate(1500), 30);
  assert.equal(getDefaultServiceRate(20000), 30);
  assert.equal(getDefaultServiceRate(20000.01), 25);
});
test("invalid and overflowing inputs do not return misleading amounts", () => {
  for (const price of [0, -1, NaN, Infinity]) assert.throws(() => estimate(price, 1), RangeError);
  for (const weight of [0, -1, NaN, Infinity]) assert.throws(() => estimate(1000, weight), RangeError);
  assert.throws(() => estimate(Number.MAX_VALUE, 1), RangeError);
});

const quotationCode = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/quotation-estimate.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const quotationModule = { exports: {} };
new Function("exports", "require", "module", quotationCode)(quotationModule.exports, name => name === "./storefront-estimate" ? mod.exports : require(name), quotationModule);
const { calculateAdminQuotation: quote, commissionOptions } = quotationModule.exports;

test("admin quotes round NPR values and support retained manual rates", () => {
  const result = quote(2499.99, 30);
  assert.equal(result.productNPR, 4000);
  assert.equal(result.serviceNPR, 1200);
  assert.equal(result.totalNPR, 5200);
  assert.equal(quote(1000, "below_1500_1000").totalNPR, 2600);
  assert.equal(quote(21000, 25).totalNPR, 42000);
});
test("admin messages preserve the price and disclose additional courier charges", () => {
  for (const rate of [30, "below_1500_1000"]) {
    const result = quote(1000.25, rate);
    assert.match(result.message, /INR 1,000\.25/);
    assert.match(result.message, /\*TOTAL = NPR .+\* \+ courier charge/);
    assert.match(result.message, /Courier charge is additional/);
  }
});
test("removed flat NPR 600, 700 and 800 fees cannot be selected or calculated", () => {
  assert.deepEqual(commissionOptions.filter(option => typeof option.value === "string").map(option => option.label), ["Flat NPR 1,000"]);
  assert.throws(() => quote(1000, "below_1500_600"), RangeError);
  assert.throws(() => quote(1000, "below_1500_700"), RangeError);
  assert.throws(() => quote(1000, "below_1500_800"), RangeError);
});
test("admin quotations reject invalid prices and numeric overflow", () => {
  for (const amount of [0, -1, NaN, Infinity, Number.MAX_VALUE]) assert.throws(() => quote(amount, 30), RangeError);
});
