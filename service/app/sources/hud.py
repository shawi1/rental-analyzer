"""HUD Fair Market Rents (free, unlimited). ZIP -> county (USPS crosswalk) ->
county FMR record (Small Area FMRs per ZIP). Ported from the app's TS version."""
from __future__ import annotations

from typing import Optional

from .. import cache
from ..config import settings
from ..http import client

BASE = "https://www.huduser.gov/hudapi/public"
FMR_YEARS = [2026, 2025, 2024]
BED_KEY = {0: "Efficiency", 1: "One-Bedroom", 2: "Two-Bedroom", 3: "Three-Bedroom", 4: "Four-Bedroom"}


async def _get(path: str) -> Optional[dict]:
    if not settings.hud_api_token:
        return None
    try:
        async with client(headers={"authorization": f"Bearer {settings.hud_api_token}"}) as c:
            r = await c.get(f"{BASE}{path}")
            if r.status_code != 200:
                return None
            return r.json()
    except Exception:
        return None


async def _zip_to_county(zipcode: str) -> Optional[str]:
    data = await _get(f"/usps?type=2&query={zipcode}")
    results = (data or {}).get("data", {}).get("results", [])
    if not results:
        return None
    results.sort(key=lambda r: r.get("res_ratio", 0), reverse=True)
    return results[0].get("geoid")


async def fmr_by_zip(zipcode: str) -> Optional[dict]:
    cached = cache.get("hud_fmr", zipcode)
    if cached is not None:
        return cached or None
    county = await _zip_to_county(zipcode)
    if not county:
        return None
    data = None
    for year in FMR_YEARS:
        j = await _get(f"/fmr/data/{county}99999?year={year}")
        if j and j.get("data"):
            data = j["data"]
            break
    if not data:
        return None
    bd = data.get("basicdata")
    arr = bd if isinstance(bd, list) else [bd]
    entry = (
        next((b for b in arr if str(b.get("zip_code")) == zipcode), None)
        or next((b for b in arr if "msa" in str(b.get("zip_code")).lower()), None)
        or (arr[0] if arr else {})
    )
    rent_by_bed = {}
    for beds, key in BED_KEY.items():
        v = entry.get(key)
        if v:
            rent_by_bed[beds] = int(v)
    out = {
        "year": data.get("year"),
        "area_name": data.get("area_name") or data.get("county_name"),
        "small_area": str(data.get("smallarea_status")) == "1",
        "rent_by_bed": rent_by_bed,
    }
    cache.put("hud_fmr", zipcode, out)
    return out


def fmr_for_beds(rent_by_bed: dict, beds: int) -> Optional[int]:
    if not rent_by_bed:
        return None
    b = max(0, min(4, beds))
    return rent_by_bed.get(b) or rent_by_bed.get(str(b)) or next(iter(rent_by_bed.values()), None)
