import type { CityConfig, GuestSegment } from "./types";

// ============================================================================
// City market configuration.
//
// Destin & Kissimmee are hand-researched from 2025 STR data (Chalet, AirROI,
// Airbtics, AirDNA, Rabbu). The generic template lets the app work for any new
// city — the user can then refine the benchmarks in the city editor.
// ============================================================================

const SEG_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626"];

// ---------------------------------------------------------------------------
// DESTIN, FL — Gulf beach market
// ---------------------------------------------------------------------------

const destin: CityConfig = {
  key: "destin-fl",
  name: "Destin",
  state: "FL",
  county: "Okaloosa",
  marketType: "beach",
  anchorLabel: "beach",
  seeded: true,
  benchmarks: [
    { beds: 0, grossYr: 27545, occ: 43, adr: 176 },
    { beds: 1, grossYr: 45129, occ: 50, adr: 249 },
    { beds: 2, grossYr: 51345, occ: 51, adr: 278 },
    { beds: 3, grossYr: 71931, occ: 53, adr: 373 },
    { beds: 4, grossYr: 92000, occ: 54, adr: 470 },
  ],
  tiers: [
    {
      key: "beachfront",
      label: "Beachfront / Gulf-front",
      adjLow: 1.0,
      adjHigh: 1.12,
      description: "Direct beach access or Gulf views. Commands market avg or above.",
    },
    {
      key: "near-beach",
      label: "Near-beach (steps to sand)",
      adjLow: 0.8,
      adjHigh: 0.92,
      description: "Holiday Isle / short walk to beach. ~10-20% under market avg.",
    },
    {
      key: "inland",
      label: "Inland / no Gulf view",
      adjLow: 0.55,
      adjHigh: 0.75,
      description: "0.5-1mi to beach, no view. 25-45% under market avg.",
    },
    {
      key: "unknown",
      label: "Unknown / unverified",
      adjLow: 0.65,
      adjHigh: 0.82,
      description: "Location not yet classified — conservative midpoint applied.",
    },
  ],
  // Jun-Aug ≈ 40% of annual revenue. Multipliers average to 1.0.
  seasonalCurve: [0.36, 0.48, 0.96, 0.96, 1.08, 1.68, 1.8, 1.32, 0.84, 0.84, 0.6, 1.08],
  guestSegments: seg([
    { name: "Families", share: 40, stay: "5-7 nights", group: "4-6 guests", season: "Jun-Aug peak" },
    { name: "Couples", share: 25, stay: "3-5 nights", group: "2 guests", season: "Shoulder / off-season" },
    { name: "Friend Groups", share: 20, stay: "3-4 nights", group: "4-8 guests", season: "Spring break + weekends" },
    { name: "Millennials / Gen Z", share: 10, stay: "7-14 nights", group: "2-4 guests", season: "Remote workers, shoulder" },
    { name: "Solo / Military", share: 5, stay: "14-30 nights", group: "1 guest", season: "Year-round (Eglin AFB)" },
  ]),
  avgStay: 4.7,
  avgGroup: 3.8,
  bookingLead: 65,
  strRegulation:
    "Okaloosa County: vacation rental license + Tourist Development Tax registration. HOA rules vary by complex — always verify STR allowance in MLS/governing docs before offer.",
  touristTaxRate: 5,
  hostFeeRate: 15,
  topSources: [
    { label: "Chalet — Destin analytics", url: "https://www.getchalet.com/airbnb-analytics" },
    { label: "AirROI — Destin", url: "https://www.airroi.com/airbnb-data/united-states/florida/destin" },
    { label: "Redfin (MLS / STR remarks)", url: "https://www.redfin.com/city/5096/FL/Destin" },
    { label: "Realtor.com — Destin", url: "https://www.realtor.com/realestateandhomes-search/Destin_FL" },
  ],
  notes:
    "Biggest risk: buying in a complex where the HOA bans STR. MLS records are most reliable — Zillow descriptions can be wrong. 70+ days-on-market on a fairly priced unit often signals an STR or structural issue. Watch post-Surfside special-assessment risk on older condo buildings.",
  ltRentFraction: 0.005,
  propertyTaxRate: 1.0,
  insuranceRate: 0.7,
};

