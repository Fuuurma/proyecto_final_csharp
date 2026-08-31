# Meet the Met — Agent Instructions

<!-- fuurma-hub-start -->
## Fuurma Hub Context

This repo is one project inside the Fuurma portfolio workspace. The planner hub
is the source of truth for cross-project priorities, reusable stack decisions,
ports, deploy/auth notes, and agent handoffs.

Before meaningful work, read:
1. Kanban status: `~/Projects/hub/BOARD.md`
2. Current sprint / next work: `~/Projects/hub/WORK.md`
3. This project's state: `~/Projects/hub/projects/meet-the-met.md`
4. Standard stack playbook: `~/Projects/hub/tech-stack/STACK-STANDARDS.md`
5. Agent skills/context: `~/Projects/hub/tech-stack/AGENT-CONTEXT.md`
6. Design arsenal: `~/Projects/hub/design/README.md` + `~/Projects/hub/design/APPLY.md`

Fleet findings for this repo land in `~/Projects/hub/research/{devin,needs-work,grok}/`
and are appended to `~/Projects/hub/research/FEED.md`. Check FEED.md before starting
work to see if a critic already found something relevant.

Operational rules:
- Run `git status --short --branch` before editing and protect dirty user/agent work.
- Product repo code/tests are the immediate truth; when they disagree with the hub, update the hub after verifying.
- After reading the hub pointers, keep reading this file's repo-local instructions; they are the authority for this codebase.
- When you learn a reusable pattern, fix, or project-state change, update `~/Projects/hub` so the next agent starts stronger.
<!-- fuurma-hub-end -->

This repository is the rebuild of Sergi's 2023 ASP.NET Core class project into
an independent Open Access collection explorer and a furma.design case study.

## Source of truth

Use this order when instructions disagree:

1. Current code and tests on the active branch.
2. This file.
3. `DESIGN.md` for visual and interaction decisions.
4. `docs/REBUILD-PLAN.md` for migration scope and sequencing.
5. The hub standards in `~/Projects/hub/tech-stack/` and the design
   arsenal in `~/Projects/hub/design/` (`APPLY.md` when touching UI).
6. Current official framework and provider documentation.
7. Model memory.

## Legacy boundary

- Commit `6164b92` is the original 2023 ASP.NET Core MVC implementation.
- Local tag `legacy-2023` identifies that baseline. Do not move or delete it.
- Remote `master` and `main` are historical state. Do not force-push, delete,
  merge, or rename remote branches without Sergi's approval.
- The active rebuild branch is `redesign` until the owner chooses the final
  default-branch strategy.
- Preserve the old work through Git history; do not carry legacy architecture
  into the new app merely to avoid replacing it.

## Product boundary

Build the smallest complete public journey:

```text
Home → Explore → Artwork detail → Save → Selection
```

Departments and provenance/about are part of the release only after that loop
works. No accounts, shared collections, editorial CMS, payments, or user data
belong in the first release.

## Target stack

- pnpm 10.30.2 only
- TanStack Start + Router
- React 19 + TypeScript 7 strict
- Vite 8
- Tailwind CSS v4
- shadcn/ui only as copied primitives, restyled to `DESIGN.md`
- Motion for React where motion improves hierarchy or feedback
- native `fetch` through a server-only Met API adapter
- Zod at external-data and user-input boundaries
- TanStack Query only for direct live Met API state when route loaders/server
  functions do not already own the lifecycle
- Vitest + Testing Library + Playwright
- Biome
- Cloudflare Workers through the Cloudflare Vite plugin and Wrangler

Do not add Convex, Better Auth, Stripe, SES, a C# proxy, another database, or a
second source of truth without a written product requirement and owner choice.

## Fixed local ports

- App: `http://127.0.0.1:3180`
- Preview: `http://127.0.0.1:4180`
- Wrangler: `4480`

Dev scripts must bind to `127.0.0.1` and fail if the assigned port is occupied.

## Planned application shape

```text
src/
├── components/
│   ├── artwork/
│   ├── explore/
│   ├── selection/
│   └── ui/
├── data/
│   └── curated-artworks.ts
├── lib/
│   ├── met/
│   │   ├── client.server.ts
│   │   ├── schemas.ts
│   │   ├── normalize.ts
│   │   └── fixtures/
│   └── selection.ts
├── routes/
└── styles/
```

Follow generated TanStack route conventions once the app is scaffolded. Keep
server-only modules out of client bundles.

## The Met API rules

- Raw API JSON stops at `src/lib/met/`; components consume normalized types.
- Treat missing artist, date, culture, period, dimensions, and images as normal
  collection states.
- Use `primaryImageSmall` in grids and `primaryImage` only where the larger
  asset is justified.
- Search returns IDs. Hydrate only a bounded page, limit concurrency, use
  timeouts, and tolerate partial failures.
- Curated homepage objects must be image-backed, public-domain, deterministic,
  and represented by committed object IDs.
- Use caching appropriate to the surface: long-lived for departments/curated
  objects, shorter for arbitrary search.
- Every detail route links to the canonical Met object page.
- Never imply official affiliation with The Met.

## UI implementation rules

- Read `DESIGN.md` before changing UI.
- Use semantic HTML, visible focus, keyboard-operable controls, honest empty /
  loading / error states, reduced motion, and resilient responsive layouts.
- Preserve artwork aspect ratios. Do not force a uniform card crop.
- URL search params own shareable search/filter state.
- localStorage owns Selection only; label it as local to this browser.
- Avoid autoplay carousels, generic SaaS cards, ornamental gradients, glass
  surfaces, excessive rounded corners, and decorative motion.
- shadcn is scaffolding, not the visual identity. Invoke the shadcn skill and
  inspect project info before adding components.

## Verification

Before calling a slice complete, run the repository equivalents of:

```text
pnpm typecheck
pnpm check
pnpm test
pnpm build
pnpm exec playwright test
pnpm deploy:check
```

The deterministic browser journey is Home → Explore → detail → Save →
Selection on desktop and mobile. CI browser tests should use fixtures rather
than depend on live upstream availability.

## External actions

Do not push, deploy, rename the GitHub repository, change remote branches, or
publish the furma.design case study without Sergi's approval.
