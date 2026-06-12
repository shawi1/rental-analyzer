"use client";

import { useEffect, useRef, useState } from "react";
import { Key, Database, Download, Upload, Check, ExternalLink } from "lucide-react";
import { Button, Card, Field, Input, Badge } from "@/components/ui";
import { loadKeys, saveKeys, type ApiKeys } from "@/lib/keys";
import { exportAll, importAll } from "@/lib/storage";

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setKeys(loadKeys()), []);

  function save() {
    saveKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function doExport() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentaliq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = importAll(String(reader.result), "merge");
        setImportMsg(`Imported ${res.projects} project(s) and ${res.cities} custom city/cities.`);
      } catch {
        setImportMsg("Import failed — file is not a valid RentalIQ backup.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">Keys are stored only in this browser and sent directly to the data providers.</p>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Key size={18} className="text-cyan-300" />
          <h2 className="font-semibold text-[var(--fg)]">API keys</h2>
        </div>

        <div className="space-y-4">
          <Field
            label="Anthropic API key"
            hint="Powers AI STR verification, smart paste, and report narratives. Get one at console.anthropic.com (Billing required)."
          >
            <Input
              type="password"
              value={keys.anthropic ?? ""}
              onChange={(e) => setKeys((k) => ({ ...k, anthropic: e.target.value }))}
              placeholder="sk-ant-..."
            />
          </Field>
          <Field
            label="RentCast API key"
            hint="Powers budget-based property search + value/rent estimates. Free tier = 50 requests/month at rentcast.io."
          >
            <Input
              type="password"
              value={keys.rentcast ?? ""}
              onChange={(e) => setKeys((k) => ({ ...k, rentcast: e.target.value }))}
              placeholder="..."
            />
          </Field>
          <Field
            label="HUD API token (free, unlimited)"
            hint="Free U.S. government Fair Market Rent data — no usage limit. Powers the free long-term rent baseline. Get a token at huduser.gov."
          >
            <Input
              type="password"
              value={keys.hud ?? ""}
              onChange={(e) => setKeys((k) => ({ ...k, hud: e.target.value }))}
              placeholder="..."
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" onClick={save}>
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              "Save keys"
            )}
          </Button>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
          >
            Anthropic keys <ExternalLink size={12} />
          </a>
          <a
            href="https://app.rentcast.io/app/api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
          >
            RentCast keys <ExternalLink size={12} />
          </a>
          <a
            href="https://www.huduser.gov/portal/dataset/fmr-api.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
          >
            HUD token <ExternalLink size={12} />
          </a>
        </div>

        <p className="mt-3 text-[11px] text-[var(--fg-faint)]">
          The app also works without keys — manual entry and the built-in revenue/cap-rate models need no API. AI and listing
          search features are simply disabled until a key is added. You can alternatively set <code>ANTHROPIC_API_KEY</code> /
          <code> RENTCAST_API_KEY</code> in the deploy environment.
        </p>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} className="text-cyan-300" />
          <h2 className="font-semibold text-[var(--fg)]">Data backup</h2>
        </div>
        <p className="mb-3 text-sm text-[var(--fg-muted)]">
          Projects are saved in this browser. Export a backup to move data between devices or share with your dad.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={doExport}>
            <Download size={16} /> Export all data
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
          {importMsg && (
            <Badge tone="green">
              <Check size={12} /> {importMsg}
            </Badge>
          )}
        </div>
      </Card>
    </div>
  );
}
