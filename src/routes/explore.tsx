import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArtworkCard } from "@/components/artwork-card";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { curatedPaths } from "@/data/curated-artworks";
import {
  departmentNameById,
  exploreDepartmentFilters,
  exploreDepartmentSchema,
  isExploreDepartmentFilter,
} from "@/data/departments";
import { collectPages, dedupeById, type PageCache } from "@/lib/fill-pages";
import type { Artwork } from "@/lib/met/normalize";
import {
  isLiveCollectionSearch,
  SEARCH_MAX_PAGE,
  SEARCH_PAGE_SIZE,
} from "@/lib/met/search-query";
import { searchCollection } from "@/lib/met/server-functions";
import { cn } from "@/lib/utils";

// Session-scoped memo for tail-fill pages — see fill-pages.ts. One source
// of truth stays `[...result.artworks, ...extra]`; this only skips
// network round-trips already paid this session.
const refillCache: PageCache<Artwork> = new Map();

const exploreSearchSchema = z.object({
  q: z.string().optional(),
  department: exploreDepartmentSchema.optional(),
  path: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE).optional(),
});

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Meet the Met" },
      {
        name: "description",
        content:
          "Search the Open Access index by keyword, department, or curated path. Every result links to the canonical Met record.",
      },
      { property: "og:title", content: "Explore — Meet the Met" },
      {
        property: "og:description",
        content:
          "Search the Open Access index by keyword, department, or curated path.",
      },
    ],
  }),
  validateSearch: (search) => {
    const parsed = exploreSearchSchema.safeParse(search);
    if (parsed.success) return parsed.data;
    // Keep whichever individual params are valid so the URL corrects
    // itself (dropping only the bad key) instead of silently resetting
    // to page 1 / "all" (devin 21:32 #6).
    const keys = ["q", "department", "path", "departmentId", "page"] as const;
    type SearchShape = z.infer<typeof exploreSearchSchema>;
    const partial: SearchShape = {};
    for (const key of keys) {
      const raw = (search as Record<string, unknown>)[key];
      if (raw === undefined) continue;
      const single = exploreSearchSchema.safeParse({ [key]: raw });
      if (single.success) {
        Object.assign(partial, single.data);
      }
    }
    return partial;
  },
  loaderDeps: ({ search }) => ({
    q: search.q ?? "",
    department: search.department ?? "all",
    departmentId: search.departmentId,
  }),
  loader: ({ deps }) =>
    searchCollection({
      data: {
        q: deps.q,
        department: deps.department,
        departmentId: deps.departmentId,
        page: 1,
      },
    }),
  pendingComponent: ExplorePending,
  component: Explore,
});

