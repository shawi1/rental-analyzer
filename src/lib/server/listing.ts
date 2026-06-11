// Shared server helpers for fetching + extracting a single listing.
// Used by /api/scrape, /api/extract-listing, and /api/import-url.

import { callAnthropic, extractJson } from "./anthropic";
import type { ExtractedListing } from "../types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function htmlToText(html: string): string {
  const ld: string[] = [];
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) ld.push(m[1].trim());

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return (ld.length ? "JSON-LD:\n" + ld.join("\n") + "\n\n" : "") + text;
}

export function looksBlocked(html: string): boolean {
  const l = html.toLowerCase();
  return (
    l.includes("captcha") ||
    l.includes("press & hold") ||
    l.includes("are you a human") ||
    l.includes("perimeterx") ||
    l.includes("access to this page has been denied") ||
    l.includes("px-captcha")
  );
}

export interface FetchResult {
  ok: boolean;
  blocked: boolean;
  status: number;
  text: string;
  message?: string;
}

export async function fetchListingText(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  const html = await res.text();
  const blocked = looksBlocked(html) || (!res.ok && html.length < 2000);
  const text = htmlToText(html).slice(0, 16000);
  return {
    ok: res.ok && !blocked && text.length > 40,
    blocked,
    status: res.status,
    text,
    message: blocked
      ? "The site blocked this automated request (common with Zillow). Copy the listing text and use Smart Paste instead."
      : undefined,
  };
}

export async function extractListing(text: string, url: string | undefined, apiKey: string): Promise<ExtractedListing | null> {
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
  "zillowUrl": "${url || ""}"
}

Listing text:
"""
${text.slice(0, 16000)}
"""`;

  const { text: out } = await callAnthropic({
    apiKey,
    maxTokens: 800,
    messages: [{ role: "user", content: prompt }],
  });
  const parsed = extractJson<ExtractedListing>(out);
  if (parsed && url && !parsed.zillowUrl) parsed.zillowUrl = url;
  return parsed;
}
