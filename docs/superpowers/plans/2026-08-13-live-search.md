# Live Explore Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the 33-work Explore first screen, and make typed search plus the four department chips a real, pageable door into The Met’s public-domain, image-backed collection.

**Architecture:** The Met search endpoint returns a full ID list with no offset. Each server call slices one page of 24 IDs and hydrates only that page. The Explore route loader always loads page 1; Load more and shared `?page=n` fill later pages on the client and append. Department chips map to Met department IDs. Fixture mode paginates the curated set and never calls live Met.

**Tech Stack:** TanStack Start server functions, Zod, existing Met adapter, Vitest, Playwright, fixture via `MET_API_MODE=fixture`.

## Global Constraints

- pnpm 10.30.2 only; no new dependencies
- No Convex, auth, database, or second collection source
- Raw Met JSON stops at `src/lib/met/`
- `hasImages=true` and `isPublicDomain=true` on every live search
- Hydrate at most 24 objects per server call; max 4 pages
- URL owns shareable search/filter/`page` state
- Playwright stays on fixtures; do not depend on live upstream in CI
- Read `DESIGN.md` before Explore UI edits; no uniform card crops
- Do not commit unless the owner asks

---

### Task 1: Search paging helpers and public-domain search params

**Files:**
- Modify: `src/lib/met/schemas.ts`
- Modify: `src/lib/met/client.server.ts`
- Modify: `src/lib/met/client.test.ts`

**Interfaces:**
- Produces: `SEARCH_PAGE_SIZE = 24`, `SEARCH_MAX_PAGE = 4`, `sliceSearchPage(ids, page)`, `fetchMetSearchIds` sends `isPublicDomain=true`, schema accepts `objectIDs: null`

- [ ] **Step 1: Write the failing tests** in `src/lib/met/client.test.ts`

Add:

```ts
import { SEARCH_PAGE_SIZE, sliceSearchPage } from "./client.server";

it("treats a null objectIDs list as an empty search", async () => {
  const fetcher: typeof fetch = async () =>
    response({ total: 0, objectIDs: null });
  await expect(fetchMetSearchIds("nope", { fetcher })).resolves.toEqual({
    total: 0,
    objectIds: [],
  });
});

it("requests public-domain image-backed results", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    expect(url.searchParams.get("hasImages")).toBe("true");
    expect(url.searchParams.get("isPublicDomain")).toBe("true");
    return response({ total: 0, objectIDs: [] });
  };
  await fetchMetSearchIds("paintings", { fetcher });
});

it("slices a search ID list into bounded pages", () => {
  const ids = Array.from({ length: 50 }, (_, index) => index + 1);
  expect(sliceSearchPage(ids, 1)).toEqual(ids.slice(0, 24));
  expect(sliceSearchPage(ids, 2)).toHaveLength(SEARCH_PAGE_SIZE);
  expect(sliceSearchPage(ids, 2)[0]).toBe(25);
  expect(sliceSearchPage(ids, 4)).toEqual(ids.slice(72, 96));
  expect(sliceSearchPage(ids, 5)).toEqual([]);
});
```

Update the existing “limits search IDs” test to also expect `isPublicDomain=true`.

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `corepack pnpm exec vitest run src/lib/met/client.test.ts --config vitest.config.ts`

- [ ] **Step 3: Implement**

In `schemas.ts`, change search IDs to:

```ts
objectIDs: z.array(z.number()).nullable().default([]),
```

and in `fetchMetSearchIds` use `parsed.data.objectIDs ?? []`.

Export from `client.server.ts`:

```ts
export const SEARCH_PAGE_SIZE = 24;
export const SEARCH_MAX_PAGE = 4;

export function sliceSearchPage(objectIds: number[], page: number): number[] {
  const safePage = Math.min(Math.max(page, 1), SEARCH_MAX_PAGE);
  const start = (safePage - 1) * SEARCH_PAGE_SIZE;
  return objectIds.slice(start, start + SEARCH_PAGE_SIZE);
}
```

Set `url.searchParams.set("isPublicDomain", "true")`. Keep `hasImages`. Stop slicing inside `fetchMetSearchIds` by `options.limit`; return the full parsed ID list (tests that passed `limit: 3` must switch to `sliceSearchPage` or keep an optional limit for department-without-keyword test — keep `limit` as an optional cap used only by tests, applied after parse).

- [ ] **Step 4: Re-run the client tests and confirm they pass**

Run: `corepack pnpm exec vitest run src/lib/met/client.test.ts --config vitest.config.ts`

---

### Task 2: Page-aware `searchCollection`

**Files:**
- Modify: `src/lib/met/server-functions.ts`
- Create: `src/lib/met/search.test.ts`

**Interfaces:**
- Consumes: `sliceSearchPage`, `SEARCH_PAGE_SIZE`, `departmentIdByName`
- Produces: `searchCollection` accepts `page`, maps review department names to Met IDs, does not post-filter by department name, paginates fixture hits, empty Explore (no q, all departments, no departmentId) still returns all 33

- [ ] **Step 1: Extract a testable search planner** in `server-functions.ts` (or a sibling `search-query.ts` if the server-fn file is already unwieldy):

```ts
export type SearchTrigger = {
  q: string;
  department: string;
  departmentId?: number;
  page: number;
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
```

Test those two functions plus fixture paging: when 33 curated works match, page 1 has 24 and page 2 has 9.

- [ ] **Step 2: Extend the server fn input**

```ts
page: z.number().int().min(1).max(4).default(1),
```

Live branch:

