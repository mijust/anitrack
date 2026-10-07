// src/components/season-selector.tsx
"use client";

import { useState } from "react";

export type SeasonName = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type SeasonSelection = { label: string; season: SeasonName; year: number };

const SEASON_LABELS: Record<SeasonName, string> = {
  WINTER: "Winter",
  SPRING: "Frühling",
  SUMMER: "Sommer",
  FALL: "Herbst",
};

const SEASONS: SeasonSelection[] = Array.from({ length: 7 }, (_, index) => 2026 - index).flatMap((year) =>
  (["FALL", "SUMMER", "SPRING", "WINTER"] as SeasonName[]).map((season) => ({
    label: `${SEASON_LABELS[season]} ${year}`,
    season,
    year,
  })),
);

export function SeasonSelector({ onSelect }: { onSelect: (season: SeasonSelection) => void }) {
  const [selected, setSelected] = useState(SEASONS[0]);

  return (
    <select
      value={`${selected.season}-${selected.year}`}
      onChange={(e) => {
        const [season, year] = e.target.value.split("-");
        const next = SEASONS.find(
          (candidate) => candidate.season === season && candidate.year === Number(year),
        );

        if (!next) {
          return;
        }

        setSelected(next);
        onSelect(next);
      }}
      className="rounded-md border border-secondary bg-surface px-4 py-2 text-text outline-none focus:ring-2 focus:ring-primary"
    >
      {SEASONS.map((s) => (
        <option key={`${s.season}-${s.year}`} value={`${s.season}-${s.year}`}>
          {s.label}
        </option>
      ))}
    </select>
  );
}