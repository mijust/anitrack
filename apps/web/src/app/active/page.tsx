"use client";

import { useEffect, useMemo, useState } from "react";
import { Poster } from "@/components/anime-card";
import { useAnimeDetail } from "@/components/anime-detail-modal";
import { useCommandSearch } from "@/components/command-search";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  SpinnerIcon,
  StarIcon,
} from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeSearchResult } from "@/lib/api";
import {
  cn,
  formatAiringDateTime,
  formatCountdown,
  formatScore,
  formatShortCountdown,
} from "@/lib/utils";

type ActiveTab = "my-watching" | "schedule";
type DayFilter = "all" | "today" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_LABELS: Record<DayFilter, { id: DayFilter; label: string; weekdayIndex?: number }> = {
  all: { id: "all", label: "Alle Tage" },
  today: { id: "today", label: "Heute" },
  mon: { id: "mon", label: "Mo", weekdayIndex: 1 },
  tue: { id: "tue", label: "Di", weekdayIndex: 2 },
  wed: { id: "wed", label: "Mi", weekdayIndex: 3 },
  thu: { id: "thu", label: "Do", weekdayIndex: 4 },
  fri: { id: "fri", label: "Fr", weekdayIndex: 5 },
  sat: { id: "sat", label: "Sa", weekdayIndex: 6 },
  sun: { id: "sun", label: "So", weekdayIndex: 0 },
};

