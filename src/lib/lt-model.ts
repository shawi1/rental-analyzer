import type { CityConfig, Property, LtAnalysis, ExpenseLine, FinancingAssumptions } from "./types";

// ============================================================================
// Long-term (traditional) rental model: rent estimate → NOI → cap rate →
// cash flow & cash-on-cash, for both all-cash and financed scenarios.
// ============================================================================

const VACANCY = 0.05; // 5% vacancy/credit loss
const MGMT_PCT = 0.08; // 8% of effective gross income
const MAINT_CAPEX_PCT = 0.1; // 10% of EGI (maintenance + capex reserve)

export function monthlyMortgage(loan: number, annualRatePct: number, years: number): number {
  if (loan <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  return (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

/**
 * @param estimatedRent optional external monthly rent (e.g. RentCast AVM).
 *        Priority: property.rentOverride → estimatedRent → model fallback.
 */
export function analyzeLt(
  city: CityConfig,
  p: Property,
  financing: FinancingAssumptions,
  estimatedRent?: number
): LtAnalysis {
  const monthlyRent =
    p.rentOverride && p.rentOverride > 0
      ? p.rentOverride
      : estimatedRent && estimatedRent > 0
        ? estimatedRent
        : Math.round(p.price * city.ltRentFraction);

  const annualRent = monthlyRent * 12;
  const egi = annualRent * (1 - VACANCY);

  const propTax = Math.round((p.price * city.propertyTaxRate) / 100);
  const insurance = Math.round((p.price * city.insuranceRate * 0.7) / 100); // LT policy cheaper than STR
  const hoa = p.hoaMonthly ? p.hoaMonthly * 12 : 0;
  const management = Math.round(egi * MGMT_PCT);
  const maintCapex = Math.round(egi * MAINT_CAPEX_PCT);

  const expenses: ExpenseLine[] = [
    { label: "Property tax", amount: propTax, note: `${city.propertyTaxRate}% of price` },
    { label: "Insurance", amount: insurance },
    { label: "HOA / condo fees", amount: hoa, note: p.hoaMonthly ? "from listing" : "n/a" },
    { label: "Property management (8%)", amount: management },
    { label: "Maintenance + capex (10%)", amount: maintCapex },
    { label: "Vacancy (5%)", amount: Math.round(annualRent * VACANCY), note: "credit loss reserve" },
  ];

  const operatingExpenses = propTax + insurance + hoa + management + maintCapex;
  const noi = Math.round(egi - operatingExpenses);
  const capRate = (noi / p.price) * 100;
  const grossYield = (annualRent / p.price) * 100;

  const financed = financing.mode === "financed";
  const closing = Math.round((p.price * financing.closingCostPct) / 100);

  let monthlyMtg = 0;
  let cashInvested = p.price + closing;
  if (financed) {
    const down = Math.round((p.price * financing.downPaymentPct) / 100);
    const loan = p.price - down;
    monthlyMtg = monthlyMortgage(loan, financing.interestRate, financing.loanTermYears);
    cashInvested = down + closing;
  }
  const annualDebtService = Math.round(monthlyMtg * 12);
  const cashFlowAnnual = Math.round(noi - annualDebtService);
  const cashOnCash = cashInvested > 0 ? (cashFlowAnnual / cashInvested) * 100 : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : Infinity;

  const methodology =
    `Rent ${p.rentOverride ? "(manual override)" : estimatedRent ? "(RentCast estimate)" : `(modeled at ${(city.ltRentFraction * 100).toFixed(2)}% of price/mo)`}: ` +
    `$${monthlyRent.toLocaleString()}/mo. NOI after 5% vacancy, 8% management, 10% maint/capex, tax, insurance${hoa ? ", HOA" : ""}. ` +
    (financed
      ? `Financed: ${financing.downPaymentPct}% down @ ${financing.interestRate}% over ${financing.loanTermYears}yr.`
      : `All-cash purchase.`);

  return {
    monthlyRent,
    annualRent,
    grossYield: round1(grossYield),
    operatingExpenses,
    noi,
    capRate: round1(capRate),
    monthlyMortgage: Math.round(monthlyMtg),
    annualDebtService,
    cashInvested,
    cashFlowAnnual,
    cashOnCash: round1(cashOnCash),
    dscr: dscr === Infinity ? Infinity : round2(dscr),
    expenses,
    financed,
    methodology,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
