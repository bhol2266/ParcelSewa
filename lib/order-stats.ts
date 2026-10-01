// Pure statistics helpers for the admin stats page. No React and no Firestore here, so they are easy to test.
import { parseFlatCommission } from "./commission";

export type OrderStatus = "pending" | "delivered" | "cancelled";
export type Granularity = "day" | "week" | "month";
export type DateBasis = "created" | "delivered";
export type PaymentFilter = "all" | "paid" | "partial" | "unpaid";

// 7% of the product price is the border cost, the same rule the admin dashboard uses.
export const BORDER_RATE = 0.07;

export interface StatOrder {
    id: string;
    name: string;
    mobile: string;
    store: string;
    commission: string;
    total: number;
    advance: number;
    remaining: number;
    status: OrderStatus;
    createdAt: Date | null;
    deliveryDate: Date | null;
    deliveredBy: string;
    flagged: boolean;
    productCount: number;
    /** Units ordered, from the item quantities (falls back to the number of links). */
    units: number;
    /** Saved result of the "Verify total" check: order total minus the verified total, or null if never verified. */
    checkDiff: number | null;
    hosts: string[];
    /** Product price before commission, in NPR (total minus commission). */
    base: number;
    commissionEarned: number;
    border: number;
    profit: number;
}

type Raw = Record<string, unknown>;

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate();
    return null;
}

