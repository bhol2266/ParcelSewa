import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { isValidUrl } from "@/lib/cart";
import { findPriceWithClaude } from "@/lib/claude-price";

// Reading a page and searching can take a while.
export const maxDuration = 90;

/** Team only (each call costs API credit): a product's INR price read by Claude, for phones without the extension. */
export async function POST(req: NextRequest) {
  if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_PASSWORD) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 503 });
  const body = await req.json().catch(() => null);
  const url = String(body?.url ?? "").trim();
  if (!isValidUrl(url)) return NextResponse.json({ error: "Invalid product link." }, { status: 400 });

  try {
    return NextResponse.json(await findPriceWithClaude(url));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Claude is busy — try again in a minute." }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "The Claude API key was rejected." }, { status: 502 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: `Claude API error ${error.status ?? ""}`.trim() }, { status: 502 });
    console.error("Claude price lookup failed:", error);
    return NextResponse.json({ error: "Price lookup failed." }, { status: 500 });
  }
}
