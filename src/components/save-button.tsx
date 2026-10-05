import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Artwork } from "@/lib/met/normalize";
import { useSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";
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
    // The gate is load-bearing but lives in the handler, not `disabled`:
    // pre-hydration `saved` is always false, so an unguarded toggle would
    // invert a stored artwork's remove-click into an add. The button stays
    // enabled (a greyed-out primary CTA that swallows clicks has no
    // feedback) and aria-busy announces the not-yet-real state
    // (grok 23:45 #2 audited 00:3x; grok 10-05 #10).
    if (!isHydrated) return;
    toggle(artwork);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "lg"}
      className={cn("save-button", compact && "save-button--compact")}
      aria-pressed={saved}
      aria-busy={!isHydrated}
      aria-label={
        saved
          ? `Saved — Remove ${artwork.displayTitle} from your selection`
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
