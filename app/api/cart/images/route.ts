import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { isValidUrl, itemsOf, ORDER_REQUESTS } from "@/lib/cart";

/**
 * Team only: saves product pictures on a request. `images` lines up with the request's products by link
 * ({ productUrl, imageUrl }), so a product the customer removed or changed meanwhile is simply skipped.
 */
export async function POST(req: NextRequest) {
  if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const ref = doc(db, ORDER_REQUESTS, id);
  const data = id ? (await getDoc(ref)).data() : undefined;
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const found = new Map<string, string>();
  for (const entry of Array.isArray(body?.images) ? body.images : []) {
    const productUrl = String(entry?.productUrl ?? ""), imageUrl = String(entry?.imageUrl ?? "");
    if (productUrl && isValidUrl(imageUrl) && imageUrl.length < 2000) found.set(productUrl, imageUrl);
  }
  const items = itemsOf(data).map(item => (found.has(item.productUrl) ? { ...item, imageUrl: found.get(item.productUrl) } : item));
  await updateDoc(ref, { items });
  return NextResponse.json({ items });
}
