"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Eye, Lock, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Button } from "./ui";
import { getProject } from "@/lib/storage";
import { useCities } from "@/lib/hooks";
import { tierFor } from "@/lib/cities";
import { usd, usdShort, pct, bedsLabel } from "@/lib/format";
import type { Project, CityConfig, Property } from "@/lib/types";

export function ReportView({ id }: { id: string }) {
  const cities = useCities();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [mode, setMode] = useState<"internal" | "client">("internal");

  useEffect(() => setProject(getProject(id)), [id]);
  const city = cities.find((c) => c.key === project?.cityKey);

  if (project === undefined) return <div className="py-20 text-center text-sm text-slate-400">Loading…</div>;
  if (!project || !city) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Project not found. <Link href="/" className="text-teal-700 hover:underline">Back</Link>
      </div>
    );
  }

  const props = [...project.properties].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const showStr = project.strategy !== "ltr";
  const showLt = project.strategy !== "str";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Toolbar (screen only) */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/project/${project.id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft size={13} /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setMode("internal")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${mode === "internal" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
            >
              <Lock size={12} /> Internal
            </button>
            <button
              onClick={() => setMode("client")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${mode === "client" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
            >
              <Eye size={12} /> Client-facing
            </button>
          </div>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Report body */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-800 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="border-b-2 border-teal-700 pb-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Rental Investment Analysis</h1>
            <span className="text-sm text-slate-400">RentalIQ</span>
          </div>
          <p className="mt-1 text-lg text-slate-700">{city.name}, {city.state}</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Prepared: {today}</span>
            {mode === "client" && project.clientName && <span>For: {project.clientName}</span>}
            <span>Strategy: {project.strategy === "both" ? "Short-term + Long-term" : project.strategy === "str" ? "Short-term rental" : "Long-term rental"}</span>
            <span>{props.length} properties analyzed</span>
          </div>
        </header>

        {/* Executive summary / STR matrix */}
        <Section title="Executive Summary">
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            This report evaluates {props.length} {props.length === 1 ? "property" : "properties"} in the {city.name} market
            {showStr ? ", including short-term rental (Airbnb/VRBO) revenue projections and STR-allowance verification" : ""}
            {showLt ? `${showStr ? " and" : " including"} long-term rental returns (cap rate and cash-on-cash)` : ""}.
            {showStr ? " STR status is the single most important factor — a complex that bans short-term rentals is disqualifying for that thesis." : ""}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1.5">Property</th>
                <th className="py-1.5">Price</th>
                <th className="py-1.5">Beds</th>
                {showStr && <th className="py-1.5">STR status</th>}
                {showStr && <th className="py-1.5 text-right">STR gross/yr</th>}
                {showLt && <th className="py-1.5 text-right">Cap rate</th>}
                {mode === "internal" && <th className="py-1.5 text-right">Score</th>}
              </tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-1.5 font-medium">{p.address} {p.unit}</td>
                  <td className="py-1.5">{usd(p.price)}</td>
                  <td className="py-1.5">{bedsLabel(p.beds, p.baths)}</td>
                  {showStr && <td className="py-1.5"><StrText status={p.strStatus} /></td>}
                  {showStr && <td className="py-1.5 text-right tnum">{p.strAnalysis ? usdShort(p.strAnalysis.mid.gross) : "—"}</td>}
                  {showLt && <td className="py-1.5 text-right tnum">{p.ltAnalysis ? pct(p.ltAnalysis.capRate) : "—"}</td>}
                  {mode === "internal" && <td className="py-1.5 text-right tnum font-semibold">{p.rating ?? 0}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Market data */}
        <Section title={`${city.name} Market Data (2025)`}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Fact label="Avg stay" value={`${city.avgStay} nights`} />
            <Fact label="Avg group" value={`${city.avgGroup} guests`} />
            <Fact label="Booking lead" value={`${city.bookingLead} days`} />
            <Fact label="Tourist tax" value={pct(city.touristTaxRate, 0)} />
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1.5">Bedroom</th>
                <th className="py-1.5 text-right">Avg gross/yr</th>
                <th className="py-1.5 text-right">Occupancy</th>
                <th className="py-1.5 text-right">ADR</th>
              </tr>
            </thead>
            <tbody>
              {city.benchmarks.map((b) => (
                <tr key={b.beds} className="border-b border-slate-100">
                  <td className="py-1.5">{b.beds === 0 ? "Studio" : `${b.beds} bedroom`}</td>
                  <td className="py-1.5 text-right tnum">{usd(b.grossYr)}</td>
                  <td className="py-1.5 text-right tnum">{b.occ}%</td>
                  <td className="py-1.5 text-right tnum">{usd(b.adr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-slate-500"><b>STR regulation:</b> {city.strRegulation}</p>
        </Section>

        {/* Per-property deep dives */}
        <Section title="Property Detail">
          <div className="space-y-4">
            {props.map((p, i) => (
              <PropertyReport key={p.id} p={p} city={city} index={i + 1} mode={mode} showStr={showStr} showLt={showLt} />
            ))}
          </div>
        </Section>

        {/* Recommendations */}
        <Section title="Ranked Recommendations">
          <ol className="space-y-2 text-sm">
            {props.slice(0, 5).map((p, i) => (
              <li key={p.id} className="flex gap-2">
                <span className="font-bold text-teal-700">{i + 1}.</span>
                <span>
                  <b>{p.address} {p.unit}</b> — {usd(p.price)}, {bedsLabel(p.beds, p.baths)}
                  {p.strAnalysis ? `. STR ~${usdShort(p.strAnalysis.mid.gross)}/yr gross` : ""}
                  {p.ltAnalysis ? `, ${pct(p.ltAnalysis.capRate)} cap rate` : ""}
                  {p.strStatus === "banned" ? " — ⚠ STR banned" : p.strStatus === "unknown" ? " — verify STR status" : ""}.
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <footer className="mt-6 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-400">
          Revenue and return figures are modeled projections based on 2025 market data and stated assumptions — not guarantees.
          Always verify STR allowance in the HOA governing documents and MLS before making an offer, and confirm HOA fees,
          insurance, and special-assessment status (especially for older Florida condo buildings) during due diligence.
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 print-break">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-teal-700">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function StrText({ status }: { status: Property["strStatus"] }) {
  if (status === "allowed") return <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={13} /> Allowed</span>;
  if (status === "banned") return <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={13} /> Banned</span>;
  return <span className="inline-flex items-center gap-1 text-amber-600"><HelpCircle size={13} /> Verify</span>;
}

function PropertyReport({
  p, city, index, mode, showStr, showLt,
}: {
  p: Property;
  city: CityConfig;
  index: number;
  mode: "internal" | "client";
  showStr: boolean;
  showLt: boolean;
}) {
  const tier = tierFor(city, p.tier);
  const str = p.strAnalysis;
  const lt = p.ltAnalysis;
  return (
    <div className="rounded-lg border border-slate-200 p-4 print-break">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-slate-900">{index}. {p.address} {p.unit}</h3>
        <span className="text-sm text-slate-500">{usd(p.price)}</span>
      </div>
      <p className="text-xs text-slate-500">
        {bedsLabel(p.beds, p.baths)}{p.sqft ? ` · ${p.sqft.toLocaleString()} sqft` : ""} · {tier.label}
        {p.complex ? ` · ${p.complex}` : ""}{p.daysOnMarket !== undefined ? ` · ${p.daysOnMarket} days on market` : ""}
      </p>

      {showStr && str && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-600">Short-term rental (Conservative / Realistic / Optimistic)</p>
          <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
            <ScenarioCol label="Conservative" gross={str.low.gross} net={str.low.net} />
            <ScenarioCol label="Realistic" gross={str.mid.gross} net={str.mid.net} highlight />
            <ScenarioCol label="Optimistic" gross={str.high.gross} net={str.high.net} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {str.mid.nights} nights @ {usd(str.mid.adr)} ADR, {pct(str.mid.occ)} occupancy. STR status:{" "}
            <StrText status={p.strStatus} />{p.strNote ? ` — ${p.strNote}` : ""}
          </p>
        </div>
      )}

      {showLt && lt && (
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Fact label="Market rent/mo" value={usd(lt.monthlyRent)} />
          <Fact label="Cap rate" value={pct(lt.capRate)} />
          <Fact label="Cash flow/yr" value={usd(lt.cashFlowAnnual)} />
          <Fact label="Cash-on-cash" value={pct(lt.cashOnCash)} />
        </div>
      )}

      {(p.pros?.length || p.cons?.length) && (
        <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold text-emerald-700">Pros</p>
            <ul className="mt-0.5 space-y-0.5 text-slate-600">{(p.pros ?? []).map((x, i) => <li key={i}>+ {x}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-red-600">Cons / risks</p>
            <ul className="mt-0.5 space-y-0.5 text-slate-600">{(p.cons ?? []).map((x, i) => <li key={i}>– {x}</li>)}</ul>
          </div>
        </div>
      )}

      {mode === "internal" && p.notes && <p className="mt-2 text-xs italic text-slate-500">Note: {p.notes}</p>}
    </div>
  );
}

function ScenarioCol({ label, gross, net, highlight }: { label: string; gross: number; net: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "border-teal-300 bg-teal-50/50" : "border-slate-200"}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800">{usdShort(gross)}</div>
      <div className="text-[11px] text-slate-500">net {usdShort(net)}</div>
    </div>
  );
}
