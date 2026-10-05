import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { homeGalleryIds } from "./curated-artworks";

const here = dirname(fileURLToPath(import.meta.url));

/* The home wall is a hand-tuned editorial grid: CSS slots
 * (.home-gallery__item--1..N) carry per-position spans and offsets keyed
 * to array order. That coupling is deliberate, but it must never drift
 * silently — an artwork added or removed without updating the stylesheet
 * would reshape the wall with no error. This pin makes the slot contract
 * loud. A spacing-scale redesign is a design call, not this. */
const globals = readFileSync(join(here, "..", "styles.css"), "utf8");
const index = readFileSync(join(here, "..", "routes", "index.tsx"), "utf8");

describe("home gallery slot contract", () => {
  it("styles exactly one slot per gallery artwork", () => {
    const count = homeGalleryIds.length;
    for (let i = 1; i <= count; i++) {
      expect(globals).toContain(`.home-gallery__item--${i}`);
    }
    const declared = [...globals.matchAll(/home-gallery__item--(\d+)/g)].map(
      (m) => Number(m[1]),
    );
    const orphans = declared.filter((n) => n < 1 || n > count);
    expect(orphans).toEqual([]);
  });

  it("derives slot classes from gallery position, not data identity", () => {
    // The literal source text IS the assertion — the route builds its
    // class names via this exact template expression.
    // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional literal
    expect(index).toContain("home-gallery__item--${index + 1}");
  });
});
