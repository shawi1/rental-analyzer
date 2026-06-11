from typing import Optional

from fastapi import APIRouter

from ..sources import reso

router = APIRouter()

# our PropertyType -> RESO PropertySubType (common values; adjust per MLS)
SUBTYPE = {
    "condo": "Condominium",
    "townhome": "Townhouse",
    "single-family": "Single Family Residence",
    "multi-family": "Multi Family",
}


@router.get("/listings")
async def listings_route(
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    beds: Optional[int] = None,
    property_type: Optional[str] = None,
):
    """Budget search via the licensed MLS RESO feed (replaces RentCast search)."""
    if not reso.configured():
        return {"error": "mls-not-configured", "message": "Add MLS RESO credentials to enable owned listing search.", "results": []}
    try:
        rows = await reso.active_listings(
            city=city,
            postal=zip,
            min_price=min_price,
            max_price=max_price,
            beds=beds,
            subtype=SUBTYPE.get(property_type or ""),
        )
        return {"count": len(rows), "results": rows, "source": "mls"}
    except reso.ResoError as e:
        return {"error": "reso", "message": str(e), "results": []}


@router.get("/comps")
async def comps_route(zip: str, beds: Optional[int] = None, kind: str = "both"):
    """Sold + rental comparables for an area — the 'show your work' data."""
    if not reso.configured():
        return {"error": "mls-not-configured", "message": "Add MLS RESO credentials to enable comps."}
    out: dict = {"zip": zip}
    try:
        if kind in ("sold", "both"):
            out["sold"] = await reso.sold_comps(postal=zip, beds=beds)
        if kind in ("rental", "both"):
            out["rental"] = await reso.rental_comps(postal=zip, beds=beds)
        return out
    except reso.ResoError as e:
        return {"error": "reso", "message": str(e)}
