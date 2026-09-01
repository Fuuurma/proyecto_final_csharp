import type { MetDepartment } from "@/data/departments";
import { CACHE_TTL_MS, getCached, setCached } from "./cache";
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
const DEFAULT_TIMEOUT_MS = 8_000;

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
      error && typeof error === "object" && "name" in error ? error.name : null;
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
    throw new MetApiError("invalid", `The Met returned malformed JSON: ${url}`);
  }
}

export async function fetchMetObject(
  objectId: number,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<Artwork> {
  const url = `${API_ROOT}/objects/${objectId}`;
  const useCache = options.fetcher === undefined;

  if (useCache) {
    const cached = getCached<Artwork>(url);
    if (cached) return cached;
  }

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
  if (useCache) setCached(url, artwork, CACHE_TTL_MS.object);
  return artwork;
}

export async function fetchMetDepartments(
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<MetDepartment[]> {
  const url = `${API_ROOT}/departments`;
  const useCache = options.fetcher === undefined;

  if (useCache) {
    const cached = getCached<MetDepartment[]>(url);
    if (cached) return cached;
  }

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

  const departments = parsed.data.departments.map((department) => ({
    id: department.departmentId,
    name: department.displayName,
  }));
  if (useCache) setCached(url, departments, CACHE_TTL_MS.departments);
  return departments;
}

export async function fetchMetSearchIds(
  query: string,
  options: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
    limit?: number;
    departmentId?: number;
  } = {},
): Promise<{ total: number; objectIds: number[] }> {
  let url: URL;
  const trimmed = query.trim();

  if (trimmed.length === 0 && options.departmentId !== undefined) {
    url = new URL(`${API_ROOT}/objects`);
    url.searchParams.set("departmentIds", String(options.departmentId));
  } else {
    url = new URL(`${API_ROOT}/search`);
    url.searchParams.set("q", trimmed.length > 0 ? trimmed : "*");
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    if (options.departmentId !== undefined) {
      url.searchParams.set("departmentId", String(options.departmentId));
    }
  }

  // The `limit` option is a caller-side slice, not part of the upstream
  // request, so it must not participate in the cache key.
  const cacheKey = url.toString();
  const useCache = options.fetcher === undefined;

  if (useCache) {
    const cached = getCached<{ total: number; objectIds: number[] }>(cacheKey);
    if (cached) {
      return options.limit === undefined
        ? cached
        : { ...cached, objectIds: cached.objectIds.slice(0, options.limit) };
    }
  }

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

  const objectIds = parsed.data.objectIDs ?? [];
  const result = { total: parsed.data.total, objectIds };

  if (useCache) setCached(cacheKey, result, CACHE_TTL_MS.search);
  return options.limit === undefined
    ? result
    : { ...result, objectIds: objectIds.slice(0, options.limit) };
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
      } catch {
        results[next.index] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.filter((artwork): artwork is Artwork => artwork !== null);
}
