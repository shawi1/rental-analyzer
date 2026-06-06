import type { CityConfig, Property, Project } from "./types";
import { analyzeStr } from "./str-model";
import { analyzeLt } from "./lt-model";
import { scoreProperty } from "./scoring";

// Recompute all derived analysis for a property (pure, client-side, no network).
export function computeProperty(
  city: CityConfig,
  property: Property,
  project: Project,
  estimatedRent?: number
): Property {
  const strAnalysis = project.strategy === "ltr" ? property.strAnalysis : analyzeStr(city, property);
  const ltAnalysis =
    project.strategy === "str" ? property.ltAnalysis : analyzeLt(city, property, project.financing, estimatedRent);

  const withAnalyses: Property = {
    ...property,
    strAnalysis,
    ltAnalysis,
    updatedAt: Date.now(),
  };

  const scored = scoreProperty(city, withAnalyses, project.strategy);
  return {
    ...withAnalyses,
    rating: scored.score,
    pros: scored.pros,
    cons: scored.cons,
  };
}

/** Recompute every property in a project (e.g. after financing changes). */
export function recomputeProject(city: CityConfig, project: Project): Project {
  return {
    ...project,
    properties: project.properties.map((p) => computeProperty(city, p, project)),
  };
}
