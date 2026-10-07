"use client";

import Image from "next/image";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useEvaluation } from "@/components/evaluation-dialog";
import {
  BanIcon,
  BookmarkIcon,
  CheckIcon,
  EyeIcon,
  PlayIcon,
  SparklesIcon,
  SpinnerIcon,
  StarIcon,
  XIcon,
} from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeDetails } from "@/lib/api";
import { cn, errorMessage, formatScore } from "@/lib/utils";

export type DetailTarget = {
  anilist_id?: number;
  title?: string;
  cover_image?: string | null;
};

type AnimeDetailContextValue = {
  openDetails: (target: DetailTarget) => void;
  closeDetails: () => void;
  isOpen: boolean;
};

const AnimeDetailContext = createContext<AnimeDetailContextValue | null>(null);

export function useAnimeDetail() {
  const ctx = useContext(AnimeDetailContext);
  if (!ctx) {
    throw new Error("useAnimeDetail must be used within an AnimeDetailProvider");
  }
  return ctx;
}

export function AnimeDetailProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<DetailTarget | null>(null);
  const [details, setDetails] = useState<AnimeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDetails(item: DetailTarget) {
    setTarget(item);
    setDetails(null);
    setError(null);
    setLoading(true);
  }

  function closeDetails() {
    setTarget(null);
    setDetails(null);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();

    api
      .details(
        { id: target.anilist_id, search: target.anilist_id ? undefined : target.title },
        controller.signal,
      )
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(errorMessage(err, "Anime-Details konnten nicht geladen werden."));
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [target]);

  return (
    <AnimeDetailContext.Provider value={{ openDetails, closeDetails, isOpen: !!target }}>
      {children}
      {target && (
        <AnimeDetailModal
          target={target}
          details={details}
          loading={loading}
          error={error}
          onClose={closeDetails}
          onRetry={() => {
            if (target) openDetails(target);
          }}
        />
      )}
    </AnimeDetailContext.Provider>
  );
}

