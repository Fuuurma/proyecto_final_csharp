import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// needs-work 10-01 P2: the caller's zero-usable early-return duplicated
// computeSearchStatus's empty/partial semantics (the two definitions
// could drift; the function's zero-usable clauses were unreachable from
// production). The caller must route its zero-usable case THROUGH the
// function and only map status -> message/payload.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "server-functions.ts"), "utf8");

describe("searchCollection zero-usable delegation contract", () => {
  it("routes the zero-usable early-return through computeSearchStatus", () => {
    const blockStart = src.indexOf("if (artworks.length === 0) {");
    expect(blockStart).toBeGreaterThan(-1);
    const block = src.slice(blockStart, blockStart + 900);
    expect(block).toContain("computeSearchStatus(");
    expect(block).toContain("usableCount: 0");
    // The old duplicated definitions are gone from the block.
    expect(block).not.toMatch(/hydrated\.length < pageIds\.length\) \{\s*$/m);
  });
});
