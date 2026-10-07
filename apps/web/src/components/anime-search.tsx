"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { AnimeCard } from "@/components/anime-card";
import { api, AnimeSearchResult, User } from "@/lib/api";

type AnimeSearchProps = {
  user: User | null;
  onAddToList: (anime: AnimeSearchResult) => Promise<void>;
  onError: (message: string) => void;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function AnimeSearch({ user, onAddToList, onError }: AnimeSearchProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const searchController = useRef<AbortController | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      onError("Bitte mindestens zwei Suchzeichen eingeben.");
      return;
    }

    setLoading(true);
    setSubmittedQuery(trimmed);
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;

    try {
      const nextResults = await api.search(trimmed, controller.signal);
      startTransition(() => setResults(nextResults));
    } catch (error) {
      if (!isAbortError(error)) {
        onError(error instanceof Error ? error.message : "Suche fehlgeschlagen.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  async function handleAdd(anime: AnimeSearchResult) {
    if (!user) {
      onError("Bitte zuerst anmelden, um Anime zu deiner Watchlist hinzuzufügen.");
      return;
    }
    setAddingId(anime.anilist_id);
    try {
      await onAddToList(anime);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text">Anime suchen</h2>
          <p className="mt-1 text-sm text-text-muted">Die Ergebnisse kommen direkt aus AniList.</p>
        </div>
        {loading && <span className="text-sm font-medium text-accent animate-pulse">Lädt ...</span>}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="z. B. Frieren oder One Piece"
          className="min-h-11 flex-1 rounded-md border border-secondary bg-surface px-4 text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-md bg-primary px-5 font-semibold text-background transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          Suchen
        </button>
      </form>

      {submittedQuery && !loading && results.length === 0 && (
        <p className="mt-6 rounded-md border border-secondary/50 bg-surface/50 p-6 text-center text-sm text-text-muted">
          Keine Anime für &quot;{submittedQuery}&quot; gefunden.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {results.map((anime) => (
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
        </div>
      )}
    </div>
  );
}
