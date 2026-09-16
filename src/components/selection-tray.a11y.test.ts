import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const traySource = readFileSync(join(here, "selection-tray.tsx"), "utf8");
const providerSource = readFileSync(
  join(here, "..", "lib", "selection.tsx"),
  "utf8",
);

/**
 * Announcements must come from exactly one region. The tray once carried
 * its own aria-live, so every selection-count change was announced twice
 * (devin 21:32 #7) — this pin holds the dedup in place.
 */
describe("selection announcements", () => {
  it("tray carries no live region of its own", () => {
    // Match the attribute form (the source's explanatory comment says
    // "No aria-live here" without an equals sign).
    expect(traySource).not.toMatch(/aria-live=/);
  });

  it("the provider owns exactly one announcement region", () => {
    const regions = providerSource.match(/aria-live="polite"/g) ?? [];
    expect(regions).toHaveLength(1);
  });
});

/**
 * needs-work 09-15 P3: imageless saves and 404ed URLs used to render as
 * empty tray slots reading as "loading". The tray must carry an honest
 * missing/broken state (TrayThumb), mirroring artwork-image.
 */
describe("selection tray thumb states", () => {
  it("tray thumbs handle missing and broken images explicitly", () => {
    expect(traySource).toContain("selection-tray__thumb-missing");
    expect(traySource).toContain("onError");
    // The empty-slot no-op must not return: a thumb renders either the
    // image or the placeholder, never null.
    expect(traySource).not.toMatch(/return null;\s*\}\)\(\)/);
  });
});
