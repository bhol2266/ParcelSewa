import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { addDoc, collection, deleteField, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE } from "@/lib/admin-access";
import { CART_DAYS, cleanItems, itemsOf, MAX_ITEMS, mergeItems, ORDER_REQUESTS, productsDiffer, totalPieces, type CartItem, type CartRequest } from "@/lib/cart";
import { cartPath, checkCartAccess } from "@/lib/cart-link";
import { nepalMobile } from "@/lib/track-auth";
import { festivalCampaign } from "@/lib/storefront";

const CART_MS = CART_DAYS * 86_400_000;
const noStore = { "Cache-Control": "no-store" };
const millis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : typeof value === "number" ? value : 0);
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

// Short code the customer and team can both quote in WhatsApp, e.g. PS-R-4K7Q2.
function makeRequestId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[randomInt(chars.length)];
  return `PS-R-${id}`;
}

function access(req: NextRequest) {
  return checkCartAccess(req.nextUrl.searchParams, req.cookies.get(ADMIN_COOKIE)?.value);
}

// Customers can change a request only within CART_DAYS of sending it; the team can always.
const editable = (createdAt: number, admin: boolean) => admin || Date.now() - createdAt <= CART_MS;

function toCartRequest(id: string, data: Record<string, unknown>, admin: boolean): CartRequest {
  const items = itemsOf(data);
  const quote = data.quote as CartRequest["quote"] | undefined;
  return {
    id,
    requestId: typeof data.requestId === "string" ? data.requestId : `PS-R-${id.slice(0, 5).toUpperCase()}`,
    // Prices are the team's working figures, so customers don't see them.
    items: admin ? items : items.map(({ productUrl, quantity, details }) => ({ productUrl, quantity, details })),
    customerName: String(data.customerName ?? ""),
    deliveryLocation: String(data.deliveryLocation ?? ""),
    notes: String(data.notes ?? ""),
    createdAt: millis(data.createdAt),
    ...(data.updatedAt ? { updatedAt: millis(data.updatedAt) } : {}),
    ...(admin && quote ? { quote: { ...quote, quotedAt: millis(quote.quotedAt) } } : {}),
  };
}

/** An order request from the /order form: a new request, or added to the number's open one. Returns the full product list and the /cart link. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = cleanItems(body?.items);
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });
  const mobile = nepalMobile(body?.mobile);
  const deliveryLocation = text(body?.deliveryLocation, 300);
  if (!mobile || !/^\+9779\d{9}$/.test(String(body?.mobile).trim())) return NextResponse.json({ error: "Check your Nepal WhatsApp number." }, { status: 400 });
  if (!deliveryLocation) return NextResponse.json({ error: "Enter your delivery address." }, { status: 400 });
  const customerName = text(body?.name, 80);
  if (!customerName) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });

  const notes = text(body?.notes, 1000);
  const now = Timestamp.now();

  // Already an open request from this number (last CART_DAYS, not cancelled)? Add to it instead of starting another.
  const mine = await getDocs(query(collection(db, ORDER_REQUESTS), where("mobile", "==", `+977${mobile}`)));
  const open = mine.docs
    .filter(d => !d.data().cancelled && editable(millis(d.data().createdAt), false))
    .sort((a, b) => millis(b.data().createdAt) - millis(a.data().createdAt))[0];
  if (open) {
    const data = open.data();
    const before = itemsOf(data);
    const merged = mergeItems(before, items);
    if (merged.length > MAX_ITEMS) return NextResponse.json({ error: `Your cart can hold up to ${MAX_ITEMS} products. Remove some from your cart first.` }, { status: 400 });
    await updateDoc(open.ref, {
      items: merged, itemCount: merged.length, totalQuantity: totalPieces(merged),
      productUrl: merged[0].productUrl, quantity: merged[0].quantity,
      customerName, deliveryLocation, ...(notes ? { notes } : {}),
      updatedAt: now, editCount: (Number(data.editCount) || 0) + 1, lastEditedBy: "customer-form",
      ...(body?.firstOrderOfferRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
      ...(productsDiffer(before, merged) && data.quote ? { quote: deleteField() } : {}),
    });
    return NextResponse.json({
      merged: true, requestId: data.requestId, cartPath: cartPath(mobile),
      items: merged.map(({ productUrl, quantity, details }) => ({ productUrl, quantity, details })), notes: notes || String(data.notes ?? ""),
    }, { headers: noStore });
  }

  const requestId = makeRequestId();
  await addDoc(collection(db, ORDER_REQUESTS), {
    requestId, items, itemCount: items.length, totalQuantity: totalPieces(items),
    // The first product is also kept at the top level, matching older single-product records.
    productUrl: items[0].productUrl, quantity: items[0].quantity,
    mobile: `+977${mobile}`, customerName, deliveryLocation, notes,
    selectedDate: now, createdAt: now,
    ...(body?.firstOrderOfferRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
  });
  return NextResponse.json({ merged: false, requestId, cartPath: cartPath(mobile), items, notes }, { headers: noStore });
}

/** The cart: this number's order requests from the last CART_DAYS (every request for the team). */
export async function GET(req: NextRequest) {
  const who = access(req);
  if (!who.ok) return NextResponse.json({ error: who.reason }, { status: 400 });
  const snap = await getDocs(query(collection(db, ORDER_REQUESTS), where("mobile", "==", `+977${who.mobile}`)));
  const requests = snap.docs
    .filter(d => !d.data().cancelled && editable(millis(d.data().createdAt), who.admin))
    .map(d => toCartRequest(d.id, d.data(), who.admin))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, who.admin ? 20 : 10);
  return NextResponse.json({ mobile: who.mobile, admin: who.admin, requests }, { headers: noStore });
}

