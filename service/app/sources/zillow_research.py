"""Zillow Research public CSVs (free, legal — CDN, not the WAF-walled site).

ZORI = rent index, ZHVI = home-value index, monthly history keyed by ZIP. We
download each file to disk (refreshed periodically) and extract per-ZIP series.
"""
from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Optional

import httpx
import pandas as pd

from ..config import DATA_DIR, settings

URLS = {
    "rent": "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv",
    "value": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
}
MAX_AGE = 14 * 86400  # refresh files every 14 days
_META_COLS = {"RegionID", "SizeRank", "RegionName", "RegionType", "StateName", "State", "City", "Metro", "CountyName"}


def _path(kind: str) -> Path:
    return DATA_DIR / f"zillow_{kind}.csv"


async def _ensure_csv(kind: str) -> Optional[Path]:
    p = _path(kind)
    if p.exists() and (time.time() - p.stat().st_mtime) < MAX_AGE:
        return p
    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as c:
            async with c.stream("GET", URLS[kind]) as r:
                r.raise_for_status()
                tmp = p.with_suffix(".tmp")
                with open(tmp, "wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)
                tmp.replace(p)
        return p
    except Exception:
        return p if p.exists() else None


def _extract(p: Path, zipcode: str) -> Optional[dict]:
    # Read only the matching ZIP row (RegionName is the ZIP for these files).
    df = pd.read_csv(p, dtype={"RegionName": str})
    row = df[df["RegionName"] == str(zipcode)]
    if row.empty:
        return None
    r = row.iloc[0]
    series = {}
    for col, val in r.items():
        if col in _META_COLS:
            continue
        if pd.notna(val):
            series[col] = float(val)
    if not series:
        return None
    return {
        "zip": zipcode,
        "metro": r.get("Metro"),
        "county": r.get("CountyName"),
        "series": series,  # {YYYY-MM-DD: value}
    }


async def zip_series(kind: str, zipcode: str) -> Optional[dict]:
    """kind = 'rent' (ZORI) | 'value' (ZHVI). Returns monthly series for a ZIP."""
    from .. import cache

    ck = f"{kind}:{zipcode}"
    cached = cache.get("zillow", ck, ttl=MAX_AGE)
    if cached is not None:
        return cached or None
    p = await _ensure_csv(kind)
    if not p:
        return None
    out = await asyncio.to_thread(_extract, p, zipcode)
    cache.put("zillow", ck, out or {})
    return out
