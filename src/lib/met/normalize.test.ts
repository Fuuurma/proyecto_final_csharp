import { describe, expect, it } from "vitest";
import { normalizeMetObject } from "./normalize";

describe("normalizeMetObject", () => {
  it("turns missing collection fields into honest nulls", () => {
    const artwork = normalizeMetObject({
      objectID: 9,
      title: "  Study  ",
      isPublicDomain: true,
    });

    expect(artwork.title).toBe("Study");
    expect(artwork.artist).toBeNull();
    expect(artwork.date).toBeNull();
    expect(artwork.primaryImage).toBeNull();
    expect(artwork.imageAspectRatio).toBe(1);
    expect(artwork.canonicalUrl).toBe(
      "https://www.metmuseum.org/art/collection/search/9",
    );
  });

  it("uses the artist constituent when the display field is absent", () => {
    const artwork = normalizeMetObject({
      objectID: 10,
      title: "A work",
      constituents: [{ role: "Artist", name: "A maker" }],
      measurements: [
        {
          elementName: "Overall",
          elementMeasurements: { Height: 2, Width: 3 },
        },
      ],
    });

    expect(artwork.artist).toBe("A maker");
    expect(artwork.imageAspectRatio).toBe(1.5);
  });
});