function Explore() {
  const navigate = useNavigate({ from: "/explore" });
  const {
    q,
    department,
    path: pathSlug,
    departmentId,
    page: pageParam,
  } = useSearch({ from: "/explore" });
  // Trimmed like the server validator — a whitespace-only q must not
  // make the client think the view is live while the server returns
  // curated results (codex sol review 09-09).
  const query = (q ?? "").trim();
  const activeDepartment = department ?? "all";
  const page = pageParam ?? 1;
  const activePath = curatedPaths.find((path) => path.slug === pathSlug);
  const result = Route.useLoaderData();
  const live = isLiveCollectionSearch({
    q: query,
    department: activeDepartment,
    departmentId,
  });
  const liveDepartmentName =
    activeDepartment !== "all"
      ? activeDepartment
      : departmentId !== undefined
        ? (departmentNameById(departmentId) ?? result.department)
        : undefined;
  const [extra, setExtra] = useState<Artwork[]>([]);
  const [isFilling, setIsFilling] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathWorks =
    activePath && !live
      ? result.artworks.filter((artwork) =>
          activePath.artworkIds.some((id) => id === artwork.id),
        )
      : null;
  // The path chrome only describes the grid when the path actually owns
  // it — with a query active the grid is live Met results, and labelling
  // them with the path title lied (devin 09-09 14:17 #3 / 14:57 #1).
  const shownPath = activePath && !live ? activePath : null;
  const works = pathWorks ?? dedupeById([...result.artworks, ...extra]);
  const total = pathWorks ? pathWorks.length : result.total;
  const [hasInput, setHasInput] = useState(Boolean(query));
  const remaining = Math.max(0, total - works.length);
  const nextCount = Math.min(SEARCH_PAGE_SIZE, remaining);
  const canLoadMore =
    isClient &&
    live &&
    !shownPath &&
    remaining > 0 &&
    page < SEARCH_MAX_PAGE &&
    result.status !== "error";
  const atCap = live && !shownPath && remaining > 0 && page >= SEARCH_MAX_PAGE;

  useEffect(() => setHasInput(Boolean(query)), [query]);
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        ) &&
        !(event.target as HTMLElement)?.isContentEditable &&
        // A dialog owns the keyboard; the shortcut must not steal focus
        // from it (devin 09-09 19:37 #8 — preventive).
        !document.querySelector("[role='dialog']")
      ) {
        event.preventDefault();
        const input = document.getElementById(
          "collection-search",
        ) as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setExtra([]);
    if (page <= 1 || pathSlug || !live) {
      setIsFilling(false);
      return;
    }

    async function fillRemaining() {
      setIsFilling(true);
      try {
        await collectPages(
          refillCache,
          [query, activeDepartment, departmentId],
          2,
          page,
          async (nextPage) => {
            const next = await searchCollection({
              data: {
                q: query,
                department: activeDepartment,
                departmentId,
                page: nextPage,
              },
            });
            return next.artworks;
          },
          {
            onChunk: (all) => {
              if (!cancelled) setExtra([...all]);
            },
            shouldContinue: () => !cancelled,
          },
        );
      } finally {
        if (!cancelled) setIsFilling(false);
      }
    }

    void fillRemaining();
    return () => {
      cancelled = true;
    };
  }, [page, query, activeDepartment, departmentId, pathSlug, live]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formInput =
      event.currentTarget.querySelector<HTMLInputElement>('input[name="q"]');
    const submittedQuery = String(formInput?.value ?? "").trim();
    void navigate({
      search: {
        q: submittedQuery || undefined,
        department: activeDepartment === "all" ? undefined : activeDepartment,
        path: undefined,
        departmentId: undefined,
        page: undefined,
      },
    });
  }

  function changeDepartment(nextValues: string[]) {
    const nextDepartment = nextValues[0];
    if (!isExploreDepartmentFilter(nextDepartment)) return;

    void navigate({
      search: {
        q: query || undefined,
        department: nextDepartment === "all" ? undefined : nextDepartment,
        path: undefined,
        departmentId: undefined,
        page: undefined,
      },
    });
  }

  function loadMore() {
    void navigate({
      search: {
        q: query || undefined,
        department: activeDepartment === "all" ? undefined : activeDepartment,
        departmentId,
        page: page + 1,
      },
    });
  }

  return (
    <main className="page-frame explore-page">
      <section className="explore-heading" aria-labelledby="explore-title">
        <div>
          <span className="eyebrow">
            {shownPath
              ? "Curated path"
              : query
                ? "Search"
                : liveDepartmentName
                  ? "Department"
                  : "The working index"}
          </span>
          <h1 id="explore-title">
            {shownPath
              ? shownPath.title
              : query
                ? `“${query}”`
                : liveDepartmentName
                  ? liveDepartmentName
                  : "Explore the collection."}
          </h1>
        </div>
        <p>
          {shownPath
            ? shownPath.description
            : query
              ? "Live results from the Open Access collection."
              : liveDepartmentName
                ? "A public-domain, image-backed page from this department. Load more to keep reading the index."
                : "Search by artist, title, or object language. The first view is a review set; typed searches and department chips open the live Open Access collection."}
        </p>
      </section>

      <search aria-label="Search the collection">
        <form className="search-form" onSubmit={submit}>
          <FieldGroup className="search-field-group">
            <Field orientation="horizontal" className="search-field">
              <FieldLabel className="sr-only" htmlFor="collection-search">
                Search the collection
              </FieldLabel>
              <SearchIcon />
              <Input
                id="collection-search"
                name="q"
                key={query}
                defaultValue={query}
                onInput={(event) =>
                  setHasInput(Boolean(event.currentTarget.value))
                }
                placeholder="Try “van Gogh”, “waves”, or “portraits”"
                type="search"
              />
              {hasInput ? (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={(event) => {
                    const form = event.currentTarget.closest("form");
                    const input =
                      form?.querySelector<HTMLInputElement>('input[name="q"]');
                    if (input) {
                      input.value = "";
                      input.focus();
                    }
                    setHasInput(false);
                  }}
                  aria-label="Clear"
                >
                  <CloseIcon />
                </button>
              ) : (
                <kbd className="search-shortcut mono">/</kbd>
              )}
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" className="search-submit">
            Search
          </Button>
        </form>
      </search>

      <div className="explore-tools">
        <fieldset className="filter-group">
          <legend className="eyebrow">Department</legend>
          <ToggleGroup
            aria-label="Department"
            className="department-toggle-group"
            onValueChange={changeDepartment}
            value={[activeDepartment]}
            variant="outline"
            spacing={0}
          >
            {exploreDepartmentFilters.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {option === "all" ? "All works" : option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <span className="explore-count mono">
          {result.source === "met"
            ? total > works.length
              ? result.preFiltered === false
                ? `${works.length} loaded · ${total} listed in the department`
                : `${works.length} loaded · ${total} in the index`
              : `${works.length} loaded`
            : `${works.length} / ${total} review works`}
        </span>
        {query ||
        activePath ||
        departmentId !== undefined ||
        activeDepartment !== "all" ? (
          <Link to="/explore" search={{}} className="text-link explore-clear">
            Return to all works <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </div>

      <div className="explore-paths">
        <span className="eyebrow">Curated paths</span>
        <div className="path-chip-row">
          {curatedPaths.map((path) => {
            const isActive = path.slug === pathSlug;
            return (
              <Link
                key={path.slug}
                to="/explore"
                search={{
                  path: isActive ? undefined : path.slug,
                }}
                className={isActive ? "path-chip is-active" : "path-chip"}
                aria-current={isActive ? "page" : undefined}
              >
                {path.title}
              </Link>
            );
          })}
        </div>
        <Link to="/departments" className="text-link text-link--quiet">
          All departments <span aria-hidden="true">→</span>
        </Link>
      </div>

      {query ||
      activePath ||
      departmentId !== undefined ||
      activeDepartment !== "all" ? (
        <section className="active-filters" aria-label="Active filters">
          <span className="eyebrow">Filtered by:</span>
          <div className="active-filters__row">
            {query ? (
              <Link
                to="/explore"
                search={{
                  q: undefined,
                  department:
                    activeDepartment === "all" ? undefined : activeDepartment,
                  path: pathSlug,
                  departmentId,
                }}
                className="filter-pill"
                aria-label={`Remove search filter "${query}"`}
              >
                <span>Query: “{query}”</span>
                <CloseIcon />
              </Link>
            ) : null}
            {activeDepartment !== "all" ? (
              <Link
                to="/explore"
                search={{
                  q: query || undefined,
                  department: undefined,
                  path: pathSlug,
                  departmentId: undefined,
                }}
                className="filter-pill"
                aria-label={`Remove department filter "${activeDepartment}"`}
              >
                <span>Dept: {activeDepartment}</span>
                <CloseIcon />
              </Link>
            ) : null}
            {departmentId !== undefined && liveDepartmentName ? (
              <Link
                to="/explore"
                search={{
                  q: query || undefined,
                  department: undefined,
                  path: undefined,
                  departmentId: undefined,
                }}
                className="filter-pill"
                aria-label={`Remove department filter "${liveDepartmentName}"`}
              >
                <span>Dept: {liveDepartmentName}</span>
                <CloseIcon />
              </Link>
            ) : null}
            {activePath ? (
              <Link
                to="/explore"
                search={{
                  q: query || undefined,
                  department:
                    activeDepartment === "all" ? undefined : activeDepartment,
                  path: undefined,
                  departmentId,
                }}
                className="filter-pill"
                aria-label={`Remove path filter "${activePath.title}"`}
              >
                <span>Path: {activePath.title}</span>
                <CloseIcon />
              </Link>
            ) : null}
            <Link
              to="/explore"
              search={{}}
              className="text-link active-filters__clear"
            >
              Reset all
            </Link>
          </div>
        </section>
      ) : null}

      {result.message && result.status === "partial" ? (
        <Alert className="result-alert">
          <AlertTitle>Some records are unavailable.</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {result.status === "error" ? (
        <section aria-live="polite">
          <Empty>
            <EmptyHeader>
              <span className="eyebrow">Collection unavailable</span>
              <EmptyTitle>The index needs a moment.</EmptyTitle>
              <EmptyDescription>{result.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                to="/explore"
                search={{}}
                className={cn(buttonVariants({ size: "lg" }), "button-link")}
              >
                Return to the review set
              </Link>
            </EmptyContent>
          </Empty>
        </section>
      ) : works.length > 0 ? (
        <>
          <section className="artwork-grid" aria-label="Collection results">
            {works.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </section>
          {canLoadMore ? (
            <div className="explore-more">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="load-more"
                aria-busy={isFilling}
                disabled={isFilling}
                onClick={loadMore}
              >
                {isFilling ? "Loading more…" : `Load ${nextCount} more`}
              </Button>
            </div>
          ) : null}
          {atCap ? (
            <p className="explore-cap">
              This view stops at {SEARCH_PAGE_SIZE * SEARCH_MAX_PAGE} records.
              Narrow the search to look further.
            </p>
          ) : null}
        </>
      ) : (
        <section aria-live="polite">
          <Empty>
            <EmptyHeader>
              <span className="eyebrow">No matching works</span>
              <EmptyTitle>The index is quiet here.</EmptyTitle>
              <EmptyDescription>
                {result.message ??
                  "Try a broader word, or return to the complete review set."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                to="/explore"
                search={{}}
                className={cn(buttonVariants({ size: "lg" }), "button-link")}
              >
                Reset the search
              </Link>
            </EmptyContent>
          </Empty>
        </section>
      )}
    </main>
  );
}

function ExplorePending() {
  const navigate = useNavigate({ from: "/explore" });
  const { q, department, departmentId } = useSearch({ from: "/explore" });
  const query = q ?? "";
  const activeDepartment = department ?? "all";
  const liveDepartmentName =
    activeDepartment !== "all"
      ? activeDepartment
      : departmentId !== undefined
        ? departmentNameById(departmentId)
        : undefined;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formInput =
      event.currentTarget.querySelector<HTMLInputElement>('input[name="q"]');
    const submittedQuery = String(formInput?.value ?? "").trim();
    void navigate({
      search: {
        q: submittedQuery || undefined,
        department: activeDepartment === "all" ? undefined : activeDepartment,
        path: undefined,
        departmentId: undefined,
        page: undefined,
      },
    });
  }

  return (
    <main className="page-frame explore-page" aria-busy="true">
      <section className="explore-heading" aria-labelledby="explore-loading">
        <div>
          <span className="eyebrow">
            {liveDepartmentName ? "Department" : "The working index"}
          </span>
          <h1 id="explore-loading">
            {liveDepartmentName ?? "Looking closer."}
          </h1>
        </div>
        <p>Fetching a bounded page of open-access records.</p>
      </section>
      <search aria-label="Search the collection">
        <form className="search-form" onSubmit={submit}>
          <FieldGroup className="search-field-group">
            <Field orientation="horizontal" className="search-field">
              <FieldLabel className="sr-only" htmlFor="collection-search">
                Search the collection
              </FieldLabel>
              <SearchIcon />
              <Input
                id="collection-search"
                name="q"
                key={query}
                defaultValue={query}
                placeholder="Try “van Gogh”, “waves”, or “portraits”"
                type="search"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" className="search-submit">
            Search
          </Button>
        </form>
      </search>
      <div className="collection-loading">
        <div className="collection-loading__heading">
          <span className="eyebrow">Reading the index</span>
          <span className="mono">Bounded page</span>
        </div>
        <div className="artwork-grid artwork-grid--loading">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div className="artwork-skeleton" key={index}>
              <Skeleton
                className="artwork-skeleton__image"
                style={{ aspectRatio: index % 3 === 0 ? "0.78" : "1.12" }}
              />
              <Skeleton className="artwork-skeleton__line" />
              <Skeleton className="artwork-skeleton__title" />
              <Skeleton className="artwork-skeleton__artist" />
            </div>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          Fetching a bounded page of open-access records.
        </p>
      </div>
    </main>
  );
}
