import type { Artwork } from "./met/normalize";
import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "./met/search-query";

const PREFIX = "mtm-seq:";
// The Explore grid can never show more than SEARCH_PAGE_SIZE *
// SEARCH_MAX_PAGE works, so the stored sequence is bounded the same way.
const MAX_ITEMS = SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function storage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isStoredArtwork(value: unknown): value is Artwork {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Artwork>;
  return typeof item.id === "number" && typeof item.displayTitle === "string";
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
  }
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
