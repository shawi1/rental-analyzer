"use client";

import { useState } from "react";
import { Sparkles, Loader2, Trash2, ExternalLink, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Button, Modal, Badge, Stat, Select, Textarea, Field } from "./ui";
import { SeasonalChart } from "./charts";
import { StrategyPanel } from "./StrategyPanel";
import { keyHeaders } from "@/lib/keys";
import { usd, pct, num, bedsLabel, MONTHS } from "@/lib/format";
import { tierFor } from "@/lib/cities";
import type { CityConfig, Property, Project, ScenarioKey, StrResearchResult } from "@/lib/types";

const SCEN_LABEL: Record<ScenarioKey, string> = { low: "Conservative", mid: "Realistic", high: "Optimistic" };

export function PropertyDetail({
  open,
  onClose,
  property,
  city,
  project,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  property: Property;
  city: CityConfig;
  project: Project;
  onUpdate: (p: Property) => void;
  onDelete: () => void;
}) {
  const [scen, setScen] = useState<ScenarioKey>("mid");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [rentBusy, setRentBusy] = useState<"" | "hud" | "rentcast">("");
  const [rentMsg, setRentMsg] = useState("");

  const tier = tierFor(city, property.tier);
  const str = property.strAnalysis;
  const lt = property.ltAnalysis;
  const s = str?.[scen];

  async function verifyStr() {
    setVerifying(true);
    setVerifyMsg("");
    try {
      const res = await fetch("/api/research-str", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({
          address: `${property.address}${property.unit ? " " + property.unit : ""}`,
          city: `${city.name}, ${city.state}`,
          complex: property.complex,
        }),
      });
      const data = (await res.json()) as StrResearchResult & { error?: string; message?: string };
      if (data.error) {
        setVerifyMsg(data.message || "Verification failed — check your Anthropic key in Settings.");
        return;
      }
      onUpdate({
        ...property,
        strStatus: data.strAllowed === true ? "allowed" : data.strAllowed === false ? "banned" : "unknown",
        strConfidence: data.confidence,
        strNote: data.notes,
        strSources: data.sources,
      });
      setVerifyMsg("Updated from AI research.");
    } catch {
      setVerifyMsg("Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function fetchHudRent() {
    let zip = property.zip || property.address.match(/\b(\d{5})\b/)?.[1] || "";
    if (!zip) {
      const e = window.prompt("ZIP code for the HUD rent lookup?");
      if (!e) return;
      zip = e.trim();
    }
    setRentBusy("hud");
    setRentMsg("");
    try {
      const res = await fetch("/api/hud/fmr", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ zip, beds: property.beds }),
      });
      const data = await res.json();
      if (data.error) {
        setRentMsg(data.message || "HUD lookup failed.");
        return;
      }
      if (data.rent) {
        onUpdate({ ...property, zip, rentOverride: Math.round(data.rent), rentEstimateSource: `HUD FMR ${data.year ?? ""}`.trim() });
        setRentMsg(`HUD FMR: $${Math.round(data.rent).toLocaleString()}/mo (${data.areaName ?? zip})`);
      } else setRentMsg("HUD returned no rent for that ZIP / bedroom count.");
    } catch {
      setRentMsg("HUD lookup failed.");
    } finally {
      setRentBusy("");
    }
  }

  async function fetchRentcastRent() {
    setRentBusy("rentcast");
    setRentMsg("");
    const rcType: Record<string, string> = {
      condo: "Condo",
      townhome: "Townhouse",
      "single-family": "Single Family",
      "multi-family": "Multi-Family",
    };
    try {
      const addr = `${property.address}${property.unit ? " " + property.unit : ""}${property.zip ? ", " + property.zip : ""}`;
      const res = await fetch("/api/rentcast/value", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({
          address: addr,
          propertyType: rcType[property.propertyType],
          bedrooms: property.beds,
          bathrooms: property.baths,
          squareFootage: property.sqft,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setRentMsg(data.message || "RentCast lookup failed.");
        return;
      }
      if (data.rent) {
        onUpdate({ ...property, rentOverride: Math.round(data.rent), rentEstimateSource: "RentCast AVM" });
        setRentMsg(`RentCast: $${Math.round(data.rent).toLocaleString()}/mo${data.value ? ` · est. value ~$${Number(data.value).toLocaleString()}` : ""}`);
      } else setRentMsg("RentCast returned no rent estimate for this address.");
    } catch {
      setRentMsg("RentCast lookup failed.");
    } finally {
      setRentBusy("");
    }
  }

  const seasonalData = (str?.monthlyGrossMid ?? []).map((g, i) => ({ month: MONTHS[i], gross: g }));

  return (
    <Modal open={open} onClose={onClose} wide title={
      <span className="flex items-center gap-2">
        {property.address}
        {property.unit && <span className="text-slate-400">{property.unit}</span>}
      </span>
    }>
      <div className="space-y-5">
        {/* Header summary */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">{usd(property.price)}</Badge>
          <Badge tone="slate">{bedsLabel(property.beds, property.baths)}</Badge>
          {property.sqft ? <Badge tone="slate">{num(property.sqft)} sqft</Badge> : null}
          {property.complex && <Badge tone="slate">{property.complex}</Badge>}
          <Badge tone="blue">{tier.label}</Badge>
          {property.daysOnMarket !== undefined && (
            <Badge tone={property.daysOnMarket >= 70 ? "amber" : "slate"}>{property.daysOnMarket} DOM</Badge>
          )}
          {property.rating !== undefined && (
            <Badge tone={property.rating >= 68 ? "green" : property.rating >= 50 ? "teal" : "red"}>Score {property.rating}/100</Badge>
          )}
          {property.zillowUrl && (
            <a href={property.zillowUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline">
              Listing <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* STR verification */}
        <section className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StrIcon status={property.strStatus} />
              <span className="text-sm font-medium text-slate-800">
                STR status:{" "}
                {property.strStatus === "allowed" ? "Allowed" : property.strStatus === "banned" ? "Banned" : "Unverified"}
                {property.strConfidence && <span className="text-slate-400"> · {property.strConfidence} confidence</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={property.strStatus}
                onChange={(e) => onUpdate({ ...property, strStatus: e.target.value as Property["strStatus"] })}
                className="!w-auto !py-1 text-xs"
              >
                <option value="unknown">Unknown</option>
                <option value="allowed">Allowed</option>
                <option value="banned">Banned</option>
              </Select>
              <Button size="sm" variant="primary" onClick={verifyStr} disabled={verifying}>
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Verify with AI
              </Button>
            </div>
          </div>
          {property.strNote && <p className="mt-2 text-xs text-slate-600">{property.strNote}</p>}
          {property.strSources && property.strSources.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-400">Sources: {property.strSources.join(" · ")}</p>
          )}
          {verifyMsg && <p className="mt-1 text-[11px] text-teal-600">{verifyMsg}</p>}
        </section>

        {/* STR projections */}
        {project.strategy !== "ltr" && str && s && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Short-term rental projection</h3>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
                {(["low", "mid", "high"] as ScenarioKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setScen(k)}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${scen === k ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
                  >
                    {SCEN_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Gross / yr" value={usd(s.gross)} tone="good" />
              <Stat label="Net / yr" value={usd(s.net)} tone={s.net > 0 ? "good" : "bad"} sub="after expenses" />
              <Stat label="Occupancy" value={pct(s.occ)} />
              <Stat label="ADR" value={usd(s.adr)} sub={`${s.nights} nights`} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Seasonal gross (realistic)</p>
                <SeasonalChart data={seasonalData} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Annual expense breakdown</p>
                <table className="w-full text-xs">
                  <tbody>
                    {str.expenses.map((e) => (
                      <tr key={e.label} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 text-slate-600">
                          {e.label}
                          {e.note && <span className="text-slate-400"> · {e.note}</span>}
                        </td>
                        <td className="py-1 text-right tnum text-slate-800">{usd(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="pt-1.5 text-slate-700">Total expenses</td>
                      <td className="pt-1.5 text-right tnum text-slate-900">
                        {usd(str.expenses.reduce((a, b) => a + b.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{str.methodology}</p>
          </section>
        )}

        {/* Long-term */}
        {project.strategy !== "str" && lt && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Long-term rental {lt.financed ? "(financed)" : "(all-cash)"}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Market rent / mo" value={usd(lt.monthlyRent)} />
              <Stat label="Cap rate" value={pct(lt.capRate)} tone={lt.capRate >= 6 ? "good" : lt.capRate < 4 ? "bad" : "default"} />
              <Stat label="Cash flow / yr" value={usd(lt.cashFlowAnnual)} tone={lt.cashFlowAnnual >= 0 ? "good" : "bad"} />
              <Stat label="Cash-on-cash" value={pct(lt.cashOnCash)} tone={lt.cashOnCash >= 6 ? "good" : lt.cashOnCash < 0 ? "bad" : "default"} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
              <div>NOI: <span className="font-medium text-slate-700">{usd(lt.noi)}</span></div>
              <div>Gross yield: <span className="font-medium text-slate-700">{pct(lt.grossYield)}</span></div>
              {lt.financed && <div>Mortgage/mo: <span className="font-medium text-slate-700">{usd(lt.monthlyMortgage)}</span></div>}
              {lt.financed && <div>DSCR: <span className="font-medium text-slate-700">{lt.dscr === Infinity ? "∞" : lt.dscr}</span></div>}
              <div>Cash invested: <span className="font-medium text-slate-700">{usd(lt.cashInvested)}</span></div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{lt.methodology}</p>
          </section>
        )}

        {/* Pros / cons */}
        {(property.pros?.length || property.cons?.length) && (
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-emerald-700">Pros</p>
              <ul className="space-y-1 text-xs text-slate-700">
                {(property.pros ?? []).map((p, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-emerald-500">+</span>
                    {p}
                  </li>
                ))}
                {!property.pros?.length && <li className="text-slate-400">—</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-red-700">Cons / risks</p>
              <ul className="space-y-1 text-xs text-slate-700">
                {(property.cons ?? []).map((c, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-red-400">–</span>
                    {c}
                  </li>
                ))}
                {!property.cons?.length && <li className="text-slate-400">—</li>}
              </ul>
            </div>
          </section>
        )}

        {/* Forecast & strategy (our owned data+ML service) */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Forecast &amp; Strategy <span className="font-normal text-slate-400">· free, owned data</span></h3>
          <StrategyPanel property={property} city={city} project={project} />
        </section>

        {/* Rent override + notes */}
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Long-term monthly rent" hint="Used for the long-term analysis. Pull a free HUD baseline or a RentCast estimate, or type your own.">
            <input
              type="number"
              key={property.rentOverride ?? "blank"}
              defaultValue={property.rentOverride ?? ""}
              onBlur={(e) =>
                onUpdate({ ...property, rentOverride: e.target.value ? Number(e.target.value) : undefined, rentEstimateSource: e.target.value ? "manual" : undefined })
              }
              placeholder="e.g. 2200"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Button size="sm" onClick={fetchHudRent} disabled={rentBusy !== ""}>
                {rentBusy === "hud" ? <Loader2 size={13} className="animate-spin" /> : null} HUD (free)
              </Button>
              <Button size="sm" onClick={fetchRentcastRent} disabled={rentBusy !== ""}>
                {rentBusy === "rentcast" ? <Loader2 size={13} className="animate-spin" /> : null} RentCast
              </Button>
              {property.rentEstimateSource && <span className="text-[11px] text-slate-400">source: {property.rentEstimateSource}</span>}
            </div>
            {rentMsg && <span className="mt-1 block text-[11px] text-teal-600">{rentMsg}</span>}
          </Field>
          <Field label="Notes">
            <Textarea
              rows={2}
              defaultValue={property.notes ?? ""}
              onBlur={(e) => onUpdate({ ...property, notes: e.target.value || undefined })}
              placeholder="Private notes about this property…"
            />
          </Field>
        </section>

        <div className="flex justify-between border-t border-slate-100 pt-3">
          <Button variant="danger" onClick={() => { if (confirm("Remove this property?")) { onDelete(); onClose(); } }}>
            <Trash2 size={15} /> Remove
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StrIcon({ status }: { status: Property["strStatus"] }) {
  if (status === "allowed") return <CheckCircle2 size={18} className="text-emerald-600" />;
  if (status === "banned") return <XCircle size={18} className="text-red-500" />;
  return <HelpCircle size={18} className="text-amber-500" />;
}
