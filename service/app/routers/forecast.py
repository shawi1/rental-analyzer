from typing import Optional

from fastapi import APIRouter, Query

from ..services import forecast as fc
from ..services.strategy import market_summary
from ..sources import osm, zillow_research

router = APIRouter()


async def _zip(zip: Optional[str], address: Optional[str]) -> Optional[str]:
    if zip:
        return zip
    if address:
        g = await osm.geocode(address)
        return g.get("zip") if g else None
    return None


async def _forecast(kind: str, zipcode: str, horizon: int):
    data = await zillow_research.zip_series(kind, zipcode)
    if not data or not data.get("series"):
        return None
    out = fc.forecast_series(data["series"], horizon)
    out["zip"] = zipcode
    out["metro"] = data.get("metro")
    out["index"] = "ZORI (rent)" if kind == "rent" else "ZHVI (value)"
    return out


@router.get("/forecast/rent")
async def forecast_rent(zip: Optional[str] = None, address: Optional[str] = None, horizon: int = Query(24, ge=6, le=60)):
    z = await _zip(zip, address)
    if not z:
        return {"error": "Provide a zip or geocodable address."}
    out = await _forecast("rent", z, horizon)
    return out or {"error": f"No Zillow rent index for ZIP {z}."}


@router.get("/forecast/value")
async def forecast_value(zip: Optional[str] = None, address: Optional[str] = None, horizon: int = Query(24, ge=6, le=60)):
    z = await _zip(zip, address)
    if not z:
        return {"error": "Provide a zip or geocodable address."}
    out = await _forecast("value", z, horizon)
    return out or {"error": f"No Zillow value index for ZIP {z}."}


@router.get("/market")
async def market(zip: Optional[str] = None, address: Optional[str] = None):
    z = await _zip(zip, address)
    if not z:
        return {"error": "Provide a zip or geocodable address."}
    rent = await zillow_research.zip_series("rent", z)
    value = await zillow_research.zip_series("value", z)
    rent_fc = fc.forecast_series(rent["series"], 12) if rent and rent.get("series") else None
    value_fc = fc.forecast_series(value["series"], 12) if value and value.get("series") else None
    rent_mom = fc.momentum(rent["series"]) if rent and rent.get("series") else None
    value_mom = fc.momentum(value["series"]) if value and value.get("series") else None
    summary = market_summary(rent_fc, value_fc, rent_mom, value_mom)
    summary["zip"] = z
    summary["metro"] = (value or rent or {}).get("metro")
    return summary
