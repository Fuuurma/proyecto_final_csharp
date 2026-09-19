// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { Artwork } from "./met/normalize";
import { SelectionProvider, STORAGE_KEY, useSelection } from "./selection";

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
  const { persistenceBlocked, toggle } = useSelection();
  return (
    <>
      <output data-testid="blocked">{persistenceBlocked ?? "none"}</output>
      <button type="button" onClick={() => toggle(artwork)}>
        toggle
      </button>
    </>
  );
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
      JSON.stringify({ version: 2, items: [] }),
    );
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("blocked")).toHaveTextContent(
        "unsupported-version",
      ),
    );
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
});
