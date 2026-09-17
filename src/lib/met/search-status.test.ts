import { describe, expect, it } from "vitest";
import { SEARCH_PAGE_SIZE } from "./search-query";
import { computeSearchStatus } from "./search-status";

/**
 * The outcome table for a live collection search (devin 09-09 14:57
 * coverage-gap remainder). The two branch kinds differ in what a drop
 * means: /search pre-filters upstream so drops are an outage; /objects
 * ignores the params so the sieve's drops are the designed filter.
 */
const base = {
  pageIdCount: SEARCH_PAGE_SIZE,
  hydratedCount: SEARCH_PAGE_SIZE,
  usableCount: SEARCH_PAGE_SIZE,
  preFiltered: true,
};

describe("computeSearchStatus", () => {
  it("empty index (the /objects or /search response had no IDs)", () => {
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 0,
        hydratedCount: 0,
        pageIdCount: 0,
        usableCount: 0,
      }),
    ).toBe("empty");
  });

  it("any hydration failure is partial, on both branches", () => {
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 500,
        hydratedCount: base.pageIdCount - 1,
        usableCount: 23,
      }),
    ).toBe("partial");
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 500,
        preFiltered: false,
        hydratedCount: base.pageIdCount - 1,
        usableCount: 10,
      }),
    ).toBe("partial");
  });

  it("sieve drops are partial on pre-filtered /search, success on /objects", () => {
    const allFetched = { ...base, totalIds: 500 };
    expect(
      computeSearchStatus({
        ...allFetched,
        usableCount: 20,
        preFiltered: true,
      }),
    ).toBe("partial");
    expect(
      computeSearchStatus({
        ...allFetched,
        usableCount: 20,
        preFiltered: false,
      }),
    ).toBe("success");
  });

  it("a fully fetched /objects window with zero usable rows is empty — honest for that window", () => {
    expect(
      computeSearchStatus({
        totalIds: 500,
        hydratedCount: base.pageIdCount,
        pageIdCount: base.pageIdCount,
        usableCount: 0,
        preFiltered: false,
      }),
    ).toBe("empty");
  });

  it("everything delivered is success", () => {
    expect(computeSearchStatus({ ...base, totalIds: 500 })).toBe("success");
  });
});
