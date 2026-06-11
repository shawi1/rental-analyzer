// ============================================================================
// RentalIQ — core domain types
// ============================================================================

export type StrStatus = "allowed" | "banned" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type ScenarioKey = "low" | "mid" | "high";

export type PropertyType =
  | "condo"
  | "single-family"
  | "townhome"
  | "multi-family"
  | "other";

// ---------------------------------------------------------------------------
// City configuration (market data)
// ---------------------------------------------------------------------------

/** Per-bedroom STR revenue benchmark for a market (full-time active listings). */
export interface BedroomBenchmark {
  beds: number; // 0 = studio
  grossYr: number; // avg annual gross revenue
  occ: number; // annual occupancy %, 0-100
  adr: number; // average daily rate, $
}

/** A location quality tier within a market (e.g. beachfront vs inland). */
export interface LocationTier {
  key: string;
  label: string;
  adjLow: number; // revenue multiplier vs market avg — conservative end
  adjHigh: number; // revenue multiplier vs market avg — optimistic end
  description: string;
}

export interface GuestSegment {
  name: string;
  share: number; // % of bookings, 0-100
  stay: string; // typical stay length, human readable
  group: string; // typical group size
  season: string; // when they book
  color: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface CityConfig {
  key: string;
  name: string;
  state: string;
  county: string;
  marketType: "beach" | "theme-park" | "urban" | "mountain" | "generic";
  /** What the location tiers are measured against, e.g. "beach" or "Disney". */
  anchorLabel: string;
  seeded: boolean; // true = hand-researched, false = generic template

  benchmarks: BedroomBenchmark[];
  tiers: LocationTier[];
  /** 12 monthly revenue multipliers (Jan..Dec), averaging ~1.0. */
  seasonalCurve: number[];

  guestSegments: GuestSegment[];
  avgStay: number; // nights
  avgGroup: number; // people
  bookingLead: number; // days

  strRegulation: string;
  touristTaxRate: number; // % of gross
  hostFeeRate: number; // Airbnb host service fee, % of gross
  topSources: SourceLink[];
  notes: string;

  // Long-term defaults
  /** Fallback gross monthly rent as a fraction of price (e.g. 0.006 = 0.6%). */
  ltRentFraction: number;
  propertyTaxRate: number; // annual, % of price
  insuranceRate: number; // annual, % of price
}

// ---------------------------------------------------------------------------
// Analysis results
// ---------------------------------------------------------------------------

export interface ExpenseLine {
  label: string;
  amount: number; // annual $
  note?: string;
}

export interface StrScenario {
  gross: number;
  occ: number; // %
  adr: number;
  nights: number;
  net: number;
}

export interface StrAnalysis {
  low: StrScenario;
  mid: StrScenario;
  high: StrScenario;
  monthlyGrossMid: number[]; // 12 months of mid-scenario gross
  expenses: ExpenseLine[]; // mid scenario expense breakdown
  methodology: string;
  source: "model" | "ai";
}

export interface LtAnalysis {
  monthlyRent: number;
  annualRent: number;
  grossYield: number; // annualRent / price, %
  operatingExpenses: number; // annual
  noi: number; // net operating income, annual
  capRate: number; // %
  monthlyMortgage: number; // 0 if all-cash
  annualDebtService: number;
  cashInvested: number; // down payment + closing (financed) OR full price (all cash)
  cashFlowAnnual: number; // after debt service
  cashOnCash: number; // %
  dscr: number; // debt service coverage ratio
  expenses: ExpenseLine[];
  financed: boolean;
  methodology: string;
}

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  cityKey: string;

  address: string;
  unit?: string;
  complex?: string;
  zip?: string;
  price: number;
  beds: number; // 0 = studio
  baths: number;
  sqft?: number;
  propertyType: PropertyType;
  yearBuilt?: number;
  daysOnMarket?: number;
  hoaMonthly?: number;
  tier?: string; // LocationTier.key
  distanceToAnchor?: string;
  zillowUrl?: string;
  imageUrl?: string;

  // STR verification
  strStatus: StrStatus;
  strConfidence?: Confidence;
  strNote?: string;
  strSources?: string[];

  // Long-term input override
  rentOverride?: number; // monthly; if set, used instead of model/RentCast
  rentEstimateSource?: string;

  // Computed analyses (cached on the property)
  strAnalysis?: StrAnalysis;
  ltAnalysis?: LtAnalysis;

  // Qualitative
  pros?: string[];
  cons?: string[];
  rating?: number; // 0-100 composite score
  notes?: string;

  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Financing assumptions (project-level, used by the LT model)
// ---------------------------------------------------------------------------

export interface FinancingAssumptions {
  mode: "all-cash" | "financed";
  downPaymentPct: number; // %
  interestRate: number; // annual %
  loanTermYears: number;
  closingCostPct: number; // % of price
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  cityKey: string;
  clientName?: string;
  budgetMin?: number;
  budgetMax?: number;
  strategy: "str" | "ltr" | "both";
  financing: FinancingAssumptions;
  properties: Property[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// API payload shapes
// ---------------------------------------------------------------------------

export interface StrResearchResult {
  strAllowed: boolean | null;
  confidence: Confidence;
  sources: string[];
  notes: string;
}

export interface ExtractedListing {
  address?: string;
  unit?: string;
  complex?: string;
  zip?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: PropertyType;
  yearBuilt?: number;
  daysOnMarket?: number;
  hoaMonthly?: number;
  zillowUrl?: string;
}

export interface ListingSearchResult {
  address: string;
  zip?: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  propertyType?: PropertyType;
  yearBuilt?: number;
  daysOnMarket?: number;
  hoaMonthly?: number;
  rentEstimate?: number;
  valueEstimate?: number;
  url?: string;
  source: string;
  lat?: number;
  lng?: number;
}
