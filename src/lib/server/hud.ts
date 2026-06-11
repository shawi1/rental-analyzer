// HUD Fair Market Rents (FMR) API — free U.S. government data, unlimited.
// Needs a free access token from https://www.huduser.gov/portal/dataset/fmr-api.html
// Key resolution: header `x-hud-key` → env HUD_API_TOKEN.
//
// FMR ≈ the 40th-percentile gross rent HUD publishes for Section 8 — a solid,
// conservative market-rent BASELINE (often a bit under nice-unit market rent).

const BASE = "https://www.huduser.gov/hudapi/public/fmr";

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

export async function fmrByZip(zip: string, token: string): Promise<FmrResult> {
  const res = await fetch(`${BASE}/data/${encodeURIComponent(zip)}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error || j?.message || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new HudError(`HUD FMR error (${res.status}): ${detail || res.statusText}`, res.status);
  }
  const json = await res.json();
  const data = json?.data ?? {};
  const bdRaw = Array.isArray(data.basicdata) ? data.basicdata[0] : data.basicdata;
  const bd = bdRaw ?? {};

  const rentByBed: Record<number, number> = {};
  for (const [beds, key] of Object.entries(BED_KEY)) {
    const v = Number(bd[key]);
    if (!Number.isNaN(v) && v > 0) rentByBed[Number(beds)] = v;
  }

  return {
    year: data.year,
    areaName: data.area_name || data.county_name || bd.zip_code || undefined,
    smallArea: String(data.smallareastatus) === "1",
    rentByBed,
  };
}

/** Pick the FMR for a bedroom count, clamping to the available range (4 = 4+). */
export function fmrForBeds(rentByBed: Record<number, number>, beds: number): number | undefined {
  const b = Math.max(0, Math.min(4, beds));
  return rentByBed[b] ?? rentByBed[Math.min(4, b)] ?? Object.values(rentByBed)[0];
}
