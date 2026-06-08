"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Home as HomeIcon, Trash2, ArrowRight } from "lucide-react";
import { Button, Card, Badge, EmptyState, Modal, Field, Input, Select } from "@/components/ui";
import { useProjects, useCities } from "@/lib/hooks";
import { newProject, saveProject, deleteProject, DEFAULT_FINANCING } from "@/lib/storage";
import { createDemoProject } from "@/lib/demo";
import { usd } from "@/lib/format";

const STRATEGY_LABEL: Record<string, string> = { str: "Short-term", ltr: "Long-term", both: "STR + Long-term" };

export default function HomePage() {
  const [projects, refresh] = useProjects();
  const cities = useCities();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function create(form: { name: string; cityKey: string; clientName: string; strategy: string; budgetMin: string; budgetMax: string }) {
    const p = newProject({
      name: form.name.trim() || "Untitled project",
      cityKey: form.cityKey,
      clientName: form.clientName.trim() || undefined,
      strategy: (form.strategy as "str" | "ltr" | "both") || "both",
      budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      financing: { ...DEFAULT_FINANCING },
    });
    saveProject(p);
    setOpen(false);
    router.push(`/project/${p.id}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each project analyzes a set of properties in one market for STR &amp; long-term rental potential.
          </p>
        </div>
        <div className="flex gap-2">
          {projects.length === 0 && (
            <Button onClick={() => router.push(`/project/${createDemoProject().id}`)}>Load Destin demo</Button>
          )}
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet">
          Create your first project, or{" "}
          <button onClick={() => router.push(`/project/${createDemoProject().id}`)} className="font-medium text-teal-700 hover:underline">
            load the Destin demo
          </button>{" "}
          to see a finished analysis.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const city = cities.find((c) => c.key === p.cityKey);
            const best = [...p.properties].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
            return (
              <Card key={p.id} className="group relative flex flex-col p-4 transition-shadow hover:shadow-md">
                <button
                  onClick={() => {
                    if (confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                      deleteProject(p.id);
                      refresh();
                    }
                  }}
                  className="no-print absolute right-3 top-3 rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 size={15} />
                </button>
                <Link href={`/project/${p.id}`} className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={13} />
                    {city ? `${city.name}, ${city.state}` : p.cityKey}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{p.name}</h3>
                  {p.clientName && <p className="text-xs text-slate-500">Client: {p.clientName}</p>}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="teal">{STRATEGY_LABEL[p.strategy]}</Badge>
                    <Badge tone="slate">
                      <HomeIcon size={11} /> {p.properties.length} {p.properties.length === 1 ? "property" : "properties"}
                    </Badge>
                  </div>

                  {(p.budgetMin || p.budgetMax) && (
                    <p className="mt-2 text-xs text-slate-500">
                      Budget: {usd(p.budgetMin)} – {usd(p.budgetMax)}
                    </p>
                  )}

                  {best && best.rating !== undefined && (
                    <p className="mt-2 text-xs text-slate-500">
                      Top pick: <span className="font-medium text-slate-700">{best.address}</span> ({best.rating}/100)
                    </p>
                  )}

                  <div className="mt-auto pt-3 text-sm font-medium text-teal-700 opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight size={14} className="inline" />
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <NewProjectModal open={open} onClose={() => setOpen(false)} cities={cities} onCreate={create} />
    </div>
  );
}

function NewProjectModal({
  open,
  onClose,
  cities,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  cities: { key: string; name: string; state: string }[];
  onCreate: (f: { name: string; cityKey: string; clientName: string; strategy: string; budgetMin: string; budgetMax: string }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    cityKey: cities[0]?.key ?? "",
    clientName: "",
    strategy: "both",
    budgetMin: "",
    budgetMax: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <div className="space-y-3">
        <Field label="Project name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dad — Destin condos" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Market / city">
            <Select value={form.cityKey} onChange={(e) => set("cityKey", e.target.value)}>
              {cities.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}, {c.state}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Strategy">
            <Select value={form.strategy} onChange={(e) => set("strategy", e.target.value)}>
              <option value="both">STR + Long-term</option>
              <option value="str">Short-term only</option>
              <option value="ltr">Long-term only</option>
            </Select>
          </Field>
        </div>
        <Field label="Client name (optional)" hint="Shown on client-facing reports.">
          <Input value={form.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="e.g. The Johnsons" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget min (optional)">
            <Input type="number" value={form.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} placeholder="200000" />
          </Field>
          <Field label="Budget max (optional)">
            <Input type="number" value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} placeholder="350000" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onCreate(form)}>
            Create project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
