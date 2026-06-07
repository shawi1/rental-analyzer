import type { Project, CityConfig, FinancingAssumptions } from "./types";
import { uid } from "./format";

// ============================================================================
// Local persistence (browser localStorage). Abstracted so a Supabase/KV
// adapter can replace it later without touching the UI.
// ============================================================================

const PROJECTS_KEY = "rentaliq:projects";
const CITIES_KEY = "rentaliq:cities";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  // notify same-tab listeners
  window.dispatchEvent(new Event("rentaliq:change"));
}

export const DEFAULT_FINANCING: FinancingAssumptions = {
  mode: "all-cash",
  downPaymentPct: 25,
  interestRate: 7.0,
  loanTermYears: 30,
  closingCostPct: 3,
};

// --------------------------- Projects --------------------------------------

export function listProjects(): Project[] {
  return read<Project[]>(PROJECTS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return read<Project[]>(PROJECTS_KEY, []).find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const all = read<Project[]>(PROJECTS_KEY, []);
  const idx = all.findIndex((p) => p.id === project.id);
  project.updatedAt = Date.now();
  if (idx >= 0) all[idx] = project;
  else all.push(project);
  write(PROJECTS_KEY, all);
}

export function deleteProject(id: string): void {
  write(
    PROJECTS_KEY,
    read<Project[]>(PROJECTS_KEY, []).filter((p) => p.id !== id)
  );
}

export function newProject(partial: Partial<Project> & { name: string; cityKey: string }): Project {
  const now = Date.now();
  return {
    id: uid(),
    name: partial.name,
    cityKey: partial.cityKey,
    clientName: partial.clientName,
    budgetMin: partial.budgetMin,
    budgetMax: partial.budgetMax,
    strategy: partial.strategy ?? "both",
    financing: partial.financing ?? { ...DEFAULT_FINANCING },
    properties: partial.properties ?? [],
    notes: partial.notes,
    createdAt: now,
    updatedAt: now,
  };
}

// --------------------------- Custom cities ---------------------------------

export function listCustomCities(): CityConfig[] {
  return read<CityConfig[]>(CITIES_KEY, []);
}

export function saveCustomCity(city: CityConfig): void {
  const all = read<CityConfig[]>(CITIES_KEY, []);
  const idx = all.findIndex((c) => c.key === city.key);
  if (idx >= 0) all[idx] = city;
  else all.push(city);
  write(CITIES_KEY, all);
}

export function deleteCustomCity(key: string): void {
  write(
    CITIES_KEY,
    read<CityConfig[]>(CITIES_KEY, []).filter((c) => c.key !== key)
  );
}

// --------------------------- Export / Import -------------------------------

export function exportAll(): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: Date.now(),
      projects: read<Project[]>(PROJECTS_KEY, []),
      cities: read<CityConfig[]>(CITIES_KEY, []),
    },
    null,
    2
  );
}

export function importAll(json: string, mode: "merge" | "replace" = "merge"): { projects: number; cities: number } {
  const data = JSON.parse(json);
  const incomingProjects: Project[] = data.projects ?? [];
  const incomingCities: CityConfig[] = data.cities ?? [];

  if (mode === "replace") {
    write(PROJECTS_KEY, incomingProjects);
    write(CITIES_KEY, incomingCities);
  } else {
    const projects = read<Project[]>(PROJECTS_KEY, []);
    const byId = new Map(projects.map((p) => [p.id, p]));
    for (const p of incomingProjects) byId.set(p.id, p);
    write(PROJECTS_KEY, [...byId.values()]);

    const cities = read<CityConfig[]>(CITIES_KEY, []);
    const byKey = new Map(cities.map((c) => [c.key, c]));
    for (const c of incomingCities) byKey.set(c.key, c);
    write(CITIES_KEY, [...byKey.values()]);
  }
  return { projects: incomingProjects.length, cities: incomingCities.length };
}
