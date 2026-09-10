// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";

import type { Artwork } from "@/lib/met/normalize";
import { ArtworkImage } from "./artwork-image";

function makeArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 436535,
    accessionNumber: null,
    title: "Wheat Field with Cypresses",
    displayTitle: "Wheat Field with Cypresses",
    artist: "Vincent van Gogh",
    artistBio: null,
    date: "1889",
    culture: null,
    period: null,
    medium: "Oil on canvas",
    dimensions: null,
    department: "European Paintings",
    classification: "Paintings",
    primaryImage: "https://example.com/large.jpg",
    primaryImageSmall: "https://example.com/small.jpg",
    additionalImages: [],
    imageAspectRatio: 1.25,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: "https://www.metmuseum.org/art/collection/search/436535",
    tags: [],
    ...overrides,
  };
}

/**
 * First component test (devin 09-09 22:57 / 09-10 00:19: the
 * component-test dependency decision — jsdom + Testing Library now
 * installed). Pins the source-resolution contract of ArtworkImage:
 * small prefers primaryImageSmall, large prefers primaryImage, and a
 * record with no images renders the honest missing panel.
 */
describe("ArtworkImage", () => {
  afterEach(cleanup);

  it("renders the small source by default", () => {
    render(
      <ArtworkImage
        artwork={makeArtwork({
          primaryImage: "https://example.com/large.jpg",
          primaryImageSmall: "https://example.com/small.jpg",
        })}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/small.jpg");
    expect(img).toHaveAttribute(
      "alt",
      "Wheat Field with Cypresses, Vincent van Gogh",
    );
  });

  it("prefers the large source at large size", () => {
    render(
      <ArtworkImage
        artwork={makeArtwork({
          primaryImage: "https://example.com/large.jpg",
          primaryImageSmall: "https://example.com/small.jpg",
        })}
        size="large"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/large.jpg",
    );
  });

  it("renders the honest missing panel when the record has no images", () => {
    render(
      <ArtworkImage
        artwork={makeArtwork({
          primaryImage: null,
          primaryImageSmall: null,
        })}
      />,
    );
    expect(screen.getByText("No image in the public record")).toBeVisible();
    expect(screen.getByText("Object 436535")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("alt text omits the artist when none is recorded", () => {
    render(
      <ArtworkImage artwork={makeArtwork({ artist: null })} size="large" />,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).not.toContain("null");
    expect(img.getAttribute("alt")).toContain("Wheat Field with Cypresses");
  });
});
