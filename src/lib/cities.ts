import type { CityConfig, GuestSegment, LocationTier } from "./types";

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
    { beds: 1, grossYr: 25000, occ: 53, adr: 130 },
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

// ===========================================================================
// Florida market library — archetype-calibrated configs for major + smaller
// FL cities. Benchmarks are modeled from market archetypes and scaled per city
// (adrFactor). They're reasonable defaults, not deep per-listing research —
// refine with local AirDNA / Chalet data for any city you work seriously.
// ===========================================================================

type Archetype = "beach" | "south-beach" | "theme-park" | "urban" | "keys" | "snowbird-inland" | "college";

// Seasonal curves — 12 monthly multipliers (Jan..Dec), each averaging ~1.0.
const SC = {
  summerBeach: [0.45, 0.6, 1.0, 1.0, 1.05, 1.55, 1.7, 1.35, 0.85, 0.8, 0.6, 1.05],
  winterBeach: [1.3, 1.35, 1.4, 1.2, 0.95, 0.75, 0.75, 0.7, 0.65, 0.8, 1.0, 1.15],
  themePark: [0.96, 0.84, 1.2, 1.08, 0.84, 1.2, 1.32, 0.96, 0.72, 0.84, 0.84, 1.2],
  urban: [0.85, 0.9, 1.1, 1.1, 1.05, 1.0, 0.95, 0.95, 1.0, 1.1, 1.0, 1.0],
  snowbird: [1.25, 1.3, 1.35, 1.15, 0.9, 0.75, 0.75, 0.7, 0.7, 0.85, 1.05, 1.25],
  college: [0.8, 0.85, 1.05, 1.0, 1.1, 0.9, 0.85, 1.0, 1.2, 1.25, 1.05, 0.95],
};

const GS: Record<string, Omit<GuestSegment, "color">[]> = {
  beach: [
    { name: "Families", share: 40, stay: "5-7 nights", group: "4-6 guests", season: "Summer peak" },
    { name: "Couples", share: 25, stay: "3-5 nights", group: "2 guests", season: "Shoulder / off-season" },
    { name: "Friend Groups", share: 20, stay: "3-4 nights", group: "4-8 guests", season: "Spring break + weekends" },
    { name: "Remote / Snowbirds", share: 10, stay: "7-30 nights", group: "2-4 guests", season: "Off-season" },
    { name: "Solo / Other", share: 5, stay: "varies", group: "1 guest", season: "Year-round" },
  ],
  southBeach: [
    { name: "Couples", share: 30, stay: "3-5 nights", group: "2 guests", season: "Winter high season" },
    { name: "International", share: 25, stay: "5-10 nights", group: "2-4 guests", season: "Winter + summer" },
    { name: "Friend Groups", share: 20, stay: "3-4 nights", group: "4-8 guests", season: "Weekends / events" },
    { name: "Families", share: 15, stay: "4-6 nights", group: "4-5 guests", season: "Holidays" },
    { name: "Business", share: 10, stay: "2-4 nights", group: "1-2 guests", season: "Weekdays" },
  ],
  themePark: [
    { name: "Theme-park Families", share: 65, stay: "5-7 nights", group: "4-8 guests", season: "Year-round, holiday peaks" },
    { name: "Multi-gen / Large groups", share: 15, stay: "5-7 nights", group: "8-12 guests", season: "Summer + holidays" },
    { name: "Couples", share: 10, stay: "3-4 nights", group: "2 guests", season: "Shoulder" },
    { name: "International", share: 10, stay: "7-14 nights", group: "4-6 guests", season: "Summer" },
  ],
  urban: [
    { name: "Business / Solo", share: 30, stay: "2-4 nights", group: "1-2 guests", season: "Weekdays" },
    { name: "Couples", share: 30, stay: "2-4 nights", group: "2 guests", season: "Year-round" },
    { name: "Families", share: 20, stay: "3-5 nights", group: "4-5 guests", season: "Summer + holidays" },
    { name: "Friend Groups", share: 20, stay: "2-3 nights", group: "4-6 guests", season: "Weekends / events" },
  ],
  keys: [
    { name: "Couples", share: 35, stay: "3-5 nights", group: "2 guests", season: "Winter + summer" },
    { name: "Anglers / Divers", share: 25, stay: "3-6 nights", group: "2-6 guests", season: "Year-round" },
    { name: "Friend Groups", share: 20, stay: "3-4 nights", group: "4-8 guests", season: "Weekends" },
    { name: "Families", share: 20, stay: "5-7 nights", group: "4-6 guests", season: "Summer + holidays" },
  ],
  snowbird: [
    { name: "Snowbirds / Retirees", share: 45, stay: "14-90 nights", group: "2 guests", season: "Dec-Apr" },
    { name: "Couples", share: 25, stay: "3-5 nights", group: "2 guests", season: "Year-round" },
    { name: "Families", share: 20, stay: "4-6 nights", group: "4-5 guests", season: "Summer + holidays" },
    { name: "Solo / Medical", share: 10, stay: "7-30 nights", group: "1 guest", season: "Year-round" },
  ],
  college: [
    { name: "Event / Parents", share: 35, stay: "2-4 nights", group: "2-4 guests", season: "Football + graduation" },
    { name: "Couples", share: 25, stay: "2-4 nights", group: "2 guests", season: "Year-round" },
    { name: "Families", share: 20, stay: "3-5 nights", group: "4-5 guests", season: "Move-in / events" },
    { name: "Business / Medical", share: 20, stay: "2-5 nights", group: "1-2 guests", season: "Weekdays" },
  ],
};

