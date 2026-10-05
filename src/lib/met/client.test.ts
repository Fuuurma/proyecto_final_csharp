import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearMetCache, getCached, setCached } from "./cache";
import {
  fetchMetDepartments,
  fetchMetObject,
  fetchMetObjects,
  fetchMetSearchIds,
  MAX_CACHED_SEARCH_IDS,
  resetMetCircuitBreaker,
  SEARCH_PAGE_SIZE,
  sliceSearchPage,
} from "./client.server";

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function objectPayload(objectID: number) {
  return {
    objectID,
    title: `Object ${objectID}`,
    artistDisplayName: "A maker",
    primaryImageSmall: `https://example.com/${objectID}.jpg`,
    isPublicDomain: true,
  };
}

describe("Met API adapter", () => {
  afterEach(() => {
    clearMetCache();
    resetMetCircuitBreaker();
  });

  it("limits search IDs and requests public-domain image-backed results", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("hasImages")).toBe("true");
      expect(url.searchParams.get("isPublicDomain")).toBe("true");
      return response({
        total: 30,
        objectIDs: [1, 2, 3, 4, 5],
      });
    };

    await expect(
      fetchMetSearchIds("paintings", { fetcher, limit: 3 }),
    ).resolves.toEqual({ total: 30, objectIds: [1, 2, 3], preFiltered: true });
  });

  it("dedupes ids when the live index shifts between v1.1 pages", async () => {
    // Pagination reads a live index: results added/removed between page
    // fetches re-position entries, so a later page may repeat an id an
    // earlier page returned. The merged list must not carry duplicates.
    const pageOne = Array.from({ length: 500 }, (_, i) => i + 1); // full page
    const pages = [
      { total: 501, objectIDs: pageOne },
      { total: 501, objectIDs: [500, 501] }, // 500 repeats: index shifted
      { total: 501, objectIDs: [] },
    ];
    let served = 0;
    const fetcher: typeof fetch = async () => response(pages[served++]);

    // no caller `limit`: the full merged list is asserted, so a duplicate
    // (502 entries) is distinguishable from the deduped result (501).
    await expect(fetchMetSearchIds("shifting", { fetcher })).resolves.toEqual({
      total: 501,
      objectIds: [...pageOne, 501],
      preFiltered: true,
    });
  });

  it("treats a null objectIDs list as an empty search", async () => {
    const fetcher: typeof fetch = async () =>
      response({ total: 0, objectIDs: null });

    await expect(fetchMetSearchIds("nope", { fetcher })).resolves.toEqual({
      total: 0,
      objectIds: [],
      preFiltered: true,
    });
  });

  it("slices a search ID list into bounded pages", () => {
    const ids = Array.from({ length: 50 }, (_, index) => index + 1);
    expect(sliceSearchPage(ids, 1)).toEqual(ids.slice(0, 24));
    expect(sliceSearchPage(ids, 2)).toHaveLength(SEARCH_PAGE_SIZE);
    expect(sliceSearchPage(ids, 2)[0]).toBe(25);
    expect(sliceSearchPage(ids, 3)).toEqual(ids.slice(48, 50));
    expect(sliceSearchPage(ids, 4)).toEqual([]);
    expect(sliceSearchPage(ids, 5)).toEqual([]);
  });

  it("can browse a department using the objects endpoint without a keyword", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/objects");
      expect(url.searchParams.get("departmentIds")).toBe("11");
      // /objects IGNORES these filters (only /search honours them) — they
      // are forward-compatibility only, and preFiltered:false tells the
      // caller the open-access sieve is the real contract (devin 09-09
      // 14:17 #1).
      expect(url.searchParams.get("hasImages")).toBe("true");
      expect(url.searchParams.get("isPublicDomain")).toBe("true");
      return response({
        total: 12,
        objectIDs: [10, 11, 12],
      });
    };

    await expect(
      fetchMetSearchIds("", { fetcher, departmentId: 11, limit: 2 }),
    ).resolves.toEqual({
      total: 12,
      objectIds: [10, 11],
      preFiltered: false,
    });
  });

  it("reads the committed department index shape", async () => {
    const fetcher: typeof fetch = async () =>
      response({
        departments: [
          { departmentId: 6, displayName: "Asian Art" },
          { departmentId: 11, displayName: "European Paintings" },
        ],
      });

    await expect(fetchMetDepartments({ fetcher })).resolves.toEqual([
      { id: 6, name: "Asian Art" },
      { id: 11, name: "European Paintings" },
    ]);
  });

  it("bounds hydration and tolerates individual object failures", async () => {
    const fetcher: typeof fetch = async (input) => {
      const objectId = Number(new URL(String(input)).pathname.split("/").pop());
      return objectId === 2
        ? response({ message: "temporary failure" }, 503)
        : response(objectPayload(objectId));
    };

    await expect(
      fetchMetObjects([1, 2, 3], { fetcher, concurrency: 2 }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, artist: "A maker" }),
        expect.objectContaining({ id: 3, artist: "A maker" }),
      ]),
    );
  });

  it("turns aborted requests into a typed timeout error", async () => {
    const fetcher: typeof fetch = async () => {
      throw new DOMException("aborted", "AbortError");
    };

    await expect(fetchMetObject(1, { fetcher })).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it("bypasses the cache when a custom fetcher is injected so tests stay deterministic", async () => {
    let objectCalls = 0;
    const countingFetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      objectCalls += 1;
      return response(objectPayload(Number(url.pathname.split("/").pop())));
    };

    await fetchMetObject(42, { fetcher: countingFetcher });
    await fetchMetObject(42, { fetcher: countingFetcher });

    // A custom fetcher must always reach the network; the cache is only
    // used on the production path where the global fetch is in play.
    expect(objectCalls).toBe(2);
  });

  it("applies curated display titles to live-fetched curated objects", async () => {
    // 56353 is curated as "The Great Wave"; the live Met title is raw.
    const rawFetcher: typeof fetch = async () =>
      response({
        ...objectPayload(56353),
        title: "Under the Wave off Kanagawa",
      });

    const artwork = await fetchMetObject(56353, { fetcher: rawFetcher });
    expect(artwork.displayTitle).toBe("The Great Wave");
  });

  it("leaves non-curated live objects with their Met title", async () => {
    const rawFetcher: typeof fetch = async () =>
      response({ ...objectPayload(999999), title: "Some other object" });

    const artwork = await fetchMetObject(999999, { fetcher: rawFetcher });
    expect(artwork.displayTitle).toBe("Some other object");
  });
});

