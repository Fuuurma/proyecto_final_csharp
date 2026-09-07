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
});
