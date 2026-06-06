import type { CityConfig, Property } from "./types";
import { tierFor } from "./cities";

// ============================================================================
// Composite property score (0-100) + auto pros/cons. Heuristic, transparent,
// and tuned to the rules in the project brief.
// ============================================================================

export interface Scored {
  score: number;
  label: string;
  pros: string[];
  cons: string[];
}

export function scoreProperty(city: CityConfig, p: Property, strategy: "str" | "ltr" | "both"): Scored {
  const pros: string[] = [];
  const cons: string[] = [];
  let score = 50;

  // --- STR status: the single biggest factor for STR strategy ---
  if (strategy !== "ltr") {
    if (p.strStatus === "allowed") {
      score += 12;
      pros.push(`STR confirmed allowed${p.strConfidence ? ` (${p.strConfidence} confidence)` : ""}`);
    } else if (p.strStatus === "banned") {
      score -= 30;
      cons.push("STR is banned here — disqualifying for an Airbnb/VRBO thesis");
    } else {
      score -= 6;
      cons.push("STR status unverified — confirm in MLS/HOA docs before any offer");
    }
  }

  // --- STR yield (gross revenue ÷ price) ---
  if (p.strAnalysis && p.price > 0) {
    const yieldPct = (p.strAnalysis.mid.gross / p.price) * 100;
    if (yieldPct >= 22) {
      score += 16;
      pros.push(`Strong STR gross yield (${yieldPct.toFixed(0)}% of price/yr)`);
    } else if (yieldPct >= 16) {
      score += 8;
      pros.push(`Healthy STR gross yield (${yieldPct.toFixed(0)}% of price/yr)`);
    } else if (yieldPct < 11) {
      score -= 8;
      cons.push(`Low STR gross yield (${yieldPct.toFixed(0)}% of price/yr)`);
    }
    if (p.strAnalysis.mid.net < 0) {
      score -= 10;
      cons.push("Projected STR net cash flow is negative at mid scenario");
    }
  }

  // --- Long-term cap rate ---
  if (p.ltAnalysis) {
    const cap = p.ltAnalysis.capRate;
    if (cap >= 7) {
      score += 12;
      pros.push(`Strong long-term cap rate (${cap.toFixed(1)}%)`);
    } else if (cap >= 5) {
      score += 5;
      pros.push(`Reasonable long-term cap rate (${cap.toFixed(1)}%)`);
    } else if (cap < 3.5) {
      score -= 6;
      cons.push(`Thin long-term cap rate (${cap.toFixed(1)}%)`);
    }
    if (p.ltAnalysis.financed && p.ltAnalysis.cashFlowAnnual < 0) {
      cons.push("Negative long-term cash flow when financed");
    }
  }

  // --- Location tier ---
  const tier = tierFor(city, p.tier);
  const tierMid = (tier.adjLow + tier.adjHigh) / 2;
  if (tierMid >= 1.0) pros.push(`Premium location tier: ${tier.label}`);
  else if (tierMid < 0.72) {
    score -= 5;
    cons.push(`Location penalty: ${tier.label}`);
  }

  // --- Days on market (negotiation / red-flag signal) ---
  if (p.daysOnMarket !== undefined) {
    if (p.daysOnMarket >= 90) {
      score -= 4;
      cons.push(`${p.daysOnMarket} days on market — investigate why (possible STR/structural issue) but strong negotiation leverage`);
    } else if (p.daysOnMarket >= 70) {
      cons.push(`${p.daysOnMarket} days on market — worth investigating; negotiation leverage`);
    } else if (p.daysOnMarket <= 14) {
      pros.push(`Fresh listing (${p.daysOnMarket} DOM)`);
    }
  }

  // --- HOA drag ---
  if (p.hoaMonthly && p.hoaMonthly >= 700) {
    score -= 5;
    cons.push(`High HOA ($${p.hoaMonthly}/mo) cuts into net materially`);
  }

  // --- Price per sqft sanity ---
  if (p.sqft && p.sqft > 0) {
    const ppsf = p.price / p.sqft;
    if (ppsf > 700) cons.push(`High $/sqft ($${Math.round(ppsf)})`);
  }

  // --- Older FL condo special-assessment risk ---
  if (p.propertyType === "condo" && p.yearBuilt && p.yearBuilt < 1995) {
    cons.push("Older condo building — check post-Surfside reserve/special-assessment risk");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, label: ratingLabel(score, p), pros, cons };
}

function ratingLabel(score: number, p: Property): string {
  if (p.strStatus === "banned") return "Avoid (STR banned)";
  if (score >= 80) return "Top pick";
  if (score >= 68) return "Strong";
  if (score >= 55) return "Solid";
  if (score >= 42) return "Marginal";
  return "Weak";
}
