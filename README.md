# Meet the Met

An independent Open Access collection explorer, being rebuilt from a 2023
class project into a production-quality design and engineering case study.

## Current status

The original ASP.NET Core MVC implementation is preserved in Git at commit
`6164b92` and by the local `legacy-2023` tag. The active local `redesign`
branch currently contains the rebuild plan and design contract; the TanStack
application has not been scaffolded yet.

The intended public experience is:

1. Enter through one featured artwork.
2. Explore The Met collection through search or a curated path.
3. Read a complete, image-led artwork page.
4. Save a few works into a local, temporary Selection.

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
