// In-process TTL cache for The Met Open Access API.
//
// The adapter is the only module that talks to the upstream API, so this is
// the right place to keep request-level caching. Per AGENTS.md:
//   - departments and curated objects: long-lived
//   - arbitrary search: shorter
//
// The cache is module-scoped and lives for the lifetime of the server
// process. It is intentionally simple (Map + TTL) because The Met data is
// effectively immutable and we only need to avoid re-fetching within a
// request burst and across nearby requests.

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL_MS = {
  departments: 24 * 60 * 60 * 1000, // 24h — department index rarely changes
  object: 60 * 60 * 1000, // 1h — object records are effectively immutable
  search: 60 * 1000, // 60s — arbitrary search results shift, but burst-safe
} as const;

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/** Evicted entries keep the isolate-local map bounded: expired entries
 * only delete on read otherwise, so diverse search traffic (a new key per
 * query) would accumulate dead entries until the isolate dies. The cap is
 * generous — the point is a bound, not an LRU. */
export const MAX_ENTRIES = 500;

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

export function setCached<T>(key: string, value: T, ttl: number): void {
  // Updating an existing key is a refresh, not an insertion — it must
  // not evict an unrelated entry (devin 09-09 16:57 #8). Delete first
  // so the capacity check sees the true free budget.
  store.delete(key);
  if (store.size >= MAX_ENTRIES) {
    sweepExpired();
    if (store.size >= MAX_ENTRIES) {
      // Still full of live entries: drop the soonest-to-expire.
      let oldestKey: string | undefined;
      let oldestExpiry = Infinity;
      for (const [candidateKey, entry] of store) {
        if (entry.expiresAt < oldestExpiry) {
          oldestExpiry = entry.expiresAt;
          oldestKey = candidateKey;
        }
      }
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

// Test-only escape hatch: clears the whole cache. Production code never
// needs to invalidate The Met data within a process lifetime.
export function clearMetCache(): void {
  store.clear();
  inflight.clear();
}

// --- Concurrent-request dedupe -------------------------------------------
//
// Concurrent same-key misses share one upstream load. Hydration fans out
// page-size batches and isolates are shared across requests, so without
// this a cold start issues duplicate upstream calls for overlapping keys.
// Rejections are evicted immediately — a failed load never poisons the key.
const inflight = new Map<string, Promise<unknown>>();

export function dedupeMetFetch<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = load().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

// --- Edge tier (Cloudflare Cache API) ------------------------------------
//
// The Map above is isolate-local. `caches.default` is shared across
// isolates and colos for the deployment lifetime, which is what makes the
// upstream cache effective under real traffic. Met records are effectively
// immutable, so edge TTLs run days while search stays in minutes.
//
// Where `caches` is absent (vitest, plain node) the tier silently no-ops
// and the adapter falls back to the in-process map.
export const EDGE_TTL_S = {
  departments: 7 * 24 * 60 * 60, // 7d — department index is near-static
  object: 7 * 24 * 60 * 60, // 7d — object records are effectively immutable
  search: 10 * 60, // 10m — membership shifts as the collection is reindexed
} as const;

function edgeCache(): Cache | undefined {
  const storage = (globalThis as { caches?: CacheStorage }).caches;
  return (storage as (CacheStorage & { default?: Cache }) | undefined)?.default;
}

export async function getEdgeCached<T>(key: string): Promise<T | undefined> {
  const cache = edgeCache();
  if (!cache) return undefined;
  try {
    const hit = await cache.match(key);
    return hit ? ((await hit.json()) as T) : undefined;
  } catch {
    // Edge failures degrade to an upstream fetch, never a failed request.
    return undefined;
  }
}

export async function setEdgeCached(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    // Cache-Control: max-age is what expires the entry — the Cache API
    // honours it on match, so no manual eviction is needed.
    await cache.put(
      key,
      new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${ttlSeconds}`,
        },
      }),
    );
  } catch {
    // A failed edge write still leaves the in-process entry warm.
  }
}