```ts
const search = await fetchMetSearchIds(q, { departmentId: resolvedDepartmentId(...) });
const pageIds = sliceSearchPage(search.objectIds, page);
const artworks = await fetchMetObjects(pageIds, { concurrency: 4 });
```

Remove the `hydrated.filter((artwork) => artwork.department === department)` branch.

Fixture branch: filter curated as today, then `sliceSearchPage` on the matching IDs / artworks when `isLiveCollectionSearch` is true. `total` is the unpaged match count. Empty Explore (`!isLiveCollectionSearch`) returns all 33, `source: "curated"`.

- [ ] **Step 3: Unit tests in `src/lib/met/search.test.ts`** for planner + a direct test of curated pagination helper if extracted (`pageCuratedArtworks(artworks, page)`).

- [ ] **Step 4: Run** `corepack pnpm exec vitest run src/lib/met --config vitest.config.ts`

---

### Task 3: Explore UI — live copy, department heading, Load more, path isolation

**Files:**
- Modify: `src/routes/explore.tsx`
- Modify: `src/styles.css` (Load more row only if needed)
- Modify: `tests/journey.spec.ts`

**Interfaces:**
- Consumes: `searchCollection` with `page`; `SEARCH_MAX_PAGE`, `SEARCH_PAGE_SIZE`
- Search params: existing + `page: z.coerce.number().int().min(1).max(4).optional()`
- Loader deps: `q`, `department`, `departmentId` — **not** `page` (page 1 only in the loader)

- [ ] **Step 1: Search param + submit**

On submit and department change, omit `path` when the navigation is a live search. Reset `page` to undefined. `useSearch` reads `page`.

Heading uses `activeDepartment !== "all" ? activeDepartment : liveDepartmentName`.

- [ ] **Step 2: Appended pages**

```tsx
const page = Math.min(Math.max(search.page ?? 1, 1), 4);
const [extra, setExtra] = useState<Artwork[]>([]);
const requestKey = `${query}|${activeDepartment}|${departmentId ?? ""}`;

useEffect(() => {
  setExtra([]);
}, [requestKey]);

useEffect(() => {
  let cancelled = false;
  async function fill() {
    const loaded = extra.length / SEARCH_PAGE_SIZE + 1;
    if (page <= 1 || loaded >= page) return;
    const nextPage = loaded + 1;
    const next = await searchCollection({
      data: {
        q: query,
        department: activeDepartment,
        departmentId,
        page: nextPage,
      },
    });
    if (!cancelled && next.artworks.length > 0) {
      setExtra((current) => [...current, ...next.artworks]);
    }
  }
  void fill();
  return () => {
    cancelled = true;
  };
}, [page, requestKey, extra.length, query, activeDepartment, departmentId]);
```

Keep this effect from looping: fill one missing page per run until `extra` covers `page`, or fetch pages 2..page sequentially in one effect when `requestKey`/`page` changes (preferred, simpler).

Preferred fill:

```tsx
useEffect(() => {
  let cancelled = false;
  setExtra([]);
  if (page <= 1) return;

  async function fillRemaining() {
    const collected: Artwork[] = [];
    for (let nextPage = 2; nextPage <= page; nextPage += 1) {
      const next = await searchCollection({
        data: { q: query, department: activeDepartment, departmentId, page: nextPage },
      });
      if (cancelled) return;
      collected.push(...next.artworks);
      setExtra([...collected]);
    }
  }
  void fillRemaining();
  return () => {
    cancelled = true;
  };
}, [page, query, activeDepartment, departmentId]);
```

Works shown = `result.artworks` + `extra` when there is no active path. Paths: if `path` is set, ignore extra and keep filtering `result.artworks` against the path IDs (review set only).

- [ ] **Step 3: Load more control**

Show when `result.source === "met" || (fixture live search && total > works.length)` AND `works.length < total` AND `page < 4`.

Button: `Load 24 more` (or `Load {remaining} more` if remaining < 24). `aria-busy` while filling. On click, `navigate({ search: { ..., page: page + 1 } })`.

At cap with remaining hits, a short note: “This view stops at 96 records. Narrow the search to look further.”

- [ ] **Step 4: Playwright**

Keep existing empty / path / van Gogh tests.

Add:

```ts
test("Live-shaped Explore search can load another page", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("searchbox", { name: "Search the collection" }).fill("e");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=e/);
  const initial = await page.locator(".artwork-card").count();
  expect(initial).toBe(24);
  await page.getByRole("button", { name: /Load .* more/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".artwork-card")).not.toHaveCount(initial);
});
```

If `"e"` does not match 25+ curated works, pick a letter that does (count in `curated-artworks.ts` first). Department-chip test: `/explore?department=European+Paintings` still shows works in fixture (review works, possibly paginated if >24 — European Paintings curated count is under 24, so no Load more).

Update the Home Asian Art test if the heading becomes “Asian Art” instead of “Explore the collection.”

- [ ] **Step 5: Verify**

```text
corepack pnpm typecheck
corepack pnpm check
corepack pnpm test
CI=1 corepack pnpm exec playwright test
corepack pnpm build
```

Port 3180 must be free for Playwright (`reuseExistingServer: !CI`). Restart `corepack pnpm dev` afterward.

---

## Spec coverage

- First screen curated 33 → Task 2 empty-explore branch, Task 3 no Load more
- Live q / chips / departmentId → Task 2 `isLiveCollectionSearch`
- public domain + images → Task 1
- Honest totals + Load more + page cap → Task 2–3
- Paths do not intersect live → Task 3 clears `path` on live navigation
- objectIDs null → Task 1
- Fixture pagination / Playwright → Task 2–3