// Jittered retry (fleet BE-meet-the-met-01): idempotent GETs retry at
// most twice, and only on transient failures — 4xx and parse are
// deterministic, an open circuit fails fast.
describe("Met API retry", () => {
  const noopSleep = async () => {};

  afterEach(() => {
    clearMetCache();
    resetMetCircuitBreaker();
  });

  it("retries a transient 5xx with backoff, then succeeds", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return calls < 3
        ? response({ message: "overloaded" }, 503)
        : response(objectPayload(7));
    };

    await expect(
      fetchMetObject(7, { fetcher, retry: { sleep, random: () => 0.5 } }),
    ).resolves.toMatchObject({ id: 7 });
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    // Full jitter, attempt 0: delay < base (150ms) for any prng < 1.
    expect(sleep.mock.calls[0]?.[0]).toBeLessThan(150);
  });

  it("gives up after two retries on persistent 5xx", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return response({ message: "overloaded" }, 503);
    };

    await expect(
      fetchMetObject(7, { fetcher, retry: { sleep: noopSleep } }),
    ).rejects.toMatchObject({ kind: "5xx", status: 503 });
    expect(calls).toBe(3);
  });

  it("does not retry a 4xx rejection", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return response({ message: "bad request" }, 400);
    };

    await expect(
      fetchMetObject(7, { fetcher, retry: { sleep: noopSleep } }),
    ).rejects.toMatchObject({ kind: "4xx", status: 400 });
    expect(calls).toBe(1);
  });

  it("does not retry an unparseable body", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response("not json", { status: 200 });
    };

    await expect(
      fetchMetObject(7, { fetcher, retry: { sleep: noopSleep } }),
    ).rejects.toMatchObject({ kind: "parse" });
    expect(calls).toBe(1);
  });
});

