// Customer-facing tracking for /trackOrder. The only real event we record before delivery is Ankush ticking a
// product as received (productItems[i].checkedAt), so the India leg is paced by days since the order, the border and
// Birgunj steps follow the tick. Marking an order delivered in /admin means it was handed to the Aramex courier on
// its delivery date; customers see it with Aramex for COURIER_DAYS and delivered to them after that.

const DAY = 86_400_000;

export type StepStatus = "done" | "current" | "upcoming";
export type Leg = "india" | "border" | "nepal" | "home";

export type TrackingStep = {
    key: string;
    title: string;
    detail: string;
    place: string;
    leg: Leg;
    status: StepStatus;
    date: Date | null;
};

export type ProductTracking = {
    steps: TrackingStep[];
    current: TrackingStep;
    leg: Leg;
    // 0..1 along the four legs, for the route bar.
    progress: number;
    delivered: boolean;
};

// India leg: [days after ordering, step]. The last one holds until the product is ticked as received.
const INDIA_STEPS: [number, Omit<TrackingStep, "status" | "date" | "leg">][] = [
    [0, { key: "placed", title: "Order placed", detail: "We've received your order and payment details.", place: "ParcelSewa" }],
    [2, { key: "shipped", title: "Shipped by seller", detail: "Bought from the Indian store and moving through the courier network.", place: "India" }],
    [5, { key: "near-border", title: "On the way to Raxaul border", detail: "Heading to our border facility. Some sellers take a little longer, up to 10 days.", place: "Bihar, India" }],
];

// Days from reaching Raxaul to reaching the Birgunj hub.
const BORDER_DAYS = 2;
// Aramex takes 2-3 days from our handover to the customer's door.
export const COURIER_DAYS = 3;

const toDate = (value: any): Date | null => value?.toDate?.() ?? (value instanceof Date ? value : null);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
// Whole calendar days between two moments, so a step turns over at midnight rather than 24h after the order time.
const daysBetween = (from: Date, to: Date) => {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
    return Math.round((b - a) / DAY);
};

export const orderDate = (order: any): Date | null => toDate(order.orderedDate) ?? toDate(order.createdAt);
// Handed to Aramex (marked delivered in /admin). Orders marked without a date count as already delivered.
const handedOver = (order: any) => order.deliveryStatus === true;
export const handedOverAt = (order: any): Date | null => (handedOver(order) ? toDate(order.deliveryDate) : null);
export const isDelivered = (order: any, now = new Date()) => {
    if (!handedOver(order)) return false;
    const at = handedOverAt(order);
    return !at || daysBetween(at, now) >= COURIER_DAYS;
};
export const isWithCourier = (order: any, now = new Date()) => handedOver(order) && !isDelivered(order, now);
// When the customer gets it: COURIER_DAYS after the handover.
export const deliveredAt = (order: any, now = new Date()): Date | null => {
    const at = handedOverAt(order);
    return isDelivered(order, now) && at ? addDays(at, COURIER_DAYS) : null;
};
export const isCancelled = (order: any) => order.deliveryStatus === "cancelled";

// The product links that are filled in, with their position in productUrls (that's where the received tick lives).
export function orderProducts(order: any): { index: number; image: string; quantity: string }[] {
    return (order.productUrls ?? [])
        .map((url: string, index: number) => ({ index, image: url, quantity: String(order.productItems?.[index]?.quantity ?? "1") }))
        .filter((p: { image: string }) => !!p.image);
}

