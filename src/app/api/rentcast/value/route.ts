import { NextResponse } from "next/server";
import { rentcastGet, resolveRentCastKey, RentCastError } from "@/lib/server/rentcast";

export const runtime = "nodejs";
export const maxDuration = 30;

// Property value (AVM) + long-term rent estimate for an address.
export async function POST(req: Request) {
  const apiKey = resolveRentCastKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "no-key", message: "Add a RentCast API key in Settings to fetch estimates." }, { status: 400 });
  }

  let body: { address?: string; propertyType?: string; bedrooms?: number; bathrooms?: number; squareFootage?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body.address) {
    return NextResponse.json({ error: "missing-address" }, { status: 400 });
  }

  const params = {
    address: body.address,
    propertyType: body.propertyType,
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    squareFootage: body.squareFootage,
  };

  try {
    const [value, rent] = await Promise.allSettled([
      rentcastGet("/avm/value", params, apiKey),
      rentcastGet("/avm/rent/long-term", params, apiKey),
    ]);

    const v = value.status === "fulfilled" ? (value.value as Record<string, unknown>) : null;
    const r = rent.status === "fulfilled" ? (rent.value as Record<string, unknown>) : null;

    return NextResponse.json({
      value: v ? Number(v.price) || null : null,
      valueLow: v ? Number(v.priceRangeLow) || null : null,
      valueHigh: v ? Number(v.priceRangeHigh) || null : null,
      rent: r ? Number(r.rent) || null : null,
      rentLow: r ? Number(r.rentRangeLow) || null : null,
      rentHigh: r ? Number(r.rentRangeHigh) || null : null,
      errors: {
        value: value.status === "rejected" ? (value.reason as Error).message : undefined,
        rent: rent.status === "rejected" ? (rent.reason as Error).message : undefined,
      },
    });
  } catch (e) {
    const err = e as RentCastError;
    return NextResponse.json({ error: "rentcast", message: err.message }, { status: err.status || 500 });
  }
}
