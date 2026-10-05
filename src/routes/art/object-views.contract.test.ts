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
    expect(src).toMatch(/openImageSrc \?\?\s*\n?\s*artwork\.primaryImage/);
    // the raw-primary-only href is gone
    expect(src).not.toContain(
      'href={artwork.primaryImage ?? artwork.primaryImageSmall ?? "#"}',
    );
  });

  // needs-work 10-04 P1 (same defect as the 10-01 report): ArtworkDetail
  // does not remount on param-only prev/next navigation, while
  // ArtworkStage does (key={objectId}) — a bare string state kept
  // opening the PREVIOUS object's image after the stage reset to the
  // new primary. The reported src is stored with the id it was picked
  // under and only honored while that object is still the one on
  // screen.
  it("scopes the picked view to the object it was picked under", () => {
    expect(src).toContain("setOpenImage({ forId: artwork.id, src })");
    expect(src).toContain("openImage?.forId === artwork.id");
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

  // needs-work 09-27 P1 / grok 01:45 #1: the tablist consumed arrows
  // with preventDefault only, so the same keydown kept bubbling to the
  // window-level prev/next artwork listener and navigated the route
  // out from under the keyboard user. Every key the tablist handles
  // must stop propagation before it can reach that page shortcut.
  it("keeps handled keys inside the tablist — no page navigation", () => {
    const tablistStart = src.indexOf('role="tablist"');
    expect(tablistStart).toBeGreaterThan(-1);
    const tablistEnd = src.indexOf("imageSources.map", tablistStart);
    const tablistBlock = src.slice(tablistStart, tablistEnd);
    expect(tablistBlock).toContain("event.stopPropagation()");
  });
});
