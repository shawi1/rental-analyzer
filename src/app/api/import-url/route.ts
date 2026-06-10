import { NextResponse } from "next/server";
import { resolveAnthropicKey, AnthropicError } from "@/lib/server/anthropic";
import { fetchListingText, extractListing } from "@/lib/server/listing";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fetch a single listing URL and extract structured fields in one call.
// Used by the bulk Zillow-URL importer (the client calls this per URL).
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, url, error: "bad-url", message: "Not a valid http(s) URL." }, { status: 200 });
  }

  // 1) Fetch the page
  let fetched;
  try {
    fetched = await fetchListingText(url);
  } catch (e) {
    return NextResponse.json({ ok: false, url, blocked: false, error: "fetch-failed", message: (e as Error).message }, { status: 200 });
  }
  if (!fetched.ok) {
    return NextResponse.json(
      { ok: false, url, blocked: fetched.blocked, error: fetched.blocked ? "blocked" : "no-content", message: fetched.message || "Couldn't read the page." },
      { status: 200 }
    );
  }

  // 2) Extract with AI
  const apiKey = resolveAnthropicKey(req);
  if (!apiKey) {
    return NextResponse.json({ ok: false, url, error: "no-key", message: "Add an Anthropic API key in Settings to auto-extract listings." }, { status: 200 });
  }
  try {
    const listing = await extractListing(fetched.text, url, apiKey);
    if (!listing || !listing.address) {
      return NextResponse.json({ ok: false, url, error: "parse-failed", message: "Fetched the page but couldn't extract listing details." }, { status: 200 });
    }
    return NextResponse.json({ ok: true, url, listing });
  } catch (e) {
    const err = e as AnthropicError;
    return NextResponse.json({ ok: false, url, error: "anthropic", message: err.message }, { status: 200 });
  }
}
