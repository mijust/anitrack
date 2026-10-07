"use client";

import { useRef, useState, useTransition } from "react";
import { AnimeCard } from "@/components/anime-card";
import { SeasonSelection, SeasonSelector } from "@/components/season-selector";
import { api, AnimeSearchResult } from "@/lib/api";

type SeasonalSectionProps = {
  onAddToList: (anime: AnimeSearchResult) => Promise<void>;
  onError: (message: string) => void;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function SeasonalSection({ onAddToList, onError }: SeasonalSectionProps) {
  const [seasonalResults, setSeasonalResults] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const seasonController = useRef<AbortController | null>(null);

  async function handleSeasonChange(selection: SeasonSelection) {
    setLoading(true);
    seasonController.current?.abort();
    const controller = new AbortController();
    seasonController.current = controller;

    try {
      const nextResults = await api.seasonal(selection, undefined, controller.signal);
      startTransition(() => setSeasonalResults(nextResults));
    } catch (error) {
      if (!isAbortError(error)) {
        onError(error instanceof Error ? error.message : "Saison konnte nicht geladen werden.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  async function handleAdd(anime: AnimeSearchResult) {
    setAddingId(anime.anilist_id);
    try {
      await onAddToList(anime);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="border-t border-secondary/50 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text">Saisonale Übersicht</h2>
          <p className="mt-1 text-sm text-text-muted">Entdecke die beliebtesten Anime einer Saison.</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className="text-sm font-medium text-accent animate-pulse">Lädt ...</span>}
          <SeasonSelector onSelect={(selection) => void handleSeasonChange(selection)} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {seasonalResults.map((anime) => (
          <AnimeCard
            key={anime.anilist_id}
            title={anime.title}
            cover={anime.cover_image ?? "/window.svg"}
            score={anime.score}
            loading={addingId === anime.anilist_id}
            disabled={addingId !== null && addingId !== anime.anilist_id}
            onAction={() => void handleAdd(anime)}
          />
        ))}
        {!loading && seasonalResults.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-text-muted">
            Wähle eine Saison aus, um die beliebtesten Anime zu laden.
          </p>
        )}
      </div>
    </section>
  );
}
