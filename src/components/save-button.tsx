import type { MouseEvent } from "react";
import { Button } from "#/components/ui/button";
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
