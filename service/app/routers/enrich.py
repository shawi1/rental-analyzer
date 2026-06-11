from typing import Optional

from fastapi import APIRouter, Query

from ..services.geo import enrich

router = APIRouter()


@router.get("/enrich")
async def enrich_route(
    address: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    zip: Optional[str] = Query(default=None),
):
    """Location intelligence: geocode, distance to beach/parks, walkability, flood zone, demographics."""
    return await enrich(address=address, lat=lat, lng=lng, zipcode=zip)
