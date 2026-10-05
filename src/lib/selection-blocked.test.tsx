// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { Artwork } from "./met/normalize";
import {
  persistSelection,
  SelectionProvider,
  STORAGE_KEY,
  selectionItemFromArtwork,
  useSelection,
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

function Probe() {
  const { announcement, items, persistenceBlocked, toggle, clear } =
    useSelection();
  return (
    <>
      <output data-testid="blocked">{persistenceBlocked ?? "none"}</output>
      <output data-testid="items">
        {items.map((item) => item.id).join(",")}
      </output>
      <output data-testid="announcement">{announcement}</output>
      <button type="button" onClick={() => toggle(artwork)}>
        toggle
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </>
  );
}

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    stored: () => values.get(STORAGE_KEY) ?? null,
  };
}

function renderProvider() {
  return render(
    <SelectionProvider>
      <Probe />
    </SelectionProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

/**
 * The tray disclosure contract (review 09-19 P1 + 18:17 P2): every
 * silent-save class — foreign envelope, refused store, quota — must
 * surface as a named reason, never coerce back to unblocked.
 */
describe("persistenceBlocked disclosure", () => {
  it("stays clear while writes land normally", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
  });

  it("flags unsupported-version when a foreign envelope owns the key", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 3, items: [] }),
    );
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent(
        "unsupported-version",
      ),
    );
  });

  it("does not overwrite a newer envelope arriving during the session", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
    const foreign = JSON.stringify({ version: 3, items: [] });
    window.localStorage.setItem(STORAGE_KEY, foreign);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: foreign,
          oldValue: null,
          storageArea: window.localStorage,
          url: window.location.href,
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent(
        "unsupported-version",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent(
        "unsupported-version",
      ),
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(foreign);
  });

  it("ignores a delayed future-version event after storage has advanced", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
    const current = JSON.stringify({
      version: 2,
      clearRevision: null,
      records: {},
    });
    const staleFuture = JSON.stringify({ version: 3, items: [] });
    window.localStorage.setItem(STORAGE_KEY, current);

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          oldValue: current,
          newValue: staleFuture,
          storageArea: window.localStorage,
          url: window.location.href,
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(current);
  });

  it("flags unavailable when the store refuses reads", async () => {
    // A throwing getItem lands the same "saves are not landing" class
    // as a refused write — it must surface, not hydrate silently
    // (review 09-19 18:17 P2).
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("unavailable"),
    );
  });

  it("flags unavailable when the storage accessor itself is blocked", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("unavailable"),
    );
  });

  it("flags unavailable once a save hits a refused write", async () => {
    // Reads work, writes throw (quota / private mode): nothing is lost
    // until the first save, so the flag must fire on that save — the
    // previous code mapped this back to unblocked (review 09-19
    // 18:17 P2).
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("none"),
    );
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent("unavailable"),
    );
  });

  it("applies another tab's merged document without echo writes", async () => {
    const saved = selectionItemFromArtwork(artwork);
    const another = selectionItemFromArtwork({
      ...artwork,
      id: 43,
      displayTitle: "Another work",
    });
    const oldValue = JSON.stringify({ version: 1, items: [saved] });
    window.localStorage.setItem(STORAGE_KEY, oldValue);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("42"),
    );

    const remote = memoryStorage(oldValue);
    persistSelection(remote, [saved, another]);
    const newValue = remote.stored();
    expect(newValue).not.toBeNull();
    window.localStorage.setItem(STORAGE_KEY, newValue ?? "");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const event = new StorageEvent("storage", {
      key: STORAGE_KEY,
      oldValue,
      newValue,
      storageArea: window.localStorage,
      url: window.location.href,
    });

    act(() => window.dispatchEvent(event));
    await waitFor(() => {
      expect(screen.getByTestId("items")).toHaveTextContent("42,43");
      expect(screen.getByTestId("announcement")).toHaveTextContent(
        "Selection updated from another tab",
      );
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("ignores a delayed stale event when storage already has newer edits", async () => {
    const saved = selectionItemFromArtwork(artwork);
    const another = selectionItemFromArtwork({
      ...artwork,
      id: 43,
      displayTitle: "Another work",
    });
    const oldValue = JSON.stringify({ version: 1, items: [saved] });
    window.localStorage.setItem(STORAGE_KEY, oldValue);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("42"),
    );

    const current = memoryStorage(oldValue);
    persistSelection(current, [saved, another]);
    const currentValue = current.stored();
    const stale = memoryStorage(oldValue);
    persistSelection(stale, [saved]);
    const staleValue = stale.stored();
    window.localStorage.setItem(STORAGE_KEY, currentValue ?? "");
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          oldValue: currentValue,
          newValue: staleValue,
          storageArea: window.localStorage,
          url: window.location.href,
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("42,43"),
    );
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(currentValue);
  });

  it("treats another tab removing the storage key as a clear", async () => {
    const saved = selectionItemFromArtwork(artwork);
    const oldValue = JSON.stringify({ version: 1, items: [saved] });
    window.localStorage.setItem(STORAGE_KEY, oldValue);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("items")).toHaveTextContent("42"),
    );

    window.localStorage.removeItem(STORAGE_KEY);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          oldValue,
          newValue: null,
          storageArea: window.localStorage,
          url: window.location.href,
        }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("items")).toBeEmptyDOMElement(),
    );
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null").version,
    ).toBe(2);
  });
});
