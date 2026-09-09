import { afterEach, describe, expect, it } from "vitest";
import { clearMetCache } from "./cache";
import {
  fetchMetDepartments,
  fetchMetObject,
  fetchMetObjects,
  fetchMetSearchIds,
  SEARCH_PAGE_SIZE,
  sliceSearchPage,
} from "./client.server";

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function objectPayload(objectID: number) {
  return {
    objectID,
    title: `Object ${objectID}`,
    artistDisplayName: "A maker",
    primaryImageSmall: `https://example.com/${objectID}.jpg`,
    isPublicDomain: true,
  };
}

describe("Met API adapter", () => {
  afterEach(() => {
    clearMetCache();
  });

  it("limits search IDs and requests public-domain image-backed results", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("hasImages")).toBe("true");
      expect(url.searchParams.get("isPublicDomain")).toBe("true");
      return response({
        total: 30,
        objectIDs: [1, 2, 3, 4, 5],
      });
    };

    await expect(
      fetchMetSearchIds("paintings", { fetcher, limit: 3 }),
    ).resolves.toEqual({ total: 30, objectIds: [1, 2, 3], preFiltered: true });
  });

  it("treats a null objectIDs list as an empty search", async () => {
    const fetcher: typeof fetch = async () =>
      response({ total: 0, objectIDs: null });

    await expect(fetchMetSearchIds("nope", { fetcher })).resolves.toEqual({
      total: 0,
      objectIds: [],
      preFiltered: true,
    });
  });

  it("slices a search ID list into bounded pages", () => {
    const ids = Array.from({ length: 50 }, (_, index) => index + 1);
    expect(sliceSearchPage(ids, 1)).toEqual(ids.slice(0, 24));
    expect(sliceSearchPage(ids, 2)).toHaveLength(SEARCH_PAGE_SIZE);
    expect(sliceSearchPage(ids, 2)[0]).toBe(25);
    expect(sliceSearchPage(ids, 3)).toEqual(ids.slice(48, 50));
    expect(sliceSearchPage(ids, 4)).toEqual([]);
    expect(sliceSearchPage(ids, 5)).toEqual([]);
  });

  it("can browse a department using the objects endpoint without a keyword", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      expect(url.pathname).toContain("/objects");
      expect(url.searchParams.get("departmentIds")).toBe("11");
      // /objects IGNORES these filters (only /search honours them) — they
      // are forward-compatibility only, and preFiltered:false tells the
      // caller the open-access sieve is the real contract (devin 09-09
      // 14:17 #1).
      expect(url.searchParams.get("hasImages")).toBe("true");
      expect(url.searchParams.get("isPublicDomain")).toBe("true");
      return response({
        total: 12,
        objectIDs: [10, 11, 12],
      });
    };

    await expect(
      fetchMetSearchIds("", { fetcher, departmentId: 11, limit: 2 }),
    ).resolves.toEqual({
      total: 12,
      objectIds: [10, 11],
      preFiltered: false,
    });
  });

  it("reads the committed department index shape", async () => {
    const fetcher: typeof fetch = async () =>
      response({
        departments: [
          { departmentId: 6, displayName: "Asian Art" },
          { departmentId: 11, displayName: "European Paintings" },
        ],
      });

    await expect(fetchMetDepartments({ fetcher })).resolves.toEqual([
      { id: 6, name: "Asian Art" },
      { id: 11, name: "European Paintings" },
    ]);
  });

  it("bounds hydration and tolerates individual object failures", async () => {
    const fetcher: typeof fetch = async (input) => {
      const objectId = Number(new URL(String(input)).pathname.split("/").pop());
      return objectId === 2
        ? response({ message: "temporary failure" }, 503)
        : response(objectPayload(objectId));
    };

    await expect(
      fetchMetObjects([1, 2, 3], { fetcher, concurrency: 2 }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, artist: "A maker" }),
        expect.objectContaining({ id: 3, artist: "A maker" }),
      ]),
    );
  });

  it("turns aborted requests into a typed timeout error", async () => {
    const fetcher: typeof fetch = async () => {
      throw new DOMException("aborted", "AbortError");
    };

    await expect(fetchMetObject(1, { fetcher })).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it("bypasses the cache when a custom fetcher is injected so tests stay deterministic", async () => {
    let objectCalls = 0;
    const countingFetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      objectCalls += 1;
      return response(objectPayload(Number(url.pathname.split("/").pop())));
    };

    await fetchMetObject(42, { fetcher: countingFetcher });
    await fetchMetObject(42, { fetcher: countingFetcher });

    // A custom fetcher must always reach the network; the cache is only
    // used on the production path where the global fetch is in play.
    expect(objectCalls).toBe(2);
  });

  it("applies curated display titles to live-fetched curated objects", async () => {
    // 56353 is curated as "The Great Wave"; the live Met title is raw.
    const rawFetcher: typeof fetch = async () =>
      response({
        ...objectPayload(56353),
        title: "Under the Wave off Kanagawa",
      });

    const artwork = await fetchMetObject(56353, { fetcher: rawFetcher });
    expect(artwork.displayTitle).toBe("The Great Wave");
  });

  it("leaves non-curated live objects with their Met title", async () => {
    const rawFetcher: typeof fetch = async () =>
      response({ ...objectPayload(999999), title: "Some other object" });

    const artwork = await fetchMetObject(999999, { fetcher: rawFetcher });
    expect(artwork.displayTitle).toBe("Some other object");
  });
});
