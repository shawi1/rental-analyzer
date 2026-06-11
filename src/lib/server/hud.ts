// HUD Fair Market Rents (FMR) API — free U.S. government data, unlimited.
// Needs a free access token from https://www.huduser.gov/portal/dataset/fmr-api.html
// Key resolution: header `x-hud-key` → env HUD_API_TOKEN.
//
// FMR ≈ the 40th-percentile gross rent HUD publishes for Section 8 — a solid,
// conservative market-rent BASELINE (often a bit under nice-unit market rent).
//
// Lookup flow (the direct /data/{zip} endpoint is unreliable):
//   1. ZIP → county FIPS via the USPS ZIP→county crosswalk.
//   2. county FIPS → FMR via /fmr/data/{fips}99999 (returns Small-Area FMRs
//      per ZIP for metro areas, plus an MSA-level fallback row).

const BASE = "https://www.huduser.gov/hudapi/public";
const FMR_YEARS = [2026, 2025, 2024]; // try newest published first

export class HudError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function resolveHudToken(req: Request): string | undefined {
  return req.headers.get("x-hud-key") || process.env.HUD_API_TOKEN || undefined;
}

const BED_KEY: Record<number, string> = {
  0: "Efficiency",
  1: "One-Bedroom",
  2: "Two-Bedroom",
  3: "Three-Bedroom",
  4: "Four-Bedroom",
};

export interface FmrResult {
  year?: string | number;
  areaName?: string;
  smallArea: boolean;
  rentByBed: Record<number, number>;
}

async function hudGet(path: string, token: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, json };
}

async function zipToCounty(zip: string, token: string): Promise<string | undefined> {
  const { ok, status, json } = await hudGet(`/usps?type=2&query=${zip}`, token);
  if (!ok) {
    if (status === 401) throw new HudError("HUD token rejected (401). Re-check the token in Settings.", 401);
    return undefined;
  }
  const results = (json as { data?: { results?: { geoid?: string; res_ratio?: number }[] } })?.data?.results ?? [];
  if (!results.length) return undefined;
  results.sort((a, b) => (b.res_ratio ?? 0) - (a.res_ratio ?? 0));
  return results[0].geoid;
}

export async function fmrByZip(zip: string, token: string): Promise<FmrResult> {
  const county = await zipToCounty(zip, token);
  if (!county) throw new HudError(`No HUD county mapping found for ZIP ${zip}.`, 404);

  let data: Record<string, unknown> | undefined;
  for (const year of FMR_YEARS) {
    const { ok, json } = await hudGet(`/fmr/data/${county}99999?year=${year}`, token);
    if (ok && (json as { data?: unknown })?.data) {
      data = (json as { data: Record<string, unknown> }).data;
      break;
    }
  }
  if (!data) throw new HudError("HUD returned no FMR data for that area.", 502);

  const bdRaw = data.basicdata;
  const arr = Array.isArray(bdRaw) ? (bdRaw as Record<string, unknown>[]) : [bdRaw as Record<string, unknown>];
  const entry =
    arr.find((b) => String(b?.zip_code) === zip) ??
    arr.find((b) => String(b?.zip_code).toLowerCase().includes("msa")) ??
    arr[0] ??
    {};

  const rentByBed: Record<number, number> = {};
  for (const [beds, key] of Object.entries(BED_KEY)) {
    const v = Number(entry[key]);
    if (!Number.isNaN(v) && v > 0) rentByBed[Number(beds)] = v;
  }

  return {
    year: data.year as string,
    areaName: (data.area_name as string) || (data.county_name as string) || undefined,
    smallArea: String(data.smallarea_status) === "1",
    rentByBed,
  };
}

/** Pick the FMR for a bedroom count, clamping to the available range (4 = 4+). */
export function fmrForBeds(rentByBed: Record<number, number>, beds: number): number | undefined {
  const b = Math.max(0, Math.min(4, beds));
  return rentByBed[b] ?? rentByBed[Math.min(4, b)] ?? Object.values(rentByBed)[0];
}