const beachTiers: LocationTier[] = [
  { key: "beachfront", label: "Beachfront / water-front", adjLow: 1.0, adjHigh: 1.12, description: "Direct beach access or Gulf/ocean views." },
  { key: "near-beach", label: "Near-beach (short walk)", adjLow: 0.8, adjHigh: 0.92, description: "Steps to the sand; no direct view." },
  { key: "inland", label: "Inland / no water view", adjLow: 0.55, adjHigh: 0.75, description: "Further from the water, no view." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.65, adjHigh: 0.85, description: "Not yet classified — conservative midpoint." },
];
const poolTiers: LocationTier[] = [
  { key: "resort-pool", label: "STR resort community + pool", adjLow: 1.0, adjHigh: 1.15, description: "Purpose-built STR resort, private pool, near attractions." },
  { key: "standard-pool", label: "Standard community + pool", adjLow: 0.85, adjHigh: 1.0, description: "Non-resort but has the near-mandatory private pool." },
  { key: "no-pool", label: "No private pool", adjLow: 0.55, adjHigh: 0.7, description: "Pool is near-mandatory here — significant penalty." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.7, adjHigh: 0.88, description: "Not yet classified — conservative midpoint." },
];
const urbanTiers: LocationTier[] = [
  { key: "downtown", label: "Downtown / walkable core", adjLow: 1.0, adjHigh: 1.15, description: "Walk to nightlife, dining, attractions." },
  { key: "midtown", label: "Established neighborhoods", adjLow: 0.85, adjHigh: 1.0, description: "Near the core, residential." },
  { key: "suburban", label: "Suburban / outlying", adjLow: 0.65, adjHigh: 0.82, description: "Car-dependent, further out." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.72, adjHigh: 0.9, description: "Not yet classified — conservative midpoint." },
];
const waterTiers: LocationTier[] = [
  { key: "waterfront", label: "Oceanfront / canal w/ dockage", adjLow: 1.0, adjHigh: 1.15, description: "On the water, often with boat dockage." },
  { key: "near-water", label: "Near-water (short walk)", adjLow: 0.82, adjHigh: 0.95, description: "Short walk to the water." },
  { key: "inland", label: "Interior lot", adjLow: 0.6, adjHigh: 0.78, description: "No water access." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.72, adjHigh: 0.9, description: "Not yet classified — conservative midpoint." },
];
const campusTiers: LocationTier[] = [
  { key: "near-campus", label: "Walk to campus / stadium", adjLow: 1.0, adjHigh: 1.15, description: "Walk to campus or the stadium." },
  { key: "standard", label: "Established mid-market", adjLow: 0.82, adjHigh: 0.98, description: "Typical neighborhood." },
  { key: "secondary", label: "Secondary / further out", adjLow: 0.6, adjHigh: 0.78, description: "Less convenient location." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.72, adjHigh: 0.9, description: "Not yet classified — conservative midpoint." },
];
const snowbirdTiers: LocationTier[] = [
  { key: "prime", label: "Prime community / amenities", adjLow: 0.95, adjHigh: 1.12, description: "Best-located, amenity-rich community." },
  { key: "standard", label: "Standard", adjLow: 0.8, adjHigh: 0.95, description: "Typical mid-market." },
  { key: "secondary", label: "Secondary", adjLow: 0.6, adjHigh: 0.78, description: "Further out / fewer amenities." },
  { key: "unknown", label: "Unknown / unverified", adjLow: 0.72, adjHigh: 0.9, description: "Not yet classified — conservative midpoint." },
];

