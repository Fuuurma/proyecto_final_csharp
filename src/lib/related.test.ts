import { describe, expect, it } from "vitest";
import type { Artwork } from "./met/normalize";
import { getRelatedArtworks } from "./related";

function work(partial: Partial<Artwork> & Pick<Artwork, "id">): Artwork {
  return {
    accessionNumber: null,
    title: `Object ${partial.id}`,
    displayTitle: `Object ${partial.id}`,
    artist: null,
    artistBio: null,
    date: null,
    culture: null,
    period: null,
    medium: null,
    dimensions: null,
    department: null,
    classification: null,
    primaryImage: null,
    primaryImageSmall: null,
    additionalImages: [],
    imageAspectRatio: 1,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: `https://example.com/${partial.id}`,
    tags: [],
    ...partial,
  };
}

describe("getRelatedArtworks", () => {
  const wheat = work({
    id: 1,
    artist: "Vincent van Gogh",
    department: "European Paintings",
    tags: ["Landscapes"],
  });
  const sunflowers = work({
    id: 2,
    artist: "Vincent van Gogh",
    department: "European Paintings",
    tags: ["Sunflowers"],
  });
  const irises = work({
    id: 3,
    artist: "Vincent van Gogh",
    department: "European Paintings",
    tags: ["Flowers"],
  });
  const landscape = work({
    id: 4,
    artist: "Another painter",
    department: "European Paintings",
    tags: ["Landscapes"],
  });
  const print = work({
    id: 5,
    artist: "A printmaker",
    department: "Drawings and Prints",
    tags: ["Waves"],
  });
  const portrait = work({
    id: 6,
    artist: "A portraitist",
    department: "European Paintings",
    tags: ["Faces"],
  });
  const stillLife = work({
    id: 7,
    artist: "A still-life painter",
    department: "European Paintings",
    tags: ["Flowers"],
  });

  it("fills a related room from maker, then subject, then department", () => {
    const related = getRelatedArtworks(wheat, [
      wheat,
      sunflowers,
      irises,
      landscape,
      print,
      portrait,
      stillLife,
    ]);

    expect(related.label).toBe("Same maker");
    expect(related.artworks.map((artwork) => artwork.id)).toEqual([
      2, 3, 4, 6, 7,
    ]);
  });

  it("caps the related room so the detail page stays bounded", () => {
    const catalog = [
      wheat,
      ...Array.from({ length: 8 }, (_, index) =>
        work({
          id: 20 + index,
          artist: "Vincent van Gogh",
          department: "European Paintings",
        }),
      ),
    ];

    expect(getRelatedArtworks(wheat, catalog).artworks).toHaveLength(6);
  });
});
