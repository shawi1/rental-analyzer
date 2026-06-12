"use client";

import { useState } from "react";
import { ClipboardPaste, PencilLine, Search, Sparkles, Loader2, Plus, Link2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button, Modal, Field, Input, Select, Textarea, Badge, Spinner } from "./ui";
import { keyHeaders } from "@/lib/keys";
import { usd, bedsLabel } from "@/lib/format";
import type { CityConfig, Property, PropertyType, ExtractedListing, ListingSearchResult, Project } from "@/lib/types";

type Mode = "manual" | "paste" | "bulk" | "search";

const BLANK = {
  address: "",
  unit: "",
  complex: "",
  zip: "",
  price: "",
  beds: "2",
  baths: "2",
  sqft: "",
  propertyType: "condo" as PropertyType,
  yearBuilt: "",
  daysOnMarket: "",
  hoaMonthly: "",
  tier: "",
  zillowUrl: "",
  strStatus: "unknown" as Property["strStatus"],
};
type FormState = typeof BLANK;

// Map a rentaliq-data (MLS) listing row to the app's ListingSearchResult shape.
function mapServiceListing(r: Record<string, unknown>): ListingSearchResult {
  const sub = String(r.property_subtype || r.property_type || "").toLowerCase();
  const pt: PropertyType = sub.includes("condo")
    ? "condo"
    : sub.includes("town")
      ? "townhome"
      : sub.includes("single")
        ? "single-family"
        : sub.includes("multi")
          ? "multi-family"
          : "other";
  return {
    address: String(r.address || "Unknown"),
    zip: (r.zip as string) || undefined,
    price: Number(r.price) || 0,
    beds: Number(r.beds) || 0,
    baths: Number(r.baths) || 0,
    sqft: r.sqft ? Number(r.sqft) : undefined,
    propertyType: pt,
    yearBuilt: r.year_built ? Number(r.year_built) : undefined,
    daysOnMarket: r.days_on_market ? Number(r.days_on_market) : undefined,
    hoaMonthly: r.hoa_monthly ? Number(r.hoa_monthly) : undefined,
    source: "MLS",
    lat: r.lat ? Number(r.lat) : undefined,
    lng: r.lng ? Number(r.lng) : undefined,
  };
}

