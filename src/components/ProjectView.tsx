"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Settings2, Printer, LayoutGrid, TrendingUp, Users, BarChart3, MapPin, AlertTriangle,
} from "lucide-react";
import { Button, Stat, Tabs, Badge, EmptyState, Modal, Field, Input, Select } from "./ui";
import { PropertyTable } from "./PropertyTable";
import { PropertyDetail } from "./PropertyDetail";
import { AddPropertyModal } from "./AddPropertyModal";
import { MarketTab, GuestsTab, CompareTab } from "./tabs";
import { useCities } from "@/lib/hooks";
import { getProject, saveProject } from "@/lib/storage";
import { computeProperty } from "@/lib/compute";
import { uid, usdShort } from "@/lib/format";
import type { Project, Property, FinancingAssumptions } from "@/lib/types";

export function ProjectView({ id }: { id: string }) {
  const cities = useCities();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [tab, setTab] = useState("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(() => setProject(getProject(id)), [id]);
  useEffect(() => {
    load();
    window.addEventListener("rentaliq:change", load);
    return () => window.removeEventListener("rentaliq:change", load);
  }, [load]);

  const city = useMemo(() => cities.find((c) => c.key === project?.cityKey), [cities, project]);

  const persist = useCallback(
    (next: Project) => {
      saveProject(next);
      setProject(next);
    },
    []
  );

  function addProperties(partials: Partial<Property>[]) {
    if (!project || !city) return;
    const now = Date.now();
    const finalized = partials.map((partial) => {
      const base: Property = {
        id: uid(),
        cityKey: project.cityKey,
        address: partial.address || "Unknown",
        beds: partial.beds ?? 2,
        baths: partial.baths ?? 2,
        price: partial.price ?? 0,
        propertyType: partial.propertyType ?? "condo",
        strStatus: partial.strStatus ?? "unknown",
        createdAt: now,
        updatedAt: now,
        ...partial,
      };
      return computeProperty(city, base, project, partial.rentOverride);
    });
    persist({ ...project, properties: [...project.properties, ...finalized] });
  }

  function updateProperty(updated: Property) {
    if (!project || !city) return;
    const recomputed = computeProperty(city, updated, project, updated.rentOverride);
    persist({
      ...project,
      properties: project.properties.map((p) => (p.id === recomputed.id ? recomputed : p)),
    });
  }

  function deleteProperty(pid: string) {
    if (!project) return;
    persist({ ...project, properties: project.properties.filter((p) => p.id !== pid) });
  }

  function setFinancing(fin: FinancingAssumptions) {
    if (!project || !city) return;
    const next = { ...project, financing: fin };
    next.properties = next.properties.map((p) => computeProperty(city, p, next, p.rentOverride));
    persist(next);
    setFinOpen(false);
  }

  if (project === undefined) {
    return <div className="py-20 text-center text-sm text-slate-400">Loading…</div>;
  }
  if (!project) {
    return (
      <EmptyState title="Project not found">
        <Link href="/" className="text-teal-700 hover:underline">
          Back to projects
        </Link>
      </EmptyState>
    );
  }
  if (!city) {
    return <EmptyState title="Market data missing for this project." />;
  }

  const props = project.properties;
  const strAllowed = props.filter((p) => p.strStatus === "allowed").length;
  const strUnknown = props.filter((p) => p.strStatus === "unknown").length;
  const avgScore = props.length ? Math.round(props.reduce((a, b) => a + (b.rating ?? 0), 0) / props.length) : 0;
  const bestStr = props.filter((p) => p.strStatus !== "banned" && p.strAnalysis).sort((a, b) => b.strAnalysis!.mid.gross - a.strAnalysis!.mid.gross)[0];
  const detail = props.find((p) => p.id === detailId) || null;

  const tabs = [
    { key: "overview", label: "Properties", icon: <LayoutGrid size={15} /> },
    { key: "market", label: "Market", icon: <TrendingUp size={15} /> },
    { key: "guests", label: "Guests", icon: <Users size={15} /> },
    { key: "compare", label: "Compare", icon: <BarChart3 size={15} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link href="/" className="no-print mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft size={13} /> All projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {city.name}, {city.state}
              </span>
              {project.clientName && <span>· Client: {project.clientName}</span>}
              <Badge tone="teal">{project.strategy === "both" ? "STR + Long-term" : project.strategy === "str" ? "Short-term" : "Long-term"}</Badge>
              <span className="text-xs">
                · {project.financing.mode === "financed" ? `Financed ${project.financing.downPaymentPct}% @ ${project.financing.interestRate}%` : "All-cash"}
              </span>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button onClick={() => setFinOpen(true)}>
              <Settings2 size={15} /> Financing
            </Button>
            <Link href={`/project/${project.id}/report`}>
              <Button>
                <Printer size={15} /> Report
              </Button>
            </Link>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add property
            </Button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Stat label="Properties" value={props.length} />
        <Stat label="STR allowed" value={strAllowed} tone={strAllowed ? "good" : "default"} sub={strUnknown ? `${strUnknown} unverified` : undefined} />
        <Stat label="Avg score" value={`${avgScore}`} sub="/ 100" />
        <Stat label="Best STR gross" value={bestStr ? usdShort(bestStr.strAnalysis!.mid.gross) : "—"} tone="good" />
        <Stat label="Budget" value={project.budgetMax ? usdShort(project.budgetMax) : "—"} sub={project.budgetMin ? `from ${usdShort(project.budgetMin)}` : undefined} />
      </div>

      {strUnknown > 0 && (
        <div className="no-print mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {strUnknown} {strUnknown === 1 ? "property has" : "properties have"} unverified STR status. Open each one and click{" "}
            <b>Verify with AI</b> (or set it manually) before trusting STR projections — a complex that bans STR is disqualifying.
          </span>
        </div>
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "overview" &&
          (props.length === 0 ? (
            <EmptyState title="No properties yet">
              <p>
                Add your saved listings four ways — type them in <b>manually</b>, <b>smart-paste</b> a listing&apos;s text,
                drop in a batch of <b>bulk links</b>, or <b>budget-search</b> for new ones.
              </p>
              <div className="mt-3">
                <Button variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus size={16} /> Add property
                </Button>
              </div>
            </EmptyState>
          ) : (
            <PropertyTable properties={props} city={city} project={project} onOpen={(p) => setDetailId(p.id)} />
          ))}
        {tab === "market" && <MarketTab city={city} />}
        {tab === "guests" && <GuestsTab city={city} />}
        {tab === "compare" && <CompareTab properties={props} project={project} onOpen={(p) => setDetailId(p.id)} />}
      </div>

      {/* Modals */}
      <AddPropertyModal open={addOpen} onClose={() => setAddOpen(false)} city={city} project={project} onAdd={addProperties} />
      {detail && (
        <PropertyDetail
          open={!!detail}
          onClose={() => setDetailId(null)}
          property={detail}
          city={city}
          project={project}
          onUpdate={updateProperty}
          onDelete={() => deleteProperty(detail.id)}
        />
      )}
      <FinancingModal open={finOpen} onClose={() => setFinOpen(false)} financing={project.financing} onSave={setFinancing} />
    </div>
  );
}

function FinancingModal({
  open,
  onClose,
  financing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  financing: FinancingAssumptions;
  onSave: (f: FinancingAssumptions) => void;
}) {
  const [f, setF] = useState(financing);
  useEffect(() => setF(financing), [financing, open]);

  return (
    <Modal open={open} onClose={onClose} title="Financing assumptions">
      <div className="space-y-3">
        <Field label="Purchase mode">
          <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as FinancingAssumptions["mode"] })}>
            <option value="all-cash">All cash</option>
            <option value="financed">Financed (mortgage)</option>
          </Select>
        </Field>
        {f.mode === "financed" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Down payment %">
              <Input type="number" value={f.downPaymentPct} onChange={(e) => setF({ ...f, downPaymentPct: Number(e.target.value) })} />
            </Field>
            <Field label="Interest rate %">
              <Input type="number" step="0.1" value={f.interestRate} onChange={(e) => setF({ ...f, interestRate: Number(e.target.value) })} />
            </Field>
            <Field label="Loan term (years)">
              <Input type="number" value={f.loanTermYears} onChange={(e) => setF({ ...f, loanTermYears: Number(e.target.value) })} />
            </Field>
            <Field label="Closing cost %">
              <Input type="number" step="0.1" value={f.closingCostPct} onChange={(e) => setF({ ...f, closingCostPct: Number(e.target.value) })} />
            </Field>
          </div>
        )}
        {f.mode === "all-cash" && (
          <Field label="Closing cost %">
            <Input type="number" step="0.1" value={f.closingCostPct} onChange={(e) => setF({ ...f, closingCostPct: Number(e.target.value) })} />
          </Field>
        )}
        <p className="text-xs text-slate-400">Changing this recomputes long-term cash-on-cash for every property in the project.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(f)}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}
