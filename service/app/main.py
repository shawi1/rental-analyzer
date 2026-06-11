"""rentaliq-data — our own free, owned rental-data + ML microservice.

Replaces RentCast: listings, value/rent AVMs, comps, STR projections, location
intelligence, and a strategic predictive layer (forecasts, Monte Carlo returns,
deal scoring, market risk). Built on free + MLS-licensed data.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import require_api_key
from .config import settings
from .routers import admin, avm, enrich, forecast, listings, str_router, strategy

app = FastAPI(title="rentaliq-data", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "rentaliq-data",
        "sources": {
            "hud": bool(settings.hud_api_token),
            "census_key": bool(settings.census_api_key),
            "fred": bool(settings.fred_api_key),
            "mls_reso": bool(settings.reso_base_url),
            "scrapers_enabled": settings.enable_scrapers,
        },
    }


_protected = [Depends(require_api_key)]
app.include_router(enrich.router, dependencies=_protected, tags=["enrich"])
app.include_router(avm.router, dependencies=_protected, tags=["avm"])
app.include_router(str_router.router, dependencies=_protected, tags=["str"])
app.include_router(listings.router, dependencies=_protected, tags=["listings"])
app.include_router(forecast.router, dependencies=_protected, tags=["forecast"])
app.include_router(strategy.router, dependencies=_protected, tags=["strategy"])
app.include_router(admin.router, dependencies=_protected, tags=["admin"])
