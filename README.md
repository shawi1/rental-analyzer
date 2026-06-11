# RentalIQ — Rental Property Investment Analyzer

A reusable web app for analyzing rental investment properties — both **short-term**
(Airbnb / VRBO) and **long-term** (traditional buy-and-hold). Built to evaluate
saved Zillow listings, compare multiple properties side-by-side, and find new
properties within a budget.

Originally built around hand-researched Destin, FL and Kissimmee, FL market data,
and designed to extend to any city.

---

## What it does

- **Projects** — group a set of properties in one market for a client or research goal.
- **STR analysis** — per-bedroom revenue benchmarks, location-tier adjustment, and
  Conservative / Realistic / Optimistic scenarios with full expense breakdowns and
  seasonality.
- **Long-term analysis** — rent estimate → NOI → cap rate → cash flow and
  cash-on-cash, for all-cash or financed purchases (editable financing assumptions).
- **STR verification** — the most important check. Mark status manually or let the
  AI research MLS records, HOA rules, and active Airbnb listings for the address.
- **Three ways to add properties**
  1. **Manual** entry form.
  2. **Smart paste** — paste a listing's text (or fetch a public URL) and AI extracts
     the fields.
  3. **Budget search** — find active for-sale listings in a city within your price
     range via RentCast.
- **Dashboard** — sortable comparison table, market data, guest demographics, revenue
  comparison charts, and ranked recommendations.
- **Reports** — printable / save-as-PDF report with an Internal vs Client-facing toggle.

## Honest notes on data sources

- **Zillow has no public API.** Saved Zillow *lists* are private to your account and
  can't be fetched by a server. Use **Smart paste** (paste the listing text) — it's
  free and reliable. The built-in scraper can fetch *public* listing pages on a
  best-effort basis, but Zillow frequently blocks automated requests.
- **Airbnb / VRBO have no public APIs.** STR market data here is hand-researched
  per city; the AI uses live web search to verify STR allowance.
- **RentCast** (free tier: 50 requests/month) powers budget-based listing search and
  value/rent estimates — this is what enables "find properties yourself."

All revenue/return figures are **modeled projections**, not guarantees. Always verify
STR allowance in the HOA governing documents and MLS before making an offer.

---

## Getting started (local)

```bash
npm install
npm run dev
# open http://localhost:3000
```

Click **Load Destin demo** on the home page to see a finished analysis immediately —
no keys required. The revenue and cap-rate models run entirely locally.

## API keys (optional)

The app works without keys (manual entry + all math/charts/reports). Keys unlock the
AI and listing-search features. Add them either in the in-app **Settings** page
(stored in your browser) or as environment variables (see `.env.example`):

| Key | Powers | Where to get it |
|-----|--------|-----------------|
| `ANTHROPIC_API_KEY` | AI STR verification, smart paste, report text | console.anthropic.com (billing required) |
| `RENTCAST_API_KEY` | Budget listing search, value/rent estimates | app.rentcast.io (free tier, 50/mo) |
| `HUD_API_TOKEN` | Free **unlimited** long-term rent baseline (Fair Market Rents) | huduser.gov (free) |

> **Budget search sources:** RentCast (reliable, 50/mo) is the default. A free
> **Redfin** option exists too, but Redfin blocks automated requests from
> servers, so it's experimental and usually only works running locally.
> **Long-term rent** can be pulled free + unlimited from **HUD**, or per-property
> from RentCast.

## Deploying free (Vercel)

1. Push this repo to GitHub (already set up if you used `gh`).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. (Optional) add `ANTHROPIC_API_KEY`, `RENTCAST_API_KEY`, and `SITE_PASSWORD`
   under **Environment Variables**.
4. Deploy. Vercel's free Hobby tier is enough for personal use.

### Keeping it private

Set a `SITE_PASSWORD` env var and the whole site requires that password (HTTP Basic
auth, any username). Leave it unset for an open site. Your dad and you just share the
one password.

---

## Architecture

```
src/
  app/
    page.tsx                  Home — project list + demo loader
    settings/page.tsx         API keys + data backup
    project/[id]/page.tsx     Project dashboard
    project/[id]/report/      Printable report
    api/
      research-str/           Claude web-search STR verification
      extract-listing/        Claude listing-text → structured fields
      scrape/                 Best-effort public URL fetch
      rentcast/listings/      Budget-based for-sale search
      rentcast/value/         AVM value + rent estimate
  lib/
    types.ts                  Domain types
    cities.ts                 Market configs (Destin, Kissimmee, generic template)
    str-model.ts              STR revenue model
    lt-model.ts               Long-term cap-rate / cash-flow model
    scoring.ts                Composite score + auto pros/cons
    compute.ts                Ties models + scoring together
    storage.ts                localStorage persistence + export/import
    keys.ts / hooks.ts        Client key storage + reactive storage hooks
  components/                 UI, charts, tabs, modals
  middleware.ts               Optional password gate
```

Data is stored in the browser (localStorage). Use **Settings → Export** to back up or
move projects between devices. The storage layer is abstracted so a shared database
(e.g. Supabase) can be added later for real-time multi-device sync.

## Adding a new city

Seeded cities live in `src/lib/cities.ts`. New markets created in the app start from
the generic template (rough placeholders) — refine the bedroom benchmarks, location
tiers, and seasonal curve with local AirDNA / Chalet data for accurate projections.