// Prevents Met 429s from bypassing retries/stale service or returning stale
// data indefinitely.
describe("Met API rate limiting", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearMetCache();
    resetMetCircuitBreaker();
  });

  it("honors a bounded Retry-After before retrying a 429", async () => {
    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response("rate limited", {
            status: 429,
            headers: { "Retry-After": "1" },
          })
        : response(objectPayload(7));
    };

    await expect(
      fetchMetObject(7, { fetcher, retry: { sleep, random: () => 0.5 } }),
    ).resolves.toMatchObject({ id: 7 });
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("honors an HTTP-date Retry-After within the retry budget", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"));
    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    const retryAt = new Date(Date.now() + 1_000).toUTCString();
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response("rate limited", {
            status: 429,
            headers: { "Retry-After": retryAt },
          })
        : response(objectPayload(71));
    };

    await expect(
      fetchMetObject(71, { fetcher, retry: { sleep, random: () => 0.5 } }),
    ).resolves.toMatchObject({ id: 71 });
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("uses bounded jitter when Retry-After is missing", async () => {
    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response("rate limited", { status: 429 })
        : response(objectPayload(8));
    };

    await expect(
      fetchMetObject(8, { fetcher, retry: { sleep, random: () => 0.5 } }),
    ).resolves.toMatchObject({ id: 8 });
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0]?.[0]).toBeLessThan(150);
  });

  it("surfaces an exhausted 429 as rate limiting even with malformed JSON", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response("{ not json", { status: 429 });
    };

    await expect(
      fetchMetObject(9, { fetcher, retry: { sleep: async () => {} } }),
    ).rejects.toMatchObject({ kind: "rate-limit", status: 429 });
    expect(calls).toBe(3);
  });

  it("uses recent cached search data instead of retrying beyond Retry-After", async () => {
    vi.useFakeTimers();
    const query = "rate-limit-stale";
    const url = new URL(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search",
    );
    url.searchParams.set("limit", "500");
    url.searchParams.set("q", query);
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    const stale = { total: 1, objectIds: [42], preFiltered: true };
    setCached(url.toString(), stale, 60_000);
    vi.advanceTimersByTime(60_001);

    let calls = 0;
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "120" },
      });
    }) as typeof fetch);

    await expect(fetchMetSearchIds(query)).resolves.toEqual(stale);
    expect(calls).toBe(1);
  });

  it("serves cached search data after exhausting 429 retries", async () => {
    vi.useFakeTimers();
    const query = "rate-limit-retry-stale";
    const url = new URL(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search",
    );
    url.searchParams.set("limit", "500");
    url.searchParams.set("q", query);
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    const stale = { total: 1, objectIds: [43], preFiltered: true };
    setCached(url.toString(), stale, 60_000);
    vi.advanceTimersByTime(60_001);

    let calls = 0;
    const sleep = vi.fn(async (_ms: number) => {});
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      return new Response("rate limited", { status: 429 });
    }) as typeof fetch);

    await expect(
      fetchMetSearchIds(query, { retry: { sleep, random: () => 0 } }),
    ).resolves.toEqual(stale);
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not serve cached search data beyond the stale grace period", async () => {
    vi.useFakeTimers();
    const query = "expired-rate-limit-stale";
    const url = new URL(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search",
    );
    url.searchParams.set("limit", "500");
    url.searchParams.set("q", query);
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    setCached(
      url.toString(),
      { total: 1, objectIds: [42], preFiltered: true },
      60_000,
    );
    vi.advanceTimersByTime(11 * 60_000 + 1);

    let calls = 0;
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "120" },
      });
    }) as typeof fetch);

    await expect(fetchMetSearchIds(query)).rejects.toMatchObject({
      kind: "rate-limit",
      status: 429,
    });
    expect(calls).toBe(1);
  });
});

