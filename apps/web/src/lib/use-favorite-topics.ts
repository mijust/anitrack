"use client";

import { useMemo, useSyncExternalStore } from "react";

export type TopicDefinition = {
  id: string;
  label: string;
  category: "genre" | "theme";
};

export const PRESET_TOPICS: TopicDefinition[] = [
  // Haupt-Genres
  { id: "action", label: "Action", category: "genre" },
  { id: "adventure", label: "Abenteuer", category: "genre" },
  { id: "comedy", label: "Comedy", category: "genre" },
  { id: "drama", label: "Drama", category: "genre" },
  { id: "fantasy", label: "Fantasy", category: "genre" },
  { id: "scifi", label: "Sci-Fi", category: "genre" },
  { id: "mystery", label: "Mystery", category: "genre" },
  { id: "psychological", label: "Psychological", category: "genre" },
  { id: "romance", label: "Romance", category: "genre" },
  { id: "slice-of-life", label: "Slice of Life", category: "genre" },
  { id: "thriller", label: "Thriller", category: "genre" },
  { id: "horror", label: "Horror", category: "genre" },
  { id: "sports", label: "Sports", category: "genre" },
  { id: "supernatural", label: "Supernatural", category: "genre" },

  // Themes & Tropes
  { id: "cyberpunk", label: "Cyberpunk", category: "theme" },
  { id: "dark-fantasy", label: "Dark Fantasy", category: "theme" },
  { id: "mind-games", label: "Mind Games & Taktik", category: "theme" },
  { id: "time-travel", label: "Zeitreisen", category: "theme" },
  { id: "isekai", label: "Isekai", category: "theme" },
  { id: "shonen", label: "Shōnen", category: "theme" },
  { id: "seinen", label: "Seinen (Erwachsen)", category: "theme" },
  { id: "dystopia", label: "Dystopie", category: "theme" },
  { id: "detective", label: "Detektiv & Crime", category: "theme" },
  { id: "post-apocalyptic", label: "Postapokalypse", category: "theme" },
  { id: "anti-hero", label: "Antihelden", category: "theme" },
  { id: "magic", label: "Magiesystem", category: "theme" },
  { id: "mecha", label: "Mecha & Roboter", category: "theme" },
];

const STORAGE_KEY = "anitrack_favorite_topics";
const CHANGE_EVENT = "anitrack-topics-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

export function useFavoriteTopics() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const selectedTopics = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [raw]);

  function save(newTopics: string[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTopics));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // ignore
    }
  }

  function toggleTopic(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (selectedTopics.includes(trimmed)) {
      save(selectedTopics.filter((t) => t !== trimmed));
    } else {
      save([...selectedTopics, trimmed]);
    }
  }

  function addCustomTopic(label: string) {
    const trimmed = label.trim();
    if (!trimmed || selectedTopics.includes(trimmed)) return;
    save([...selectedTopics, trimmed]);
  }

  function removeTopic(label: string) {
    save(selectedTopics.filter((t) => t !== label));
  }

  function clearAll() {
    save([]);
  }

  return {
    selectedTopics,
    toggleTopic,
    addCustomTopic,
    removeTopic,
    clearAll,
    presetTopics: PRESET_TOPICS,
  };
}
