// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  adjacentInSequence,
  readBrowseSequence,
  writeBrowseSequence,
} from "./browse-sequence";
import type { Artwork } from "./met/normalize";
import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "./met/search-query";

function makeArtwork(id: number): Artwork {
  return {
    id,
    accessionNumber: null,
    title: `Work ${id}`,
    displayTitle: `Work ${id}`,
    artist: null,
    artistBio: null,
    date: null,
    culture: null,
    period: null,
    medium: null,
    dimensions: null,
    department: null,
    classification: null,
    primaryImage: `https://example.com/${id}-large.jpg`,
    primaryImageSmall: `https://example.com/${id}.jpg`,
    additionalImages: [],
    imageAspectRatio: 1,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: `https://example.com/${id}`,
    tags: [],
  };
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe("browse sequence", () => {
  it("round-trips the stored order", () => {
    writeBrowseSequence("k", [makeArtwork(1), makeArtwork(2)]);
    expect(readBrowseSequence("k").map((a) => a.id)).toEqual([1, 2]);
  });

  it("returns an empty list for a missing or corrupt key", () => {
    expect(readBrowseSequence("missing")).toEqual([]);
    window.sessionStorage.setItem("mtm-seq:corrupt", "{not json");
    expect(readBrowseSequence("corrupt")).toEqual([]);
  });

  it("drops malformed entries instead of trusting the payload", () => {
    window.sessionStorage.setItem(
      "mtm-seq:mixed",
      JSON.stringify([makeArtwork(1), { id: "nope" }, makeArtwork(3)]),
    );
    expect(readBrowseSequence("mixed").map((a) => a.id)).toEqual([1, 3]);
  });

  it("resolves neighbors inside the browsed list", () => {
    const ids = [10, 20, 30, 40];
    writeBrowseSequence("search", ids.map(makeArtwork));
    const mid = adjacentInSequence("search", 20);
    expect(mid?.previous?.id).toBe(10);
    expect(mid?.next?.id).toBe(30);
    expect(mid?.position).toBe(2);
    expect(mid?.total).toBe(4);
  });

  it("gives first/last boundary neighbors instead of wrapping", () => {
    writeBrowseSequence("ends", [makeArtwork(1), makeArtwork(2)]);
    expect(adjacentInSequence("ends", 1)?.previous).toBeNull();
    expect(adjacentInSequence("ends", 2)?.next).toBeNull();
  });

  it("returns null when the artwork is not in the browsed list", () => {
    writeBrowseSequence("other", [makeArtwork(1)]);
    expect(adjacentInSequence("other", 999)).toBeNull();
  });

  it("never stores more than the grid can display", () => {
    const works = Array.from(
      { length: SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE + 10 },
      (_, i) => makeArtwork(i),
    );
    writeBrowseSequence("big", works);
    expect(readBrowseSequence("big")).toHaveLength(
      SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE,
    );
  });
});
