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
    return mod.exports;
};
const commission = load("commission.ts", require);
const stats = load("order-stats.ts", id => (id === "./commission" ? commission : require(id)));

const ts_ = d => ({ toDate: () => new Date(d) }); // Firestore Timestamp stand-in
const order = (id, o = {}) => stats.normalizeOrder(id, {
    name: "Asha", mobile: "9800000001", storeName: "Amazon", commission: "25%", totalAmount: 13000, advancePayment: 3000,
    deliveryStatus: false, createdAt: ts_("2026-09-10T08:00:00"), ...o,
});

test("profit matches the dashboard formula (percentage, flat, unknown)", () => {
    const pct = stats.economics(13000, "25%");
    assert.equal(Math.round(pct.base), 10400);
    assert.equal(Math.round(pct.commissionEarned), 2600);
    assert.equal(Math.round(pct.border), 728);
    assert.equal(Math.round(pct.profit), 1872);
    const flat = stats.economics(3000, "Flat NPR 700");
    assert.equal(flat.base, 2300);
    assert.equal(Math.round(flat.profit), 539);
    assert.deepEqual(stats.economics(3600, "0%"), { base: 3600, commissionEarned: 0, border: 0, profit: 0 });
});

test("status, links and dates are normalised", () => {
    assert.equal(order("a").status, "pending");
    assert.equal(order("b", { deliveryStatus: true }).status, "delivered");
    assert.equal(order("c", { deliveryStatus: "cancelled" }).status, "cancelled");
    const withLinks = order("d", {
        productPageUrls: ["https://www.amazon.in/dp/B1", "https://dl.flipkart.com/s/x"],
        productUrls: ["https://m.media-amazon.com/images/I/a.jpg", "https://www.amazon.in/dp/B2"],
        hasError: true,
    });
    assert.deepEqual(withLinks.hosts.sort(), ["amazon.in", "dl.flipkart.com"]);
    assert.equal(withLinks.flagged, true);
    assert.equal(order("e", { createdAt: undefined }).createdAt, null);
});

test("filters combine store, status, payment, search and a date range", () => {
    const orders = [
        order("1", { storeName: "Amazon", createdAt: ts_("2026-09-05T10:00:00") }),
        order("2", { storeName: "Flipkart", deliveryStatus: true, advancePayment: 13000, createdAt: ts_("2026-09-20T10:00:00") }),
        order("3", { storeName: "Amazon", deliveryStatus: "cancelled", createdAt: ts_("2026-08-20T10:00:00"), name: "Bikash", mobile: "9811" }),
    ];
    const f = stats.emptyFilters;
    assert.equal(stats.applyFilters(orders, f()).length, 3);
    assert.deepEqual(stats.applyFilters(orders, { ...f(), stores: ["Amazon"] }).map(o => o.id), ["1", "3"]);
    assert.deepEqual(stats.applyFilters(orders, { ...f(), statuses: ["delivered"] }).map(o => o.id), ["2"]);
    assert.deepEqual(stats.applyFilters(orders, { ...f(), payment: "paid" }).map(o => o.id), ["2"]);
    assert.deepEqual(stats.applyFilters(orders, { ...f(), search: "bik" }).map(o => o.id), ["3"]);
    assert.deepEqual(stats.applyFilters(orders, { ...f(), search: "9811" }).map(o => o.id), ["3"]);
    const september = { ...f(), from: new Date("2026-09-01T00:00:00"), to: new Date("2026-10-01T00:00:00") };
    assert.deepEqual(stats.applyFilters(orders, september).map(o => o.id), ["1", "2"]);
    assert.deepEqual(stats.applyFilters(orders, { ...september, dateBasis: "delivered" }), []);
});

test("summary excludes cancelled orders from revenue and counts rates", () => {
    const orders = [
        order("1", { totalAmount: 10000 }),
        order("2", { totalAmount: 20000, deliveryStatus: true, advancePayment: 20000, createdAt: ts_("2026-09-01T00:00:00"), deliveryDate: ts_("2026-09-05T00:00:00") }),
        order("3", { totalAmount: 5000, deliveryStatus: "cancelled" }),
        order("4", { totalAmount: 4000, mobile: "9800000001" }),
    ];
    const s = stats.summarize(orders);
    assert.equal(s.orders, 4);
    assert.equal(s.active, 3);
    assert.equal(s.cancelled, 1);
    assert.equal(s.revenue, 34000);
    assert.equal(s.delivered, 1);
    assert.equal(Math.round(s.cancelRate), 25);
    assert.equal(Math.round(s.deliveryRate), 33);
    assert.equal(s.avgLeadDays, 4);
    assert.equal(s.outstanding, 10000 - 3000 + (4000 - 3000));
    assert.equal(s.customers, 1); // the three active orders share one mobile number
    assert.equal(s.repeatCustomers, 1);
});

