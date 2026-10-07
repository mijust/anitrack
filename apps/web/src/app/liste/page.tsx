"use client";

import { useMemo, useState } from "react";
import { AnimeCard, Poster } from "@/components/anime-card";
import { useAnimeDetail } from "@/components/anime-detail-modal";
import { useCommandSearch } from "@/components/command-search";
import { GridIcon, ListIcon, MinusIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { useWatchlist } from "@/components/watchlist-provider";
import type { AnimeEntry } from "@/lib/api";
import { groupAnimeByFranchise, GroupedAnime } from "@/lib/grouping";
import { cn, EntryStatus, STATUS_META, STATUS_ORDER, WATCHLIST_STATUS_ORDER } from "@/lib/utils";

type Filter = "all" | EntryStatus;

export default function ListPage() {
  const { entries, ready, loadError, groupSeasons, toggleGroupSeasons } = useWatchlist();
  const { openSearch } = useCommandSearch();
  const [filter, setFilter] = useState<Filter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const activeCount = entries.filter((e) => e.status !== "dismissed").length;
    const result: Record<Filter, number> = {
      all: activeCount,
      watching: 0,
      planned: 0,
      paused: 0,
      completed: 0,
      dropped: 0,
      dismissed: 0,
    };
    for (const entry of entries) {
      if (entry.status in result) {
        result[entry.status] += 1;
      }
    }
    return result;
  }, [entries]);

  const visible = entries.filter((entry) => {
    const matchesFilter = filter === "all" ? entry.status !== "dismissed" : entry.status === filter;
    const matchesQuery = entry.title.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const displayEntries = useMemo(() => {
    if (!groupSeasons) return visible;
    return groupAnimeByFranchise(visible);
  }, [groupSeasons, visible]);

  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "Alle" },
    ...WATCHLIST_STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label })),
    { value: "dismissed", label: STATUS_META.dismissed.label },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meine Liste</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.all} aktive{counts.all === 1 ? "r" : ""} Anime gemerkt
            {counts.dismissed > 0 ? ` · ${counts.dismissed} ausgeblendet` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block sm:w-60">
            <span className="sr-only">Liste filtern</span>
            <SearchIcon width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="In Liste filtern …"
              className="h-9 w-full rounded-full border border-border bg-card/60 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-border-strong focus:bg-card"
            />
          </label>

          <button
            type="button"
            onClick={toggleGroupSeasons}
            title={groupSeasons ? "Staffeln einzeln anzeigen" : "Staffeln zusammenfassen"}
            aria-label="Staffel-Gruppierung umschalten"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition active:scale-95",
              groupSeasons
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                : "bg-card border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{groupSeasons ? "Staffeln gruppiert" : "Staffeln einzeln"}</span>
          </button>

          <div className="flex items-center rounded-full border border-border bg-card/60 p-0.5" role="group" aria-label="Ansicht">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Listenansicht"
              aria-label="Listenansicht"
              className={cn(
                "grid size-8 place-items-center rounded-full transition-colors",
                viewMode === "list" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListIcon width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Kachelansicht"
              aria-label="Kachelansicht"
              className={cn(
                "grid size-8 place-items-center rounded-full transition-colors",
                viewMode === "grid" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <GridIcon width={15} height={15} />
            </button>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Status" className="no-scrollbar -mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={filter === tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
              filter === tab.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {tab.value !== "all" && <span className={cn("size-1.5 rounded-full", STATUS_META[tab.value].dot)} />}
            <span>{tab.label}</span>
            <span className="tabular-nums opacity-60">{counts[tab.value]}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!ready ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : loadError ? (
          <p className="rounded-2xl border border-border p-6 text-center text-sm text-danger">{loadError}</p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ListIcon />}
            title="Deine Liste ist noch leer"
            description="Such nach einem Anime und merke ihn dir mit einem Klick."
            action={<Button onClick={() => openSearch()}>Anime suchen</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={<SearchIcon />} title="Keine Treffer" description="Für diesen Filter gibt es keine Einträge." />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {displayEntries.map((item) => {
              const isGroup: boolean = "isGroup" in item && Boolean(item.isGroup);
              const seasonCount: number =
                "seasonCount" in item && typeof item.seasonCount === "number" ? item.seasonCount : 1;
              const franchiseTitle: string =
                "franchiseTitle" in item && typeof item.franchiseTitle === "string"
                  ? item.franchiseTitle
                  : item.title;
              const seasons =
                "seasons" in item && Array.isArray(item.seasons) ? item.seasons : undefined;
              const totalEpisodes: number | null =
                "totalEpisodes" in item && typeof item.totalEpisodes === "number"
                  ? item.totalEpisodes
                  : null;

              return (
                <AnimeCard
                  key={item.id}
                  anime={{
                    anilist_id: item.anilist_id,
                    title: franchiseTitle,
                    cover_image: item.cover_image,
                    score: item.user_rating ? item.user_rating * 10 : null,
                    episodes: totalEpisodes,
                    genres: [],
                    ...(isGroup ? { isGroup, seasonCount, franchiseTitle, totalEpisodes, seasons } : {}),
                  }}
                  className="animate-enter"
                />
              );
            })}
          </div>
        ) : (
          <ul className="space-y-2">
            {displayEntries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EntryRow({ entry }: { entry: AnimeEntry | GroupedAnime<AnimeEntry> }) {
  const { update, remove } = useWatchlist();
  const { openDetails } = useAnimeDetail();
  const seasonCount: number =
    "seasonCount" in entry && typeof entry.seasonCount === "number" ? entry.seasonCount : 1;
  const franchiseTitle: string =
    "franchiseTitle" in entry && typeof entry.franchiseTitle === "string"
      ? entry.franchiseTitle
      : entry.title;
  const seasons =
    "seasons" in entry && Array.isArray(entry.seasons) ? entry.seasons : undefined;

  function handleOpen() {
    openDetails({
      anilist_id: entry.anilist_id,
      title: franchiseTitle,
      cover_image: entry.cover_image,
      seasons,
      franchiseTitle,
    });
  }

  return (
    <li className="animate-enter group flex gap-4 rounded-2xl border border-border/80 bg-card/70 p-3 transition-all hover:border-border-strong hover:bg-card">
      <div className="cursor-pointer" onClick={handleOpen}>
        <Poster
          src={entry.cover_image}
          alt={franchiseTitle}
          sizes="56px"
          className="h-[84px] w-14 shrink-0 rounded-xl ring-1 ring-border transition hover:scale-105"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              onClick={handleOpen}
              className="cursor-pointer truncate font-medium text-foreground hover:text-indigo-400 transition"
            >
              {franchiseTitle}
            </p>
            {seasonCount > 1 && (
              <span className="shrink-0 rounded-full bg-indigo-950/80 border border-indigo-400/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                {seasonCount} Staffeln
              </span>
            )}
          </div>
          <div className="mt-1.5">
            <StatusSelect value={entry.status} onChange={(status) => void update(entry, { status })} />
          </div>
        </div>

        {entry.status === "dismissed" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Wird nicht mehr vorgeschlagen</span>
            <button
              type="button"
              onClick={() => void update(entry, { status: "planned" })}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400"
            >
              Zur Watchlist
            </button>
            <button
              type="button"
              onClick={() => void remove(entry)}
              title="Endgültig löschen"
              aria-label={`${entry.title} endgültig löschen`}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 sm:gap-6">
            <EpisodeStepper
              value={entry.episodes_watched}
              onChange={(episodes_watched) => void update(entry, { episodes_watched })}
            />
            <RatingInput value={entry.user_rating} onChange={(user_rating) => void update(entry, { user_rating })} />
            <button
              type="button"
              onClick={() => void remove(entry)}
              aria-label={`${entry.title} entfernen`}
              className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-danger/10 hover:text-danger sm:ml-0 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusSelect({ value, onChange }: { value: EntryStatus; onChange: (status: EntryStatus) => void }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Status</span>
      <span className={cn("pointer-events-none absolute left-2.5 size-1.5 rounded-full", STATUS_META[value].dot)} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as EntryStatus)}
        className="h-7 cursor-pointer appearance-none rounded-full border border-border bg-muted/60 pl-6 pr-3 text-xs font-medium outline-none transition-colors hover:border-border-strong hover:bg-card"
      >
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EpisodeStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1" aria-label="Gesehene Folgen">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label="Eine Folge weniger"
        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
      >
        <MinusIcon width={14} height={14} />
      </button>
      <div className="min-w-12 text-center">
        <p className="text-sm font-semibold tabular-nums leading-none text-foreground">{value}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Folgen</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Eine Folge mehr"
        className="grid size-7 place-items-center rounded-full bg-muted/80 text-foreground transition hover:bg-indigo-600 hover:text-white active:scale-95"
      >
        <PlusIcon width={14} height={14} />
      </button>
    </div>
  );
}

/** 10er-Bewertung als kompakte Balkenleiste mit Hover-Vorschau. */
function RatingInput({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div role="radiogroup" aria-label="Bewertung" className="flex h-5 items-end gap-0.5" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, index) => {
          const score = index + 1;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={value === score}
              aria-label={`${score} von 10`}
              onMouseEnter={() => setHover(score)}
              onFocus={() => setHover(score)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(score)}
              style={{ height: `${40 + score * 6}%` }}
              className={cn(
                "w-1.5 rounded-full transition-colors",
                score <= shown ? "bg-amber-400" : "bg-muted-foreground/20 hover:bg-muted-foreground/35",
              )}
            />
          );
        })}
      </div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground tabular-nums">
        {shown ? `${shown}/10 ★` : "Bewerten"}
      </p>
    </div>
  );
}
