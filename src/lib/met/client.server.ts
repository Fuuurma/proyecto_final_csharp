import { curatedArtworks } from "@/data/curated-artworks";
import type { MetDepartment } from "@/data/departments";
import {
  CACHE_TTL_MS,
  dedupeMetFetch,
  EDGE_TTL_S,
  getCached,
  getEdgeCached,
  getStaleCached,
  setCached,
  setEdgeCached,
} from "./cache";
import { type Artwork, normalizeMetObject } from "./normalize";
import {
  metDepartmentsSchema,
  metObjectSchema,
  metSearchSchema,
} from "./schemas";

export {
  pageItems as sliceSearchPage,
  SEARCH_MAX_PAGE,
  SEARCH_PAGE_SIZE,
} from "./search-query";

const API_ROOT = "https://collectionapi.metmuseum.org/public/collection/v1";
const DEFAULT_TIMEOUT_MS = 3_000;
const CIRCUIT_FAILURE_LIMIT = 3;
const CIRCUIT_OPEN_MS = 30_000;
let consecutiveFailures = 0;
let circuitOpenedAt: number | undefined;
let probeInFlight = false;

export function resetMetCircuitBreaker(): void {
  consecutiveFailures = 0;
  circuitOpenedAt = undefined;
  probeInFlight = false;
}

async function withMetCircuit<T>(load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (circuitOpenedAt !== undefined) {
    if (now - circuitOpenedAt < CIRCUIT_OPEN_MS || probeInFlight) {
      throw new MetApiError("unavailable", "The Met API circuit is open");
    }
    probeInFlight = true;
  }

  try {
    const result = await load();
    consecutiveFailures = 0;
    circuitOpenedAt = undefined;
    return result;
  } catch (error) {
    if (
      error instanceof MetApiError &&
      (error.kind === "timeout" || error.kind === "unavailable")
    ) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= CIRCUIT_FAILURE_LIMIT) {
        circuitOpenedAt = Date.now();
      }
    }
    throw error;
  } finally {
    probeInFlight = false;
  }
}

export type MetApiErrorKind =
  | "timeout"
  | "unavailable"
  | "invalid"
  | "not-found";

export class MetApiError extends Error {
  readonly kind: MetApiErrorKind;
  readonly status: number | undefined;

  constructor(kind: MetApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "MetApiError";
    this.kind = kind;
    this.status = status;
  }
}

