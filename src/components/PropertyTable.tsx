"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";
import { usd, usdShort, pct, bedsLabel } from "@/lib/format";
import { tierFor } from "@/lib/cities";
import type { CityConfig, Property, Project } from "@/lib/types";

type SortKey = "score" | "price" | "strGross" | "strNet" | "capRate" | "cashFlow";

export function PropertyTable({
  properties,
  city,
  project,
  onOpen,
}: {
  properties: Property[];
  city: CityConfig;
  project: Project;
  onOpen: (p: Property) => void;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const [dir, setDir] = useState<1 | -1>(-1);
  const showStr = project.strategy !== "ltr";
  const showLt = project.strategy !== "str";

  function val(p: Property, k: SortKey): number {
    switch (k) {
      case "price": return p.price;
      case "strGross": return p.strAnalysis?.mid.gross ?? 0;
      case "strNet": return p.strAnalysis?.mid.net ?? 0;
      case "capRate": return p.ltAnalysis?.capRate ?? 0;
      case "cashFlow": return p.ltAnalysis?.cashFlowAnnual ?? 0;
      default: return p.rating ?? 0;
    }
  }
  const sorted = [...properties].sort((a, b) => (val(a, sort) - val(b, sort)) * dir);

  function header(k: SortKey, label: string, cls = "") {
    return (
      <th
        className={`cursor-pointer select-none px-3 py-2 text-right font-medium hover:text-[var(--fg)] ${cls}`}
        onClick={() => {
          if (sort === k) setDir((d) => (d === 1 ? -1 : 1));
          else { setSort(k); setDir(-1); }
        }}
      >
        <span className="inline-flex items-center gap-0.5">
          {label}
          {sort === k && (dir === -1 ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto scroll-thin rounded-xl border border-[var(--hairline)] bg-[var(--surface)]">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-[var(--hairline)] bg-white/[0.03] text-xs text-[var(--fg-muted)]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Property</th>
            <th className="px-3 py-2 text-center font-medium">STR</th>
            {header("price", "Price")}
            {showStr && header("strGross", "STR gross")}
            {showStr && header("strNet", "STR net")}
            {showLt && header("capRate", "Cap rate")}
            {showLt && header("cashFlow", "LT cash flow")}
            {header("score", "Score")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const tier = tierFor(city, p.tier);
            const str = p.strAnalysis?.mid;
            const lt = p.ltAnalysis;
            return (
              <tr
                key={p.id}
                onClick={() => onOpen(p)}
                className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-white/[0.04]"
              >
                <td className="px-3 py-2.5">
                  <div className="font-medium text-[var(--fg)]">
                    {p.address} {p.unit && <span className="text-[var(--fg-faint)]">{p.unit}</span>}
                  </div>
                  <div className="text-xs text-[var(--fg-muted)]">
                    {bedsLabel(p.beds, p.baths)} · {tier.label}
                    {p.daysOnMarket !== undefined ? ` · ${p.daysOnMarket} DOM` : ""}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <StrDot status={p.strStatus} />
                </td>
                <td className="px-3 py-2.5 text-right tnum text-[var(--fg)]">{usd(p.price)}</td>
                {showStr && <td className="px-3 py-2.5 text-right tnum text-[var(--fg)]">{str ? usdShort(str.gross) : "—"}</td>}
                {showStr && (
                  <td className={`px-3 py-2.5 text-right tnum ${str && str.net < 0 ? "text-rose-400" : "text-[var(--fg)]"}`}>
                    {str ? usdShort(str.net) : "—"}
                  </td>
                )}
                {showLt && (
                  <td className={`px-3 py-2.5 text-right tnum ${lt && lt.capRate < 4 ? "text-amber-400" : "text-[var(--fg)]"}`}>
                    {lt ? pct(lt.capRate) : "—"}
                  </td>
                )}
                {showLt && (
                  <td className={`px-3 py-2.5 text-right tnum ${lt && lt.cashFlowAnnual < 0 ? "text-rose-400" : "text-[var(--fg)]"}`}>
                    {lt ? usdShort(lt.cashFlowAnnual) : "—"}
                  </td>
                )}
                <td className="px-3 py-2.5 text-right">
                  <ScorePill score={p.rating ?? 0} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StrDot({ status }: { status: Property["strStatus"] }) {
  if (status === "allowed") return <CheckCircle2 size={16} className="mx-auto text-emerald-400" />;
  if (status === "banned") return <XCircle size={16} className="mx-auto text-rose-400" />;
  return <HelpCircle size={16} className="mx-auto text-amber-500" />;
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 68 ? "bg-emerald-500/[0.08]0/15 text-emerald-300" : score >= 50 ? "bg-cyan-500/15 text-cyan-300" : "bg-rose-500/15 text-rose-300";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold tnum ${tone}`}>{score}</span>;
}
