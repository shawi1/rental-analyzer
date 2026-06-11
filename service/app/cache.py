"""Tiny TTL cache: in-memory + on-disk JSON (under service/data/cache).

Keeps the service free/runnable with no database. Swappable for Postgres later
via DATABASE_URL without changing call sites.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any, Optional

from .config import DATA_DIR, settings

_CACHE_DIR = DATA_DIR / "cache"
_CACHE_DIR.mkdir(exist_ok=True)
_mem: dict[str, tuple[float, Any]] = {}


def _key(namespace: str, ident: str) -> str:
    h = hashlib.sha1(ident.encode("utf-8")).hexdigest()[:24]
    return f"{namespace}__{h}"


def get(namespace: str, ident: str, ttl: Optional[int] = None) -> Optional[Any]:
    ttl = settings.cache_ttl_seconds if ttl is None else ttl
    k = _key(namespace, ident)
    now = time.time()
    if k in _mem:
        ts, val = _mem[k]
        if now - ts <= ttl:
            return val
    f = _CACHE_DIR / f"{k}.json"
    if f.exists():
        try:
            payload = json.loads(f.read_text())
            if now - payload["ts"] <= ttl:
                _mem[k] = (payload["ts"], payload["val"])
                return payload["val"]
        except Exception:
            return None
    return None


def put(namespace: str, ident: str, value: Any) -> None:
    k = _key(namespace, ident)
    ts = time.time()
    _mem[k] = (ts, value)
    try:
        (_CACHE_DIR / f"{k}.json").write_text(json.dumps({"ts": ts, "val": value}))
    except Exception:
        pass