// ---------------------------------------------------------------------------
// KISSIMMEE, FL — Disney / theme-park market
// ---------------------------------------------------------------------------

const kissimmee: CityConfig = {
  key: "kissimmee-fl",
  name: "Kissimmee",
  state: "FL",
  county: "Osceola",
  marketType: "theme-park",
  anchorLabel: "Disney / parks",
  seeded: true,
  // Modeled from doc ranges (3br $45-80k, 4-6br $65-130k) — refine with AirDNA.
  benchmarks: [
    { beds: 2, grossYr: 38000, occ: 55, adr: 190 },
    { beds: 3, grossYr: 58000, occ: 57, adr: 245 },
    { beds: 4, grossYr: 78000, occ: 58, adr: 300 },
    { beds: 5, grossYr: 98000, occ: 60, adr: 360 },
    { beds: 6, grossYr: 118000, occ: 60, adr: 420 },
  ],
  tiers: [
    {
      key: "resort-pool",
      label: "STR resort community + private pool",
      adjLow: 1.0,
      adjHigh: 1.15,
      description: "Windsor Hills / Solara / Encore etc., private pool, close to Disney.",
    },
    {
      key: "standard-pool",
      label: "Standard community + private pool",
      adjLow: 0.85,
      adjHigh: 1.0,
      description: "Non-resort but has the near-mandatory private pool.",
    },
    {
      key: "no-pool",
      label: "No private pool",
      adjLow: 0.55,
      adjHigh: 0.7,
      description: "Pool is near-mandatory in this market — significant revenue penalty.",
    },
    {
      key: "unknown",
      label: "Unknown / unverified",
      adjLow: 0.7,
      adjHigh: 0.88,
      description: "Not yet classified — conservative midpoint applied.",
    },
  ],
  // More even year-round; peaks at Christmas, spring break, summer.
  seasonalCurve: [0.96, 0.84, 1.2, 1.08, 0.84, 1.2, 1.32, 0.96, 0.72, 0.84, 0.84, 1.2],
  guestSegments: seg([
    { name: "Theme-park Families", share: 65, stay: "5-7 nights", group: "4-8 guests", season: "Year-round, holiday peaks" },
    { name: "Multi-gen / Large groups", share: 15, stay: "5-7 nights", group: "8-12 guests", season: "Summer + holidays" },
    { name: "Couples", share: 10, stay: "3-4 nights", group: "2 guests", season: "Shoulder" },
    { name: "International visitors", share: 10, stay: "7-14 nights", group: "4-6 guests", season: "Summer" },
  ]),
  avgStay: 5.5,
  avgGroup: 5.2,
  bookingLead: 75,
  strRegulation:
    "Osceola County requires a Short-Term Rental license + Tourist Development Tax registration. Many communities (Windsor Hills, Solara, Encore, Champions Gate) are purpose-built for STR, but always verify the specific HOA allows it.",
  touristTaxRate: 6,
  hostFeeRate: 15,
  topSources: [
    { label: "Chalet — Kissimmee", url: "https://www.getchalet.com/airbnb-analytics/kissimmee-fl" },
    { label: "AirROI — Kissimmee", url: "https://www.airroi.com/airbnb-data/united-states/florida/kissimmee" },
    { label: "Redfin — Kissimmee", url: "https://www.redfin.com/city/9319/FL/Kissimmee" },
    { label: "Osceola County STR licensing", url: "https://www.osceola.org" },
  ],
  notes:
    "Family-dominated (60-70% of bookings). Private pool is near-mandatory; hot tub is a strong differentiator. Demand is more even year-round than a beach market. Best STR communities: Windsor Hills, Solara Resort, Encore at Reunion, Champions Gate, Solterra, Windsor at Westside.",
  ltRentFraction: 0.006,
  propertyTaxRate: 1.0,
  insuranceRate: 0.6,
};

