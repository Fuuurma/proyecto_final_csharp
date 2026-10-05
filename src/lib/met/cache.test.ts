import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_TTL_MS,
  clearMetCache,
  dedupeMetFetch,
  EDGE_TTL_S,
  getCached,
  getEdgeCached,
  MAX_ENTRIES,
  setCached,
  setEdgeCached,
} from "./cache";

describe("Met API cache", () => {
  afterEach(() => {
    clearMetCache();
    vi.useRealTimers();
  });

  it("returns undefined for a missing key", () => {
    expect(getCached("missing")).toBeUndefined();
  });

  it("stores and returns a value within its TTL", () => {
    setCached("departments", [{ id: 1, name: "A" }], CACHE_TTL_MS.departments);
    expect(getCached("departments")).toEqual([{ id: 1, name: "A" }]);
  });

  it("expires entries after their TTL", () => {
    vi.useFakeTimers();
    setCached("search", { total: 1, objectIds: [1] }, CACHE_TTL_MS.search);
    expect(getCached("search")).toEqual({ total: 1, objectIds: [1] });

    vi.advanceTimersByTime(CACHE_TTL_MS.search + 1);
    expect(getCached("search")).toBeUndefined();
  });

  it("clears all entries", () => {
    setCached("a", 1, 1000);
    setCached("b", 2, 1000);
    clearMetCache();
    expect(getCached("a")).toBeUndefined();
    expect(getCached("b")).toBeUndefined();
  });

  it("uses distinct TTLs per surface", () => {
    expect(CACHE_TTL_MS.departments).toBeGreaterThan(CACHE_TTL_MS.object);
    expect(CACHE_TTL_MS.object).toBeGreaterThan(CACHE_TTL_MS.search);
  });
});

describe("Met API cache bound", () => {
  afterEach(() => {
    clearMetCache();
    vi.useRealTimers();
  });

  it("sweeps expired entries before dropping live ones", () => {
    vi.useFakeTimers();
    for (let i = 0; i < MAX_ENTRIES; i++) {
      setCached(`expired-${i}`, i, 1);
    }
    vi.advanceTimersByTime(2); // all 500 are dead now
    setCached("fresh", "v", CACHE_TTL_MS.departments);
    expect(getCached("fresh")).toBe("v");
    expect(getCached("expired-0")).toBeUndefined();
  });

  it("stays bounded when every entry is live", () => {
    for (let i = 0; i <= MAX_ENTRIES; i++) {
      setCached(`live-${i}`, i, CACHE_TTL_MS.departments);
    }
    // The 501st insert evicts the soonest-to-expire entry (live-0).
    expect(getCached("live-0")).toBeUndefined();
    expect(getCached(`live-${MAX_ENTRIES}`)).toBe(MAX_ENTRIES);
  });
});

describe("dedupeMetFetch", () => {
  afterEach(() => {
    clearMetCache();
  });

  it("shares one in-flight load across concurrent same-key calls", async () => {
    let loads = 0;
    const load = async () => {
      loads += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "value";
    };

    const [a, b] = await Promise.all([
      dedupeMetFetch("shared", load),
      dedupeMetFetch("shared", load),
    ]);

    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(loads).toBe(1);
  });

  it("loads separately for distinct keys", async () => {
    let loads = 0;
    const load = async () => {
      loads += 1;
      return "value";
    };

    await Promise.all([
      dedupeMetFetch("key-a", load),
      dedupeMetFetch("key-b", load),
    ]);

    expect(loads).toBe(2);
  });

  it("evicts rejected loads so a retry can succeed", async () => {
    let loads = 0;
    const load = async () => {
      loads += 1;
      if (loads === 1) throw new Error("upstream failed");
      return "recovered";
    };

    await expect(dedupeMetFetch("flaky", load)).rejects.toThrow(
      "upstream failed",
    );
    await expect(dedupeMetFetch("flaky", load)).resolves.toBe("recovered");
    expect(loads).toBe(2);
  });
});

describe("Met API edge cache tier", () => {
  afterEach(() => {
    clearMetCache();
    vi.unstubAllGlobals();
  });

  it("no-ops where the Cache API is unavailable", async () => {
    await expect(getEdgeCached("k")).resolves.toBeUndefined();
    await expect(
      setEdgeCached("k", { a: 1 }, EDGE_TTL_S.object),
    ).resolves.toBeUndefined();
  });

  it("round-trips values through caches.default", async () => {
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

    await setEdgeCached("https://example.com/objects/1", { id: 1 }, 60);
    await expect(
      getEdgeCached<{ id: number }>("https://example.com/objects/1"),
    ).resolves.toEqual({ id: 1 });
    await expect(
      getEdgeCached("https://example.com/objects/2"),
    ).resolves.toBeUndefined();
  });

  it("uses day-scale TTLs for immutable surfaces and minutes for search", () => {
    expect(EDGE_TTL_S.departments).toBeGreaterThanOrEqual(24 * 60 * 60);
    expect(EDGE_TTL_S.object).toBeGreaterThanOrEqual(24 * 60 * 60);
    expect(EDGE_TTL_S.search).toBeGreaterThanOrEqual(5 * 60);
    expect(EDGE_TTL_S.search).toBeLessThanOrEqual(15 * 60);
  });
});
