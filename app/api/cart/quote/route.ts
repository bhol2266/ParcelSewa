import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { itemsOf, ORDER_REQUESTS } from "@/lib/cart";
import { commissionOptions } from "@/lib/quotation-estimate";

/** Team only: saves the INR price found (or typed) for each product, the quotation and the advance paid. */
export async function POST(req: NextRequest) {
  if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const ref = doc(db, ORDER_REQUESTS, id);
  const data = id ? (await getDoc(ref)).data() : undefined;
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const items = itemsOf(data);
  const prices: unknown[] = Array.isArray(body?.prices) ? body.prices : [];
  if (prices.length !== items.length) return NextResponse.json({ error: "The products changed. Reload the cart and try again." }, { status: 409 });
  const option = commissionOptions.find(o => String(o.value) === String(body?.rate));
  const totalNPR = Number(body?.totalNPR);
  if (!option || !Number.isFinite(totalNPR) || totalNPR <= 0) return NextResponse.json({ error: "Invalid quotation." }, { status: 400 });
  const advance = Number(body?.advance ?? 0);
  if (!Number.isFinite(advance) || advance < 0) return NextResponse.json({ error: "Advance can't be negative." }, { status: 400 });

  const priced = items.map((item, i) => {
    const price = Number(prices[i]);
    return Number.isFinite(price) && price > 0 ? { ...item, priceInr: Math.round(price * 100) / 100 } : item;
  });
  // Saving a quotation also shows these prices and the bill to the customer in their cart.
  await updateDoc(ref, { items: priced, quote: { rate: option.value, rateAuto: body?.rateAuto === true, totalNPR: Math.round(totalNPR), advance: Math.round(advance), quotedAt: Timestamp.now() } });
  return NextResponse.json({ ok: true });
}
