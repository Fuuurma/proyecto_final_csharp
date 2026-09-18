import type { Artwork } from "./met/normalize";
import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "./met/search-query";

const PREFIX = "mtm-seq:";
// The Explore grid can never show more than SEARCH_PAGE_SIZE *
// SEARCH_MAX_PAGE works, so the stored sequence is bounded the same way.
const MAX_ITEMS = SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE;
// Distinct search identities accumulate one storage entry each (review
// 09-18 P2: unbounded keys until quota, then silent degradation). The
// index bounds them — newest write wins a slot, the oldest key is
// evicted whole. Sessions rarely page more than a handful of searches.
const MAX_KEYS = 8;
const INDEX_KEY = `${PREFIX}_index`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Ordered most-recent-first list of stored keys; corrupt index = empty. */
function readIndex(store: StorageLike): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIndex(store: StorageLike, keys: string[]): void {
  try {
    store.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    // Index write failure: the next storeSequence rebuilds it.
  }
}

function isStoredArtwork(value: unknown): value is Artwork {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Artwork>;
  // Sequence entries feed ArtworkImage + the prev/next cards, which read
  // title, an image source and the aspect ratio — a truncated or
  // tampered entry must drop here rather than render undefined fields
  // (review 09-18 P1).
  return (
    typeof item.id === "number" &&
    typeof item.displayTitle === "string" &&
    (typeof item.primaryImage === "string" ||
      typeof item.primaryImageSmall === "string") &&
    typeof item.imageAspectRatio === "number" &&
    Number.isFinite(item.imageAspectRatio) &&
    item.imageAspectRatio > 0
  );
}

/**
 * The Explore grid is the sequence a visitor is actually browsing, but
 * nothing carried it to the detail route — `getAdjacentArtworks` only knew
 * `curatedArtworks`, so Previous/Next went dead for any live-fetched work
 * (devin 09-09 06:17 P1). Explore persists the displayed order here under
 * the search identity; the detail route resolves neighbors from it, so
 * prev/next follow the list the visitor came from — including deep-loaded
 * pages the curated set never contained.
 */
export function writeBrowseSequence(key: string, artworks: Artwork[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify(artworks.slice(0, MAX_ITEMS)));
  } catch {
    // Quota or a disabled store: sequence nav degrades to the curated set.
    return;
  }
  // Bound the number of stored identities: upsert this key to the front
  // and evict the oldest beyond MAX_KEYS, entry and all.
  const keys = readIndex(store).filter((k) => k !== key);
  keys.unshift(key);
  const evicted = keys.splice(MAX_KEYS);
  for (const old of evicted) {
    try {
      store.removeItem(PREFIX + old);
    } catch {
      // Entry already gone or store turned hostile — eviction is best-effort.
    }
  }
  writeIndex(store, keys);
}

export function readBrowseSequence(key: string): Artwork[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredArtwork) : [];
  } catch {
    return [];
  }
}

export type SequenceNeighbors = {
  previous: Artwork | null;
  next: Artwork | null;
  position: number;
  total: number;
};

export function adjacentInSequence(
  key: string,
  artworkId: number,
): SequenceNeighbors | null {
  const sequence = readBrowseSequence(key);
  const index = sequence.findIndex((item) => item.id === artworkId);
  if (index < 0) return null;
  return {
    previous: sequence[index - 1] ?? null,
    next: sequence[index + 1] ?? null,
    position: index + 1,
    total: sequence.length,
  };
}
