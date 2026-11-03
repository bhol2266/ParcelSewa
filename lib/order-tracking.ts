// Customer-facing tracking for /trackOrder. The only real event we record before delivery is Ankush ticking a
// product as received (productItems[i].checkedAt), so the India leg is paced by days since the order, the border and
// Birgunj steps follow the tick, and the order's delivered flag completes the journey.

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
    [1, { key: "confirmed", title: "Order confirmed with seller", detail: "Your items have been purchased from the Indian store.", place: "India" }],
    [2, { key: "dispatched", title: "Dispatched by seller", detail: "The seller has packed and shipped your items.", place: "India" }],
    [3, { key: "transit", title: "In transit within India", detail: "Your parcel is moving through the courier network.", place: "India" }],
    [5, { key: "sorting", title: "Reached regional sorting hub", detail: "Sorted and routed towards the Nepal border.", place: "India" }],
    [7, { key: "to-border", title: "On the way to Raxaul border", detail: "Your parcel is heading to our border facility.", place: "Bihar, India" }],
    [9, { key: "near-border", title: "Arriving at Raxaul border soon", detail: "Almost at the border. Some sellers take a little longer, up to 10 days.", place: "Bihar, India" }],
];

// Days from reaching Raxaul to reaching the Birgunj hub.
const BORDER_DAYS = 2;

const toDate = (value: any): Date | null => value?.toDate?.() ?? (value instanceof Date ? value : null);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
// Whole calendar days between two moments, so a step turns over at midnight rather than 24h after the order time.
const daysBetween = (from: Date, to: Date) => {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
    return Math.round((b - a) / DAY);
};

export const orderDate = (order: any): Date | null => toDate(order.orderedDate) ?? toDate(order.createdAt);
export const isDelivered = (order: any) => order.deliveryStatus === true;
export const isCancelled = (order: any) => order.deliveryStatus === "cancelled";

// The product links that are filled in, with their position in productUrls (that's where the received tick lives).
export function orderProducts(order: any): { index: number; image: string; quantity: string }[] {
    return (order.productUrls ?? [])
        .map((url: string, index: number) => ({ index, image: url, quantity: String(order.productItems?.[index]?.quantity ?? "1") }))
        .filter((p: { image: string }) => !!p.image);
}

export function trackProduct(order: any, index: number, now = new Date()): ProductTracking {
    const ordered = orderDate(order) ?? now;
    const delivered = isDelivered(order);
    const item = order.productItems?.[index];
    const received = item?.checked === true || delivered;
    // Older ticks (and deliveries nobody ticked) have no date; those steps show as done without one.
    const receivedAt = item?.checked === true ? toDate(item.checkedAt) : null;
    const deliveredAt = delivered ? toDate(order.deliveryDate) : null;
    const elapsed = daysBetween(ordered, now);

    const steps: TrackingStep[] = [];
    // Once it has arrived, India steps that would have come after the arrival are skipped rather than back-filled.
    const arrivedAt = receivedAt ?? deliveredAt;
    for (const [day, step] of INDIA_STEPS) {
        const at = addDays(ordered, day);
        if (received && arrivedAt && day > 0 && at > arrivedAt) continue;
        const done = received || elapsed >= day;
        steps.push({ ...step, leg: "india", date: done && at <= now ? at : null, status: done ? "done" : "upcoming" });
    }

    const borderAt = receivedAt;
    let birgunjAt = receivedAt ? addDays(receivedAt, BORDER_DAYS) : null;
    if (birgunjAt && deliveredAt && deliveredAt < birgunjAt) birgunjAt = deliveredAt;
    const crossed = delivered || (received && (!birgunjAt || birgunjAt <= now));
    steps.push(
        { key: "origin", title: "Departed origin facility", detail: "Handed over from the Indian courier for the border run.", place: "India", leg: "border", date: borderAt, status: received ? "done" : "upcoming" },
        { key: "raxaul", title: "Received at Raxaul Border", detail: "Your parcel is at our Raxaul border facility.", place: "Raxaul, India", leg: "border", date: borderAt, status: received ? "done" : "upcoming" },
        { key: "crossed", title: "Border crossed into Nepal", detail: "Cleared at the Raxaul–Birgunj crossing.", place: "Nepal border", leg: "nepal", date: crossed ? birgunjAt : null, status: crossed ? "done" : "upcoming" },
        { key: "birgunj", title: "Received at Birgunj Hub", detail: delivered ? "Sorted for delivery to your address." : "Being prepared for delivery to your address.", place: "Birgunj, Nepal", leg: "nepal", date: crossed ? birgunjAt : null, status: crossed ? "done" : "upcoming" },
        { key: "home", title: "Dispatched to your location", detail: delivered ? "Delivered to your address. Thank you for shopping with ParcelSewa!" : "Out to your address once it leaves Birgunj.", place: delivered && order.address ? order.address : "Your location, Nepal", leg: "home", date: deliveredAt, status: delivered ? "done" : "upcoming" },
    );

    // The latest done step is the current one (unless everything is complete).
    const lastDone = steps.map((s) => s.status).lastIndexOf("done");
    if (!delivered && lastDone >= 0) steps[lastDone] = { ...steps[lastDone], status: "current" };
    const current = steps[Math.max(lastDone, 0)];

    const legIndex = { india: 0, border: 1, nepal: 2, home: 3 }[current.leg];
    // Within the India leg, creep forward day by day so the bar visibly moves.
    const indiaShare = current.leg === "india" ? Math.min(elapsed, 9) / 10 : 0;
    const progress = delivered ? 1 : (legIndex + indiaShare) / 3;

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

// "Bhola Kumar" -> "Bh*** K." so a mistyped number doesn't reveal someone's full name.
export function maskName(name: string | undefined): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Customer";
    const first = parts[0].length <= 2 ? parts[0] : `${parts[0].slice(0, 2)}${"*".repeat(Math.min(parts[0].length - 2, 3))}`;
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

// "Tue, 3 Nov" (with the year when it isn't this year).
export const formatDay = (date: Date | null) =>
    date
        ? date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
        : "";
