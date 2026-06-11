from fastapi import APIRouter

from ..services import train

router = APIRouter()


@router.get("/admin/status")
async def admin_status():
    return {"avm": train.status()}


@router.post("/admin/retrain")
async def admin_retrain(target: str = "value"):
    if target not in ("value", "rent"):
        return {"error": "target must be 'value' or 'rent'"}
    return train.train(target)