export function trackProduct(order: any, index: number, now = new Date()): ProductTracking {
    const ordered = orderDate(order) ?? now;
    const delivered = isDelivered(order, now);
    const withCourier = handedOver(order);
    const item = order.productItems?.[index];
    const received = item?.checked === true || withCourier;
    // Older ticks (and deliveries nobody ticked) have no date; those steps show as done without one.
    const receivedAt = item?.checked === true ? toDate(item.checkedAt) : null;
    const courierAt = handedOverAt(order);
    const doorAt = deliveredAt(order, now);
    const elapsed = daysBetween(ordered, now);

    const steps: TrackingStep[] = [];
    // Once it has arrived, India steps that would have come after the arrival are skipped rather than back-filled.
    const arrivedAt = receivedAt ?? courierAt;
    for (const [day, step] of INDIA_STEPS) {
        const at = addDays(ordered, day);
        if (received && arrivedAt && day > 0 && at > arrivedAt) continue;
        const done = received || elapsed >= day;
        steps.push({ ...step, leg: "india", date: done && at <= now ? at : null, status: done ? "done" : "upcoming" });
    }

    const borderAt = receivedAt;
    let birgunjAt = receivedAt ? addDays(receivedAt, BORDER_DAYS) : null;
    if (birgunjAt && courierAt && courierAt < birgunjAt) birgunjAt = courierAt;
    const crossed = withCourier || (received && (!birgunjAt || birgunjAt <= now));
    steps.push(
        { key: "raxaul", title: "Received at Raxaul border", detail: "Your parcel is at our border facility, ready to cross into Nepal.", place: "Raxaul, India", leg: "border", date: borderAt, status: received ? "done" : "upcoming" },
        { key: "birgunj", title: "Crossed into Nepal, at Birgunj hub", detail: withCourier ? "Cleared the border and sorted for delivery to your address." : "Cleared the border and being prepared for delivery to your address.", place: "Birgunj, Nepal", leg: "nepal", date: crossed ? birgunjAt : null, status: crossed ? "done" : "upcoming" },
        { key: "courier", title: "Parcel forwarded to Aramex courier", detail: delivered ? "Handed to Aramex Nepal for delivery to your address." : "Handed to Aramex Nepal. They deliver to your address in 2-3 days and may call you before delivery.", place: "Aramex Nepal", leg: "nepal", date: courierAt, status: withCourier ? "done" : "upcoming" },
        { key: "home", title: delivered ? "Delivered to you" : "Delivery to your location", detail: delivered ? "Delivered to your address. Thank you for shopping with ParcelSewa!" : withCourier ? "Aramex is bringing it to your address, usually within 2-3 days." : "Out to your address once it leaves Birgunj.", place: order.address || "Your location, Nepal", leg: "home", date: doorAt, status: delivered ? "done" : "upcoming" },
    );

    // The latest done step is the current one (unless everything is complete).
    const lastDone = steps.map((s) => s.status).lastIndexOf("done");
    if (!delivered && lastDone >= 0) steps[lastDone] = { ...steps[lastDone], status: "current" };
    const current = steps[Math.max(lastDone, 0)];

    const legIndex = { india: 0, border: 1, nepal: 2, home: 3 }[current.leg];
    // Within the India leg, creep forward day by day so the bar visibly moves.
    const indiaShare = current.leg === "india" ? Math.min(elapsed, 9) / 10 : 0;
    // With Aramex: most of the way from Birgunj to the door, a little further each day.
    const courierShare = current.key === "courier" ? 0.5 + Math.min(courierAt ? daysBetween(courierAt, now) : 0, COURIER_DAYS - 1) * 0.15 : 0;
    const progress = delivered ? 1 : (legIndex + indiaShare + courierShare) / 3;

    return { steps, current, leg: current.leg, progress: Math.min(progress, 1), delivered };
}

// Products that share the same journey (same received day, or none yet) are tracked together.
export function groupProducts(order: any, now = new Date()) {
    const groups = new Map<string, { products: ReturnType<typeof orderProducts>; tracking: ProductTracking }>();
    for (const product of orderProducts(order)) {
        const tracking = trackProduct(order, product.index, now);
        const key = tracking.steps.map((s) => `${s.key}:${s.status}:${s.date?.toDateString() ?? ""}`).join("|");
        const group = groups.get(key);
        if (group) group.products.push(product);
        else groups.set(key, { products: [product], tracking });
    }
    // Furthest behind first: the order's headline follows its slowest product.
    return [...groups.values()].sort((a, b) => a.tracking.progress - b.tracking.progress);
}

// "Tue, 3 Nov" (with the year when it isn't this year).
export const formatDay = (date: Date | null) =>
    date
        ? date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
        : "";

export type CustomerProfile = {
    name: string;
    initials: string;
    city: string;
    memberSince: Date | null;
    tier: { label: string; next: string | null };
    orders: number;
    onTheWay: number;
    delivered: number;
    items: number;
    due: number;
    stores: string[];
};

// A customer's summary across all their orders, for the profile card on /trackOrder. Only the last part of the
// address (usually the city) is shown, since anyone can type a number in.
export function customerProfile(orders: any[]): CustomerProfile {
    const live = orders.filter((o) => !isCancelled(o));
    const latest = orders[0] ?? {};
    const parts = (latest.name ?? "").trim().split(/\s+/).filter(Boolean);
    const dates = orders.map(orderDate).filter((d): d is Date => !!d);
    const storeCounts = new Map<string, number>();
    for (const o of live) {
        const store = String(o.storeName ?? "").trim();
        if (store) storeCounts.set(store, (storeCounts.get(store) ?? 0) + 1);
    }
    const count = live.length;
    const tier = count >= 10 ? { label: "Loyal customer", next: null }
        : count >= 3 ? { label: "Regular customer", next: `${10 - count} more order${10 - count === 1 ? "" : "s"} to Loyal` }
            : { label: "New customer", next: `${3 - count} more order${3 - count === 1 ? "" : "s"} to Regular` };

    return {
        name: String(latest.name ?? "").trim() || "Customer",
        initials: (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "C").slice(0, 2)).toUpperCase(),
        city: String(latest.address ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).at(-1) ?? "",
        memberSince: dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
        tier,
        orders: orders.length,
        onTheWay: live.filter((o) => !isDelivered(o)).length,
        delivered: live.filter((o) => isDelivered(o)).length,
        items: live.reduce((sum, o) => sum + orderProducts(o).reduce((n, p) => n + (Number(p.quantity) || 1), 0), 0),
        // Orders marked delivered in /admin (handed to Aramex) owe nothing here, even during the courier days.
        due: live.filter((o) => !handedOver(o)).reduce((sum, o) => sum + Math.max((Number(o.totalAmount) || 0) - (Number(o.advancePayment) || 0), 0), 0),
        stores: [...storeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 4),
    };
}
