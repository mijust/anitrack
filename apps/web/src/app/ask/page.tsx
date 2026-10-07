"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useCommandSearch } from "@/components/command-search";
import { EvaluationView } from "@/components/evaluation-dialog";
import { ArrowUpIcon, SearchIcon, SparklesIcon, SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { TopicSelector } from "@/components/topic-selector";
import { useWatchlist } from "@/components/watchlist-provider";
import { api, AnimeAskResponse } from "@/lib/api";
import { useFavoriteTopics } from "@/lib/use-favorite-topics";
import { cn, errorMessage } from "@/lib/utils";

type Mode = "recommend" | "evaluate";

const MODES: { value: Mode; label: string; placeholder: string; suggestions: string[] }[] = [
  {
    value: "recommend",
    label: "Empfehlen",
    placeholder: "Worauf hast du Lust? z. B. düstere Fantasy mit cleveren Twists",
    suggestions: ["Etwas Kurzes für ein Wochenende", "Mystery mit starkem Plot-Twist", "Wholesome Slice of Life", "Action wie Jujutsu Kaisen"],
  },
  {
    value: "evaluate",
    label: "Bewerten",
    placeholder: "Welcher Anime soll bewertet werden? z. B. Vinland Saga",
    suggestions: ["Vinland Saga", "Chainsaw Man", "Violet Evergarden", "Steins;Gate", "Solo Leveling"],
  },
];

type Result = { prompt: string; mode: Mode; response: AnimeAskResponse };

export default function AskPage() {
  const toast = useToast();
  const { entries } = useWatchlist();
  const { selectedTopics } = useFavoriteTopics();
  const [mode, setMode] = useState<Mode>("recommend");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const current = MODES.find((item) => item.value === mode)!;

  async function submit(text = prompt) {
    const trimmed = text.trim();
    if (trimmed.length < 2 || loading) return;
    setLoading(true);
    try {
      const response = await api.ask(mode, trimmed, {
        animeTitle: mode === "evaluate" ? trimmed : undefined,
        favoriteTopics: selectedTopics,
      });
      setResult({ prompt: trimmed, mode, response });
    } catch (error) {
      toast(errorMessage(error, "Die KI ist gerade nicht erreichbar."), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <span className="inline-grid size-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 shadow-xs">
          <SparklesIcon width={22} height={22} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Frag die KI</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {entries.length > 0
            ? `Kennt deine ${entries.length} gemerkten Anime, deine Sterne-Bewertungen und deine Lieblingsthemen.`
            : "Je mehr Anime du dir merkst und bewertest, desto präziser werden die Antworten."}
        </p>
      </div>

      {/* Lieblings-Topics / Kategorien-Auswahl */}
      <TopicSelector />

      {/* Modus-Umschalter: Empfehlen vs. Bewerten */}
      <div role="tablist" aria-label="Modus" className="mx-auto flex w-fit rounded-full border border-border bg-card/60 p-1 backdrop-blur-md">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={mode === item.value}
            onClick={() => {
              setMode(item.value);
              textareaRef.current?.focus();
            }}
            className={cn(
              "h-8 rounded-full px-4 text-xs font-medium transition-all",
              mode === item.value
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Eingabeformular */}
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-border-strong/80 bg-card/80 p-2.5 shadow-xl shadow-black/5 backdrop-blur-md transition-all focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={current.placeholder}
          rows={2}
          maxLength={1200}
          className="field-sizing-content block max-h-48 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <span className="pl-2 text-[11px] text-muted-foreground">↵ senden · ⇧↵ neue Zeile</span>
          <button
            type="submit"
            disabled={loading || prompt.trim().length < 2}
            aria-label="Senden"
            className="grid size-9 place-items-center rounded-full bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-500 active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
          >
            {loading ? <SpinnerIcon width={16} height={16} /> : <ArrowUpIcon width={16} height={16} />}
          </button>
        </div>
      </form>

      {/* Vorschläge */}
      {!result && !loading && (
        <div className="flex flex-wrap justify-center gap-2">
          {current.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setPrompt(suggestion);
                void submit(suggestion);
              }}
              className="rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-border-strong hover:bg-card hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Ergebnis / Ladezustand */}
      <div className="pt-2" aria-live="polite">
        {loading ? <ThinkingSkeleton mode={mode} /> : result ? <ResultView result={result} /> : null}
      </div>
    </div>
  );
}

function ThinkingSkeleton({ mode }: { mode: Mode }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <SparklesIcon width={14} height={14} className="animate-pulse text-indigo-400" />
        {mode === "evaluate"
          ? "Prüfe Story, Animation, Ecchi, Gewalt und Passung zu deinen Sehgewohnheiten …"
          : "Analysiere deine Liste und Vorlieben für Empfehlungen …"}
      </p>
      <div className="animate-pulse space-y-2">
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-11/12 rounded bg-muted" />
        <div className="h-3.5 w-3/5 rounded bg-muted" />
      </div>
    </div>
  );
}

function ResultView({ result }: { result: Result }) {
  const { openSearch } = useCommandSearch();
  const { response, mode, prompt } = result;

  // Wenn ein Anime im Modus "evaluate" bewertet wurde:
  if (mode === "evaluate") {
    return (
      <div className="animate-enter rounded-3xl border border-border/80 bg-card/80 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <EvaluationView target={{ title: prompt }} response={response} />
      </div>
    );
  }

  // Modus "recommend":
  return (
    <div className="animate-enter space-y-6">
      <div className="flex gap-5">
        {response.score !== null && response.score !== undefined && <ScoreRing score={response.score} />}
        <p className="whitespace-pre-wrap text-pretty leading-relaxed text-foreground/90">{response.answer}</p>
      </div>

      {response.recommendations.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {response.recommendations.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className="flex flex-col rounded-2xl border border-border/80 bg-card/70 p-4 transition-all hover:border-border-strong hover:bg-card"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{item.title}</p>
                {item.score !== null && item.score !== undefined && (
                  <span className="shrink-0 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-400">
                    {Number(item.score).toFixed(item.score % 1 ? 1 : 0)}/10
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.reason}</p>
              <button
                type="button"
                onClick={() => openSearch(item.title)}
                className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/80 transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400"
              >
                <SearchIcon width={13} height={13} />
                Finden & merken
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div
      className="grid size-16 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--muted) 0)` }}
      aria-label={`Passung ${score} von 10`}
    >
      <div className="grid size-[52px] place-items-center rounded-full bg-card shadow-xs">
        <span className="text-lg font-bold tabular-nums text-foreground">{Number(score).toFixed(score % 1 ? 1 : 0)}</span>
      </div>
    </div>
  );
}
