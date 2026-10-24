import { Timestamp } from "firebase/firestore";

// A product's "received" tick lives on its entry in the order's productItems, so it moves with the product when links are edited.
export const isProductChecked = (order: any, index: number): boolean => order.productItems?.[index]?.checked === true;

// The order's productItems with one product's tick set (and the moment it was ticked); older orders without
// productItems get them built from the links.
export function withProductChecked(order: any, index: number, checked: boolean) {
    const items = (order.productUrls ?? []).map((url: string, i: number) => ({ url, quantity: "1", ...(order.productItems?.[i] ?? {}) }));
    const item = { ...items[index], checked };
    if (checked) item.checkedAt = Timestamp.now();
    else delete item.checkedAt;
    items[index] = item;
    return items;
}

// When a product was ticked: "24 Oct" (with the year if not this year), or with the time when `long`.
// Empty when it isn't ticked or was ticked before dates were saved.
export function checkedDateLabel(order: any, index: number, long = false): string {
    if (!isProductChecked(order, index)) return "";
    const at = order.productItems?.[index]?.checkedAt;
    const date: Date | null = at?.toDate?.() ?? null;
    if (!date) return "";
    if (long) return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(thisYear ? {} : { year: "numeric" }) });
}

// A pending order whose product images are all ticked: everything has been received.
export function isOrderAllReceived(order: any): boolean {
    if (order.deliveryStatus !== false) return false;
    const linked = (order.productUrls ?? []).map((url: string, i: number) => (url ? i : -1)).filter((i: number) => i >= 0);
    return linked.length > 0 && linked.every((i: number) => isProductChecked(order, i));
}

// The tile's border carries the theme: green once ticked, red until then.
export const tickTheme = (checked: boolean) => (checked ? "border-2 border-green-500" : "border-2 border-red-400");
