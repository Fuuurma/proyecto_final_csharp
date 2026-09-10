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

describe("archive token contrast", () => {
  const styles = readFileSync(join(here, "styles.css"), "utf8");

  it("--archive reads at AA against --paper", () => {
    const archive = styles.match(/--archive:\s*(#[0-9a-f]{6})/)?.[1];
    const paper = styles.match(/--paper:\s*(#[0-9a-f]{6})/)?.[1];
    expect(archive).toBeDefined();
    expect(paper).toBeDefined();
    expect(contrast(archive!, paper!)).toBeGreaterThanOrEqual(4.5);
  });

  it("sticky offsets derive from the header-height token", () => {
    expect(styles).toContain("--header-h: 76px");
    expect(styles).toContain("--header-h: 68px");
    const introBlock = styles.slice(
      styles.indexOf(".collection-index__intro"),
      styles.indexOf("}", styles.indexOf(".collection-index__intro")),
    );
    expect(introBlock).toContain("var(--header-h)");
  });
});
