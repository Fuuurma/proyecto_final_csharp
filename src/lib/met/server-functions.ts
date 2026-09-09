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
import { computeSearchStatus } from "./search-status";

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
  artworks: Artwork[];
  message?: string;
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
    };

export type DepartmentIndexResult = {
  status: "success" | "error";
  source: "fixture" | "met";
  departments: MetDepartment[];
  message?: string;
};

const missingDepartmentFilter = "__none__";

function isFixtureMode(): boolean {
  // Non-`VITE_` prefix on purpose: Vite only ships `VITE_*` vars to the
  // client bundle, so `MET_API_MODE` stays server-only. This module is a
  // server function (`createServerFn`), so `import.meta.env` here is
  // Vite's SSR env, which still resolves the full environment.
  return import.meta.env.MET_API_MODE === "fixture";
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
    case "invalid":
      return `The ${subject} returned an unreadable record. Try another search.`;
    case "not-found":
      return "That object is not available in the public collection right now.";
    case "unavailable":
      return `The ${subject} is temporarily unavailable. Try again in a moment.`;
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

    if (isFixtureMode()) {
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
      if (artworks.length === 0) {
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

    if (isFixtureMode()) {
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
      };
    }
  });

export const listDepartments = createServerFn({ method: "GET" }).handler(
  async (): Promise<DepartmentIndexResult> => {
    if (isFixtureMode()) {
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
      return {
        status: "success",
        source: "fixture",
        departments: metDepartments,
        message: apiErrorMessage(error, "Met department index"),
      };
    }
  },
);
