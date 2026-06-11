"""STR market archetypes + projection model (ported from the app's TS model).

Produces Conservative / Realistic / Optimistic gross + net, occupancy, ADR, and a
monthly seasonality breakdown. When live Airbnb/VRBO comps are available they can
override the benchmark via `comp_adr` / `comp_occ`.
"""
from __future__ import annotations

from typing import Optional

SEASONS = {
    "summerBeach": [0.45, 0.6, 1.0, 1.0, 1.05, 1.55, 1.7, 1.35, 0.85, 0.8, 0.6, 1.05],
    "winterBeach": [1.3, 1.35, 1.4, 1.2, 0.95, 0.75, 0.75, 0.7, 0.65, 0.8, 1.0, 1.15],
    "themePark": [0.96, 0.84, 1.2, 1.08, 0.84, 1.2, 1.32, 0.96, 0.72, 0.84, 0.84, 1.2],
    "urban": [0.85, 0.9, 1.1, 1.1, 1.05, 1.0, 0.95, 0.95, 1.0, 1.1, 1.0, 1.0],
    "snowbird": [1.25, 1.3, 1.35, 1.15, 0.9, 0.75, 0.75, 0.7, 0.7, 0.85, 1.05, 1.25],
}

# archetype -> bed list, ADRs, occupancies, seasonal key, avg stay
ARCH = {
    "beach": dict(beds=[0, 1, 2, 3, 4], adrs=[150, 210, 285, 385, 500], occs=[47, 50, 52, 54, 55], season="summerBeach", stay=4.5),
    "south-beach": dict(beds=[0, 1, 2, 3, 4], adrs=[180, 250, 340, 460, 620], occs=[55, 58, 60, 61, 62], season="winterBeach", stay=4.0),
    "theme-park": dict(beds=[2, 3, 4, 5, 6], adrs=[185, 245, 300, 360, 420], occs=[55, 57, 58, 60, 60], season="themePark", stay=5.0),
    "urban": dict(beds=[0, 1, 2, 3], adrs=[110, 150, 205, 285], occs=[55, 57, 58, 58], season="urban", stay=3.2),
    "keys": dict(beds=[1, 2, 3, 4], adrs=[320, 430, 580, 780], occs=[68, 70, 72, 72], season="winterBeach", stay=4.0),
    "snowbird-inland": dict(beds=[1, 2, 3], adrs=[95, 140, 190], occs=[48, 50, 52], season="snowbird", stay=5.0),
}

MGMT = {"low": 0.85, "mid": 1.0, "high": 1.15}
OCC_MGMT = {"low": 0.88, "mid": 1.0, "high": 1.08}
OCC_CAP = 78.0


def _interp(xs, ys, x):
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / (xs[i + 1] - xs[i])
            return ys[i] + t * (ys[i + 1] - ys[i])
    return ys[-1]


def analyze_str(
    *,
    beds: int,
    archetype: str = "beach",
    adr_factor: float = 1.0,
    tier_low: float = 0.8,
    tier_high: float = 1.0,
    price: Optional[float] = None,
    hoa_monthly: Optional[float] = None,
    host_fee_pct: float = 15.0,
    tourist_tax_pct: float = 5.0,
    property_tax_pct: float = 1.0,
    insurance_pct: float = 0.7,
    comp_adr: Optional[float] = None,
    comp_occ: Optional[float] = None,
) -> dict:
    arch = ARCH.get(archetype, ARCH["beach"])
    base_adr = comp_adr if comp_adr else _interp(arch["beds"], arch["adrs"], beds) * adr_factor
    base_occ = comp_occ if comp_occ else _interp(arch["beds"], arch["occs"], beds)
    tier_mid = (tier_low + tier_high) / 2
    season = SEASONS[arch["season"]]

    def scenario(loc_mult: float, mgmt: float, occ_mgmt: float) -> dict:
        occ = min(OCC_CAP, base_occ * occ_mgmt)
        nights = round(365 * occ / 100)
        adr = round(base_adr * loc_mult * mgmt)
        gross = round(adr * nights)
        return {"gross": gross, "occ": round(occ, 1), "adr": adr, "nights": nights, "net": 0}

    low = scenario(tier_low, MGMT["low"], OCC_MGMT["low"])
    mid = scenario(tier_mid, MGMT["mid"], OCC_MGMT["mid"])
    high = scenario(tier_high, MGMT["high"], OCC_MGMT["high"])

    # expenses (mid), then net per scenario (variable fees scale w/ gross)
    beds_eff = max(1, beds)
    hoa = (hoa_monthly * 12) if hoa_monthly else (4800 if archetype != "snowbird-inland" else 1200)
    utilities = min(4200, 1200 + beds_eff * 450)
    supplies = 600 + beds_eff * 150
    prop_tax = round((price or 0) * property_tax_pct / 100)
    insurance = round((price or 0) * insurance_pct / 100)
    fixed = hoa + utilities + supplies + prop_tax + insurance
    var_rate = (host_fee_pct + tourist_tax_pct) / 100
    for s in (low, mid, high):
        s["net"] = round(s["gross"] - s["gross"] * var_rate - fixed)

    monthly = [round(mid["gross"] * m / 12) for m in season]
    return {
        "archetype": archetype,
        "low": low,
        "mid": mid,
        "high": high,
        "monthly_gross_mid": monthly,
        "expenses_annual": {
            "platform_mgmt_fee": round(mid["gross"] * host_fee_pct / 100),
            "tourist_tax": round(mid["gross"] * tourist_tax_pct / 100),
            "hoa": round(hoa),
            "property_tax": prop_tax,
            "insurance": insurance,
            "utilities": utilities,
            "supplies": supplies,
        },
        "source": "comps" if comp_adr else "model",
    }
