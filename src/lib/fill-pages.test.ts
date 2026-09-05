import { describe, expect, it, vi } from "vitest";

import type { Artwork } from "./met/normalize";
import {
  cachePages,
  collectPages,
  pageCacheKey,
  type PageCache,
} from "./fill-pages";

const artwork = (id: number): Artwork =>
  ({
    id,
    accessionNumber: null,
    title: `W ${id}`,
    displayTitle: `W ${id}`,
    artist: null,
    artistBio: null,
    date: null,
    culture: null,
    period: null,
    medium: null,
    dimensions: null,
    department: null,
    classification: null,
    primaryImage: null,
    primaryImageSmall: null,
    additionalImages: [],
    imageAspectRatio: 1,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: "",
    tags: [],
  }) as Artwork;

describe("collectPages", () => {
  it("fetches missing pages in order and serves cached ones without IO", async () => {
    const cache: PageCache<Artwork> = new Map();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([artwork(21), artwork(22)])
      .mockResolvedValueOnce([artwork(31)])
      .mockResolvedValue([artwork(41)]);

    const first = await collectPages(cache, ["sunsets", "all"], 2, 3, fetchPage);
    expect(first.map((a) => a.id)).toEqual([21, 22, 31]);
    expect(fetchPage).toHaveBeenCalledTimes(2);

    // Same tail revisited (back-navigation): zero fetches, same result.
    const second = await collectPages(
      cache,
      ["sunsets", "all"],
      2,
      3,
      fetchPage,
    );
    expect(second.map((a) => a.id)).toEqual([21, 22, 31]);
    expect(fetchPage).toHaveBeenCalledTimes(2);

    // One page further: only the new page fetches.
    const third = await collectPages(cache, ["sunsets", "all"], 2, 4, fetchPage);
    expect(third).toHaveLength(4);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("keys by the full query context, not just the page number", async () => {
    const cache: PageCache<Artwork> = new Map();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([artwork(1)])
      .mockResolvedValueOnce([artwork(2)]);

    await collectPages(cache, ["sunset", "all"], 2, 2, fetchPage);
    await collectPages(cache, ["sunset", "egyptian"], 2, 2, fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest entry at the cache cap", () => {
    const cache: PageCache<Artwork> = new Map();
    for (let i = 0; i < 40; i += 1) {
      cachePages(cache, `k${i}`, [artwork(i)]);
    }
    expect(cache.has("k0")).toBe(true);
    cachePages(cache, "k40", [artwork(40)]);
    expect(cache.has("k0")).toBe(false);
    expect(cache.has("k40")).toBe(true);
    expect(pageCacheKey(["q"], 3)).toBe('["q"]#3');
  });
});

describe("collectPages hooks", () => {
  const cache: PageCache<Artwork> = new Map();

  it("streams chunks as pages land", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce([artwork(21)])
      .mockResolvedValueOnce([artwork(31)]);
    const chunks: number[][] = [];
    await collectPages(cache, ["q"], 2, 3, fetchPage, {
      onChunk: (all) => chunks.push(all.map((a) => a.id)),
    });
    expect(chunks).toEqual([[21], [21, 31]]);
  });

  it("stops before fetching when shouldContinue goes false", async () => {
    let alive = true;
    const fetchPage = vi.fn().mockResolvedValue([artwork(1)]);
    const collected = await collectPages(cache, ["x"], 2, 4, fetchPage, {
      shouldContinue: () => alive,
      onChunk: () => {
        alive = false;
      },
    });
    expect(collected.map((a) => a.id)).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