function parsePercent(commission: unknown): number {
    if (commission === null || commission === undefined) return 0;
    if (typeof commission === "number") return Number.isFinite(commission) ? commission / 100 : 0;
    const parsed = parseFloat(String(commission).replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed / 100 : 0;
}

/** Splits an order total into product price, commission and border cost. */
export function economics(total: number, commission: unknown) {
    const flat = parseFlatCommission(commission);
    if (flat !== null) {
        const base = total - flat;
        const border = base * BORDER_RATE;
        return { base, commissionEarned: flat, border, profit: flat - border };
    }
    const rate = parsePercent(commission);
    // An unknown or 0% commission cannot be split, so it adds no profit and no border cost.
    if (rate === 0) return { base: total, commissionEarned: 0, border: 0, profit: 0 };
    const base = total / (1 + rate);
    const commissionEarned = total - base;
    const border = base * BORDER_RATE;
    return { base, commissionEarned, border, profit: commissionEarned - border };
}

function hostOf(url: string): string | null {
    if (!/^https?:\/\//i.test(url)) return null;
    try {
        const { hostname, pathname } = new URL(url);
        if (/\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(pathname)) return null;
        if (/^(rukminim|images|assets|m\.media|cdn)/i.test(hostname)) return null;
        return hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}

function unitsOf(data: Raw): number {
    const items = (data.productItems as { quantity?: unknown }[]) || [];
    const units = items.reduce((total, item) => total + (Number(item?.quantity) > 0 ? Number(item.quantity) : 1), 0);
    return units || ((data.productUrls as unknown[]) || []).length;
}

function checkDiffOf(data: Raw): number | null {
    const raw = (data.totalCheck as { diff?: unknown } | undefined)?.diff;
    const diff = Number(raw);
    return raw !== undefined && raw !== null && Number.isFinite(diff) ? diff : null;
}

export function normalizeOrder(id: string, data: Raw): StatOrder {
    const total = Number(data.totalAmount) || 0;
    const advance = Number(data.advancePayment) || 0;
    const commission = String(data.commission ?? "");
    const status: OrderStatus = data.deliveryStatus === "cancelled" ? "cancelled" : data.deliveryStatus === true ? "delivered" : "pending";
    const links = [...((data.productPageUrls as unknown[]) || []), ...((data.productUrls as unknown[]) || [])];
    const hosts = [...new Set(links.map(link => (typeof link === "string" ? hostOf(link) : null)).filter((host): host is string => host !== null))];
    return {
        id,
        name: String(data.name ?? "").trim() || "Unknown",
        mobile: String(data.mobile ?? "").trim(),
        store: String(data.storeName ?? "").trim() || "Unknown",
        commission,
        total,
        advance,
        remaining: Math.max(0, total - advance),
        status,
        createdAt: toDate(data.createdAt),
        deliveryDate: toDate(data.deliveryDate),
        deliveredBy: String(data.deliveredBy ?? "").trim(),
        flagged: data.hasError === true,
        productCount: ((data.productUrls as unknown[]) || []).length,
        units: unitsOf(data),
        checkDiff: checkDiffOf(data),
        hosts,
        ...economics(total, commission),
    };
}

// ── Filtering ────────────────────────────────────────────────────────────────

export interface Filters {
    from: Date | null;
    to: Date | null;
    dateBasis: DateBasis;
    stores: string[];
    statuses: OrderStatus[];
    commissions: string[];
    deliveredBy: string[];
    payment: PaymentFilter;
    flaggedOnly: boolean;
    search: string;
}

export const emptyFilters = (): Filters => ({
    from: null, to: null, dateBasis: "created", stores: [], statuses: [], commissions: [],
    deliveredBy: [], payment: "all", flaggedOnly: false, search: "",
});

export function paymentState(order: StatOrder): Exclude<PaymentFilter, "all"> {
    if (order.total > 0 && order.advance >= order.total) return "paid";
    return order.advance > 0 ? "partial" : "unpaid";
}

function dateOf(order: StatOrder, basis: DateBasis): Date | null {
    return basis === "delivered" ? order.deliveryDate : order.createdAt;
}

export function applyFilters(orders: StatOrder[], filters: Filters): StatOrder[] {
    const search = filters.search.trim().toLowerCase();
    return orders.filter(order => {
        if (filters.from || filters.to) {
            const date = dateOf(order, filters.dateBasis);
            if (!date) return false;
            if (filters.from && date < filters.from) return false;
            if (filters.to && date >= filters.to) return false;
        }
        if (filters.stores.length && !filters.stores.includes(order.store)) return false;
        if (filters.statuses.length && !filters.statuses.includes(order.status)) return false;
        if (filters.commissions.length && !filters.commissions.includes(order.commission)) return false;
        if (filters.deliveredBy.length && !filters.deliveredBy.includes(order.deliveredBy || "—")) return false;
        if (filters.payment !== "all" && paymentState(order) !== filters.payment) return false;
        if (filters.flaggedOnly && !order.flagged) return false;
        if (search && !(order.name.toLowerCase().includes(search) || order.mobile.includes(search))) return false;
        return true;
    });
}

// ── Summary ──────────────────────────────────────────────────────────────────

export interface Summary {
    orders: number;
    active: number;
    delivered: number;
    pending: number;
    cancelled: number;
    revenue: number;
    profit: number;
    border: number;
    commission: number;
    avgOrder: number;
    margin: number;
    collected: number;
    outstanding: number;
    deliveryRate: number;
    cancelRate: number;
    avgLeadDays: number | null;
    customers: number;
    repeatCustomers: number;
    repeatRate: number;
    flagged: number;
}

const DAY = 86400000;

export const customerKey = (order: StatOrder) => order.mobile || order.name;

export function summarize(list: StatOrder[]): Summary {
    const active = list.filter(order => order.status !== "cancelled");
    const delivered = active.filter(order => order.status === "delivered");
    const pending = active.filter(order => order.status === "pending");
    const sum = (items: StatOrder[], pick: (order: StatOrder) => number) => items.reduce((total, order) => total + pick(order), 0);
    const revenue = sum(active, order => order.total);
    const profit = sum(active, order => order.profit);
    const leads = delivered
        .filter(order => order.createdAt && order.deliveryDate)
        .map(order => ((order.deliveryDate as Date).getTime() - (order.createdAt as Date).getTime()) / DAY)
        .filter(days => days >= 0);
    const perCustomer = new Map<string, number>();
    for (const order of active) perCustomer.set(customerKey(order), (perCustomer.get(customerKey(order)) || 0) + 1);
    const repeatCustomers = [...perCustomer.values()].filter(count => count > 1).length;
    return {
        orders: list.length,
        active: active.length,
        delivered: delivered.length,
        pending: pending.length,
        cancelled: list.length - active.length,
        revenue,
        profit,
        border: sum(active, order => order.border),
        commission: sum(active, order => order.commissionEarned),
        avgOrder: active.length ? revenue / active.length : 0,
        margin: revenue ? (profit / revenue) * 100 : 0,
        collected: sum(active, order => Math.min(order.advance, order.total)),
        // Like the dashboard's "Remaining payment": an overpaid pending order reduces the amount still to collect.
        outstanding: sum(pending, order => order.total - order.advance),
        deliveryRate: active.length ? (delivered.length / active.length) * 100 : 0,
        cancelRate: list.length ? ((list.length - active.length) / list.length) * 100 : 0,
        avgLeadDays: leads.length ? leads.reduce((total, days) => total + days, 0) / leads.length : null,
        customers: perCustomer.size,
        repeatCustomers,
        repeatRate: perCustomer.size ? (repeatCustomers / perCustomer.size) * 100 : 0,
        flagged: list.filter(order => order.flagged).length,
    };
}

/** The period of the same length that ends where [from, to) starts, for "vs previous period" comparisons. */
export function previousRange(from: Date | null, to: Date | null): { from: Date; to: Date } | null {
    if (!from || !to) return null;
    const length = to.getTime() - from.getTime();
    return length > 0 ? { from: new Date(from.getTime() - length), to: new Date(from.getTime()) } : null;
}

// ── Time series ──────────────────────────────────────────────────────────────

export interface SeriesPoint {
    /** Start of the bucket in ms, so other series can line up with it. */
    start: number;
    key: string;
    label: string;
    orders: number;
    revenue: number;
    profit: number;
    delivered: number;
}

function startOfBucket(date: Date, granularity: Granularity): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (granularity === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
    if (granularity === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d;
}

function nextBucket(date: Date, granularity: Granularity): Date {
    const d = new Date(date);
    if (granularity === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + (granularity === "week" ? 7 : 1));
    return d;
}

function bucketLabel(date: Date, granularity: Granularity): string {
    if (granularity === "month") return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
    return date.toLocaleString("en-US", { day: "numeric", month: "short" });
}

export function timeSeries(list: StatOrder[], granularity: Granularity, basis: DateBasis): SeriesPoint[] {
    const buckets = new Map<number, SeriesPoint>();
    const dated = list
        .filter(order => order.status !== "cancelled")
        .map(order => ({ order, date: dateOf(order, basis) }))
        .filter((entry): entry is { order: StatOrder; date: Date } => entry.date !== null);
    if (!dated.length) return [];
    for (const { order, date } of dated) {
        const start = startOfBucket(date, granularity);
        const point = buckets.get(start.getTime()) || { start: start.getTime(), key: start.toISOString(), label: bucketLabel(start, granularity), orders: 0, revenue: 0, profit: 0, delivered: 0 };
        point.orders += 1;
        point.revenue += order.total;
        point.profit += order.profit;
        if (order.status === "delivered") point.delivered += 1;
        buckets.set(start.getTime(), point);
    }
    // Fill empty buckets so quiet periods show as zero instead of disappearing.
    const times = [...buckets.keys()].sort((a, b) => a - b);
    const result: SeriesPoint[] = [];
    for (let cursor = new Date(times[0]); cursor.getTime() <= times[times.length - 1] && result.length < 400; cursor = nextBucket(cursor, granularity)) {
        result.push(buckets.get(cursor.getTime()) || { start: cursor.getTime(), key: cursor.toISOString(), label: bucketLabel(cursor, granularity), orders: 0, revenue: 0, profit: 0, delivered: 0 });
    }
    return result;
}

// ── Breakdowns ───────────────────────────────────────────────────────────────

export interface Group {
    key: string;
    orders: number;
    revenue: number;
    profit: number;
    avg: number;
}

export function groupBy(list: StatOrder[], keyOf: (order: StatOrder) => string): Group[] {
    const groups = new Map<string, Group>();
    for (const order of list) {
        if (order.status === "cancelled") continue;
        const key = keyOf(order);
        const group = groups.get(key) || { key, orders: 0, revenue: 0, profit: 0, avg: 0 };
        group.orders += 1;
        group.revenue += order.total;
        group.profit += order.profit;
        groups.set(key, group);
    }
    return [...groups.values()].map(group => ({ ...group, avg: group.orders ? group.revenue / group.orders : 0 })).sort((a, b) => b.revenue - a.revenue);
}

export function weekdayCounts(list: StatOrder[]): { label: string; orders: number; revenue: number }[] {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows = labels.map(label => ({ label, orders: 0, revenue: 0 }));
    for (const order of list) {
        if (order.status === "cancelled" || !order.createdAt) continue;
        const row = rows[(order.createdAt.getDay() + 6) % 7];
        row.orders += 1;
        row.revenue += order.total;
    }
    return rows;
}

export function hourCounts(list: StatOrder[]): { label: string; orders: number }[] {
    const rows = Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}h`, orders: 0 }));
    for (const order of list) {
        if (order.status !== "cancelled" && order.createdAt) rows[order.createdAt.getHours()].orders += 1;
    }
    return rows;
}

const VALUE_BUCKETS: [string, number, number][] = [
    ["< 2k", 0, 2000], ["2–5k", 2000, 5000], ["5–10k", 5000, 10000],
    ["10–20k", 10000, 20000], ["20–40k", 20000, 40000], ["40k+", 40000, Infinity],
];

export function valueDistribution(list: StatOrder[]): { label: string; orders: number }[] {
    return VALUE_BUCKETS.map(([label, min, max]) => ({
        label,
        orders: list.filter(order => order.status !== "cancelled" && order.total >= min && order.total < max).length,
    }));
}

/** How long undelivered orders have been waiting. */
export function pendingAging(list: StatOrder[], now = new Date()): { label: string; orders: number; amount: number }[] {
    const buckets: [string, number, number][] = [["0–7 days", 0, 8], ["8–14 days", 8, 15], ["15–30 days", 15, 31], ["30+ days", 31, Infinity]];
    return buckets.map(([label, min, max]) => {
        const matching = list.filter(order => {
            if (order.status !== "pending" || !order.createdAt) return false;
            const age = (now.getTime() - order.createdAt.getTime()) / DAY;
            return age >= min && age < max;
        });
        return { label, orders: matching.length, amount: matching.reduce((total, order) => total + order.remaining, 0) };
    });
}

export function leadTimeDistribution(list: StatOrder[]): { label: string; orders: number }[] {
    const buckets: [string, number, number][] = [["≤ 3d", 0, 3.0001], ["4–7d", 3.0001, 7.0001], ["8–14d", 7.0001, 14.0001], ["15–30d", 14.0001, 30.0001], ["30d+", 30.0001, Infinity]];
    const leads = list
        .filter(order => order.status === "delivered" && order.createdAt && order.deliveryDate)
        .map(order => ((order.deliveryDate as Date).getTime() - (order.createdAt as Date).getTime()) / DAY)
        .filter(days => days >= 0);
    return buckets.map(([label, min, max]) => ({ label, orders: leads.filter(days => days >= min && days < max).length }));
}

export interface Customer {
    key: string;
    name: string;
    mobile: string;
    orders: number;
    revenue: number;
    profit: number;
    last: Date | null;
}

export function topCustomers(list: StatOrder[]): Customer[] {
    const customers = new Map<string, Customer>();
    for (const order of list) {
        if (order.status === "cancelled") continue;
        const key = customerKey(order);
        const customer = customers.get(key) || { key, name: order.name, mobile: order.mobile, orders: 0, revenue: 0, profit: 0, last: null };
        customer.orders += 1;
        customer.revenue += order.total;
        customer.profit += order.profit;
        if (order.createdAt && (!customer.last || order.createdAt > customer.last)) customer.last = order.createdAt;
        customers.set(key, customer);
    }
    return [...customers.values()];
}

export function topHosts(list: StatOrder[]): { host: string; orders: number; revenue: number }[] {
    const hosts = new Map<string, { host: string; orders: number; revenue: number }>();
    for (const order of list) {
        if (order.status === "cancelled") continue;
        for (const host of order.hosts) {
            const row = hosts.get(host) || { host, orders: 0, revenue: 0 };
            row.orders += 1;
            row.revenue += order.total / order.hosts.length; // split an order's value across its sites
            hosts.set(host, row);
        }
    }
    return [...hosts.values()].sort((a, b) => b.orders - a.orders);
}

// ── Insights ─────────────────────────────────────────────────────────────────

export function buildInsights(list: StatOrder[], summary: Summary, series: SeriesPoint[], granularity: Granularity, now = new Date()): string[] {
    const insights: string[] = [];
    const money = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
    if (series.length > 1) {
        const best = series.reduce((a, b) => (b.revenue > a.revenue ? b : a));
        if (best.revenue > 0) insights.push(`Best ${granularity}: ${best.label} with ${money(best.revenue)} from ${best.orders} orders.`);
    }
    const stores = groupBy(list, order => order.store);
    if (stores.length && summary.revenue) {
        insights.push(`${stores[0].key} brings the most revenue (${Math.round((stores[0].revenue / summary.revenue) * 100)}% of the total).`);
    }
    const oldPending = list.filter(order => order.status === "pending" && order.createdAt && (now.getTime() - order.createdAt.getTime()) / DAY > 30);
    if (oldPending.length) insights.push(`${oldPending.length} pending order${oldPending.length > 1 ? "s are" : " is"} older than 30 days (${money(oldPending.reduce((total, order) => total + order.remaining, 0))} still to collect).`);
    if (summary.repeatCustomers) insights.push(`${summary.repeatCustomers} customer${summary.repeatCustomers > 1 ? "s have" : " has"} ordered more than once (${Math.round(summary.repeatRate)}% repeat rate).`);
    const flat = list.filter(order => order.status !== "cancelled" && parseFlatCommission(order.commission) !== null);
    if (flat.length) insights.push(`${flat.length} flat-commission order${flat.length > 1 ? "s" : ""} earned ${money(flat.reduce((total, order) => total + order.profit, 0))} profit in total.`);
    if (summary.flagged) insights.push(`${summary.flagged} order${summary.flagged > 1 ? "s are" : " is"} flagged with an error.`);
    if (summary.avgLeadDays !== null) insights.push(`Delivered orders took ${summary.avgLeadDays.toFixed(1)} days on average from order to delivery.`);
    return insights;
}

// ── Date ranges ──────────────────────────────────────────────────────────────

export type RangePreset = "this-month" | "last-month" | "30d" | "90d" | "this-year" | "all" | "custom";

export function rangeFor(preset: RangePreset, now = new Date()): { from: Date | null; to: Date | null } {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(startOfDay.getTime() + DAY);
    switch (preset) {
        case "this-month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
        case "last-month": return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
        case "30d": return { from: new Date(tomorrow.getTime() - 30 * DAY), to: tomorrow };
        case "90d": return { from: new Date(tomorrow.getTime() - 90 * DAY), to: tomorrow };
        case "this-year": return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear() + 1, 0, 1) };
        default: return { from: null, to: null };
    }
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function ordersToCsv(list: StatOrder[]): string {
    const header = ["Date", "Customer", "Mobile", "Store", "Commission", "Total", "Paid", "Remaining", "Status", "Delivered on", "Delivered by", "Profit", "Border cost", "Flagged"];
    const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");
    const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = list.map(order => [
        day(order.createdAt), order.name, order.mobile, order.store, order.commission, order.total, order.advance, order.remaining,
        order.status, day(order.deliveryDate), order.deliveredBy, Math.round(order.profit), Math.round(order.border), order.flagged ? "yes" : "",
    ]);
    return [header, ...rows].map(row => row.map(cell).join(",")).join("\n");
}

// ── Sales ────────────────────────────────────────────────────────────────────

export function percentile(values: number[], p: number): number | null {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const position = ((sorted.length - 1) * p) / 100;
    const lower = Math.floor(position), upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function leadDays(order: StatOrder): number | null {
    if (order.status !== "delivered" || !order.createdAt || !order.deliveryDate) return null;
    const days = (order.deliveryDate.getTime() - order.createdAt.getTime()) / DAY;
    return days >= 0 ? days : null;
}

export interface CumulativePoint { day: number; label: string; current: number | null; previous: number | null }

/** Running total of sales by day of the period, next to the previous period of the same length. */
export function cumulativeSales(current: StatOrder[], previous: StatOrder[], from: Date, to: Date, basis: DateBasis, now = new Date()): CumulativePoint[] {
    const days = Math.min(Math.ceil((to.getTime() - from.getTime()) / DAY), 366);
    if (days < 1) return [];
    const length = to.getTime() - from.getTime();
    const sales = (list: StatOrder[], start: number) => {
        const perDay = new Array(days).fill(0) as number[];
        for (const order of list) {
            const date = dateOf(order, basis);
            if (order.status === "cancelled" || !date) continue;
            const index = Math.floor((date.getTime() - start) / DAY);
            if (index >= 0 && index < days) perDay[index] += order.total;
        }
        return perDay;
    };
    const currentDays = sales(current, from.getTime());
    const previousDays = sales(previous, from.getTime() - length);
    let runCurrent = 0, runPrevious = 0;
    return currentDays.map((value, index) => {
        runCurrent += value;
        runPrevious += previousDays[index];
        const dayStart = from.getTime() + index * DAY;
        return {
            day: index + 1,
            label: new Date(dayStart).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
            current: dayStart > now.getTime() ? null : runCurrent, // do not draw a flat line into the future
            previous: runPrevious,
        };
    });
}

export function bestDays(list: StatOrder[], count: number, basis: DateBasis): { day: Date; orders: number; revenue: number }[] {
    const days = new Map<number, { day: Date; orders: number; revenue: number }>();
    for (const order of list) {
        const date = dateOf(order, basis);
        if (order.status === "cancelled" || !date) continue;
        const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const row = days.get(day.getTime()) || { day, orders: 0, revenue: 0 };
        row.orders += 1;
        row.revenue += order.total;
        days.set(day.getTime(), row);
    }
    return [...days.values()].sort((a, b) => b.revenue - a.revenue).slice(0, count);
}

export function itemsDistribution(list: StatOrder[]): { label: string; orders: number; avg: number }[] {
    const buckets: [string, number, number][] = [["1 item", 0, 1.5], ["2 items", 1.5, 2.5], ["3 items", 2.5, 3.5], ["4+ items", 3.5, Infinity]];
    return buckets.map(([label, min, max]) => {
        const matching = list.filter(order => order.status !== "cancelled" && order.units >= min && order.units < max);
        return { label, orders: matching.length, avg: matching.length ? matching.reduce((total, order) => total + order.total, 0) / matching.length : 0 };
    });
}

// ── Performance ──────────────────────────────────────────────────────────────

export function funnel(list: StatOrder[]): { stage: string; value: number; pct: number }[] {
    const active = list.filter(order => order.status !== "cancelled");
    const stages: [string, number][] = [
        ["Orders placed", active.length],
        ["Advance paid", active.filter(order => order.advance > 0).length],
        ["Fully paid", active.filter(order => paymentState(order) === "paid").length],
        ["Delivered", active.filter(order => order.status === "delivered").length],
    ];
    return stages.map(([stage, value]) => ({ stage, value, pct: active.length ? (value / active.length) * 100 : 0 }));
}

export interface PersonStats { key: string; orders: number; revenue: number; profit: number; avgLead: number | null; onTime: number | null }

/** Delivery performance per person. "On time" means delivered within `targetDays` of the order. */
export function deliveryByPerson(list: StatOrder[], targetDays: number): PersonStats[] {
    const groups = new Map<string, StatOrder[]>();
    for (const order of list) {
        if (order.status !== "delivered") continue;
        const key = order.deliveredBy || "Unassigned";
        groups.set(key, [...(groups.get(key) || []), order]);
    }
    return [...groups.entries()].map(([key, orders]) => {
        const leads = orders.map(leadDays).filter((days): days is number => days !== null);
        return {
            key,
            orders: orders.length,
            revenue: orders.reduce((total, order) => total + order.total, 0),
            profit: orders.reduce((total, order) => total + order.profit, 0),
            avgLead: leads.length ? leads.reduce((total, days) => total + days, 0) / leads.length : null,
            onTime: leads.length ? (leads.filter(days => days <= targetDays).length / leads.length) * 100 : null,
        };
    }).sort((a, b) => b.orders - a.orders);
}

export function pricingAccuracy(list: StatOrder[], threshold = 200): { verified: number; ok: number; under: number; over: number } {
    const verified = list.filter(order => order.status !== "cancelled" && order.checkDiff !== null);
    return {
        verified: verified.length,
        under: verified.filter(order => (order.checkDiff as number) < -threshold).length,
        over: verified.filter(order => (order.checkDiff as number) > threshold).length,
        ok: verified.filter(order => Math.abs(order.checkDiff as number) <= threshold).length,
    };
}

export function marginByCommission(list: StatOrder[]): { key: string; orders: number; revenue: number; profit: number; margin: number }[] {
    return groupBy(list, order => order.commission || "Unknown")
        .map(group => ({ key: group.key, orders: group.orders, revenue: group.revenue, profit: group.profit, margin: group.revenue ? (group.profit / group.revenue) * 100 : 0 }))
        .sort((a, b) => b.margin - a.margin);
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function growthSeries(series: SeriesPoint[]): { label: string; revenue: number; growth: number | null }[] {
    return series.map((point, index) => {
        const before = index > 0 ? series[index - 1].revenue : 0;
        return { label: point.label, revenue: point.revenue, growth: index > 0 && before > 0 ? ((point.revenue - before) / before) * 100 : null };
    });
}

export function movingAverage(values: number[], window: number): (number | null)[] {
    return values.map((_, index) => {
        if (index < window - 1) return null;
        const slice = values.slice(index - window + 1, index + 1);
        return slice.reduce((total, value) => total + value, 0) / window;
    });
}

/** Straight-line projection from the last `fit` values. An estimate, never below zero. */
export function linearForecast(values: number[], ahead: number, fit = 8): number[] {
    const recent = values.slice(-fit);
    const n = recent.length;
    if (n < 3) return [];
    const meanX = (n - 1) / 2;
    const meanY = recent.reduce((total, value) => total + value, 0) / n;
    let numerator = 0, denominator = 0;
    recent.forEach((value, index) => { numerator += (index - meanX) * (value - meanY); denominator += (index - meanX) ** 2; });
    const slope = denominator ? numerator / denominator : 0;
    return Array.from({ length: ahead }, (_, step) => Math.max(0, meanY + slope * (n + step - meanX)));
}

function firstOrderDates(all: StatOrder[]): Map<string, number> {
    const first = new Map<string, number>();
    for (const order of all) {
        if (order.status === "cancelled" || !order.createdAt) continue;
        const key = customerKey(order);
        const time = order.createdAt.getTime();
        if (!first.has(key) || time < (first.get(key) as number)) first.set(key, time);
    }
    return first;
}

/** Customers per period, split into people ordering for the first time and people who came back. */
export function newVsReturning(all: StatOrder[], list: StatOrder[], series: SeriesPoint[], granularity: Granularity): { label: string; newCustomers: number; returning: number }[] {
    const first = firstOrderDates(all);
    const seen = new Map<number, { newKeys: Set<string>; returningKeys: Set<string> }>();
    for (const order of list) {
        if (order.status === "cancelled" || !order.createdAt) continue;
        const bucket = startOfBucket(order.createdAt, granularity).getTime();
        const entry = seen.get(bucket) || { newKeys: new Set<string>(), returningKeys: new Set<string>() };
        const key = customerKey(order);
        if (startOfBucket(new Date(first.get(key) as number), granularity).getTime() === bucket) entry.newKeys.add(key);
        else entry.returningKeys.add(key);
        seen.set(bucket, entry);
    }
    return series.map(point => {
        const entry = seen.get(point.start);
        return { label: point.label, newCustomers: entry ? entry.newKeys.size : 0, returning: entry ? entry.returningKeys.size : 0 };
    });
}

/** Share of customers from each first-order month who ordered again 0, 1, 2... months later. */
export function cohortTable(all: StatOrder[], months = 6, now = new Date()): { cohort: string; size: number; retention: (number | null)[] }[] {
    const first = firstOrderDates(all);
    const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
    const nowIndex = monthIndex(now);
    const activeMonths = new Map<string, Set<number>>();
    for (const order of all) {
        if (order.status === "cancelled" || !order.createdAt) continue;
        const key = customerKey(order);
        activeMonths.set(key, (activeMonths.get(key) || new Set<number>()).add(monthIndex(order.createdAt)));
    }
    const rows = [];
    for (let back = months - 1; back >= 0; back--) {
        const cohortIndex = nowIndex - back;
        const members = [...first.entries()].filter(([, time]) => monthIndex(new Date(time)) === cohortIndex).map(([key]) => key);
        const retention = Array.from({ length: months }, (_, offset) => {
            if (cohortIndex + offset > nowIndex || !members.length) return null;
            return (members.filter(key => activeMonths.get(key)?.has(cohortIndex + offset)).length / members.length) * 100;
        });
        const date = new Date(Math.floor(cohortIndex / 12), cohortIndex % 12, 1);
        rows.push({ cohort: date.toLocaleString("en-US", { month: "short", year: "2-digit" }), size: members.length, retention });
    }
    return rows;
}

export function concentration(list: StatOrder[]): { customers: number; top10Share: number; top: { name: string; share: number }[] } {
    const customers = topCustomers(list).sort((a, b) => b.revenue - a.revenue);
    const total = customers.reduce((sum, customer) => sum + customer.revenue, 0);
    const topCount = Math.max(1, Math.ceil(customers.length * 0.1));
    return {
        customers: customers.length,
        top10Share: total ? (customers.slice(0, topCount).reduce((sum, customer) => sum + customer.revenue, 0) / total) * 100 : 0,
        top: customers.slice(0, 5).map(customer => ({ name: customer.name, share: total ? (customer.revenue / total) * 100 : 0 })),
    };
}

/** The `count` periods that follow the bucket starting at `startMs`, with the same labels the chart uses. */
export function nextBuckets(startMs: number, granularity: Granularity, count: number): { start: number; label: string }[] {
    const buckets: { start: number; label: string }[] = [];
    let cursor = new Date(startMs);
    for (let step = 0; step < count; step++) {
        cursor = nextBucket(cursor, granularity);
        buckets.push({ start: cursor.getTime(), label: bucketLabel(cursor, granularity) });
    }
    return buckets;
}
