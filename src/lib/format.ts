// Number / currency formatting helpers

export function usd(n: number | undefined | null, opts?: { cents?: boolean }): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  });
}

/** Compact currency: $42K, $1.2M */
export function usdShort(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  return usd(n);
}

export function pct(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function num(n: number | undefined | null, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function bedsLabel(beds: number, baths?: number): string {
  const b = beds === 0 ? "Studio" : `${beds} bd`;
  return baths ? `${b} / ${baths} ba` : b;
}

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}
