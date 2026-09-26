// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveButton } from "./save-button";
import type { Artwork } from "@/lib/met/normalize";

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
  it("is disabled AND announces busy before hydration", () => {
    render(<SaveButton artwork={artwork} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
