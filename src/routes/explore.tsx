import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ArtworkCard } from "@/components/artwork-card";
import { ExploreGridFooter } from "@/components/explore-grid-footer";
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
  type ExploreDepartmentFilter,
  exploreDepartmentFilters,
  exploreDepartmentSchema,
  isExploreDepartmentFilter,
} from "@/data/departments";
import { sequenceParam, writeBrowseSequence } from "@/lib/browse-sequence";
import { exploreCountText, loadMoreState } from "@/lib/explore-load";
import {
  cachePages,
  collectPages,
  dedupeById,
  type PageCache,
  pageCacheKey,
} from "@/lib/fill-pages";
import type { Artwork } from "@/lib/met/normalize";
import {
  isLiveCollectionSearch,
  SEARCH_MAX_PAGE,
} from "@/lib/met/search-query";
import { searchCollection } from "@/lib/met/server-functions";
import { cn } from "@/lib/utils";

// Session-scoped memo for pages before the selected page — the route loader
// owns the selected page, and results render in `[...extra, ...result.artworks]`.
const refillCache: PageCache<Artwork> = new Map();

const exploreSearchSchema = z.object({
  q: z.string().max(120).optional(),
  department: exploreDepartmentSchema.optional(),
  path: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE).optional(),
});

export const Route = createFileRoute("/explore")({
  // validateSearch + loader before head —
  // tanstack-start-route-property-order (react-doctor 09-16).
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
    path: search.path ?? "",
    page: search.page ?? 1,
  }),
  loader: ({ deps }) =>
    searchCollection({
      data: {
        q: deps.q,
        department: deps.department,
        departmentId: deps.departmentId,
        page: deps.page,
      },
    }),
  pendingComponent: ExplorePending,
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
  // A departmentId arrival filters by id; when the id names one of the
  // toggle's own rooms, press the matching chip so the filter state is
  // visible (DESIGN.md: query/filter state is visible). Ids outside the
  // curated rooms can't be represented by a chip — the grid label
  // (liveDepartmentName) carries the state instead.
  const departmentIdName =
    departmentId !== undefined ? departmentNameById(departmentId) : undefined;
  const pressedDepartment =
    departmentIdName !== undefined &&
    (exploreDepartmentFilters as readonly string[]).includes(departmentIdName)
      ? departmentIdName
      : departmentId !== undefined
        ? undefined
        : activeDepartment;
  const page = pageParam ?? 1;
  const activePath = curatedPaths.find((path) => path.slug === pathSlug);
  const result = Route.useLoaderData();
  const live = isLiveCollectionSearch({
    q: query,
    department: activeDepartment,
    departmentId,
  });
  // The label must follow the query's precedence (resolvedDepartmentId
  // prefers departmentId): a URL carrying both a name and an id used to
  // label the grid with the name while querying the id — a label-vs-
  // grid lie (needs-work 09-26 P2).
  const liveDepartmentName =
    departmentId !== undefined
      ? (departmentNameById(departmentId) ?? result.department)
      : activeDepartment !== "all"
        ? activeDepartment
        : undefined;
  const [extra, setExtra] = useState<Artwork[]>([]);
  const [isFilling, setIsFilling] = useState(false);
  // A failed tail-fill page used to escape as an unhandled rejection and
  // leave the grid silently stuck (devin 09-09 20:57 #1) — now it shows.
  const [fillFailed, setFillFailed] = useState(false);
  // Two consecutive fill windows with zero NEW usable works is a
  // strong end-of-usable signal for a sparse result: the button kept
  // promising 'Load 24 more' while every delivered window sieved out
  // (quick-critic 09-10 14:4x). Heuristic — the index total stays
  // honest in the counter; this only stops offering empty loads.
  const [fillExhausted, setFillExhausted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // Reset page restoration during render when filters, path ownership, or the
  // selected page changes so stale extras never flash beside new loader data.
  const searchKey = `${query}|${activeDepartment}|${departmentId ?? ""}|${pathSlug ?? ""}|${live ? "live" : "curated"}`;
  const fillKey = `${searchKey}|${page}`;
  const [prevFillKey, setPrevFillKey] = useState(fillKey);
  if (prevFillKey !== fillKey) {
    setPrevFillKey(fillKey);
    setExtra([]);
    setFillFailed(false);
    setFillExhausted(false);
  }
  const pathWorks =
    activePath && !live
      ? // Sort to the path's OWN order — the curated array's order is
        // an implementation detail, not the path definition (devin
        // 09-08 18:17 #1).
        activePath.artworkIds
          .map((id) => result.artworks.find((artwork) => artwork.id === id))
          .filter((artwork): artwork is Artwork => Boolean(artwork))
      : null;
  // The path chrome only describes the grid when the path actually owns
  // it — with a query active the grid is live Met results, and labelling
  // them with the path title lied (devin 09-09 14:17 #3 / 14:57 #1).
  const shownPath = activePath && !live ? activePath : null;
  const works = pathWorks ?? dedupeById([...extra, ...result.artworks]);
  const total = pathWorks ? pathWorks.length : result.total;
  const remaining = Math.max(0, total - works.length);
  // The load-more honesty decisions (exact-vs-upstream counts, the cap
  // note, the exhausted stream) live in loadMoreState so they are
  // behavior-tested rather than source-grepped (review 09-19 P2).
  const { canLoadMore, countIsExact, nextCount, atCap } = loadMoreState({
    source: result.source,
    status: result.status,
    live,
    hasPath: Boolean(shownPath),
    fillExhausted,
    remaining,
    page,
    isClient,
  });

  // The displayed order is the sequence the detail route's Previous/Next
  // follows — persisted under an opaque token so live-fetched works get
  // working neighbors too (devin 09-09 06:17 P1). The raw identity used
  // to ride inside every detail URL and storage key (review 09-19 P2).
  // The param is `<key>.<sig>`: the sig lets the detail route detect a
  // collision-displaced entry instead of rendering the wrong trail
  // (review 09-19 18:17 P2).
  const seqParam = sequenceParam(searchKey);
  const seqIds = works.map((work) => work.id).join(",");
  const lastWrittenSeq = useRef("");
  const worksRef = useRef(works);
  useEffect(() => {
    worksRef.current = works;
  });
  useEffect(() => {
    const writeTag = `${seqParam}#${seqIds}`;
    if (lastWrittenSeq.current === writeTag) return;
    // Mark only a landed write — a quota-failed one must retry on the
    // next identity change instead of being swallowed by the sig cache
    // (review 09-19 P3). `works` comes through a ref: `seqIds` already
    // captures the identity, and the fresh-array dep re-ran this
    // needlessly every render.
    if (writeBrowseSequence(seqParam, worksRef.current)) {
      lastWrittenSeq.current = writeTag;
    }
  }, [seqParam, seqIds]);

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
    let lastChunkLength = 0;
    let zeroYieldWindows = 0;
    setExtra([]);
    setFillFailed(false);
    setFillExhausted(false);
    const cacheKey = [query, activeDepartment, departmentId];
    if (live && result.status !== "error") {
      cachePages(refillCache, pageCacheKey(cacheKey, page), result.artworks);
    }
    if (page <= 1 || shownPath || !live) {
      setIsFilling(false);
      return;
    }

    async function fillRemaining() {
      setIsFilling(true);
      try {
        await collectPages(
          refillCache,
          cacheKey,
          1,
          page - 1,
          async (nextPage) => {
            const next = await searchCollection({
              data: {
                q: query,
                department: activeDepartment,
                departmentId,
                page: nextPage,
              },
            });
            // The server RESOLVES {status: "error", artworks: []} when
            // the curated fallback is empty — the normal shape for any
            // page >= 2. Returning the empty array would let
            // collectPages cache the failed page as a legitimate empty
            // and let the zero-yield counter blame the index; throwing
            // routes to the honest fillFailed handler and leaves the
            // page uncached (needs-work 09-25 P1).
            if (next.status === "error") {
              throw new Error(next.message ?? "Met collection search");
            }
            return next.artworks;
          },
          {
            onChunk: (all) => {
              if (cancelled) return;
              if (all.length === lastChunkLength) {
                zeroYieldWindows += 1;
                if (zeroYieldWindows >= 2) setFillExhausted(true);
              } else {
                zeroYieldWindows = 0;
              }
              lastChunkLength = all.length;
              setExtra([...all]);
            },
            shouldContinue: () => !cancelled,
          },
        );
      } catch (error) {
        // A failed page used to escape as an unhandled rejection and
        // leave the grid silently stuck at whatever had loaded
        // (devin 09-09 20:57 #1). Keep what loaded; say the rest failed.
        if (!cancelled) {
          setFillFailed(true);
          console.warn("[explore] tail-fill failed", error);
        }
      } finally {
        if (!cancelled) setIsFilling(false);
      }
    }

    void fillRemaining();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    query,
    activeDepartment,
    departmentId,
    live,
    shownPath,
    result.artworks,
    result.status,
  ]);

  function loadMore() {
    void navigate({
      search: {
        q: query || undefined,
        department: activeDepartment === "all" ? undefined : activeDepartment,
        departmentId,
        path: pathSlug,
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
              ? result.source === "met"
                ? "Live results from the Open Access collection."
                : result.source === "fixture"
                  ? "Fixture results from the committed review set."
                  : "Committed works from this room while the live collection answers."
              : liveDepartmentName
                ? "A public-domain, image-backed page from this department. Load more to keep reading the index."
                : "Search by artist, title, or object language. The first view is a review set; typed searches and department chips open the live Open Access collection."}
        </p>
      </section>

      <search aria-label="Search the collection">
        <ExploreSearchForm
          query={query}
          activeDepartment={activeDepartment}
          activeDepartmentId={departmentId}
          withClearControls
        />
      </search>

      <ExploreTools
        query={query}
        activeDepartment={activeDepartment}
        departmentId={departmentId}
        pressedDepartment={pressedDepartment}
        hasActivePath={activePath !== undefined}
        count={exploreCountText({
          source: result.source,
          preFiltered: result.preFiltered,
          total,
          loaded: works.length,
        })}
      />

      <div className="explore-paths">
        <span className="eyebrow">Curated paths</span>
        <div className="path-chip-row">
          {curatedPaths.map((path) => {
            // The chip owns the results only when a curated path is actually
            // shown — a live q= query nulls shownPath and the grid goes live
            // (grok 10-05 P2: the chip claimed current-page it did not own).
            const isActive = path.slug === pathSlug && Boolean(shownPath);
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
        <Link to="/departments" className="link-action link-action--quiet">
          All departments <span aria-hidden="true">→</span>
        </Link>
      </div>

      <ExploreActiveFilters
        query={query}
        activeDepartment={activeDepartment}
        departmentId={departmentId}
        liveDepartmentName={liveDepartmentName}
        pathSlug={pathSlug}
        activePath={activePath}
      />

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
              <ArtworkCard key={artwork.id} artwork={artwork} seq={seqParam} />
            ))}
          </section>
          <ExploreGridFooter
            canLoadMore={canLoadMore}
            isFilling={isFilling}
            countIsExact={countIsExact}
            nextCount={nextCount}
            onLoadMore={loadMore}
            fillFailed={fillFailed}
            fillExhausted={fillExhausted}
            atCap={atCap}
          />
        </>
      ) : result.status === "partial" ? (
        // A partial result with zero usable works is a DEGRADATION, not
        // an empty index — the old branch claimed "The index is quiet
        // here." while the alert above said the page couldn't be fully
        // checked (grok 10-02: contradictory + double-printed).
        <section aria-live="polite">
          <Empty>
            <EmptyHeader>
              <span className="eyebrow">Collection unavailable</span>
              <EmptyTitle>This page couldn't be fully checked.</EmptyTitle>
              <EmptyDescription>
                {result.message ??
                  "The live Met collection is answering slowly."}
              </EmptyDescription>
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
  const {
    q,
    department,
    departmentId,
    path: pathSlug,
  } = useSearch({
    from: "/explore",
  });
  // Trimmed like Explore below — the input key/defaultValue must match
  // across the pending→main transition or the field remounts with a
  // different value (devin 09-10 12:50).
  const query = (q ?? "").trim();
  const activeDepartment = department ?? "all";
  // Same precedence as the loaded route — departmentId wins over a name
  // (needs-work 09-26 label-vs-grid fix); a pending flash of the wrong
  // department name is the same lie.
  const departmentIdName =
    departmentId !== undefined ? departmentNameById(departmentId) : undefined;
  const liveDepartmentName =
    departmentIdName ??
    (activeDepartment !== "all" ? activeDepartment : undefined);
  const pressedDepartment =
    departmentIdName !== undefined &&
    (exploreDepartmentFilters as readonly string[]).includes(departmentIdName)
      ? departmentIdName
      : departmentId !== undefined
        ? undefined
        : activeDepartment;
  const activePath = curatedPaths.find((path) => path.slug === pathSlug);

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
        <ExploreSearchForm
          query={query}
          activeDepartment={activeDepartment}
          activeDepartmentId={departmentId}
        />
      </search>
      <ExploreTools
        query={query}
        activeDepartment={activeDepartment}
        departmentId={departmentId}
        pressedDepartment={pressedDepartment}
        hasActivePath={activePath !== undefined}
      />
      <ExploreActiveFilters
        query={query}
        activeDepartment={activeDepartment}
        departmentId={departmentId}
        liveDepartmentName={liveDepartmentName}
        pathSlug={pathSlug}
        activePath={activePath}
      />
      <div className="collection-loading">
        <div className="collection-loading__heading">
          <span className="eyebrow">Reading the index</span>
          <span className="mono">Bounded page</span>
        </div>
        <div className="artwork-grid artwork-grid--loading">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div className="artwork-skeleton" key={index}>
              <Skeleton
                className="aspect-(--skel-ratio) w-full"
                style={
                  {
                    "--skel-ratio": index % 3 === 0 ? "0.78" : "1.12",
                  } as import("react").CSSProperties
                }
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

// The tools row and the active-filter pills are pure URL-state chrome —
// no loader data — so the pending screen renders the real controls the
// visitor was just editing instead of dropping them (grok 09-19).
function ExploreTools({
  query,
  activeDepartment,
  departmentId,
  pressedDepartment,
  hasActivePath,
  count,
}: {
  query: string;
  activeDepartment: ExploreDepartmentFilter;
  departmentId?: number;
  pressedDepartment?: string;
  hasActivePath: boolean;
  count?: string;
}) {
  const navigate = useNavigate({ from: "/explore" });

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

  return (
    <div className="explore-tools">
      <fieldset className="filter-group">
        <legend className="eyebrow">Department</legend>
        <ToggleGroup
          aria-label="Department"
          onValueChange={changeDepartment}
          value={pressedDepartment === undefined ? [] : [pressedDepartment]}
          variant="outline"
          spacing={0}
        >
          {exploreDepartmentFilters.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {option === "all" ? "All departments" : option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </fieldset>
      {count !== undefined ? (
        <span className="explore-count mono">{count}</span>
      ) : null}
      {query ||
      hasActivePath ||
      departmentId !== undefined ||
      activeDepartment !== "all" ? (
        <Link to="/explore" search={{}} className="link-action explore-clear">
          Return to review set <span aria-hidden="true">↗</span>
        </Link>
      ) : null}
    </div>
  );
}

function ExploreActiveFilters({
  query,
  activeDepartment,
  departmentId,
  liveDepartmentName,
  pathSlug,
  activePath,
}: {
  query: string;
  activeDepartment: ExploreDepartmentFilter;
  departmentId?: number;
  liveDepartmentName?: string;
  pathSlug?: string;
  activePath?: (typeof curatedPaths)[number];
}) {
  return query ||
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
        {/* When the URL carries both a name and an id, the id owns the
            query — rendering the name pill too claimed two departments
            and its remove-link killed the live id filter (needs-work
            10-01). */}
        {activeDepartment !== "all" && departmentId === undefined ? (
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
          className="link-action active-filters__clear"
        >
          Reset all
        </Link>
      </div>
    </section>
  ) : null;
}

// One search form for Explore and ExplorePending — the pending screen
// used to carry a verbatim copy of the submit handler and field JSX, so
// every search-behavior change had to be made twice (devin 09-10
// 12:50 #5).
function ExploreSearchForm({
  query,
  activeDepartment,
  activeDepartmentId,
  withClearControls = false,
}: {
  query: string;
  activeDepartment: ExploreDepartmentFilter;
  activeDepartmentId?: number;
  withClearControls?: boolean;
}) {
  const navigate = useNavigate({ from: "/explore" });
  const [hasInput, setHasInput] = useState(Boolean(query));
  useEffect(() => setHasInput(Boolean(query)), [query]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formInput =
      event.currentTarget.querySelector<HTMLInputElement>('input[name="q"]');
    const submittedQuery = String(formInput?.value ?? "").trim();
    void navigate({
      search: {
        q: submittedQuery || undefined,
        // Only `path` is cleared on submit — a department restriction
        // (chip name or departments-ledger id) persists into the search
        // view (needs-work survey 09-10 19:33 #1; live-search spec
        // 2026-08-13:71).
        department:
          activeDepartmentId !== undefined
            ? undefined
            : activeDepartment === "all"
              ? undefined
              : activeDepartment,
        path: undefined,
        departmentId: activeDepartmentId,
        page: undefined,
      },
    });
  }

  return (
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
            maxLength={120}
            onInput={
              withClearControls
                ? (event) => setHasInput(Boolean(event.currentTarget.value))
                : undefined
            }
            placeholder="Try “van Gogh”, “waves”, or “portraits”"
            type="search"
          />
          {withClearControls ? (
            hasInput ? (
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
            )
          ) : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg">
        Search
      </Button>
    </form>
  );
}
