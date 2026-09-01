import { afterEach, describe, expect, it, vi } from "vitest";
import { CACHE_TTL_MS, clearMetCache, getCached, setCached } from "./cache";

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
