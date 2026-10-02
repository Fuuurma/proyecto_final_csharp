// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Artwork } from "@/lib/met/normalize";
import { SelectionProvider } from "@/lib/selection";
import { SaveButton } from "./save-button";

const artwork = {
  id: 1,
  title: "Probe",
  primaryImage: null,
  primaryImageSmall: null,
} as unknown as Artwork;

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
