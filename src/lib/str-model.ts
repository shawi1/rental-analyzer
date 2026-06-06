import type { CityConfig, Property, StrAnalysis, StrScenario, ExpenseLine } from "./types";
import { tierFor } from "./cities";

// ============================================================================
// Short-term rental revenue model.
//
// Two independent adjustments are applied to the market bedroom benchmark:
//   1. Location tier  — where this unit sits vs the market average (range).
//   2. Scenario       — management quality: conservative → Superhost.
// Scenarios stay internally consistent: gross = nights × ADR, nights = 365×occ.
// ============================================================================

// Management-quality multipliers per scenario.
const MGMT = { low: 0.85, mid: 1.0, high: 1.15 };
const OCC_MGMT = { low: 0.88, mid: 1.0, high: 1.08 };
const OCC_CAP = 78; // realistic occupancy ceiling

/** Linearly interpolate the bedroom benchmark for an arbitrary bedroom count. */
function interpBenchmark(city: CityConfig, beds: number) {
  const bs = [...city.benchmarks].sort((a, b) => a.beds - b.beds);
  if (bs.length === 0) return { grossYr: 0, occ: 50, adr: 150 };
  if (beds <= bs[0].beds) return bs[0];
  if (beds >= bs[bs.length - 1].beds) return bs[bs.length - 1];
  for (let i = 0; i < bs.length - 1; i++) {
    const a = bs[i];
    const b = bs[i + 1];
    if (beds >= a.beds && beds <= b.beds) {
      const t = (beds - a.beds) / (b.beds - a.beds);
      return {
        grossYr: a.grossYr + t * (b.grossYr - a.grossYr),
        occ: a.occ + t * (b.occ - a.occ),
        adr: a.adr + t * (b.adr - a.adr),
      };
    }
  }
  return bs[bs.length - 1];
}

function scenario(baseGross: number, baseOcc: number, locMult: number, mgmtMult: number, occMgmt: number): StrScenario {
  const gross = Math.round(baseGross * locMult * mgmtMult);
  const occ = Math.min(OCC_CAP, baseOcc * occMgmt);
  const nights = Math.round((365 * occ) / 100);
  const adr = nights > 0 ? Math.round(gross / nights) : 0;
  return { gross, occ: Math.round(occ * 10) / 10, adr, nights, net: 0 };
}

function estimateHoa(city: CityConfig, p: Property): number {
  if (p.hoaMonthly && p.hoaMonthly > 0) return p.hoaMonthly * 12;
  // Rough default by property type if not provided.
  if (p.propertyType === "condo") return 4800;
  if (p.propertyType === "townhome") return 3000;
  return city.marketType === "theme-park" ? 3600 : 1200;
}

function expensesFor(city: CityConfig, p: Property, gross: number): { lines: ExpenseLine[]; total: number } {
  const beds = Math.max(1, p.beds);
  const mgmt = Math.round((gross * city.hostFeeRate) / 100);
  const tax = Math.round((gross * city.touristTaxRate) / 100);
  const hoa = Math.round(estimateHoa(city, p));
  const propTax = Math.round((p.price * city.propertyTaxRate) / 100);
  const insurance = Math.round((p.price * city.insuranceRate) / 100);
  const utilities = Math.min(4200, 1200 + beds * 450);
  const supplies = 600 + beds * 150;

  const lines: ExpenseLine[] = [
    { label: `Platform / mgmt fee (${city.hostFeeRate}%)`, amount: mgmt, note: "Airbnb host-only / self-managed" },
    { label: `Tourist Development Tax (${city.touristTaxRate}%)`, amount: tax, note: `${city.county} County` },
    { label: "HOA / condo fees", amount: hoa, note: p.hoaMonthly ? "from listing" : "estimated" },
    { label: "Property tax", amount: propTax, note: `${city.propertyTaxRate}% of price` },
    { label: "Insurance (STR policy)", amount: insurance, note: `${city.insuranceRate}% of price` },
    { label: "Utilities", amount: utilities },
    { label: "Supplies / consumables", amount: supplies },
  ];
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total };
}

export function analyzeStr(city: CityConfig, p: Property): StrAnalysis {
  const tier = tierFor(city, p.tier);
  const base = interpBenchmark(city, p.beds);
  const tierMid = (tier.adjLow + tier.adjHigh) / 2;

  const low = scenario(base.grossYr, base.occ, tier.adjLow, MGMT.low, OCC_MGMT.low);
  const mid = scenario(base.grossYr, base.occ, tierMid, MGMT.mid, OCC_MGMT.mid);
  const high = scenario(base.grossYr, base.occ, tier.adjHigh, MGMT.high, OCC_MGMT.high);

  // Net per scenario: variable fees scale with that scenario's gross, fixed costs constant.
  const midExp = expensesFor(city, p, mid.gross);
  for (const s of [low, mid, high]) {
    const variable = Math.round((s.gross * (city.hostFeeRate + city.touristTaxRate)) / 100);
    const fixed = midExp.total - Math.round((mid.gross * (city.hostFeeRate + city.touristTaxRate)) / 100);
    s.net = s.gross - variable - fixed;
  }

  const monthlyGrossMid = city.seasonalCurve.map((m) => Math.round((mid.gross * m) / 12));
  const turnovers = Math.round(mid.nights / city.avgStay);

  const methodology =
    `Based on ${city.name} ${labelBeds(p.beds)} market benchmark (~$${Math.round(base.grossYr).toLocaleString()}/yr, ${Math.round(base.occ)}% occ), ` +
    `adjusted for "${tier.label}" location (×${tier.adjLow}-${tier.adjHigh}) and management quality. ` +
    `Mid scenario assumes well-managed with dynamic pricing: ~${mid.nights} nights booked across ~${turnovers} turnovers.`;

  return { low, mid, high, monthlyGrossMid, expenses: midExp.lines, methodology, source: "model" };
}

function labelBeds(b: number): string {
  return b === 0 ? "studio" : `${b}-bedroom`;
}
