import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/routes/art/$objectId.tsx", "utf8");

/**
 * grok 23:45 #3: the "Open image" footer link always targeted
 * artwork.primaryImage even when an additional-view tab was selected —
 * the link contradicted the artifact on screen. The parent now tracks
 * the stage's active source and opens that.
 */
describe("open-image footer contract", () => {
  it("routes the footer link through the stage's active source", () => {
    expect(src).toContain("onActiveSrcChange={setOpenImageSrc}");
    expect(src).toMatch(/openImageSrc \?\?\s*\n?\s*artwork\.primaryImage/);
    // the raw-primary-only href is gone
    expect(src).not.toContain(
      "href={artwork.primaryImage ?? artwork.primaryImageSmall ?? \"#\"}",
    );
  });

  it("the stage reports every active-source change upward", () => {
    expect(src).toContain("onActiveSrcChange?.(src)");
    expect(src).toContain("const setActiveSrc = (src: string) => {");
  });
});
