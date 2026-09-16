import { describe, expect, it, vi } from "vitest";
import type { Artwork } from "./met/normalize";
import {
  artworkFromSelectionItem,
  emptySelectionState,
  moveSelectionItem,
  parseStoredSelection,
  persistSelection,
  readSelection,
  type SelectionState,
  STORAGE_KEY,
  selectionItemFromArtwork,
  selectionReducer,
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
  primaryImage: "https://example.com/work-large.jpg",
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
      primaryImage: "https://example.com/work-large.jpg",
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
    expect(local.primaryImage).toBe("https://example.com/work-large.jpg");
    expect(local.canonicalUrl).toBe(
      "https://www.metmuseum.org/art/collection/search/42",
    );
    expect(local.department).toBeNull();
    expect(local.additionalImages).toEqual([]);
  });
});

describe("artworkFromSelectionItem legacy fallback", () => {
  it("falls back to the small asset for selections stored before primaryImage existed", () => {
    const legacy = selectionItemFromArtwork(artwork);
    delete (legacy as { primaryImage?: string }).primaryImage;
    const local = artworkFromSelectionItem(legacy);
    expect(local.primaryImage).toBe("https://example.com/work.jpg");
  });
});

describe("parseStoredSelection", () => {
  const item = selectionItemFromArtwork(artwork);

  it("migrates a legacy v0 bare array deterministically", () => {
    const legacy = { ...item } as Partial<typeof item>;
    delete legacy.primaryImage;
    expect(parseStoredSelection(JSON.stringify([legacy]))).toEqual({
      status: "ok",
      items: [{ ...legacy, primaryImage: legacy.primaryImageSmall }],
    });
  });

  it("reads the versioned envelope written by the current build", () => {
    const stored = JSON.stringify({ version: 1, items: [item] });
    expect(parseStoredSelection(stored)).toEqual({
      status: "ok",
      items: [item],
    });
  });

  it("drops only the off-shape item, keeping valid siblings", () => {
    const missingField = { ...item } as Partial<typeof item>;
    delete missingField.displayTitle;
    const wrongType = { ...item, artist: 42 };
    const stored = JSON.stringify({
      version: 1,
      items: [item, missingField, wrongType, null, "junk"],
    });
    expect(parseStoredSelection(stored)).toEqual({
      status: "ok",
      items: [item],
    });
  });

  it("returns an empty selection for non-JSON or non-payload shapes", () => {
    expect(parseStoredSelection(null)).toEqual({ status: "ok", items: [] });
    expect(parseStoredSelection("{not json")).toEqual({
      status: "ok",
      items: [],
    });
    expect(parseStoredSelection(JSON.stringify({ items: "no" }))).toEqual({
      status: "ok",
      items: [],
    });
    expect(parseStoredSelection(JSON.stringify(42))).toEqual({
      status: "ok",
      items: [],
    });
  });

  it("flags a stored version with no migration as unsupported", () => {
    const future = JSON.stringify({ version: 2, items: [item] });
    expect(parseStoredSelection(future)).toEqual({
      status: "unsupported-version",
      version: 2,
    });
  });

  it("dedupes repeated ids, keeping the first stored copy", () => {
    const duplicate = { ...item, displayTitle: "Duplicate copy" };
    const stored = JSON.stringify({ version: 1, items: [item, duplicate] });
    expect(parseStoredSelection(stored)).toEqual({
      status: "ok",
      items: [item],
    });
  });

  it("recovers an absent or non-positive imageAspectRatio to the rebuild fallback", () => {
    // migrateStoredItem must agree with artworkFromSelectionItem, which
    // defaults a bad ratio to 1 — dropping the whole item would lose a
    // saved work over one corrupt field (review 09-14 P3).
    const absent = { ...item, id: 43 } as Partial<typeof item>;
    delete absent.imageAspectRatio;
    const zero = { ...item, id: 44, imageAspectRatio: 0 };
    const negative = { ...item, id: 45, imageAspectRatio: -2 };
    const stored = JSON.stringify({
      version: 1,
      items: [absent, zero, negative],
    });
    expect(parseStoredSelection(stored)).toEqual({
      status: "ok",
      items: [
        { ...item, id: 43, imageAspectRatio: 1 },
        { ...item, id: 44, imageAspectRatio: 1 },
        { ...item, id: 45, imageAspectRatio: 1 },
      ],
    });
  });
});

