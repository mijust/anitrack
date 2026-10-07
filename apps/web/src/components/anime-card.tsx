"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckIcon, PlusIcon, SpinnerIcon, StarIcon } from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import type { AnimeSearchResult } from "@/lib/api";
import { cn, formatScore } from "@/lib/utils";

export function Poster({ src, alt, sizes, className }: { src: string | null; alt: string; sizes: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src && !failed ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/20 to-transparent text-2xl font-semibold text-muted-foreground">
          {alt.charAt(0)}
        </div>
      )}
    </div>
  );
}

export function AnimeCard({ anime, className }: { anime: AnimeSearchResult; className?: string }) {
  const { isInList, isPending, add } = useWatchlist();
  const listed = isInList(anime.anilist_id);
  const busy = isPending(anime.anilist_id);
  const score = formatScore(anime.score);
  const meta = [anime.episodes ? `${anime.episodes} Folgen` : null, anime.genres[0]].filter(Boolean).join(" · ");

  return (
    <article className={cn("group relative", className)}>
      <div className="relative">
        <Poster
          src={anime.cover_image}
          alt={anime.title}
          sizes="(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 45vw"
          className="aspect-[2/3] rounded-xl ring-1 ring-border transition duration-300 group-hover:ring-border-strong"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {score && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
            <StarIcon width={11} height={11} className="fill-current text-amber-400" />
            {score}
          </span>
        )}

        <button
          type="button"
          onClick={() => void add(anime)}
          disabled={listed || busy}
          aria-label={listed ? `${anime.title} ist in deiner Liste` : `${anime.title} merken`}
          className={cn(
            "absolute bottom-2 right-2 grid size-9 place-items-center rounded-full shadow-lg transition-all duration-200",
            listed
              ? "bg-success text-white"
              : "translate-y-1 bg-white text-black opacity-0 hover:scale-105 focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
            busy && "translate-y-0 opacity-100",
          )}
        >
          {busy ? <SpinnerIcon width={16} height={16} /> : listed ? <CheckIcon width={16} height={16} /> : <PlusIcon width={18} height={18} />}
        </button>
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
      <div className="aspect-[2/3] rounded-xl bg-muted" />
      <div className="mt-3 h-3.5 w-4/5 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}