function withTimeout(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

async function fetchJson(
  url: string,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  return withMetCircuit(async () => {
    let response: Response;

    try {
      response = await fetcher(url, {
        signal: withTimeout(timeoutMs),
        headers: {
          "User-Agent":
            "MeetTheMet/1.0 (Collection Explorer; portfolio rebuild; https://github.com)",
          Accept: "application/json",
        },
      });
    } catch (error) {
      const name =
        error && typeof error === "object" && "name" in error
          ? error.name
          : null;
      if (name === "TimeoutError" || name === "AbortError") {
        throw new MetApiError("timeout", `The Met request timed out: ${url}`);
      }

      throw new MetApiError("unavailable", `The Met request failed: ${url}`);
    }

    if (response.status === 404) {
      throw new MetApiError(
        "not-found",
        `The Met object was not found: ${url}`,
        404,
      );
    }

    if (!response.ok) {
      throw new MetApiError(
        "unavailable",
        `The Met API returned ${response.status}`,
        response.status,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new MetApiError(
        "invalid",
        `The Met returned malformed JSON: ${url}`,
      );
    }
  });
}

async function loadMetObject(
  url: string,
  objectId: number,
  options: { fetcher?: typeof fetch; timeoutMs?: number },
): Promise<Artwork> {
  const payload = await fetchJson(
    url,
    options.fetcher ?? fetch,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const parsed = metObjectSchema.safeParse(payload);
  if (!parsed.success) {
    throw new MetApiError(
      "invalid",
      `The Met object ${objectId} did not match the expected shape`,
    );
  }

  const artwork = normalizeMetObject(parsed.data);
  // Curated titles win over the Met's raw titles for live-fetched objects
  // too (c53e8ba removed the normalizer's magic-ID special case; without
  // this overlay, live searches showing 56353 lost "The Great Wave").
  const curated = curatedArtworks.find((a) => a.id === artwork.id);
  return curated?.displayTitle
    ? { ...artwork, displayTitle: curated.displayTitle }
    : artwork;
}

export async function fetchMetObject(
  objectId: number,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<Artwork> {
  const url = `${API_ROOT}/objects/${objectId}`;
  // A custom fetcher bypasses both cache tiers and dedupe so tests stay
  // deterministic — caching is only for the production global-fetch path.
  if (options.fetcher !== undefined)
    return loadMetObject(url, objectId, options);

  return dedupeMetFetch(url, async () => {
    const cached =
      getCached<Artwork>(url) ?? (await getEdgeCached<Artwork>(url));
    if (cached) {
      // An edge hit warms the isolate-local tier for repeat reads.
      setCached(url, cached, CACHE_TTL_MS.object);
      return cached;
    }

    let artwork: Artwork;
    try {
      artwork = await loadMetObject(url, objectId, options);
    } catch (error) {
      const stale = getStaleCached<Artwork>(url);
      if (
        stale &&
        error instanceof MetApiError &&
        (error.kind === "timeout" || error.kind === "unavailable")
      )
        return stale;
      throw error;
    }
    setCached(url, artwork, CACHE_TTL_MS.object);
    await setEdgeCached(url, artwork, EDGE_TTL_S.object);
    return artwork;
  });
}

async function loadMetDepartments(
  url: string,
  options: { fetcher?: typeof fetch; timeoutMs?: number },
): Promise<MetDepartment[]> {
  const payload = await fetchJson(
    url,
    options.fetcher ?? fetch,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const parsed = metDepartmentsSchema.safeParse(payload);

  if (!parsed.success) {
    throw new MetApiError(
      "invalid",
      "The Met department index did not match the expected shape",
    );
  }

  return parsed.data.departments.map((department) => ({
    id: department.departmentId,
    name: department.displayName,
  }));
}

export async function fetchMetDepartments(
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<MetDepartment[]> {
  const url = `${API_ROOT}/departments`;
  if (options.fetcher !== undefined) return loadMetDepartments(url, options);

  return dedupeMetFetch(url, async () => {
    const cached =
      getCached<MetDepartment[]>(url) ??
      (await getEdgeCached<MetDepartment[]>(url));
    if (cached) {
      setCached(url, cached, CACHE_TTL_MS.departments);
      return cached;
    }

    let departments: MetDepartment[];
    try {
      departments = await loadMetDepartments(url, options);
    } catch (error) {
      const stale = getStaleCached<MetDepartment[]>(url);
      if (
        stale &&
        error instanceof MetApiError &&
        (error.kind === "timeout" || error.kind === "unavailable")
      )
        return stale;
      throw error;
    }
    setCached(url, departments, CACHE_TTL_MS.departments);
    await setEdgeCached(url, departments, EDGE_TTL_S.departments);
    return departments;
  });
}

/** ID-list entries above this size skip the cache: generous for any
 * real paging session (page size 24), small against a 128MB isolate. */
export const MAX_CACHED_SEARCH_IDS = 20_000;

export type MetSearchIds = {
  total: number;
  objectIds: number[];
  preFiltered: boolean;
};

async function loadMetSearchIds(
  cacheKey: string,
  preFiltered: boolean,
  options: { fetcher?: typeof fetch; timeoutMs?: number },
): Promise<MetSearchIds> {
  const payload = await fetchJson(
    cacheKey,
    options.fetcher ?? fetch,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const parsed = metSearchSchema.safeParse(payload);

  if (!parsed.success) {
    throw new MetApiError(
      "invalid",
      "The Met search response did not match the expected shape",
    );
  }

  return {
    total: parsed.data.total,
    objectIds: parsed.data.objectIDs ?? [],
    preFiltered,
  };
}

export async function fetchMetSearchIds(
  query: string,
  options: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
    limit?: number;
    departmentId?: number;
  } = {},
): Promise<MetSearchIds> {
  let url: URL;
  // Whether the upstream ALREADY filtered to open-access rows decides how
  // the caller may interpret drops: /search honours the params, /objects
  // ignores them (devin 09-09 14:17 #1) — there the client-side sieve in
  // takeOpenAccessPage is the contract, and drops are expected, not
  // "partial".
  let preFiltered: boolean;
  const trimmed = query.trim();

  if (trimmed.length === 0 && options.departmentId !== undefined) {
    url = new URL(`${API_ROOT}/objects`);
    url.searchParams.set("departmentIds", String(options.departmentId));
    // hasImages/isPublicDomain are IGNORED by /objects — sent for
    // forward-compatibility only. total here counts the whole
    // department; the open-access window is the client's job.
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    preFiltered = false;
  } else {
    url = new URL(`${API_ROOT}/search`);
    url.searchParams.set("q", trimmed.length > 0 ? trimmed : "*");
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    if (options.departmentId !== undefined) {
      url.searchParams.set("departmentId", String(options.departmentId));
    }
    preFiltered = true;
  }

  // The `limit` option is a caller-side slice, not part of the upstream
  // request, so it must not participate in the cache key.
  const cacheKey = url.toString();
  const slice = (result: MetSearchIds): MetSearchIds =>
    options.limit === undefined
      ? result
      : { ...result, objectIds: result.objectIds.slice(0, options.limit) };

  if (options.fetcher !== undefined) {
    return slice(await loadMetSearchIds(cacheKey, preFiltered, options));
  }

  const result = await dedupeMetFetch(cacheKey, async () => {
    const cached =
      getCached<MetSearchIds>(cacheKey) ??
      (await getEdgeCached<MetSearchIds>(cacheKey));
    if (cached) {
      setCached(cacheKey, cached, CACHE_TTL_MS.search);
      return cached;
    }

    let loaded: MetSearchIds;
    try {
      loaded = await loadMetSearchIds(cacheKey, preFiltered, options);
    } catch (error) {
      const stale = getStaleCached<MetSearchIds>(cacheKey);
      if (
        stale &&
        error instanceof MetApiError &&
        (error.kind === "timeout" || error.kind === "unavailable")
      )
        return stale;
      throw error;
    }

    // Value-size bound: MAX_ENTRIES bounds the cache by KEY count, not
    // weight — a whole-department /objects listing (~100k ids) or a bare
    // q=* search (~470k ids) would ride in as a single entry, and a burst
    // of large listings pressures the Worker isolate's memory (devin
    // 09-10 12:50 P1). Oversize listings still serve, just uncached: the
    // search TTL would forget them mid-paging anyway, and refetching is
    // the same upstream cost the no-cache path always paid.
    if (loaded.objectIds.length <= MAX_CACHED_SEARCH_IDS) {
      setCached(cacheKey, loaded, CACHE_TTL_MS.search);
      await setEdgeCached(cacheKey, loaded, EDGE_TTL_S.search);
    }
    return loaded;
  });
  return slice(result);
}

export async function fetchMetObjects(
  objectIds: number[],
  options: {
    concurrency?: number;
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<Artwork[]> {
  const queue = objectIds.map((objectId, index) => ({ objectId, index }));
  const results: Array<Artwork | null> = Array.from(
    { length: objectIds.length },
    () => null,
  );
  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? 4, objectIds.length || 1),
  );

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;

      try {
        results[next.index] = await fetchMetObject(next.objectId, options);
      } catch (error) {
        // A failed object degrades to null in the batch — but the failure
        // must be visible, not silently absorbed (devin 09-09 13:37).
        console.warn(
          `[met] object ${next.objectId} fetch failed; returning null for this slot`,
          error,
        );
        results[next.index] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.filter((artwork): artwork is Artwork => artwork !== null);
}
