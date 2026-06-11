"""Strategic decision support: deal scoring (value gap + signals), STR-vs-LTR
recommendation, and market risk summary. Every output is explainable."""
from __future__ import annotations

from typing import Optional


def deal_score(
    *,
    list_price: float,
    predicted_value: Optional[float] = None,
    str_net: Optional[float] = None,
    lt_cap_rate: Optional[float] = None,
    lt_cash_flow: Optional[float] = None,
    days_on_market: Optional[int] = None,
    flood_high_risk: bool = False,
    str_allowed: Optional[bool] = None,
) -> dict:
    score = 50.0
    pros: list[str] = []
    cons: list[str] = []

    value_gap = None
    if predicted_value and list_price:
        value_gap = (predicted_value - list_price) / list_price
        if value_gap >= 0.08:
            score += 16
            pros.append(f"Listed ~{value_gap*100:.0f}% below estimated value — potential equity on day one")
        elif value_gap >= 0.02:
            score += 7
            pros.append(f"Listed slightly below estimated value (~{value_gap*100:.0f}%)")
        elif value_gap <= -0.08:
            score -= 12
            cons.append(f"Listed ~{abs(value_gap)*100:.0f}% above estimated value — likely overpriced")

    if str_net is not None and list_price:
        ystr = str_net / list_price * 100
        if ystr >= 9:
            score += 14
            pros.append(f"Strong STR net yield ({ystr:.0f}% of price/yr)")
        elif ystr < 4:
            score -= 6
            cons.append(f"Thin STR net yield ({ystr:.0f}% of price/yr)")

    if lt_cap_rate is not None:
        if lt_cap_rate >= 7:
            score += 12
            pros.append(f"Strong long-term cap rate ({lt_cap_rate:.1f}%)")
        elif lt_cap_rate < 4:
            score -= 6
            cons.append(f"Thin long-term cap rate ({lt_cap_rate:.1f}%)")

    if days_on_market is not None and days_on_market >= 75:
        pros.append(f"{days_on_market} days on market — negotiation leverage")
    if flood_high_risk:
        score -= 6
        cons.append("High-risk flood zone — added insurance cost + resale friction")
    if str_allowed is False:
        score -= 25
        cons.append("STR banned here — disqualifying for an Airbnb thesis")
    elif str_allowed is None:
        cons.append("STR status unverified — confirm before any offer")

    score = max(0, min(100, round(score)))

    # recommendation
    rec, why = "Hold/Investigate", []
    str_ok = str_allowed is not False
    str_strong = str_net is not None and list_price and (str_net / list_price) >= 0.07 and str_ok
    lt_strong = (lt_cap_rate or 0) >= 6 or (lt_cash_flow or 0) > 0
    if str_allowed is False and not lt_strong:
        rec, why = "Pass", ["STR banned and long-term returns are weak"]
    elif str_strong and (str_net or 0) >= (lt_cash_flow or 0):
        rec, why = "Buy → operate as STR", ["STR net return leads and STR is allowed"]
    elif lt_strong:
        rec, why = "Buy → long-term rental", ["Solid long-term cash flow / cap rate with less operational risk"]
    elif value_gap is not None and value_gap >= 0.08:
        rec, why = "Buy → value play", ["Priced well below estimated value"]
    else:
        rec, why = "Pass / negotiate", ["Returns don't clear the bar at list price"]

    return {
        "score": score,
        "value_gap_pct": round(value_gap * 100, 1) if value_gap is not None else None,
        "predicted_value": round(predicted_value) if predicted_value else None,
        "recommendation": rec,
        "why": why,
        "pros": pros,
        "cons": cons,
    }


def market_summary(rent_fc: Optional[dict], value_fc: Optional[dict], rent_mom: Optional[dict], value_mom: Optional[dict]) -> dict:
    flags = []
    risk = "moderate"
    vy = (value_mom or {}).get("yoy")
    ry = (rent_mom or {}).get("yoy")
    if vy is not None and vy > 0.12:
        flags.append("Home values up >12% YoY — elevated correction risk if rates/demand soften")
        risk = "elevated"
    if vy is not None and vy < -0.03:
        flags.append("Home values declining YoY — buyer's market, negotiate hard")
    if ry is not None and ry < 0:
        flags.append("Rents softening YoY — pressure on cash flow / STR ADR")
    if not flags:
        flags.append("No major red flags in current momentum")

    return {
        "rent": {"momentum": rent_mom, "forecast_12mo_growth": (rent_fc or {}).get("projected_annual_growth")},
        "value": {"momentum": value_mom, "forecast_12mo_growth": (value_fc or {}).get("projected_annual_growth")},
        "risk_level": risk,
        "flags": flags,
    }
