import { SEARCH_PAGE_SIZE } from "./search-query";

export type CollectionSearchStatus = "empty" | "partial" | "success";

/**
 * The single definition of a live search's outcome.
 *
 * - "empty": the index genuinely had nothing (no IDs at all), or a fully
 *   fetched window contained zero open-access rows — honest for that
 *   window on the /objects branch, where nothing was pre-filtered.
 * - "partial": the source promised rows it did not deliver — a hydration
 *   failure on either branch, or sieve drops on the pre-filtered /search
 *   branch (whose params make drops an outage rather than a sieve).
 *   Sieve drops on /objects are the designed filter, never partial
 *   (devin 09-09 14:17 #1/#5, 16:57 #7).
 */
export function computeSearchStatus(input: {
  totalIds: number;
  hydratedCount: number;
  pageIdCount: number;
  usableCount: number;
  preFiltered: boolean;
}): CollectionSearchStatus {
  if (input.totalIds === 0) return "empty";
  if (
    input.hydratedCount < input.pageIdCount ||
    (input.preFiltered &&
      input.usableCount < Math.min(SEARCH_PAGE_SIZE, input.pageIdCount))
  ) {
    return "partial";
  }
  if (input.usableCount === 0) return "empty";
  return "success";
}
