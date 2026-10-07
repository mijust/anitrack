"use client";

import { FormEvent, useState } from "react";
import { api, AnimeAskResponse, User } from "@/lib/api";

type AnimeAskProps = {
  user: User | null;
  onError: (message: string) => void;
};

export function AnimeAsk({ user, onError }: AnimeAskProps) {
  const [askMode, setAskMode] = useState<"evaluate" | "recommend">("recommend");
  const [askPrompt, setAskPrompt] = useState("");
  const [askResponse, setAskResponse] = useState<AnimeAskResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onError("Bitte zuerst anmelden, um Anime Ask zu verwenden.");
      return;
    }
    const trimmed = askPrompt.trim();
    if (trimmed.length < 2) {
      onError("Bitte mindestens zwei Zeichen eingeben.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.ask(askMode, trimmed);
      setAskResponse(response);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Anime Ask ist momentan nicht verfügbar. Bitte prüfe, ob OPENROUTER_API_KEY konfiguriert ist."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-secondary/50 py-10">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-text">Anime Ask (KI-Assistent)</h2>
        <p className="mt-1 text-sm text-text-muted">
          Bewerte einen konkreten Anime oder erhalte Empfehlungen auf Basis deiner persönlichen Liste.
        </p>
      </div>

      <form onSubmit={handleAsk} className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_auto]">
        <select
          value={askMode}
          onChange={(event) => setAskMode(event.target.value as "evaluate" | "recommend")}
          className="min-h-11 rounded-md border border-secondary bg-surface px-4 text-text outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="recommend">Empfehlungen</option>
          <option value="evaluate">Anime bewerten</option>
        </select>
        <input
          value={askPrompt}
          onChange={(event) => setAskPrompt(event.target.value)}
          required
          minLength={2}
          placeholder={
            askMode === "recommend"
              ? "Welche Anime suchst du? (z. B. Düstere Fantasy mit Twists)"
              : "Welchen Anime soll ich für dich bewerten? (z. B. Attack on Titan)"
          }
          className="min-h-11 rounded-md border border-secondary bg-surface px-4 text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-md bg-primary px-6 font-semibold text-background transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Fragt KI..." : "Fragen"}
        </button>
      </form>

      {askResponse && (
        <div className="mt-6 rounded-lg border border-secondary/60 bg-surface p-6 shadow-md">
          {askResponse.score !== null && askResponse.score !== undefined && (
            <div className="mb-3 inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-accent">
              Passung für dich: {askResponse.score}/10
            </div>
          )}
          <p className="whitespace-pre-wrap text-text leading-relaxed">{askResponse.answer}</p>
          {askResponse.recommendations.length > 0 && (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {askResponse.recommendations.map((recommendation) => (
                <li
                  key={recommendation.title}
                  className="rounded-md border border-secondary/50 bg-background/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-text">{recommendation.title}</strong>
                    {recommendation.score !== null && recommendation.score !== undefined && (
                      <span className="text-sm font-semibold text-accent">
                        {recommendation.score}/10
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{recommendation.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
