"""OpenStreetMap: geocoding (Nominatim), POIs + nearest beach (Overpass),
distances to major Florida attractions. All free, keyless."""
from __future__ import annotations

import math
from typing import Optional

from .. import cache
from ..http import client

NOMINATIM = "https://nominatim.openstreetmap.org/search"
OVERPASS = "https://overpass-api.de/api/interpreter"
CENSUS_GEOCODER = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
# Nominatim/Overpass require a descriptive UA (they 403 generic browser UAs).
OSM_UA = "rentaliq/1.0 (rental investment analysis; +https://rentalpropertyiq.netlify.app)"

# Major FL demand anchors (lat, lng) for distance scoring.
FL_ANCHORS: dict[str, tuple[float, float]] = {
    "Walt Disney World": (28.3852, -81.5639),
    "Universal Orlando": (28.4743, -81.4677),
    "SeaWorld Orlando": (28.4112, -81.4624),
    "Kennedy Space Center": (28.5729, -80.6490),
    "Port Canaveral": (28.4058, -80.6201),
}


def haversine_mi(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    r = 3958.8
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = math.radians(b_lat - a_lat)
    dlmb = math.radians(b_lng - a_lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return round(r * 2 * math.asin(math.sqrt(h)), 2)


async def _census_geocode(address: str) -> Optional[dict]:
    """Free, keyless US address geocoder (Census). Best for street addresses."""
    try:
        async with client() as c:
            r = await c.get(
                CENSUS_GEOCODER,
                params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
            )
            r.raise_for_status()
            matches = r.json().get("result", {}).get("addressMatches", [])
    except Exception:
        return None
    if not matches:
        return None
    m = matches[0]
    coords = m.get("coordinates", {})
    comp = m.get("addressComponents", {})
    return {
        "lat": float(coords["y"]),
        "lng": float(coords["x"]),
        "display_name": m.get("matchedAddress"),
        "zip": comp.get("zip"),
        "city": comp.get("city"),
        "state": comp.get("state"),
    }


async def _nominatim_geocode(address: str) -> Optional[dict]:
    try:
        async with client(headers={"user-agent": OSM_UA, "accept-language": "en-US"}) as c:
            r = await c.get(
                NOMINATIM,
                params={"q": address, "format": "json", "addressdetails": 1, "limit": 1, "countrycodes": "us"},
            )
            r.raise_for_status()
            arr = r.json()
    except Exception:
        return None
    if not arr:
        return None
    top = arr[0]
    addr = top.get("address", {})
    return {
        "lat": float(top["lat"]),
        "lng": float(top["lon"]),
        "display_name": top.get("display_name"),
        "zip": addr.get("postcode"),
        "city": addr.get("city") or addr.get("town") or addr.get("village"),
        "county": addr.get("county"),
        "state": addr.get("state"),
    }


async def geocode(address: str) -> Optional[dict]:
    cached = cache.get("geocode", address)
    if cached is not None:
        return cached or None
    out = await _census_geocode(address) or await _nominatim_geocode(address)
    cache.put("geocode", address, out or {})
    return out


async def _overpass(query: str) -> Optional[dict]:
    try:
        async with client(headers={"user-agent": OSM_UA}) as c:
            r = await c.post(OVERPASS, data={"data": query})
            r.raise_for_status()
            return r.json()
    except Exception:
        return None


async def nearest_beach_mi(lat: float, lng: float) -> Optional[float]:
    ident = f"{lat:.3f},{lng:.3f}"
    cached = cache.get("beach", ident)
    if cached is not None:
        return cached if cached >= 0 else None
    q = (
        f"[out:json][timeout:25];"
        f'(node["natural"="beach"](around:48000,{lat},{lng});'
        f'way["natural"="beach"](around:48000,{lat},{lng}););'
        f"out center 40;"
    )
    data = await _overpass(q)
    if not data:
        return None
    best = None
    for el in data.get("elements", []):
        c = el.get("center") or el
        blat, blng = c.get("lat"), c.get("lon")
        if blat is None:
            continue
        d = haversine_mi(lat, lng, blat, blng)
        if best is None or d < best:
            best = d
    cache.put("beach", ident, best if best is not None else -1)
    return best


async def poi_density(lat: float, lng: float) -> Optional[int]:
    """Count of dining/shopping/attraction POIs within ~1.5km (walkability proxy)."""
    ident = f"{lat:.3f},{lng:.3f}"
    cached = cache.get("poi", ident)
    if cached is not None:
        return cached if cached >= 0 else None
    q = (
        f"[out:json][timeout:25];"
        f'(node["amenity"~"restaurant|cafe|bar|fast_food"](around:1500,{lat},{lng});'
        f'node["shop"](around:1500,{lat},{lng});'
        f'node["tourism"~"attraction|theme_park|museum"](around:1500,{lat},{lng}););'
        f"out count;"
    )
    data = await _overpass(q)
    if not data:
        return None
    try:
        count = int(data["elements"][0]["tags"]["total"])
    except Exception:
        count = len(data.get("elements", []))
    cache.put("poi", ident, count)
    return count


def anchor_distances(lat: float, lng: float) -> dict[str, float]:
    return {name: haversine_mi(lat, lng, a, b) for name, (a, b) in FL_ANCHORS.items()}