function AnimeDetailModal({
  target,
  details,
  loading,
  error,
  onClose,
  onRetry,
}: {
  target: DetailTarget;
  details: AnimeDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { openEvaluation } = useEvaluation();
  const { getEntry, addToWatchlist, requestRating, dismiss } = useWatchlist();
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [showVideoTrailer, setShowVideoTrailer] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const anilistId = details?.anilist_id ?? target.anilist_id;
  const entry = anilistId ? getEntry(anilistId) : undefined;
  const isDismissed = entry?.status === "dismissed";
  const displayTitle = details?.title || target.title || "Anime Details";
  const coverUrl = details?.cover_image || target.cover_image;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-border/80 bg-card/95 shadow-2xl shadow-black/50 backdrop-blur-xl animate-enter overflow-hidden">
        {/* Schließen-Knopf oben rechts */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-3.5 top-3.5 z-30 grid size-9 place-items-center rounded-full bg-black/60 text-white/80 shadow-md backdrop-blur-md transition hover:bg-black/80 hover:text-white"
        >
          <XIcon width={18} height={18} />
        </button>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto">
          {/* Banner Bild */}
          <div className="relative h-44 w-full overflow-hidden bg-muted/40 sm:h-56">
            {details?.banner_image ? (
              <Image
                src={details.banner_image}
                alt={displayTitle}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            ) : coverUrl ? (
              <div className="relative size-full">
                <Image
                  src={coverUrl}
                  alt={displayTitle}
                  fill
                  sizes="100vw"
                  className="scale-125 object-cover blur-2xl opacity-40"
                />
              </div>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          </div>

          {/* Header Content mit Cover & Titel */}
          <div className="relative -mt-20 px-5 sm:-mt-24 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              {/* Cover Poster */}
              <div className="relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-2xl ring-2 ring-white/10 sm:h-52 sm:w-36">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={displayTitle}
                    fill
                    sizes="(min-width: 640px) 144px, 112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-3xl font-bold text-muted-foreground">
                    {displayTitle.charAt(0)}
                  </div>
                )}
              </div>

              {/* Titel & Metadaten */}
              <div className="min-w-0 flex-1 space-y-1.5 pb-1">
                <h1 id="anime-detail-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl leading-tight">
                  {displayTitle}
                </h1>

                {(details?.romaji_title || details?.native_title) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[details.romaji_title !== displayTitle ? details.romaji_title : null, details.native_title]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {/* Stat Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  {details?.score && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                      <StarIcon width={12} height={12} className="fill-current text-amber-400" />
                      {formatScore(details.score)}
                    </span>
                  )}

                  {details?.format && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                      {details.format}
                    </span>
                  )}

                  {details?.episodes && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {details.episodes} {details.episodes === 1 ? "Folge" : "Folgen"}
                      {details.duration ? ` · ${details.duration}m` : ""}
                    </span>
                  )}

                  {details?.status && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {formatStatusLabel(details.status)}
                    </span>
                  )}

                  {details?.season && details?.season_year && (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {formatSeasonLabel(details.season, details.season_year)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Aktionsleiste */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-border/70 py-3.5">
              {/* 1. KI-Bewertung Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openEvaluation({
                    title: displayTitle,
                    cover_image: coverUrl,
                    anilist_id: anilistId,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
              >
                <SparklesIcon width={14} height={14} />
                <span>KI-Bewertung starten</span>
              </button>

              {/* 2. Watchlist Status Buttons */}
              {anilistId && (
                <>
                  <button
                    type="button"
                    onClick={() => void addToWatchlist({ anilist_id: anilistId, title: displayTitle, cover_image: coverUrl ?? null })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition active:scale-95",
                      entry?.status === "planned"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "border border-border bg-card/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {entry?.status === "planned" ? <CheckIcon width={13} height={13} /> : <BookmarkIcon width={13} height={13} />}
                    <span>{entry?.status === "planned" ? "Auf Watchlist" : "Zur Watchlist"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => requestRating({ anilist_id: anilistId, title: displayTitle, cover_image: coverUrl ?? null })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition active:scale-95",
                      entry?.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "border border-border bg-card/60 text-foreground hover:bg-muted",
                    )}
                  >
                    <EyeIcon width={13} height={13} />
                    <span>{entry?.status === "completed" ? `Gesehen (${entry.user_rating ? `${entry.user_rating}/10` : "bewertet"})` : "Gesehen"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void dismiss({ anilist_id: anilistId, title: displayTitle, cover_image: coverUrl ?? null })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition active:scale-95",
                      isDismissed
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "border border-border bg-card/60 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10",
                    )}
                  >
                    <BanIcon width={13} height={13} />
                    <span>{isDismissed ? "Ausgeblendet" : "Kein Interesse"}</span>
                  </button>
                </>
              )}
            </div>

            {/* Haupt-Body */}
            <div className="space-y-6 py-5">
              {loading ? (
                <div className="py-12 text-center space-y-3">
                  <SpinnerIcon width={28} height={28} className="mx-auto text-indigo-400" />
                  <p className="text-xs text-muted-foreground">Lade ausführliche Daten von der API …</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-rose-400">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <>
                  {/* Nächste Ausstrahlung Banner (falls Releasing) */}
                  {details?.next_airing && (
                    <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-300">
                      <span className="font-semibold">
                        Folge {details.next_airing.episode} erscheint bald
                      </span>
                      <span>
                        in {formatTimeUntil(details.next_airing.time_until_airing)}
                      </span>
                    </div>
                  )}

                  {/* Handlung / Beschreibung */}
                  {details?.description && (
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Handlung
                      </h2>
                      <div className="text-sm leading-relaxed text-foreground/90">
                        <p className={cn(!expandedDesc && "line-clamp-4")}>
                          {details.description}
                        </p>
                        {details.description.length > 280 && (
                          <button
                            type="button"
                            onClick={() => setExpandedDesc((prev) => !prev)}
                            className="mt-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition"
                          >
                            {expandedDesc ? "Weniger anzeigen ↑" : "Ganze Beschreibung lesen ↓"}
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Genres & Tags */}
                  {(details?.genres?.length || details?.tags?.length) ? (
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Genres & Themen
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {details?.genres?.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-300"
                          >
                            {g}
                          </span>
                        ))}
                        {details?.tags?.slice(0, 10).map((tag) => (
                          <span
                            key={tag.name}
                            className="rounded-full bg-card border border-border px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            #{tag.name}
                            {tag.rank ? ` · ${tag.rank}%` : ""}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {/* Trailer */}
                  {details?.trailer && details.trailer.site === "youtube" && (
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Trailer
                      </h2>
                      {showVideoTrailer ? (
                        <div className="aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-border">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${details.trailer.id}?autoplay=1`}
                            title={`Trailer zu ${displayTitle}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="size-full border-0"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => setShowVideoTrailer(true)}
                          className="group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-muted/60 ring-1 ring-border transition hover:ring-indigo-500/50"
                        >
                          {details.trailer.thumbnail && (
                            <Image
                              src={details.trailer.thumbnail}
                              alt="Trailer Vorschau"
                              fill
                              sizes="(min-width: 768px) 600px, 100vw"
                              className="object-cover transition duration-300 group-hover:scale-105 opacity-80"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 transition group-hover:bg-black/30" />
                          <div className="relative z-10 grid size-14 place-items-center rounded-full bg-indigo-600 text-white shadow-xl shadow-black/50 transition duration-200 group-hover:scale-110 group-hover:bg-indigo-500">
                            <PlayIcon width={24} height={24} className="translate-x-0.5" />
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Info-Grid: Studios, Herkunft, Daten */}
                  <section className="space-y-2 pt-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Produktions-Details
                    </h2>
                    <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 text-xs sm:grid-cols-4">
                      {details?.studios?.length ? (
                        <div>
                          <dt className="text-muted-foreground">Studio</dt>
                          <dd className="mt-1 font-medium text-foreground">
                            {details.studios.map((s) => s.name).join(", ")}
                          </dd>
                        </div>
                      ) : null}

                      {details?.source ? (
                        <div>
                          <dt className="text-muted-foreground">Quelle</dt>
                          <dd className="mt-1 font-medium text-foreground">
                            {formatSourceLabel(details.source)}
                          </dd>
                        </div>
                      ) : null}

                      {details?.start_date ? (
                        <div>
                          <dt className="text-muted-foreground">Startdatum</dt>
                          <dd className="mt-1 font-medium text-foreground">
                            {details.start_date}
                          </dd>
                        </div>
                      ) : null}

                      {details?.end_date ? (
                        <div>
                          <dt className="text-muted-foreground">Enddatum</dt>
                          <dd className="mt-1 font-medium text-foreground">
                            {details.end_date}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "FINISHED":
      return "Abgeschlossen";
    case "RELEASING":
      return "Laufend";
    case "NOT_YET_RELEASED":
      return "Noch nicht ausgestrahlt";
    case "CANCELLED":
      return "Abgebrochen";
    case "HIATUS":
      return "Pausiert";
    default:
      return status;
  }
}

function formatSeasonLabel(season: string, year: number): string {
  const map: Record<string, string> = {
    WINTER: "Winter",
    SPRING: "Frühling",
    SUMMER: "Sommer",
    FALL: "Herbst",
  };
  return `${map[season.toUpperCase()] || season} ${year}`;
}

function formatSourceLabel(source: string): string {
  const map: Record<string, string> = {
    MANGA: "Manga",
    LIGHT_NOVEL: "Light Novel",
    ORIGINAL: "Original",
    VISUAL_NOVEL: "Visual Novel",
    VIDEO_GAME: "Videospiel",
    NOVEL: "Roman",
  };
  return map[source.toUpperCase()] || source;
}

function formatTimeUntil(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} Tag${days === 1 ? "" : "en"} ${hours}h`;
  return `${hours} Stunden`;
}
