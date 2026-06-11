"""FEMA National Flood Hazard Layer — flood zone at a point. Free, keyless."""
from __future__ import annotations

from typing import Optional

from .. import cache
from ..http import client

NFHL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
HIGH_RISK_PREFIX = ("A", "V")  # SFHA: A/AE/AH/AO/VE etc.


async def flood_zone(lat: float, lng: float) -> Optional[dict]:
    ident = f"{lat:.4f},{lng:.4f}"
    cached = cache.get("fema", ident)
    if cached is not None:
        return cached or None
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "FLD_ZONE,ZONE_SUBTY",
        "returnGeometry": "false",
        "f": "json",
    }
    try:
        async with client() as c:
            r = await c.get(NFHL, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception:
        return None
    feats = data.get("features", [])
    if not feats:
        out = {"zone": None, "high_risk": False, "note": "No mapped flood zone found (often = minimal risk)."}
        cache.put("fema", ident, out)
        return out
    attrs = feats[0].get("attributes", {})
    zone = attrs.get("FLD_ZONE")
    subty = attrs.get("ZONE_SUBTY")
    high = bool(zone) and zone.upper().startswith(HIGH_RISK_PREFIX)
    out = {
        "zone": zone,
        "subtype": subty,
        "high_risk": high,
        "note": "High-risk Special Flood Hazard Area — flood insurance typically required."
        if high
        else "Not in a high-risk flood zone.",
    }
    cache.put("fema", ident, out)
    return out
