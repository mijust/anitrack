"use client";

import Image from "next/image";
import {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BanIcon,
  BookmarkIcon,
  CheckIcon,
  EyeIcon,
  SearchIcon,
  SpinnerIcon,
  StarIcon,
} from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeSearchResult } from "@/lib/api";
import { cn, errorMessage, formatScore, isAbortError, STATUS_META } from "@/lib/utils";

type SearchContextValue = { openSearch: (query?: string) => void };
const SearchContext = createContext<SearchContextValue | null>(null);

export function useCommandSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useCommandSearch must be used within CommandSearchProvider");
  return context;
}

type SearchState = { query: string; results: AnimeSearchResult[]; error: string | null };

export function CommandSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ query: "", results: [], error: null });
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getEntry, isPending, addToWatchlist, requestRating, dismiss, remove } = useWatchlist();

  const trimmed = query.trim();
  const searching = trimmed.length >= 2 && state.query !== trimmed;
  const results = trimmed.length >= 2 ? state.results : [];

  const openSearch = useCallback((initial?: string) => {
    if (initial !== undefined) setQuery(initial);
    setActive(0);
    setOpen(true);
  }, []);

  // Native <dialog>: Fokusfalle, Esc und Top-Layer gibt es gratis.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.select());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Globales Tastenkürzel: ⌘K / Strg+K und "/"
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Live-Suche mit Debounce
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .search(trimmed, controller.signal)
        .then((data) => {
          setState({ query: trimmed, results: data, error: null });
          setActive(0);
        })
        .catch((error) => {
          if (isAbortError(error)) return;
          setState({ query: trimmed, results: [], error: errorMessage(error, "Suche fehlgeschlagen.") });
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const anime = results[active];
      if (anime && !getEntry(anime.anilist_id)) void addToWatchlist(anime);
    }
  }

  useEffect(() => {
    document.getElementById(`search-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <SearchContext.Provider value={{ openSearch }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label="Anime suchen"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="animate-enter mx-auto mt-[10vh] w-[min(640px,calc(100%-1.5rem))] max-w-none overflow-hidden rounded-2xl border border-border-strong bg-card p-0 text-foreground shadow-2xl shadow-black/40 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          {searching ? (
            <SpinnerIcon className="shrink-0 text-muted-foreground" />
          ) : (
            <SearchIcon className="shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Anime suchen – z. B. Frieren, Dandadan …"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results.length ? `search-option-${active}` : undefined}
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
          {trimmed.length < 2 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Tippe mindestens zwei Zeichen, um AniList zu durchsuchen.
            </div>
          )}

          {trimmed.length >= 2 && !searching && state.error && (
            <div className="px-3 py-10 text-center text-sm text-danger">{state.error}</div>
          )}

          {trimmed.length >= 2 && !searching && !state.error && results.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nichts gefunden für „{trimmed}“.
            </div>
          )}

          {results.length > 0 && (
            <ul id="search-results" role="listbox" className={cn("space-y-0.5", searching && "opacity-60")}>
              {results.map((anime, index) => {
                const entry = getEntry(anime.anilist_id);
                const busy = isPending(anime.anilist_id);
                const isDismissed = entry?.status === "dismissed";
                const score = formatScore(anime.score);
                return (
                  <li
                    key={anime.anilist_id}
                    id={`search-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseMove={() => setActive(index)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-2.5 transition-colors",
                      index === active && "bg-muted",
                      isDismissed && "opacity-60",
                    )}
                  >
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                      {anime.cover_image && (
                        <Image src={anime.cover_image} alt="" fill sizes="44px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{anime.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        {score && (
                          <span className="inline-flex items-center gap-0.5 text-foreground/80">
                            <StarIcon width={11} height={11} className="fill-current text-amber-400" />
                            {score}
                          </span>
                        )}
                        {anime.episodes ? <span>· {anime.episodes} Folgen</span> : null}
                        {anime.genres.length > 0 && <span className="truncate">· {anime.genres.slice(0, 3).join(", ")}</span>}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {busy ? (
                        <div className="grid size-8 place-items-center">
                          <SpinnerIcon width={16} height={16} className="text-muted-foreground" />
                        </div>
                      ) : entry ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
                              STATUS_META[entry.status].pill,
                            )}
                          >
                            <CheckIcon width={12} height={12} />
                            {entry.status === "completed" && entry.user_rating
                              ? `Gesehen (${entry.user_rating}/10)`
                              : STATUS_META[entry.status].label}
                          </span>
                          <button
                            type="button"
                            onClick={() => void remove(entry)}
                            title="Aus Liste entfernen"
                            aria-label={`${anime.title} entfernen`}
                            className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                          >
                            <BanIcon width={13} height={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void addToWatchlist(anime)}
                            title="Zur Watchlist hinzufügen"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground/90 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400 active:scale-95"
                          >
                            <BookmarkIcon width={12} height={12} />
                            <span>Watchlist</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => requestRating(anime)}
                            title="Als gesehen markieren (Sterne bewerten)"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground/90 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 active:scale-95"
                          >
                            <EyeIcon width={13} height={13} />
                            <span>Gesehen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void dismiss(anime)}
                            title="Kein Interesse (nicht mehr vorschlagen)"
                            aria-label={`${anime.title}: Kein Interesse`}
                            className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
                          >
                            <BanIcon width={14} height={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:flex">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigieren</span>
          <span><Kbd>↵</Kbd> merken</span>
          <span><Kbd>esc</Kbd> schließen</span>
          <span className="ml-auto">Daten von AniList</span>
        </div>
      </dialog>
    </SearchContext.Provider>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function SearchTrigger({ className, large = false }: { className?: string; large?: boolean }) {
  const { openSearch } = useCommandSearch();
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      className={cn(
        "group flex items-center gap-3 rounded-full border border-border bg-card/70 text-left text-muted-foreground backdrop-blur-md transition-all hover:border-border-strong hover:bg-card hover:text-foreground",
        large ? "h-14 w-full px-5 text-base shadow-lg shadow-black/5" : "h-9 px-3 text-sm",
        className,
      )}
    >
      <SearchIcon width={large ? 20 : 16} height={large ? 20 : 16} className="text-muted-foreground transition group-hover:text-foreground" />
      <span className="flex-1 truncate">{large ? "Welchen Anime suchst du? (z. B. Frieren, Solo Leveling …)" : "Suchen …"}</span>
      <span className="hidden items-center gap-1 sm:flex text-muted-foreground">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

