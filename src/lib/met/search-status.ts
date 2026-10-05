import { MetApiError, type MetApiErrorKind } from "./client.server";
import { SEARCH_PAGE_SIZE } from "./search-query";

export type CollectionSearchStatus = "empty" | "partial" | "success";

/**
 * The upstream-failure taxonomy a loader can hand to the UI:
 * "timeout"/"5xx" mean the Met is down or unreachable (transient),
 * "rate-limit" means the Met asked us to slow down, "4xx" means another
 * request rejection, and "parse" means the upstream returned unreadable data.
 * These failure states are distinct from the
 * "empty" outcome above — an honest zero-result index — so the UI can
 * tell "Met down" apart from "no results".
 */
export type SearchFailureKind = MetApiErrorKind;

export function searchFailureKind(
  error: unknown,
): SearchFailureKind | undefined {
  return error instanceof MetApiError ? error.kind : undefined;
}

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
  reportedTotal: number;
  hydratedCount: number;
  pageIdCount: number;
  usableCount: number;
  preFiltered: boolean;
}): CollectionSearchStatus {
  // "empty" asserts the index itself holds nothing — only the index's
  // own zero can say that. A null-ID listing (objectIDs: null collapses
  // to []) or a window past the delivered list leaves reportedTotal > 0
  // with nothing hydrated: the source promised rows it did not deliver,
  // which is partial — "empty" here would render "No matching works"
  // beside "470000 in the index" (needs-work 10-02 P1 + 10-02 P3).
  if (input.reportedTotal === 0 && input.totalIds === 0) return "empty";
  if (input.pageIdCount === 0) return "partial";
  // Zero usable after FULL hydration is the honest empty (the server's
  // early branch owns that cell). This clause must agree with it: the
  // preFiltered-partial gate is for hydration shortfalls and PARTIAL
  // sieve drops, not for a fully-checked zero (grok 09-26 P2 split).
  if (input.usableCount === 0 && input.hydratedCount >= input.pageIdCount) {
    return "empty";
  }
  if (
    input.hydratedCount < input.pageIdCount ||
    (input.preFiltered &&
      input.usableCount < Math.min(SEARCH_PAGE_SIZE, input.pageIdCount))
  ) {
    return "partial";
  }
  return "success";
}
