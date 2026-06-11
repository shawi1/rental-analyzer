"""Monte Carlo multi-year return projection (IRR / total return) with P10-P90
bands. Models uncertainty in rent growth, appreciation, and occupancy instead of
a single fragile number."""
from __future__ import annotations

from typing import Optional

import numpy as np


def _mortgage_payment(loan: float, rate_pct: float, years: int) -> float:
    if loan <= 0:
        return 0.0
    r = rate_pct / 100 / 12
    n = years * 12
    if r == 0:
        return loan / n
    return loan * (r * (1 + r) ** n) / ((1 + r) ** n - 1)


def _balance(loan: float, rate_pct: float, years: int, after_years: int) -> float:
    if loan <= 0:
        return 0.0
    r = rate_pct / 100 / 12
    n = years * 12
    m = _mortgage_payment(loan, rate_pct, years)
    k = after_years * 12
    if r == 0:
        return max(0.0, loan - m * k)
    bal = loan * (1 + r) ** k - m * ((1 + r) ** k - 1) / r
    return max(0.0, bal)


def _irr(cashflows: np.ndarray) -> Optional[float]:
    # bisection on NPV; cashflows[0] negative
    lo, hi = -0.95, 1.0
    def npv(rate):
        t = np.arange(len(cashflows))
        return np.sum(cashflows / (1 + rate) ** t)
    flo, fhi = npv(lo), npv(hi)
    if np.isnan(flo) or np.isnan(fhi) or flo * fhi > 0:
        return None
    for _ in range(100):
        mid = (lo + hi) / 2
        fm = npv(mid)
        if abs(fm) < 1e-6:
            return mid
        if flo * fm < 0:
            hi, fhi = mid, fm
        else:
            lo, flo = mid, fm
    return (lo + hi) / 2


def monte_carlo(
    *,
    price: float,
    annual_net_income: float,  # NOI for LTR, or STR net (already after opex)
    financed: bool = False,
    down_pct: float = 25.0,
    rate_pct: float = 7.0,
    term_years: int = 30,
    closing_pct: float = 3.0,
    sale_cost_pct: float = 7.0,
    horizon_years: int = 5,
    income_growth_mean: float = 0.03,
    income_growth_vol: float = 0.03,
    appreciation_mean: float = 0.035,
    appreciation_vol: float = 0.06,
    sims: int = 5000,
    seed: int = 7,
) -> dict:
    rng = np.random.default_rng(seed)

    if financed:
        down = price * down_pct / 100
        loan = price - down
        cash_invested = down + price * closing_pct / 100
        annual_debt = _mortgage_payment(loan, rate_pct, term_years) * 12
        payoff = _balance(loan, rate_pct, term_years, horizon_years)
    else:
        cash_invested = price * (1 + closing_pct / 100)
        annual_debt = 0.0
        payoff = 0.0

    irrs, totals = [], []
    for _ in range(sims):
        ig = rng.normal(income_growth_mean, income_growth_vol, horizon_years).clip(-0.2, 0.25)
        ag = rng.normal(appreciation_mean, appreciation_vol, horizon_years).clip(-0.25, 0.3)
        cfs = [-cash_invested]
        income = annual_net_income
        value = price
        cum_cf = 0.0
        for y in range(horizon_years):
            income *= 1 + ig[y]
            value *= 1 + ag[y]
            yr_cf = income - annual_debt
            cum_cf += yr_cf
            if y == horizon_years - 1:
                net_sale = value * (1 - sale_cost_pct / 100) - payoff
                yr_cf += net_sale
            cfs.append(yr_cf)
        irr = _irr(np.array(cfs, dtype=float))
        if irr is not None:
            irrs.append(irr)
        totals.append((cum_cf + value * (1 - sale_cost_pct / 100) - payoff) / cash_invested)

    irrs = np.array(irrs) if irrs else np.array([0.0])
    totals = np.array(totals)

    def pct(a, q):
        return round(float(np.percentile(a, q)), 4)

    return {
        "cash_invested": round(cash_invested),
        "horizon_years": horizon_years,
        "financed": financed,
        "sims": sims,
        "irr": {"p10": pct(irrs, 10), "median": pct(irrs, 50), "p90": pct(irrs, 90)},
        "equity_multiple": {"p10": pct(totals, 10), "median": pct(totals, 50), "p90": pct(totals, 90)},
        "assumptions": {
            "income_growth_mean": income_growth_mean,
            "appreciation_mean": appreciation_mean,
            "annual_debt_service": round(annual_debt),
        },
    }
