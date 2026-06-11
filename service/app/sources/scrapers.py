"""Best-effort, free STR comp signals (no proxies). Airbnb/VRBO actively block
server requests, so these often fail on hosted IPs — always degrade gracefully
and label results experimental. Used only to *enrich* the STR model, never as a
foundation."""
from __future__ import annotations

import re
import statistics
from typing import Optional

from ..config import settings
from ..http import client

# Long-standing public Airbnb web API key (embedded in their pages). May rotate.
AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t"


async def airbnb_adr(lat: float, lng: float, beds: int = 2) -> dict:
    """Attempt a median nightly ADR for an area from Airbnb. Best-effort."""
    if not settings.enable_scrapers:
        return {"ok": False, "reason": "scrapers disabled"}
    # Bounding box ~ a few miles around the point.
    d = 0.06
    url = "https://www.airbnb.com/api/v3/StaysSearch"
    headers = {"x-airbnb-api-key": AIRBNB_API_KEY, "accept": "application/json"}
    params = {
        "operationName": "StaysSearch",
        "_cb": "1",
    }
    body = {
        "variables": {
            "staysSearchRequest": {
                "requestedPageType": "STAYS_SEARCH",
                "rawParams": [
                    {"filterName": "neLat", "filterValues": [str(lat + d)]},
                    {"filterName": "neLng", "filterValues": [str(lng + d)]},
                    {"filterName": "swLat", "filterValues": [str(lat - d)]},
                    {"filterName": "swLng", "filterValues": [str(lng - d)]},
                    {"filterName": "min_bedrooms", "filterValues": [str(max(1, beds))]},
                ],
            }
        },
        "extensions": {"persistedQuery": {"version": 1, "sha256Hash": ""}},
    }
    try:
        async with client(headers=headers) as c:
            r = await c.post(url, params=params, json=body)
            if r.status_code != 200:
                return {"ok": False, "reason": f"blocked ({r.status_code})", "blocked": True}
            text = r.text
    except Exception as e:
        return {"ok": False, "reason": f"error: {e}", "blocked": True}

    # Pull nightly prices out of the response heuristically.
    prices = [int(x) for x in re.findall(r'"amount":(\d{2,5})', text)]
    prices = [p for p in prices if 40 <= p <= 3000]
    if len(prices) < 3:
        return {"ok": False, "reason": "no usable price signal", "blocked": False}
    return {
        "ok": True,
        "median_adr": round(statistics.median(prices)),
        "p25_adr": round(statistics.quantiles(prices, n=4)[0]) if len(prices) >= 4 else None,
        "p75_adr": round(statistics.quantiles(prices, n=4)[2]) if len(prices) >= 4 else None,
        "sample": len(prices),
        "source": "airbnb (experimental)",
    }
