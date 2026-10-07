import type { AnimeEntry, SeasonSelection } from "@/lib/api";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/* ---------- Seasons ---------- */

export type SeasonName = SeasonSelection["season"];

const SEASON_ORDER: SeasonName[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

export const SEASON_LABELS: Record<SeasonName, string> = {
  WINTER: "Winter",
  SPRING: "Frühling",
  SUMMER: "Sommer",
  FALL: "Herbst",
};

export function currentSeason(date: Date = new Date()): SeasonSelection {
  return { season: SEASON_ORDER[Math.floor(date.getMonth() / 3)], year: date.getFullYear() };
}

export function shiftSeason(selection: SeasonSelection, delta: number): SeasonSelection {
  const index = selection.year * 4 + SEASON_ORDER.indexOf(selection.season) + delta;
  return { season: SEASON_ORDER[((index % 4) + 4) % 4], year: Math.floor(index / 4) };
}

export function seasonKey(selection: SeasonSelection): string {
  return `${selection.season}-${selection.year}`;
}

export function parseSeasonKey(key: string): SeasonSelection {
  const [season, year] = key.split("-");
  return { season: season as SeasonName, year: Number(year) };
}

export function seasonLabel(selection: SeasonSelection): string {
  return `${SEASON_LABELS[selection.season]} ${selection.year}`;
}

/* ---------- Watchlist status ---------- */

export type EntryStatus = AnimeEntry["status"];

export const WATCHLIST_STATUS_ORDER: EntryStatus[] = ["watching", "planned", "paused", "completed", "dropped"];
export const STATUS_ORDER: EntryStatus[] = [...WATCHLIST_STATUS_ORDER, "dismissed"];

export const STATUS_META: Record<EntryStatus, { label: string; dot: string }> = {
  watching: { label: "Schaue ich", dot: "bg-sky-400" },
  planned: { label: "Watchlist", dot: "bg-violet-400" },
  paused: { label: "Pausiert", dot: "bg-amber-400" },
  completed: { label: "Gesehen", dot: "bg-emerald-400" },
  dropped: { label: "Abgebrochen", dot: "bg-zinc-500" },
  dismissed: { label: "Kein Interesse", dot: "bg-rose-500/80" },
};

export function formatScore(score: number | null | undefined): string | null {
  if (score === null || score === undefined) return null;
  return (score / 10).toFixed(1);
}
