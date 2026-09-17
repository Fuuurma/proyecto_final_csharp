import { describe, expect, it } from "vitest";
import {
  aboutSourceArtwork,
  curatedArtworks,
  curatedPaths,
} from "./curated-artworks";

/**
 * tests/journey.spec.ts navigates by curated IDs, path slugs, and
 * display titles; editing the curated data silently broke the e2e
 * suite (mimo 09-10 13:47 #4 — proven live when the "Return to review
 * set" rename passed unit gates until this coupling was checked).
 * These pins are the contract between the data file and the specs.
 */
describe("journey.spec curated-data contract", () => {
  it("curates object 436535 as 'Wheat Field with Cypresses' with a renderable image", () => {
    const wheatField = curatedArtworks.find((a) => a.id === 436535);
    expect(wheatField).toBeDefined();
    expect(wheatField?.displayTitle).toBe("Wheat Field with Cypresses");
    expect(wheatField?.isPublicDomain).toBe(true);
    expect(wheatField?.primaryImageSmall).toBeTruthy();
  });

  it("curates the van-gogh-late-light path as exactly the three works the spec counts", () => {
    const path = curatedPaths.find((p) => p.slug === "van-gogh-late-light");
    expect(path).toBeDefined();
    expect(path?.title).toBe("Van Gogh / late light");
    expect(path?.artworkIds).toEqual([436524, 436528, 436534]);

    const curatedIds = new Set(curatedArtworks.map((a) => a.id));
    for (const id of path?.artworkIds ?? []) {
      expect(curatedIds.has(id), `path id ${id} must be curated`).toBe(true);
    }
  });

  it("keeps the about-page source artwork (Great Wave, 56353) curated", () => {
    // about.tsx renders its hero image only when aboutSourceArtwork
    // resolves — if 56353 left curatedArtworks the hero silently went
    // empty (the muse-work 09-14 03:58 'resurrect' fix moved the lookup
    // into a named export). departments.ts and homeGalleryIds reference
    // the same id, so this is load-bearing in three places.
    expect(
      aboutSourceArtwork,
      "56353 must stay curated — about hero, departments, and homeGalleryIds depend on it",
    ).toBeDefined();
  });
});
