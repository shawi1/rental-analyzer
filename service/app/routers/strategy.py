from typing import Optional

from fastapi import APIRouter, Query

from ..services import forecast as fc
from ..services import returns as ret
from ..services.strategy import deal_score
from ..sources import osm, zillow_research

router = APIRouter()


@router.get("/returns")
async def returns_route(
    price: float,
    annual_net_income: float = Query(..., description="NOI for long-term, or STR net income (already after expenses)"),
    financed: bool = False,
    down_pct: float = 25.0,
    rate_pct: float = 7.0,
    term_years: int = 30,
    closing_pct: float = 3.0,
    horizon_years: int = Query(5, ge=1, le=30),
    zip: Optional[str] = None,
    address: Optional[str] = None,
    income_growth_mean: Optional[float] = None,
    appreciation_mean: Optional[float] = None,
):
    """Monte Carlo IRR / equity-multiple with P10-P90 bands. If a zip/address is
    given, growth assumptions are auto-derived from that market's Zillow trend."""
    z = zip
    if not z and address:
        g = await osm.geocode(address)
        z = g.get("zip") if g else None
    if z and (income_growth_mean is None or appreciation_mean is None):
        rent = await zillow_research.zip_series("rent", z)
        value = await zillow_research.zip_series("value", z)
        if income_growth_mean is None and rent and rent.get("series"):
            income_growth_mean = fc.forecast_series(rent["series"], 12).get("projected_annual_growth")
        if appreciation_mean is None and value and value.get("series"):
            appreciation_mean = fc.forecast_series(value["series"], 12).get("projected_annual_growth")

    return ret.monte_carlo(
        price=price,
        annual_net_income=annual_net_income,
        financed=financed,
        down_pct=down_pct,
        rate_pct=rate_pct,
        term_years=term_years,
        closing_pct=closing_pct,
        horizon_years=horizon_years,
        income_growth_mean=income_growth_mean if income_growth_mean is not None else 0.03,
        appreciation_mean=appreciation_mean if appreciation_mean is not None else 0.035,
    )


@router.get("/deal-score")
async def deal_score_route(
    list_price: float,
    predicted_value: Optional[float] = None,
    str_net: Optional[float] = None,
    lt_cap_rate: Optional[float] = None,
    lt_cash_flow: Optional[float] = None,
    days_on_market: Optional[int] = None,
    flood_high_risk: bool = False,
    str_allowed: Optional[bool] = None,
):
    return deal_score(
        list_price=list_price,
        predicted_value=predicted_value,
        str_net=str_net,
        lt_cap_rate=lt_cap_rate,
        lt_cash_flow=lt_cash_flow,
        days_on_market=days_on_market,
        flood_high_risk=flood_high_risk,
        str_allowed=str_allowed,
    )