const ARCH: Record<
  Archetype,
  {
    label: string;
    marketType: CityConfig["marketType"];
    anchor: string;
    beds: number[];
    adrs: number[];
    occs: number[];
    seasonal: number[];
    guests: Omit<GuestSegment, "color">[];
    tiers: LocationTier[];
    avgStay: number;
    avgGroup: number;
    lead: number;
  }
> = {
  beach: { label: "Gulf/Atlantic beach", marketType: "beach", anchor: "beach", beds: [0, 1, 2, 3, 4], adrs: [150, 210, 285, 385, 500], occs: [47, 50, 52, 54, 55], seasonal: SC.summerBeach, guests: GS.beach, tiers: beachTiers, avgStay: 4.5, avgGroup: 3.8, lead: 60 },
  "south-beach": { label: "South Florida beach", marketType: "beach", anchor: "beach", beds: [0, 1, 2, 3, 4], adrs: [180, 250, 340, 460, 620], occs: [55, 58, 60, 61, 62], seasonal: SC.winterBeach, guests: GS.southBeach, tiers: beachTiers, avgStay: 4.0, avgGroup: 3.2, lead: 55 },
  "theme-park": { label: "theme-park", marketType: "theme-park", anchor: "Disney / parks", beds: [2, 3, 4, 5, 6], adrs: [185, 245, 300, 360, 420], occs: [55, 57, 58, 60, 60], seasonal: SC.themePark, guests: GS.themePark, tiers: poolTiers, avgStay: 5.0, avgGroup: 5.0, lead: 70 },
  urban: { label: "urban", marketType: "urban", anchor: "downtown", beds: [0, 1, 2, 3], adrs: [110, 150, 205, 285], occs: [55, 57, 58, 58], seasonal: SC.urban, guests: GS.urban, tiers: urbanTiers, avgStay: 3.2, avgGroup: 2.8, lead: 35 },
  keys: { label: "Florida Keys", marketType: "beach", anchor: "water", beds: [1, 2, 3, 4], adrs: [320, 430, 580, 780], occs: [68, 70, 72, 72], seasonal: SC.winterBeach, guests: GS.keys, tiers: waterTiers, avgStay: 4.0, avgGroup: 3.4, lead: 75 },
  "snowbird-inland": { label: "snowbird inland", marketType: "generic", anchor: "town center", beds: [1, 2, 3], adrs: [95, 140, 190], occs: [48, 50, 52], seasonal: SC.snowbird, guests: GS.snowbird, tiers: snowbirdTiers, avgStay: 5.0, avgGroup: 2.8, lead: 60 },
  college: { label: "college town", marketType: "urban", anchor: "campus", beds: [1, 2, 3, 4], adrs: [110, 160, 220, 300], occs: [50, 52, 54, 55], seasonal: SC.college, guests: GS.college, tiers: campusTiers, avgStay: 2.8, avgGroup: 3.2, lead: 40 },
};

interface FlOpts {
  adrFactor?: number;
  touristTaxRate: number;
  ltRentFraction: number;
  insuranceRate: number;
  propertyTaxRate?: number;
  regulation?: string;
  notes?: string;
  anchorLabel?: string;
}

function flCity(name: string, county: string, archetype: Archetype, opts: FlOpts): CityConfig {
  const a = ARCH[archetype];
  const f = opts.adrFactor ?? 1;
  const benchmarks = a.beds.map((b, i) => {
    const adr = Math.round(a.adrs[i] * f);
    const occ = a.occs[i];
    return { beds: b, adr, occ, grossYr: Math.round((adr * 365 * occ) / 100) };
  });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    key: `${slug}-fl`,
    name,
    state: "FL",
    county,
    marketType: a.marketType,
    anchorLabel: opts.anchorLabel ?? a.anchor,
    seeded: true,
    benchmarks,
    tiers: a.tiers,
    seasonalCurve: a.seasonal,
    guestSegments: seg(a.guests),
    avgStay: a.avgStay,
    avgGroup: a.avgGroup,
    bookingLead: a.lead,
    strRegulation:
      opts.regulation ??
      `${county} County: register for the Tourist Development Tax and verify the municipality's short-term-rental ordinance and any HOA restrictions before purchase.`,
    touristTaxRate: opts.touristTaxRate,
    hostFeeRate: 15,
    topSources: [
      { label: "Chalet analytics", url: `https://www.getchalet.com/airbnb-analytics/${slug}-fl` },
      { label: "AirDNA market", url: `https://www.airdna.co/vacation-rental-data/app/us/florida/${slug}` },
      { label: "Realtor.com listings", url: `https://www.realtor.com/realestateandhomes-search/${name.replace(/ /g, "-")}_FL` },
    ],
    notes:
      opts.notes ??
      `Modeled ${a.label} market estimates — refine bedroom benchmarks and seasonality with local AirDNA/Chalet data before relying on the numbers.`,
    ltRentFraction: opts.ltRentFraction,
    propertyTaxRate: opts.propertyTaxRate ?? 1.0,
    insuranceRate: opts.insuranceRate,
  };
}

