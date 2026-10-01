/** Formatting helpers for the ops console. Pure, shared by sections and tests. */

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function shortHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

export function formatAmount(value: string | null | undefined, digits = 5): string {
  if (value === null || value === undefined) return "n/a";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatInteger(value: number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : value.toLocaleString("en-US");
}

const UNITS: [number, string][] = [[86_400, "d"], [3_600, "h"], [60, "m"]];

/** "12s ago", "4m ago", "3h ago", "2d ago", or "in 5m" for a future time. */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "n/a";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "n/a";
  const seconds = Math.round((now - then) / 1000);
  const abs = Math.abs(seconds);
  let text = `${abs}s`;
  for (const [size, unit] of UNITS) {
    if (abs >= size) {
      text = `${Math.floor(abs / size)}${unit}`;
      break;
    }
  }
  if (abs < 5) return "just now";
  return seconds >= 0 ? `${text} ago` : `in ${text}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "n/a";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
}

/** Local wall-clock time with seconds, e.g. 18:04:09. */
export function clockTime(epochMs: number | null): string {
  if (epochMs === null) return "";
  return new Date(epochMs).toLocaleTimeString("en-GB", { hour12: false });
}

/** Absolute timestamp for tooltips and screen readers. */
export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}
