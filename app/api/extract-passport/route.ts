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
                text: `This image shows a Nepali passport — it may contain TWO pages visible at once: the top half is the inner data page (contains address, emergency contact, old passport info printed sideways/rotated), and the bottom half is the main bio-data page.

Carefully examine BOTH halves of the image, including any text that is rotated 90 degrees.

Extract all details and return ONLY a JSON object with these exact fields:
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
  "personalNumber": "",
  "permanentAddress": ""
}

Rules:
- Use DD MMM YYYY format for all dates (e.g., "18 AUG 1993").
- fullName should be "GIVEN_NAMES SURNAME" (e.g., "TEK BAHADUR ROKA MAGAR").
- permanentAddress: look in the TOP half of the image (inner page), find the field labelled "ठेगाना | ADDRESS" — it is printed sideways/rotated. Extract that full address (e.g., "CHEPANG, BANSGADHI 1, BARDIYA"). If not found, leave as "".
- Return ONLY the JSON, no explanation.`,
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