"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { StarIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type RatingTarget = {
  anilist_id: number;
  title: string;
  cover_image: string | null;
  initialRating?: number | null;
};

type RatingDialogProps = {
  target: RatingTarget | null;
  onSave: (target: RatingTarget, rating: number | null) => void;
  onClose: () => void;
};

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Sehr schlecht",
  2: "Schlecht",
  3: "Enttäuschend",
  4: "Unterdurchschnittlich",
  5: "Durchschnittlich",
  6: "In Ordnung",
  7: "Gut",
  8: "Sehr gut",
  9: "Großartig",
  10: "Meisterwerk!",
};

export function RatingDialog({ target, onSave, onClose }: RatingDialogProps) {
  if (!target) return null;
  return (
    <RatingDialogContent
      key={target.anilist_id}
      target={target}
      onSave={onSave}
      onClose={onClose}
    />
  );
}

function RatingDialogContent({
  target,
  onSave,
  onClose,
}: {
  target: RatingTarget;
  onSave: (target: RatingTarget, rating: number | null) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedScore, setSelectedScore] = useState<number>(target.initialRating ?? 8);
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const currentScore = hoverScore ?? selectedScore;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-enter mx-auto mt-[12vh] w-[min(480px,calc(100%-2rem))] max-w-none overflow-hidden rounded-3xl border border-border-strong bg-card p-0 text-foreground shadow-2xl shadow-black/50 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Als gesehen markieren</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <XIcon width={16} height={16} />
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3.5">
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
            {target.cover_image && (
              <Image src={target.cover_image} alt="" fill sizes="44px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{target.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Wie hat dir dieser Anime gefallen?</p>
          </div>
        </div>

        {/* 10 Sterne Auswahl */}
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-center">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5" onMouseLeave={() => setHoverScore(null)}>
            {Array.from({ length: 10 }, (_, index) => {
              const score = index + 1;
              const active = score <= currentScore;
              return (
                <button
                  key={score}
                  type="button"
                  aria-label={`${score} von 10 Sternen`}
                  onMouseEnter={() => setHoverScore(score)}
                  onFocus={() => setHoverScore(score)}
                  onClick={() => setSelectedScore(score)}
                  className="group relative grid size-7 place-items-center rounded-md transition-transform hover:scale-125 focus-visible:scale-125 sm:size-8"
                >
                  <StarIcon
                    width={22}
                    height={22}
                    className={cn(
                      "transition-colors duration-150",
                      active
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                        : "fill-transparent text-foreground/20 group-hover:text-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xl font-bold tabular-nums text-foreground">{currentScore}/10</span>
            <span className="text-sm font-medium text-muted-foreground">
              · {RATING_DESCRIPTIONS[currentScore]}
            </span>
          </div>
        </div>

        {/* Aktionen */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => onSave(target, null)}
            className="rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Ohne Bewertung speichern
          </button>
          <button
            type="button"
            onClick={() => onSave(target, selectedScore)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-md transition hover:opacity-90 active:scale-95"
          >
            Mit {selectedScore} Sternen speichern
          </button>
        </div>
      </div>
    </dialog>
  );
}
