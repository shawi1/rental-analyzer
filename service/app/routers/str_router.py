from typing import Optional

from fastapi import APIRouter

from ..services.markets import ARCH, analyze_str
from ..sources import scrapers

router = APIRouter()


@router.get("/str")
async def str_route(
    beds: int = 2,
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
    live_comps: bool = False,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    """Short-term rental projection (low/mid/high, occupancy, ADR, seasonality).
    Set live_comps=true with lat/lng to (best-effort) blend live Airbnb ADR."""
    comp_meta = None
    if live_comps and lat is not None and lng is not None and comp_adr is None:
        comp_meta = await scrapers.airbnb_adr(lat, lng, beds)
        if comp_meta.get("ok"):
            comp_adr = comp_meta["median_adr"]
    out = analyze_str(
        beds=beds,
        archetype=archetype,
        adr_factor=adr_factor,
        tier_low=tier_low,
        tier_high=tier_high,
        price=price,
        hoa_monthly=hoa_monthly,
        host_fee_pct=host_fee_pct,
        tourist_tax_pct=tourist_tax_pct,
        property_tax_pct=property_tax_pct,
        insurance_pct=insurance_pct,
        comp_adr=comp_adr,
        comp_occ=comp_occ,
    )
    if comp_meta is not None:
        out["live_comps"] = comp_meta
    return out


@router.get("/str/archetypes")
async def archetypes_route():
    return {"archetypes": list(ARCH.keys())}
