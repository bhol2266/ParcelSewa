// Activity log for the admin and Ankush pages: every create, edit, cancel, delete, price check and product change
// on an order is written to the "Order Logs" collection. Entries are only ever added, never changed,
// and the /admin/logs page only reads them.
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

export const ORDER_LOGS = "Order Logs";

export type LogAction =
    | "created"
    | "edited"
    | "cancelled"
    | "cancel_reversed"
    | "deleted"
    | "price_verified"
    | "error_removed"
    | "images_fetched"
    | "product_received"
    | "product_unreceived";

export const ACTION_LABEL: Record<LogAction, string> = {
    created: "Order created",
    edited: "Order edited",
    cancelled: "Order cancelled",
    cancel_reversed: "Cancellation reversed",
    deleted: "Order deleted",
    price_verified: "Total verified",
    error_removed: "Price error removed",
    images_fetched: "Product images fetched",
    product_received: "Product ticked received",
    product_unreceived: "Product tick removed",
};

export type ChangeKind = "price" | "customer" | "status" | "other";

export interface FieldChange {
    field: string;
    label: string;
    kind: ChangeKind;
    from: string;
    to: string;
}

export interface LogProduct {
    position: number;
    url: string;
    pageUrl: string;
    quantity: string;
}

export interface ProductChanges {
    added: LogProduct[];
    removed: LogProduct[];
    // Same product position, but its link or quantity changed.
    updated: { position: number; from: LogProduct; to: LogProduct }[];
}

export interface OrderLog {
    id: string;
    action: LogAction;
    at: Timestamp;
    page: string;
    orderId: string;
    customer: string;
    mobile: string;
    summary: string;
    changes: FieldChange[];
    products: ProductChanges;
    // The whole order as it was just before a delete, so nothing is lost.
    snapshot?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
}

// The order fields worth tracking, in the order they are shown.
const FIELDS: { field: string; label: string; kind: ChangeKind }[] = [
    { field: "totalAmount", label: "Total amount", kind: "price" },
    { field: "advancePayment", label: "Advance payment", kind: "price" },
    { field: "commission", label: "Commission", kind: "price" },
    { field: "courierCharge", label: "Courier charge", kind: "price" },
    { field: "name", label: "Customer name", kind: "customer" },
    { field: "mobile", label: "Mobile", kind: "customer" },
    { field: "address", label: "Address", kind: "customer" },
    { field: "storeName", label: "Store", kind: "other" },
    { field: "deliveryStatus", label: "Delivery status", kind: "status" },
    { field: "deliveredBy", label: "Delivered by", kind: "status" },
    { field: "orderedDate", label: "Ordered date", kind: "status" },
    { field: "deliveryDate", label: "Delivered date", kind: "status" },
    { field: "hasError", label: "Error mode", kind: "status" },
    { field: "errorNote", label: "Error note", kind: "status" },
    { field: "notes", label: "Notes", kind: "other" },
];

