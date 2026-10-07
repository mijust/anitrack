export interface AnimeBase {
  anilist_id: number;
  title: string;
  cover_image?: string | null;
  score?: number | null;
  episodes?: number | null;
}

export type GroupedAnime<T extends AnimeBase> = T & {
  isGroup: boolean;
  franchiseTitle: string;
  seasonCount: number;
  totalEpisodes: number | null;
  seasons: T[];
};

/**
 * Normalizes an anime title by stripping season, part, cour, and release year indicators.
 * E.g. "Attack on Titan Season 3 Part 2" -> "Attack on Titan"
 * "Mob Psycho 100 III" -> "Mob Psycho 100"
 * "Dr. STONE: Stone Wars" -> "Dr. STONE"
 */
export function normalizeFranchiseTitle(title: string): string {
  if (!title) return "";
  let t = title.trim();

  // Strip release years/format: (2011), (2024), (TV)
  t = t.replace(/\s*\((?:(?:19|20)\d{2}|TV)\)\s*/gi, " ").trim();

  // Strip season and arc patterns
  const patterns = [
    /[:\s–—-]+(?:the\s+)?final\s+season.*$/i,
    /[:\s–—-]+(?:the\s+)?final\s+chapters?.*$/i,
    /[:\s–—-]+(?:season|staffel)\s*\d+.*$/i,
    /[:\s–—-]+\d+(?:st|nd|rd|th)\s+season.*$/i,
    /[:\s–—-]+s\d+.*$/i,
    /[:\s–—-]+part\s*\d+.*$/i,
    /[:\s–—-]+cour\s*\d+.*$/i,
    /[:\s–—-]+teil\s*\d+.*$/i,
    /[:\s–—-]+2nd\s+season.*$/i,
    /[:\s–—-]+(?:the\s+)?(?:entertainment district|swordsmith village|hashira training|mugen train)\s+arc.*$/i,
    /[:\s–—-]+.*?arc$/i,
    /[:\s–—-]+stone\s+wars.*$/i,
    /[:\s–—-]+new\s+world.*$/i,
    /[:\s–—-]+science\s+future.*$/i,
    /[:\s–—-]+thousand-year\s+blood\s+war.*$/i,
    /[:\s–—-]+alicization.*$/i,
    /[:\s–—-]+-?ultra romantic-?$/i,
    /[:\s–—-]+-?arise from the shadow-?$/i,
    /[:\s–—-]+war of underworld.*$/i,
    /[:\s–—-]+the separation.*$/i,
    /[:\s–—-]+the conflict.*$/i,
  ];

  for (const pat of patterns) {
    t = t.replace(pat, "");
  }

  // Strip Roman numerals II to X at the very end
  t = t.replace(/[\s:–—-]+(?:II|III|IV|V|VI|VII|VIII|IX|X)$/i, "");

  // Trailing punctuation
  t = t.replace(/[:\s–—\-.]+$/, "").trim();

  return t || title;
}

/**
 * Returns a simplified lowercase key for grouping (only alphanumeric characters and spaces).
 */
export function getFranchiseKey(title: string): string {
  const norm = normalizeFranchiseTitle(title).toLowerCase();
  return norm.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extracts season and part numbers for natural chronological sorting.
 */
export function extractSeasonOrder(title: string): { season: number; part: number } {
  const seasonMatch =
    title.match(/(?:Season|Staffel)\s*(\d+)/i) ||
    title.match(/\b(\d+)(?:st|nd|rd|th)\s+Season/i);
  const partMatch = title.match(/(?:Part|Teil|Cour)\s*(\d+)/i);
  const finalMatch = /Final\s+Season|The\s+Final\s+Chapters?/i.test(title);
  const romanMatch = title.match(/[\s:–—-]+(II|III|IV|V|VI|VII|VIII|IX|X)$/i);

  let season = 1;
  const part = partMatch ? parseInt(partMatch[1], 10) : 1;

  if (finalMatch) {
    season = 99;
  } else if (seasonMatch) {
    season = parseInt(seasonMatch[1], 10);
  } else if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    const map: Record<string, number> = {
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
    };
    season = map[roman] ?? 1;
  }

  return { season, part };
}

