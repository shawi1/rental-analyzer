// Client-side API key storage.
//
// Keys are stored in the browser's localStorage and sent to our own API routes
// via request headers. The API routes also fall back to server-side env vars
// (ANTHROPIC_API_KEY, RENTCAST_API_KEY) if a header is absent — so you can
// either paste keys in Settings (per-browser) or set them in the deploy env.

export type ApiKeyName = "anthropic" | "rentcast" | "hud";

const STORAGE_KEY = "rentaliq:apikeys";

export interface ApiKeys {
  anthropic?: string;
  rentcast?: string;
  hud?: string;
}

export function loadKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

/** Headers to attach to fetches against our own API routes. */
export function keyHeaders(): Record<string, string> {
  const k = loadKeys();
  const h: Record<string, string> = {};
  if (k.anthropic) h["x-anthropic-key"] = k.anthropic;
  if (k.rentcast) h["x-rentcast-key"] = k.rentcast;
  if (k.hud) h["x-hud-key"] = k.hud;
  return h;
}