export function AddPropertyModal({
  open,
  onClose,
  city,
  project,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  city: CityConfig;
  project: Project;
  onAdd: (props: Partial<Property>[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("manual");
  const [form, setForm] = useState<FormState>({ ...BLANK, tier: city.tiers[0]?.key ?? "" });
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function reset() {
    setForm({ ...BLANK, tier: city.tiers[0]?.key ?? "" });
  }

  function buildOne(): Partial<Property> | null {
    if (!form.address.trim() || !form.price) {
      alert("Address and price are required.");
      return null;
    }
    return {
      cityKey: city.key,
      address: form.address.trim(),
      unit: form.unit.trim() || undefined,
      complex: form.complex.trim() || undefined,
      zip: form.zip.trim() || undefined,
      price: Number(form.price),
      beds: Number(form.beds),
      baths: Number(form.baths),
      sqft: form.sqft ? Number(form.sqft) : undefined,
      propertyType: form.propertyType,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
      daysOnMarket: form.daysOnMarket ? Number(form.daysOnMarket) : undefined,
      hoaMonthly: form.hoaMonthly ? Number(form.hoaMonthly) : undefined,
      tier: form.tier || undefined,
      zillowUrl: form.zillowUrl.trim() || undefined,
      strStatus: form.strStatus,
    };
  }

  function submitManual() {
    const p = buildOne();
    if (!p) return;
    onAdd([p]);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add property" wide>
      <div className="mb-4 flex gap-1 rounded-lg bg-white/[0.05] p-1 text-sm">
        <ModeBtn icon={<PencilLine size={15} />} label="Manual" active={mode === "manual"} onClick={() => setMode("manual")} />
        <ModeBtn icon={<ClipboardPaste size={15} />} label="Smart paste" active={mode === "paste"} onClick={() => setMode("paste")} />
        <ModeBtn icon={<Link2 size={15} />} label="Bulk links" active={mode === "bulk"} onClick={() => setMode("bulk")} />
        <ModeBtn icon={<Search size={15} />} label="Budget search" active={mode === "search"} onClick={() => setMode("search")} />
      </div>

      {mode === "paste" && <PastePanel form={form} setField={set} />}
      {mode === "bulk" && <BulkPanel city={city} onAdd={onAdd} onClose={onClose} />}
      {mode === "search" && <SearchPanel city={city} project={project} onAdd={onAdd} onClose={onClose} />}

      {(mode === "manual" || mode === "paste") && (
        <ManualForm city={city} form={form} set={set} onSubmit={submitManual} onCancel={onClose} />
      )}
    </Modal>
  );
}

function ModeBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
        active ? "bg-[var(--surface)] text-cyan-300 shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---- Smart paste -----------------------------------------------------------

function PastePanel({ form, setField }: { form: FormState; setField: (k: keyof FormState, v: string) => void }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"" | "scrape" | "extract">("");
  const [msg, setMsg] = useState<{ tone: "info" | "ok" | "err"; text: string } | null>(null);

  async function scrape() {
    if (!url.trim()) return;
    setBusy("scrape");
    setMsg(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.text) setText(data.text);
      if (data.blocked) setMsg({ tone: "err", text: data.message || "Site blocked the request — paste the text manually." });
      else if (data.text) setMsg({ tone: "ok", text: "Fetched page text — now click Extract." });
      else setMsg({ tone: "err", text: data.message || "Nothing fetched." });
    } catch {
      setMsg({ tone: "err", text: "Fetch failed." });
    } finally {
      setBusy("");
    }
  }

  async function extract() {
    if (!text.trim()) {
      setMsg({ tone: "err", text: "Paste some listing text first." });
      return;
    }
    setBusy("extract");
    setMsg(null);
    try {
      const res = await fetch("/api/extract-listing", {
        method: "POST",
        headers: { "content-type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ text, url: url.trim() || undefined }),
      });
      const data = (await res.json()) as ExtractedListing & { error?: string; message?: string };
      if (data.error) {
        setMsg({ tone: "err", text: data.message || "Extraction failed. Check your Anthropic key in Settings." });
        return;
      }
      if (data.address) setField("address", data.address);
      if (data.unit) setField("unit", data.unit);
      if (data.complex) setField("complex", data.complex);
      if (data.zip) setField("zip", data.zip);
      if (data.price) setField("price", String(data.price));
      if (data.beds !== undefined) setField("beds", String(data.beds));
      if (data.baths !== undefined) setField("baths", String(data.baths));
      if (data.sqft) setField("sqft", String(data.sqft));
      if (data.propertyType) setField("propertyType", data.propertyType);
      if (data.yearBuilt) setField("yearBuilt", String(data.yearBuilt));
      if (data.daysOnMarket) setField("daysOnMarket", String(data.daysOnMarket));
      if (data.hoaMonthly) setField("hoaMonthly", String(data.hoaMonthly));
      if (url.trim()) setField("zillowUrl", url.trim());
      setMsg({ tone: "ok", text: "Extracted — review the fields below and click Add." });
    } catch {
      setMsg({ tone: "err", text: "Extraction failed." });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-[var(--hairline)] bg-white/[0.03] p-3">
      <Field label="Listing URL (optional)" hint="Zillow often blocks bots — if Fetch fails, just paste the listing text below.">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.zillow.com/homedetails/..." />
          <Button onClick={scrape} disabled={busy !== "" || !url.trim()}>
            {busy === "scrape" ? <Spinner /> : "Fetch"}
          </Button>
        </div>
      </Field>
      <Field label="Paste listing text" hint="Select all the text on the Zillow listing page (⌘A ⌘C) and paste here.">
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full listing text here…" />
      </Field>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={extract} disabled={busy !== ""}>
          {busy === "extract" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Extract with AI
        </Button>
        {msg && (
          <span className={`text-xs ${msg.tone === "err" ? "text-rose-400" : msg.tone === "ok" ? "text-emerald-400" : "text-[var(--fg-muted)]"}`}>
            {msg.text}
          </span>
        )}
      </div>
      {form.address && <p className="text-xs text-[var(--fg-muted)]">Parsed into the form below ↓</p>}
    </div>
  );
}

// ---- Bulk URL import -------------------------------------------------------

type BulkRow = { url: string; status: "ok" | "blocked" | "error"; listing?: ExtractedListing; message?: string };

function BulkPanel({ city, onAdd, onClose }: { city: CityConfig; onAdd: (p: Partial<Property>[]) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BulkRow[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function parseUrls(): string[] {
    return Array.from(
      new Set(
        text
          .split(/\s+/)
          .map((s) => s.trim())
          .filter((u) => /^https?:\/\//i.test(u))
      )
    );
  }
  const urlCount = parseUrls().length;

  async function run() {
    const urls = parseUrls();
    if (!urls.length) return;
    setRunning(true);
    setResults([]);
    setProgress({ done: 0, total: urls.length });
    const rows: BulkRow[] = [];
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch("/api/import-url", {
          method: "POST",
          headers: { "content-type": "application/json", ...keyHeaders() },
          body: JSON.stringify({ url: urls[i] }),
        });
        const data = await res.json();
        if (data.ok && data.listing) rows.push({ url: urls[i], status: "ok", listing: data.listing });
        else rows.push({ url: urls[i], status: data.blocked ? "blocked" : "error", message: data.message });
      } catch {
        rows.push({ url: urls[i], status: "error", message: "Request failed" });
      }
      setProgress({ done: i + 1, total: urls.length });
      setResults([...rows]);
    }
    setSelected(new Set(rows.map((r, idx) => (r.status === "ok" ? idx : -1)).filter((i) => i >= 0)));
    setRunning(false);
  }

  function toggle(i: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function addSelected() {
    if (!results) return;
    const props: Partial<Property>[] = [...selected].map((i) => {
      const l = results[i].listing!;
      return {
        cityKey: city.key,
        address: l.address || "Unknown",
        unit: l.unit,
        complex: l.complex,
        price: l.price ?? 0,
        beds: l.beds ?? 2,
        baths: l.baths ?? 2,
        sqft: l.sqft,
        propertyType: l.propertyType ?? "condo",
        yearBuilt: l.yearBuilt,
        daysOnMarket: l.daysOnMarket,
        hoaMonthly: l.hoaMonthly,
        tier: city.tiers[0]?.key,
        zillowUrl: l.zillowUrl,
        strStatus: "unknown" as const,
      };
    });
    onAdd(props);
    onClose();
  }

  const okCount = results?.filter((r) => r.status === "ok").length ?? 0;
  const blockedCount = results?.filter((r) => r.status === "blocked").length ?? 0;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--hairline)] bg-white/[0.03] p-3">
        <Field
          label="Paste listing links — one per line"
          hint="Works with Zillow, Redfin, Realtor.com, etc. Needs an Anthropic key (it reads each page and extracts the details)."
        >
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"https://www.zillow.com/homedetails/...\nhttps://www.zillow.com/homedetails/...\nhttps://www.redfin.com/FL/..."}
          />
        </Field>
        <div className="mt-2 flex items-center gap-3">
          <Button variant="primary" onClick={run} disabled={running || urlCount === 0}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {running ? `Importing ${progress.done}/${progress.total}…` : `Import ${urlCount || ""} link${urlCount === 1 ? "" : "s"}`}
          </Button>
          {!running && results && (
            <span className="text-xs text-[var(--fg-muted)]">
              {okCount} read{blockedCount ? ` · ${blockedCount} blocked` : ""}
            </span>
          )}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          Zillow blocks automated reads from servers, so some links may come back &quot;blocked.&quot; For those, open the listing,
          select-all the page text, and use the <b>Smart paste</b> tab. Redfin / Realtor.com links usually read fine.
        </p>
      </div>

      {results && results.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--fg-muted)]">{selected.size} selected to add</span>
            <Button variant="primary" size="sm" onClick={addSelected} disabled={selected.size === 0}>
              <Plus size={14} /> Add {selected.size || ""} propert{selected.size === 1 ? "y" : "ies"}
            </Button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {results.map((r, i) => (
              <BulkRowItem key={i} row={r} selected={selected.has(i)} onToggle={() => r.status === "ok" && toggle(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BulkRowItem({ row, selected, onToggle }: { row: BulkRow; selected: boolean; onToggle: () => void }) {
  const l = row.listing;
  const short = row.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48);
  if (row.status === "ok" && l) {
    return (
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
          selected ? "border-cyan-500/40 bg-cyan-500/[0.08]" : "border-[var(--hairline)] bg-[var(--surface)] hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <div className="truncate font-medium text-[var(--fg)]">
              {l.address || "Listing"} {l.unit || ""}
            </div>
            <div className="text-xs text-[var(--fg-muted)]">
              {l.price ? usd(l.price) : "price ?"}
              {l.beds !== undefined ? ` · ${bedsLabel(l.beds, l.baths)}` : ""}
              {l.sqft ? ` · ${l.sqft.toLocaleString()} sqft` : ""}
            </div>
          </div>
        </div>
        {selected && <Badge tone="teal">✓</Badge>}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-xs">
      {row.status === "blocked" ? (
        <AlertTriangle size={15} className="shrink-0 text-amber-500" />
      ) : (
        <XCircle size={15} className="shrink-0 text-rose-400" />
      )}
      <div className="min-w-0">
        <div className="truncate text-[var(--fg-muted)]">{short}…</div>
        <div className="text-[var(--fg-faint)]">{row.status === "blocked" ? "Blocked — use Smart paste for this one" : row.message || "Couldn't read"}</div>
      </div>
    </div>
  );
}

// ---- Manual / review form --------------------------------------------------

function ManualForm({
  city,
  form,
  set,
  onSubmit,
  onCancel,
}: {
  city: CityConfig;
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Address *">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="485 Gulf Shore Dr" />
          </Field>
        </div>
        <Field label="Unit / Apt">
          <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="#102" />
        </Field>
        <Field label="Complex / Community">
          <Input value={form.complex} onChange={(e) => set("complex", e.target.value)} placeholder="Jetty East" />
        </Field>
        <Field label="List price *">
          <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="239000" />
        </Field>
        <Field label="Property type">
          <Select value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
            <option value="condo">Condo</option>
            <option value="single-family">Single-family</option>
            <option value="townhome">Townhome</option>
            <option value="multi-family">Multi-family</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Beds">
          <Input type="number" value={form.beds} onChange={(e) => set("beds", e.target.value)} placeholder="2" />
        </Field>
        <Field label="Baths">
          <Input type="number" step="0.5" value={form.baths} onChange={(e) => set("baths", e.target.value)} placeholder="2" />
        </Field>
        <Field label="Sq ft">
          <Input type="number" value={form.sqft} onChange={(e) => set("sqft", e.target.value)} placeholder="950" />
        </Field>
        <Field label="ZIP code">
          <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="32541" />
        </Field>
        <Field label="HOA / mo">
          <Input type="number" value={form.hoaMonthly} onChange={(e) => set("hoaMonthly", e.target.value)} placeholder="500" />
        </Field>
        <Field label="Days on market">
          <Input type="number" value={form.daysOnMarket} onChange={(e) => set("daysOnMarket", e.target.value)} placeholder="45" />
        </Field>
        <Field label="Year built">
          <Input type="number" value={form.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} placeholder="1998" />
        </Field>
        <Field label={`Location tier (${city.anchorLabel})`}>
          <Select value={form.tier} onChange={(e) => set("tier", e.target.value)}>
            {city.tiers.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="STR status">
          <Select value={form.strStatus} onChange={(e) => set("strStatus", e.target.value)}>
            <option value="unknown">Unknown — verify</option>
            <option value="allowed">Allowed</option>
            <option value="banned">Banned</option>
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Zillow URL (optional)">
            <Input value={form.zillowUrl} onChange={(e) => set("zillowUrl", e.target.value)} placeholder="https://www.zillow.com/..." />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit}>
          <Plus size={16} /> Add property
        </Button>
      </div>
    </div>
  );
}

// ---- Budget search ---------------------------------------------------------

function SearchPanel({
  city,
  project,
  onAdd,
  onClose,
}: {
  city: CityConfig;
  project: Project;
  onAdd: (props: Partial<Property>[]) => void;
  onClose: () => void;
}) {
  const [params, setParams] = useState({
    minPrice: project.budgetMin ? String(project.budgetMin) : "",
    maxPrice: project.budgetMax ? String(project.budgetMax) : "",
    bedrooms: "",
    propertyType: "" as "" | PropertyType,
  });
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ListingSearchResult[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [err, setErr] = useState("");
  const [source, setSource] = useState<"ours" | "rentcast" | "redfin">("ours");

  async function run() {
    setBusy(true);
    setErr("");
    setResults(null);
    try {
      let data: { error?: string; message?: string; results?: ListingSearchResult[] };
      if (source === "ours") {
        // Our owned microservice (MLS) — GET via the proxy.
        const qs = new URLSearchParams({ city: city.name, state: city.state });
        if (params.minPrice) qs.set("min_price", params.minPrice);
        if (params.maxPrice) qs.set("max_price", params.maxPrice);
        if (params.bedrooms) qs.set("beds", params.bedrooms);
        if (params.propertyType) qs.set("property_type", params.propertyType);
        const res = await fetch(`/api/data/listings?${qs.toString()}`);
        const raw = await res.json();
        data = { error: raw.error, message: raw.message, results: (raw.results || []).map(mapServiceListing) };
      } else {
        const endpoint = source === "redfin" ? "/api/redfin/listings" : "/api/rentcast/listings";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", ...keyHeaders() },
          body: JSON.stringify({
            city: city.name,
            state: city.state,
            minPrice: params.minPrice ? Number(params.minPrice) : undefined,
            maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
            bedrooms: params.bedrooms ? Number(params.bedrooms) : undefined,
            propertyType: params.propertyType || undefined,
          }),
        });
        data = await res.json();
      }
      if (data.error) {
        const msg =
          data.error === "mls-not-configured"
            ? "Our MLS feed isn't connected yet (needs your RESO credentials). Use RentCast or Redfin for now."
            : data.message || (source === "rentcast" ? "Search failed. Add a RentCast key in Settings." : "Search failed.");
        setErr(msg);
        setResults([]);
        return;
      }
      setResults(data.results || []);
      setSelected(new Set());
    } catch {
      setErr("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(i: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function addSelected() {
    if (!results) return;
    const props: Partial<Property>[] = [...selected].map((i) => {
      const r = results[i];
      return {
        cityKey: city.key,
        address: r.address,
        zip: r.zip,
        price: r.price,
        beds: r.beds,
        baths: r.baths,
        sqft: r.sqft,
        propertyType: r.propertyType ?? "other",
        yearBuilt: r.yearBuilt,
        daysOnMarket: r.daysOnMarket,
        hoaMonthly: r.hoaMonthly,
        tier: city.tiers[0]?.key,
        strStatus: "unknown" as const,
        rentOverride: r.rentEstimate,
      };
    });
    onAdd(props);
    onClose();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--hairline)] bg-white/[0.03] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--fg-muted)]">
            Find active for-sale listings in {city.name}, {city.state} within your budget.
          </p>
          <div className="flex gap-1 rounded-lg bg-white/[0.06]/70 p-0.5 text-xs">
            <button
              onClick={() => setSource("ours")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${source === "ours" ? "bg-[var(--surface)] text-cyan-300 shadow-sm" : "text-[var(--fg-muted)]"}`}
            >
              Our API · MLS
            </button>
            <button
              onClick={() => setSource("rentcast")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${source === "rentcast" ? "bg-[var(--surface)] text-cyan-300 shadow-sm" : "text-[var(--fg-muted)]"}`}
            >
              RentCast
            </button>
            <button
              onClick={() => setSource("redfin")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${source === "redfin" ? "bg-[var(--surface)] text-cyan-300 shadow-sm" : "text-[var(--fg-muted)]"}`}
            >
              Redfin · free
            </button>
          </div>
        </div>
        <p className="mb-2 text-[11px] text-[var(--fg-faint)]">
          {source === "ours"
            ? "Our API: free & owned, straight from the licensed MLS feed (most reliable + complete). Lights up once your RESO credentials are connected to the rentaliq-data service."
            : source === "redfin"
              ? "Redfin: free & unlimited, but experimental — Redfin often blocks server requests, so this may fail on the live site (works best running locally). Falls back to RentCast."
              : "RentCast: reliable, uses 1 of your 50 free monthly requests per search (results are cached, so re-opening costs nothing)."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Min price">
            <Input type="number" value={params.minPrice} onChange={(e) => setParams((p) => ({ ...p, minPrice: e.target.value }))} placeholder="200000" />
          </Field>
          <Field label="Max price">
            <Input type="number" value={params.maxPrice} onChange={(e) => setParams((p) => ({ ...p, maxPrice: e.target.value }))} placeholder="350000" />
          </Field>
          <Field label="Min beds">
            <Input type="number" value={params.bedrooms} onChange={(e) => setParams((p) => ({ ...p, bedrooms: e.target.value }))} placeholder="2" />
          </Field>
          <Field label="Type">
            <Select value={params.propertyType} onChange={(e) => setParams((p) => ({ ...p, propertyType: e.target.value as PropertyType }))}>
              <option value="">Any</option>
              <option value="condo">Condo</option>
              <option value="single-family">Single-family</option>
              <option value="townhome">Townhome</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" onClick={run} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search listings
          </Button>
          {err && <span className="text-xs text-rose-400">{err}</span>}
        </div>
      </div>

      {results && (
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--fg-muted)]">
              {results.length} result{results.length !== 1 ? "s" : ""} · {selected.size} selected
            </span>
            <Button variant="primary" size="sm" onClick={addSelected} disabled={selected.size === 0}>
              <Plus size={14} /> Add {selected.size || ""} selected
            </Button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {results.length === 0 && <p className="py-6 text-center text-sm text-[var(--fg-faint)]">No listings matched.</p>}
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected.has(i) ? "border-cyan-500/40 bg-cyan-500/[0.08]" : "border-[var(--hairline)] bg-[var(--surface)] hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--fg)]">{r.address}</div>
                  <div className="text-xs text-[var(--fg-muted)]">
                    {bedsLabel(r.beds, r.baths)}
                    {r.sqft ? ` · ${r.sqft.toLocaleString()} sqft` : ""}
                    {r.daysOnMarket ? ` · ${r.daysOnMarket} DOM` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-semibold text-[var(--fg)]">{usd(r.price)}</span>
                  {selected.has(i) && <Badge tone="teal">✓</Badge>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
