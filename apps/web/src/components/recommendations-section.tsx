"use client";

import { useEffect, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { api, AnimeSearchResult } from "@/lib/api";

type RecommendationsSectionProps = {
  onAddToList: (anime: AnimeSearchResult) => Promise<void>;
  listCount: number;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function RecommendationsSection({ onAddToList, listCount }: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
        return api.recommendations(10, controller.signal);
      })
      .then((data) => {
        setRecommendations(data);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setError(err instanceof Error ? err.message : "Empfehlungen konnten nicht geladen werden.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [listCount]);

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
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text">Ähnliche Anime</h2>
          <p className="mt-1 text-sm text-text-muted">
            Basierend auf deiner Watchlist, ohne bereits gelistete Titel.
          </p>
        </div>
        {loading && <span className="text-sm font-medium text-accent animate-pulse">Lädt ...</span>}
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-secondary bg-surface px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <p className="rounded-md border border-secondary/50 bg-surface/40 p-6 text-center text-sm text-text-muted">
          Füge zuerst Anime zu deiner Liste hinzu, um personalisierte Empfehlungen zu erhalten.
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="flex snap-x gap-5 overflow-x-auto pb-4 pt-1">
          {recommendations.map((anime) => (
            <div key={anime.anilist_id} className="w-72 shrink-0 snap-start">
              <AnimeCard
                title={anime.title}
                cover={anime.cover_image ?? "/window.svg"}
                score={anime.score}
                loading={addingId === anime.anilist_id}
                disabled={addingId !== null && addingId !== anime.anilist_id}
                onAction={() => void handleAdd(anime)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
