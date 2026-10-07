"use client";

import { useState } from "react";
import Image from "next/image";

type AnimeCardProps = {
  title: string;
  cover: string;
  score: number | null;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AnimeCard({
  title,
  cover,
  score,
  actionLabel = "Zur Liste hinzufügen",
  onAction,
  loading = false,
  disabled = false,
}: AnimeCardProps) {
  const [hasError, setHasError] = useState(false);
  const displaySrc = hasError || !cover ? "/window.svg" : cover;

  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-lg bg-surface shadow-lg transition-colors hover:bg-surface-hover">
      <div>
        <div className="relative h-56 w-full bg-surface-hover">
          <Image
            src={displaySrc}
            alt={title}
            width={640}
            height={360}
            className="h-56 w-full object-cover"
            onError={() => setHasError(true)}
          />
        </div>
        <div className="p-4 pb-0">
          <h3 className="min-h-14 line-clamp-2 text-lg font-semibold text-text" title={title}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-primary">
            AniList Score: {score !== null && score !== undefined ? `${score}/100` : "-"}
          </p>
        </div>
      </div>
      <div className="p-4 pt-3">
        <button
          type="button"
          onClick={onAction}
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || loading || !onAction}
        >
          {loading ? "Wird gespeichert..." : actionLabel}
        </button>
      </div>
    </article>
  );
}