// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// The card renders router Links; this test pins the meta line's
// title attributes, not navigation — a stub keeps the harness
// router-free.
vi.mock("@tanstack/react-router", () => ({
  Link: (props: { children: React.ReactNode }) => (
    // biome-ignore lint/a11y/useValidAnchor: test stub, never navigated
    <a href="#">{props.children}</a>
  ),
}));

import type { Artwork } from "@/lib/met/normalize";
import { SelectionProvider } from "@/lib/selection";
import { ArtworkCard } from "./artwork-card";

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
    primaryImage: "https://example.com/436535.jpg",
    primaryImageSmall: "https://example.com/436535-s.jpg",
    additionalImages: [],
    imageAspectRatio: 1.25,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: "https://metmuseum.org/art/collection/search/436535",
    tags: [],
    ...overrides,
  } as Artwork;
}

afterEach(() => {
  cleanup();
});

describe("ArtworkCard meta line", () => {
  it("the ellipsized department keeps its full value reachable", () => {
    // needs-work 09-24 P3: the department span is visually truncated
    // (ellipsis at 9px) — "Drawings and Prints" rendered as
    // "DRAWINGS AN…" with no way to recover the rest. The title
    // attribute carries the full value for sighted users.
    render(
      <SelectionProvider>
        <ArtworkCard
          artwork={makeArtwork({ department: "Drawings and Prints" })}
        />
      </SelectionProvider>,
    );
    const department = screen.getByText("Drawings and Prints");
    expect(department).toHaveAttribute("title", "Drawings and Prints");
  });

  it("the date span shares the recovery affordance", () => {
    render(
      <SelectionProvider>
        <ArtworkCard artwork={makeArtwork({ date: "ca. 1889–90" })} />
      </SelectionProvider>,
    );
    expect(screen.getByText("ca. 1889–90")).toHaveAttribute(
      "title",
      "ca. 1889–90",
    );
  });
});
