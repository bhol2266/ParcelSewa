import { NextRequest, NextResponse } from "next/server";
import { doc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

const settingsRef = () => doc(db, "siteSettings", "homepage");
const noCache = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const snapshot = await getDocFromServer(settingsRef());
    const saved = snapshot.data()?.homepageOfferVisible;
    return NextResponse.json({ homepageOfferVisible: typeof saved === "boolean" ? saved : true }, { headers: noCache });
  } catch (error) {
    console.error("Failed to load homepage offer setting:", error);
    return NextResponse.json({ error: "Could not load the homepage offer setting." }, { status: 503, headers: noCache });
  }
}

export async function PATCH(request: NextRequest) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Sign in to the admin panel to change this setting." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || request.nextUrl.protocol.slice(0, -1);
  const expectedOrigin = `${protocol}://${request.headers.get("host") || request.nextUrl.host}`;
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: "This request is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Send a valid offer visibility setting." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("homepageOfferVisible" in body) || typeof body.homepageOfferVisible !== "boolean") {
    return NextResponse.json({ error: "Choose whether the homepage offer is shown or hidden." }, { status: 400 });
  }

  try {
    await setDoc(settingsRef(), { homepageOfferVisible: body.homepageOfferVisible, updatedAt: serverTimestamp() }, { merge: true });
    return NextResponse.json({ homepageOfferVisible: body.homepageOfferVisible }, { headers: noCache });
  } catch (error) {
    console.error("Failed to save homepage offer setting:", error);
    return NextResponse.json({ error: "Could not save the setting. Please try again." }, { status: 503, headers: noCache });
  }
}
