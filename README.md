# Meet the Met

An independent Open Access collection explorer, being rebuilt from a 2023
class project into a production-quality design and engineering case study.

## Current status

The original ASP.NET Core MVC implementation is preserved in Git at commit
`6164b92` and by the local `legacy-2023` tag. The active local `redesign`
branch now contains a responsive editorial home, deterministic Explore review
set, four URL-addressable curated paths, a Departments index, image-led
artwork detail views, local Selection with reorder, live Met search/detail
loaders, shadcn Base UI primitives, and a Playwright journey on desktop and
mobile.

The intended public experience is:

1. Enter through one featured artwork.
2. Explore The Met collection through search, a curated path, or a department.
3. Read a complete, image-led artwork page.
4. Save a few works into a local, temporary Selection.

The supporting About and Departments surfaces keep the Open Access source,
image policy, and local-only Selection behavior explicit. Detail pages also
provide previous and next movement through the bounded review set, while every
object remains linked to its canonical museum record. If a saved object cannot
be fetched again, Selection still holds a local snapshot in this browser.

## Target stack

- TanStack Start, React 19, TypeScript 7, and Vite 8
- Tailwind CSS v4 with selectively copied shadcn/ui primitives
- Motion for React
- The Metropolitan Museum of Art Open Access API
- Cloudflare Workers
- Vitest, Testing Library, and Playwright
- pnpm 10.30.2

There is intentionally no application database, authentication, payment
system, or separate API server in the first release.

## Local development

This repository uses pnpm 10.30.2. Start the app at
`http://127.0.0.1:3180`:

```text
corepack pnpm install
corepack pnpm dev
```

The preview port is `4180`; direct Wrangler development uses `4480`.

Useful checks:

```text
corepack pnpm typecheck
corepack pnpm check
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
corepack pnpm deploy:check
```

The current UI review set is committed in
`src/data/curated-artworks.ts`, using 33 public-domain Met object IDs across
paintings, prints, drawings, photographs, and books. Empty
Explore loads use that deterministic set; typed searches and the four
department chips query The Met for public-domain, image-backed works, hydrate
one page of 24, and can load up to four pages. The server-only Met adapter in
`src/lib/met/` uses bounded hydration, timeouts, partial-failure tolerance, and
normalized records. Browser tests set
`MET_API_MODE=fixture` so CI never depends on upstream availability; omit
that variable for live local searches.

## Project documents

- [`AGENTS.md`](AGENTS.md) — repository rules and source-of-truth order
- [`DESIGN.md`](DESIGN.md) — visual and interaction contract
- [`docs/REBUILD-PLAN.md`](docs/REBUILD-PLAN.md) — architecture, migration
  phases, acceptance criteria, and portfolio integration

## Attribution and independence

This is an educational portfolio project and is not an official Metropolitan
Museum of Art product. Artwork data and available public-domain imagery come
from The Met Open Access API. Every artwork page must link back to its canonical
Met object page and represent rights metadata honestly.
