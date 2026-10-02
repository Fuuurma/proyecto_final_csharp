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
 * Opaque token for the `?seq=` param — the storage-key half. The raw
 * search identity used to ride inside every detail URL
 * (`?seq=van+Gogh%7Call%7C%7C%7Clive`) — unshareable, leaking the query
 * into history, and unbounded in length for both the URL and the
 * storage key (review 09-19 P2). djb2 → base36 is short, deterministic,
 * and needs no async crypto.
 */
export function sequenceToken(identity: string): string {
  let hash = 5381;
  for (let index = 0; index < identity.length; index += 1) {
    hash = ((hash << 5) + hash + identity.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Ownership signature — the second half of the `?seq=` param, stored
 * inside the entry and checked on read. A 32-bit key can collide
 * across a session's distinct searches, and a colliding identity's
 * write legitimately wins the shared slot; without the signature the
 * displaced identity's links would read the foreign list and render a
 * confident wrong trail (review 09-19 18:17 P2). fnv-1a is independent
 * of djb2, so a key collision alone cannot alias — only a simultaneous
 * djb2+fnv collision (~2^-64) could, which is documented here rather
 * than claimed impossible.
 */
export function sequenceSignature(identity: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * The `?seq=` value: `<key>.<sig>`. The key selects the storage slot;
 * the sig must match the entry's stored signature or the read returns
 * nothing — an evicted, absent, or collision-displaced sequence all
 * surface identically as "no trail" instead of a confident wrong one.
 */
export function sequenceParam(identity: string): string {
  return `${sequenceToken(identity)}.${sequenceSignature(identity)}`;
}

function parseSeqParam(param: string): { key: string; sig: string } | null {
  const dot = param.indexOf(".");
  if (dot <= 0 || dot === param.length - 1) return null;
  return { key: param.slice(0, dot), sig: param.slice(dot + 1) };
}

/** Stored payload: the owning identity's signature plus the list. */
type StoredSequence = { sig: string; items: SequenceEntry[] };

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
export function writeBrowseSequence(
  param: string,
  artworks: Artwork[],
): boolean {
  const store = storage();
  const parsed = parseSeqParam(param);
  // An empty result under a real identity would index a slot holding no
  // browsed order — and evict a real sequence for nothing (sibling
  // review 09-19). A malformed param (no signature half) cannot be
  // read back either, so it is refused up front. Nothing to persist,
  // nothing to index.
  if (!store || !parsed || artworks.length === 0) return false;
  const { key, sig } = parsed;
  try {
    const payload: StoredSequence = {
      sig,
      items: artworks.slice(0, MAX_ITEMS).map(
        (artwork): SequenceEntry => ({
          id: artwork.id,
          displayTitle: artwork.displayTitle,
          artist: artwork.artist,
          primaryImage: artwork.primaryImage,
          primaryImageSmall: artwork.primaryImageSmall,
          imageAspectRatio: artwork.imageAspectRatio,
        }),
      ),
    };
    store.setItem(PREFIX + key, JSON.stringify(payload));
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

export function readBrowseSequence(param: string): SequenceEntry[] {
  const store = storage();
  const parsed = parseSeqParam(param);
  if (!store || !parsed) return [];
  try {
    const raw = store.getItem(PREFIX + parsed.key);
    if (!raw) return [];
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object") return [];
    const envelope = payload as Partial<StoredSequence>;
    // A colliding identity legitimately wins the shared key on write —
    // its signature then owns the slot, and this identity's links must
    // read nothing rather than the foreign list (review 09-19 18:17 P2).
    if (envelope.sig !== parsed.sig) return [];
    return Array.isArray(envelope.items)
      ? envelope.items.filter(isStoredEntry)
      : [];
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
  param: string,
  artworkId: number,
): SequenceNeighbors | null {
  const sequence = readBrowseSequence(param);
  const index = sequence.findIndex((item) => item.id === artworkId);
  if (index < 0) return null;
  return {
    previous: sequence[index - 1] ?? null,
    next: sequence[index + 1] ?? null,
    position: index + 1,
    total: sequence.length,
  };
}
