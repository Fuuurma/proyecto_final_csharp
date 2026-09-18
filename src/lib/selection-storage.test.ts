// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  readSelection,
  SELECTION_STORAGE_KEY,
  STORAGE_VERSION,
  writeSelection,
} from "./selection";

const legacyItem = {
  id: 436535,
  displayTitle: "Wheat Field with Cypresses",
  artist: "Vincent van Gogh",
  date: "1889",
  primaryImageSmall: "https://example.com/436535-small.jpg",
  imageAspectRatio: 1.27,
};

const storedItem = {
  ...legacyItem,
  primaryImage: "https://example.com/436535-large.jpg",
};

function store(value: unknown): void {
  window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(value));
}

afterEach(() => {
  window.localStorage.clear();
});

describe("selection storage", () => {
  it("writes a versioned envelope that hydrates back", () => {
    writeSelection([storedItem]);
    expect(window.localStorage.getItem(SELECTION_STORAGE_KEY)).toBe(
      JSON.stringify({ version: STORAGE_VERSION, items: [storedItem] }),
    );
    expect(readSelection()).toEqual([storedItem]);
  });

  it("migrates a legacy unversioned array and keeps its order", () => {
    store([
      legacyItem,
      { ...legacyItem, id: 436524, displayTitle: "Sunflowers" },
      { ...legacyItem, id: 45434, displayTitle: "The Great Wave" },
    ]);
    const items = readSelection() ?? [];
    expect(items.map((item) => item.id)).toEqual([436535, 436524, 45434]);
    expect(items[0]).toEqual({
      ...legacyItem,
      primaryImage: "https://example.com/436535-small.jpg",
    });
  });

  it("falls back to the small image when a legacy item has no primaryImage", () => {
    store([legacyItem]);
    expect((readSelection() ?? [])[0]?.primaryImage).toBe(
      "https://example.com/436535-small.jpg",
    );
  });

  it("drops a malformed item without losing the rest of the tray", () => {
    store([
      legacyItem,
      { id: "nope", displayTitle: 7 },
      { ...legacyItem, id: 45434 },
    ]);
    expect((readSelection() ?? []).map((item) => item.id)).toEqual([
      436535, 45434,
    ]);
  });

  it("drops versioned items that fail the strict field check", () => {
    store({
      version: STORAGE_VERSION,
      items: [storedItem, { ...storedItem, imageAspectRatio: "wide" }],
    });
    expect((readSelection() ?? []).map((item) => item.id)).toEqual([436535]);
  });

  it("returns an empty selection for a missing key or corrupt JSON", () => {
    expect(readSelection()).toEqual([]);
    window.localStorage.setItem(SELECTION_STORAGE_KEY, "{not json");
    expect(readSelection()).toEqual([]);
  });

  it("returns an empty selection for a foreign shape", () => {
    store({ items: [storedItem] });
    expect(readSelection()).toEqual([]);
    store("just a string");
    expect(readSelection()).toEqual([]);
  });

  it("returns null — not [] — for a well-formed envelope of another version", () => {
    // Review 09-18 P2: [] made the provider write back an empty v1
    // envelope and destroy a newer build's stored tray on first hydrate.
    // Null means "foreign — don't touch"; persistence degrades instead.
    store({ version: 99, items: [storedItem] });
    const raw = window.localStorage.getItem(SELECTION_STORAGE_KEY);
    expect(readSelection()).toBeNull();
    expect(window.localStorage.getItem(SELECTION_STORAGE_KEY)).toBe(raw);
  });

  it("drops versioned items whose displayTitle is null", () => {
    // Review 09-18 P1: the versioned guard admitted null titles while
    // SelectionItem.displayTitle (and Artwork's) is a string.
    store({
      version: STORAGE_VERSION,
      items: [storedItem, { ...storedItem, id: 45434, displayTitle: null }],
    });
    expect((readSelection() ?? []).map((item) => item.id)).toEqual([436535]);
  });

  it("drops versioned items with a zero or negative aspect ratio", () => {
    // Review 09-18 P3: finite-only admitted 0/negative while the legacy
    // migration requires > 0 (falls back to 1) — a 0-ratio card collapses.
    store({
      version: STORAGE_VERSION,
      items: [
        storedItem,
        { ...storedItem, id: 45434, imageAspectRatio: 0 },
        { ...storedItem, id: 45920, imageAspectRatio: -1.5 },
      ],
    });
    expect((readSelection() ?? []).map((item) => item.id)).toEqual([436535]);
  });
});
