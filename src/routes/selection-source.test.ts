import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(join(here, "selection.tsx"), "utf8");

/**
 * One object, one source. The selection rows once pulled image and
 * aria-label from the live curated catalog while the sighted heading and
 * artist rendered the stored item — after a catalog update or a
 * hand-edited snapshot the link announced (and showed) something other
 * than the title on screen (needs-work 09-16). The stored item is the
 * per-row truth; the offline artwork path in routes/art/$objectId.tsx
 * already worked this way.
 */
describe("selection row single-source contract", () => {
  it("rows never consult the curated catalog", () => {
    expect(routeSource).not.toContain("curatedArtworks");
  });

  it("the row link announces the stored title, not a catalog lookup", () => {
    const link = routeSource.slice(
      routeSource.indexOf('className="selection-row__image"'),
    );
    const label = link.slice(
      link.indexOf("aria-label"),
      link.indexOf(">", link.indexOf("aria-label")),
    );
    expect(label).toContain("item.displayTitle");
    expect(label).not.toContain("artwork?");
  });
});
