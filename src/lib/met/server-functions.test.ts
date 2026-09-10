import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * createServerFn is mocked as a passthrough builder: outside the Start
 * runtime the real one throws ("No Start context in AsyncLocalStorage")
 * and only exposes __executeServer. The contracts under test (curated
 * lookup, fixture honesty, error mapping) live in the handlers, not in
 * Start plumbing — the zod validator still runs for real.
 */
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: Record<string, unknown> = {};
    builder.validator = (schema: { parse: (d: unknown) => unknown }) => {
      builder._schema = schema;
      return builder;
    };
    builder.handler = (fn: (ctx: unknown) => unknown) => {
      return (callOpts?: { data?: unknown }) => {
        const data = builder._schema
          ? (builder._schema as { parse: (d: unknown) => unknown }).parse(
              callOpts?.data,
            )
          : callOpts?.data;
        return fn({ data, signal: callOpts ? undefined : undefined });
      };
    };
    return builder;
  },
}));

/**
 * First direct coverage for the getArtwork / listDepartments server
 * functions (mimo 09-10 13:47 #3: 13 test files covered search, cache,
 * normalize, related — not the detail or department server paths).
 * Pinned contracts:
 *  - curated lookup wins over live fetch (deterministic review set)
 *  - fixture mode answers honestly for out-of-fixture objects
 *  - a live department failure surfaces as status "error" with the
 *    fixture data attached — NOT a healthy success (devin 09-09
 *    21:37 #2, the dishonest-fallback contract)
 */

const fetchMetObject = vi.hoisted(() => vi.fn());
const fetchMetDepartments = vi.hoisted(() => vi.fn());
const fetchMetSearchIds = vi.hoisted(() => vi.fn());
const fetchMetObjects = vi.hoisted(() => vi.fn());

vi.mock("./client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client.server")>();
  return {
    ...actual,
    fetchMetObject: (...args: unknown[]) => fetchMetObject(...args),
    fetchMetDepartments: (...args: unknown[]) => fetchMetDepartments(...args),
    fetchMetSearchIds: (...args: unknown[]) => fetchMetSearchIds(...args),
    fetchMetObjects: (...args: unknown[]) => fetchMetObjects(...args),
  };
});

import { metDepartments } from "@/data/departments";
import {
  getArtwork,
  listDepartments,
  searchCollection,
} from "./server-functions";

