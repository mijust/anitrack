"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimeCard, AnimeCardSkeleton, Poster } from "@/components/anime-card";
import { SearchTrigger } from "@/components/command-search";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SparklesIcon } from "@/components/icons";
import { EmptyState, Rail, SectionHeader } from "@/components/ui";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeSearchResult } from "@/lib/api";
import { currentSeason, errorMessage, isAbortError, parseSeasonKey, seasonKey, seasonLabel, shiftSeason, STATUS_META } from "@/lib/utils";

type Loaded<T> = { key: string; data: T; error: string | null };

export default function DiscoverPage() {
  return (
    <div className="space-y-14">
      <Hero />
      <ContinueWatching />
      <ForYou />
      <SeasonGrid />
    </div>
  );
}

function Hero() {
  const { entries } = useWatchlist();
  const count = (status: keyof typeof STATUS_META) => entries.filter((entry) => entry.status === status).length;
  const stats = [
    { label: STATUS_META.watching.label, value: count("watching"), dot: STATUS_META.watching.dot },
    { label: STATUS_META.planned.label, value: count("planned"), dot: STATUS_META.planned.dot },
    { label: STATUS_META.completed.label, value: count("completed"), dot: STATUS_META.completed.dot },
  ];

  return (
    <section className="animate-enter relative mx-auto max-w-3xl pt-4 text-center sm:pt-8">
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
        Was schaust du als{" "}
        <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
          Nächstes
        </span>
        ?
      </h1>
      <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-muted-foreground sm:text-base">
        Suchen, merken, Fortschritt tracken – und dir von der KI etwas Neues empfehlen lassen.
      </p>
      <SearchTrigger large className="mx-auto mt-8 max-w-xl shadow-xl shadow-black/5" />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href="/liste"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3.5 py-1 text-xs text-muted-foreground transition hover:border-border-strong hover:bg-card hover:text-foreground"
          >
            <span className={`size-1.5 rounded-full ${stat.dot}`} />
            <span className="font-semibold tabular-nums text-foreground">{stat.value}</span>
            <span>{stat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContinueWatching() {
  const { entries, update } = useWatchlist();
  const watching = entries.filter((entry) => entry.status === "watching");
  if (watching.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Weiterschauen"
        description="Ein Klick auf + zählt die nächste Folge."
        action={
          <Link href="/liste" className="text-xs font-medium text-muted-foreground hover:text-foreground transition">
            Alle ansehen →
          </Link>
        }
      />
      <Rail label="Weiterschauen">
        {watching.map((entry) => (
          <div
            key={entry.id}
            className="group flex w-72 shrink-0 snap-start items-center gap-3 rounded-2xl border border-border bg-card/60 p-2.5 pr-3 transition-colors hover:border-border-strong hover:bg-card"
          >
            <Poster src={entry.cover_image} alt={entry.title} sizes="48px" className="h-[72px] w-12 shrink-0 rounded-lg ring-1 ring-border" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-snug">{entry.title}</p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {entry.episodes_watched > 0 ? `Folge ${entry.episodes_watched} gesehen` : "Noch nicht begonnen"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void update(entry, { episodes_watched: entry.episodes_watched + 1 })}
              title="Nächste Folge"
              aria-label={`Folge ${entry.episodes_watched + 1} von ${entry.title} als gesehen markieren`}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-muted/80 text-foreground transition hover:bg-indigo-600 hover:text-white active:scale-95"
            >
              <PlusIcon width={14} height={14} />
            </button>
          </div>
        ))}
      </Rail>
    </section>
  );
}

function ForYou() {
  const { entries, ready, isDismissed } = useWatchlist();
  const activeEntries = entries.filter((e) => e.status !== "dismissed");
  const key = `${activeEntries.length}-${entries.length}`;
  const [state, setState] = useState<Loaded<AnimeSearchResult[]> | null>(null);

  useEffect(() => {
    if (!ready || activeEntries.length === 0) return;
    const controller = new AbortController();
    api
      .recommendations(12, controller.signal)
      .then((data) => setState({ key, data, error: null }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ key, data: [], error: errorMessage(error, "Empfehlungen nicht verfügbar.") });
      });
    return () => controller.abort();
  }, [key, ready, activeEntries.length]);

  if (ready && activeEntries.length === 0) {
    return (
      <section>
        <SectionHeader title="Für dich" />
        <EmptyState
          icon={<SparklesIcon />}
          title="Noch keine Empfehlungen"
          description="Merke dir ein paar Anime – dann schlagen wir dir hier passende Titel vor."
        />
      </section>
    );
  }

  const visibleData = (state?.data ?? []).filter((anime) => !isDismissed(anime.anilist_id));
  const loading = !state || (state.key !== key && visibleData.length === 0);
  if (state?.error && visibleData.length === 0) return null;
  if (!loading && visibleData.length === 0 && activeEntries.length > 0) return null;

  return (
    <section>
      <SectionHeader title="Für dich" description="Ähnlich zu dem, was auf deiner Liste steht." />
      <Rail label="Empfehlungen">
        {loading
          ? Array.from({ length: 7 }, (_, index) => <AnimeCardSkeleton key={index} className="w-36 shrink-0 sm:w-44" />)
          : visibleData.map((anime) => (
              <AnimeCard key={anime.anilist_id} anime={anime} className="w-36 shrink-0 snap-start sm:w-44" />
            ))}
      </Rail>
    </section>
  );
}

const noopSubscribe = () => () => {};

/** Aktuelle Saison nur im Browser bestimmen (kein Date während des Prerenderings). */
function useCurrentSeasonKey(): string | null {
  return useSyncExternalStore(noopSubscribe, () => seasonKey(currentSeason()), () => null);
}

function SeasonGrid() {
  const nowKey = useCurrentSeasonKey();
  const [offset, setOffset] = useState(0);
  const selection = nowKey ? shiftSeason(parseSeasonKey(nowKey), offset) : null;
  const key = selection ? seasonKey(selection) : null;
  const [state, setState] = useState<Loaded<AnimeSearchResult[]> | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    api
      .seasonal(parseSeasonKey(key), undefined, controller.signal)
      .then((data) => setState({ key, data, error: null }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ key, data: [], error: errorMessage(error, "Saison konnte nicht geladen werden.") });
      });
    return () => controller.abort();
  }, [key]);

  const loading = !state || state.key !== key;

  return (
    <section>
      <SectionHeader
        title={offset === 0 ? "Diese Saison" : selection ? seasonLabel(selection) : "Saison"}
        description={offset === 0 && selection ? `Die beliebtesten Anime im ${seasonLabel(selection)}.` : "Die beliebtesten Anime dieser Saison."}
        action={
          <div className="flex items-center gap-1 rounded-full border border-border p-1">
            <button
              type="button"
              onClick={() => setOffset((value) => value - 1)}
              aria-label="Vorherige Saison"
              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <span className="min-w-28 text-center text-sm font-medium tabular-nums">
              {selection ? seasonLabel(selection) : "…"}
            </span>
            <button
              type="button"
              onClick={() => setOffset((value) => value + 1)}
              disabled={offset >= 1}
              aria-label="Nächste Saison"
              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRightIcon width={16} height={16} />
            </button>
          </div>
        }
      />

      {state?.error && !loading ? (
        <p className="rounded-2xl border border-border p-6 text-center text-sm text-danger">{state.error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {loading
            ? Array.from({ length: 12 }, (_, index) => <AnimeCardSkeleton key={index} />)
            : state.data.map((anime) => <AnimeCard key={anime.anilist_id} anime={anime} className="animate-enter" />)}
        </div>
      )}
    </section>
  );
}
