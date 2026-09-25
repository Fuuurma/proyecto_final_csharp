import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { curatedArtworks } from "@/data/curated-artworks";
import {
  departmentNameById,
  exploreDepartmentSchema,
  type MetDepartment,
  metDepartments,
} from "@/data/departments";
import {
  fetchMetDepartments,
  fetchMetObject,
  fetchMetObjects,
  fetchMetSearchIds,
  MetApiError,
} from "./client.server";
import type { Artwork } from "./normalize";
import {
  hydrateWindow,
  isLiveCollectionSearch,
  pageItems,
  resolvedDepartmentId,
  SEARCH_MAX_PAGE,
  takeOpenAccessPage,
} from "./search-query";
import {
  computeSearchStatus,
  type SearchFailureKind,
  searchFailureKind,
} from "./search-status";

const collectionSearchInputSchema = z.object({
  q: z.string().trim().max(120).default(""),
  department: exploreDepartmentSchema.default("all"),
  departmentId: z.number().int().positive().optional(),
  page: z.number().int().min(1).max(SEARCH_MAX_PAGE).default(1),
});

const artworkInputSchema = z.object({
  objectId: z.number().int().positive().max(999_999_999),
});

export type CollectionSearchResult = {
  status: "success" | "empty" | "partial" | "error";
  source: "curated" | "fixture" | "met";
  query: string;
  department: string;
  departmentId?: number;
  total: number;
  /**
   * Met-source only: false when the IDs came from the /objects endpoint,
   * which ignores the open-access params — `total` then counts the whole
   * department, not rows the sieve can actually show. The Explore counter
   * words its denominator accordingly (devin 09-09 19:37 #3).
   */
  preFiltered?: boolean;
  artworks: Artwork[];
  message?: string;
  /**
   * Typed upstream failure ("timeout" | "5xx" | "4xx" | "parse") when the
   * live Met call behind this result threw — lets the UI distinguish
   * "Met down" from "no results" instead of reading `message`.
   */
  failure?: SearchFailureKind;
};

export type ArtworkDetailResult =
  | {
      status: "success";
      source: "curated" | "fixture" | "met";
      artwork: Artwork;
    }
  | {
      status: "error";
      source: "fixture" | "met";
      artwork: null;
      message: string;
      failure?: SearchFailureKind;
    };

export type DepartmentIndexResult = {
  status: "success" | "error";
  source: "fixture" | "met";
  departments: MetDepartment[];
  message?: string;
  failure?: SearchFailureKind;
};

const missingDepartmentFilter = "__none__";

async function isFixtureMode(): Promise<boolean> {
  // Non-`VITE_` prefix on purpose: Vite only ships `VITE_*` vars to the
  // client bundle, so `MET_API_MODE` stays server-only.
  // Environment surfaces, in order:
  //   1. process.env — Node contexts (vitest, scripts).
  //   2. cloudflare:workers getBindings — the workerd isolate under
  //      @cloudflare/vite-plugin; .dev.vars lands here, and shell env
  //      (playwright webServer) does NOT reach it (97b3e7a rename +
  //      plugin migration left fixture dead until 03:1x).
  //   3. import.meta.env — prefixed-only fallback.
  if (process.env?.MET_API_MODE === "fixture") return true;
  try {
    const cf = (await import("cloudflare:workers")) as {
      getBindings?: () => { MET_API_MODE?: string };
    };
    if (cf.getBindings?.().MET_API_MODE === "fixture") return true;
  } catch {
    // Not running inside workerd (vitest/plain Node).
  }
  return import.meta.env?.MET_API_MODE === "fixture";
}

