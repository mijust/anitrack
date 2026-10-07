"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RatingDialog } from "@/components/rating-dialog";
import { useToast } from "@/components/toast";
import { api, AnimeEntry, AnimeSearchResult } from "@/lib/api";
import { errorMessage, isAbortError } from "@/lib/utils";

type EntryPatch = Partial<Pick<AnimeEntry, "status" | "user_rating" | "episodes_watched" | "notes">>;
export type Addable = Pick<AnimeSearchResult, "anilist_id" | "title" | "cover_image">;

type WatchlistContextValue = {
  entries: AnimeEntry[];
  ready: boolean;
  loadError: string | null;
  getEntry: (anilistId: number) => AnimeEntry | undefined;
  isInList: (anilistId: number) => boolean;
  isDismissed: (anilistId: number) => boolean;
  isPending: (anilistId: number) => boolean;
  add: (anime: Addable) => Promise<void>;
  addToWatchlist: (anime: Addable) => Promise<void>;
  markWatched: (anime: Addable, rating?: number | null) => Promise<void>;
  dismiss: (anime: Addable) => Promise<void>;
  update: (entry: AnimeEntry, patch: EntryPatch) => Promise<void>;
  remove: (entry: AnimeEntry) => Promise<void>;
  requestRating: (anime: Addable) => void;
  addAllToWatchlist: (animes: Addable[]) => Promise<void>;
  groupSeasons: boolean;
  setGroupSeasons: (value: boolean) => void;
  toggleGroupSeasons: () => void;
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
  const [ratingTarget, setRatingTarget] = useState<Addable & { initialRating?: number | null } | null>(null);
  const [groupSeasons, setGroupSeasonsState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("anitrack_group_seasons");
    return stored === null ? true : stored === "true";
  });

  const setGroupSeasons = useCallback((val: boolean) => {
    setGroupSeasonsState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("anitrack_group_seasons", String(val));
    }
  }, []);

  const toggleGroupSeasons = useCallback(() => {
    setGroupSeasonsState((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        localStorage.setItem("anitrack_group_seasons", String(next));
      }
      return next;
    });
  }, []);

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

  const entryMap = useMemo(() => new Map(entries.map((entry) => [entry.anilist_id, entry])), [entries]);

  const setPendingFlag = useCallback((id: number, on: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

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

  const addWithStatus = useCallback(
    async (
      anime: Addable,
      status: AnimeEntry["status"],
      rating?: number | null,
      successMessage?: string,
      withUndo?: boolean,
    ) => {
      const existing = entryMap.get(anime.anilist_id);
      setPendingFlag(anime.anilist_id, true);
      try {
        if (existing) {
          const patch: EntryPatch = { status };
          if (rating !== undefined) patch.user_rating = rating;
          await update(existing, patch);
        } else {
          const created = await api.createEntry(anime, {
            status,
            user_rating: rating ?? undefined,
          });
          setEntries((current) => [created, ...current]);
        }

        if (successMessage) {
          toast(successMessage, {
            tone: "success",
            action: withUndo
              ? {
                  label: "Rückgängig",
                  onClick: () => {
                    const toDelete = entryMap.get(anime.anilist_id);
                    if (toDelete) void remove(toDelete);
                  },
                }
              : undefined,
          });
        }
      } catch (error) {
        toast(errorMessage(error, "Konnte nicht gespeichert werden."), { tone: "error" });
      } finally {
        setPendingFlag(anime.anilist_id, false);
      }
    },
    [entryMap, setPendingFlag, update, remove, toast],
  );

  const addToWatchlist = useCallback(
    async (anime: Addable) => {
      await addWithStatus(anime, "planned", undefined, `„${anime.title}“ zur Watchlist hinzugefügt`);
    },
    [addWithStatus],
  );

  const markWatched = useCallback(
    async (anime: Addable, rating?: number | null) => {
      const ratingText = rating !== null && rating !== undefined ? ` (${rating}/10 Sterne)` : "";
      await addWithStatus(anime, "completed", rating, `„${anime.title}“ als gesehen markiert${ratingText}`);
    },
    [addWithStatus],
  );

  const dismiss = useCallback(
    async (anime: Addable) => {
      await addWithStatus(
        anime,
        "dismissed",
        null,
        `„${anime.title}“ wird nicht mehr vorgeschlagen`,
        true,
      );
    },
    [addWithStatus],
  );

  const requestRating = useCallback(
    (anime: Addable) => {
      const existing = entryMap.get(anime.anilist_id);
      setRatingTarget({ ...anime, initialRating: existing?.user_rating });
    },
    [entryMap],
  );

  const handleRatingSave = useCallback(
    (target: Addable, rating: number | null) => {
      setRatingTarget(null);
      void markWatched(target, rating);
    },
    [markWatched],
  );

  const addAllToWatchlist = useCallback(
    async (animes: Addable[]) => {
      const needed = animes.filter((a) => !entryMap.has(a.anilist_id));
      if (needed.length === 0) {
        toast("Alle Staffeln sind bereits auf deiner Liste.");
        return;
      }
      let addedCount = 0;
      for (const item of needed) {
        try {
          const created = await api.createEntry(item, { status: "planned" });
          setEntries((current) => [created, ...current]);
          addedCount++;
        } catch {
          // continue with others
        }
      }
      toast(`${addedCount} Staffel${addedCount === 1 ? "" : "n"} zur Watchlist hinzugefügt`, {
        tone: "success",
      });
    },
    [entryMap, toast],
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      entries,
      ready,
      loadError,
      getEntry: (id) => entryMap.get(id),
      isInList: (id) => {
        const item = entryMap.get(id);
        return Boolean(item && item.status !== "dismissed");
      },
      isDismissed: (id) => {
        const item = entryMap.get(id);
        return Boolean(item && item.status === "dismissed");
      },
      isPending: (id) => pending.has(id),
      add: addToWatchlist,
      addToWatchlist,
      markWatched,
      dismiss,
      update,
      remove,
      requestRating,
      addAllToWatchlist,
      groupSeasons,
      setGroupSeasons,
      toggleGroupSeasons,
    }),
    [
      entries,
      ready,
      loadError,
      entryMap,
      pending,
      addToWatchlist,
      markWatched,
      dismiss,
      update,
      remove,
      requestRating,
      addAllToWatchlist,
      groupSeasons,
      setGroupSeasons,
      toggleGroupSeasons,
    ],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
      <RatingDialog
        target={ratingTarget}
        onSave={handleRatingSave}
        onClose={() => setRatingTarget(null)}
      />
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used within WatchlistProvider");
  return context;
}
