import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const images = formData.getAll("images") as File[];

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const results = [];

    for (const image of images) {
      const arrayBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mediaType = (image.type || "image/jpeg") as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Extract passport details from this image. Return ONLY a JSON object with these exact fields:
{
  "surname": "",
  "givenNames": "",
  "fullName": "",
  "passportNumber": "",
  "dateOfBirth": "",
  "dateOfExpiry": "",
  "dateOfIssue": "",
  "nationality": "",
  "sex": "",
  "placeOfBirth": "",
  "personalNumber": ""
}

Use DD MMM YYYY format for all dates (e.g., "18 AUG 1993").
fullName should be "GIVEN_NAMES SURNAME" (e.g., "TEK BAHADUR ROKA MAGAR").
Return ONLY the JSON, no explanation.`,
              },
            ],
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/```json|```/g, "").trim();

      try {
        const parsed = JSON.parse(cleaned);
        results.push({ filename: image.name, data: parsed, error: null });
      } catch {
        results.push({
          filename: image.name,
          data: null,
          error: "Failed to parse passport data",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}