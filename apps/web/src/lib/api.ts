export type User = {
  id: number;
  username: string;
  created_at: string;
};

export type AnimeEntry = {
  id: number;
  user_id: number;
  anilist_id: number;
  title: string;
  cover_image: string | null;
  user_rating: number | null;
  status: "watching" | "completed" | "planned" | "paused" | "dropped" | "dismissed";
  episodes_watched: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NextAiring = {
  episode: number;
  airing_at: number;
  time_until_airing: number;
};

export type AnimeSearchResult = {
  anilist_id: number;
  title: string;
  cover_image: string | null;
  score: number | null;
  episodes: number | null;
  genres: string[];
  status?: string | null;
  next_airing?: NextAiring | null;
};

export type SeasonSelection = {
  season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  year: number;
};

export type AnimeEvaluation = {
  title?: string;
  synopsis?: string;
  story_quality?: string;
  animation_quality?: string;
  ecchi_level?: string;
  violence_level?: string;
  content_notes?: string;
  match_reason?: string;
  verdict?: string;
};

export type AnimeAskResponse = {
  answer: string;
  score: number | null;
  recommendations: { title: string; score: number | null; reason: string }[];
  evaluation?: AnimeEvaluation | null;
};

export type TopicItem = {
  id: string;
  label: string;
  category: "genre" | "theme";
};

export type AnimeStudio = {
  id?: number | null;
  name: string;
  is_animation_studio: boolean;
};

export type AnimeTrailer = {
  id?: string | null;
  site?: string | null;
  thumbnail?: string | null;
};

export type AnimeTag = {
  name: string;
  rank?: number | null;
};

export type AnimeRelation = {
  id: number;
  relation_type: string;
  title: string;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  season_year?: number | null;
  cover_image?: string | null;
};

export type AnimeDetails = {
  anilist_id: number;
  title: string;
  romaji_title?: string | null;
  native_title?: string | null;
  cover_image?: string | null;
  banner_image?: string | null;
  description?: string | null;
  score?: number | null;
  mean_score?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  season_year?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  genres: string[];
  tags: AnimeTag[];
  studios: AnimeStudio[];
  trailer?: AnimeTrailer | null;
  source?: string | null;
  next_airing?: NextAiring | null;
  relations?: AnimeRelation[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Anfrage fehlgeschlagen");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  search: (query: string, signal?: AbortSignal) => request<AnimeSearchResult[]>(`/api/catalog/search?search=${encodeURIComponent(query)}`, { signal }),
  seasonal: (selection: SeasonSelection, genre?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ season: selection.season, year: String(selection.year) });
    if (genre) params.set("genre", genre);
    return request<AnimeSearchResult[]>(`/api/catalog/seasonal?${params.toString()}`, { signal });
  },
  airing: (ids?: number[], perPage = 30, signal?: AbortSignal) => {
    const params = new URLSearchParams({ per_page: String(perPage) });
    if (ids && ids.length > 0) {
      for (const id of ids) {
        params.append("ids", String(id));
      }
    }
    return request<AnimeSearchResult[]>(`/api/catalog/airing?${params.toString()}`, { signal });
  },
  recommendations: (limit = 10, signal?: AbortSignal) => request<AnimeSearchResult[]>(`/api/recommendations?limit=${limit}`, { signal }),
  details: (query: { id?: number; search?: string }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (query.id) params.set("id", String(query.id));
    if (query.search) params.set("search", query.search);
    return request<AnimeDetails>(`/api/catalog/details?${params.toString()}`, { signal });
  },
  topics: (signal?: AbortSignal) => request<{ topics: TopicItem[] }>("/api/anime-ask/topics", { signal }),
  ask: (
    mode: "evaluate" | "recommend",
    prompt: string,
    options?: { animeTitle?: string; favoriteTopics?: string[]; signal?: AbortSignal }
  ) =>
    request<AnimeAskResponse>("/api/anime-ask", {
      method: "POST",
      signal: options?.signal,
      body: JSON.stringify({
        mode,
        prompt,
        anime_title: options?.animeTitle,
        favorite_topics: options?.favoriteTopics ?? [],
      }),
    }),
  entries: (status?: string, signal?: AbortSignal) =>
    request<AnimeEntry[]>(status ? `/api/anime-entries?status=${status}` : "/api/anime-entries", { signal }),
  createEntry: (
    anime: Pick<AnimeSearchResult, "anilist_id" | "title" | "cover_image">,
    extra?: Partial<Pick<AnimeEntry, "status" | "user_rating" | "episodes_watched" | "notes">>,
  ) =>
    request<AnimeEntry>("/api/anime-entries", {
      method: "POST",
      body: JSON.stringify({
        anilist_id: anime.anilist_id,
        title: anime.title,
        cover_image: anime.cover_image,
        ...extra,
      }),
    }),
  updateEntry: (id: number, update: Partial<Pick<AnimeEntry, "status" | "user_rating" | "episodes_watched" | "notes">>) =>
    request<AnimeEntry>(`/api/anime-entries/${id}`, { method: "PATCH", body: JSON.stringify(update) }),
  deleteEntry: (id: number) => request<void>(`/api/anime-entries/${id}`, { method: "DELETE" }),
};
