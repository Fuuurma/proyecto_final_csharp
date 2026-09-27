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
      'href={artwork.primaryImage ?? artwork.primaryImageSmall ?? "#"}',
    );
  });

  it("the stage reports every active-source change upward", () => {
    expect(src).toContain("onActiveSrcChange?.(src)");
    expect(src).toContain("const setActiveSrc = (src: string) => {");
  });
});

// grok 23:45 #4: the tablist declared role="tab" but supported pointer
// clicks only — arrows/Home/End were dead, collapsing non-pointer users
// to the primary image. The roster is now one tab stop with roving
// selection and a labelled tabpanel.
describe("artwork-views tablist keyboard contract", () => {
  it("wires roving tabindex, arrow movement, and a labelled panel", () => {
    expect(src).toContain("onKeyDown={(event) => {");
    expect(src).toContain('event.key === "ArrowRight"');
    expect(src).toContain('event.key === "Home"');
    expect(src).toContain("tabIndex={selected ? 0 : -1}");
    expect(src).toContain("id={`view-tab-${index}`}");
    expect(src).toContain('aria-controls="artwork-stage-panel"');
    expect(src).toContain('id="artwork-stage-panel"');
    expect(src).toContain('role="tabpanel"');
  });
});