const FL_CITIES: CityConfig[] = [
  // --- Panhandle & NW Gulf beaches (summer peak) ---
  flCity("Panama City Beach", "Bay", "beach", { adrFactor: 0.95, touristTaxRate: 5, ltRentFraction: 0.005, insuranceRate: 1.0 }),
  flCity("Fort Walton Beach", "Okaloosa", "beach", { adrFactor: 0.9, touristTaxRate: 5, ltRentFraction: 0.005, insuranceRate: 0.95 }),
  flCity("Pensacola", "Escambia", "beach", { adrFactor: 0.85, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.95 }),
  flCity("Navarre", "Santa Rosa", "beach", { adrFactor: 0.88, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.95 }),

  // --- West-central Gulf beaches ---
  flCity("Clearwater", "Pinellas", "beach", { adrFactor: 1.0, touristTaxRate: 6, ltRentFraction: 0.0048, insuranceRate: 0.9 }),
  flCity("St. Petersburg", "Pinellas", "beach", { adrFactor: 0.95, touristTaxRate: 6, ltRentFraction: 0.005, insuranceRate: 0.85 }),
  flCity("Sarasota", "Sarasota", "beach", { adrFactor: 1.05, touristTaxRate: 6, ltRentFraction: 0.0045, insuranceRate: 0.9 }),
  flCity("Bradenton", "Manatee", "beach", { adrFactor: 0.9, touristTaxRate: 5, ltRentFraction: 0.005, insuranceRate: 0.85 }),
  flCity("Anna Maria Island", "Manatee", "beach", { adrFactor: 1.2, touristTaxRate: 5, ltRentFraction: 0.0038, insuranceRate: 1.0 }),
  flCity("Venice", "Sarasota", "beach", { adrFactor: 0.92, touristTaxRate: 6, ltRentFraction: 0.0048, insuranceRate: 0.9 }),

  // --- SW Gulf (winter peak) ---
  flCity("Fort Myers", "Lee", "south-beach", { adrFactor: 0.85, touristTaxRate: 5, ltRentFraction: 0.005, insuranceRate: 1.0 }),
  flCity("Fort Myers Beach", "Lee", "south-beach", { adrFactor: 1.0, touristTaxRate: 5, ltRentFraction: 0.0042, insuranceRate: 1.1 }),
  flCity("Cape Coral", "Lee", "south-beach", { adrFactor: 0.85, touristTaxRate: 5, ltRentFraction: 0.005, insuranceRate: 1.0, anchorLabel: "canal / Gulf access", notes: "Canal-home market — Gulf-access waterfront with private pool/dock commands a premium; many snowbird + family vacationers." }),
  flCity("Naples", "Collier", "south-beach", { adrFactor: 1.35, touristTaxRate: 5, ltRentFraction: 0.0035, insuranceRate: 1.0 }),
  flCity("Marco Island", "Collier", "south-beach", { adrFactor: 1.3, touristTaxRate: 5, ltRentFraction: 0.0035, insuranceRate: 1.05 }),
  flCity("Port Charlotte", "Charlotte", "snowbird-inland", { adrFactor: 0.95, touristTaxRate: 5, ltRentFraction: 0.006, insuranceRate: 0.95 }),
  flCity("Punta Gorda", "Charlotte", "snowbird-inland", { adrFactor: 1.0, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.95 }),

  // --- NE Atlantic beaches ---
  flCity("St. Augustine", "St. Johns", "beach", { adrFactor: 0.9, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.8, notes: "Historic-tourism beach market — strong year-round leisure demand plus events; downtown historic district draws couples and weekenders." }),
  flCity("Jacksonville Beach", "Duval", "beach", { adrFactor: 0.9, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.8 }),
  flCity("Daytona Beach", "Volusia", "beach", { adrFactor: 0.85, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.85 }),
  flCity("New Smyrna Beach", "Volusia", "beach", { adrFactor: 0.95, touristTaxRate: 6, ltRentFraction: 0.005, insuranceRate: 0.85 }),

  // --- Space Coast (Brevard) ---
  flCity("Melbourne", "Brevard", "beach", { adrFactor: 0.8, touristTaxRate: 5, ltRentFraction: 0.006, insuranceRate: 0.85 }),
  flCity("Palm Bay", "Brevard", "beach", { adrFactor: 0.72, touristTaxRate: 5, ltRentFraction: 0.0065, insuranceRate: 0.85, notes: "Affordable Space Coast market — more long-term-rental friendly; STR leans on nearby beaches and Kennedy Space Center / cruise-port traffic." }),
  flCity("Cocoa Beach", "Brevard", "beach", { adrFactor: 0.9, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.9, notes: "Beachfront + cruise-port (Port Canaveral) and Kennedy Space Center launches drive strong, fairly steady demand." }),
  flCity("Cape Canaveral", "Brevard", "beach", { adrFactor: 0.88, touristTaxRate: 5, ltRentFraction: 0.0055, insuranceRate: 0.9, notes: "Cruise-port and launch-viewing demand; pre-cruise one-night stays are common." }),
  flCity("Titusville", "Brevard", "snowbird-inland", { adrFactor: 0.95, touristTaxRate: 5, ltRentFraction: 0.0068, insuranceRate: 0.8, anchorLabel: "Space Center / river", notes: "Launch-viewing and Space Coast value market; Indian River frontage and KSC proximity are the draws." }),
  flCity("Vero Beach", "Indian River", "beach", { adrFactor: 0.95, touristTaxRate: 4, ltRentFraction: 0.005, insuranceRate: 0.9 }),

  // --- Treasure / Palm Beaches (winter peak) ---
  flCity("Port St. Lucie", "St. Lucie", "snowbird-inland", { adrFactor: 1.0, touristTaxRate: 5, ltRentFraction: 0.0062, insuranceRate: 0.9, anchorLabel: "town / coast", notes: "Fast-growing residential market — strong long-term rental fundamentals; STR demand from spring-training and beaches." }),
  flCity("West Palm Beach", "Palm Beach", "south-beach", { adrFactor: 1.1, touristTaxRate: 6, ltRentFraction: 0.0045, insuranceRate: 0.95 }),
  flCity("Boca Raton", "Palm Beach", "south-beach", { adrFactor: 1.2, touristTaxRate: 6, ltRentFraction: 0.004, insuranceRate: 0.95 }),
  flCity("Delray Beach", "Palm Beach", "south-beach", { adrFactor: 1.1, touristTaxRate: 6, ltRentFraction: 0.0042, insuranceRate: 0.95 }),

  // --- Southeast metro (winter peak, stricter STR) ---
  flCity("Fort Lauderdale", "Broward", "south-beach", { adrFactor: 1.2, touristTaxRate: 6, ltRentFraction: 0.004, insuranceRate: 1.0, regulation: "Fort Lauderdale requires a vacation-rental registration + inspection; Broward County TDT registration required. Verify the specific zoning and HOA rules." }),
  flCity("Hollywood", "Broward", "south-beach", { adrFactor: 1.05, touristTaxRate: 6, ltRentFraction: 0.0045, insuranceRate: 1.0 }),
  flCity("Pompano Beach", "Broward", "south-beach", { adrFactor: 1.05, touristTaxRate: 6, ltRentFraction: 0.0045, insuranceRate: 1.0 }),
  flCity("Miami", "Miami-Dade", "south-beach", { adrFactor: 1.3, touristTaxRate: 6, ltRentFraction: 0.004, insuranceRate: 1.0, regulation: "Miami-Dade requires a Certificate of Use + TDT registration; many residential zones restrict STR. Verify zoning and condo/HOA rules — enforcement is active." }),
  flCity("Miami Beach", "Miami-Dade", "south-beach", { adrFactor: 1.4, touristTaxRate: 6, ltRentFraction: 0.0035, insuranceRate: 1.1, regulation: "Miami Beach STRICTLY limits short-term rentals — most single-family zones prohibit them and fines are severe. Only specific districts/buildings allow STR. Verify the exact address before any offer." }),

  // --- Orlando theme-park metro ---
  flCity("Orlando", "Orange", "theme-park", { adrFactor: 1.0, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.7, regulation: "City of Orlando restricts whole-home STR in most residential zones (home-share with owner present is allowed with registration); Orange County requires TDT registration. Verify zoning + HOA." }),
  flCity("Davenport", "Polk", "theme-park", { adrFactor: 0.95, touristTaxRate: 5, ltRentFraction: 0.006, insuranceRate: 0.65, notes: "Champions Gate / Reunion / Solterra corridor — purpose-built STR resort homes minutes from Disney. STR commonly allowed; verify the specific community." }),
  flCity("Clermont", "Lake", "theme-park", { adrFactor: 0.9, touristTaxRate: 4, ltRentFraction: 0.006, insuranceRate: 0.65 }),
  flCity("Winter Garden", "Orange", "theme-park", { adrFactor: 0.95, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.65 }),
  flCity("Haines City", "Polk", "theme-park", { adrFactor: 0.85, touristTaxRate: 5, ltRentFraction: 0.0065, insuranceRate: 0.65 }),
  flCity("St. Cloud", "Osceola", "theme-park", { adrFactor: 0.85, touristTaxRate: 6, ltRentFraction: 0.0062, insuranceRate: 0.65 }),

  // --- Urban / metro ---
  flCity("Tampa", "Hillsborough", "urban", { adrFactor: 1.0, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.85 }),
  flCity("Jacksonville", "Duval", "urban", { adrFactor: 0.85, touristTaxRate: 6, ltRentFraction: 0.0065, insuranceRate: 0.7 }),
  flCity("Lakeland", "Polk", "urban", { adrFactor: 0.78, touristTaxRate: 5, ltRentFraction: 0.007, insuranceRate: 0.6 }),
  flCity("Orlando (downtown)", "Orange", "urban", { adrFactor: 1.0, touristTaxRate: 6, ltRentFraction: 0.0055, insuranceRate: 0.7, anchorLabel: "downtown", notes: "Use this profile for downtown/business Orlando stays rather than theme-park resort homes." }),

  // --- College towns ---
  flCity("Gainesville", "Alachua", "college", { adrFactor: 0.85, touristTaxRate: 5, ltRentFraction: 0.007, insuranceRate: 0.55, anchorLabel: "UF campus" }),
  flCity("Tallahassee", "Leon", "college", { adrFactor: 0.82, touristTaxRate: 5, ltRentFraction: 0.0075, insuranceRate: 0.5, anchorLabel: "FSU / Capitol" }),

  // --- The Keys ---
  flCity("Key West", "Monroe", "keys", { adrFactor: 1.4, touristTaxRate: 5, ltRentFraction: 0.003, insuranceRate: 1.1, regulation: "Key West / Monroe County heavily restrict STR — most require a transient rental license that is capped and rarely available. STR-licensed properties trade at a large premium. Confirm a valid transient license conveys." }),
  flCity("Key Largo", "Monroe", "keys", { adrFactor: 1.15, touristTaxRate: 5, ltRentFraction: 0.0035, insuranceRate: 1.05, regulation: "Monroe County caps vacation-rental licenses; 28-day minimums apply in many areas without a transient license. Verify license status before purchase." }),
  flCity("Islamorada", "Monroe", "keys", { adrFactor: 1.25, touristTaxRate: 5, ltRentFraction: 0.0035, insuranceRate: 1.05, regulation: "Islamorada / Monroe County restrict STR via capped transient licenses and minimum-stay rules. Confirm a valid license conveys with the property." }),
  flCity("Marathon", "Monroe", "keys", { adrFactor: 1.1, touristTaxRate: 5, ltRentFraction: 0.0038, insuranceRate: 1.05, regulation: "Marathon / Monroe County require a vacation-rental license (capped). Verify the property holds a transferable license." }),

  // --- Snowbird / inland retirement ---
  flCity("The Villages", "Sumter", "snowbird-inland", { adrFactor: 0.95, touristTaxRate: 4, ltRentFraction: 0.0055, insuranceRate: 0.5, notes: "Massive 55+ community — strong seasonal snowbird rental demand (Jan-Mar); many bookings are multi-week. Verify the district's rental rules." }),
  flCity("Ocala", "Marion", "snowbird-inland", { adrFactor: 0.85, touristTaxRate: 4, ltRentFraction: 0.007, insuranceRate: 0.5, anchorLabel: "horse country", notes: "Horse-country / World Equestrian Center drives event-based demand; otherwise a value long-term-rental market." }),
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SEEDED_CITIES: CityConfig[] = [destin, kissimmee, ...FL_CITIES].sort((a, b) =>
  a.name.localeCompare(b.name)
);

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
