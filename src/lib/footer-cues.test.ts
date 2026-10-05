import { describe, expect, it } from "vitest";
import { footerCues } from "./footer-cues";

describe("footerCues", () => {
  it("Explore advertises only the search focus cue", () => {
    expect(footerCues("/explore")).toEqual([
      { keys: ["/"], label: "Focus Explore search" },
    ]);
  });

  it("object records advertise only the flip cue", () => {
    // Esc closes the inspect dialog only while it is open; the cue was
    // dead chrome in the default closed state (needs-work 09-27).
    expect(footerCues("/art/436535")).toEqual([
      { keys: ["←", "→"], label: "Flip object records" },
    ]);
  });

  it("routes with no bound shortcuts advertise none", () => {
    expect(footerCues("/")).toEqual([]);
    expect(footerCues("/departments")).toEqual([]);
    expect(footerCues("/selection")).toEqual([]);
    expect(footerCues("/about")).toEqual([]);
  });

  it("does not match prefixes or nested object paths", () => {
    expect(footerCues("/explorer")).toEqual([]);
    expect(footerCues("/art/436535/notes")).toEqual([]);
  });
});
