import type { Artwork } from "./met/normalize";
import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "./met/search-query";

const PREFIX = "mtm-seq:";
// The Explore grid can never show more than SEARCH_PAGE_SIZE *
// SEARCH_MAX_PAGE works, so the stored sequence is bounded the same way.
const MAX_ITEMS = SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE;
// Distinct search identities accumulate one storage entry each (review
// 09-19 P2: unbounded keys until quota, then silent degradation). The
// index bounds them — newest write wins a slot, the oldest key is
// evicted whole. Sessions rarely page more than a handful of searches.
const MAX_KEYS = 8;
const INDEX_KEY = `${PREFIX}_index`;

/**
 * The only fields the prev/next trail reads — `ArtworkImage` (image
 * source, aspect-ratio frame, alt text) and the link title. Storing the
 * whole `Artwork` (bio, tags, dimensions, creditLine) bloated each entry
 * ~10x and pushed the session toward quota for nothing (review 09-19 P3).
 */
export type SequenceEntry = Pick<
  Artwork,
  | "id"
  | "displayTitle"
  | "artist"
  | "primaryImage"
  | "primaryImageSmall"
  | "imageAspectRatio"
>;

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

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
      ? parsed.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIndex(store: StorageLike, keys: string[]): void {
  try {
    store.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    // Index write failure: the next writeBrowseSequence rebuilds it.
  }
}

/**
 * Remove every `PREFIX*` entry the rebuilt index does not claim. A corrupt
 * or truncated index self-heals to just the surviving keys, but the
 * entries it forgot stay on disk and still count toward the quota the LRU
 * exists to protect — same for an entry orphaned by a failed index write
 * (review 09-19 P2). Iterates backwards so removeItem cannot shift keys
 * past the cursor. INDEX_KEY itself is never swept.
 */
function sweepOrphanedEntries(
  store: StorageLike,
  keep: ReadonlySet<string>,
): void {
  try {
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const storedKey = store.key(i);
      if (
        storedKey?.startsWith(PREFIX) &&
        storedKey !== INDEX_KEY &&
        !keep.has(storedKey.slice(PREFIX.length))
      ) {
        store.removeItem(storedKey);
      }
    }
  } catch {
    // Enumeration or removal on a hostile store — best-effort hygiene.
  }
}

function isStoredEntry(value: unknown): value is SequenceEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SequenceEntry>;
  // Sequence entries feed ArtworkImage + the prev/next cards, which read
  // title, an image source and the aspect ratio — a truncated or
  // tampered entry must drop here rather than render a broken thumb or
  // an invalid aspect ratio (review 09-19 P3).
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
 * Opaque token for the `?seq=` param. The raw search identity used to
 * ride inside every detail URL (`?seq=van+Gogh%7Call%7C%7C%7Clive`) —
 * unshareable, leaking the query into history, and unbounded in length
 * for both the URL and the storage key (review 09-19 P2). djb2 → base36
 * is short, deterministic, and needs no async crypto; a collision only
 * degrades that identity to the curated neighbors.
 */
export function sequenceToken(identity: string): string {
  let hash = 5381;
  for (let index = 0; index < identity.length; index += 1) {
    hash = ((hash << 5) + hash + identity.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * The Explore grid is the sequence a visitor is actually browsing, but
 * nothing carried it to the detail route — `getAdjacentArtworks` only
 * knew `curatedArtworks`, so Previous/Next went dead for any
 * live-fetched work (devin 09-09 06:17 P1). Explore persists the
 * displayed order here under the sequence token; the detail route
 * resolves neighbors from it, so prev/next follow the list the visitor
 * came from — including deep-loaded pages the curated set never
 * contained.
 *
 * Returns whether the write landed — the caller must not mark a
 * quota-failed write as done, or the retry that could succeed once
 * storage frees up never happens (review 09-19 P3).
 */
export function writeBrowseSequence(key: string, artworks: Artwork[]): boolean {
  const store = storage();
  // An empty result under a real identity would index a slot holding no
  // browsed order — and evict a real sequence for nothing (sibling
  // review 09-19). Nothing to persist, nothing to index.
  if (!store || artworks.length === 0) return false;
  try {
    store.setItem(
      PREFIX + key,
      JSON.stringify(
        artworks.slice(0, MAX_ITEMS).map(
          (artwork): SequenceEntry => ({
            id: artwork.id,
            displayTitle: artwork.displayTitle,
            artist: artwork.artist,
            primaryImage: artwork.primaryImage,
            primaryImageSmall: artwork.primaryImageSmall,
            imageAspectRatio: artwork.imageAspectRatio,
          }),
        ),
      ),
    );
  } catch {
    // Quota or a disabled store: sequence nav degrades to the curated set.
    return false;
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
  // Entries the index forgot (corrupt/oversize index, a failed index
  // write) are invisible to the LRU but still burn quota — sweep them.
  sweepOrphanedEntries(store, new Set(keys));
  writeIndex(store, keys);
  return true;
}

export function readBrowseSequence(key: string): SequenceEntry[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredEntry) : [];
  } catch {
    return [];
  }
}

export type SequenceNeighbors = {
  previous: SequenceEntry | null;
  next: SequenceEntry | null;
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
