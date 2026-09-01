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

export function setCached<T>(key: string, value: T, ttl: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

// Test-only escape hatch: clears the whole cache. Production code never
// needs to invalidate The Met data within a process lifetime.
export function clearMetCache(): void {
  store.clear();
}