describe("Met API circuit breaker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearMetCache();
    resetMetCircuitBreaker();
  });

  it("opens after three failures and blocks another network request", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      throw new Error("upstream down");
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(fetchMetDepartments({ fetcher })).rejects.toMatchObject({
        kind: "5xx",
      });
    }
    await expect(fetchMetDepartments({ fetcher })).rejects.toMatchObject({
      kind: "5xx",
    });
    // The first call alone exhausts its three retry attempts and trips
    // the breaker; the next three fail fast on the open circuit.
    expect(calls).toBe(3);
  });

  it("serves a stale department response while open", async () => {
    vi.useFakeTimers();
    const url =
      "https://collectionapi.metmuseum.org/public/collection/v1/departments";
    const stale = [{ id: 6, name: "Asian Art" }];
    setCached(url, stale, 1);
    vi.advanceTimersByTime(2);
    let calls = 0;
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      throw new Error("upstream down");
    }) as typeof fetch);
    // Fake timers are active — a real backoff sleep would never resolve.
    const retry = { sleep: async () => {} };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(fetchMetDepartments({ retry })).resolves.toEqual(stale);
    }
    await expect(fetchMetDepartments({ retry })).resolves.toEqual(stale);
    expect(calls).toBe(3);
    expect(getCached(url)).toBeUndefined();
  });

  it("closes after a successful half-open probe", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      if (calls <= 3) throw new Error("upstream down");
      return response({
        departments: [{ departmentId: 6, displayName: "Asian Art" }],
      });
    };

    const retry = { sleep: async () => {} };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        fetchMetDepartments({ fetcher, retry }),
      ).rejects.toMatchObject({
        kind: "5xx",
      });
    }
    vi.advanceTimersByTime(30_000);
    await expect(fetchMetDepartments({ fetcher, retry })).resolves.toEqual([
      { id: 6, name: "Asian Art" },
    ]);
    await expect(fetchMetDepartments({ fetcher, retry })).resolves.toEqual([
      { id: 6, name: "Asian Art" },
    ]);
    expect(calls).toBe(5);
  });
});

