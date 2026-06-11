"""Service configuration, loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- service auth ---
    api_key: str = "dev-local-key"  # callers must send x-api-key

    # --- free data source keys (most are optional / keyless) ---
    hud_api_token: str = ""          # huduser.gov (we already have one)
    census_api_key: str = ""         # api.census.gov (optional; keyless works low-volume)
    fred_api_key: str = ""           # fred.stlouisfed.org (free)
    bls_api_key: str = ""            # bls.gov (optional)

    # --- MLS RESO Web API (the primary, licensed feed) ---
    reso_base_url: str = ""          # e.g. https://api.mlsgrid.com/v2  or Trestle/Bridge OData root
    reso_access_token: str = ""      # static bearer token (MLS Grid / Bridge style)
    reso_token_url: str = ""         # OAuth token endpoint (Trestle style), optional
    reso_client_id: str = ""
    reso_client_secret: str = ""
    reso_dataset: str = "Property"   # OData resource name
    reso_vendor: str = "generic"     # mlsgrid | trestle | bridge | generic (for quirks)

    # --- behavior ---
    enable_scrapers: bool = True     # best-effort, free (no proxies)
    user_agent: str = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
    http_timeout: float = 25.0
    cache_ttl_seconds: int = 60 * 60 * 12  # 12h default for cached lookups

    # --- optional persistence (defaults to on-disk cache under service/data) ---
    database_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
