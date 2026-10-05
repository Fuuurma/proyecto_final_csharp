import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const exploreSource = readFileSync(join(here, "explore.tsx"), "utf8");

/**
 * Explore contracts that still live in the route source. The counter /
 * load-more honesty pins the old counter-honesty source suite carried
 * moved into src/lib/explore-load.ts and
 * src/components/explore-grid-footer.tsx with the 09-19 seqnav refactor
 * and are covered by real unit/render tests there
 * (explore-load.test.ts, explore-grid-footer.test.tsx) — what remains
 * here is what still lives inline in explore.tsx.
 */

// needs-work 09-25 P1: the tail-fill callback returned next.artworks
// unconditionally — but the server RESOLVES {status:"error",
// artworks:[]} when the curated fallback is empty (the normal shape for
// page >= 2). collectPages then cached the failed page as a legitimate
// empty, the zero-yield counter could blame the index, and the honest
// fillFailed handler stayed unreachable.
describe("explore tail-fill error contract", () => {
  it("gates the fill callback on the resolved status before returning artworks", () => {
    const start = exploreSource.indexOf("async (nextPage) => {");
    const end = exploreSource.indexOf("return next.artworks", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const callback = exploreSource.slice(start, end);
    expect(callback).toContain('next.status === "error"');
    expect(callback).toContain("throw");
  });

  // needs-work 09-26 #289 P1: a curated-source page is the degraded
  // review-set substitute, not live page content — it must throw rather
  // than append committed works into a live grid, and the loader must
  // not cache substitute rows under the live-query key where a later
  // fill would replay them.
  it("rejects curated substitutes at both fill seams", () => {
    const start = exploreSource.indexOf("async (nextPage) => {");
    const end = exploreSource.indexOf("return next.artworks", start);
    const callback = exploreSource.slice(start, end);
    expect(callback).toContain('next.source === "curated"');
    const cacheCall = exploreSource.indexOf("cachePages(refillCache");
    expect(cacheCall).toBeGreaterThan(-1);
    const guard = exploreSource.slice(Math.max(0, cacheCall - 400), cacheCall);
    expect(guard).toContain('result.source !== "curated"');
  });
});

// needs-work 09-26 P2: resolvedDepartmentId prefers departmentId, but
// liveDepartmentName preferred the raw department name — a crafted or
// stale URL (?department=Asian%20Art&departmentId=9) labeled the grid
// "Asian Art" while querying Drawings-and-Prints. The label must use
// the same precedence as the query.
describe("explore department label precedence", () => {
  it("derives the live label from departmentId first, like the query", () => {
    const start = exploreSource.indexOf("const liveDepartmentName");
    expect(start).toBeGreaterThan(-1);
    const block = exploreSource.slice(start, start + 320);
    const idBranch = block.indexOf("departmentId !== undefined");
    const nameBranch = block.indexOf('activeDepartment !== "all"');
    expect(idBranch).toBeGreaterThan(-1);
    expect(nameBranch).toBeGreaterThan(-1);
    expect(idBranch).toBeLessThan(nameBranch);
    expect(block).toContain("departmentNameById(departmentId)");
  });
});

describe("explore department filter visibility (grok 01:45 P2)", () => {
  it("departmentId arrivals press the matching chip, not an empty toggle", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "explore.tsx"),
      "utf8",
    );
    // The old expression rendered an empty value for departmentId
    // arrivals — a filtered grid with no visible filter state.
    expect(src).not.toContain(
      "departmentId !== undefined ? [] : [activeDepartment]",
    );
    // The pressed chip must come from the id-resolved name, gated on the
    // curated filter list so out-of-list ids fall back to the label.
    expect(src).toContain("const pressedDepartment =");
    expect(src).toContain("departmentNameById(departmentId)");
  });
});

// needs-work 10-04: the tail-fill exhaustion heuristic counted RAW chunk
// length, but adjacent hydrate windows overlap by 12 ids — a window that
// re-served only ids the grid already deduped grew `all` while showing
// nothing new, resetting zeroYieldWindows and re-arming "Load more" on a
// dead stream. The yield measure must run through the same dedupeById the
// grid applies.
describe("explore tail-fill exhaustion heuristic", () => {
  it("measures window yield after the grid's dedupe", () => {
    const start = exploreSource.indexOf("onChunk:");
    expect(start).toBeGreaterThan(-1);
    const block = exploreSource.slice(start, start + 1200);
    expect(block).toContain("dedupeById([");
    // The deduped count — including the page-1 result — is what the
    // zero-yield comparison must run against.
    expect(block).toContain("...result.artworks");
    expect(block).not.toContain("all.length === lastChunkLength");
  });
});
