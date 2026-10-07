"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BanIcon,
  BookmarkIcon,
  CheckIcon,
  EyeIcon,
  SpinnerIcon,
  StarIcon,
} from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import type { AnimeSearchResult } from "@/lib/api";
import { cn, formatScore, STATUS_META } from "@/lib/utils";

export function Poster({
  src,
  alt,
  sizes,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-300 will-change-transform group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/20 to-transparent text-2xl font-semibold text-muted-foreground">
          {alt.charAt(0)}
        </div>
      )}
    </div>
  );
}

export function AnimeCard({
  anime,
  className,
}: {
  anime: AnimeSearchResult;
  className?: string;
}) {
  const { getEntry, isPending, addToWatchlist, requestRating, dismiss, remove } = useWatchlist();
  const entry = getEntry(anime.anilist_id);
  const busy = isPending(anime.anilist_id);
  const isDismissed = entry?.status === "dismissed";
  const score = formatScore(anime.score);
  const meta = [anime.episodes ? `${anime.episodes} Folgen` : null, anime.genres[0]]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        isDismissed && "opacity-60 transition-opacity hover:opacity-100",
        className,
      )}
    >
      <div className="relative">
        <Poster
          src={anime.cover_image}
          alt={anime.title}
          sizes="(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 45vw"
          className={cn(
            "aspect-[2/3] rounded-2xl ring-1 ring-border transition duration-300 group-hover:ring-border-strong",
            isDismissed && "grayscale-[40%]",
          )}
        />

        {/* Sanfter Gradient auf Hover */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100" />

        {/* Top Badges: Score & Status */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1">
          {score ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
              <StarIcon width={11} height={11} className="fill-current text-amber-400" />
              {score}
            </span>
          ) : (
            <span />
          )}

          {entry && (
            <span
              className={cn(
                "inline-flex max-w-[55%] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-md",
                STATUS_META[entry.status].badge,
              )}
            >
              <span className="truncate">
                {entry.status === "completed" && entry.user_rating
                  ? `★ ${entry.user_rating}/10`
                  : STATUS_META[entry.status].label}
              </span>
            </span>
          )}
        </div>

        {/* Ladeindikator */}
        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 backdrop-blur-xs">
            <SpinnerIcon width={24} height={24} className="text-white" />
          </div>
        )}

        {/* Aktionsleiste unten am Poster: Watchlist, Watched (Gesehen), Kein Interesse */}
        {!busy && (
          <div className="absolute inset-x-2 bottom-2 z-10 grid grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-black/85 p-1 shadow-lg backdrop-blur-md transition-all duration-200 opacity-0 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
            {isDismissed ? (
              <button
                type="button"
                onClick={() => void remove(entry)}
                className="col-span-3 flex h-8 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-2.5 text-[11px] font-medium text-white transition hover:bg-white/30"
              >
                Wiederherstellen
              </button>
            ) : (
              <>
                {/* 1. Watchlist */}
                <button
                  type="button"
                  onClick={() => void addToWatchlist(anime)}
                  title={entry?.status === "planned" ? "Auf der Watchlist" : "Zur Watchlist hinzufügen"}
                  aria-label={`${anime.title} zur Watchlist`}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-xl transition active:scale-90",
                    entry?.status === "planned"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white/10 text-white/90 hover:bg-indigo-500/25 hover:text-indigo-200",
                  )}
                >
                  {entry?.status === "planned" ? (
                    <CheckIcon width={14} height={14} />
                  ) : (
                    <BookmarkIcon width={14} height={14} />
                  )}
                </button>

                {/* 2. Watched (Gesehen) mit Sterne-Abfrage */}
                <button
                  type="button"
                  onClick={() => requestRating(anime)}
                  title={
                    entry?.status === "completed"
                      ? `Gesehen (${entry.user_rating ? `${entry.user_rating}/10` : "bewertet"})`
                      : "Als gesehen markieren (bewerten)"
                  }
                  aria-label={`${anime.title} als gesehen markieren`}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-xl transition active:scale-90",
                    entry?.status === "completed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white/10 text-white/90 hover:bg-emerald-500/25 hover:text-emerald-200",
                  )}
                >
                  <EyeIcon width={15} height={15} />
                </button>

                {/* 3. Kein Interesse */}
                <button
                  type="button"
                  onClick={() => void dismiss(anime)}
                  title="Kein Interesse (nicht mehr vorschlagen)"
                  aria-label={`${anime.title}: Kein Interesse`}
                  className="flex h-8 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-rose-500/25 hover:text-rose-200 active:scale-90"
                >
                  <BanIcon width={14} height={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground/90 transition group-hover:text-foreground" title={anime.title}>
        {anime.title}
      </h3>
      {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{meta}</p>}
    </article>
  );
}

export function AnimeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)} aria-hidden>
      <div className="aspect-[2/3] rounded-2xl bg-muted" />
      <div className="mt-3 h-3.5 w-4/5 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}