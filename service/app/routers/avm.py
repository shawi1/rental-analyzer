from typing import Optional

from fastapi import APIRouter, Query

from ..services import avm
from ..sources import osm, reso

router = APIRouter()


async def _resolve_zip(zip: Optional[str], address: Optional[str]) -> Optional[str]:
    if zip:
        return zip
    if address:
        geo = await osm.geocode(address)
        if geo:
            return geo.get("zip")
    return None


@router.get("/value")
async def value_route(
    zip: Optional[str] = Query(default=None),
    address: Optional[str] = Query(default=None),
    beds: int = 2,
    sqft: Optional[float] = None,
):
    z = await _resolve_zip(zip, address)
    if not z:
        return {"value": None, "error": "Provide a zip or a geocodable address."}
    comps = None
    if reso.configured():
        try:
            comps = await reso.sold_comps(postal=z, beds=beds)
        except Exception:
            comps = None
    return await avm.estimate_value(z, beds, sqft, comps=comps)


@router.get("/rent")
async def rent_route(
    zip: Optional[str] = Query(default=None),
    address: Optional[str] = Query(default=None),
    beds: int = 2,
):
    z = await _resolve_zip(zip, address)
    if not z:
        return {"rent": None, "error": "Provide a zip or a geocodable address."}
    comps = None
    if reso.configured():
        try:
            comps = await reso.rental_comps(postal=z, beds=beds)
        except Exception:
            comps = None
    return await avm.estimate_rent(z, beds, comps=comps)
