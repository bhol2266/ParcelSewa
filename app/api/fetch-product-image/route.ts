import { NextRequest, NextResponse } from "next/server";

const CRONJOB_API = process.env.CRONJOB_API_URL || "https://backend.uktechdeveloper.co.uk/parcelsewa";

export async function POST(req: NextRequest) {
    try {
        const { productUrl, notes } = await req.json();

        if (!productUrl) {
            return NextResponse.json({ error: "Missing productUrl" }, { status: 400 });
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