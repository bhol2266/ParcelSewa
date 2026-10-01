import { NextRequest, NextResponse } from "next/server";
import { fetchAjioImage, fetchFlipkartImage, fetchGenericImage, isStoreUrl } from "@/lib/product-images";

// The configured store scraper can take up to a minute on blocked product pages.
export const maxDuration = 180;
// Flipkart and Ajio block most non-Indian datacenter IPs, so run the function in Mumbai.
export const preferredRegion = "bom1";

const CRONJOB_API = process.env.CRONJOB_API_URL || "https://backend.uktechdeveloper.co.uk/parcelsewa";
// const CRONJOB_API = process.env.CRONJOB_API_URL || "http://localhost:4001/parcelsewa";

// ── Myntra: delegate to backend scraper which uses internal Myntra API ────────
// The old fetchMyntraImage() was generating broken CDN URLs like:
//   /h/960,q_90/{productId}/images/1/1/1/1_1.jpg  → always 404
// Real Myntra image URLs contain a date+hash that can't be guessed.
// The backend (localhost:4001) handles Myntra via gateway/v2/product/{id}.
async function fetchMyntraImageFromBackend(productUrl: string): Promise<string | null> {
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
            return null;
        }

        const candidates: string[] = scrapeData.candidates || [];
        if (candidates.length === 0) return null;

        // Return first candidate — Myntra API returns images in priority order
        return candidates[0];
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

        let parsedUrl: URL;
        try {
            if (typeof productUrl !== "string") throw new Error("Invalid URL");
            parsedUrl = new URL(productUrl);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
        } catch {
            return NextResponse.json({ error: "Invalid productUrl" }, { status: 400 });
        }

        // Dedicated store extractors bypass the generic scraper/Claude selection.
        const isAjio = isStoreUrl(parsedUrl, "ajio.com");
        const isFlipkart = isStoreUrl(parsedUrl, "flipkart.com");
        if (isAjio || isFlipkart) {
            const fetchImage = isAjio ? fetchAjioImage : fetchFlipkartImage;
            const diag: string[] = [];
            const imageUrl = await fetchImage(productUrl, typeof notes === "string" ? notes : "", CRONJOB_API, diag);
            if (imageUrl) return NextResponse.json({ imageUrl });
            return NextResponse.json({
                error: `Could not fetch image from ${isAjio ? "Ajio" : "Flipkart"}. The site may be blocking access or the product may be unavailable.`,
                detail: diag,
            }, { status: 422 });
        }

        // ── Myntra early-exit: use backend scraper (internal Myntra API) ───────
        const isMyntra = /myntra\.com/i.test(productUrl);
        if (isMyntra) {
            const myntraImage = await fetchMyntraImageFromBackend(productUrl);
            if (myntraImage) {
                return NextResponse.json({ imageUrl: myntraImage });
            }
            return NextResponse.json(
                { error: "Could not fetch image from Myntra. The product may be unavailable or blocked." },
                { status: 422 }
            );
        }

        // ── Step 0: most stores publish og:image; read it directly before using the scraper ──
        const direct = await fetchGenericImage(productUrl, typeof notes === "string" ? notes : "");
        if (direct) return NextResponse.json({ imageUrl: direct });

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

        // Without a key, skip the Claude pick and use the first candidate (usually og:image).
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return NextResponse.json({ imageUrl: candidates[0] });

        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": anthropicKey,
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
