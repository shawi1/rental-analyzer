"""US Census ACS 5-year data by ZCTA (ZIP). Free; key optional."""
from __future__ import annotations

from typing import Optional

from .. import cache
from ..config import settings
from ..http import client

YEARS = [2023, 2022, 2021]
# median gross rent, median home value, median hh income, population,
# + median gross rent by bedrooms (1br,2br,3br,4br)
VARS = [
    "B25064_001E", "B25077_001E", "B19013_001E", "B01003_001E",
    "B25031_003E", "B25031_004E", "B25031_005E", "B25031_006E",
]


def _num(v) -> Optional[int]:
    try:
        n = int(float(v))
        return None if n < 0 else n  # Census uses large negatives for null
    except Exception:
        return None


async def acs_by_zip(zipcode: str) -> Optional[dict]:
    cached = cache.get("acs", zipcode)
    if cached is not None:
        return cached or None
    params_base = {"get": "NAME," + ",".join(VARS), "for": f"zip code tabulation area:{zipcode}"}
    if settings.census_api_key:
        params_base["key"] = settings.census_api_key

    row = None
    for year in YEARS:
        try:
            async with client() as c:
                r = await c.get(f"https://api.census.gov/data/{year}/acs/acs5", params=params_base)
                if r.status_code != 200:
                    continue
                data = r.json()
                if len(data) >= 2:
                    row = dict(zip(data[0], data[1]))
                    row["_year"] = year
                    break
        except Exception:
            continue
    if not row:
        cache.put("acs", zipcode, {})
        return None

    out = {
        "year": row.get("_year"),
        "median_rent": _num(row.get("B25064_001E")),
        "median_value": _num(row.get("B25077_001E")),
        "median_income": _num(row.get("B19013_001E")),
        "population": _num(row.get("B01003_001E")),
        "rent_by_bed": {
            1: _num(row.get("B25031_003E")),
            2: _num(row.get("B25031_004E")),
            3: _num(row.get("B25031_005E")),
            4: _num(row.get("B25031_006E")),
        },
    }
    cache.put("acs", zipcode, out)
    return out
