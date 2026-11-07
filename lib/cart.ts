// Shared by the order form, the /cart page and the cart API: what a product in an order request looks like,
// the WhatsApp message that describes a request, and the multi-product quotation.
import { calculateAdminQuotation, type CommissionOption } from "./quotation-estimate";
import { getDefaultServiceRate } from "./storefront-estimate";

export const CART_DAYS = 7;
export const MAX_ITEMS = 20;
export const ORDER_REQUESTS = "Order Request";

export type DetailType = "size" | "color" | "variant" | "notes" | "other";
export const DETAIL_TYPES: { type: DetailType; label: string; placeholder: string }[] = [
  { type: "size", label: "Size", placeholder: "e.g. M or UK 9" },
  { type: "color", label: "Colour", placeholder: "e.g. Navy blue" },
  { type: "variant", label: "Model", placeholder: "e.g. 8GB + 128GB" },
  { type: "notes", label: "Notes", placeholder: "Anything else about this product" },
  { type: "other", label: "Something else", placeholder: "Details" },
];

export type ItemDetail = { type: DetailType; label: string; value: string };
/**
 * A product as saved on an order request. `priceInr` is only set by the team when quoting; `imageUrl` is the product
 * picture the team fetched (customers see it too).
 */
export type CartItem = { productUrl: string; quantity: number; details: ItemDetail[]; priceInr?: number; imageUrl?: string };

export type CartRequest = {
  id: string;
  requestId: string;
  items: CartItem[];
  customerName: string;
  deliveryLocation: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  /** The team's saved quotation; `advance` is what the customer has already paid (typed by the team). */
  /**
   * `rateAuto`: the team left the service fee on the automatic choice, so it is picked again from the new total
   * when the products change; otherwise the team's chosen fee is kept.
   */
  quote?: { rate: CommissionOption; totalNPR: number; quotedAt: number; advance?: number; rateAuto?: boolean };
  /** Set once the team has turned the request into an order on the orders page. */
  orderId?: string;
  /** When that order was last created or updated from this cart (ms). */
  orderSyncedAt?: number;
  /** True for everyone once the team has created the order: the customer has paid / confirmed, so no cancelling. */
  ordered?: boolean;
  /** The products (link and quantity) that were in the order when it was last created or updated from this cart. */
  orderedItems?: OrderedProduct[];
};

/**
 * The product link from whatever was pasted. Store apps share text such as
 * "Take a look at this Makeup Brush … https://dl.flipkart.com/s/HpSDCsuuuN" — keep just the link,
 * without trailing punctuation. Text with no link comes back trimmed and unchanged.
 */
export function extractUrl(text: string): string {
  const match = String(text ?? "").match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? match[0].replace(/[),.;:!?\]}'"]+$/, "") : String(text ?? "").trim();
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

const DETAIL_KINDS = new Set(DETAIL_TYPES.map(d => d.type));

