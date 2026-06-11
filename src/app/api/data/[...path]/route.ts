import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Thin proxy to the rentaliq-data microservice. Keeps DATA_API_KEY server-side
// and lets the browser hit /api/data/<endpoint> for any service route.
const BASE = (process.env.DATA_API_URL || "http://127.0.0.1:8088").replace(/\/$/, "");
const KEY = process.env.DATA_API_KEY || "dev-local-key";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(`${BASE}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const r = await fetch(url.toString(), {
      headers: { "x-api-key": KEY },
      signal: AbortSignal.timeout(55000),
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "data-service-unreachable",
        message:
          "Couldn't reach the rentaliq-data service. Is it running (DATA_API_URL), and deployed for production?",
        detail: (e as Error).message,
      },
      { status: 502 }
    );
  }
}