// The ID-list cache must refuse oversize listings (devin 09-10 12:50 P1):
// MAX_ENTRIES bounds keys, not weight — an unbounded value lets one
// whole-department or q=* listing dominate the Worker isolate.
describe("fetchMetSearchIds cache value bound", () => {
  afterEach(() => {
    clearMetCache();
    // the stale-tier test trips timeouts — without this reset the open
    // breaker fail-fasts every later test in the file
    resetMetCircuitBreaker();
    vi.unstubAllGlobals();
  });

  function listingFetch(total: number, ids: number[]) {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return response({ total, objectIDs: ids });
    };
    return { fetcher, calls: () => calls };
  }

  it("caches listings up to the bound — second request skips upstream", async () => {
    const ids = Array.from({ length: MAX_CACHED_SEARCH_IDS }, (_, i) => i + 1);
    const { fetcher, calls } = listingFetch(ids.length, ids);
    vi.stubGlobal("fetch", fetcher);

    const first = await fetchMetSearchIds("bound-under");
    const second = await fetchMetSearchIds("bound-under");

    expect(calls()).toBe(1);
    expect(second.objectIds).toEqual(first.objectIds);
  });

  it("skips the cache above the bound — every request hits upstream", async () => {
    const ids = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 1,
    );
    const { fetcher, calls } = listingFetch(ids.length, ids);
    vi.stubGlobal("fetch", fetcher);

    await fetchMetSearchIds("bound-over");
    await fetchMetSearchIds("bound-over");

    expect(calls()).toBe(2);
  });

  // needs-work 09-26 P2: over-bound listings skipped the cache entirely,
  // so whole-department browses took the hard error during upstream
  // timeouts while small searches degraded to stale. A small keyed
  // oversized-stale map (bounded at 3 keys) now serves them on
  // timeout/5xx — a single global slot let concurrent over-bound keys
  // evict each other (needs-work 10-02).
  it("serves the oversized stale tier on timeout after one success", async () => {
    const ids = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 1,
    );
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return response({ total: ids.length, objectIDs: ids });
      }
      throw new DOMException("aborted", "AbortError");
    };
    vi.stubGlobal("fetch", fetcher);

    const first = await fetchMetSearchIds("bound-over-stale");
    const second = await fetchMetSearchIds("bound-over-stale");

    // the second request retries internally (3 attempts) before the
    // stale tier serves — the exact attempt count is an implementation
    // detail; what matters is it stopped hitting upstream and degraded
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(second.objectIds).toEqual(first.objectIds);
  });

  // needs-work 10-02: the single-slot tier kept only the most recent
  // over-bound listing, so a second concurrent over-bound browse evicted
  // the first key's only stale copy — its next failure got a hard error
  // while any other key degraded. The tier is now keyed (bounded).
  it("keeps each over-bound key's stale entry across concurrent keys", async () => {
    const idsA = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 1,
    );
    const idsB = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 500_000,
    );
    let calls = 0;
    const fetcher: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input instanceof Request ? input.url : input);
      if (calls <= 2) {
        return url.includes("q=stale-a")
          ? response({ total: idsA.length, objectIDs: idsA })
          : response({ total: idsB.length, objectIDs: idsB });
      }
      throw new DOMException("aborted", "AbortError");
    };
    vi.stubGlobal("fetch", fetcher);
    const retry = { sleep: async () => {} };

    // Populate both keys while upstream is healthy; under the single
    // slot B's write evicted A's only stale copy.
    await fetchMetSearchIds("stale-a", { retry });
    await fetchMetSearchIds("stale-b", { retry });

    // Upstream is now down: BOTH keys must degrade to their own stale
    // listing — A must not fail nor be served B's ids.
    const againA = await fetchMetSearchIds("stale-a", { retry });
    const againB = await fetchMetSearchIds("stale-b", { retry });
    expect(againA.objectIds).toEqual(idsA);
    expect(againB.objectIds).toEqual(idsB);
  });

  it("serving uncached oversize listings still returns them whole", async () => {
    const ids = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 1,
    );
    const { fetcher } = listingFetch(ids.length, ids);
    vi.stubGlobal("fetch", fetcher);

    const result = await fetchMetSearchIds("bound-over-whole");
    expect(result.objectIds).toHaveLength(MAX_CACHED_SEARCH_IDS + 1);
    expect(result.total).toBe(ids.length);
  });

  // The oversize slot is a module-level fallback that lives in
  // client.server.ts, not in the `store` that clearMetCache() empties — so
  // "clears the whole cache" was not true. This is the failure it hides: a
  // reset that leaves the slot populated hands the NEXT test a listing that
  // was served before the reset, so a test can pass or fail on state it
  // believes it cleared.
  it("clearMetCache also drops the oversize stale slot", async () => {
    const ids = Array.from(
      { length: MAX_CACHED_SEARCH_IDS + 1 },
      (_, i) => i + 1,
    );
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return response({ total: ids.length, objectIDs: ids });
      }
      throw new DOMException("aborted", "AbortError");
    };
    vi.stubGlobal("fetch", fetcher);

    // Populate the oversize slot, then reset the way every other test does.
    await fetchMetSearchIds("bound-over-reset");
    clearMetCache();

    // After a full reset nothing may be served from the pre-reset slot: the
    // request has to reach upstream and fail honestly, not quietly hand back
    // the 20,001 ids captured before the reset.
    await expect(fetchMetSearchIds("bound-over-reset")).rejects.toThrow(
      /timed out/,
    );
  });
});