/**
 * Produces a human-friendly German label for a specific season in a franchise.
 * E.g. "Staffel 1", "Staffel 2", "Staffel 3 (Teil 2)", "Final Season"
 */
export function getSeasonLabel(
  title: string,
  franchiseTitle?: string,
  index = 0,
): string {
  if (!title) return `Staffel ${index + 1}`;
  const { season, part } = extractSeasonOrder(title);
  const finalMatch = /Final\s+Season|The\s+Final\s+Chapters?/i.test(title);
  const hasPart = /(?:Part|Teil|Cour)\s*\d+/i.test(title);

  let sub = "";
  if (franchiseTitle && title.toLowerCase().startsWith(franchiseTitle.toLowerCase())) {
    sub = title.slice(franchiseTitle.length).replace(/^[:\s–—-]+/, "").trim();
  }

  if (finalMatch) {
    return hasPart ? `Final Season (Teil ${part})` : "Final Season";
  }
  if (season > 1) {
    return hasPart ? `Staffel ${season} (Teil ${part})` : `Staffel ${season}`;
  }
  if (hasPart) {
    return `Teil ${part}`;
  }
  if (sub && sub.length < 32) {
    return sub;
  }
  return `Staffel ${index + 1}`;
}

/**
 * Groups an array of anime entries (from search, seasonal catalog, recommendations, or watchlist)
 * into consolidated franchise entries.
 */
export function groupAnimeByFranchise<T extends AnimeBase>(items: T[]): GroupedAnime<T>[] {
  if (!items || items.length === 0) return [];

  // Pass 1: Bucket by normalized franchise key
  const bucketMap = new Map<string, T[]>();
  for (const item of items) {
    const key = getFranchiseKey(item.title);
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(item);
  }

  // Pass 2: Merge prefix groups (e.g. "dr stone" and "dr stone stone wars")
  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => a.length - b.length);
  const mergedMap = new Map<string, T[]>();

  for (const k of sortedKeys) {
    let matchedRoot: string | null = null;
    for (const root of mergedMap.keys()) {
      if (root.length >= 3 && (k === root || k.startsWith(root + " "))) {
        matchedRoot = root;
        break;
      }
    }
    if (matchedRoot) {
      mergedMap.get(matchedRoot)!.push(...bucketMap.get(k)!);
    } else {
      mergedMap.set(k, [...bucketMap.get(k)!]);
    }
  }

  // Pass 3: Construct GroupedAnime items maintaining list order
  const result: GroupedAnime<T>[] = [];
  const processedRoots = new Set<string>();

  for (const item of items) {
    const itemKey = getFranchiseKey(item.title);
    let rootKey = itemKey;
    for (const root of mergedMap.keys()) {
      if (root.length >= 3 && (itemKey === root || itemKey.startsWith(root + " "))) {
        rootKey = root;
        break;
      }
    }

    if (processedRoots.has(rootKey)) continue;
    processedRoots.add(rootKey);

    const groupItems = mergedMap.get(rootKey) || [item];

    // Sort seasons chronologically
    groupItems.sort((a, b) => {
      const orderA = extractSeasonOrder(a.title);
      const orderB = extractSeasonOrder(b.title);
      if (orderA.season !== orderB.season) return orderA.season - orderB.season;
      if (orderA.part !== orderB.part) return orderA.part - orderB.part;
      return a.anilist_id - b.anilist_id;
    });

    // Primary item is the first season
    const primary = groupItems[0];
    const franchiseTitle = normalizeFranchiseTitle(primary.title);

    let totalEpisodes: number | null = null;
    let hasEpisodes = false;
    let epSum = 0;
    for (const it of groupItems) {
      if (typeof it.episodes === "number" && it.episodes > 0) {
        epSum += it.episodes;
        hasEpisodes = true;
      }
    }
    if (hasEpisodes) totalEpisodes = epSum;

    result.push({
      ...primary,
      isGroup: groupItems.length > 1,
      franchiseTitle,
      seasonCount: groupItems.length,
      totalEpisodes,
      seasons: groupItems,
    });
  }

  return result;
}
