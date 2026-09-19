import { SEARCH_MAX_PAGE, SEARCH_PAGE_SIZE } from "./met/search-query";
import type { CollectionSearchResult } from "./met/server-functions";

export type ExploreResultSource = "curated" | "fixture" | "met";

/**
 * The live-search counter must not present the index total as a
 * viewable denominator: the app can only reach SEARCH_MAX_PAGE pages,
 * so "12 / 1700 matches loaded" implied 1,688 viewable works that are
 * not reachable (devin 21:32 #2). Loaded count and index size stay
 * separate numbers; the atCap notice owns the ceiling explanation.
 */
export function exploreCountText(input: {
  source: ExploreResultSource;
  preFiltered?: boolean;
  total: number;
  loaded: number;
}): string {
  if (input.source === "met") {
    if (input.total > input.loaded) {
      return input.preFiltered === false
        ? `${input.loaded} loaded · ${input.total} listed in the department`
        : `${input.loaded} loaded · ${input.total} in the index`;
    }
    return `${input.loaded} loaded`;
  }
  return `${input.loaded} / ${input.total} review works`;
}

export type ExploreLoadState = {
  canLoadMore: boolean;
  countIsExact: boolean;
  nextCount: number;
  atCap: boolean;
};

/**
 * The load-more decision for the Explore footer.
 *
 * `total` on met-source searches counts upstream hits before the
 * open-access sieve — the button cannot promise a deliverable count, so
 * `countIsExact` falls to "Load more" (devin 09-10 08:17 #1).
 * Curated/fixture totals are exact slices and keep theirs.
 *
 * The cap note explains records left beyond the browse ceiling; when
 * the usable stream already ran out (fillExhausted), that note owns the
 * ending and a raw-total-derived `remaining` must not also fire the cap
 * (devin 09-10 08:17 #2).
 */
export function loadMoreState(input: {
  source: ExploreResultSource;
  // The real result union, not `string`: a loose type let any future
  // or mistyped status count as loadable — only a non-"error" search
  // result may offer more pages (review 09-19 18:17 P3).
  status: CollectionSearchResult["status"];
  live: boolean;
  hasPath: boolean;
  fillExhausted: boolean;
  remaining: number;
  page: number;
  isClient: boolean;
}): ExploreLoadState {
  const countIsExact = input.source !== "met";
  const nextCount = Math.min(SEARCH_PAGE_SIZE, Math.max(0, input.remaining));
  const canLoadMore =
    input.isClient &&
    input.live &&
    !input.hasPath &&
    !input.fillExhausted &&
    input.remaining > 0 &&
    input.page < SEARCH_MAX_PAGE &&
    input.status !== "error";
  const atCap =
    input.live &&
    !input.hasPath &&
    !input.fillExhausted &&
    input.remaining > 0 &&
    input.page >= SEARCH_MAX_PAGE;
  return { canLoadMore, countIsExact, nextCount, atCap };
}
