"use client";

import { FormEvent, useState } from "react";
import { CheckIcon, PlusIcon, SparklesIcon, XIcon } from "@/components/icons";
import { useFavoriteTopics } from "@/lib/use-favorite-topics";
import { cn } from "@/lib/utils";

export function TopicSelector({ className }: { className?: string }) {
  const {
    selectedTopics,
    toggleTopic,
    addCustomTopic,
    removeTopic,
    clearAll,
    presetTopics,
  } = useFavoriteTopics();

  const [expanded, setExpanded] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const genres = presetTopics.filter((t) => t.category === "genre");
  const themes = presetTopics.filter((t) => t.category === "theme");

  function handleAddCustom(e: FormEvent) {
    e.preventDefault();
    if (!customInput.trim()) return;
    addCustomTopic(customInput.trim());
    setCustomInput("");
  }

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-all",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <SparklesIcon width={16} height={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Deine Vorlieben & Lieblingsthemen
            </h2>
            <p className="text-xs text-muted-foreground">
              Fließen automatisch in KI-Bewertungen & Empfehlungen ein
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedTopics.length > 0 && (
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-400">
              {selectedTopics.length} aktiv
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          >
            {expanded ? "Schließen" : selectedTopics.length > 0 ? "Bearbeiten" : "Auswählen"}
          </button>
        </div>
      </div>

      {/* Gewählte Themen als Pillen (sichtbar auch wenn collapsed) */}
      {selectedTopics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-indigo-300 transition"
            >
              <span>{topic}</span>
              <button
                type="button"
                onClick={() => removeTopic(topic)}
                aria-label={`${topic} entfernen`}
                className="grid size-4 place-items-center rounded-full hover:bg-indigo-500/30 text-indigo-300 hover:text-white transition"
              >
                <XIcon width={11} height={11} />
              </button>
            </span>
          ))}
          {selectedTopics.length > 0 && expanded && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-danger transition"
            >
              Alle entfernen
            </button>
          )}
        </div>
      )}

      {/* Ausgeklappte Auswahl */}
      {expanded && (
        <div className="mt-5 space-y-4 border-t border-border/60 pt-4">
          {/* Sektion 1: Haupt-Genres */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Genres
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {genres.map((genre) => {
                const active = selectedTopics.includes(genre.label);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleTopic(genre.label)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {active && <CheckIcon width={12} height={12} />}
                    {genre.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sektion 2: Stimmungen & Themes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Themen & Tropes
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {themes.map((theme) => {
                const active = selectedTopics.includes(theme.label);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => toggleTopic(theme.label)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95",
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {active && <CheckIcon width={12} height={12} />}
                    {theme.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sektion 3: Eigenes Thema hinzufügen */}
          <form onSubmit={handleAddCustom} className="flex max-w-sm items-center gap-2 pt-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Eigenes Thema (z.B. Samurai, Antihelden)"
              className="flex-1 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/80 disabled:opacity-40"
            >
              <PlusIcon width={12} height={12} />
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
