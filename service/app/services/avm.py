"""Baseline value & long-term rent estimation.

Priority: MLS comps (when provided) -> HUD FMR / Census ACS baselines. Returns a
point estimate, a range, the source, and the basis (so output is defensible).
"""
from __future__ import annotations

import statistics
from typing import Optional

from ..sources import census as census_src
from ..sources import hud as hud_src


def _median(xs):
    xs = [x for x in xs if x]
    return statistics.median(xs) if xs else None


async def estimate_rent(zipcode: str, beds: int, comps: Optional[list[dict]] = None) -> dict:
    basis = {"comps_n": 0}
    rent = None
    source = None

    if comps:
        vals = [c.get("rent") or c.get("ListPrice") for c in comps if (c.get("rent") or c.get("ListPrice"))]
        if vals:
            rent = round(_median(vals))
            source = "mls_rental_comps"
            basis["comps_n"] = len(vals)

    hud = await hud_src.fmr_by_zip(zipcode) if zipcode else None
    hud_rent = hud_src.fmr_for_beds(hud["rent_by_bed"], beds) if hud else None
    basis["hud_fmr"] = hud_rent

    acs = await census_src.acs_by_zip(zipcode) if zipcode else None
    acs_rent = None
    if acs:
        acs_rent = (acs.get("rent_by_bed") or {}).get(min(4, max(1, beds))) or acs.get("median_rent")
    basis["census_acs"] = acs_rent

    if rent is None:
        rent = hud_rent or acs_rent
        source = "hud_fmr" if hud_rent else ("census_acs" if acs_rent else None)

    if rent is None:
        return {"rent": None, "low": None, "high": None, "source": None, "basis": basis}

    spread = 0.10 if source == "mls_rental_comps" else 0.15
    return {
        "rent": int(round(rent)),
        "low": int(round(rent * (1 - spread))),
        "high": int(round(rent * (1 + spread))),
        "source": source,
        "basis": basis,
    }


async def estimate_value(zipcode: str, beds: int, sqft: Optional[float] = None, comps: Optional[list[dict]] = None) -> dict:
    basis = {"comps_n": 0}
    value = None
    source = None

    if comps:
        prices = [c.get("ClosePrice") or c.get("close_price") or c.get("price") for c in comps]
        prices = [p for p in prices if p]
        if sqft:
            ppsf = [
                (c.get("ClosePrice") or c.get("close_price") or c.get("price")) / c.get("sqft")
                for c in comps
                if (c.get("ClosePrice") or c.get("close_price") or c.get("price")) and c.get("sqft")
            ]
            if ppsf:
                value = round(_median(ppsf) * sqft)
                source = "mls_sold_comps_ppsf"
        if value is None and prices:
            value = round(_median(prices))
            source = "mls_sold_comps"
        basis["comps_n"] = len(prices)

    acs = await census_src.acs_by_zip(zipcode) if zipcode else None
    acs_value = acs.get("median_value") if acs else None
    basis["census_median_value"] = acs_value

    if value is None:
        value = acs_value
        source = "census_area_median" if acs_value else None

    if value is None:
        return {"value": None, "low": None, "high": None, "source": source, "basis": basis}

    spread = 0.10 if source and source.startswith("mls") else 0.20
    return {
        "value": int(round(value)),
        "low": int(round(value * (1 - spread))),
        "high": int(round(value * (1 + spread))),
        "source": source,
        "basis": basis,
    }
