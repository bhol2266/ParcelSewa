// Shared by the order form, the /cart page and the cart API: what a product in an order request looks like,
// the WhatsApp message that describes a request, and the multi-product quotation.
import { calculateAdminQuotation, type CommissionOption } from "./quotation-estimate";

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
  quote?: { rate: CommissionOption; totalNPR: number; quotedAt: number };
  /** Set once the team has turned the request into an order on the orders page. */
  orderId?: string;
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
