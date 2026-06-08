import type { Project, Property } from "./types";
import { uid } from "./format";
import { SEEDED_CITIES } from "./cities";
import { computeProperty } from "./compute";
import { DEFAULT_FINANCING, saveProject } from "./storage";

// Demo project seeded from the real Destin research (top recommendations).
const DESTIN_PROPS: Partial<Property>[] = [
  {
    address: "485 Gulf Shore Dr", unit: "#102", complex: "Jetty East", price: 239000,
    beds: 1, baths: 1, sqft: 720, propertyType: "condo", tier: "beachfront", hoaMonthly: 550,
    daysOnMarket: 38, strStatus: "allowed", strConfidence: "high",
    strNote: "Holiday Isle resort property — STR confirmed; active Airbnb listings in complex.",
  },
  {
    address: "4000 Gulf Terrace Dr", unit: "#282", complex: "Gulf Terrace", price: 245000,
    beds: 2, baths: 2, sqft: 1050, propertyType: "condo", tier: "inland", hoaMonthly: 480,
    daysOnMarket: 52, strStatus: "allowed", strConfidence: "high",
    strNote: "MLS explicitly states 'No Rental Restrictions'.",
  },
  {
    address: "4075 Dancing Cloud Ct", unit: "#197", complex: "Indian Lake / Dancing Cloud", price: 250000,
    beds: 2, baths: 2, sqft: 1000, propertyType: "condo", tier: "inland", hoaMonthly: 420,
    daysOnMarket: 92, strStatus: "allowed", strConfidence: "medium",
    strNote: "STR allowed per MLS; confirmed by active Airbnb listings. 92 DOM — negotiation leverage.",
  },
  {
    address: "4040 Dancing Cloud Ct", unit: "#332", complex: "Indian Lake / Dancing Cloud", price: 185000,
    beds: 1, baths: 1, sqft: 700, propertyType: "condo", tier: "inland", hoaMonthly: 380,
    daysOnMarket: 21, strStatus: "allowed", strConfidence: "medium",
    strNote: "Cheapest confirmed-STR unit. STR allowed per MLS.",
  },
  {
    address: "4000 Gulf Terrace Dr", unit: "#193", complex: "Gulf Terrace", price: 210000,
    beds: 1, baths: 1, sqft: 780, propertyType: "condo", tier: "inland", hoaMonthly: 450,
    daysOnMarket: 30, strStatus: "allowed", strConfidence: "high",
    strNote: "Best-value 1bd. 'No Rental Restrictions' per MLS.",
  },
  {
    address: "3850 Indian Trl", unit: "APT 107", complex: "Unknown", price: 199000,
    beds: 1, baths: 1, sqft: 740, propertyType: "condo", tier: "unknown", hoaMonthly: 400,
    daysOnMarket: 75, strStatus: "unknown",
    strNote: "No MLS data found for complex — STR status must be verified before any offer.",
  },
];

export function createDemoProject(): Project {
  const city = SEEDED_CITIES.find((c) => c.key === "destin-fl")!;
  const now = Date.now();
  const project: Project = {
    id: uid(),
    name: "Demo — Destin condos (sample)",
    cityKey: city.key,
    clientName: undefined,
    strategy: "both",
    financing: { ...DEFAULT_FINANCING },
    budgetMin: 180000,
    budgetMax: 260000,
    properties: [],
    notes: "Sample project seeded from the Destin research. Edit or delete freely.",
    createdAt: now,
    updatedAt: now,
  };
  project.properties = DESTIN_PROPS.map((partial) => {
    const base: Property = {
      id: uid(),
      cityKey: city.key,
      address: partial.address!,
      beds: partial.beds ?? 1,
      baths: partial.baths ?? 1,
      price: partial.price ?? 0,
      propertyType: "condo",
      strStatus: partial.strStatus ?? "unknown",
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    return computeProperty(city, base, project);
  });
  saveProject(project);
  return project;
}