/** Cleans products sent by a browser; returns an error message instead when something is wrong. */
export function cleanItems(raw: unknown): CartItem[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "Add at least one product.";
  if (raw.length > MAX_ITEMS) return `You can add up to ${MAX_ITEMS} products in one request.`;
  const items: CartItem[] = [];
  for (const [index, entry] of raw.entries()) {
    const productUrl = extractUrl(String(entry?.productUrl ?? "")).slice(0, 2000);
    if (!isValidUrl(productUrl)) return `Product ${index + 1}: enter a valid product link beginning with https://.`;
    const quantity = Number(entry?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return `Product ${index + 1}: quantity must be a whole number from 1 to 999.`;
    const details: ItemDetail[] = (Array.isArray(entry?.details) ? entry.details : [])
      .filter((d: ItemDetail) => DETAIL_KINDS.has(d?.type) && String(d?.value ?? "").trim())
      .slice(0, 12)
      .map((d: ItemDetail) => ({ type: d.type, label: String(d.label ?? "").trim().slice(0, 40) || "Detail", value: String(d.value).trim().slice(0, 500) }));
    items.push({ productUrl, quantity, details });
  }
  return items;
}

/** Products from a saved request, including older single-product requests saved before `items` existed. */
export function itemsOf(data: Record<string, unknown>): CartItem[] {
  if (Array.isArray(data.items)) {
    return data.items.map((item: CartItem) => ({
      productUrl: String(item.productUrl ?? ""), quantity: Number(item.quantity) || 1,
      details: Array.isArray(item.details) ? item.details : [],
      ...(typeof item.priceInr === "number" ? { priceInr: item.priceInr } : {}),
      ...(typeof item.imageUrl === "string" && item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    }));
  }
  if (typeof data.productUrl === "string") {
    const notes = typeof data.notes === "string" && data.notes.trim() ? [{ type: "notes" as const, label: "Notes", value: data.notes.trim() }] : [];
    return [{ productUrl: data.productUrl, quantity: Number(data.quantity) || 1, details: notes }];
  }
  return [];
}

export const totalPieces = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

/**
 * When a customer sends the form again while a request is still open: a product already in the cart (same link)
 * takes the new quantity and details, keeping the team's price; new links are added at the end. Sending the same
 * form twice therefore changes nothing.
 */
/** What the team added to a product (price, picture), carried over while its link stays the same. */
export const keptFromTeam = (item: CartItem) => ({
  ...(typeof item.priceInr === "number" ? { priceInr: item.priceInr } : {}),
  ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
});

export function mergeItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = existing.map(item => ({ ...item }));
  for (const item of incoming) {
    const index = merged.findIndex(old => old.productUrl === item.productUrl);
    if (index === -1) merged.push(item);
    else merged[index] = { ...item, ...keptFromTeam(merged[index]) };
  }
  return merged;
}

/** True when the list of links or any quantity differs, so a saved quotation no longer applies. */
export const productsDiffer = (a: CartItem[], b: CartItem[]) =>
  JSON.stringify(a.map(i => [i.productUrl, i.quantity])) !== JSON.stringify(b.map(i => [i.productUrl, i.quantity]));

/** The WhatsApp text for a new or edited request. */
export function requestMessage(options: {
  title: string; items: CartItem[]; name?: string; deliveryLocation: string; mobile: string;
  notes?: string; offerNote?: string | null; cartUrl?: string;
}) {
  const { title, items, name, deliveryLocation, mobile, notes, offerNote, cartUrl } = options;
  return [
    title,
    ...items.flatMap((item, index) => [
      "",
      `*${index + 1}.* 🔗 ${item.productUrl}`,
      `    📦 Qty: ${item.quantity}`,
      ...item.details.map(d => `    • ${d.label}: ${d.value}`),
    ]),
    "",
    name ? `👤 *Name:* ${name}` : null,
    `📍 *Delivery Address:* ${deliveryLocation}`,
    `📞 *Customer WhatsApp:* ${mobile}`,
    offerNote ?? null,
    notes ? `📝 *Notes:* ${notes}` : null,
    cartUrl ? `\n✏️ *Add, remove or edit products:* ${cartUrl}` : null,
  ].filter(line => line !== null).join("\n");
}

const inr = (amount: number) => `INR ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * The admin quotation for several products: a line per product, then the same message as the quotation calculator
 * for the combined IC price.
 */
export function cartQuotation(lines: { priceInr: number; quantity: number }[], rate: CommissionOption) {
  const totalInr = Math.round(lines.reduce((sum, line) => sum + line.priceInr * line.quantity, 0) * 100) / 100;
  const quotation = calculateAdminQuotation(totalInr, rate);
  const showBreakdown = lines.length > 1 || lines.some(line => line.quantity > 1);
  const breakdown = showBreakdown
    ? ["🛒 *Products*", ...lines.map((line, i) => `${i + 1}. ${inr(line.priceInr)}${line.quantity > 1 ? ` × ${line.quantity} = ${inr(line.priceInr * line.quantity)}` : ""}`), ""]
    : [];
  return { ...quotation, totalInr, message: [...breakdown, quotation.message].join("\n") };
}

// ── Turning a request into an order on the orders page ("Confirm Orders"), in the format /createOrder saves. ──────

// Short-link and app domains that belong to a known store.
const STORE_ALIASES: Record<string, string> = { amzn: "amazon", fkrt: "flipkart", myntr: "myntra" };

/** The store name for a product link, from the stores list (amzn.in → "Amazon"); otherwise the site's own name. */
export function storeFromUrl(url: string, stores: { name: string; url: string }[]): string {
  let host = "";
  try { host = new URL(url.trim()).hostname.toLowerCase().replace(/^(www|m|dl)\./, ""); } catch { return ""; }
  const label = host.split(".")[0];
  const key = STORE_ALIASES[label] ?? label;
  const store = stores.find(s => { try { return new URL(s.url).hostname.toLowerCase().replace(/^www\./, "").split(".")[0] === key; } catch { return false; } });
  return store ? store.name : key.charAt(0).toUpperCase() + key.slice(1);
}

/** One store name for the order: the shared store, or the stores joined ("Amazon, Myntra"). */
export const orderStoreName = (items: CartItem[], stores: { name: string; url: string }[]) =>
  [...new Set(items.map(item => storeFromUrl(item.productUrl, stores)).filter(Boolean))].join(", ");

/** The commission text the orders page uses: "30%" or "Flat NPR 1000". */
export const commissionText = (rate: CommissionOption) => (typeof rate === "number" ? `${rate}%` : "Flat NPR 1000");

/** Sizes, colours and notes per product, plus the order note, as the order's notes text. */
export function orderNotes(items: CartItem[], note: string): string {
  const lines = items.flatMap((item, i) => (item.details.length ? [`Product ${i + 1}: ${item.details.map(d => `${d.label}: ${d.value}`).join(", ")}`] : []));
  return [...lines, ...(note.trim() ? [note.trim()] : [])].join("\n");
}

/**
 * Products in the orders page's layout: `productUrls[i]` is the product picture when one is known (otherwise the
 * store link), `productPageUrls[i]` is always the store link, and `productItems[i]` mirrors `productUrls[i]` with
 * the quantity as text.
 */
export function orderProducts(items: CartItem[]) {
  const productUrls = items.map(item => item.imageUrl || item.productUrl);
  return {
    productUrls,
    productPageUrls: items.map(item => item.productUrl),
    productItems: items.map((item, i) => ({ url: productUrls[i], quantity: String(item.quantity) })),
  };
}

type OrderProductFields = { productUrls?: string[]; productPageUrls?: string[]; productItems?: Record<string, unknown>[] };

/**
 * The order's products brought up to date with the cart. A product still in the cart (same store link) keeps
 * everything the orders page added to it — its picture, "received" tick and other fields — with the new quantity;
 * new products are added; products no longer in the cart are dropped.
 */
export function syncOrderProducts(order: OrderProductFields, items: CartItem[]) {
  const urls = order.productUrls ?? [];
  const pages = order.productPageUrls?.length ? order.productPageUrls : urls;
  const fresh = orderProducts(items);
  const productUrls: string[] = [], productPageUrls: string[] = [], productItems: Record<string, unknown>[] = [];
  items.forEach((item, i) => {
    const j = pages.indexOf(item.productUrl);
    if (j === -1) {
      productUrls.push(fresh.productUrls[i]); productPageUrls.push(item.productUrl); productItems.push(fresh.productItems[i]);
      return;
    }
    // Use the cart's picture only where the order still has the bare store link.
    const shown = urls[j] && urls[j] !== item.productUrl ? urls[j] : fresh.productUrls[i];
    productUrls.push(shown);
    productPageUrls.push(item.productUrl);
    productItems.push({ ...(order.productItems?.[j] ?? {}), url: shown, quantity: String(item.quantity) });
  });
  return { productUrls, productPageUrls, productItems };
}

// ── Shaping saved requests for the cart page (used by /api/cart and by the page's live updates) ──────────────────

/** Milliseconds from a Firestore Timestamp (or anything with toMillis), a number, or 0. */
export function millis(value: unknown): number {
  if (typeof value === "number") return value;
  const stamp = value as { toMillis?: () => number } | null;
  return stamp && typeof stamp.toMillis === "function" ? stamp.toMillis() : 0;
}

const CART_MS = CART_DAYS * 86_400_000;
/** Customers can change a request only within CART_DAYS of sending it; the team can always. */
export const editableRequest = (createdAt: number, admin: boolean, now = Date.now()) => admin || now - createdAt <= CART_MS;

/** A saved request as the cart page shows it. Customers see prices only once the team has saved a quotation. */
export function toCartRequest(id: string, data: Record<string, unknown>, admin: boolean): CartRequest {
  const items = itemsOf(data);
  const quote = data.quote as CartRequest["quote"] | undefined;
  return {
    id,
    requestId: typeof data.requestId === "string" ? data.requestId : `PS-R-${id.slice(0, 5).toUpperCase()}`,
    items: admin || quote ? items : items.map(item => { const shown = { ...item }; delete shown.priceInr; return shown; }),
    customerName: String(data.customerName ?? ""),
    deliveryLocation: String(data.deliveryLocation ?? ""),
    notes: String(data.notes ?? ""),
    createdAt: millis(data.createdAt),
    ...(data.updatedAt ? { updatedAt: millis(data.updatedAt) } : {}),
    ...(quote ? { quote: { ...quote, quotedAt: millis(quote.quotedAt) } } : {}),
    ...(typeof data.orderId === "string" && data.orderId ? { ordered: true } : {}),
    ...(typeof data.orderId === "string" && data.orderId && Array.isArray(data.orderedItems) ? { orderedItems: data.orderedItems as OrderedProduct[] } : {}),
    ...(admin && typeof data.orderId === "string" ? { orderId: data.orderId, orderSyncedAt: millis(data.orderSyncedAt ?? data.orderCreatedAt) } : {}),
  };
}

/** The requests a cart shows: not cancelled, within CART_DAYS for customers, newest first. */
export function visibleRequests(docs: { id: string; data: Record<string, unknown> }[], admin: boolean): CartRequest[] {
  return docs
    .filter(d => !d.data.cancelled && editableRequest(millis(d.data.createdAt), admin))
    .map(d => toCartRequest(d.id, d.data, admin))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, admin ? 20 : 10);
}

/** "7 Nov, 5:37 pm" in Nepal time, wherever the page is opened. */
export function nepalDate(ms: number, withTime = false) {
  return new Date(ms).toLocaleString("en-GB", {
    timeZone: "Asia/Kathmandu", day: "numeric", month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  });
}

type SavedQuote = { rate: CommissionOption; totalNPR: number; advance?: number; rateAuto?: boolean; [key: string]: unknown };

/**
 * The quotation after the products changed, worked out on the server as part of the save (so it doesn't depend on
 * the browser staying open). Needs a price for every product; returns null when one is missing (a new product the
 * team hasn't priced yet), and the quotation is then cleared until the team prices it.
 */
export function refreshQuote<Q extends SavedQuote>(quote: Q, items: CartItem[], quotedAt: unknown): (Q & { quotedAt: unknown }) | null {
  const lines = items.map(item => ({ priceInr: item.priceInr ?? NaN, quantity: item.quantity }));
  if (!lines.length || !lines.every(line => Number.isFinite(line.priceInr) && line.priceInr > 0)) return null;
  const totalInr = lines.reduce((sum, line) => sum + line.priceInr * line.quantity, 0);
  const rate: CommissionOption = quote.rateAuto ? getDefaultServiceRate(totalInr) : quote.rate;
  try {
    return { ...quote, rate, totalNPR: cartQuotation(lines, rate).totalNPR, quotedAt };
  } catch {
    return null;
  }
}

// ── Which products are in the confirmed order ───────────────────────────────────────────────────────────────────

export type OrderedProduct = { productUrl: string; quantity: number };
/** "ordered": in the order as it is; "changed": in the order with another quantity; "new": added after the order. */
export type OrderMark = "ordered" | "changed" | "new";

/** A product's mark against the products in the order. */
export function orderMarkOf(productUrl: string, quantity: number, ordered: OrderedProduct[]): OrderMark {
  const match = ordered.find(product => product.productUrl === productUrl);
  if (!match) return "new";
  return match.quantity === quantity ? "ordered" : "changed";
}

/** The products in an order on the orders page (store link and quantity), in the format /createOrder saves. */
export function productsInOrder(order: { productUrls?: string[]; productPageUrls?: string[]; productItems?: { quantity?: unknown }[] }): OrderedProduct[] {
  const pages = order.productPageUrls?.length ? order.productPageUrls : order.productUrls ?? [];
  return pages.map((productUrl, i) => ({ productUrl, quantity: Number(order.productItems?.[i]?.quantity ?? 1) || 1 }));
}

/** What "Update the order" would write, for comparing with the order card. */
export type OrderWanted = {
  name: string; address: string; notes: string; storeName: string; commission: string;
  totalAmount: number; advancePayment: number; items: CartItem[];
};

/**
 * The parts of the order card that differ from what the cart would write ("Products", "Total", …); empty when the
 * order is up to date. Compares contents, not times, so it can't be fooled by clocks or by edits that changed nothing.
 */
export function orderDifferences(order: Record<string, unknown>, wanted: OrderWanted): string[] {
  const text = (value: unknown) => String(value ?? "").trim();
  const number = (value: unknown) => Math.round(Number(value) || 0);
  const inOrder = productsInOrder(order as Parameters<typeof productsInOrder>[0]);
  const differs: string[] = [];
  if (JSON.stringify(inOrder) !== JSON.stringify(wanted.items.map(item => ({ productUrl: item.productUrl, quantity: item.quantity })))) differs.push("Products");
  if (text(order.name) !== text(wanted.name)) differs.push("Name");
  if (text(order.address) !== text(wanted.address)) differs.push("Address");
  if (text(order.notes) !== text(wanted.notes)) differs.push("Notes");
  if (text(order.storeName) !== text(wanted.storeName)) differs.push("Store");
  if (text(order.commission) !== text(wanted.commission)) differs.push("Commission");
  if (number(order.totalAmount) !== number(wanted.totalAmount)) differs.push("Total");
  if (number(order.advancePayment) !== number(wanted.advancePayment)) differs.push("Advance");
  return differs;
}
