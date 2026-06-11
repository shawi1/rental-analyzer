import { NextResponse } from "next/server";
import { callAnthropic, extractJson, resolveAnthropicKey, AnthropicError } from "@/lib/server/anthropic";
import type { ExtractedListing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Parse pasted listing text (or scraped page text) into structured fields.
export async function POST(req: Request) {
  const apiKey = resolveAnthropicKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "no-key", message: "Add an Anthropic API key in Settings to use smart paste." }, { status: 400 });
  }

  let body: { text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const text = (body.text || "").slice(0, 16000);
  if (!text.trim()) {
    return NextResponse.json({ error: "missing-text" }, { status: 400 });
  }

  const prompt = `Extract real-estate listing details from the text below (it may be pasted from Zillow, Realtor.com, Redfin, etc.).

Return ONLY a JSON object with any fields you can confidently determine (omit unknown fields):
{
  "address": "street address",
  "unit": "unit/apt number if separate",
  "complex": "building or community name",
  "zip": "5-digit ZIP code",
  "price": number (list price in dollars, no commas),
  "beds": number (0 for studio),
  "baths": number,
  "sqft": number,
  "propertyType": "condo" | "single-family" | "townhome" | "multi-family" | "other",
  "yearBuilt": number,
  "daysOnMarket": number,
  "hoaMonthly": number,
  "zillowUrl": "${body.url || ""}"
}

Listing text:
"""
${text}
"""`;

  try {
    const { text: out } = await callAnthropic({
      apiKey,
      maxTokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = extractJson<ExtractedListing>(out);
    if (!parsed) return NextResponse.json({ error: "parse-failed", raw: out }, { status: 502 });
    if (body.url && !parsed.zillowUrl) parsed.zillowUrl = body.url;
    return NextResponse.json(parsed);
  } catch (e) {
    const err = e as AnthropicError;
    return NextResponse.json({ error: "anthropic", message: err.message }, { status: err.status || 500 });
  }
}
