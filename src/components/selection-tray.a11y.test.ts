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

// needs-work/grok 09-26 23:45 #1: the collapsed rule only shrank
// font-size — the thumbs stayed rendered, so the tray never actually
// shrank and the 3.5rem body clearance (8da551b) covered footer
// content. Collapsed must hide the thumbs while the count stays
// visible (grok 09-11 12:45 #5).
const stylesSource = readFileSync(
  join(here, "..", "styles.css"),
  "utf8",
);

describe("selection-tray collapsed contract", () => {
  it("hides the thumbs when collapsed and keeps the count visible", () => {
    const thumbsRule = stylesSource.match(
      /\.selection-tray\.is-collapsed \.selection-tray__thumbs \{[^}]*\}/,
    );
    expect(thumbsRule, "dedicated thumbs rule").not.toBeNull();
    expect(thumbsRule?.[0]).toContain("display: none");

    // the count strong keeps its shrink in its own rule
    const strongRule = stylesSource.match(
      /\.selection-tray\.is-collapsed \.selection-tray__copy strong \{[^}]*\}/,
    );
    expect(strongRule, "dedicated strong rule").not.toBeNull();
    expect(strongRule?.[0]).toContain("font-size: 0.8rem");
    expect(strongRule?.[0]).not.toContain("display");
  });
});