describe("selection storage read/write", () => {
  const item = selectionItemFromArtwork(artwork);
  const second = selectionItemFromArtwork({
    ...artwork,
    id: 7,
    displayTitle: "Second work",
  });

  function createStorageStub(initial?: string) {
    const map = new Map<string, string>();
    if (initial !== undefined) map.set(STORAGE_KEY, initial);
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      stored: () => map.get(STORAGE_KEY) ?? null,
    };
  }

  it("persists the {version, items} envelope under the selection key", () => {
    const storage = createStorageStub();
    persistSelection(storage, [item]);
    expect(JSON.parse(storage.stored() ?? "null")).toEqual({
      version: 1,
      items: [item],
    });
  });

  it("first-time visitor with an empty selection creates no storage key", () => {
    // needs-work 09-15 06:16 P3: persisting the empty hydrate result
    // stamped {"items":[]} under the key for every visitor, erasing
    // the no-key vs empty-selection distinction.
    const storage = createStorageStub();
    persistSelection(storage, []);
    expect(storage.stored()).toBeNull();
  });

  it("clearing the last item still persists the empty selection", () => {
    // Pre-existing keys keep updating — removals must persist.
    const storage = createStorageStub(
      JSON.stringify({ version: 1, items: [{ id: 1 }] }),
    );
    persistSelection(storage, []);
    expect(storage.stored()).not.toBeNull();
  });

  it("hydrate-then-write upgrades a v0 bare array to the v1 envelope", () => {
    const legacy = { ...item } as Partial<typeof item>;
    delete legacy.primaryImage;
    const storage = createStorageStub(JSON.stringify([legacy]));

    persistSelection(storage, readSelection(storage));

    expect(JSON.parse(storage.stored() ?? "null")).toEqual({
      version: 1,
      items: [{ ...legacy, primaryImage: legacy.primaryImageSmall }],
    });
  });

  it("normalizes bogus aspect ratios to square on write", () => {
    // The tray sizes thumbs with aspect-(--tray-ratio): a legacy save
    // without the field (or with NaN/0/negative junk from hand-edited
    // storage) must normalize to 1, or the custom property vanishes and
    // the layout breaks (selectionAspectRatio fallback, unpinned until
    // now).
    // imageAspectRatio: undefined is a legal v0 state handled upstream
    // by the hydrate merge - the write-path guard covers the junk cases.
    const bogus = [
      { ...item, imageAspectRatio: Number.NaN },
      { ...second, imageAspectRatio: -2 },
      { ...item, id: 43, imageAspectRatio: 0 },
      { ...second, id: 44, imageAspectRatio: 2.5 },
    ];
    // The last entry proves valid ratios pass through untouched.
    const storage = createStorageStub();
    persistSelection(storage, bogus);
    const round = readSelection(storage);
    for (const normalized of round) {
      const expected = normalized.id === 44 ? 2.5 : 1;
      expect(normalized.imageAspectRatio, String(normalized.id)).toBe(expected);
    }
  });

  it("round-trips a save through storage and back", () => {
    const storage = createStorageStub();
    persistSelection(storage, [item, second]);
    expect(readSelection(storage)).toEqual([item, second]);
  });

  it("never clobbers an envelope written by a newer build", () => {
    const foreign = JSON.stringify({ version: 2, items: [item] });
    const storage = createStorageStub(foreign);

    expect(readSelection(storage)).toEqual([]);
    persistSelection(storage, [item]);

    expect(storage.stored()).toBe(foreign);
  });

  it("warns instead of silently no-oping when a newer build owns the payload", () => {
    const foreign = JSON.stringify({ version: 2, items: [item] });
    const storage = createStorageStub(foreign);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    persistSelection(storage, [item]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("version 2"));
    expect(storage.stored()).toBe(foreign);
    warn.mockRestore();
  });

  it("re-stamps over a corrupt payload, which holds nothing recoverable", () => {
    const storage = createStorageStub("{not json");
    persistSelection(storage, [item]);
    expect(JSON.parse(storage.stored() ?? "null")).toEqual({
      version: 1,
      items: [item],
    });
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
    selectionReducer(state, {
      type: "toggle",
      artwork: makeArtwork(id, title),
    });
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

    const untouched = selectionReducer(removed, {
      type: "remove",
      objectId: 1,
    });
    expect(untouched.announcement).toBe(removed.announcement);
  });

  it("hydrate fills only an empty selection", () => {
    const stored = [selectionItemFromArtwork(makeArtwork(9, "Stored"))];
    const hydrated = selectionReducer(empty, {
      type: "hydrate",
      items: stored,
    });
    expect(hydrated.items.map((i) => i.id)).toEqual([9]);
  });

  it("hydrate merges the stored payload with pre-hydration edits", () => {
    // needs-work 09-15 00:01 P3: a toggle landing before the mount
    // hydration effect used to make the hydrate a no-op, permanently
    // discarding the stored selection. Merge instead — nothing is
    // lost; stored uniques keep their order behind the live edits.
    const stored = [selectionItemFromArtwork(makeArtwork(9, "Stored"))];
    const live = toggle(empty, 1, "Live");
    const merged = selectionReducer(live, { type: "hydrate", items: stored });
    expect(merged.items.map((i) => i.id)).toEqual([1, 9]);
  });

  it("move announces the reordering to screen readers", () => {
    // toggle prepends: the hanging is [2 Starry Night, 1 Wheat Field].
    // Moving 1 earlier is a real reorder (index 1 → 0).
    const state = toggle(toggle(empty, 1, "Wheat Field"), 2, "Starry Night");
    const moved = selectionReducer(state, {
      type: "move",
      objectId: 1,
      direction: -1,
    });
    expect(moved.items.map((i) => i.id)).toEqual([1, 2]);
    expect(moved.announcement).toBe("Moved Wheat Field earlier");
  });

  it("move preserves the previous announcement when the item is not found", () => {
    const state = toggle(empty, 1, "Wheat Field");
    const moved = selectionReducer(state, {
      type: "move",
      objectId: 99,
      direction: 1,
    });
    expect(moved.announcement).toBe(state.announcement);
  });

  it("move at either edge is a no-op and keeps the previous announcement", () => {
    // The first item cannot move earlier and the last cannot move later —
    // announcing the move anyway lied about the outcome (devin 09-09
    // 16:57 #3). Hanging is [2 Starry Night, 1 Wheat Field] (prepend).
    const state = toggle(toggle(empty, 1, "Wheat Field"), 2, "Starry Night");
    const atStart = selectionReducer(state, {
      type: "move",
      objectId: 2,
      direction: -1,
    });
    expect(atStart.items.map((i) => i.id)).toEqual([2, 1]);
    expect(atStart.announcement).toBe(state.announcement);

    const atEnd = selectionReducer(state, {
      type: "move",
      objectId: 1,
      direction: 1,
    });
    expect(atEnd.items.map((i) => i.id)).toEqual([2, 1]);
    expect(atEnd.announcement).toBe(state.announcement);
  });
});
