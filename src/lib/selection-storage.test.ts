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
    const items = readSelection();
    expect(items.map((item) => item.id)).toEqual([436535, 436524, 45434]);
    expect(items[0]).toEqual({
      ...legacyItem,
      primaryImage: "https://example.com/436535-small.jpg",
    });
  });

  it("falls back to the small image when a legacy item has no primaryImage", () => {
    store([legacyItem]);
    expect(readSelection()[0]?.primaryImage).toBe(
      "https://example.com/436535-small.jpg",
    );
  });

  it("drops a malformed item without losing the rest of the tray", () => {
    store([
      legacyItem,
      { id: "nope", displayTitle: 7 },
      { ...legacyItem, id: 45434 },
    ]);
    expect(readSelection().map((item) => item.id)).toEqual([436535, 45434]);
  });

  it("drops versioned items that fail the strict field check", () => {
    store({
      version: STORAGE_VERSION,
      items: [storedItem, { ...storedItem, imageAspectRatio: "wide" }],
    });
    expect(readSelection().map((item) => item.id)).toEqual([436535]);
  });

  it("returns an empty selection for a missing key or corrupt JSON", () => {
    expect(readSelection()).toEqual([]);
    window.localStorage.setItem(SELECTION_STORAGE_KEY, "{not json");
    expect(readSelection()).toEqual([]);
  });

  it("returns an empty selection for an unknown version or foreign shape", () => {
    store({ version: 99, items: [storedItem] });
    expect(readSelection()).toEqual([]);
    store({ items: [storedItem] });
    expect(readSelection()).toEqual([]);
    store("just a string");
    expect(readSelection()).toEqual([]);
  });
});
