"""Compose location intelligence for /enrich."""
from __future__ import annotations

from typing import Optional

from ..sources import census as census_src
from ..sources import fema as fema_src
from ..sources import osm


async def enrich(address: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None,
                 zipcode: Optional[str] = None) -> dict:
    geo = None
    if (lat is None or lng is None) and address:
        geo = await osm.geocode(address)
        if geo:
            lat, lng = geo["lat"], geo["lng"]
            zipcode = zipcode or geo.get("zip")

    out: dict = {"lat": lat, "lng": lng, "zip": zipcode, "geocode": geo}
    if lat is None or lng is None:
        out["error"] = "Could not geocode the address."
        return out

    beach = await osm.nearest_beach_mi(lat, lng)
    pois = await osm.poi_density(lat, lng)
    anchors = osm.anchor_distances(lat, lng)
    flood = await fema_src.flood_zone(lat, lng)
    acs = await census_src.acs_by_zip(zipcode) if zipcode else None

    nearest_anchor = min(anchors.items(), key=lambda kv: kv[1]) if anchors else None
    out.update(
        {
            "distance_to_beach_mi": beach,
            "distance_to_anchors_mi": anchors,
            "nearest_major_anchor": {"name": nearest_anchor[0], "miles": nearest_anchor[1]} if nearest_anchor else None,
            "walkability_poi_count_1_5km": pois,
            "flood": flood,
            "demographics": {
                "median_household_income": (acs or {}).get("median_income"),
                "population_zcta": (acs or {}).get("population"),
                "acs_year": (acs or {}).get("year"),
            }
            if acs
            else None,
        }
    )
    return out
