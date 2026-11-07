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
  const message = requestMessage({ title: "★ *New Order Request*", deliveryLocation: "Balkumari Kathmandu", mobile: "+9779817254118", cartUrl: "https://www.parcelsewa.com/cart?9817254118&t=1&k=2",
    items: [{ productUrl: "https://amzn.in/d/026pcloo", quantity: 1, details: [] }, { productUrl: "https://amzn.in/d/09PmcqYW", quantity: 1, details: [{ type: "size", label: "Size", value: "M" }] }] });
  assert.equal(message, [
    "★ *New Order Request*", "", "*1.* https://amzn.in/d/026pcloo", "    ▪ Qty: 1", "", "*2.* https://amzn.in/d/09PmcqYW", "    ▪ Qty: 1", "    • Size: M",
    "", "⌂ *Delivery Address:* Balkumari Kathmandu", "☎ *Customer WhatsApp:* +9779817254118", "", "✎ *Add, remove or edit products:* https://www.parcelsewa.com/cart?9817254118&t=1&k=2",
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
  const message = requestMessage({ title: "★ *New Order Request*", name: "Sita Sharma", deliveryLocation: "Balkumari Kathmandu", mobile: "+9779817254118", items: [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [] }] });
  assert.match(message, /\n\n☺ \*Name:\* Sita Sharma\n⌂ \*Delivery Address:\* Balkumari Kathmandu\n/);
});

