// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjacentInSequence,
  readBrowseSequence,
  sequenceParam,
  sequenceSignature,
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

function seedEntry(identity: string, items: unknown[]): void {
  window.sessionStorage.setItem(
    `mtm-seq:${sequenceToken(identity)}`,
    JSON.stringify({ sig: sequenceSignature(identity), items }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("browse sequence", () => {
  it("round-trips the stored order", () => {
    writeBrowseSequence(sequenceParam("k"), [makeArtwork(1), makeArtwork(2)]);
    expect(readBrowseSequence(sequenceParam("k")).map((a) => a.id)).toEqual([
      1, 2,
    ]);
  });

  it("returns an empty list for a missing or corrupt key", () => {
    expect(readBrowseSequence(sequenceParam("missing"))).toEqual([]);
    window.sessionStorage.setItem(
      `mtm-seq:${sequenceToken("corrupt")}`,
      "{not json",
    );
    expect(readBrowseSequence(sequenceParam("corrupt"))).toEqual([]);
  });

  it("reads and writes nothing for a param with no signature half", () => {
    // A bare storage key is not a `?seq=` param — without the sig the
    // reader cannot verify ownership, so both directions refuse
    // (review 09-19 18:17 P2).
    expect(writeBrowseSequence("barekey", [makeArtwork(1)])).toBe(false);
    expect(readBrowseSequence("barekey")).toEqual([]);
    expect(readBrowseSequence(".onlysig")).toEqual([]);
    expect(readBrowseSequence("onlykey.")).toEqual([]);
  });

  it("returns nothing when a different identity's signature owns the slot", () => {
    // A colliding identity's write legitimately wins the shared key —
    // the displaced identity's `?seq=` links must then read nothing,
    // never the foreign list with a confident position (review 09-19
    // 18:17 P2). The stored artwork is even present in the foreign
    // list; the sig gate is what keeps the nav honest.
    const param = sequenceParam("waves|all|||live");
    writeBrowseSequence(param, [makeArtwork(1), makeArtwork(2)]);
    window.sessionStorage.setItem(
      `mtm-seq:${sequenceToken("waves|all|||live")}`,
      JSON.stringify({
        sig: sequenceSignature("portraits|all|||live"),
        items: [makeArtwork(7), makeArtwork(1)],
      }),
    );
    expect(readBrowseSequence(param)).toEqual([]);
    expect(adjacentInSequence(param, 1)).toBeNull();
  });

  it("drops malformed entries instead of trusting the payload", () => {
    seedEntry("mixed", [makeArtwork(1), { id: "nope" }, makeArtwork(3)]);
    expect(readBrowseSequence(sequenceParam("mixed")).map((a) => a.id)).toEqual(
      [1, 3],
    );
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
    seedEntry("unrenderable", [noImage, badRatio, makeArtwork(3)]);
    expect(
      readBrowseSequence(sequenceParam("unrenderable")).map((a) => a.id),
    ).toEqual([3]);
  });

  it("stores the signature and only the fields the prev/next trail reads", () => {
    writeBrowseSequence(sequenceParam("slim"), [makeArtwork(1)]);
    const stored = JSON.parse(
      window.sessionStorage.getItem(`mtm-seq:${sequenceToken("slim")}`) ??
        "null",
    ) as { sig?: unknown; items?: Array<Record<string, unknown>> };
    expect(stored.sig).toBe(sequenceSignature("slim"));
    expect(Object.keys(stored.items?.[0] ?? {}).sort()).toEqual([
      "artist",
      "displayTitle",
      "id",
      "imageAspectRatio",
      "primaryImage",
      "primaryImageSmall",
    ]);
    expect(stored.items?.[0]?.artist).toBe("Maker 1");
  });

  it("resolves neighbors inside the browsed list", () => {
    const ids = [10, 20, 30, 40];
    writeBrowseSequence(sequenceParam("search"), ids.map(makeArtwork));
    const mid = adjacentInSequence(sequenceParam("search"), 20);
    expect(mid?.previous?.id).toBe(10);
    expect(mid?.next?.id).toBe(30);
    expect(mid?.position).toBe(2);
    expect(mid?.total).toBe(4);
  });

  it("gives first/last boundary neighbors instead of wrapping", () => {
    writeBrowseSequence(sequenceParam("ends"), [
      makeArtwork(1),
      makeArtwork(2),
    ]);
    expect(adjacentInSequence(sequenceParam("ends"), 1)?.previous).toBeNull();
    expect(adjacentInSequence(sequenceParam("ends"), 2)?.next).toBeNull();
  });

  it("returns null when the artwork is not in the browsed list", () => {
    writeBrowseSequence(sequenceParam("other"), [makeArtwork(1)]);
    expect(adjacentInSequence(sequenceParam("other"), 999)).toBeNull();
  });

  it("never stores more than the grid can display", () => {
    const works = Array.from(
      { length: SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE + 10 },
      (_, i) => makeArtwork(i),
    );
    writeBrowseSequence(sequenceParam("big"), works);
    expect(readBrowseSequence(sequenceParam("big"))).toHaveLength(
      SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE,
    );
  });

  it("reports a failed write so the caller can retry", () => {
    expect(writeBrowseSequence(sequenceParam("ok"), [makeArtwork(1)])).toBe(
      true,
    );
    // A quota-throwing setItem must surface as `false` — the explore
    // effect only caches the write signature on success, so a later
    // attempt retries and lands once storage frees up (review 09-19 P2).
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    expect(writeBrowseSequence(sequenceParam("full"), [makeArtwork(2)])).toBe(
      false,
    );
    expect(readBrowseSequence(sequenceParam("full"))).toEqual([]);
    setItem.mockRestore();
    expect(writeBrowseSequence(sequenceParam("full"), [makeArtwork(2)])).toBe(
      true,
    );
    expect(readBrowseSequence(sequenceParam("full")).map((a) => a.id)).toEqual([
      2,
    ]);
  });

  it("skips empty writes — no slot, no index, no eviction", () => {
    // A zero-result search under a real identity must not index an empty
    // sequence or push a real one out of the LRU (sibling review 09-19).
    writeBrowseSequence(sequenceParam("real"), [makeArtwork(1)]);
    expect(writeBrowseSequence(sequenceParam("empty"), [])).toBe(false);
    expect(
      window.sessionStorage.getItem(`mtm-seq:${sequenceToken("empty")}`),
    ).toBeNull();
    expect(readBrowseSequence(sequenceParam("real")).map((a) => a.id)).toEqual([
      1,
    ]);
  });

  it("evicts the oldest sequence once the keyspace fills", () => {
    // MAX_KEYS = 8 identities; the 9th write must not grow storage
    // unbounded — the oldest key goes out whole (review 09-19 P2).
    for (let i = 0; i < 9; i += 1) {
      writeBrowseSequence(sequenceParam(`k${i}`), [makeArtwork(i)]);
    }
    expect(readBrowseSequence(sequenceParam("k0"))).toEqual([]);
    expect(readBrowseSequence(sequenceParam("k8")).map((a) => a.id)).toEqual([
      8,
    ]);
    const index = JSON.parse(
      window.sessionStorage.getItem("mtm-seq:_index") ?? "[]",
    ) as string[];
    expect(index).toHaveLength(8);
    expect(index).not.toContain(sequenceToken("k0"));
  });

  it("re-writing an identity refreshes its recency", () => {
    for (let i = 0; i < 8; i += 1) {
      writeBrowseSequence(sequenceParam(`k${i}`), [makeArtwork(i)]);
    }
    writeBrowseSequence(sequenceParam("k0"), [makeArtwork(0)]);
    writeBrowseSequence(sequenceParam("new"), [makeArtwork(99)]);
    // k0 was refreshed, so k1 is now the oldest and gets evicted.
    expect(readBrowseSequence(sequenceParam("k0")).map((a) => a.id)).toEqual([
      0,
    ]);
    expect(readBrowseSequence(sequenceParam("k1"))).toEqual([]);
  });

  it("self-heals a corrupt index without losing the write", () => {
    window.sessionStorage.setItem("mtm-seq:_index", "{not json");
    expect(writeBrowseSequence(sequenceParam("k"), [makeArtwork(1)])).toBe(
      true,
    );
    expect(readBrowseSequence(sequenceParam("k")).map((a) => a.id)).toEqual([
      1,
    ]);
  });

  it("sweeps orphaned entries a corrupt index forgot", () => {
    // The corrupt-index rebuild resets the LRU to [newKey]; entries the
    // old index listed stay on disk and leak toward quota unless the
    // write sweeps them (review 09-19 P2).
    window.sessionStorage.setItem("mtm-seq:_index", "{not json");
    window.sessionStorage.setItem(
      "mtm-seq:orphan",
      JSON.stringify([makeArtwork(9)]),
    );
    window.sessionStorage.setItem(
      "mtm-seq:orphan2",
      JSON.stringify([makeArtwork(8)]),
    );
    expect(writeBrowseSequence(sequenceParam("fresh"), [makeArtwork(1)])).toBe(
      true,
    );
    expect(readBrowseSequence(sequenceParam("fresh")).map((a) => a.id)).toEqual(
      [1],
    );
    expect(window.sessionStorage.getItem("mtm-seq:orphan")).toBeNull();
    expect(window.sessionStorage.getItem("mtm-seq:orphan2")).toBeNull();
    // The rebuilt index and unrelated keys survive the sweep.
    expect(window.sessionStorage.getItem("mtm-seq:_index")).not.toBeNull();
    window.sessionStorage.setItem("unrelated", "keep me");
    writeBrowseSequence(sequenceParam("later"), [makeArtwork(2)]);
    expect(window.sessionStorage.getItem("unrelated")).toBe("keep me");
  });
});

describe("sequenceParam", () => {
  it("is deterministic, opaque, and carries key + signature halves", () => {
    const identity = "van Gogh|all|||live";
    const param = sequenceParam(identity);
    expect(param).toBe(sequenceParam(identity));
    // `<key>.<sig>` — no raw query, pipes or department names ride
    // inside the detail URL or storage key (review 09-19 P2).
    expect(param).toMatch(/^[a-z0-9]+\.[a-z0-9]+$/);
    expect(param).toBe(
      `${sequenceToken(identity)}.${sequenceSignature(identity)}`,
    );
  });

  it("gives different identities different params", () => {
    expect(sequenceParam("waves|all|||live")).not.toBe(
      sequenceParam("portraits|all|||live"),
    );
  });
});

describe("sequenceToken", () => {
  it("is deterministic and a short base36 storage key", () => {
    const identity = "van Gogh|all|||live";
    const token = sequenceToken(identity);
    expect(token).toBe(sequenceToken(identity));
    expect(token).toMatch(/^[a-z0-9]+$/);
    expect(token.length).toBeLessThanOrEqual(7);
  });

  it("uses an independent signature so a key collision cannot alias", () => {
    // The two halves derive from different hashes (djb2 vs fnv-1a) —
    // sharing the key half alone is not enough to read a slot
    // (review 09-19 18:17 P2).
    const identity = "van Gogh|all|||live";
    expect(sequenceSignature(identity)).toBe(sequenceSignature(identity));
    expect(sequenceSignature(identity)).toMatch(/^[a-z0-9]+$/);
    expect(sequenceSignature("waves|all|||live")).not.toBe(
      sequenceSignature("portraits|all|||live"),
    );
  });
});
