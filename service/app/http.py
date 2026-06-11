"""Shared async HTTP helpers."""
from __future__ import annotations

from typing import Any, Optional

import httpx

from .config import settings


def client(**kwargs: Any) -> httpx.AsyncClient:
    headers = {"user-agent": settings.user_agent}
    headers.update(kwargs.pop("headers", {}) or {})
    return httpx.AsyncClient(timeout=settings.http_timeout, headers=headers, follow_redirects=True, **kwargs)


async def get_json(url: str, *, params: Optional[dict] = None, headers: Optional[dict] = None) -> Any:
    async with client(headers=headers or {}) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        return r.json()


async def get_text(url: str, *, params: Optional[dict] = None, headers: Optional[dict] = None) -> str:
    async with client(headers=headers or {}) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        return r.text
