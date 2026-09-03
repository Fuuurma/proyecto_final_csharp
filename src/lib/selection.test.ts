import { describe, expect, it } from "vitest";
import type { Artwork } from "./met/normalize";
import {
  artworkFromSelectionItem,
  moveSelectionItem,
  selectionItemFromArtwork,
} from "./selection";

const artwork: Artwork = {
  id: 42,
  accessionNumber: "1",
  title: "A work",
  displayTitle: "A work",
  artist: "An artist",
  artistBio: null,
  date: "1900",
  culture: null,
  period: null,
  medium: null,
  dimensions: null,
  department: null,
  classification: null,
  primaryImage: null,
  primaryImageSmall: "https://example.com/work.jpg",
  additionalImages: [],
  imageAspectRatio: 1,
  isPublicDomain: true,
  rights: null,
  creditLine: null,
  canonicalUrl: "https://example.com/42",
  tags: [],
};

describe("selectionItemFromArtwork", () => {
  it("keeps only the local revisit data needed by the selection view", () => {
    expect(selectionItemFromArtwork(artwork)).toEqual({
      id: 42,
      displayTitle: "A work",
      artist: "An artist",
      date: "1900",
      primaryImageSmall: "https://example.com/work.jpg",
      imageAspectRatio: 1,
    });
  });
});

describe("artworkFromSelectionItem", () => {
  it("rebuilds a readable local record from the hanging snapshot", () => {
    const local = artworkFromSelectionItem(selectionItemFromArtwork(artwork));

    expect(local.id).toBe(42);
    expect(local.displayTitle).toBe("A work");
    expect(local.artist).toBe("An artist");
    expect(local.primaryImage).toBe("https://example.com/work.jpg");
    expect(local.canonicalUrl).toBe(
      "https://www.metmuseum.org/art/collection/search/42",
    );
    expect(local.department).toBeNull();
    expect(local.additionalImages).toEqual([]);
  });
});

describe("moveSelectionItem", () => {
  const first = selectionItemFromArtwork({
    ...artwork,
    id: 1,
    displayTitle: "First",
  });
  const second = selectionItemFromArtwork({
    ...artwork,
    id: 2,
    displayTitle: "Second",
  });
  const third = selectionItemFromArtwork({
    ...artwork,
    id: 3,
    displayTitle: "Third",
  });

  it("moves a saved work later in the hanging", () => {
    expect(
      moveSelectionItem([first, second, third], 1, 1).map((item) => item.id),
    ).toEqual([2, 1, 3]);
  });

  it("moves a saved work earlier in the hanging", () => {
    expect(
      moveSelectionItem([first, second, third], 3, -1).map((item) => item.id),
    ).toEqual([1, 3, 2]);
  });

  it("leaves the hanging unchanged at the edges", () => {
    expect(moveSelectionItem([first, second], 1, -1)).toEqual([first, second]);
    expect(moveSelectionItem([first, second], 2, 1)).toEqual([first, second]);
  });
});
