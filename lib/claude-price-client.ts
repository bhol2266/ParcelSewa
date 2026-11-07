// Browser side of /api/cart/price: asks the ParcelSewa backend (through the site, admin cookie needed) to read a
// product's INR price with Claude. A lookup takes 10-60 seconds, so it starts a job and checks back until it's done.
const POLL_MS = 2500;
const GIVE_UP_MS = 120_000;

/** The price (and the product photo Claude saw on the same page, when there is one). */
export type ClaudeLookup = { price: number | null; note: string; imageUrl?: string };

export async function fetchProductPriceViaClaude(url: string): Promise<ClaudeLookup> {
  const read = (result: { price?: unknown; note?: unknown; error?: unknown; imageUrl?: unknown }): ClaudeLookup => ({
    price: typeof result.price === "number" ? result.price : null,
    note: String(result.note || result.error || "Claude couldn’t find a price"),
    ...(typeof result.imageUrl === "string" && result.imageUrl.startsWith("https://") ? { imageUrl: result.imageUrl } : {}),
  });
  try {
    const started = await fetch("/api/cart/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const first = await started.json().catch(() => ({}));
    if (started.status === 200) return read(first);
    if (started.status !== 202 || typeof first.jobId !== "string") return { price: null, note: first.error || "Claude lookup failed" };

    const deadline = Date.now() + GIVE_UP_MS;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, POLL_MS));
      const poll = await fetch(`/api/cart/price?job=${encodeURIComponent(first.jobId)}`, { cache: "no-store" });
      if (poll.status === 202) continue;
      const result = await poll.json().catch(() => ({}));
      return poll.ok ? read(result) : { price: null, note: result.error || "Claude lookup failed" };
    }
    return { price: null, note: "Claude took too long" };
  } catch {
    return { price: null, note: "No connection" };
  }
}
