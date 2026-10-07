"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { api, AnimeEntry, AnimeSearchResult } from "@/lib/api";
import { errorMessage, isAbortError } from "@/lib/utils";

type EntryPatch = Partial<Pick<AnimeEntry, "status" | "user_rating" | "episodes_watched" | "notes">>;
type Addable = Pick<AnimeSearchResult, "anilist_id" | "title" | "cover_image">;

type WatchlistContextValue = {
  entries: AnimeEntry[];
  ready: boolean;
  loadError: string | null;
  isInList: (anilistId: number) => boolean;
  isPending: (anilistId: number) => boolean;
  add: (anime: Addable) => Promise<void>;
  update: (entry: AnimeEntry, patch: EntryPatch) => Promise<void>;
  remove: (entry: AnimeEntry) => Promise<void>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function byRecent(a: AnimeEntry, b: AnimeEntry) {
  return b.updated_at.localeCompare(a.updated_at);
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [entries, setEntries] = useState<AnimeEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const controller = new AbortController();
    api
      .entries(undefined, controller.signal)
      .then((data) => {
        setEntries([...data].sort(byRecent));
        setReady(true);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setLoadError("Deine Liste konnte nicht geladen werden. Läuft die API?");
        setReady(true);
      });
    return () => controller.abort();
  }, []);

  const listedIds = useMemo(() => new Set(entries.map((entry) => entry.anilist_id)), [entries]);

  const setPendingFlag = useCallback((id: number, on: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const add = useCallback(
    async (anime: Addable) => {
      if (listedIds.has(anime.anilist_id)) return;
      setPendingFlag(anime.anilist_id, true);
      try {
        const created = await api.createEntry(anime);
        setEntries((current) => [created, ...current]);
        toast(`„${anime.title}“ gemerkt`, { tone: "success" });
      } catch (error) {
        toast(errorMessage(error, "Konnte nicht gespeichert werden."), { tone: "error" });
      } finally {
        setPendingFlag(anime.anilist_id, false);
      }
    },
    [listedIds, setPendingFlag, toast],
  );

  const update = useCallback(
    async (entry: AnimeEntry, patch: EntryPatch) => {
      const optimistic = { ...entry, ...patch, updated_at: new Date().toISOString() };
      setEntries((current) => current.map((item) => (item.id === entry.id ? optimistic : item)));
      try {
        const saved = await api.updateEntry(entry.id, patch);
        setEntries((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      } catch (error) {
        setEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
        toast(errorMessage(error, "Änderung konnte nicht gespeichert werden."), { tone: "error" });
      }
    },
    [toast],
  );

  const remove = useCallback(
    async (entry: AnimeEntry) => {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      try {
        await api.deleteEntry(entry.id);
        toast(`„${entry.title}“ entfernt`, {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void api
                .createEntry(entry, {
                  status: entry.status,
                  user_rating: entry.user_rating,
                  episodes_watched: entry.episodes_watched,
                  notes: entry.notes,
                })
                .then((restored) => setEntries((current) => [restored, ...current].sort(byRecent)))
                .catch((error) => toast(errorMessage(error, "Wiederherstellen fehlgeschlagen."), { tone: "error" }));
            },
          },
        });
      } catch (error) {
        setEntries((current) => [entry, ...current].sort(byRecent));
        toast(errorMessage(error, "Konnte nicht entfernt werden."), { tone: "error" });
      }
    },
    [toast],
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      entries,
      ready,
      loadError,
      isInList: (id) => listedIds.has(id),
      isPending: (id) => pending.has(id),
      add,
      update,
      remove,
    }),
    [entries, ready, loadError, listedIds, pending, add, update, remove],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used within WatchlistProvider");
  return context;
}
