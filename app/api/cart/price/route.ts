import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { isValidUrl } from "@/lib/cart";

// The Claude lookup itself runs on the ParcelSewa backend (Cronjob server), which holds the Anthropic key:
//   POST {backend}/claude-price { url } -> 202 { jobId } | 200 { price, title, note }
//   GET  {backend}/claude-price/:jobId  -> 202 pending   | 200 { price, title, note }
// This route only checks that the caller is the team and passes requests through.
const BACKEND = (process.env.CRONJOB_API_URL || "https://backend.uktechdeveloper.co.uk/parcelsewa").replace(/\/$/, "");
// Optional shared password: when PARCELSEWA_PRICE_TOKEN is set on the backend, set the same value here.
const tokenHeader = (): Record<string, string> => (process.env.PARCELSEWA_PRICE_TOKEN ? { "x-parcelsewa-token": process.env.PARCELSEWA_PRICE_TOKEN } : {});

const isTeam = (req: NextRequest) => req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD;

async function relay(response: Response) {
  const result = await response.json().catch(() => ({ error: `Backend error ${response.status}` }));
  return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

/** Team only (each lookup costs API credit): starts a price lookup for a product link. */
export async function POST(req: NextRequest) {
  if (!isTeam(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const url = String(body?.url ?? "").trim();
  if (!isValidUrl(url)) return NextResponse.json({ error: "Invalid product link." }, { status: 400 });
  try {
    return await relay(await fetch(`${BACKEND}/claude-price`, {
      method: "POST", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20000),
    }));
  } catch {
    return NextResponse.json({ error: "The price service didn't answer." }, { status: 502 });
  }
}

/** Team only: the state of a lookup started above (?job=…). */
export async function GET(req: NextRequest) {
  if (!isTeam(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const job = req.nextUrl.searchParams.get("job") ?? "";
  if (!/^[\w-]{8,64}$/.test(job)) return NextResponse.json({ error: "Invalid lookup." }, { status: 400 });
  try {
    return await relay(await fetch(`${BACKEND}/claude-price/${job}`, { headers: tokenHeader(), cache: "no-store", signal: AbortSignal.timeout(20000) }));
  } catch {
    return NextResponse.json({ error: "The price service didn't answer." }, { status: 502 });
  }
}
