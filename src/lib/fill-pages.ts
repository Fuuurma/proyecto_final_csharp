import type { Artwork } from "./met/normalize";

/**
 * Memoization for the explore route's tail-fill: navigating back to
 * `?page=N` used to refetch pages 2..N on every mount (correct but O(n)
 * per visit). This layer keeps ONE source of truth — the route still
 * renders `[...result.artworks, ...extra]` — and only skips network
 * round-trips for pages it has already seen in this session.
 */

export type PageCache<T> = Map<string, T[]>;

const MAX_CACHE_ENTRIES = 40;

export function pageCacheKey(
  parts: Array<string | number | undefined>,
  page: number,
): string {
  return `${JSON.stringify(parts)}#${page}`;
}

export function cachePages<T>(
  cache: PageCache<T>,
  key: string,
  items: T[],
): void {
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (typeof oldest === "string") cache.delete(oldest);
  }
  cache.set(key, items);
}

export async function collectPages(
  cache: PageCache<Artwork>,
  keyPrefix: Array<string | number | undefined>,
  from: number,
  to: number,
  fetchPage: (page: number) => Promise<Artwork[]>,
  hooks: {
    /** Called after every page with everything collected so far. */
    onChunk?: (collected: Artwork[]) => void;
    /** Checked before each fetch — return false to stop (no throw). */
    shouldContinue?: () => boolean;
  } = {},
): Promise<Artwork[]> {
  const collected: Artwork[] = [];
  for (let page = from; page <= to; page += 1) {
    if (hooks.shouldContinue && !hooks.shouldContinue()) return collected;
    const key = pageCacheKey(keyPrefix, page);
    const cached = cache.get(key);
    if (cached) {
      collected.push(...cached);
      hooks.onChunk?.(collected);
      continue;
    }
    const fetched = await fetchPage(page);
    cachePages(cache, key, fetched);
    collected.push(...fetched);
    hooks.onChunk?.(collected);
  }
  return collected;
}
