import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Archive text carries nav, captions, counts, and footer copy at
 * 9-13px (grok 09-10 18:45 #1) — it must hold WCAG AA (4.5:1) against
 * paper. #70736e measured ~4.26:1; #5c5f58 is the darkened token.
 */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(hex.slice(1 + i, 3 + i), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Slice a top-level rule from its selector to its closing brace. The
 * selector is anchored at column 0 so an indented media-scoped override
 * — or a comment that names the selector — cannot satisfy the pin
 * (review 10-05 11:17 #2).
 */
function ruleBlock(source: string, start: RegExp): string {
  const at = source.search(start);
  if (at === -1) {
    throw new Error(`expected a top-level rule matching ${start}`);
  }
  return source.slice(at, source.indexOf("}", at));
}

describe("archive token contrast", () => {
  const styles = readFileSync(join(here, "styles.css"), "utf8");

  it("--archive reads at AA against --paper", () => {
    const archive = styles.match(/--archive:\s*(#[0-9a-f]{6})/)?.[1];
    const paper = styles.match(/--paper:\s*(#[0-9a-f]{6})/)?.[1];
    if (!archive || !paper) {
      throw new Error("expected --archive and --paper tokens in styles.css");
    }
    expect(contrast(archive, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("sticky offsets derive from the header-height token", () => {
    // .collection-index__intro is a sibling of .site-header, not a
    // descendant — the token only reaches it when declared on :root.
    const rootBlock = ruleBlock(styles, /^:root\s*\{/m);
    expect(rootBlock).toContain("--header-h: 76px");
    // A 68px duplicate appended to top-level :root would still pass the
    // positive pin while winning the cascade at every viewport — assert
    // its absence too (review 10-06 04:47 #1).
    expect(rootBlock).not.toContain("68px");

    // The 68px override must stay inside the 760px media block — hoisted
    // to the top-level :root it would silently win at every viewport
    // (review 10-05 11:17 #1). Media blocks close at column 0.
    const mobileBlocks = styles.match(
      /^@media \(max-width: 760px\) \{[\s\S]*?^\}/gm,
    );
    // The match silently comes back empty if the block stops closing at
    // column 0 or the query string drifts — pin the blocks' existence so
    // .some() fails scoped, not as a cryptic undefined (review 10-06
    // 04:47 #2).
    expect(mobileBlocks?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      mobileBlocks?.some((block) =>
        /:root\s*\{[^}]*--header-h:\s*68px/.test(block),
      ),
    ).toBe(true);

    const introBlock = ruleBlock(styles, /^\.collection-index__intro\s*\{/m);
    expect(introBlock).toContain("var(--header-h)");
  });
});
