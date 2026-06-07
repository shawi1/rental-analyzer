import { NextResponse } from "next/server";
import { callAnthropic, extractJson, resolveAnthropicKey, AnthropicError } from "@/lib/server/anthropic";
import type { StrResearchResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = resolveAnthropicKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "no-key", message: "Add an Anthropic API key in Settings to use AI research." }, { status: 400 });
  }

  let body: { address?: string; city?: string; complex?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const { address, city, complex } = body;
  if (!address || !city) {
    return NextResponse.json({ error: "missing-fields", message: "address and city required" }, { status: 400 });
  }

  const prompt = `Research whether SHORT-TERM RENTALS (Airbnb / VRBO, < 30 day stays) are ALLOWED for this property:

Address: ${address}
${complex ? `Complex/Community: ${complex}\n` : ""}City/Market: ${city}

Use web search. Check, in order of reliability:
1. MLS records (Redfin, Realtor.com, Coldwell Banker) for the address or complex — look for "Short Term Rental", "no rental restrictions", "minimum lease" language.
2. Whether active Airbnb/VRBO listings exist for this complex (de-facto proof STR is allowed).
3. HOA / condo association rules and any city/county STR ordinances.

Then respond with ONLY a JSON object (no prose) in exactly this shape:
{
  "strAllowed": true | false | null,
  "confidence": "high" | "medium" | "low",
  "sources": ["url or source name", ...],
  "notes": "2-4 sentence summary of what you found and the key caveat"
}
Use null for strAllowed if genuinely undetermined. Be conservative — if you only find generic city-level info, confidence is "low".`;

  try {
    const { text } = await callAnthropic({
      apiKey,
      maxTokens: 2000,
      webSearch: true,
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = extractJson<StrResearchResult>(text);
    if (!parsed) {
      return NextResponse.json({ error: "parse-failed", raw: text }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    const err = e as AnthropicError;
    return NextResponse.json({ error: "anthropic", message: err.message }, { status: err.status || 500 });
  }
}
