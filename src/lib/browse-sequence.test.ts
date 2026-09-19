// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  adjacentInSequence,
  readBrowseSequence,
  sequenceToken,
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
    artist: `Maker ${id}`,
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

  it("drops entries that cannot render a prev/next card", () => {
    // The stricter read contract (review 09-19 P3): id+title alone used
    // to pass, then the card rendered a broken thumb at a broken ratio.
    const noImage = {
      ...makeArtwork(1),
      primaryImage: null,
      primaryImageSmall: null,
    };
    const badRatio = { ...makeArtwork(2), imageAspectRatio: 0 };
    window.sessionStorage.setItem(
      "mtm-seq:unrenderable",
      JSON.stringify([noImage, badRatio, makeArtwork(3)]),
    );
    expect(readBrowseSequence("unrenderable").map((a) => a.id)).toEqual([3]);
  });

  it("stores only the fields the prev/next trail reads", () => {
    writeBrowseSequence("slim", [makeArtwork(1)]);
    const stored = JSON.parse(
      window.sessionStorage.getItem("mtm-seq:slim") ?? "[]",
    ) as Array<Record<string, unknown>>;
    expect(Object.keys(stored[0] ?? {}).sort()).toEqual([
      "artist",
      "displayTitle",
      "id",
      "imageAspectRatio",
      "primaryImage",
      "primaryImageSmall",
    ]);
    expect(stored[0]?.artist).toBe("Maker 1");
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

  it("reports a failed write so the caller can retry", () => {
    expect(writeBrowseSequence("ok", [makeArtwork(1)])).toBe(true);
  });

  it("skips empty writes — no slot, no index, no eviction", () => {
    // A zero-result search under a real identity must not index an empty
    // sequence or push a real one out of the LRU (sibling review 09-19).
    writeBrowseSequence("real", [makeArtwork(1)]);
    expect(writeBrowseSequence("empty", [])).toBe(false);
    expect(window.sessionStorage.getItem("mtm-seq:empty")).toBeNull();
    expect(readBrowseSequence("real").map((a) => a.id)).toEqual([1]);
  });

  it("evicts the oldest sequence once the keyspace fills", () => {
    // MAX_KEYS = 8 identities; the 9th write must not grow storage
    // unbounded — the oldest key goes out whole (review 09-19 P2).
    for (let i = 0; i < 9; i += 1) {
      writeBrowseSequence(`k${i}`, [makeArtwork(i)]);
    }
    expect(readBrowseSequence("k0")).toEqual([]);
    expect(readBrowseSequence("k8").map((a) => a.id)).toEqual([8]);
    const index = JSON.parse(
      window.sessionStorage.getItem("mtm-seq:_index") ?? "[]",
    ) as string[];
    expect(index).toHaveLength(8);
    expect(index).not.toContain("k0");
  });

  it("re-writing an identity refreshes its recency", () => {
    for (let i = 0; i < 8; i += 1) {
      writeBrowseSequence(`k${i}`, [makeArtwork(i)]);
    }
    writeBrowseSequence("k0", [makeArtwork(0)]);
    writeBrowseSequence("new", [makeArtwork(99)]);
    // k0 was refreshed, so k1 is now the oldest and gets evicted.
    expect(readBrowseSequence("k0").map((a) => a.id)).toEqual([0]);
    expect(readBrowseSequence("k1")).toEqual([]);
  });

  it("self-heals a corrupt index without losing the write", () => {
    window.sessionStorage.setItem("mtm-seq:_index", "{not json");
    expect(writeBrowseSequence("k", [makeArtwork(1)])).toBe(true);
    expect(readBrowseSequence("k").map((a) => a.id)).toEqual([1]);
  });
});

describe("sequenceToken", () => {
  it("is deterministic and opaque", () => {
    const identity = "van Gogh|all|||live";
    const token = sequenceToken(identity);
    expect(token).toBe(sequenceToken(identity));
    // A short base36 token — no raw query, pipes or department names
    // ride inside the detail URL or storage key (review 09-19 P2).
    expect(token).toMatch(/^[a-z0-9]+$/);
    expect(token.length).toBeLessThanOrEqual(7);
  });

  it("gives different identities different tokens", () => {
    expect(sequenceToken("waves|all|||live")).not.toBe(
      sequenceToken("portraits|all|||live"),
    );
  });
});
