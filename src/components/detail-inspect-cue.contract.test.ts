import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "styles.css"), "utf8");
const detailRoute = readFileSync(
  join(here, "..", "routes", "art", "$objectId.tsx"),
  "utf8",
);

/**
 * MTM-TOUCH-ZOOM-CUE-01: the high-resolution affordance on an artwork
 * was discoverable only by hover or keyboard focus. `.detail-image-hint`
 * sits at `opacity: 0` and is revealed solely by
 * `:hover` / `:focus-visible` — so on a touch device, where neither
 * hover nor a visible focus ring exists before the first tap, the cue
 * was invisible and the image read as a plain picture. A tap still
 * opened the high-res view; nothing on screen said it could.
 *
 * The fix is a coarse-pointer rule that shows the cue persistently, at
 * a legible size, without hiding the artwork behind it. jsdom cannot
 * evaluate media queries, so these pins assert the rule's presence and
 * its properties; the behavioral proof (and the screenshots) live in
 * tests/journey.spec.ts, which drives a real browser with
 * `hasTouch` and a coarse-pointer emulation.
 */
describe("inspect cue on coarse pointers", () => {
  const coarseBlock = (() => {
    // The coarse-pointer media block, isolated so an unrelated rule
    // elsewhere in a 3000-line stylesheet cannot satisfy the pin.
    const match = css.match(
      /@media\s*\(pointer:\s*coarse\)[^{]*\{([\s\S]*?)\n\}/,
    );
    return match?.[1] ?? "";
  })();

  it("declares a coarse-pointer rule for the inspect cue", () => {
    expect(
      coarseBlock,
      "styles.css has no @media (pointer: coarse) rule for the inspect cue — the cue is hover/focus-only, so touch users never see it",
    ).not.toBe("");
    expect(coarseBlock).toContain(".detail-image-hint");
  });

  it("makes the cue persistently visible, not merely hoverable", () => {
    // opacity: 1 is the load-bearing line — a rule that only restates
    // the color or font would still leave the cue invisible.
    expect(coarseBlock).toMatch(/\.detail-image-hint[^}]*opacity:\s*1/);
    // The hover offset must not survive, or the cue would sit below
    // the image's bottom edge while claiming to be visible.
    expect(coarseBlock).toMatch(
      /\.detail-image-hint[^}]*transform:\s*translateY\(0\)/,
    );
  });

  it("keeps the cue legible on touch", () => {
    // 10px uppercase mono is a desktop-hud register; at arm's length on
    // a phone it is unreadable. The coarse rule must lift it to at
    // least 12px.
    const fontSize = coarseBlock.match(/font-size:\s*([\d.]+)px/)?.[1];
    expect(
      fontSize,
      "the coarse-pointer cue declares no font-size, so it stays at the 10px desktop size",
    ).toBeDefined();
    expect(Number(fontSize)).toBeGreaterThanOrEqual(12);
    // Sentence case, not the uppercase mono register: text-transform
    // must be none or capitalize-lowered, never left as uppercase.
    expect(coarseBlock).toMatch(/text-transform:\s*(none|lowercase)/);
  });

  it("keeps the cue low-emphasis so it does not hide the artwork", () => {
    // The cue sits over the image. A fully opaque plate competes with
    // the artwork; the pin holds a translucent backing so the artwork
    // still reads through it.
    const background = coarseBlock.match(/background:\s*([^;]+);/)?.[1] ?? "";
    expect(background, "the coarse cue declares no background").toBeTruthy();
    expect(
      background,
      "the coarse cue must stay translucent so the artwork reads through it",
    ).toMatch(/transparent|color-mix|rgba/);
  });

  it("does not disturb the desktop hover and focus enhancement", () => {
    // The desktop path must keep working: the coarse rule is additive.
    expect(css).toMatch(
      /\.detail-image-trigger:hover \.detail-image-hint,\s*\.detail-image-trigger:focus-visible \.detail-image-hint\s*\{[^}]*opacity:\s*1/,
    );
  });

  it("leaves reduced motion static", () => {
    // The hint's transform is a motion channel. Under prefers-reduced-
    // motion it must not animate, which the global block already
    // handles — but the coarse rule must not re-introduce motion with
    // its own transition.
    expect(coarseBlock).not.toMatch(/transition[^;]*;/);
  });

  it("the cue is real text, not an icon-only affordance", () => {
    // Discoverability also fails for screen-reader users if the label
    // is icon-only; the route renders "Inspect" alongside the icon and
    // the button carries an explicit accessible name.
    expect(detailRoute).toContain("Inspect");
    expect(detailRoute).toMatch(/aria-label=\{`Inspect /);
  });
});
