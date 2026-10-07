"use client";

import { useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { AnimeEntry } from "@/lib/api";

const STATUSES = ["all", "watching", "completed", "planned", "paused", "dropped"] as const;
type StatusType = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusType, string> = {
  all: "Alle Status",
  watching: "Schaue ich aktuell",
  completed: "Abgeschlossen",
  planned: "Geplant",
  paused: "Pausiert",
  dropped: "Abgebrochen",
};

type WatchlistSectionProps = {
  entries: AnimeEntry[];
  statusFilter: StatusType;
  onStatusFilterChange: (status: StatusType) => void;
  onMarkCompleted: (entry: AnimeEntry) => Promise<void>;
};

export function WatchlistSection({
  entries,
  statusFilter,
  onStatusFilterChange,
  onMarkCompleted,
}: WatchlistSectionProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function handleComplete(entry: AnimeEntry) {
    setUpdatingId(entry.id);
    try {
      await onMarkCompleted(entry);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="border-t border-secondary/50 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text">Meine Liste</h2>
          <p className="mt-1 text-sm text-text-muted">
            {entries.length} gespeicherte{entries.length === 1 ? "r" : ""} Anime
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusType)}
          className="rounded-md border border-secondary bg-surface px-4 py-2 text-text outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-md border border-secondary/50 bg-surface/40 p-8 text-center text-sm text-text-muted">
          Keine Anime mit dem Status &quot;{STATUS_LABELS[statusFilter]}&quot; vorhanden.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const isCompleted = entry.status === "completed";
            return (
              <AnimeCard
                key={entry.id}
                title={entry.title}
                cover={entry.cover_image ?? "/window.svg"}
                score={entry.user_rating ? entry.user_rating * 10 : null}
                actionLabel={isCompleted ? "Abgeschlossen" : "Als abgeschlossen markieren"}
                loading={updatingId === entry.id}
                disabled={isCompleted || updatingId === entry.id}
                onAction={isCompleted ? undefined : () => void handleComplete(entry)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