test("time series fills empty buckets and previous range is the same length", () => {
    const orders = [
        order("1", { createdAt: ts_("2026-07-10T10:00:00"), totalAmount: 1000 }),
        order("2", { createdAt: ts_("2026-09-10T10:00:00"), totalAmount: 2000 }),
    ];
    const months = stats.timeSeries(orders, "month", "created");
    assert.equal(months.length, 3);
    assert.deepEqual(months.map(m => m.orders), [1, 0, 1]);
    const days = stats.timeSeries([orders[1]], "day", "created");
    assert.equal(days.length, 1);
    const prev = stats.previousRange(new Date("2026-09-01T00:00:00"), new Date("2026-10-01T00:00:00"));
    assert.equal(prev.to.getTime(), new Date("2026-09-01T00:00:00").getTime());
    assert.equal(prev.to.getTime() - prev.from.getTime(), new Date("2026-10-01T00:00:00").getTime() - new Date("2026-09-01T00:00:00").getTime());
    assert.equal(stats.previousRange(null, null), null);
});

test("breakdowns group, rank and bucket correctly", () => {
    const orders = [
        order("1", { storeName: "Amazon", totalAmount: 1500 }),
        order("2", { storeName: "Amazon", totalAmount: 8000 }),
        order("3", { storeName: "Flipkart", totalAmount: 30000 }),
        order("4", { storeName: "Flipkart", totalAmount: 99999, deliveryStatus: "cancelled" }),
    ];
    const stores = stats.groupBy(orders, o => o.store);
    assert.deepEqual(stores.map(g => [g.key, g.orders, g.revenue]), [["Flipkart", 1, 30000], ["Amazon", 2, 9500]]);
    const values = Object.fromEntries(stats.valueDistribution(orders).map(b => [b.label, b.orders]));
    assert.equal(values["< 2k"], 1);
    assert.equal(values["5–10k"], 1);
    assert.equal(values["20–40k"], 1);
    const customers = stats.topCustomers(orders);
    assert.equal(customers.length, 1);
    assert.equal(customers[0].orders, 3);
    const aging = stats.pendingAging([order("a", { createdAt: ts_("2026-08-01T00:00:00") }), order("b", { createdAt: ts_("2026-09-28T00:00:00") })], new Date("2026-10-01T00:00:00"));
    assert.deepEqual(aging.map(b => b.orders), [1, 0, 0, 1]);
});

test("insights and CSV export", () => {
    const orders = [order("1", { name: 'A "quoted" name', createdAt: ts_("2026-08-01T00:00:00") }), order("2", { createdAt: ts_("2026-09-01T00:00:00") })];
    const summary = stats.summarize(orders);
    const insights = stats.buildInsights(orders, summary, stats.timeSeries(orders, "month", "created"), "month", new Date("2026-10-01T00:00:00"));
    assert.ok(insights.some(text => text.startsWith("Best month")));
    assert.ok(insights.some(text => text.includes("older than 30 days")));
    const csv = stats.ordersToCsv(orders);
    assert.equal(csv.split("\n").length, 3);
    assert.ok(csv.includes('"A ""quoted"" name"'));
});

test("range presets cover the expected periods", () => {
    const now = new Date("2026-10-15T12:00:00");
    const month = stats.rangeFor("this-month", now);
    assert.equal(month.from.getMonth(), 9);
    assert.equal(month.to.getMonth(), 10);
    const last = stats.rangeFor("last-month", now);
    assert.equal(last.from.getMonth(), 8);
    assert.deepEqual(stats.rangeFor("all", now), { from: null, to: null });
    const thirty = stats.rangeFor("30d", now);
    assert.equal(Math.round((thirty.to - thirty.from) / 86400000), 30);
});

test("outstanding nets out an overpaid pending order, like the dashboard", () => {
    const orders = [order("1", { totalAmount: 10000, advancePayment: 4000 }), order("2", { totalAmount: 5000, advancePayment: 7000 })];
    assert.equal(stats.summarize(orders).outstanding, 6000 - 2000);
    assert.equal(orders[1].remaining, 0); // the per-order figure never goes below zero
});

test("units, price-check accuracy and funnel", () => {
    const withItems = order("1", { productItems: [{ quantity: "2" }, { quantity: "1" }], productUrls: ["a", "b"], totalCheck: { diff: -500 } });
    assert.equal(withItems.units, 3);
    assert.equal(withItems.checkDiff, -500);
    assert.equal(order("2").checkDiff, null);
    const accuracy = stats.pricingAccuracy([withItems, order("3", { totalCheck: { diff: 50 } }), order("4", { totalCheck: { diff: 900 } }), order("5")]);
    assert.deepEqual(accuracy, { verified: 3, under: 1, over: 1, ok: 1 });
    const f = stats.funnel([order("1", { advancePayment: 0 }), order("2", { advancePayment: 13000, deliveryStatus: true }), order("3", { advancePayment: 500 }), order("4", { deliveryStatus: "cancelled" })]);
    assert.deepEqual(f.map(x => x.value), [3, 2, 1, 1]);
    assert.equal(Math.round(f[3].pct), 33);
});