/** Saves the customer's edits to one request, or cancels it. */
export async function PUT(req: NextRequest) {
  const who = access(req);
  if (!who.ok) return NextResponse.json({ error: who.reason }, { status: 400 });
  const body = await req.json().catch(() => null);
  const id = text(body?.id, 100);
  if (!id) return NextResponse.json({ error: "Missing request." }, { status: 400 });

  const ref = doc(db, ORDER_REQUESTS, id);
  const snap = await getDoc(ref);
  const data = snap.data();
  if (!data || data.mobile !== `+977${who.mobile}` || data.cancelled) return NextResponse.json({ error: "This request wasn't found." }, { status: 404 });
  if (!editable(millis(data.createdAt), who.admin)) return NextResponse.json({ error: "expired" }, { status: 410 });

  if (body?.cancel === true) {
    await updateDoc(ref, { cancelled: true, cancelledAt: Timestamp.now(), cancelledBy: who.admin ? "admin" : "customer" });
    return NextResponse.json({ ok: true });
  }

  const items = cleanItems(body?.items);
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });
  const deliveryLocation = text(body?.deliveryLocation, 300);
  if (!deliveryLocation) return NextResponse.json({ error: "Enter your delivery address." }, { status: 400 });

  // A product keeps the team's price while its link stays the same.
  const before = itemsOf(data);
  const priced: CartItem[] = items.map(item => {
    const match = before.find(old => old.productUrl === item.productUrl && typeof old.priceInr === "number");
    return match ? { ...item, priceInr: match.priceInr } : item;
  });
  const productsChanged = productsDiffer(before, priced);

  await updateDoc(ref, {
    items: priced, itemCount: priced.length, totalQuantity: totalPieces(priced),
    productUrl: priced[0].productUrl, quantity: priced[0].quantity,
    deliveryLocation, notes: text(body?.notes, 1000),
    // Older requests have no name; one typed in the cart is saved.
    ...(text(body?.customerName, 80) ? { customerName: text(body?.customerName, 80) } : {}),
    updatedAt: Timestamp.now(), editCount: (Number(data.editCount) || 0) + 1, lastEditedBy: who.admin ? "admin" : "customer",
    // A saved quotation no longer matches once products or quantities change.
    ...(productsChanged && data.quote ? { quote: deleteField() } : {}),
  });
  const saved = (await getDoc(ref)).data()!;
  return NextResponse.json({ request: toCartRequest(id, saved, who.admin) }, { headers: noStore });
}
