import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Artwork } from "@/lib/met/normalize";
import { useSelection } from "@/lib/selection";
import { BookmarkIcon } from "./icons";

type SaveButtonProps = {
  artwork: Artwork;
  compact?: boolean;
};

export function SaveButton({ artwork, compact = false }: SaveButtonProps) {
  const { has, toggle, isHydrated } = useSelection();
  const saved = has(artwork.id);

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    toggle(artwork);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "lg"}
      className={`save-button ${compact ? "save-button--compact" : ""} ${saved ? "is-saved" : ""}`.trim()}
      aria-pressed={saved}
      // The gate is load-bearing: pre-hydration `saved` is always
      // false, so dropping it would invert a stored artwork's
      // remove-click into an add. aria-busy makes the non-interactive
      // state legible instead (grok 23:45 #2, audited 00:3x).
      aria-busy={!isHydrated}
      disabled={!isHydrated}
      aria-label={
        saved
          ? `Remove ${artwork.displayTitle} from your selection`
          : `Save ${artwork.displayTitle} to your selection`
      }
      onClick={onClick}
    >
      <span data-icon="inline-start">
        <BookmarkIcon filled={saved} />
      </span>
      <span>{saved ? "Saved" : "Save"}</span>
    </Button>
  );
}
