import { describe, expect, it } from "vitest";
import type { Artwork } from "./met/normalize";
import {
  artworkFromSelectionItem,
  emptySelectionState,
  moveSelectionItem,
  selectionItemFromArtwork,
  selectionReducer,
  type SelectionState,
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

describe("selectionReducer", () => {
  const makeArtwork = (id: number, displayTitle: string): Artwork => ({
    ...artwork,
    id,
    title: displayTitle,
    displayTitle,
  });
  const toggle = (
    state: SelectionState,
    id: number,
    title: string,
  ): SelectionState =>
    selectionReducer(state, { type: "toggle", artwork: makeArtwork(id, title) });
  const empty: SelectionState = emptySelectionState;

  it("announces the truth on a rapid double-toggle: saved, then removed", () => {
    // The stale-closure bug this pins: two toggles in one tick used to
    // BOTH announce "Saved" and leave the item stuck in the selection.
    const saved = toggle(empty, 1, "Wheat Field");
    expect(saved.items.map((i) => i.id)).toEqual([1]);
    expect(saved.announcement).toBe("Saved Wheat Field to your selection");

    const removed = toggle(saved, 1, "Wheat Field");
    expect(removed.items).toEqual([]);
    expect(removed.announcement).toBe(
      "Removed Wheat Field from your selection",
    );
  });

  it("prepends new saves and keeps items + announcement atomic", () => {
    let state = toggle(empty, 2, "Bridge");
    state = toggle(state, 1, "Wheat Field");
    expect(state.items.map((i) => i.id)).toEqual([1, 2]);
    expect(state.announcement).toBe("Saved Wheat Field to your selection");
  });

  it("remove announces only when something was actually removed", () => {
    const state = toggle(empty, 1, "Wheat Field");
    const removed = selectionReducer(state, { type: "remove", objectId: 1 });
    expect(removed.items).toEqual([]);
    expect(removed.announcement).toBe(
      "Removed Wheat Field from your selection",
    );

    const untouched = selectionReducer(removed, { type: "remove", objectId: 1 });
    expect(untouched.announcement).toBe(removed.announcement);
  });

  it("hydrate fills only an empty selection", () => {
    const stored = [selectionItemFromArtwork(makeArtwork(9, "Stored"))];
    const hydrated = selectionReducer(empty, {
      type: "hydrate",
      items: stored,
    });
    expect(hydrated.items.map((i) => i.id)).toEqual([9]);

    const live = toggle(empty, 1, "Live");
    const kept = selectionReducer(live, { type: "hydrate", items: stored });
    expect(kept.items.map((i) => i.id)).toEqual([1]);
  });
});
