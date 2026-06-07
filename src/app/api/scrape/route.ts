import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Best-effort fetch of a PUBLIC listing URL. Returns cleaned page text that the
// client can feed into /api/extract-listing. Note: Zillow aggressively blocks
// datacenter IPs — this works intermittently and NOT for private saved lists
// (those require your logged-in Zillow session). Honest fallback: paste text.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function htmlToText(html: string): string {
  // Pull JSON-LD blocks first (often contain clean listing data).
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

function looksBlocked(html: string): boolean {
  const l = html.toLowerCase();
  return (
    l.includes("captcha") ||
    l.includes("press & hold") ||
    l.includes("are you a human") ||
    l.includes("perimeterx") ||
    l.includes("access to this page has been denied")
  );
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "bad-url", message: "Provide a full http(s) URL." }, { status: 400 });
  }

  try {
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
    return NextResponse.json({
      ok: res.ok && !blocked,
      blocked,
      status: res.status,
      text,
      message: blocked
        ? "The site blocked this automated request (common with Zillow). Copy the listing text and use Smart Paste instead."
        : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: "fetch-failed", message: (e as Error).message }, { status: 502 });
  }
}
