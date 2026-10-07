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
          className="object-cover"
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

        {/* Score Badge links oben */}
        {score && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
            <StarIcon width={11} height={11} className="fill-current text-amber-400" />
            {score}
          </span>
        )}

        {/* Status Badge rechts oben (falls schon auf der Liste) */}
        {entry && (
          <span
            className={cn(
              "absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-md shadow-sm",
              entry.status === "completed" && "bg-emerald-500/80 text-white",
              entry.status === "planned" && "bg-violet-500/80 text-white",
              entry.status === "watching" && "bg-sky-500/80 text-white",
              entry.status === "paused" && "bg-amber-500/80 text-white",
              entry.status === "dropped" && "bg-zinc-600/80 text-white",
              entry.status === "dismissed" && "bg-rose-600/80 text-white",
            )}
          >
            {entry.status === "completed" && entry.user_rating ? (
              <>★ {entry.user_rating}/10</>
            ) : (
              STATUS_META[entry.status].label
            )}
          </span>
        )}

        {/* Ladeindikator */}
        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 backdrop-blur-xs">
            <SpinnerIcon width={24} height={24} className="text-white" />
          </div>
        )}

        {/* Aktionsleiste unten am Poster: Watchlist, Watched (Gesehen), Kein Interesse */}
        {!busy && (
          <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center gap-1 rounded-full border border-white/15 bg-black/80 p-1 shadow-lg backdrop-blur-md transition-all duration-200 opacity-0 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
            {isDismissed ? (
              <button
                type="button"
                onClick={() => void remove(entry)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/20 px-2.5 text-[11px] font-medium text-white hover:bg-white/30"
              >
                Wiederherstellen
              </button>
            ) : (
              <>
                {/* 1. Watchlist */}
                <button
                  type="button"
                  onClick={() => void addToWatchlist(anime)}
                  title="Zur Watchlist hinzufügen"
                  aria-label={`${anime.title} zur Watchlist`}
                  className={cn(
                    "inline-flex h-7 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-medium transition active:scale-95",
                    entry?.status === "planned"
                      ? "bg-violet-500 text-white"
                      : "bg-white/15 text-white hover:bg-white/25",
                  )}
                >
                  {entry?.status === "planned" ? (
                    <CheckIcon width={12} height={12} />
                  ) : (
                    <BookmarkIcon width={12} height={12} />
                  )}
                  <span className="hidden xl:inline">Watchlist</span>
                </button>

                {/* 2. Watched (Gesehen) mit Sterne-Abfrage */}
                <button
                  type="button"
                  onClick={() => requestRating(anime)}
                  title="Als gesehen markieren (Sterne bewerten)"
                  aria-label={`${anime.title} als gesehen markieren`}
                  className={cn(
                    "inline-flex h-7 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-medium transition active:scale-95",
                    entry?.status === "completed"
                      ? "bg-emerald-500 text-white"
                      : "bg-white/15 text-white hover:bg-white/25",
                  )}
                >
                  <EyeIcon width={13} height={13} />
                  <span className="hidden xl:inline">Gesehen</span>
                </button>

                {/* 3. Kein Interesse */}
                <button
                  type="button"
                  onClick={() => void dismiss(anime)}
                  title="Kein Interesse (nicht mehr vorschlagen)"
                  aria-label={`${anime.title}: Kein Interesse`}
                  className="grid size-7 place-items-center rounded-full bg-white/15 text-white/80 transition hover:bg-rose-500 hover:text-white active:scale-95"
                >
                  <BanIcon width={13} height={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug" title={anime.title}>
        {anime.title}
      </h3>
      {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
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