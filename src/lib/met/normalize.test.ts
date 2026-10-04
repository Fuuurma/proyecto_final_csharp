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

  it("falls back to a square ratio when the aspect math overflows to Infinity", () => {
    const artwork = normalizeMetObject({
      objectID: 11,
      title: "A work",
      measurements: [
        {
          elementName: "Overall",
          elementMeasurements: { Height: 1e-308, Width: 1e308 },
        },
      ],
    });

    expect(artwork.imageAspectRatio).toBe(1);
  });

  it("falls back to a square ratio when the aspect math underflows to zero", () => {
    const artwork = normalizeMetObject({
      objectID: 12,
      title: "A work",
      measurements: [
        {
          elementName: "Overall",
          elementMeasurements: { Height: 1e308, Width: 1e-308 },
        },
      ],
    });

    expect(artwork.imageAspectRatio).toBe(1);
  });

  it.each([
    { label: "public domain", field: true, expected: true },
    { label: "not public domain", field: false, expected: false },
    { label: "unknown", field: undefined, expected: null },
  ])("preserves $label rights status", ({ field, expected }) => {
    const artwork = normalizeMetObject({
      objectID: 11,
      ...(field === undefined ? {} : { isPublicDomain: field }),
    });

    expect(artwork.isPublicDomain).toBe(expected);
  });

  it("preserves supplied rights and reproduction text", () => {
    const artwork = normalizeMetObject({
      objectID: 12,
      rightsAndReproduction: "© 2018 Estate of Pablo Picasso",
    });

    expect(artwork.rights).toBe("© 2018 Estate of Pablo Picasso");
  });
});
