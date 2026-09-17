import { departmentIdByName } from "@/data/departments";

export const SEARCH_PAGE_SIZE = 24;
export const SEARCH_MAX_PAGE = 4;
export const SEARCH_HYDRATE_WINDOW = 36;

export type SearchTrigger = {
  q: string;
  department: string;
  departmentId?: number;
  page?: number;
};

type OpenAccessArtwork = {
  isPublicDomain: boolean;
  primaryImage: string | null;
  primaryImageSmall: string | null;
};

export function isLiveCollectionSearch(input: SearchTrigger): boolean {
  return (
    input.q.length > 0 ||
    input.department !== "all" ||
    input.departmentId !== undefined
  );
}

export function resolvedDepartmentId(input: SearchTrigger): number | undefined {
  if (input.departmentId !== undefined) return input.departmentId;
  if (input.department === "all") return undefined;
  return departmentIdByName(input.department);
}

export function pageItems<T>(items: T[], page: number): T[] {
  const safePage = Math.min(Math.max(page, 1), SEARCH_MAX_PAGE);
  const start = (safePage - 1) * SEARCH_PAGE_SIZE;
  return items.slice(start, start + SEARCH_PAGE_SIZE);
}

export function hydrateWindow(objectIds: number[], page: number): number[] {
  const safePage = Math.min(Math.max(page, 1), SEARCH_MAX_PAGE);
  const start = (safePage - 1) * SEARCH_PAGE_SIZE;
  return objectIds.slice(start, start + SEARCH_HYDRATE_WINDOW);
}

export function hasUsableImage(artwork: OpenAccessArtwork): boolean {
  return Boolean(artwork.primaryImageSmall || artwork.primaryImage);
}

export function takeOpenAccessPage<T extends OpenAccessArtwork>(
  artworks: T[],
  size = SEARCH_PAGE_SIZE,
): T[] {
  return artworks
    .filter((artwork) => artwork.isPublicDomain && hasUsableImage(artwork))
    .slice(0, size);
}
