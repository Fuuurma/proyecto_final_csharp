import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { useSelection, type SelectionItem } from "@/lib/selection";

export function SelectionTray() {
  const { items, isHydrated } = useSelection();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [collapsed, setCollapsed] = useState(false);

  if (!isHydrated || items.length === 0 || pathname === "/selection") {
    return null;
  }

  return (
    <aside
      className={`selection-tray${collapsed ? " is-collapsed" : ""}`}
      // No aria-live here: SelectionProvider owns announcements, and a
      // second polite region double-announced every count change.
      aria-label="Your local selection"
    >
      <div className="selection-tray__inner">
        <div className="selection-tray__copy">
          <span className="eyebrow">Local selection</span>
          <strong>
            {items.length} {items.length === 1 ? "work" : "works"} saved
          </strong>
        </div>
        <div className="selection-tray__thumbs" aria-hidden="true">
          {items.slice(0, 4).map((item) => (
            <span
              key={item.id}
              className="selection-tray__thumb aspect-(--tray-ratio)"
              style={
                {
                  "--tray-ratio": item.imageAspectRatio,
                } as import("react").CSSProperties
              }
            >
              <TrayThumb item={item} />
            </span>
          ))}
        </div>
        <div className="selection-tray__actions">
          <Link to="/selection" className="link-action">
            Open selection <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            className="selection-tray__toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Expand selection tray" : "Collapse selection tray"
            }
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * One tray thumbnail with an honest missing/broken state (needs-work
 * 09-15 P3): an imageless save (legal state) or a 404ing URL used to
 * render as an empty slot that read as "loading". The placeholder
 * mirrors artwork-image's "No image in the public record" language.
 * The thumbs row is aria-hidden — the placeholder is visual only.
 */
function TrayThumb({ item }: { item: SelectionItem }) {
  const [failed, setFailed] = useState(false);
  const src = item.primaryImageSmall ?? item.primaryImage;
  if (!src || failed) {
    return (
      <span
        className="selection-tray__thumb-missing"
        title="No image available"
      >
        <span className="selection-tray__thumb-missing-mark" aria-hidden="true">
          ×
        </span>
      </span>
    );
  }
  return (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}
