# Meet the Met Rebuild Plan

## Objective

Turn the original 2023 class project into a complete, reliable collection
explorer and use the transformation as a primary furma.design case study.

The product must stand on its own before portfolio integration. The case study
is evidence of the work, not a substitute for a working application.

## Baseline

The legacy app is ASP.NET Core MVC on .NET 7 with Razor and Bootstrap. It calls
The Met Open Access API for:

- nine works across three hard-coded artists on Home;
- ten random highlighted works on Art;
- one random work from each hard-coded department ID on Collections.

The core idea is valid. The current implementation has request waterfalls,
dynamic JSON and ViewBag indexing, duplicated data shapes, hard-coded content,
placeholder sections, dead links, no detail route, weak responsive behavior,
and no test or deployment proof.

## Architecture decision

Use one TanStack Start application deployed to Cloudflare Workers.

```text
Browser routes and URL state
        │
        ├── curated object manifest
        │       └── deterministic Home and case-study captures
        │
        └── TanStack Start server adapter
                ├── Zod validation
                ├── normalized Artwork model
                ├── timeout and bounded concurrency
                ├── cache policy
                └── The Met Open Access API

Browser localStorage
        └── temporary Selection only
```

### Why no backend database

The Met owns the source collection data and the first release owns no user
account data. Convex would create a second source of truth without improving
the live slice. Add persistence only if a later requirement needs shared or
cross-device collections, notes, or editorial curation.

### Why TypeScript instead of continuing C#

- It matches the active Furma stack and deployment path.
- The app is a frontend-heavy external-data experience, not a domain backend.
- Shared TypeScript types, Zod schemas, route loaders, and React components
  reduce integration boundaries.
- The original C# remains visible as provenance rather than becoming hidden
  dead weight behind a proxy.

## Internal data contracts

Define one normalized `Artwork` model with at least:

- object ID and accession number;
- title;
- maker/artist display name and role;
- date, culture, period, dynasty/reign when present;
- medium and dimensions;
- department and classification;
- primary small/full images and additional images;
- public-domain and rights/credit fields;
- canonical object URL;
- tags or object name where useful for related navigation.

Define separate schemas for search IDs and departments. API response types do
not cross into UI components.

## Request strategy

- Home uses committed curated IDs and long-lived cached object responses.
- Departments use the live department endpoint and long-lived caching.
- Explore search requests a bounded ID set, hydrates one page with limited
  concurrency, and tolerates individual object failures.
- Artwork detail fetches one object and has an explicit not-found/upstream-error
  distinction.
- Search is debounced and URL-driven. A new query cancels obsolete work.
- Browser and Worker caching are expressed deliberately with
  `Cache-Control`/`stale-while-revalidate` where supported.
- Deterministic fixtures cover CI and visual smoke; live API checks are a
  separate optional integration test.

## Route plan

| Route | Job | Release priority |
|---|---|---:|
| `/` | Featured object, premise, curated paths | P0 |
| `/explore` | Search/filter and result field | P0 |
| `/art/$objectId` | Complete artwork reading view | P0 |
| `/selection` | Local saved works | P0 |
| `/departments` | Live collection departments | P1 |
| `/about` | Provenance, credits, independence | P1 |

## Phases

### 0. Preserve and document

- Keep commit `6164b92` and local tag `legacy-2023` immutable.
- Work on local branch `redesign`.
- Capture legacy desktop/mobile screenshots if a compatible runtime can be
  established without distorting the source.
- Decide the remote branch/default-branch/rename operation only when the new
  build is ready; it requires owner approval.

### 1. Scaffold

- Replace the application working tree on `redesign` with TanStack Start.
- Configure pnpm 10.30.2, strict TypeScript, Tailwind v4, Biome, Vitest,
  Playwright, Cloudflare Vite plugin, Wrangler, and fixed ports.
- Run current project-info/generated-guidance commands before framework edits.
- Establish semantic design tokens from `DESIGN.md`.

Exit: empty shell builds, tests, and passes Worker dry-run.

### 2. Prove the external-data layer

- Add schemas, normalized models, fixtures, error taxonomy, and server adapter.
- Implement departments, object detail, and bounded search hydration.
- Add deterministic curated object IDs.
- Test missing metadata, no image, timeout, malformed payload, partial search,
  and not-found behavior.

Exit: API contract is fully usable without UI-specific data repair.

### 3. Build the live loop

- Build Home.
- Build URL-driven Explore.
- Build artwork detail.
- Build Selection storage, tray, and full page.
- Add responsive navigation and feedback states.

Exit: Playwright completes Home → Explore → detail → Save → Selection with
fixtures on desktop and mobile.

### 4. Refine the experience

- Tune typography, artwork sizing, grid rhythm, metadata density, focus, and
  reduced motion across target viewports.
- Add departments and provenance/about.
- Audit long titles, mixed ratios, missing images, slow API, partial results,
  empty Selection, and local persistence boundaries.
- Capture approved before/after and process images.

Exit: design review and accessibility/performance pass are complete.

### 5. Release

- Complete README with architecture, setup, status, attribution, screenshots,
  and legacy explanation.
- Pass typecheck, Biome, unit tests, build, deterministic Playwright, and
  Wrangler dry-run.
- With owner approval: push the rebuild branch, decide branch migration, rename
  the repository if desired, deploy preview, and smoke the public URL.

Exit: a public, tested product URL exists.

### 6. Integrate with furma.design

- Add **Meet the Met — then and now** as the primary design narrative.
- Show the original respectfully and describe what the early version taught.
- Document diagnosis, information architecture, API constraints, image system,
  iterations, interaction choices, accessibility, and outcomes.
- Link to the live product and source.
- Add a furma.tech entry only if it tells a materially different technical
  story.

## Release acceptance

- The P0 route journey is coherent and public.
- The experience handles slow, missing, malformed, partial, and unavailable
  upstream data without crashing or lying.
- Search/filter state is shareable by URL.
- Selection is usable and clearly local-only.
- Artwork aspect ratio, metadata gaps, rights, credit, and canonical links are
  correct.
- Keyboard, focus, contrast, reduced motion, and target viewports are verified.
- No placeholder copy, dead action, invented museum service, random homepage
  identity, or false official affiliation remains.
- All local quality gates and Worker dry-run pass.
- Git history and the legacy reference remain intact.

## Deferred deliberately

- Accounts and cross-device sync
- Shared/public collections
- User notes or comments
- CMS/editorial backend
- AI-generated curation
- Payments, donations, tickets, events, or membership
- Native mobile app
- Full offline collection data

These are not scaffolded until a real product requirement proves them.
