# rentaliq-data

Our own free, owned rental-data + ML microservice that replaces RentCast and goes
deeper. FastAPI (Python). Built on **free + legally-licensed (MLS)** data:

- **MLS RESO Web API** (licensed) — active + sold + rental listings (the core unlock)
- **HUD** Fair Market Rents · **Census ACS** · **OSM** (geocode/POIs/distances) · **FEMA** flood
- **Zillow Research** (ZORI/ZHVI), **FRED**, **FHFA**, **BLS** — forecasting backbone
- **Best-effort** Airbnb scraping — free, no proxies, experimental enrichment only

## Endpoints (all require `x-api-key`)

| Endpoint | What |
|---|---|
| `GET /health` | status + which sources are configured |
| `GET /enrich` | geocode, distance to beach/Disney/parks, walkability, **flood zone**, demographics |
| `GET /listings` | budget search via **MLS** (replaces RentCast search) |
| `GET /value` `GET /rent` | AVM value & long-term rent + range (MLS comps → HUD/Census fallback) |
| `GET /comps` | nearest sold + rental comparables |
| `GET /str` | STR projection (low/mid/high, occ, ADR, seasonality); `live_comps=true` blends Airbnb |
| `GET /forecast/rent` `GET /forecast/value` | 12–36 mo projections + bands (Zillow ZORI/ZHVI) |
| `GET /market` | momentum, trend, risk flags |
| `GET /returns` | **Monte Carlo** IRR / equity multiple (P10–P90) |
| `GET /deal-score` | value gap + explainable Buy/STR/LTR/Pass recommendation |
| `GET /admin/status` `POST /admin/retrain` | AVM ML model status / training |

## Run locally

```bash
cd service
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in API_KEY + HUD_API_TOKEN at minimum
uvicorn app.main:app --reload --port 8088
# curl -H 'x-api-key: dev-local-key' 'http://127.0.0.1:8088/forecast/rent?zip=34747'
```

Works with **no keys** for `/str`, `/forecast/*`, `/market`, `/returns`, `/deal-score`
(Zillow + models). Add a free **Census key** for `/value` baseline + demographics, the
**HUD token** for `/rent` baseline, and **MLS RESO creds** for `/listings` + comps.

## Deploy (free)

- **Render** (Docker, free tier) — `render.yaml` included; set env vars in the dashboard.
  Free instances cold-start after idle; fine for internal use. A ~$5/mo VPS is the
  reliable upgrade (always-on, runs scrapers + scheduled MLS sync).

## Getting MLS access (the big unlock)

Jason is a licensed agent — request **RESO Web API** access from his MLS or its data
vendor (likely **MLS Grid**, **Trestle/CoreLogic**, or **Bridge**). Ask for:
the API **base URL**, an **access token** (or OAuth `client_id`/`secret` + token URL),
and confirmation of the **`Property`** resource. Set those as `RESO_*` env vars and
`/listings`, `/comps`, and comp-based `/value` + `/rent` light up automatically.
Honor the vendor's caching-refresh + delete-on-termination rules.

> Estimates are modeled projections, not guarantees. Always verify STR allowance and
> comps before advising on a purchase.