// Immutable upstream edge cache (fleet DST-meet-the-met-01): concurrent
// same-key requests share one upstream fetch, and the edge tier keeps
// serving after the isolate-local map is gone.
describe("upstream edge cache", () => {
  afterEach(() => {
    clearMetCache();
    vi.unstubAllGlobals();
  });

  it("dedupes concurrent requests for the same object", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(objectPayload(42));
    }) as typeof fetch);

    const [a, b] = await Promise.all([fetchMetObject(42), fetchMetObject(42)]);

    expect(calls).toBe(1);
    expect(a.id).toBe(42);
    expect(b.id).toBe(42);
  });

  it("serves repeat reads from the edge after the local map is cleared", async () => {
    const backing = new Map<string, string>();
    vi.stubGlobal("caches", {
      default: {
        match: async (key: string) => {
          const body = backing.get(key);
          return body === undefined ? undefined : new Response(body);
        },
        put: async (key: string, res: Response) => {
          backing.set(key, await res.text());
        },
      },
    });
    let calls = 0;
    vi.stubGlobal("fetch", (async () => {
      calls += 1;
      return response(objectPayload(7));
    }) as typeof fetch);

    await fetchMetObject(7);
    clearMetCache(); // simulate a fresh isolate
    const again = await fetchMetObject(7);

    expect(calls).toBe(1);
    expect(again.id).toBe(7);
  });
});

// needs-work 09-26 P3 (latent): the probe flag was cleared by EVERY
// wrapped call's finally, not only the probe's — a non-probe call
// finishing inside a probe's load window would let a second probe
// through. The finally must be gated on the call actually probing.
// needs-work 09-27 P2 claimed a rejected caller could still reach the
// finally via a pre-computed isProbe — refuted: the fail-fast throw
// precedes the try block, so rejected calls never enter the finally at
// all. The token is now assigned inside the admission branch so
// ownership is structural, and a behavior test pins the concurrency
// contract instead of the mechanism.
describe("circuit probe flag ownership", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearMetCache();
    resetMetCircuitBreaker();
  });

  it("gates the probeInFlight clear on the probing call", () => {
    const src = readFileSync(join(__dirname, "client.server.ts"), "utf8");
    const fn = src.slice(
      src.indexOf("async function withMetCircuit"),
      src.indexOf("// Upstream failure taxonomy"),
    );
    // isProbe is set only after admission — the throw precedes it.
    expect(fn).not.toContain("const isProbe = circuitOpenedAt !== undefined");
    const flagSet = fn.indexOf("probeInFlight = true;");
    const probeMarked = fn.indexOf("isProbe = true;");
    expect(flagSet).toBeGreaterThan(-1);
    expect(probeMarked).toBeGreaterThan(flagSet);
    expect(fn).toContain("if (isProbe) probeInFlight = false;");
    expect(fn).not.toContain("    probeInFlight = false;");
  });

  it("a fail-fast rejected caller cannot clear a live probe's flag", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let resolveProbe: ((res: Response) => void) | undefined;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      if (calls <= 3) throw new Error("upstream down");
      // The probe parks until the test releases it.
      return new Promise<Response>((resolve) => {
        resolveProbe = resolve;
      });
    };
    const retry = { sleep: async () => {} };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        fetchMetDepartments({ fetcher, retry }),
      ).rejects.toMatchObject({ kind: "5xx" });
    }
    vi.advanceTimersByTime(30_000);

    // Probe A is admitted and parks upstream.
    const probeA = fetchMetDepartments({ fetcher, retry });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(4);

    // Call B fails fast during the probe — its finally must not touch
    // the flag. Under the pre-admission isProbe it did, so call C would
    // be admitted as a second probe and reach the fetcher.
    await expect(fetchMetDepartments({ fetcher, retry })).rejects.toMatchObject(
      { kind: "5xx" },
    );
    const probeC = fetchMetDepartments({ fetcher, retry });
    const probeCRejected = expect(probeC).rejects.toMatchObject({
      kind: "5xx",
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(4);
    await probeCRejected;

    resolveProbe?.(response({ departments: [] }));
    await probeA;
  });
});
