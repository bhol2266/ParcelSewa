import { NextRequest, NextResponse } from "next/server";

const CRONJOB_API = process.env.CRONJOB_API_URL || "https://backend.uktechdeveloper.co.uk/parcelsewa";

// ── Myntra-specific image extractor ──────────────────────────────────────────
// Myntra is a React SPA; the scraper gets raw HTML which lacks dynamic content.
// However, Myntra embeds product data in an inline <script> tag as JSON, and
// their CDN image URLs follow a predictable pattern based on the product ID.
async function fetchMyntraImage(productUrl: string, notes: string): Promise<string | null> {
    try {
        // Extract the product ID from the URL.
        // Myntra URLs look like: https://www.myntra.com/tops/brand/name-detail/12345678/buy
        const idMatch = productUrl.match(/\/(\d{6,10})\/buy/);
        const productId = idMatch?.[1];

        // Step 1: Try fetching the raw HTML and parse the embedded JSON script.
        const res = await fetch(productUrl, {
            headers: {
                // Mimic a real browser to avoid bot-detection blocks.
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
            const html = await res.text();

            // Myntra injects product data into a script tag like:
            // <script id="__NEXT_DATA__" ...>{"props":{"pageProps":{"pdpData":...}}}</script>
            // or a legacy: window.__myntraweb__ = {...}
            const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (nextDataMatch) {
                try {
                    const json = JSON.parse(nextDataMatch[1]);
                    // Navigate to the media list in the pdp data
                    const pdpData =
                        json?.props?.pageProps?.pdpData ||
                        json?.props?.pageProps?.initialState?.pdp?.pdpData;
                    const media: any[] = pdpData?.mediaList ?? pdpData?.media ?? [];

                    if (media.length > 0) {
                        // Each entry has a `src` (base URL) and optionally `imageURL`
                        // Pick the one matching `notes` color hint if possible
                        const hint = notes?.toLowerCase() ?? "";
                        const scored = media
                            .filter((m) => m.src || m.imageURL)
                            .map((m) => {
                                const url: string = m.imageURL ?? `${m.src}`;
                                const matchesHint =
                                    hint && url.toLowerCase().includes(hint) ? 1 : 0;
                                // Myntra appends ?q=90&crop=false to hi-res images
                                const isHighRes = url.includes("h=960") || url.includes("h=780") ? 1 : 0;
                                return { url, score: matchesHint * 10 + isHighRes };
                            })
                            .sort((a, b) => b.score - a.score);

                        if (scored[0]?.url) return scored[0].url;
                    }
                } catch {
                    // JSON parse failed — fall through to CDN pattern
                }
            }

            // Legacy Myntra: images are in <img> tags with class "image-grid-imageContainer"
            // or in an og:image meta tag which IS server-rendered.
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
            if (ogMatch?.[1]) return ogMatch[1];
        }

        // Step 2: Fallback — construct Myntra's CDN URL directly from the product ID.
        // Myntra CDN pattern: https://assets.myntassets.com/h/960/q/90/{productId}/images/1/1/1/*_1.jpg
        // This is the standard front-image slot used across nearly all listings.
        if (productId) {
            return `https://assets.myntassets.com/h/960,q_90/${productId}/images/1/1/1/1_1.jpg`;
        }

        return null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { productUrl, notes } = await req.json();

        if (!productUrl) {
            return NextResponse.json({ error: "Missing productUrl" }, { status: 400 });
        }

        // ── Myntra early-exit: bypass generic scraper ─────────────────────────
        const isMyntra = /myntra\.com/i.test(productUrl);
        if (isMyntra) {
            const myntraImage = await fetchMyntraImage(productUrl, notes || "");
            if (myntraImage) {
                return NextResponse.json({ imageUrl: myntraImage });
            }
            // If Myntra extractor failed, fall through to generic scraper as a last resort.
        }

        // ── Step 1: Get image candidates from scraper ─────────────────────────
        let candidates: string[] = [];
        let scrapeMessage = "";

        try {
            const scrapeRes = await fetch(`${CRONJOB_API}/html`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: productUrl }),
                signal: AbortSignal.timeout(35000),
            });

            const rawText = await scrapeRes.text();
            let scrapeData: any;

            try {
                scrapeData = JSON.parse(rawText);
            } catch {
                return NextResponse.json(
                    { error: `Scraper returned non-JSON (${scrapeRes.status}): ${rawText.slice(0, 150)}` },
                    { status: 502 }
                );
            }

            if (!scrapeRes.ok || scrapeData.error) {
                return NextResponse.json({ error: `Scraper error: ${scrapeData.error}` }, { status: 502 });
            }

            candidates = scrapeData.candidates || [];
            scrapeMessage = scrapeData.message || "";
        } catch (err: any) {
            return NextResponse.json({ error: `Could not reach scraper: ${err.message}` }, { status: 502 });
        }

        if (candidates.length === 0) {
            return NextResponse.json({ error: scrapeMessage || "No images found on product page" }, { status: 422 });
        }

        // ── Step 2: Single candidate — return directly, no Claude needed ──────
        if (candidates.length === 1) {
            return NextResponse.json({ imageUrl: candidates[0] });
        }

        // ── Step 3: Multiple candidates — ask Claude to pick the best one ─────
        const prompt = `You are given a list of image URLs from a product page.

Product URL: ${productUrl}
Order notes (color/variant hint): "${notes || "none"}"

Pick the ONE URL that is the main product image.
- Prefer og:image / structured data images (usually first)
- Pick highest resolution (large size numbers like 1500, 1000, 800 in URL)
- If notes mention a color, pick the matching image
- Ignore navigation, banners, logos, thumbnails (small numbers like 40, 50 in URL)

Image URLs:
${candidates.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Reply with ONLY the chosen URL. No explanation.`;

        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": "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",
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 300,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        const claudeData = await claudeRes.json();

        if (!claudeRes.ok) {
            // Claude failed — fall back to first candidate
            return NextResponse.json({ imageUrl: candidates[0] });
        }

        const textBlocks = claudeData.content?.filter((b: any) => b.type === "text") || [];
        const result = textBlocks[textBlocks.length - 1]?.text?.trim() || "";

        const matched = candidates.find(u => result.includes(u) || u.includes(result.trim()));
        if (matched) return NextResponse.json({ imageUrl: matched });

        if (result.startsWith("http") && !result.includes(" ")) {
            return NextResponse.json({ imageUrl: result });
        }

        // Fallback to first candidate (usually og:image)
        return NextResponse.json({ imageUrl: candidates[0] });

    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Unknown server error" }, { status: 500 });
    }
}