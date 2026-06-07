"use client";

import { useCallback, useEffect, useState } from "react";
import { listProjects, listCustomCities } from "./storage";
import { SEEDED_CITIES } from "./cities";
import type { Project, CityConfig } from "./types";

function useStorageSubscription<T>(read: () => T): [T, () => void] {
  const [value, setValue] = useState<T>(read);
  const refresh = useCallback(() => setValue(read()), [read]);
  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("rentaliq:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("rentaliq:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);
  return [value, refresh];
}

export function useProjects(): [Project[], () => void] {
  return useStorageSubscription(listProjects);
}

export function useCities(): CityConfig[] {
  const [custom] = useStorageSubscription(listCustomCities);
  return [...SEEDED_CITIES, ...custom];
}
