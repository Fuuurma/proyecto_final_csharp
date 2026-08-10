# Meet the Met — Design Contract

## Direction

**The contemporary collection ledger.**

Meet the Met should feel like a modern museum reading room: quiet, precise,
image-led, tactile without nostalgia, and editorial without becoming precious.
The memorable quality is the tension between monumental artwork and compact,
catalog-like metadata.

This is not a clone of The Met website and not a generic gallery template. It
is an independent lens on Open Access collection data.

## Product feeling

- Calm enough to spend time looking.
- Precise enough to trust the metadata.
- Curious rather than authoritative.
- Contemporary rather than luxury-fashion coded.
- Respectful of the artwork rather than decorative around it.

## Color

Final accessible values are locked during implementation, but roles are fixed:

- **Paper:** warm near-white page field.
- **Ink:** near-black primary text and structure.
- **Archive:** cool-to-neutral gray for secondary metadata.
- **Museum red:** one controlled accent for active state, selection feedback,
  and a small number of navigational moments.
- **Image field:** may use true black when an artwork benefits from visual
  isolation.

No purple/blue gradients, glass effects, glowing borders, or multi-accent UI.
Color should never compete with collection images.

## Typography

- Editorial serif: artwork titles, display moments, selected quotations.
- Neutral grotesk: navigation, body copy, controls, and accessible reading.
- Mono: accession numbers, object IDs, compact coordinates/index labels only.
- Use responsive type with deliberate line lengths; long artwork titles must
  wrap gracefully without shrinking to illegibility.
- Metadata labels are concise and sentence case. Avoid decorative all-caps
  everywhere.

The final font pair must be licensed for web use, load efficiently, and retain
distinctive italic and numeral forms.

## Layout

- Artwork is the dominant geometry.
- Preserve original image proportions; grids may vary row rhythm rather than
  forcing uniform thumbnails.
- Use hairline rules, baseline alignment, and consistent page margins as the
  primary structure.
- Prefer open editorial compositions over nested cards.
- Metadata can be dense, but labels and values need stable alignment.
- At wide viewports, image and metadata may occupy separate reading columns.
- At mobile widths, the image comes first and actions remain reachable without
  sticky clutter.

## Core surfaces

### Home

- One featured object, not an autoplay slideshow.
- Product premise visible without scrolling.
- One primary action: explore the collection.
- Three curated paths represented by real objects and honest descriptions.
- A small provenance cue connects the 2023 origin to the current rebuild.

### Explore

- Search and filters are tools, not a marketing hero.
- Query/filter state is visible and encoded in the URL.
- Results preserve image ratios and remain scannable across mixed portrait,
  landscape, and object photography.
- Loading uses stable geometry; empty and partial-result states explain what
  happened and offer a useful next action.

### Artwork detail

- Start with the artwork, title, maker, and date.
- Present medium, dimensions, culture, period, department, accession number,
  and rights without pretending all fields exist.
- Link clearly to the canonical Met record.
- Related navigation follows real metadata, not invented recommendations.

### Selection

- A compact tray confirms saved works without blocking the current object.
- The full Selection reads like a temporary personal room or viewing list.
- Local-only persistence is stated plainly.
- Remove, reorder, and clear actions require obvious feedback and keyboard
  support; clear-all requires confirmation when the collection is non-empty.

## Motion

- Use opacity and transform for image/metadata reveals and selection feedback.
- Route transitions should be quiet and quick.
- Image loading must not masquerade as decorative animation.
- No autoplay carousel or continuous ambient movement.
- Respect `prefers-reduced-motion`; the static composition must remain complete.

## States that must be designed

- Initial loading and subsequent search loading
- No search results
- Some object details failed while other results loaded
- Upstream API unavailable or timed out
- Artwork without an image
- Missing artist/date/culture/dimensions
- Empty Selection
- Saved, duplicate-save, removed, and clear-confirmation feedback
- Offline revisit where only local Selection metadata remains
- Keyboard focus, hover, active, disabled, and reduced-motion variants

## Accessibility and image rules

- Semantic landmarks and heading order are mandatory.
- Search, filters, drawers, and dialogs are fully keyboard operable.
- Focus indicators use a high-contrast system token and are never removed.
- Decorative imagery uses empty alt text; artwork images use concise title and
  maker context without pretending to visually describe the work.
- Do not use color alone for selected/filter/error state.
- Reserve image space to prevent layout shift.
- Grid/detail sources use the smallest appropriate image and lazy-load below
  the fold.

## Anti-patterns

- Generic rounded card grids
- Excessive badges or pills for metadata
- Huge type that leaves no room for the artwork
- Fake museum quotes, visitor counts, events, tickets, or membership CTAs
- Random homepage identity that changes on every request
- Cropping every work to the same rectangle
- Motion on every element
- Treating shadcn defaults as a finished visual system

## Review viewports

- 375px mobile
- 768px tablet
- 1440px desktop
- Wide art-display viewport at or above 1920px

The implementation is not visually complete until the same real artwork set
has been reviewed at all four sizes.
