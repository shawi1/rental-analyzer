"""Simple shared-secret auth: callers send `x-api-key`."""
from typing import Optional

from fastapi import Header, HTTPException, status

from .config import settings


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    if not settings.api_key:
        return  # auth disabled
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing x-api-key.",
        )
