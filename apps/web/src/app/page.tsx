"use client";

import { useEffect, useState } from "react";
import { AnimeAsk } from "@/components/anime-ask";
import { AnimeSearch } from "@/components/anime-search";
import { AuthCard } from "@/components/auth-card";
import { RecommendationsSection } from "@/components/recommendations-section";
import { SeasonalSection } from "@/components/seasonal-section";
import { WatchlistSection } from "@/components/watchlist-section";
import { api, AnimeEntry, AnimeSearchResult, User } from "@/lib/api";

type StatusType = "all" | "watching" | "completed" | "planned" | "paused" | "dropped";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<AnimeEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function notify(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  useEffect(() => {
    void api.me().then(setUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void api
      .entries(statusFilter === "all" ? undefined : statusFilter, controller.signal)
      .then(setEntries)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        notify("Watchlist konnte nicht geladen werden.", true);
      });
    return () => controller.abort();
  }, [user, statusFilter]);

  async function handleAddToList(anime: AnimeSearchResult) {
    if (!user) {
      notify("Bitte zuerst anmelden.", true);
      return;
    }
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
          Suche Anime, speichere deinen Status, entdecke saisonale Trends und behalte deine Bewertungen an einem Ort.
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

      {/* Suche & Authentifizierung */}
      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <AnimeSearch
          user={user}
          onAddToList={handleAddToList}
          onError={(err) => notify(err, true)}
        />
        <AuthCard
          user={user}
          onLoginSuccess={(nextUser) => {
            setUser(nextUser);
            notify(`Willkommen zurück, ${nextUser.username}!`);
          }}
          onLogoutSuccess={() => {
            setUser(null);
            setEntries([]);
            notify("Erfolgreich abgemeldet.");
          }}
          onError={(err) => notify(err, true)}
        />
      </section>

      {/* Saisonale Übersicht */}
      <SeasonalSection
        user={user}
        onAddToList={handleAddToList}
        onError={(err) => notify(err, true)}
      />

      {/* Personalisierte Empfehlungen */}
      <RecommendationsSection
        user={user}
        onAddToList={handleAddToList}
        listCount={entries.length}
      />

      {/* KI-Assistent Anime Ask */}
      <AnimeAsk
        user={user}
        onError={(err) => notify(err, true)}
      />

      {/* Persönliche Watchlist */}
      {user && (
        <WatchlistSection
          entries={entries}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onMarkCompleted={handleMarkCompleted}
        />
      )}
    </main>
  );
}
