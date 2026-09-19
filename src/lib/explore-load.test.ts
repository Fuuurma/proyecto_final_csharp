import { describe, expect, it } from "vitest";
import { exploreCountText, loadMoreState } from "./explore-load";
import { SEARCH_MAX_PAGE } from "./met/search-query";

describe("exploreCountText", () => {
  it("never renders the old N / M matches-loaded denominator", () => {
    const texts = [
      exploreCountText({ source: "met", total: 1700, loaded: 12 }),
      exploreCountText({
        source: "met",
        preFiltered: false,
        total: 1700,
        loaded: 12,
      }),
      exploreCountText({ source: "met", total: 12, loaded: 12 }),
      exploreCountText({ source: "curated", total: 45, loaded: 45 }),
      exploreCountText({ source: "fixture", total: 7, loaded: 7 }),
    ];
    for (const text of texts) {
      expect(text).not.toContain("matches loaded");
    }
  });

  it("names the index separately from the loaded count for met results", () => {
    expect(exploreCountText({ source: "met", total: 1700, loaded: 12 })).toBe(
      "12 loaded · 1700 in the index",
    );
    expect(exploreCountText({ source: "met", total: 12, loaded: 12 })).toBe(
      "12 loaded",
    );
  });

  it("uses the department wording for an unfiltered index total", () => {
    expect(
      exploreCountText({
        source: "met",
        preFiltered: false,
        total: 800,
        loaded: 6,
      }),
    ).toBe("6 loaded · 800 listed in the department");
  });

  it("keeps the exact review-set fraction for curated and fixture results", () => {
    expect(exploreCountText({ source: "curated", total: 45, loaded: 45 })).toBe(
      "45 / 45 review works",
    );
    expect(exploreCountText({ source: "fixture", total: 7, loaded: 7 })).toBe(
      "7 / 7 review works",
    );
  });
});

describe("loadMoreState", () => {
  const base = {
    source: "met" as const,
    status: "success" as const,
    live: true,
    hasPath: false,
    fillExhausted: false,
    remaining: 48,
    page: 1,
    isClient: true,
  };

  it("only marks exact-source totals countable", () => {
    expect(loadMoreState({ ...base, source: "met" }).countIsExact).toBe(false);
    expect(loadMoreState({ ...base, source: "curated" }).countIsExact).toBe(
      true,
    );
    expect(loadMoreState({ ...base, source: "fixture" }).countIsExact).toBe(
      true,
    );
  });

  it("gates the cap note behind a not-yet-exhausted stream", () => {
    // The record-cap note must not fire from the inflated raw-total
    // remaining once the usable stream ran out — the exhausted note owns
    // that ending (devin 09-10 08:17 #2; review 09-19 P2).
    const atCeiling = {
      ...base,
      source: "met" as const,
      page: SEARCH_MAX_PAGE,
    };
    expect(loadMoreState(atCeiling).atCap).toBe(true);
    expect(loadMoreState({ ...atCeiling, fillExhausted: true }).atCap).toBe(
      false,
    );
  });

  it("stops offering load-more once the usable stream runs out", () => {
    expect(loadMoreState(base).canLoadMore).toBe(true);
    expect(loadMoreState({ ...base, fillExhausted: true }).canLoadMore).toBe(
      false,
    );
  });

  it("suppresses the offer for SSR, curated views, errors and the ceiling", () => {
    expect(loadMoreState({ ...base, isClient: false }).canLoadMore).toBe(false);
    expect(loadMoreState({ ...base, live: false }).canLoadMore).toBe(false);
    expect(loadMoreState({ ...base, hasPath: true }).canLoadMore).toBe(false);
    expect(loadMoreState({ ...base, remaining: 0 }).canLoadMore).toBe(false);
    expect(loadMoreState({ ...base, page: SEARCH_MAX_PAGE }).canLoadMore).toBe(
      false,
    );
    expect(loadMoreState({ ...base, status: "error" }).canLoadMore).toBe(false);
  });
});
