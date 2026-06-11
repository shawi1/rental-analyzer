// Free, best-effort Redfin search via their public stingray endpoints.
// No API key. ToS-gray and can break if Redfin changes their site — treat as
// a free alternative to RentCast, not a guaranteed source.

import type { ListingSearchResult, PropertyType } from "../types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class RedfinError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function stingray(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/plain,*/*" },
  });
  const text = await res.text();
  if (!res.ok) throw new RedfinError(`Redfin error (${res.status})`, res.status);
  return text;
}

interface Region {
  id: string;
  type: string;
  name: string;
}

export async function findRegion(city: string, state: string): Promise<Region | null> {
  const q = encodeURIComponent(`${city}, ${state}`);
  const raw = await stingray(`https://www.redfin.com/stingray/do/location-autocomplete?location=${q}&v=2&al=1`);
  const json = JSON.parse(raw.replace(/^\{\}&&/, ""));
  const payload = json?.payload;
  if (!payload) return null;

  const candidates: Record<string, unknown>[] = [];
  if (payload.exactMatch) candidates.push(payload.exactMatch);
  for (const section of payload.sections ?? []) {
    for (const row of section.rows ?? []) candidates.push(row);
  }
  // Prefer a city/place match (region type 6).
  const pick =
    candidates.find((r) => parseRegion(r)?.type === "6") ?? candidates.find((r) => parseRegion(r)) ?? null;
  return pick ? parseRegion(pick) : null;
}

function parseRegion(row: Record<string, unknown>): Region | null {
  const rawId = String(row.id ?? "");
  let type = row.type !== undefined ? String(row.type) : "";
  let id = rawId;
  if (rawId.includes("_")) {
    const [t, i] = rawId.split("_");
    type = t;
    id = i;
  }
  if (!id || !type) return null;
  return { id, type, name: String(row.name ?? "") };
}

function uiptFor(t?: PropertyType): string {
  switch (t) {
    case "single-family":
      return "1";
    case "condo":
      return "2";
    case "townhome":
      return "3";
    case "multi-family":
      return "4";
    default:
      return "1,2,3,4";
  }
}

function mapType(s: string): PropertyType {
  const l = s.toLowerCase();
  if (l.includes("condo")) return "condo";
  if (l.includes("townhouse") || l.includes("townhome")) return "townhome";
  if (l.includes("single family")) return "single-family";
  if (l.includes("multi")) return "multi-family";
  return "other";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface RedfinSearchParams {
  city: string;
  state: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: PropertyType;
}

export async function searchRedfin(p: RedfinSearchParams): Promise<{ results: ListingSearchResult[]; regionName: string }> {
  const region = await findRegion(p.city, p.state);
  if (!region) throw new RedfinError("Couldn't resolve that city on Redfin.", 404);

  const qs = new URLSearchParams({
    al: "1",
    region_id: region.id,
    region_type: region.type,
    status: "9",
    uipt: uiptFor(p.propertyType),
    num_homes: "350",
    ord: "redfin-recommended-asc",
    page_number: "1",
    sf: "1,2,3,5,6,7",
    v: "8",
  });
  if (p.minPrice) qs.set("min_price", String(p.minPrice));
  if (p.maxPrice) qs.set("max_price", String(p.maxPrice));
  if (p.bedrooms) qs.set("num_beds", String(p.bedrooms));

  const csv = await stingray(`https://www.redfin.com/stingray/api/gis-csv?${qs.toString()}`);
  const rows = parseCsv(csv);
  if (rows.length < 2) return { results: [], regionName: region.name };

  const head = rows[0].map((h) => h.trim().toUpperCase());
  const col = (name: string) => head.findIndex((h) => h.startsWith(name));
  const ix = {
    type: col("PROPERTY TYPE"),
    address: col("ADDRESS"),
    city: col("CITY"),
    state: col("STATE"),
    zip: col("ZIP"),
    price: col("PRICE"),
    beds: col("BEDS"),
    baths: col("BATHS"),
    sqft: col("SQUARE FEET"),
    year: col("YEAR BUILT"),
    dom: col("DAYS ON MARKET"),
    hoa: col("HOA"),
    url: col("URL"),
    lat: col("LATITUDE"),
    lng: col("LONGITUDE"),
  };

  const num = (s?: string) => {
    const n = Number((s ?? "").replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? undefined : n;
  };

  const results: ListingSearchResult[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 4) continue;
    const price = num(row[ix.price]);
    if (!price) continue;
    const street = row[ix.address] ?? "";
    const city = ix.city >= 0 ? row[ix.city] : "";
    const st = ix.state >= 0 ? row[ix.state] : "";
    const zip = ix.zip >= 0 ? row[ix.zip] : "";
    results.push({
      address: [street, city, [st, zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      zip: zip || undefined,
      price,
      beds: num(row[ix.beds]) ?? 0,
      baths: num(row[ix.baths]) ?? 0,
      sqft: num(row[ix.sqft]),
      propertyType: ix.type >= 0 ? mapType(row[ix.type]) : "other",
      yearBuilt: num(row[ix.year]),
      daysOnMarket: num(row[ix.dom]),
      hoaMonthly: num(row[ix.hoa]),
      url: ix.url >= 0 ? row[ix.url] : undefined,
      source: "Redfin",
      lat: num(row[ix.lat]),
      lng: num(row[ix.lng]),
    });
  }

  if (p.minPrice) for (let i = results.length - 1; i >= 0; i--) if (results[i].price < p.minPrice) results.splice(i, 1);
  results.sort((a, b) => a.price - b.price);
  return { results, regionName: region.name };
}
