"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Waves, MapPin, Target } from "lucide-react";
import { Button, Stat, Badge } from "./ui";
import { usd, usdShort, pct } from "@/lib/format";
import type { CityConfig, Property, Project } from "@/lib/types";

async function jget(path: string): Promise<any> {
  const r = await fetch(`/api/data/${path}`);
  return r.json();
}

export function StrategyPanel({ property, city, project }: { property: Property; city: CityConfig; project: Project }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<null | {
    market: any;
    fcRent: any;
    fcValue: any;
    returns: any;
    deal: any;
    enrich: any;
    value: any;
  }>(null);

  const loc = property.zip
    ? `zip=${encodeURIComponent(property.zip)}`
    : `address=${encodeURIComponent(`${property.address} ${property.unit ?? ""} ${city.name} ${city.state}`)}`;

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const strNet = property.strAnalysis?.mid.net;
      const ltNoi = property.ltAnalysis?.noi;
      const income = strNet ?? ltNoi ?? Math.round(property.price * 0.05);
      const financed = project.financing.mode === "financed";

      const [market, fcRent, fcValue, enrich, value, returns] = await Promise.all([
        jget(`market?${loc}`),
        jget(`forecast/rent?${loc}&horizon=24`),
        jget(`forecast/value?${loc}&horizon=24`),
        jget(`enrich?${loc}`),
        jget(`value?${loc}&beds=${property.beds}&sqft=${property.sqft ?? ""}`),
        jget(
          `returns?price=${property.price}&annual_net_income=${income}&${loc}&horizon_years=5` +
            `&financed=${financed}&down_pct=${project.financing.downPaymentPct}&rate_pct=${project.financing.interestRate}`
        ),
      ]);

      if (market?.error === "data-service-unreachable" || returns?.error === "data-service-unreachable") {
        setErr(market?.message || "The rentaliq-data service isn't reachable. Start it locally or deploy it, then set DATA_API_URL.");
        setBusy(false);
        return;
      }

      const predictedValue = value?.value ?? undefined;
      const dealQS =
        `list_price=${property.price}` +
        (predictedValue ? `&predicted_value=${predictedValue}` : "") +
        (strNet !== undefined ? `&str_net=${strNet}` : "") +
        (property.ltAnalysis ? `&lt_cap_rate=${property.ltAnalysis.capRate}&lt_cash_flow=${property.ltAnalysis.cashFlowAnnual}` : "") +
        (property.daysOnMarket !== undefined ? `&days_on_market=${property.daysOnMarket}` : "") +
        (enrich?.flood?.high_risk ? `&flood_high_risk=true` : "") +
        (property.strStatus === "allowed" ? "&str_allowed=true" : property.strStatus === "banned" ? "&str_allowed=false" : "");
      const deal = await jget(`deal-score?${dealQS}`);

      setData({ market, fcRent, fcValue, returns, deal, enrich, value });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--hairline)] bg-white/[0.03]/60 p-4 text-center">
        <p className="text-sm text-[var(--fg-muted)]">
          Run our free forecasting + strategy engine (rent/value forecasts, 5-yr Monte Carlo return, deal score, market risk).
        </p>
        <div className="mt-3">
          <Button variant="primary" onClick={run} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Run forecast &amp; strategy
          </Button>
        </div>
        {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
      </div>
    );
  }

  const { market, fcRent, fcValue, returns, deal, enrich } = data;
  const irr = returns?.irr;
  const eq = returns?.equity_multiple;

  return (
    <div className="space-y-4">
      {/* Recommendation */}
      {deal && !deal.error && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08]/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <Target size={16} /> {deal.recommendation}
            </span>
            <div className="flex items-center gap-2">
              {deal.value_gap_pct != null && (
                <Badge tone={deal.value_gap_pct >= 0 ? "green" : "red"}>
                  {deal.value_gap_pct >= 0 ? "+" : ""}
                  {deal.value_gap_pct}% vs est. value
                </Badge>
              )}
              <Badge tone={deal.score >= 68 ? "green" : deal.score >= 50 ? "teal" : "red"}>Deal score {deal.score}</Badge>
            </div>
          </div>
          {deal.why?.length > 0 && <p className="mt-1 text-xs text-cyan-300">{deal.why.join(" · ")}</p>}
        </div>
      )}

      {/* Forecasts + returns */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Rent forecast"
          value={fcRent?.projected_annual_growth != null ? pct(fcRent.projected_annual_growth * 100) + "/yr" : "—"}
          sub={fcRent?.current ? `now ${usd(fcRent.current)}/mo (ZORI)` : undefined}
          tone={fcRent?.projected_annual_growth >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Value forecast"
          value={fcValue?.projected_annual_growth != null ? pct(fcValue.projected_annual_growth * 100) + "/yr" : "—"}
          sub={fcValue?.current ? `now ${usdShort(fcValue.current)} (ZHVI)` : undefined}
          tone={fcValue?.projected_annual_growth >= 0 ? "good" : "bad"}
        />
        <Stat
          label="5-yr IRR (median)"
          value={irr ? pct(irr.median * 100) : "—"}
          sub={irr ? `P10 ${pct(irr.p10 * 100)} · P90 ${pct(irr.p90 * 100)}` : undefined}
          tone={irr && irr.median >= 0.08 ? "good" : irr && irr.median < 0 ? "bad" : "default"}
        />
        <Stat
          label="5-yr equity multiple"
          value={eq ? `${(1 + eq.median).toFixed(2)}×` : "—"}
          sub={eq ? `P10 ${(1 + eq.p10).toFixed(2)}× · P90 ${(1 + eq.p90).toFixed(2)}×` : undefined}
        />
      </div>

      {/* Market */}
      {market && !market.error && (
        <div className="rounded-lg border border-[var(--hairline)] p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--fg)]">
              <TrendIcon trend={market.value?.momentum?.trend} /> {market.metro || "Market"} momentum
            </span>
            <Badge tone={market.risk_level === "elevated" ? "amber" : "slate"}>{market.risk_level} risk</Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--fg-muted)]">
            <div>
              Rent YoY:{" "}
              <b className={market.rent?.momentum?.yoy >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {market.rent?.momentum?.yoy != null ? pct(market.rent.momentum.yoy * 100) : "—"}
              </b>
            </div>
            <div>
              Value YoY:{" "}
              <b className={market.value?.momentum?.yoy >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {market.value?.momentum?.yoy != null ? pct(market.value.momentum.yoy * 100) : "—"}
              </b>
            </div>
          </div>
          {market.flags?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-[var(--fg-muted)]">
              {market.flags.map((f: string, i: number) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Location intel */}
      {enrich && !enrich.error && (
        <div className="flex flex-wrap gap-2 text-xs">
          {enrich.nearest_major_anchor && (
            <Badge tone="blue">
              <MapPin size={11} /> {enrich.nearest_major_anchor.miles} mi to {enrich.nearest_major_anchor.name}
            </Badge>
          )}
          {enrich.distance_to_beach_mi != null && <Badge tone="blue"><Waves size={11} /> {enrich.distance_to_beach_mi} mi to beach</Badge>}
          {enrich.flood && (
            <Badge tone={enrich.flood.high_risk ? "red" : "green"}>
              Flood: {enrich.flood.zone || "minimal"} {enrich.flood.high_risk ? "(high-risk)" : ""}
            </Badge>
          )}
        </div>
      )}

      <p className="text-[11px] text-[var(--fg-faint)]">
        Forecasts from Zillow ZORI/ZHVI; returns are a 5-yr Monte Carlo (P10–P90) using this market's own trend. Modeled
        projections, not guarantees.
      </p>
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : null} Refresh
      </Button>
    </div>
  );
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === "rising") return <TrendingUp size={15} className="text-emerald-400" />;
  if (trend === "falling") return <TrendingDown size={15} className="text-rose-400" />;
  return <Minus size={15} className="text-[var(--fg-faint)]" />;
}