test("the WhatsApp message uses only symbols that survive a wa.me link (no emoji outside the basic range)", () => {
  const message = requestMessage({ title: "★ *New Order Request*", name: "Sita", deliveryLocation: "Balkumari", mobile: "+9779817254118", notes: "Fast", cartUrl: "https://www.parcelsewa.com/cart?9817254118",
    offerNote: "★ *Festival offer requested:* yes", items: [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [{ type: "size", label: "Size", value: "M" }] }] });
  assert.equal([...message].some(ch => ch.codePointAt(0) > 0xffff || ch === "️"), false);
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

test("only the link is kept from text shared by store apps", () => {
  const { extractUrl, cleanItems } = load("cart");
  assert.equal(extractUrl("rt https://dl.flipkart.com/s/HpSDCsuuuN"), "https://dl.flipkart.com/s/HpSDCsuuuN");
  assert.equal(extractUrl("Take a look at this Makeup Brush Applicator on Flipkart https://dl.flipkart.com/s/HpSDCsuuuN"), "https://dl.flipkart.com/s/HpSDCsuuuN");
  assert.equal(extractUrl("Check this out! https://amzn.in/d/026pcloo."), "https://amzn.in/d/026pcloo");
  assert.equal(extractUrl("Myntra: Shirt (https://myntr.it/abc123)"), "https://myntr.it/abc123");
  assert.equal(extractUrl("https://www.amazon.in/dp/B0X?th=1&psc=1"), "https://www.amazon.in/dp/B0X?th=1&psc=1");
  assert.equal(extractUrl("  no link here  "), "no link here");
  assert.deepEqual(cleanItems([{ productUrl: "Look at this https://dl.flipkart.com/s/X1", quantity: 1 }]), [{ productUrl: "https://dl.flipkart.com/s/X1", quantity: 1, details: [] }]);
});

test("the team's price and picture stay with a product while its link is unchanged", () => {
  const { mergeItems, itemsOf } = load("cart");
  const cart = [{ productUrl: "https://amzn.in/d/a", quantity: 1, details: [], priceInr: 999, imageUrl: "https://m.media-amazon.com/a.jpg" }];
  assert.deepEqual(mergeItems(cart, [{ productUrl: "https://amzn.in/d/a", quantity: 3, details: [] }]),
    [{ productUrl: "https://amzn.in/d/a", quantity: 3, details: [], priceInr: 999, imageUrl: "https://m.media-amazon.com/a.jpg" }]);
  assert.equal(itemsOf({ items: cart })[0].imageUrl, "https://m.media-amazon.com/a.jpg");
});

test("a new order uses the cart's pictures in the orders page's layout", () => {
  const { orderProducts } = load("cart");
  assert.deepEqual(orderProducts([
    { productUrl: "https://amzn.in/d/a", quantity: 2, details: [], imageUrl: "https://img/a.jpg" },
    { productUrl: "https://amzn.in/d/b", quantity: 1, details: [] },
  ]), {
    productUrls: ["https://img/a.jpg", "https://amzn.in/d/b"],
    productPageUrls: ["https://amzn.in/d/a", "https://amzn.in/d/b"],
    productItems: [{ url: "https://img/a.jpg", quantity: "2" }, { url: "https://amzn.in/d/b", quantity: "1" }],
  });
});

test("updating an order keeps each remaining product's picture and received tick", () => {
  const { syncOrderProducts } = load("cart");
  const order = {
    productUrls: ["https://img/a.jpg", "https://amzn.in/d/b", "https://img/c.jpg"],
    productPageUrls: ["https://amzn.in/d/a", "https://amzn.in/d/b", "https://amzn.in/d/c"],
    productItems: [
      { url: "https://img/a.jpg", quantity: "1", checked: true, checkedAt: "t1" },
      { url: "https://amzn.in/d/b", quantity: "1" },
      { url: "https://img/c.jpg", quantity: "1", checked: true },
    ],
  };
  const cart = [
    { productUrl: "https://amzn.in/d/new", quantity: 1, details: [] },
    { productUrl: "https://amzn.in/d/a", quantity: 3, details: [] },
    { productUrl: "https://amzn.in/d/b", quantity: 1, details: [], imageUrl: "https://img/b.jpg" },
  ];
  assert.deepEqual(syncOrderProducts(order, cart), {
    productUrls: ["https://amzn.in/d/new", "https://img/a.jpg", "https://img/b.jpg"],
    productPageUrls: ["https://amzn.in/d/new", "https://amzn.in/d/a", "https://amzn.in/d/b"],
    productItems: [
      { url: "https://amzn.in/d/new", quantity: "1" },
      { url: "https://img/a.jpg", quantity: "3", checked: true, checkedAt: "t1" },
      { url: "https://img/b.jpg", quantity: "1" },
    ],
  });
});

test("older orders without productPageUrls are matched by their product links", () => {
  const { syncOrderProducts } = load("cart");
  const order = { productUrls: ["https://amzn.in/d/a"], productItems: [{ url: "https://amzn.in/d/a", quantity: "1", checked: true }] };
  assert.deepEqual(syncOrderProducts(order, [{ productUrl: "https://amzn.in/d/a", quantity: 2, details: [] }]).productItems,
    [{ url: "https://amzn.in/d/a", quantity: "2", checked: true }]);
});

test("customers see 'ordered' but not the order id; prices only once quoted", () => {
  const { toCartRequest } = load("cart");
  const data = { requestId: "PS-R-X", createdAt: 1000, items: [{ productUrl: "https://a.in/1", quantity: 1, details: [], priceInr: 500 }], orderId: "o1", orderSyncedAt: 2000 };
  const customer = toCartRequest("r1", data, false);
  assert.equal(customer.ordered, true);
  assert.equal(customer.orderId, undefined);
  assert.equal(customer.items[0].priceInr, undefined);
  const admin = toCartRequest("r1", data, true);
  assert.equal(admin.orderId, "o1");
  assert.equal(admin.orderSyncedAt, 2000);
  assert.equal(toCartRequest("r1", { ...data, quote: { rate: 30, totalNPR: 1, quotedAt: 3 } }, false).items[0].priceInr, 500);
});

test("carts hide cancelled requests, and customers only see the last 7 days", () => {
  const { visibleRequests } = load("cart");
  const now = Date.now(), day = 86_400_000;
  const docs = [
    { id: "new", data: { createdAt: now - day, items: [] } },
    { id: "old", data: { createdAt: now - 8 * day, items: [] } },
    { id: "gone", data: { createdAt: now - day / 2, items: [], cancelled: true } },
  ];
  assert.deepEqual(visibleRequests(docs, false).map(r => r.id), ["new"]);
  assert.deepEqual(visibleRequests(docs, true).map(r => r.id), ["new", "old"]);
});

test("dates show in Nepal time (UTC+5:45)", () => {
  const { nepalDate } = load("cart");
  assert.equal(nepalDate(Date.UTC(2026, 10, 7, 0, 0), true).replace(/\s/g, " "), "7 Nov, 5:45 am");
});

test("saving a cart recalculates the quotation from the known prices", () => {
  const { refreshQuote } = load("cart");
  const quote = { rate: 30, rateAuto: true, totalNPR: 1, advance: 500, quotedAt: 1 };
  const items = [{ productUrl: "https://a.in/1", quantity: 2, details: [], priceInr: 1299 }, { productUrl: "https://a.in/2", quantity: 1, details: [], priceInr: 799 }];
  assert.deepEqual(refreshQuote(quote, items, 99), { rate: 30, rateAuto: true, totalNPR: 7066, advance: 500, quotedAt: 99 });
});

test("an automatic service fee is picked again; a chosen one is kept", () => {
  const { refreshQuote } = load("cart");
  const cheap = [{ productUrl: "https://a.in/1", quantity: 1, details: [], priceInr: 1000 }];
  assert.equal(refreshQuote({ rate: 30, rateAuto: true, totalNPR: 1 }, cheap, 0).rate, "below_1500_1000");
  assert.equal(refreshQuote({ rate: 30, rateAuto: true, totalNPR: 1 }, cheap, 0).totalNPR, 2600);
  assert.equal(refreshQuote({ rate: 25, totalNPR: 1 }, cheap, 0).rate, 25);
});

test("a new product without a price clears the quotation instead of guessing", () => {
  const { refreshQuote } = load("cart");
  assert.equal(refreshQuote({ rate: 30, totalNPR: 1 }, [{ productUrl: "https://a.in/1", quantity: 1, details: [], priceInr: 999 }, { productUrl: "https://a.in/new", quantity: 1, details: [] }], 0), null);
});

test("each product is marked against the confirmed order", () => {
  const { orderMarkOf, productsInOrder } = load("cart");
  const ordered = productsInOrder({
    productUrls: ["https://img/a.jpg", "https://amzn.in/d/b"],
    productPageUrls: ["https://amzn.in/d/a", "https://amzn.in/d/b"],
    productItems: [{ url: "https://img/a.jpg", quantity: "2" }, { url: "https://amzn.in/d/b", quantity: "1" }],
  });
  assert.deepEqual(ordered, [{ productUrl: "https://amzn.in/d/a", quantity: 2 }, { productUrl: "https://amzn.in/d/b", quantity: 1 }]);
  assert.equal(orderMarkOf("https://amzn.in/d/a", 2, ordered), "ordered");
  assert.equal(orderMarkOf("https://amzn.in/d/b", 3, ordered), "changed");
  assert.equal(orderMarkOf("https://amzn.in/d/c", 1, ordered), "new");
  assert.deepEqual(productsInOrder({ productUrls: ["https://amzn.in/d/x"] }), [{ productUrl: "https://amzn.in/d/x", quantity: 1 }]);
});

test("the order is compared with the cart by contents", () => {
  const { orderDifferences } = load("cart");
  const order = {
    name: "Indira Raut", address: "Barahchetra, Prakashpur", notes: "", storeName: "Flipkart", commission: "30%",
    totalAmount: 11541, advancePayment: 0,
    productUrls: ["https://img/a.jpg", "https://dl.flipkart.com/s/b"], productPageUrls: ["https://dl.flipkart.com/s/a", "https://dl.flipkart.com/s/b"],
    productItems: [{ url: "https://img/a.jpg", quantity: "1", checked: true }, { url: "https://dl.flipkart.com/s/b", quantity: "1" }],
  };
  const wanted = {
    name: "Indira Raut ", address: "Barahchetra, Prakashpur", notes: "", storeName: "Flipkart", commission: "30%", totalAmount: 11541, advancePayment: 0,
    items: [{ productUrl: "https://dl.flipkart.com/s/a", quantity: 1, details: [] }, { productUrl: "https://dl.flipkart.com/s/b", quantity: 1, details: [] }],
  };
  assert.deepEqual(orderDifferences(order, wanted), []);
  assert.deepEqual(orderDifferences(order, { ...wanted, totalAmount: 12000, items: [...wanted.items, { productUrl: "https://dl.flipkart.com/s/c", quantity: 1, details: [] }] }), ["Products", "Total"]);
});

test("a saved detail in Firestore's field order compares equal to the editor's", () => {
  const { canonicalItems } = load("cart");
  const fromFirestore = [{ productUrl: "https://amzn.in/d/b", quantity: 1, details: [{ label: "Size", type: "size", value: "M" }] }];
  const fromEditor = [{ productUrl: "https://amzn.in/d/b", quantity: 1, details: [{ type: "size", label: "Size", value: "M" }] }];
  assert.equal(JSON.stringify(canonicalItems(fromFirestore)), JSON.stringify(canonicalItems(fromEditor)));
});

test("Myntra checkout links are looked up on the product page", () => {
  const { productPageUrl } = load("product-page-url");
  assert.equal(productPageUrl("https://www.myntra.com/tights/blissclub/blissclub-high-waisted-flare-pants-with-1-back-pocket/25856156/buy"),
    "https://www.myntra.com/tights/blissclub/blissclub-high-waisted-flare-pants-with-1-back-pocket/25856156");
  assert.equal(productPageUrl("https://www.myntra.com/tights/blissclub/x/25856156"), "https://www.myntra.com/tights/blissclub/x/25856156");
  const amazon = "https://www.amazon.in/dp/B09JVNZVH3/?_encoding=UTF8&ref_=pd_hp";
  assert.equal(productPageUrl(amazon), amazon);
  assert.equal(productPageUrl("not a link"), "not a link");
});

test("the cart's Claude price lookup starts a backend job and checks back until it's done", async () => {
  const { fetchProductPriceViaClaude } = load("claude-price-client");
  const calls = [];
  let polls = 0;
  const realFetch = global.fetch, realTimeout = global.setTimeout;
  global.setTimeout = (fn) => realTimeout(fn, 0);
  global.fetch = async (url, init) => {
    calls.push(`${init?.method || "GET"} ${url}`);
    if (url === "/api/cart/price") return new Response(JSON.stringify({ jobId: "job-12345678" }), { status: 202 });
    polls++;
    return polls < 3 ? new Response(JSON.stringify({ status: "pending" }), { status: 202 })
      : new Response(JSON.stringify({ price: 1299, title: "Pants", note: "From the page" }), { status: 200 });
  };
  try {
    assert.deepEqual(await fetchProductPriceViaClaude("https://www.myntra.com/x/25856156/buy"), { price: 1299, note: "From the page" });
    assert.deepEqual(calls, ["POST /api/cart/price", "GET /api/cart/price?job=job-12345678", "GET /api/cart/price?job=job-12345678", "GET /api/cart/price?job=job-12345678"]);
    global.fetch = async () => new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the backend." }), { status: 503 });
    assert.deepEqual(await fetchProductPriceViaClaude("https://a.in/x"), { price: null, note: "ANTHROPIC_API_KEY is not set on the backend." });
  } finally {
    global.fetch = realFetch;
    global.setTimeout = realTimeout;
  }
});
