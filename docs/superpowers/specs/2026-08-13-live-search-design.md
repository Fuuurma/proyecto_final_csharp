# Live Explore search

Date: 2026-08-13
Status: approved

## Problem

Empty Explore is a 33-object review set. That is correct for the case study.
Typed search already calls The Met, but it feels unfinished: one page of 24,
department chips filter the review set by name (and can empty a live result),
curated paths intersect live hits, totals are easy to misread, and
`objectIDs: null` from The Met is not treated as an empty result.

## Goal

Keep the 33 as the first Explore screen. Make query + the four department
chips the door into the Open Access collection: public-domain, image-backed,
honest totals, Load more up to four pages.

## Non-goals

- Mirroring or storing the full collection
- Infinite scroll
- Debounced as-you-type search
- Replacing `/departments` or the four chips with the full department list
- Changing Home’s featured object or the committed review IDs

## Behavior

### First screen

`/explore` with no `q`, no department chip, no `departmentId`: the 33
curated works. Copy still says the first view is curated.

### Live search

Any of these switches to The Met:

- a non-empty `q`
- a department chip other than All works
- a `departmentId` from `/departments`

Live requests always send `hasImages=true` and `isPublicDomain=true`.
Department chips map to Met IDs (European Paintings 11, Asian Art 6,
Drawings and Prints 9, Photographs 19) and are sent as `departmentId`.
Do not post-filter hydrated objects by department name.

Heading: the department name when a chip or `departmentId` is active;
otherwise “Explore the collection.”

Count: `24 / 1204 matches loaded` (loaded count / `search.total`).
Curated/fixture review views keep `review works`.

### Load more

The Met search endpoint returns the full ID list and has no offset.
Each server call hydrates at most 24 objects (Worker subrequest budget).

- `page` is a URL search param, default 1, max 4
- The route loader always hydrates page 1
- Load more calls the same server function for `page + 1` and appends
- The URL updates to the new `page` without replacing the grid
- A shared `?page=3` link paints page 1, then the client fills pages 2–3
- Hide Load more when `loaded >= total` or `page >= 4`
- At the cap, say the index is bounded on purpose

Page size 24. Max 96 objects on one Explore view.

### Curated paths

Paths only filter the review set. Submitting a live query or choosing a
department chip clears `path`. Path-only Explore is unchanged (e.g. 3 / 3
review works).

### Empty, partial, error

- Zero hits: existing quiet-index empty state
- Some object hydrations fail: partial alert, show what loaded
- Upstream timeout/unavailable: existing collection-unavailable state
- `objectIDs: null` is an empty list, not an invalid payload

### Fixture / CI

`MET_API_MODE=fixture` still uses the curated set, never live Met.
Paginate fixture hits the same way (24 per page) so Load more can be tested
without upstream. Empty query + All works remains the full 33, not paginated.

## Architecture

```text
URL (q, department, departmentId, page, path)
        │
        ├── no live trigger → curated 33
        └── live trigger → search IDs (public domain, images, optional dept)
                              → slice page → hydrate ≤24
```

Client holds appended pages. Loader never hydrates more than 24 in one
request.

## Tests

- Search URL includes `isPublicDomain=true` and `hasImages=true`
- Department name maps to `departmentId`
- ID list slicing for pages 1–4
- `objectIDs: null` parses as empty
- Playwright: empty Explore still 33; path chips unchanged; van Gogh search
  still works; Load more appears for a fixture query with more than 24 hits
  and appends cards; department chip does not require a keyword

## Out of scope follow-ups

- Cache the ID list across Load more calls
- Search-as-you-type
- Raising the four-page cap
