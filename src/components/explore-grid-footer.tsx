import { Button } from "@/components/ui/button";
import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "@/lib/met/search-query";

export type ExploreGridFooterProps = {
  canLoadMore: boolean;
  isFilling: boolean;
  countIsExact: boolean;
  nextCount: number;
  onLoadMore: () => void;
  fillFailed: boolean;
  fillExhausted: boolean;
  atCap: boolean;
};

/**
 * Everything below the Explore grid: the load-more offer plus the three
 * honest endings (a failed tail-fill, an exhausted usable stream, and
 * the record cap). Extracted so the honesty contract is render-tested —
 * source-string greps passed even when the decisions were never wired
 * to the button or notes (review 09-19 P2).
 */
export function ExploreGridFooter({
  canLoadMore,
  isFilling,
  countIsExact,
  nextCount,
  onLoadMore,
  fillFailed,
  fillExhausted,
  atCap,
}: ExploreGridFooterProps) {
  return (
    <>
      {canLoadMore ? (
        <div className="explore-more">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="load-more"
            aria-busy={isFilling}
            disabled={isFilling}
            onClick={onLoadMore}
          >
            {isFilling
              ? "Loading more…"
              : countIsExact
                ? `Load ${nextCount} more`
                : "Load more"}
          </Button>
        </div>
      ) : null}
      {fillFailed ? (
        <p className="explore-fill-failed" role="status">
          {atCap
            ? "Some pages failed to load within the record cap — the grid shows what arrived."
            : "Some pages failed to load — the grid shows what arrived. Load more to try again."}
        </p>
      ) : null}
      {fillExhausted ? (
        <p className="explore-fill-failed" role="status">
          No further open-access works surfaced in the loaded records — refine
          the search to look further.
        </p>
      ) : null}
      {atCap ? (
        <p className="explore-cap">
          This view stops at {SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE} records.
          Narrow the search to look further.
        </p>
      ) : null}
    </>
  );
}
