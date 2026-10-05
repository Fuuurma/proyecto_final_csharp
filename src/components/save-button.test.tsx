// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Artwork } from "@/lib/met/normalize";
import { SelectionProvider, STORAGE_KEY } from "@/lib/selection";
import { SaveButton } from "./save-button";

const artwork = {
  id: 1,
  title: "Probe",
  displayTitle: "Probe",
  primaryImage: null,
  primaryImageSmall: null,
} as unknown as Artwork;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

/**
 * needs-work 09-26 P2 (grok 23:45 #2, audited 00:3x): the hydration
 * gate is LOAD-BEARING — pre-hydration `saved` is always false, so
 * removing the gate would invert intent for already-stored artworks
 * (a remove-click dispatches add). The honest repair keeps the gate
 * but makes it legible: aria-busy announces the non-interactive state.
 */
describe("save-button hydration state", () => {
  it("is interactive after hydration and announces no busy state", () => {
    render(
      <SelectionProvider>
        <SaveButton artwork={artwork} />
      </SelectionProvider>,
    );
    const button = screen.getByRole("button");
    // RTL flushes mount effects before assertions, so this observes the
    // hydrated state: interactive, not busy.
    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(button.getAttribute("aria-busy")).toBe("false");
  });

  it("wires disabled + aria-busy to the hydration flag (source pin)", () => {
    // RTL cannot observe the pre-hydration window (effects flush on
    // mount), so the pre-hydration wiring is pinned structurally: the
    // gate is load-bearing (ungated, a stored artwork's remove-click
    // dispatches add) and aria-busy makes it legible to AT.
    const src = readFileSync(join(__dirname, "save-button.tsx"), "utf8");
    expect(src).toContain("aria-busy={!isHydrated}");
    expect(src).toContain("disabled={!isHydrated}");
  });
});

/**
 * review 10-04 13:02 #1 (P2): the hydration pin never rendered the saved
 * state, so the is-saved → aria-pressed selector swap carried zero
 * assertions — a dead selector would still pass. Render a preloaded
 * selection and pin both halves of the hook: the DOM attribute and the
 * stylesheet selector keyed on it.
 */
describe("save-button saved state", () => {
  it("keeps the visible Save label in the unsaved accessible name", () => {
    render(
      <SelectionProvider>
        <SaveButton artwork={artwork} />
      </SelectionProvider>,
    );
    const button = screen.getByRole("button", {
      name: "Save Probe to your selection",
    });
    expect(button.textContent).toContain("Save");
    expect(button.getAttribute("aria-label")).toContain("Save");
  });

  it("marks a stored artwork as pressed, with no is-saved class", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        items: [
          {
            id: artwork.id,
            displayTitle: artwork.displayTitle,
            artist: null,
            date: null,
            primaryImage: null,
            primaryImageSmall: null,
            imageAspectRatio: 1,
          },
        ],
      }),
    );
    render(
      <SelectionProvider>
        <SaveButton artwork={artwork} />
      </SelectionProvider>,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe(
      "Saved — Remove Probe from your selection",
    );
    expect(button.textContent).toContain("Saved");
    expect(button.getAttribute("aria-label")).toContain("Saved");
    expect(button.className).toContain("save-button");
    expect(button.className).not.toContain("is-saved");
  });

  it("drives the saved style via the aria-pressed hook (source pin)", () => {
    const css = readFileSync(join(__dirname, "..", "styles.css"), "utf8");
    expect(css).toContain('.save-button[aria-pressed="true"]');
    expect(css).not.toContain("is-saved");
  });
});
