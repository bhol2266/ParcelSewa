// Server-only: reads a product's selling price (INR) with Claude, for when the ParcelSewa Chrome extension isn't
// available (phones, or a computer without it). Claude opens the page with web fetch and, if the store blocks that,
// looks the product up with web search. Needs ANTHROPIC_API_KEY (the same key /api/extract-passport uses).
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export type ClaudePrice = { price: number | null; title: string; note: string };

const PRICE_SCHEMA = {
  type: "object",
  properties: {
    price: { type: ["number", "null"], description: "Price in INR for one unit, or null if it can't be determined." },
    title: { type: "string", description: "Product name as shown by the store, or empty." },
    note: { type: "string", description: "One short sentence: where the price came from, or why it couldn't be found." },
  },
  required: ["price", "title", "note"],
  additionalProperties: false,
} as const;

/** Short links (amzn.in/d/…, fkrt.it/…, dl.flipkart.com/…) → the full product URL, so Claude fetches the real page. */
async function expandShortLink(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } });
    const location = response.headers.get("location");
    return location ? new URL(location, url).href : url;
  } catch {
    return url;
  }
}

export async function findPriceWithClaude(productUrl: string): Promise<ClaudePrice> {
  const url = await expandShortLink(productUrl);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{
    role: "user",
    content: `Find the current selling price in Indian rupees of this product: ${url}${url !== productUrl ? ` (short link: ${productUrl})` : ""}

Open the URL with web_fetch. If the store blocks it or the page has no price, use web_search for the same product on the same store.
Give the price a customer would pay for one unit right now: the deal or selling price, not the MRP or a strike-through price, and without delivery charges or bank-card offers. If the page lists sizes or colours with different prices, use the one the link opens.
If the product is unavailable or you can't find a trustworthy price, return price null and say why in the note. Don't guess.`,
  }];

  // Server tools can pause a long turn; continue it a few times before giving up.
  for (let round = 0; round < 4; round++) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: { type: "json_schema", schema: PRICE_SCHEMA } },
      tools: [
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, max_content_tokens: 40000 },
        { type: "web_search_20260209", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "IN" } },
      ],
      // If a safety classifier declines, the API retries the same request on the fallback model.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") return { price: null, title: "", note: "Claude declined this request." };

    const text = response.content.filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text").map(block => block.text).join("");
    try {
      const parsed = JSON.parse(text) as ClaudePrice;
      const price = typeof parsed.price === "number" && Number.isFinite(parsed.price) && parsed.price > 0 ? Math.round(parsed.price * 100) / 100 : null;
      return { price, title: String(parsed.title ?? ""), note: String(parsed.note ?? "") };
    } catch {
      return { price: null, title: "", note: response.stop_reason === "max_tokens" ? "The answer was cut off." : "Claude's answer couldn't be read." };
    }
  }
  return { price: null, title: "", note: "Took too long to read the page." };
}
