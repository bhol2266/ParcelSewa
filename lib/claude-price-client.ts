// Browser side of /api/cart/price: asks the server to read a product's INR price with Claude (admin cookie needed).
export async function fetchProductPriceViaClaude(url: string): Promise<{ price: number | null; note: string }> {
    try {
        const response = await fetch("/api/cart/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) return { price: null, note: result.error || "Claude lookup failed" };
        return { price: typeof result.price === "number" ? result.price : null, note: result.note || "Claude couldn’t find a price" };
    } catch {
        return { price: null, note: "No connection" };
    }
}
