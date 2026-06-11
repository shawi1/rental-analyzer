import { NextResponse } from "next/server";
import { searchRedfin, RedfinError } from "@/lib/server/redfin";
import type { PropertyType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free (best-effort) budget search via Redfin. No API key required.
export async function POST(req: Request) {
  let body: {
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: PropertyType;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body.city || !body.state) {
    return NextResponse.json({ error: "missing-location", message: "City and state are required." }, { status: 400 });
  }

  try {
    const { results, regionName } = await searchRedfin({
      city: body.city,
      state: body.state,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      bedrooms: body.bedrooms,
      propertyType: body.propertyType,
    });
    return NextResponse.json({ count: results.length, results, regionName, source: "Redfin" });
  } catch (e) {
    const err = e as RedfinError;
    return NextResponse.json(
      {
        error: "redfin",
        message:
          err.status === 404
            ? err.message
            : "Redfin didn't return results (it may be temporarily blocking automated requests). Try RentCast, or try again.",
      },
      { status: 200 }
    );
  }
}