function setFixtureMode(on: boolean) {
  vi.stubEnv("MET_API_MODE", on ? "fixture" : "");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("getArtwork", () => {
  it("returns the curated record without touching the live client", async () => {
    setFixtureMode(false);
    const result = await getArtwork({ data: { objectId: 436535 } });
    expect(result.status).toBe("success");
    expect(result.source).toBe("curated");
    expect(result.artwork?.displayTitle).toBe("Wheat Field with Cypresses");
    expect(fetchMetObject).not.toHaveBeenCalled();
  });

  it("fixture mode answers honestly for objects outside the fixture", async () => {
    setFixtureMode(true);
    const result = await getArtwork({ data: { objectId: 12345 } });
    expect(result.status).toBe("error");
    expect(result.source).toBe("fixture");
    expect(result.artwork).toBeNull();
    expect(result).toMatchObject({
      message: expect.stringMatching(
        /outside the deterministic review fixture/,
      ),
    });
    expect(fetchMetObject).not.toHaveBeenCalled();
  });

  it("falls back to the live client and reports its failures", async () => {
    setFixtureMode(false);
    fetchMetObject.mockResolvedValueOnce({ id: 12345, displayTitle: "Live" });
    const ok = await getArtwork({ data: { objectId: 12345 } });
    expect(ok.status).toBe("success");
    expect(ok.source).toBe("met");

    fetchMetObject.mockRejectedValueOnce(new Error("upstream down"));
    const failed = await getArtwork({ data: { objectId: 12345 } });
    expect(failed.status).toBe("error");
    expect(failed.source).toBe("met");
    expect(failed.artwork).toBeNull();
    expect(failed).toMatchObject({
      message: expect.stringContaining("Met object record"),
    });
  });
});

describe("listDepartments", () => {
  it("fixture mode serves the deterministic department index", async () => {
    setFixtureMode(true);
    const result = await listDepartments();
    expect(result.status).toBe("success");
    expect(result.source).toBe("fixture");
    expect(result.departments).toEqual(metDepartments);
  });

  it("a live failure is an honest error carrying fixture data, not a success", async () => {
    setFixtureMode(false);
    fetchMetDepartments.mockRejectedValueOnce(new Error("503"));
    const result = await listDepartments();
    expect(result.status).toBe("error");
    expect(result.source).toBe("fixture");
    expect(result.departments).toEqual(metDepartments);
    expect(result).toMatchObject({
      message: expect.stringContaining("Met department index"),
    });
  });

  it("serves the live department index on success", async () => {
    setFixtureMode(false);
    fetchMetDepartments.mockResolvedValueOnce([
      { id: 1, name: "American Decorative Arts" },
    ]);
    const result = await listDepartments();
    expect(result.status).toBe("success");
    expect(result.source).toBe("met");
    expect(result.departments).toEqual([
      { id: 1, name: "American Decorative Arts" },
    ]);
  });
});

// The most complex handler (curated / fixture / live / partial / empty /
// error) — glm-5-2 09-10 14:58 #3. These pin the honesty contracts the
// route renders: curated-first, fixture determinism, live success,
// hydration-failure partial, and the honest empty for a fully sieved
// window (0e28941).
describe("searchCollection", () => {
  function artwork(id: number) {
    return {
      id,
      accessionNumber: null,
      title: `Object ${id}`,
      displayTitle: `Object ${id}`,
      artist: "A maker",
      artistBio: null,
      date: "1889",
      culture: null,
      period: null,
      medium: "Oil",
      dimensions: null,
      department: "European Paintings",
      classification: "Paintings",
      primaryImage: `https://example.com/${id}.jpg`,
      primaryImageSmall: `https://example.com/${id}-s.jpg`,
      additionalImages: [],
      imageAspectRatio: 1.25,
      isPublicDomain: true,
      rights: null,
      creditLine: null,
      canonicalUrl: `https://metmuseum.org/art/collection/search/${id}`,
      tags: [],
    };
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serves the curated review set when the trigger is not live", async () => {
    setFixtureMode(false);
    const result = await searchCollection({
      data: { q: "", department: "all", page: 1 },
    });
    expect(result.source).toBe("curated");
    expect(result.status).toBe("success");
    expect(fetchMetSearchIds).not.toHaveBeenCalled();
  });

  it("fixture mode answers live triggers deterministically", async () => {
    setFixtureMode(true);
    const result = await searchCollection({
      data: { q: "van gogh", department: "all", page: 1 },
    });
    expect(result.source).toBe("fixture");
    expect(fetchMetSearchIds).not.toHaveBeenCalled();
  });

  it("live success: sieves open-access works from the hydrated window", async () => {
    setFixtureMode(false);
    fetchMetSearchIds.mockResolvedValueOnce({
      total: 100,
      objectIds: Array.from({ length: 36 }, (_, i) => i + 1),
      preFiltered: true,
    });
    // The whole 36-wide window must hydrate or the handler reads it as
    // a partial — success here means zero drops.
    fetchMetObjects.mockResolvedValueOnce(
      Array.from({ length: 36 }, (_, i) => artwork(i + 1)),
    );

    const result = await searchCollection({
      data: { q: "waves", department: "all", page: 1 },
    });
    expect(result.status).toBe("success");
    expect(result.source).toBe("met");
    // The sieve pages SEARCH_PAGE_SIZE (24) out of the 36-wide window —
    // the 12-id overlap is the dedupe safety net (fill-pages.ts).
    expect(result.artworks).toHaveLength(24);
  });

  it("hydration failures degrade to partial + curated fallback notice", async () => {
    setFixtureMode(false);
    fetchMetSearchIds.mockResolvedValueOnce({
      total: 100,
      objectIds: Array.from({ length: 36 }, (_, i) => i + 1),
      preFiltered: true,
    });
    // Only 2 of the promised window hydrate; the rest fail as nulls.
    fetchMetObjects.mockResolvedValueOnce([artwork(1), artwork(2)]);

    const result = await searchCollection({
      data: { q: "waves", department: "all", page: 1 },
    });
    expect(result.status).toBe("partial");
    expect(result.source).toBe("curated");
    expect(result.message).toMatch(/answering slowly/);
  });

  it("a fully hydrated window that sieves to zero is an honest empty", async () => {
    setFixtureMode(false);
    fetchMetSearchIds.mockResolvedValueOnce({
      total: 100,
      objectIds: Array.from({ length: 36 }, (_, i) => i + 1),
      preFiltered: true,
    });
    // Everything hydrates but none survive the open-access sieve.
    fetchMetObjects.mockResolvedValueOnce(
      Array.from({ length: 36 }, (_, i) => ({
        ...artwork(i + 1),
        isPublicDomain: false,
      })),
    );

    const result = await searchCollection({
      data: { q: "waves", department: "all", page: 1 },
    });
    expect(result.status).toBe("empty");
    expect(result.source).toBe("met");
    expect(result.artworks).toEqual([]);
    expect(result.message).toMatch(/No open-access works matched/);
  });

  it("an upstream failure with curated matches degrades to partial", async () => {
    setFixtureMode(false);
    fetchMetSearchIds.mockRejectedValueOnce(new Error("upstream down"));

    const result = await searchCollection({
      data: { q: "waves", department: "all", page: 1 },
    });
    // "waves" matches curated works, so the committed set is shown.
    expect(result.status).toBe("partial");
    expect(result.source).toBe("curated");
    expect(result.artworks.length).toBeGreaterThan(0);
    expect(result.message).toMatch(/answering slowly/);
  });

  it("an upstream failure with no curated matches is an honest error", async () => {
    setFixtureMode(false);
    fetchMetSearchIds.mockRejectedValueOnce(new Error("upstream down"));

    const result = await searchCollection({
      data: { q: "not-a-real-object", department: "all", page: 1 },
    });
    expect(result.status).toBe("error");
    expect(result.artworks).toEqual([]);
  });
});