function filterCuratedArtworks(query: string, department: string): Artwork[] {
  if (department === missingDepartmentFilter) return [];

  const normalizedQuery = query.toLowerCase();

  return curatedArtworks.filter((artwork) => {
    const searchable = [
      artwork.displayTitle,
      artwork.title,
      artwork.artist,
      artwork.department,
      ...artwork.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 || searchable.includes(normalizedQuery);
    const matchesDepartment =
      department === "all" || artwork.department === department;

    return matchesQuery && matchesDepartment;
  });
}

function apiErrorMessage(error: unknown, subject: string): string {
  if (!(error instanceof MetApiError)) {
    return `The ${subject} is temporarily unavailable. Try again in a moment.`;
  }

  switch (error.kind) {
    case "timeout":
      return `The ${subject} took too long to answer. Try again in a moment.`;
    case "5xx":
      return `The ${subject} is temporarily unavailable. Try again in a moment.`;
    case "4xx":
      return error.status === 404
        ? "That object is not available in the public collection right now."
        : `The ${subject} could not answer that request. Try another search.`;
    case "parse":
      return `The ${subject} returned an unreadable record. Try another search.`;
  }
}

function curatedSearchResult(
  query: string,
  department: string,
  source: CollectionSearchResult["source"],
  departmentId?: number,
  emptyMessage?: string,
  page = 1,
  paginate = false,
): CollectionSearchResult {
  const matches = filterCuratedArtworks(query, department);
  const artworks = paginate ? pageItems(matches, page) : matches;
  const mappedName =
    departmentId !== undefined ? departmentNameById(departmentId) : undefined;

  return {
    status: matches.length > 0 ? "success" : "empty",
    source,
    query,
    department: mappedName ?? department,
    departmentId,
    total: matches.length,
    artworks,
    message:
      matches.length === 0
        ? (emptyMessage ??
          (departmentId !== undefined
            ? department === missingDepartmentFilter
              ? "This department is outside the deterministic review fixture."
              : "The review set has no works from this department yet."
            : undefined))
        : undefined,
  };
}

export const searchCollection = createServerFn({ method: "GET" })
  .validator(collectionSearchInputSchema)
  .handler(async ({ data }): Promise<CollectionSearchResult> => {
    const { q, department, departmentId, page } = data;
    const trigger = { q, department, departmentId, page };
    const live = isLiveCollectionSearch(trigger);
    const mappedDepartmentId = resolvedDepartmentId(trigger);
    const mappedDepartment =
      mappedDepartmentId !== undefined
        ? (departmentNameById(mappedDepartmentId) ?? missingDepartmentFilter)
        : department;

    if (!live) {
      return curatedSearchResult(q, department, "curated");
    }

    if (await isFixtureMode()) {
      return curatedSearchResult(
        q,
        mappedDepartment,
        "fixture",
        mappedDepartmentId,
        undefined,
        page,
        true,
      );
    }

    try {
      const search = await fetchMetSearchIds(q, {
        departmentId: mappedDepartmentId,
      });
      const pageIds = hydrateWindow(search.objectIds, page);
      const hydrated = await fetchMetObjects(pageIds, {
        concurrency: 4,
      });
      const artworks = takeOpenAccessPage(hydrated);

      // Genuine hydration failures: some promised rows did not deliver.
      // Degrade to the curated review set with the honest notice.
      if (hydrated.length < pageIds.length) {
        const fallback = curatedSearchResult(
          q,
          mappedDepartment === missingDepartmentFilter
            ? department
            : mappedDepartment,
          "curated",
          mappedDepartmentId,
          undefined,
          page,
          true,
        );
        if (fallback.artworks.length > 0) {
          return {
            ...fallback,
            status: "partial",
            message:
              "The live Met collection is answering slowly. Showing committed works from this room.",
          };
        }
      }

      // Fully hydrated, zero usable after the sieve: genuinely no
      // open-access matches — honest empty (devin 09-10 08:10 / 06:57).
      // Partial hydration is NOT a genuine empty: the unloaded
      // remainder may hold open-access works, so the zero-usable case
      // degrades honestly instead of claiming certainty
      // (needs-work 09-24 P2).
      if (artworks.length === 0) {
        if (hydrated.length < pageIds.length) {
          return {
            status: "partial",
            source: "met",
            query: q,
            department:
              (mappedDepartmentId !== undefined
                ? departmentNameById(mappedDepartmentId)
                : undefined) ?? mappedDepartment,
            departmentId: mappedDepartmentId,
            total: search.total,
            preFiltered: search.preFiltered,
            artworks: [],
            message:
              "The live Met collection is answering slowly; this page couldn't be fully checked.",
          };
        }
        return {
          status: "empty",
          source: "met",
          query: q,
          department:
            (mappedDepartmentId !== undefined
              ? departmentNameById(mappedDepartmentId)
              : undefined) ?? mappedDepartment,
          departmentId: mappedDepartmentId,
          total: search.total,
          preFiltered: search.preFiltered,
          artworks: [],
          message: "No open-access works matched this search.",
        };
      }

      // Outcome semantics live in computeSearchStatus — pinned across all
      // branches there (empty index, outage-vs-sieve drops, success).
      const status = computeSearchStatus({
        totalIds: search.objectIds.length,
        hydratedCount: hydrated.length,
        pageIdCount: pageIds.length,
        usableCount: artworks.length,
        preFiltered: search.preFiltered,
      });
      const liveDepartmentName =
        (mappedDepartmentId !== undefined
          ? departmentNameById(mappedDepartmentId)
          : undefined) ??
        artworks[0]?.department ??
        department;

      return {
        status,
        source: "met",
        query: q,
        department: liveDepartmentName,
        departmentId: mappedDepartmentId,
        total: search.total,
        preFiltered: search.preFiltered,
        artworks,
        message:
          status === "partial"
            ? "Some records could not be loaded; showing the ones available."
            : undefined,
      };
    } catch (error) {
      const fallback = curatedSearchResult(
        q,
        mappedDepartment === missingDepartmentFilter
          ? department
          : mappedDepartment,
        "curated",
        mappedDepartmentId,
        undefined,
        page,
        true,
      );

      if (fallback.artworks.length > 0) {
        return {
          ...fallback,
          status: "partial",
          message:
            "The live Met collection is answering slowly. Showing committed works from this room.",
          failure: searchFailureKind(error),
        };
      }

      return {
        status: "error",
        source: "met",
        query: q,
        department:
          mappedDepartment === missingDepartmentFilter
            ? department
            : mappedDepartment,
        departmentId: mappedDepartmentId,
        total: 0,
        artworks: [],
        message: apiErrorMessage(error, "Met collection search"),
        failure: searchFailureKind(error),
      };
    }
  });

export const getArtwork = createServerFn({ method: "GET" })
  .validator(artworkInputSchema)
  .handler(async ({ data }): Promise<ArtworkDetailResult> => {
    const curated = curatedArtworks.find(
      (artwork) => artwork.id === data.objectId,
    );

    if (curated) {
      return { status: "success", source: "curated", artwork: curated };
    }

    if (await isFixtureMode()) {
      return {
        status: "error",
        source: "fixture",
        artwork: null,
        message: "This object is outside the deterministic review fixture.",
      };
    }

    try {
      const artwork = await fetchMetObject(data.objectId);
      return { status: "success", source: "met", artwork };
    } catch (error) {
      return {
        status: "error",
        source: "met",
        artwork: null,
        message: apiErrorMessage(error, "Met object record"),
        failure: searchFailureKind(error),
      };
    }
  });

export const listDepartments = createServerFn({ method: "GET" }).handler(
  async (): Promise<DepartmentIndexResult> => {
    if (await isFixtureMode()) {
      return {
        status: "success",
        source: "fixture",
        departments: metDepartments,
      };
    }

    try {
      return {
        status: "success",
        source: "met",
        departments: await fetchMetDepartments(),
      };
    } catch (error) {
      // Honest signal: a fixture fallback after a live failure is an
      // outage the caller can see, not a healthy success (devin 09-09
      // 21:37 #2 — third repeat of the dishonest contract).
      return {
        status: "error",
        source: "fixture",
        departments: metDepartments,
        message: apiErrorMessage(error, "Met department index"),
        failure: searchFailureKind(error),
      };
    }
  },
);
