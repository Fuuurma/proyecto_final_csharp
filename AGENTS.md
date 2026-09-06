<!-- fuurma-hub-start -->
## Fuurma Hub Context

This repo is one project inside the Fuurma portfolio workspace. The hub
is the source of truth for cross-project priorities, reusable stack decisions,
ports, deploy/auth notes, and agent handoffs.

Before meaningful work, read:
1. Kanban status: `~/Projects/hub/BOARD.md`
2. Current sprint / next work: `~/Projects/hub/WORK.md`
3. This project's state: `~/Projects/hub/projects/meet-the-met.md`
4. Standard stack playbook: `~/Projects/hub/tech-stack/STACK-STANDARDS.md`
5. Agent skills/context: `~/Projects/hub/tech-stack/AGENT-CONTEXT.md`
6. Design arsenal: `~/Projects/hub/design/README.md` + `~/Projects/hub/design/APPLY.md`

Use the deeper hub docs when relevant:
- Auth/OAuth: `~/Projects/hub/tech-stack/AUTH-OAUTH.md`
- Forms: `~/Projects/hub/tech-stack/TANSTACK-FORM.md`
- Deploy/launch: `~/Projects/hub/tech-stack/SHIP-KIT.md`
- Ports: `~/Projects/hub/tech-stack/PORTS.md`
- Secrets/accounts: `~/Projects/hub/tech-stack/ACCOUNTS-SECRETS.md`
- Fleet findings: `~/Projects/hub/research/FEED.md`
- Per-finding ledger (if promoted): `~/Projects/hub/projects/meet-the-met/LEDGER.md`

Operational rules:
- Run `git status --short --branch` before editing and protect dirty user/agent work.
- Product repo code/tests are the immediate truth; when they disagree with the hub, update the hub after verifying.
- After reading the hub pointers, keep reading this file's repo-local instructions; they are the authority for this codebase.
- When you ship a fix from a fleet finding, update the project's LEDGER.md (not just WORK.md).
- When you learn a reusable pattern, fix, or project-state change, update `~/Projects/hub` so the next agent starts stronger.

### Agent skills and generated guidance

When one of these global skills matches your work, **invoke it immediately** at the start of the session:
- `design-arsenal` — UI/UX. Front door `~/Projects/hub/design/README.md`. How it lands here: `~/Projects/hub/design/APPLY.md`. Then `design-taste-frontend`, `hallmark`, `impeccable`. Repo `DESIGN.md` wins.
- `shadcn` — adding, fixing, or reviewing shadcn/ui components and Tailwind v4 styling.
- `convex` — routing Convex work to the right helper skill (quickstart, auth, components, migrations, performance audit).
- `stripe-best-practices` — checkout, billing, subscriptions, webhooks, Connect, key handling.
- `workers-best-practices` / `durable-objects` / `cloudflare` — Cloudflare Workers, Wrangler, bindings, Durable Objects, Agents SDK.
- `cloudflare-email-service` / `turnstile-spin` — when adding those services.

For Convex repos, run `pnpm exec convex ai-files install` first if
`convex/_generated/ai/guidelines.md` is missing or stale.

For UI work, use `pnpm dlx shadcn@latest` and follow the `shadcn` skill rules
(no `space-x/y`, use `gap-*`, `size-*`, `cn()`, semantic tokens, lucide icons,
`FieldGroup`/`Field`, etc.).

For TanStack Start/Router/Form, there is no global skill; follow `STACK-STANDARDS.md`, `CONVENTIONS.md`, and `TANSTACK-FORM.md`. Use TanStack Form for every new form and every touched legacy form.

For Better Auth, follow `AUTH-OAUTH.md` exactly.
<!-- fuurma-hub-end -->


# Meet the Met — Agent Instructions

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

Build the smallest complete public journey: Home → Explore → Artwork detail →
Save → Selection. Departments and provenance/about come only after that loop
works. No accounts, shared collections, editorial CMS, payments, or user data
in the first release.

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