test("delivery per person reports average days and on-time share", () => {
    const delivered = (id, who, days) => order(id, { deliveryStatus: true, deliveredBy: who, createdAt: ts_("2026-09-01T00:00:00"), deliveryDate: ts_(new Date(new Date("2026-09-01T00:00:00").getTime() + days * 86400000)) });
    const rows = stats.deliveryByPerson([delivered("1", "Ankush", 4), delivered("2", "Ankush", 12), delivered("3", "Bhola", 6), order("4")], 10);
    const ankush = rows.find(r => r.key === "Ankush");
    assert.equal(ankush.orders, 2);
    assert.equal(ankush.avgLead, 8);
    assert.equal(ankush.onTime, 50);
    assert.equal(rows.find(r => r.key === "Bhola").onTime, 100);
    assert.equal(stats.percentile([1, 2, 3, 4, 5], 50), 3);
    assert.equal(stats.percentile([], 50), null);
});

test("cumulative sales line up with the previous period and stop at today", () => {
    const from = new Date("2026-09-01T00:00:00"), to = new Date("2026-09-04T00:00:00");
    const current = [order("1", { totalAmount: 100, createdAt: ts_("2026-09-01T10:00:00") }), order("2", { totalAmount: 50, createdAt: ts_("2026-09-02T10:00:00") })];
    const previous = [order("3", { totalAmount: 70, createdAt: ts_("2026-08-30T10:00:00") })];
    const points = stats.cumulativeSales(current, previous, from, to, "created", new Date("2026-09-02T12:00:00"));
    assert.deepEqual(points.map(p => p.current), [100, 150, null]);
    assert.deepEqual(points.map(p => p.previous), [0, 70, 70]); // previous period starts Aug 29
    assert.equal(stats.bestDays(current, 1, "created")[0].revenue, 100);
});

test("growth, moving average and forecast", () => {
    const series = [100, 200, 0, 300].map((revenue, i) => ({ start: i, key: String(i), label: String(i), orders: 0, revenue, profit: 0, delivered: 0 }));
    assert.deepEqual(stats.growthSeries(series).map(g => g.growth), [null, 100, -100, null]);
    assert.deepEqual(stats.movingAverage([2, 4, 6, 8], 2), [null, 3, 5, 7]);
    const forecast = stats.linearForecast([10, 20, 30, 40], 2);
    assert.deepEqual(forecast.map(Math.round), [50, 60]);
    assert.deepEqual(stats.linearForecast([5, 5], 3), []);
    assert.ok(stats.linearForecast([40, 30, 20, 10], 3).every(v => v >= 0));
});

test("new vs returning customers, cohorts and concentration", () => {
    const all = [
        order("1", { mobile: "A", createdAt: ts_("2026-08-05T10:00:00") }),
        order("2", { mobile: "A", createdAt: ts_("2026-09-05T10:00:00") }),
        order("3", { mobile: "B", createdAt: ts_("2026-09-06T10:00:00"), totalAmount: 1000 }),
    ];
    const series = stats.timeSeries(all, "month", "created");
    const nr = stats.newVsReturning(all, all, series, "month");
    assert.deepEqual(nr.map(r => [r.newCustomers, r.returning]), [[1, 0], [1, 1]]);
    const cohorts = stats.cohortTable(all, 3, new Date("2026-09-20T00:00:00"));
    const august = cohorts.find(c => c.cohort.startsWith("Aug"));
    assert.equal(august.size, 1);
    assert.deepEqual(august.retention, [100, 100, null]);
    const c = stats.concentration(all);
    assert.equal(c.customers, 2);
    assert.equal(c.top[0].name, "Asha");
    assert.ok(c.top10Share > 50);
});

test("nextBuckets names the periods after a bucket", () => {
    const sep = new Date("2026-09-01T00:00:00").getTime();
    const months = stats.nextBuckets(sep, "month", 3);
    assert.deepEqual(months.map(b => b.label), ["Oct 26", "Nov 26", "Dec 26"]);
    assert.equal(months[0].start, new Date("2026-10-01T00:00:00").getTime());
    const weeks = stats.nextBuckets(new Date("2026-09-07T00:00:00").getTime(), "week", 2);
    assert.equal(weeks[0].start, new Date("2026-09-14T00:00:00").getTime());
});
