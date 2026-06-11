import { NextResponse } from "next/server";
import { rentcastGet, resolveRentCastKey, mapPropertyType, toPropertyTypeParam, RentCastError } from "@/lib/server/rentcast";
import type { ListingSearchResult, PropertyType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Budget-based property discovery. Searches active SALE listings via RentCast.
export async function POST(req: Request) {
  const apiKey = resolveRentCastKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "no-key", message: "Add a RentCast API key in Settings to search listings." }, { status: 400 });
  }

  let body: {
    city?: string;
    state?: string;
    zipCode?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: PropertyType;
    limit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  if (!body.city && !body.zipCode) {
    return NextResponse.json({ error: "missing-location", message: "Provide a city (and state) or ZIP." }, { status: 400 });
  }

  try {
    // RentCast doesn't filter price server-side on all plans — fetch then filter.
    const raw = await rentcastGet(
      "/listings/sale",
      {
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        propertyType: toPropertyTypeParam(body.propertyType),
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        status: "Active",
        limit: Math.min(body.limit ?? 100, 200),
      },
      apiKey
    );

    const arr: unknown[] = Array.isArray(raw) ? raw : [];
    let results: ListingSearchResult[] = arr.map((r) => {
      const x = r as Record<string, unknown>;
      return {
        address: (x.formattedAddress as string) || (x.addressLine1 as string) || "Unknown address",
        zip: (x.zipCode as string) || undefined,
        price: Number(x.price) || 0,
        beds: Number(x.bedrooms) || 0,
        baths: Number(x.bathrooms) || 0,
        sqft: x.squareFootage ? Number(x.squareFootage) : undefined,
        propertyType: mapPropertyType(x.propertyType as string),
        yearBuilt: x.yearBuilt ? Number(x.yearBuilt) : undefined,
        daysOnMarket: x.daysOnMarket ? Number(x.daysOnMarket) : undefined,
        hoaMonthly:
          x.hoa && typeof x.hoa === "object" ? Number((x.hoa as Record<string, unknown>).fee) || undefined : undefined,
        url: (x.listingUrl as string) || undefined,
        source: "RentCast",
        lat: x.latitude ? Number(x.latitude) : undefined,
        lng: x.longitude ? Number(x.longitude) : undefined,
      };
    });

    if (body.minPrice) results = results.filter((r) => r.price >= body.minPrice!);
    if (body.maxPrice) results = results.filter((r) => r.price <= body.maxPrice!);
    results.sort((a, b) => a.price - b.price);

    return NextResponse.json({ count: results.length, results });
  } catch (e) {
    const err = e as RentCastError;
    return NextResponse.json({ error: "rentcast", message: err.message }, { status: err.status || 500 });
  }
}
