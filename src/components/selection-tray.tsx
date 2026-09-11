import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { useSelection } from "@/lib/selection";

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
              className="selection-tray__thumb"
              style={{ aspectRatio: item.imageAspectRatio }}
            >
              {(() => {
                const thumb = item.primaryImageSmall ?? item.primaryImage;
                return thumb ? <img src={thumb} alt="" /> : null;
              })()}
            </span>
          ))}
        </div>
        <div className="selection-tray__actions">
          <Link to="/selection" className="text-link">
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
