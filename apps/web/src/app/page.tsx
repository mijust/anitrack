"use client";

import { useEffect, useState } from "react";
import { AnimeAsk } from "@/components/anime-ask";
import { AnimeSearch } from "@/components/anime-search";
import { RecommendationsSection } from "@/components/recommendations-section";
import { SeasonalSection } from "@/components/seasonal-section";
import { WatchlistSection } from "@/components/watchlist-section";
import { api, AnimeEntry, AnimeSearchResult } from "@/lib/api";

type StatusType = "all" | "watching" | "completed" | "planned" | "paused" | "dropped";

export default function Home() {
  const [entries, setEntries] = useState<AnimeEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function notify(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  useEffect(() => {
    const controller = new AbortController();
    void api
      .entries(statusFilter === "all" ? undefined : statusFilter, controller.signal)
      .then(setEntries)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        notify("Watchlist konnte nicht geladen werden.", true);
      });
    return () => controller.abort();
  }, [statusFilter]);

  async function handleAddToList(anime: AnimeSearchResult) {
    try {
      await api.createEntry(anime);
      notify(`${anime.title} wurde zur Liste hinzugefügt.`);
      const updated = await api.entries(statusFilter === "all" ? undefined : statusFilter);
      setEntries(updated);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Anime konnte nicht gespeichert werden.", true);
    }
  }

  async function handleMarkCompleted(entry: AnimeEntry) {
    try {
      const updated = await api.updateEntry(entry.id, { status: "completed" });
      setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notify(`${entry.title} als abgeschlossen markiert.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Eintrag konnte nicht aktualisiert werden.", true);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:px-10">
      <header className="border-b border-secondary/50 pb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Anime Tracker</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text">Deine Watchlist</h1>
        <p className="mt-3 max-w-xl text-base text-text-muted">
          Suche Anime, verwalte deinen Watchlist-Status, entdecke saisonale Trends und erhalte KI-Empfehlungen direkt in deinem Heimnetzwerk.
        </p>
      </header>

      {message && (
        <div
          role="alert"
          className={`mt-6 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
            isError
              ? "border-red-500/50 bg-red-950/20 text-red-300"
              : "border-secondary bg-surface text-accent"
          }`}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-4 text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Anime Suche */}
      <section className="py-10">
        <AnimeSearch
          onAddToList={handleAddToList}
          onError={(err) => notify(err, true)}
        />
      </section>

      {/* Saisonale Übersicht */}
      <SeasonalSection
        onAddToList={handleAddToList}
        onError={(err) => notify(err, true)}
      />

      {/* Personalisierte Empfehlungen */}
      <RecommendationsSection
        onAddToList={handleAddToList}
        listCount={entries.length}
      />

      {/* KI-Assistent Anime Ask */}
      <AnimeAsk
        onError={(err) => notify(err, true)}
      />

      {/* Persönliche Watchlist */}
      <WatchlistSection
        entries={entries}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onMarkCompleted={handleMarkCompleted}
      />
    </main>
  );
}
