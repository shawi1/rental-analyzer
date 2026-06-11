"""Generic RESO Web API (OData) client — the licensed MLS feed.

Works across MLS Grid / Trestle / Bridge: supports either a static bearer token
(reso_access_token) or OAuth2 client_credentials (reso_token_url + id/secret).
All field names are standard RESO so the same code works across MLSs.
"""
from __future__ import annotations

import time
from typing import Optional

from .. import cache
from ..config import settings
from ..http import client

# RESO standard fields we use.
SELECT = ",".join([
    "ListingKey", "UnparsedAddress", "City", "PostalCode", "StateOrProvince",
    "ListPrice", "ClosePrice", "CloseDate", "ListingContractDate", "DaysOnMarket",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "YearBuilt",
    "PropertyType", "PropertySubType", "StandardStatus", "AssociationFee",
    "Latitude", "Longitude",
])

_token_cache: dict = {}


class ResoError(Exception):
    pass


def configured() -> bool:
    return bool(settings.reso_base_url and (settings.reso_access_token or settings.reso_token_url))


async def _bearer() -> Optional[str]:
    if settings.reso_access_token:
        return settings.reso_access_token
    if not settings.reso_token_url:
        return None
    now = time.time()
    if _token_cache.get("exp", 0) > now + 30:
        return _token_cache["token"]
    async with client() as c:
        r = await c.post(
            settings.reso_token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.reso_client_id,
                "client_secret": settings.reso_client_secret,
                "scope": "api",
            },
        )
        r.raise_for_status()
        j = r.json()
    _token_cache["token"] = j["access_token"]
    _token_cache["exp"] = now + int(j.get("expires_in", 3600))
    return _token_cache["token"]


async def query(filter_: str, *, top: int = 50, orderby: Optional[str] = None, resource: Optional[str] = None) -> list[dict]:
    if not configured():
        raise ResoError("MLS RESO API not configured (set RESO_BASE_URL + token).")
    token = await _bearer()
    res = resource or settings.reso_dataset
    params = {"$filter": filter_, "$top": str(top), "$select": SELECT}
    if orderby:
        params["$orderby"] = orderby
    url = f"{settings.reso_base_url.rstrip('/')}/{res}"
    async with client(headers={"authorization": f"Bearer {token}", "accept": "application/json"}) as c:
        r = await c.get(url, params=params)
        if r.status_code >= 400:
            raise ResoError(f"RESO {r.status_code}: {r.text[:300]}")
        return r.json().get("value", [])


def _map(rec: dict) -> dict:
    return {
        "listing_key": rec.get("ListingKey"),
        "address": rec.get("UnparsedAddress"),
        "city": rec.get("City"),
        "zip": rec.get("PostalCode"),
        "state": rec.get("StateOrProvince"),
        "price": rec.get("ListPrice"),
        "close_price": rec.get("ClosePrice"),
        "close_date": rec.get("CloseDate"),
        "days_on_market": rec.get("DaysOnMarket"),
        "beds": rec.get("BedroomsTotal"),
        "baths": rec.get("BathroomsTotalInteger"),
        "sqft": rec.get("LivingArea"),
        "year_built": rec.get("YearBuilt"),
        "property_type": rec.get("PropertyType"),
        "property_subtype": rec.get("PropertySubType"),
        "status": rec.get("StandardStatus"),
        "hoa_monthly": rec.get("AssociationFee"),
        "lat": rec.get("Latitude"),
        "lng": rec.get("Longitude"),
    }


def _esc(s: str) -> str:
    return s.replace("'", "''")


async def active_listings(*, city: Optional[str] = None, postal: Optional[str] = None, min_price: Optional[float] = None,
                          max_price: Optional[float] = None, beds: Optional[int] = None, subtype: Optional[str] = None,
                          top: int = 100) -> list[dict]:
    f = ["StandardStatus eq 'Active'", "PropertyType eq 'Residential'"]
    if city:
        f.append(f"City eq '{_esc(city)}'")
    if postal:
        f.append(f"PostalCode eq '{_esc(postal)}'")
    if min_price:
        f.append(f"ListPrice ge {int(min_price)}")
    if max_price:
        f.append(f"ListPrice le {int(max_price)}")
    if beds:
        f.append(f"BedroomsTotal ge {int(beds)}")
    if subtype:
        f.append(f"PropertySubType eq '{_esc(subtype)}'")
    rows = await query(" and ".join(f), top=top, orderby="ListPrice asc")
    return [_map(r) for r in rows]


async def sold_comps(*, postal: str, beds: Optional[int] = None, months_back: int = 12, top: int = 25) -> list[dict]:
    import datetime as _dt

    since = (_dt.date.today() - _dt.timedelta(days=months_back * 30)).isoformat()
    f = [
        "StandardStatus eq 'Closed'",
        "PropertyType eq 'Residential'",
        f"PostalCode eq '{_esc(postal)}'",
        f"CloseDate ge {since}",
    ]
    if beds:
        f.append(f"BedroomsTotal ge {int(beds) - 1} and BedroomsTotal le {int(beds) + 1}")
    rows = await query(" and ".join(f), top=top, orderby="CloseDate desc")
    return [_map(r) for r in rows]


async def rental_comps(*, postal: str, beds: Optional[int] = None, top: int = 25) -> list[dict]:
    f = ["PropertyType eq 'Residential Lease'", f"PostalCode eq '{_esc(postal)}'"]
    if beds:
        f.append(f"BedroomsTotal ge {int(beds) - 1} and BedroomsTotal le {int(beds) + 1}")
    rows = await query(" and ".join(f), top=top, orderby="ListingContractDate desc")
    out = []
    for r in rows:
        m = _map(r)
        m["rent"] = r.get("ListPrice")  # lease list price = monthly rent
        out.append(m)
    return out
