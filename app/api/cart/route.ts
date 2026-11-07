import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { addDoc, collection, deleteField, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { cleanItems, editableRequest, itemsOf, keptFromTeam, MAX_ITEMS, millis, mergeItems, ORDER_REQUESTS, productsDiffer, toCartRequest, totalPieces, visibleRequests, type CartItem } from "@/lib/cart";
import { cartPath, checkCartAccess } from "@/lib/cart-link";
import { nepalMobile } from "@/lib/track-auth";
import { festivalCampaign } from "@/lib/storefront";

const noStore = { "Cache-Control": "no-store" };
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

const editable = (createdAt: number, admin: boolean) => editableRequest(createdAt, admin);

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
  const admin = req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD;
  if (open) {
    const data = open.data();
    const before = itemsOf(data);
    const merged = mergeItems(before, items);
    if (merged.length > MAX_ITEMS) return NextResponse.json({ error: `Your cart can hold up to ${MAX_ITEMS} products. Remove some from your cart first.` }, { status: 400 });
    const changes = {
      items: merged, itemCount: merged.length, totalQuantity: totalPieces(merged),
      productUrl: merged[0].productUrl, quantity: merged[0].quantity,
      customerName, deliveryLocation, ...(notes ? { notes } : {}),
      updatedAt: now, editCount: (Number(data.editCount) || 0) + 1, lastEditedBy: "customer-form",
      ...(body?.firstOrderOfferRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
    };
    const dropQuote = productsDiffer(before, merged) && !!data.quote;
    await updateDoc(open.ref, { ...changes, ...(dropQuote ? { quote: deleteField() } : {}) });
    const saved: Record<string, unknown> = { ...data, ...changes };
    if (dropQuote) delete saved.quote;
    return NextResponse.json({
      merged: true, requestId: data.requestId, cartPath: cartPath(mobile),
      items: merged.map(({ productUrl, quantity, details }) => ({ productUrl, quantity, details })), notes: notes || String(data.notes ?? ""),
      request: toCartRequest(open.id, saved, admin),
    }, { headers: noStore });
  }

  const requestId = makeRequestId();
  const record = {
    requestId, items, itemCount: items.length, totalQuantity: totalPieces(items),
    // The first product is also kept at the top level, matching older single-product records.
    productUrl: items[0].productUrl, quantity: items[0].quantity,
    mobile: `+977${mobile}`, customerName, deliveryLocation, notes,
    selectedDate: now, createdAt: now,
    ...(body?.firstOrderOfferRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
  };
  const created = await addDoc(collection(db, ORDER_REQUESTS), record);
  return NextResponse.json({ merged: false, requestId, cartPath: cartPath(mobile), items, notes, request: toCartRequest(created.id, record, admin) }, { headers: noStore });
}

/** The cart: this number's order requests from the last CART_DAYS (every request for the team). */
export async function GET(req: NextRequest) {
  const who = access(req);
  if (!who.ok) return NextResponse.json({ error: who.reason }, { status: 400 });
  const snap = await getDocs(query(collection(db, ORDER_REQUESTS), where("mobile", "==", `+977${who.mobile}`)));
  const requests = visibleRequests(snap.docs.map(d => ({ id: d.id, data: d.data() })), who.admin);
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
    // Once the team has created the order the customer has paid / confirmed, so only the team can cancel.
    if (data.orderId && !who.admin) return NextResponse.json({ error: "This order is confirmed. Message us on WhatsApp to cancel it." }, { status: 409 });
    await updateDoc(ref, { cancelled: true, cancelledAt: Timestamp.now(), cancelledBy: who.admin ? "admin" : "customer" });
    return NextResponse.json({ ok: true });
  }

  const items = cleanItems(body?.items);
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });
  const deliveryLocation = text(body?.deliveryLocation, 300);
  if (!deliveryLocation) return NextResponse.json({ error: "Enter your delivery address." }, { status: 400 });

  // A product keeps the team's price and picture while its link stays the same.
  const before = itemsOf(data);
  const priced: CartItem[] = items.map(item => {
    const match = before.find(old => old.productUrl === item.productUrl);
    return match ? { ...item, ...keptFromTeam(match) } : item;
  });
  const productsChanged = productsDiffer(before, priced);

  const changes = {
    items: priced, itemCount: priced.length, totalQuantity: totalPieces(priced),
    productUrl: priced[0].productUrl, quantity: priced[0].quantity,
    deliveryLocation, notes: text(body?.notes, 1000),
    // The cart always sends the name box (empty when cleared); older callers that leave it out keep the saved name.
    ...(typeof body?.customerName === "string" ? { customerName: text(body.customerName, 80) } : {}),
    updatedAt: Timestamp.now(), editCount: (Number(data.editCount) || 0) + 1, lastEditedBy: who.admin ? "admin" : "customer",
  };
  // A saved quotation no longer matches once products or quantities change.
  const dropQuote = productsChanged && !!data.quote;
  await updateDoc(ref, { ...changes, ...(dropQuote ? { quote: deleteField() } : {}) });
  // Answer from what was just written instead of reading the document back: one database round trip fewer.
  const saved: Record<string, unknown> = { ...data, ...changes };
  if (dropQuote) delete saved.quote;
  return NextResponse.json({ request: toCartRequest(id, saved, who.admin) }, { headers: noStore });
}
