import { isProductChecked } from "./product-checks";

// A pending order is "late" once it was ordered more than this many days ago.
export const LATE_AFTER_DAYS = 10;
const DAY_MS = 86_400_000;

// When the order was placed: its ordered date, else the day it was created.
export const orderedMillis = (order: any): number => order.orderedDate?.toMillis?.() ?? order.createdAt?.toMillis?.() ?? 0;

export const daysSinceOrdered = (order: any, now = Date.now()): number => {
    const ms = orderedMillis(order);
    return ms ? Math.max(0, Math.floor((now - ms) / DAY_MS)) : 0;
};

export function isLateOrder(order: any, now = Date.now()): boolean {
    const ms = orderedMillis(order);
    return order.deliveryStatus === false && ms > 0 && now - ms > LATE_AFTER_DAYS * DAY_MS;
}

export interface LateImage {
    key: string;
    url: string;
    index: number;
    qty: string | null;
    days: number;
    order: any;
}

// Every product image of the given late orders that hasn't been ticked yet, most overdue order first.
export function lateProductImages(orders: any[], now = Date.now()): LateImage[] {
    const images: LateImage[] = [];
    for (const order of [...orders].sort((a, b) => orderedMillis(a) - orderedMillis(b))) {
        const days = daysSinceOrdered(order, now);
        (order.productUrls ?? []).forEach((url: string, index: number) => {
            if (!url || isProductChecked(order, index)) return;
            images.push({ key: `${order.id}-${index}`, url, index, qty: order.productItems?.[index]?.quantity ?? null, days, order });
        });
    }
    return images;
}