export default function ActivePage() {
  const { entries, ready, update, requestRating, markWatching, getEntry, isPending } = useWatchlist();
  const { openDetails } = useAnimeDetail();
  const { openSearch } = useCommandSearch();

  const [activeTab, setActiveTab] = useState<ActiveTab>("my-watching");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));

  // Airing-Daten für die Serien des Nutzers
  const [userAiringMap, setUserAiringMap] = useState<Map<number, AnimeSearchResult>>(() => new Map());
  const [loadingUserAiring, setLoadingUserAiring] = useState(false);

  // Airing-Daten für den gesamten Season-Sendeplan
  const [seasonAiring, setSeasonAiring] = useState<AnimeSearchResult[]>([]);
  const [loadingSeasonAiring, setLoadingSeasonAiring] = useState(true);

  // Live-Countdown Ticker alle 10 Sekunden
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Alle Einträge, die der Nutzer als "watching" markiert hat
  const watchingEntries = useMemo(() => {
    return entries.filter((entry) => entry.status === "watching");
  }, [entries]);

  // IDs der aktiven Serien abrufen
  const watchingIds = useMemo(() => {
    return watchingEntries.map((e) => e.anilist_id);
  }, [watchingEntries]);

  // Lade Live-Airing-Daten für die Serien des Nutzers
  useEffect(() => {
    if (watchingIds.length === 0) return;

    const controller = new AbortController();

    api
      .airing(watchingIds, watchingIds.length, controller.signal)
      .then((results) => {
        const map = new Map<number, AnimeSearchResult>();
        for (const item of results) {
          map.set(item.anilist_id, item);
        }
        setUserAiringMap(map);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Fehler beim Laden der Sendedaten:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingUserAiring(false);
      });

    return () => controller.abort();
  }, [watchingIds]);

  // Lade aktuellen Season-Sendeplan
  useEffect(() => {
    const controller = new AbortController();

    api
      .airing(undefined, 40, controller.signal)
      .then((results) => {
        setSeasonAiring(results);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Fehler beim Laden des Sendeplans:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSeasonAiring(false);
      });

    return () => controller.abort();
  }, []);

  // Sortierte aktive Serien (nächste Folge zeitlich zuerst)
  const sortedWatchingWithAiring = useMemo(() => {
    return [...watchingEntries].sort((a, b) => {
      const airingA = userAiringMap.get(a.anilist_id)?.next_airing;
      const airingB = userAiringMap.get(b.anilist_id)?.next_airing;

      if (airingA && airingB) {
        return airingA.airing_at - airingB.airing_at;
      }
      if (airingA && !airingB) return -1;
      if (!airingA && airingB) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [watchingEntries, userAiringMap]);

  // Gefilterter Season-Sendeplan
  const filteredSeasonAiring = useMemo(() => {
    if (dayFilter === "all") return seasonAiring;

    const todayDate = new Date();

    return seasonAiring.filter((anime) => {
      if (!anime.next_airing) return false;
      const airDate = new Date(anime.next_airing.airing_at * 1000);

      if (dayFilter === "today") {
        return airDate.toDateString() === todayDate.toDateString();
      }

      const targetDayIndex = DAY_LABELS[dayFilter].weekdayIndex;
      return airDate.getDay() === targetDayIndex;
    });
  }, [seasonAiring, dayFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Bereich */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ClockIcon width={18} height={18} />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
              Active · Sendeplan & Countdown
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Verfolge Serien, die du gerade schaust, und sieh genau, wie lange es noch bis zur nächsten Folge ist.
          </p>
        </div>

        {/* Tab Umschalter: Meine Serien vs. Season Sendeplan */}
        <div className="inline-flex rounded-full border border-border bg-card/70 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("my-watching")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
              activeTab === "my-watching"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PlayIcon width={12} height={12} className="fill-current" />
            <span>Meine Serien ({watchingEntries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
              activeTab === "schedule"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarIcon width={12} height={12} />
            <span>Season Simulcasts</span>
          </button>
        </div>
      </div>

      {/* 1. TAB: Meine aktiven Serien */}
      {activeTab === "my-watching" && (
        <section className="space-y-4">
          {!ready || loadingUserAiring ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-32 animate-pulse rounded-2xl bg-muted/50 border border-border/50" />
              ))}
            </div>
          ) : watchingEntries.length === 0 ? (
            <EmptyState
              icon={<PlayIcon width={32} height={32} className="text-sky-400" />}
              title="Keine Serien als „Schaue ich“ markiert"
              description="Markiere Anime mit dem Play-Button (Schaue ich), um hier Live-Countdowns zur nächsten Folge und deinen Episoden-Fortschritt zu sehen."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("schedule")}>Season-Sendeplan durchstöbern</Button>
                  <Button variant="secondary" onClick={() => openSearch()}>
                    Anime suchen
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {sortedWatchingWithAiring.map((entry) => {
                const airingData = userAiringMap.get(entry.anilist_id);
                const nextAiring = airingData?.next_airing;
                const totalEpisodes = airingData?.episodes;
                const secondsUntil = nextAiring ? nextAiring.airing_at - now : null;

                return (
                  <article
                    key={entry.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-3.5 shadow-sm transition hover:border-sky-500/40 hover:bg-card"
                  >
                    <div className="flex gap-3.5">
                      {/* Poster mit Klick zum Modal */}
                      <div
                        className="cursor-pointer shrink-0"
                        onClick={() =>
                          openDetails({
                            anilist_id: entry.anilist_id,
                            title: entry.title,
                            cover_image: entry.cover_image,
                          })
                        }
                      >
                        <Poster
                          src={entry.cover_image}
                          alt={entry.title}
                          sizes="80px"
                          className="h-28 w-20 rounded-xl ring-1 ring-border shadow-md transition group-hover:scale-102"
                        />
                      </div>

                      {/* Inhalt */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h2
                            onClick={() =>
                              openDetails({
                                anilist_id: entry.anilist_id,
                                title: entry.title,
                                cover_image: entry.cover_image,
                              })
                            }
                            title={entry.title}
                            className="cursor-pointer line-clamp-1 text-sm font-semibold text-foreground transition hover:text-sky-400"
                          >
                            {entry.title}
                          </h2>
                          {entry.user_rating && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                              <StarIcon width={10} height={10} className="fill-current text-amber-400" />
                              {entry.user_rating}/10
                            </span>
                          )}
                        </div>

                        {/* Nächste Folge & Live-Countdown */}
                        {nextAiring && secondsUntil !== null ? (
                          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-sky-300">
                                Folge {nextAiring.episode}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                <ClockIcon width={10} height={10} />
                                {formatCountdown(secondsUntil)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {formatAiringDateTime(nextAiring.airing_at)}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
                            {airingData?.status === "FINISHED"
                              ? "Bereits komplett ausgestrahlt"
                              : "Keine Ausstrahlungsdaten bekannt"}
                          </div>
                        )}

                        {/* Fortschritts-Zähler */}
                        <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                          <span className="text-muted-foreground">
                            Folge <strong className="text-foreground">{entry.episodes_watched}</strong>
                            {totalEpisodes ? ` von ${totalEpisodes}` : ""} gesehen
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                void update(entry, {
                                  episodes_watched: Math.max(0, entry.episodes_watched - 1),
                                })
                              }
                              disabled={entry.episodes_watched <= 0}
                              aria-label="Eine Folge zurück"
                              className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                            >
                              <MinusIcon width={12} height={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void update(entry, {
                                  episodes_watched: entry.episodes_watched + 1,
                                })
                              }
                              aria-label="Eine Folge vor"
                              className="grid size-7 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-sky-300 transition hover:bg-sky-500/25 hover:text-white"
                            >
                              <PlusIcon width={12} height={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          openDetails({
                            anilist_id: entry.anilist_id,
                            title: entry.title,
                            cover_image: entry.cover_image,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-sky-300 transition"
                      >
                        <SparklesIcon width={12} height={12} />
                        Details ansehen
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          requestRating({
                            anilist_id: entry.anilist_id,
                            title: entry.title,
                            cover_image: entry.cover_image,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
                      >
                        <EyeIcon width={12} height={12} />
                        <span>Fertig / Bewerten</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 2. TAB: Aktuelle Season Simulcasts Sendeplan */}
      {activeTab === "schedule" && (
        <section className="space-y-4">
          {/* Wochentag-Filterleiste */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-card/60 p-1.5">
            {(
              [
                "all",
                "today",
                "mon",
                "tue",
                "wed",
                "thu",
                "fri",
                "sat",
                "sun",
              ] as DayFilter[]
            ).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setDayFilter(day)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition active:scale-95",
                  dayFilter === day
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {DAY_LABELS[day].label}
              </button>
            ))}
          </div>

          {loadingSeasonAiring ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-40 animate-pulse rounded-2xl bg-muted/50 border border-border/50" />
              ))}
            </div>
          ) : filteredSeasonAiring.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon width={32} height={32} />}
              title="Keine Ausstrahlungen an diesem Tag"
              description="Für den ausgewählten Wochentag wurden keine laufenden Folgen gefunden."
              action={<Button onClick={() => setDayFilter("all")}>Alle Tage anzeigen</Button>}
            />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {filteredSeasonAiring.map((anime) => {
                const nextAiring = anime.next_airing;
                const secondsUntil = nextAiring ? nextAiring.airing_at - now : null;
                const entry = getEntry(anime.anilist_id);
                const isWatching = entry?.status === "watching";
                const busy = isPending(anime.anilist_id);

                return (
                  <article
                    key={anime.anilist_id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-3.5 shadow-sm transition hover:border-border-strong hover:bg-card"
                  >
                    <div>
                      <div className="flex gap-3">
                        <div
                          className="cursor-pointer shrink-0"
                          onClick={() =>
                            openDetails({
                              anilist_id: anime.anilist_id,
                              title: anime.title,
                              cover_image: anime.cover_image,
                            })
                          }
                        >
                          <Poster
                            src={anime.cover_image}
                            alt={anime.title}
                            sizes="64px"
                            className="h-24 w-16 rounded-xl ring-1 ring-border transition group-hover:scale-102"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h3
                            onClick={() =>
                              openDetails({
                                anilist_id: anime.anilist_id,
                                title: anime.title,
                                cover_image: anime.cover_image,
                              })
                            }
                            title={anime.title}
                            className="cursor-pointer line-clamp-2 text-xs font-semibold leading-snug text-foreground transition hover:text-sky-400"
                          >
                            {anime.title}
                          </h3>

                          {anime.score && (
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <StarIcon width={10} height={10} className="fill-current text-amber-400" />
                              <span>{formatScore(anime.score)}</span>
                            </div>
                          )}

                          {nextAiring && (
                            <p className="text-[11px] font-semibold text-sky-300">
                              Folge {nextAiring.episode}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Countdown Box */}
                      {nextAiring && secondsUntil !== null && (
                        <div className="mt-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 p-2 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] text-muted-foreground truncate">
                              {formatAiringDateTime(nextAiring.airing_at)}
                            </span>
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                              <ClockIcon width={9} height={9} />
                              {formatShortCountdown(secondsUntil)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Button: Zu "Schaue ich" hinzufügen */}
                    <div className="mt-3 border-t border-border/60 pt-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void markWatching(anime)}
                        className={cn(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-60",
                          isWatching
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "bg-muted/70 text-foreground hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/30 border border-transparent",
                        )}
                      >
                        {busy ? (
                          <SpinnerIcon width={14} height={14} />
                        ) : isWatching ? (
                          <>
                            <CheckIcon width={13} height={13} />
                            <span>Wird geschaut</span>
                          </>
                        ) : (
                          <>
                            <PlayIcon width={12} height={12} className="fill-current" />
                            <span>Schaue ich</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