// Readable text for any stored value: Timestamps become dates, status flags become words.
export function showValue(field: string, value: unknown): string {
    if (value === undefined || value === null || value === "") return "—";
    if (value instanceof Timestamp) return value.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (field === "deliveryStatus") return value === true ? "Delivered" : value === "cancelled" ? "Cancelled" : "Pending";
    if (field === "hasError") return value === true ? "On" : "Off";
    if (typeof value === "number") return field === "totalAmount" || field === "advancePayment" ? `Rs. ${value.toLocaleString("en-IN")}` : String(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function sameValue(a: unknown, b: unknown): boolean {
    if (a instanceof Timestamp && b instanceof Timestamp) return a.toMillis() === b.toMillis();
    const empty = (v: unknown) => v === undefined || v === null || v === "";
    if (empty(a) && empty(b)) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

function productsOf(order: Record<string, any> | null | undefined): LogProduct[] {
    const urls: string[] = order?.productUrls || [];
    return urls.map((url, i) => ({
        position: i + 1,
        url: url || "",
        pageUrl: order?.productPageUrls?.[i] || "",
        quantity: String(order?.productItems?.[i]?.quantity ?? "1"),
    }));
}

// A product is the same one when its link or its saved product page matches.
const sameProduct = (a: LogProduct, b: LogProduct) =>
    (!!a.url && a.url === b.url) || (!!a.pageUrl && a.pageUrl === b.pageUrl) || (!!a.pageUrl && a.pageUrl === b.url) || (!!a.url && a.url === b.pageUrl);

export function diffProducts(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined): ProductChanges {
    const oldList = productsOf(before);
    const newList = productsOf(after);
    const matchedNew = new Set<number>();
    const removed: LogProduct[] = [];
    const updated: ProductChanges["updated"] = [];

    for (const old of oldList) {
        const j = newList.findIndex((p, idx) => !matchedNew.has(idx) && sameProduct(old, p));
        if (j === -1) { removed.push(old); continue; }
        matchedNew.add(j);
        const next = newList[j];
        if (next.url !== old.url || next.quantity !== old.quantity || (next.pageUrl && next.pageUrl !== old.pageUrl)) {
            updated.push({ position: next.position, from: old, to: next });
        }
    }
    const added = newList.filter((_, idx) => !matchedNew.has(idx));
    return { added, removed, updated };
}

export function diffFields(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined): FieldChange[] {
    return FIELDS.filter(f => !sameValue(before?.[f.field], after?.[f.field])).map(f => ({
        ...f,
        from: showValue(f.field, before?.[f.field]),
        to: showValue(f.field, after?.[f.field]),
    }));
}

// Firestore can't store `undefined` or a deleteField() sentinel inside a plain map, and Timestamps
// read back fine, so copy the order with only plain values.
function plain(value: unknown): unknown {
    if (value === undefined) return null;
    if (value === null || typeof value !== "object" || value instanceof Timestamp) return value;
    if (Array.isArray(value)) return value.map(plain);
    if (value.constructor !== Object) return null;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).map(([k, v]) => [k, plain(v)]));
}

function summarize(action: LogAction, changes: FieldChange[], products: ProductChanges): string {
    const parts: string[] = [];
    const price = changes.filter(c => c.kind === "price");
    if (price.length) parts.push(price.map(c => `${c.label}: ${c.from} → ${c.to}`).join(", "));
    if (products.added.length) parts.push(`${products.added.length} product${products.added.length > 1 ? "s" : ""} added`);
    if (products.removed.length) parts.push(`${products.removed.length} product${products.removed.length > 1 ? "s" : ""} removed`);
    if (products.updated.length) parts.push(`${products.updated.length} product${products.updated.length > 1 ? "s" : ""} changed`);
    const others = changes.filter(c => c.kind !== "price");
    if (others.length) parts.push(`${others.map(c => c.label).join(", ")} changed`);
    if (parts.length) return parts.join(" · ");
    return action === "edited" ? "Saved with no changes" : ACTION_LABEL[action];
}

// Record one action on an order. Logging never blocks or breaks the action itself.
export async function logOrderActivity(opts: {
    action: LogAction;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    orderId: string;
    page?: string;
    details?: Record<string, unknown>;
}): Promise<void> {
    const { action, before = null, after = null, orderId, page = "admin", details } = opts;
    try {
        const changes = action === "deleted" || action === "created" ? [] : diffFields(before, after);
        const products = action === "deleted" ? { added: [], removed: [], updated: [] } : diffProducts(before, after);
        const ref = after || before || {};
        await addDoc(collection(db, ORDER_LOGS), {
            action,
            at: Timestamp.now(),
            page,
            orderId,
            customer: String(ref.name ?? ""),
            mobile: String(ref.mobile ?? ""),
            summary: action === "deleted"
                ? `Deleted order of ${ref.name || "customer"} · Rs. ${(Number(ref.totalAmount) || 0).toLocaleString("en-IN")} · ${productsOf(ref).length} products`
                : action === "created"
                    ? `New order · Rs. ${(Number(ref.totalAmount) || 0).toLocaleString("en-IN")} · ${productsOf(ref).length} products`
                    : action === "product_received" || action === "product_unreceived"
                        ? `${ACTION_LABEL[action]} · product #${details?.product ?? "?"}`
                        : summarize(action, changes, products),
            changes,
            products: plain(products),
            snapshot: action === "deleted" || action === "created" ? plain(ref) : null,
            details: details ? plain(details) : null,
        });
    } catch (err) {
        console.error("Could not write the order log:", err);
    }
}
