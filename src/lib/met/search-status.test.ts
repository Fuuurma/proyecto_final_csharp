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
  reportedTotal: 500,
};

describe("computeSearchStatus", () => {
  it("empty index (the /objects or /search response had no IDs)", () => {
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 0,
        reportedTotal: 0,
        hydratedCount: 0,
        pageIdCount: 0,
        usableCount: 0,
      }),
    ).toBe("empty");
  });

  it("a null-ID listing on a non-empty index is partial, not empty", () => {
    // needs-work 10-02 P1: upstream collapses objectIDs to null while
    // total stays >0 — the listing delivered no ids but the index
    // claims rows. "empty" rendered "No matching works" beside
    // "470000 in the index".
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 0,
        reportedTotal: 470_000,
        hydratedCount: 0,
        pageIdCount: 0,
        usableCount: 0,
      }),
    ).toBe("partial");
  });

  it("a window past the delivered list is partial, not empty", () => {
    // needs-work 10-02 P3: an out-of-range page yields a zero-id window
    // on a non-empty index — an unfulfilled promise, not an empty index.
    expect(
      computeSearchStatus({
        ...base,
        totalIds: 500,
        reportedTotal: 500,
        hydratedCount: 0,
        pageIdCount: 0,
        usableCount: 0,
      }),
    ).toBe("partial");
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

  it("zero usable on FULL hydration is empty, not partial (preFiltered or not)", () => {
    // grok 09-26 P2 contract split: the server's early branch owns this
    // cell (honest empty); computeSearchStatus must agree if ever asked.
    for (const preFiltered of [true, false]) {
      expect(
        computeSearchStatus({
          ...base,
          totalIds: 500,
          usableCount: 0,
          hydratedCount: base.pageIdCount + 12,
          preFiltered,
        }),
      ).toBe("empty");
    }
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
        reportedTotal: 500,
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
