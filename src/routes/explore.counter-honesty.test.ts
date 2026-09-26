import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const exploreSource = readFileSync(join(here, "explore.tsx"), "utf8");

/**
 * The live-search counter must not present the index total as a
 * viewable denominator: the app can only reach SEARCH_MAX_PAGE pages,
 * so "12 / 1700 matches loaded" implied 1,688 viewable works that are
 * not reachable (devin 21:32 #2). Loaded count and index size stay
 * separate numbers; the atCap notice owns the ceiling explanation.
 */
describe("explore counter honesty", () => {
  it("does not render the old N / M matches-loaded denominator", () => {
    expect(exploreSource).not.toContain("matches loaded");
  });

  it("names the index separately from the loaded count", () => {
    expect(exploreSource).toContain("in the index");
    expect(exploreSource).toContain("loaded");
  });

  // Sparse live results kept offering 'Load 24 more' through fill
  // windows that yielded zero new usable works, up to the record cap
  // (quick-critic 09-10 14:4x). Two consecutive zero-yield windows must
  // end the offer with an honest note.
  it("ends the load-more offer after consecutive zero-yield fill windows", () => {
    expect(exploreSource).toContain("!fillExhausted");
    expect(exploreSource).toContain("No further open-access works surfaced");
  });
});

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
});