// ---------------------------------------------------------------------------
// Generic template — used as the basis for any newly added city
// ---------------------------------------------------------------------------

export function genericCity(name: string, state: string, county = ""): CityConfig {
  const key = `${name}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    key,
    name,
    state,
    county,
    marketType: "generic",
    anchorLabel: "city center",
    seeded: false,
    benchmarks: [
      { beds: 0, grossYr: 22000, occ: 50, adr: 120 },
      { beds: 1, grossYr: 30000, occ: 52, adr: 150 },
      { beds: 2, grossYr: 42000, occ: 54, adr: 200 },
      { beds: 3, grossYr: 56000, occ: 55, adr: 270 },
      { beds: 4, grossYr: 72000, occ: 56, adr: 340 },
    ],
    tiers: [
      { key: "prime", label: "Prime location", adjLow: 0.95, adjHigh: 1.15, description: "Best-located inventory in this market." },
      { key: "standard", label: "Standard", adjLow: 0.8, adjHigh: 0.95, description: "Typical mid-market location." },
      { key: "secondary", label: "Secondary", adjLow: 0.6, adjHigh: 0.78, description: "Less desirable / further out." },
      { key: "unknown", label: "Unknown", adjLow: 0.72, adjHigh: 0.9, description: "Not yet classified." },
    ],
    seasonalCurve: [0.85, 0.85, 1.0, 1.05, 1.1, 1.15, 1.2, 1.15, 1.0, 0.95, 0.85, 0.85],
    guestSegments: seg([
      { name: "Families", share: 35, stay: "4-6 nights", group: "4-5 guests", season: "Summer + holidays" },
      { name: "Couples", share: 30, stay: "2-4 nights", group: "2 guests", season: "Year-round" },
      { name: "Business / Solo", share: 20, stay: "2-5 nights", group: "1-2 guests", season: "Weekdays" },
      { name: "Friend Groups", share: 15, stay: "2-3 nights", group: "4-6 guests", season: "Weekends" },
    ]),
    avgStay: 3.8,
    avgGroup: 3.2,
    bookingLead: 45,
    strRegulation: "Check the city/county for STR licensing requirements and any HOA restrictions before purchase.",
    touristTaxRate: 5,
    hostFeeRate: 15,
    topSources: [
      { label: "Chalet analytics", url: "https://www.getchalet.com/airbnb-analytics" },
      { label: "AirROI data", url: "https://www.airroi.com" },
      { label: "Redfin", url: "https://www.redfin.com" },
    ],
    notes: "Generic template — refine benchmarks, tiers, and seasonality with local AirDNA/Chalet data.",
    ltRentFraction: 0.007,
    propertyTaxRate: 1.1,
    insuranceRate: 0.5,
  };
}

function seg(
  rows: Omit<GuestSegment, "color">[]
): GuestSegment[] {
  return rows.map((r, i) => ({ ...r, color: SEG_COLORS[i % SEG_COLORS.length] }));
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SEEDED_CITIES: CityConfig[] = [destin, kissimmee];

export function findCity(key: string, custom: CityConfig[] = []): CityConfig | undefined {
  return [...SEEDED_CITIES, ...custom].find((c) => c.key === key);
}

/** Nearest benchmark for a given bedroom count (clamps to available range). */
export function benchmarkFor(city: CityConfig, beds: number) {
  const sorted = [...city.benchmarks].sort((a, b) => a.beds - b.beds);
  if (sorted.length === 0) return undefined;
  let best = sorted[0];
  let bestDist = Math.abs(sorted[0].beds - beds);
  for (const b of sorted) {
    const d = Math.abs(b.beds - beds);
    if (d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}

export function tierFor(city: CityConfig, key?: string) {
  return city.tiers.find((t) => t.key === key) ?? city.tiers.find((t) => t.key === "unknown") ?? city.tiers[0];
}
