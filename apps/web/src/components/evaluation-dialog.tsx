"use client";

import Image from "next/image";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { BanIcon, BookmarkIcon, CheckIcon, EyeIcon, SparklesIcon, SpinnerIcon, StarIcon, XIcon } from "@/components/icons";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeAskResponse, AnimeEvaluation } from "@/lib/api";
import { useFavoriteTopics } from "@/lib/use-favorite-topics";
import { cn, errorMessage } from "@/lib/utils";

export type EvalTarget = {
  title: string;
  cover_image?: string | null;
  anilist_id?: number;
};

type EvaluationContextValue = {
  openEvaluation: (anime: EvalTarget) => void;
  closeEvaluation: () => void;
  isOpen: boolean;
};

const EvaluationContext = createContext<EvaluationContextValue | null>(null);

export function useEvaluation() {
  const ctx = useContext(EvaluationContext);
  if (!ctx) {
    throw new Error("useEvaluation must be used within an EvaluationProvider");
  }
  return ctx;
}

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<EvalTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AnimeAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectedTopics } = useFavoriteTopics();

  function openEvaluation(anime: EvalTarget) {
    setTarget(anime);
    setLoading(true);
    setResponse(null);
    setError(null);
  }

  function closeEvaluation() {
    setTarget(null);
    setResponse(null);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();

    api
      .ask("evaluate", target.title, {
        animeTitle: target.title,
        favoriteTopics: selectedTopics,
        signal: controller.signal,
      })
      .then((res) => {
        setResponse(res);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(errorMessage(err, "Die KI-Bewertung konnte nicht geladen werden."));
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [target, selectedTopics]);

  return (
    <EvaluationContext.Provider value={{ openEvaluation, closeEvaluation, isOpen: !!target }}>
      {children}
      {target && (
        <EvaluationModal
          target={target}
          loading={loading}
          response={response}
          error={error}
          onClose={closeEvaluation}
          onRetry={() => {
            if (target) openEvaluation(target);
          }}
        />
      )}
    </EvaluationContext.Provider>
  );
}

function EvaluationModal({
  target,
  loading,
  response,
  error,
  onClose,
  onRetry,
}: {
  target: EvalTarget;
  loading: boolean;
  response: AnimeAskResponse | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eval-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-border/80 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl animate-enter overflow-hidden">
        {/* Header mit Schließen-Button */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25">
              <SparklesIcon width={14} height={14} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              KI-Bewertung & Analyse
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="py-12 text-center space-y-4">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                <SpinnerIcon width={28} height={28} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Analysiere {target.title} …
              </h3>
              <p className="mx-auto max-w-md text-xs text-muted-foreground leading-relaxed">
                Prüfe Community-Meinung, Handlungsprämisse, Fanservice- & Gewaltgrad sowie Passung zu deinen Vorlieben und geschauten Anime.
              </p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-rose-400">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
              >
                Erneut versuchen
              </button>
            </div>
          ) : response ? (
            <EvaluationView target={target} response={response} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EvaluationView({
  target,
  response,
}: {
  target?: EvalTarget;
  response: AnimeAskResponse;
}) {
  const { addToWatchlist, requestRating, dismiss, getEntry } = useWatchlist();
  const evaluation: AnimeEvaluation | undefined = response.evaluation ?? undefined;
  const entry = target?.anilist_id ? getEntry(target.anilist_id) : undefined;
  const isDismissed = entry?.status === "dismissed";
  const displayTitle = evaluation?.title || target?.title || "Anime Bewertung";

  return (
    <div className="space-y-6">
      {/* Oberer Bereich: Cover, Titel & Score-Ring */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {target?.cover_image && (
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-border shadow-sm">
              <Image
                src={target.cover_image}
                alt={displayTitle}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <h2 id="eval-modal-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {displayTitle}
            </h2>
            {evaluation?.verdict && (
              <p className="mt-1 text-sm font-medium text-indigo-400">
                {evaluation.verdict}
              </p>
            )}
          </div>
        </div>

        {response.score !== null && response.score !== undefined && (
          <div className="flex items-center gap-3 self-start rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2">
            <StarIcon width={18} height={18} className="fill-current text-amber-400" />
            <div className="text-right">
              <div className="text-base font-bold tabular-nums text-foreground">
                {Number(response.score).toFixed(response.score % 1 ? 1 : 0)} / 10
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                KI-Passung
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content-Ampel: Ecchi & Gewalt Badges */}
      {(evaluation?.ecchi_level || evaluation?.violence_level) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {evaluation.ecchi_level && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                getEcchiBadgeStyle(evaluation.ecchi_level),
              )}
            >
              <span className="text-sm">🔞</span>
              <span>Fanservice: {evaluation.ecchi_level}</span>
            </span>
          )}

          {evaluation.violence_level && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                getViolenceBadgeStyle(evaluation.violence_level),
              )}
            >
              <span className="text-sm">⚔️</span>
              <span>Gewalt: {evaluation.violence_level}</span>
            </span>
          )}
        </div>
      )}

      {/* Detail-Sektionen */}
      <div className="grid gap-3 sm:gap-4">
        {/* 1. Spoilerfreie Prämisse */}
        {evaluation?.synopsis && (
          <section className="rounded-2xl border border-border/80 bg-card/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>📖</span> Worum geht es? (Spoilerfrei)
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {evaluation.synopsis}
            </p>
          </section>
        )}

        {/* 2. Qualität: Story & Animation */}
        {(evaluation?.story_quality || evaluation?.animation_quality) && (
          <section className="rounded-2xl border border-border/80 bg-card/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>🎬</span> Qualität & Community-Konsens
            </h3>
            <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-foreground/90">
              {evaluation.story_quality && (
                <div>
                  <span className="font-semibold text-foreground">Story & Plot: </span>
                  <span className="text-muted-foreground">{evaluation.story_quality}</span>
                </div>
              )}
              {evaluation.animation_quality && (
                <div>
                  <span className="font-semibold text-foreground">Animation & Studio: </span>
                  <span className="text-muted-foreground">{evaluation.animation_quality}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. Passung zu den Sehgewohnheiten des Nutzers */}
        {evaluation?.match_reason && (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 ring-1 ring-indigo-500/10">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <SparklesIcon width={13} height={13} />
              Passung zu deinen Vorlieben & geschauten Anime
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {evaluation.match_reason}
            </p>
          </section>
        )}

        {/* 4. Content Notes (Hinweise zu Inhalten) */}
        {evaluation?.content_notes && (
          <section className="rounded-2xl border border-border/60 bg-card/40 p-3.5 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">Hinweise zu Inhalten: </span>
            {evaluation.content_notes}
          </section>
        )}

        {/* Fallback Fließtext-Antwort falls kein structured evaluation vorliegt */}
        {!evaluation && response.answer && (
          <div className="rounded-2xl border border-border/80 bg-card/60 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {response.answer}
          </div>
        )}
      </div>

      {/* Aktionsleiste für direkte Listeninteraktion */}
      {target?.anilist_id && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-4">
          <button
            type="button"
            onClick={() => void addToWatchlist({ anilist_id: target.anilist_id!, title: target.title, cover_image: target.cover_image ?? null })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              entry?.status === "planned"
                ? "bg-indigo-600 text-white"
                : "border border-border bg-card hover:bg-muted text-foreground",
            )}
          >
            {entry?.status === "planned" ? <CheckIcon width={13} height={13} /> : <BookmarkIcon width={13} height={13} />}
            {entry?.status === "planned" ? "Auf der Watchlist" : "Zur Watchlist"}
          </button>

          <button
            type="button"
            onClick={() => requestRating({ anilist_id: target.anilist_id!, title: target.title, cover_image: target.cover_image ?? null })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              entry?.status === "completed"
                ? "bg-emerald-600 text-white"
                : "border border-border bg-card hover:bg-muted text-foreground",
            )}
          >
            <EyeIcon width={13} height={13} />
            {entry?.status === "completed" ? `Gesehen (${entry.user_rating ? `${entry.user_rating}/10` : "bewertet"})` : "Als gesehen markieren"}
          </button>

          <button
            type="button"
            onClick={() => void dismiss({ anilist_id: target.anilist_id!, title: target.title, cover_image: target.cover_image ?? null })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              isDismissed
                ? "bg-rose-600/20 text-rose-300 border border-rose-500/30"
                : "border border-border bg-card hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground",
            )}
          >
            <BanIcon width={13} height={13} />
            {isDismissed ? "Ausgeblendet" : "Kein Interesse"}
          </button>
        </div>
      )}
    </div>
  );
}

function getEcchiBadgeStyle(level: string): string {
  const lower = level.toLowerCase();
  if (lower.includes("kein") || lower.includes("kaum") || lower.includes("wenig") || lower.includes("dezent")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (lower.includes("moderat") || lower.includes("mittel")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (lower.includes("hoch") || lower.includes("viel") || lower.includes("hardcore")) {
    return "bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold";
  }
  return "bg-muted text-muted-foreground border-border";
}

function getViolenceBadgeStyle(level: string): string {
  const lower = level.toLowerCase();
  if (lower.includes("keine") || lower.includes("harmlos") || lower.includes("mild") || lower.includes("gewaltfrei")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (lower.includes("action") || lower.includes("typisch")) {
    return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  }
  if (lower.includes("düster") || lower.includes("blutig") || lower.includes("moderat")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (lower.includes("extrem") || lower.includes("gore") || lower.includes("brutal")) {
    return "bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold";
  }
  return "bg-muted text-muted-foreground border-border";
}
