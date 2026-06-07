// Server-side RentCast API helper. Free tier = 50 requests/month.
// Key resolution: header `x-rentcast-key` → env RENTCAST_API_KEY.
// Docs: https://developers.rentcast.io

import type { PropertyType } from "../types";

const BASE = "https://api.rentcast.io/v1";

export class RentCastError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function resolveRentCastKey(req: Request): string | undefined {
  return req.headers.get("x-rentcast-key") || process.env.RENTCAST_API_KEY || undefined;
}

export async function rentcastGet(path: string, params: Record<string, string | number | undefined>, apiKey: string) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": apiKey, accept: "application/json" },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new RentCastError(`RentCast error (${res.status}): ${detail}`, res.status);
  }
  return res.json();
}

export function mapPropertyType(rc?: string): PropertyType {
  switch ((rc || "").toLowerCase()) {
    case "condo":
    case "apartment":
      return "condo";
    case "townhouse":
      return "townhome";
    case "single family":
    case "manufactured":
      return "single-family";
    case "multi-family":
      return "multi-family";
    default:
      return "other";
  }
}

export function toPropertyTypeParam(t?: PropertyType): string | undefined {
  switch (t) {
    case "condo":
      return "Condo";
    case "townhome":
      return "Townhouse";
    case "single-family":
      return "Single Family";
    case "multi-family":
      return "Multi-Family";
    default:
      return undefined;
  }
}
