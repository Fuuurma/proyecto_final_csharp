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

vi.mock("./client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client.server")>();
  return {
    ...actual,
    fetchMetObject: (...args: unknown[]) => fetchMetObject(...args),
    fetchMetDepartments: (...args: unknown[]) => fetchMetDepartments(...args),
  };
});

import { metDepartments } from "@/data/departments";
import { getArtwork, listDepartments } from "./server-functions";

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
