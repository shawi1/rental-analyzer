"use client";

import { ExternalLink, TrendingUp, Users, Calendar, FileText, Award } from "lucide-react";
import { Card, Stat, Badge } from "./ui";
import { BenchmarkChart, SeasonalChart, GuestPie, RevenueCompareChart, StrVsLtChart } from "./charts";
import { usd, usdShort, pct, num, bedsLabel, MONTHS } from "@/lib/format";
import type { CityConfig, Property, Project } from "@/lib/types";

// ---- Market tab ------------------------------------------------------------

export function MarketTab({ city }: { city: CityConfig }) {
  const benchData = city.benchmarks.map((b) => ({
    beds: b.beds === 0 ? "Studio" : `${b.beds} bd`,
    gross: b.grossYr,
    adr: b.adr,
  }));
  const seasonData = city.seasonalCurve.map((m, i) => ({ month: MONTHS[i], gross: Math.round(m * 100) }));

  return (
    <div className="space-y-4">
      {!city.seeded && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is a generic market template. Benchmarks are rough placeholders — refine them with local AirDNA/Chalet data.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <TrendingUp size={16} className="text-teal-700" /> STR revenue by bedroom (market avg)
          </div>
          <BenchmarkChart data={benchData} />
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
            {city.benchmarks.map((b) => (
              <div key={b.beds}>
                {b.beds === 0 ? "Studio" : `${b.beds}bd`}: <span className="font-medium text-slate-700">{usdShort(b.grossYr)}</span> ·{" "}
                {b.occ}% · {usd(b.adr)}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Calendar size={16} className="text-teal-700" /> Seasonality (relative to avg month)
          </div>
          <SeasonalChart data={seasonData.map((d) => ({ month: d.month, gross: d.gross }))} />
          <p className="mt-1 text-[11px] text-slate-400">
            Index where 100 = an average month. Peaks reflect {city.marketType === "beach" ? "summer beach demand" : city.marketType === "theme-park" ? "holiday & summer park demand" : "local seasonality"}.
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Avg stay" value={`${city.avgStay} nts`} />
          <Stat label="Avg group" value={`${city.avgGroup} ppl`} />
          <Stat label="Booking lead" value={`${city.bookingLead} days`} />
          <Stat label="Tourist tax" value={pct(city.touristTaxRate, 0)} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">STR regulation</p>
            <p className="text-slate-700">{city.strRegulation}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Market notes</p>
            <p className="text-slate-700">{city.notes}</p>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <FileText size={13} /> Research sources
          </p>
          <div className="flex flex-wrap gap-2">
            {city.topSources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
              >
                {s.label} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">Location tiers &amp; revenue adjustment</p>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-1.5 text-left font-medium">Tier</th>
                <th className="px-2 py-1.5 text-right font-medium">Revenue ×</th>
                <th className="px-2 py-1.5 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {city.tiers.map((t) => (
                <tr key={t.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 font-medium text-slate-700">{t.label}</td>
                  <td className="px-2 py-1.5 text-right tnum text-slate-600">
                    {t.adjLow}–{t.adjHigh}
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---- Guests tab ------------------------------------------------------------

export function GuestsTab({ city }: { city: CityConfig }) {
  const pieData = city.guestSegments.map((g) => ({ name: g.name, share: g.share, color: g.color }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users size={16} className="text-teal-700" /> Guest mix
        </div>
        <GuestPie data={pieData} />
      </Card>
      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">Segment behavior</p>
        <div className="space-y-2">
          {city.guestSegments.map((g) => (
            <div key={g.name} className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  {g.name}
                </span>
                <Badge tone="slate">{g.share}%</Badge>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[11px] text-slate-500">
                <span>Stay: {g.stay}</span>
                <span>Group: {g.group}</span>
                <span>{g.season}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Avg stay <b>{city.avgStay} nights</b> · avg group <b>{city.avgGroup}</b> · booking lead <b>{city.bookingLead} days</b>.
        </p>
      </Card>
    </div>
  );
}

// ---- Compare tab -----------------------------------------------------------

export function CompareTab({
  properties,
  project,
  onOpen,
}: {
  properties: Property[];
  project: Project;
  onOpen: (p: Property) => void;
}) {
  const eligible = properties.filter((p) => p.strStatus !== "banned");
  const revData = eligible
    .filter((p) => p.strAnalysis)
    .map((p) => ({
      name: shortName(p),
      low: p.strAnalysis!.low.gross,
      mid: p.strAnalysis!.mid.gross,
      high: p.strAnalysis!.high.gross,
    }));
  const vsData = eligible
    .filter((p) => p.strAnalysis && p.ltAnalysis)
    .map((p) => ({
      name: shortName(p),
      strNet: p.strAnalysis!.mid.net,
      ltNet: p.ltAnalysis!.cashFlowAnnual,
    }));

  const ranked = [...properties].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  return (
    <div className="space-y-4">
      {project.strategy !== "ltr" && revData.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">STR gross revenue range (excl. STR-banned)</p>
          <RevenueCompareChart data={revData} />
        </Card>
      )}

      {project.strategy === "both" && vsData.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">STR net vs long-term cash flow</p>
          <StrVsLtChart data={vsData} />
          <p className="mt-1 text-[11px] text-slate-400">
            STR net = mid-scenario gross minus operating expenses. Long-term = annual cash flow after debt service.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Award size={16} className="text-teal-700" /> Ranked recommendations
        </div>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">
                  {p.address} {p.unit}
                </div>
                <div className="text-xs text-slate-500">
                  {usd(p.price)} · {bedsLabel(p.beds, p.baths)}
                  {p.strAnalysis ? ` · STR ${usdShort(p.strAnalysis.mid.gross)}/yr` : ""}
                  {p.ltAnalysis ? ` · ${pct(p.ltAnalysis.capRate)} cap` : ""}
                </div>
              </div>
              {p.strStatus === "banned" ? (
                <Badge tone="red">STR banned</Badge>
              ) : p.strStatus === "unknown" ? (
                <Badge tone="amber">Verify STR</Badge>
              ) : (
                <Badge tone="green">STR ok</Badge>
              )}
              <span className="text-sm font-bold tnum text-slate-700">{p.rating ?? 0}</span>
            </button>
          ))}
          {ranked.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Add properties to see rankings.</p>}
        </div>
      </Card>
    </div>
  );
}

function shortName(p: Property): string {
  const base = p.complex || p.address;
  return (base.length > 18 ? base.slice(0, 17) + "…" : base) + (p.unit ? ` ${p.unit}` : "");
}
