import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { ArtworkCard } from "@/components/artwork-card";
import { ArtworkImage } from "@/components/artwork-image";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CloseIcon,
  ExpandIcon,
  ShareIcon,
} from "@/components/icons";
import { SaveButton } from "@/components/save-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedArtworks } from "@/data/curated-artworks";
import { isReviewDepartmentName } from "@/data/departments";
import type { Artwork } from "@/lib/met/normalize";
import {
  type ArtworkDetailResult,
  getArtwork,
} from "@/lib/met/server-functions";
import { getRelatedArtworks } from "@/lib/related";
import { artworkFromSelectionItem, useSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/art/$objectId")({
  head: ({ loaderData }: { loaderData?: ArtworkDetailResult }) => {
    const meta: Array<Record<string, string>> = [
      { title: "Object unavailable — Meet the Met" },
      {
        name: "description",
        content:
          "This collection object could not be loaded from the Met Open Access API.",
      },
    ];

    if (loaderData && loaderData.status === "success") {
      const art = loaderData.artwork;
      const title = `${art.displayTitle}${art.artist ? ` — ${art.artist}` : ""} — Meet the Met`;
      const description = `${art.displayTitle}${art.artist ? ` by ${art.artist}` : ""}${art.date ? `, ${art.date}` : ""}. ${art.medium ?? "Collection object"} from The Metropolitan Museum of Art Open Access collection.`;
      const ogImage = art.primaryImage ?? art.primaryImageSmall;

      meta.length = 0;
      meta.push(
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      );
      if (ogImage) {
        meta.push({ property: "og:image", content: ogImage });
      }
    }

    return { meta };
  },
  loader: ({ params }) => {
    // Non-numeric slugs (/art/abc) are a wrong address, not a validator
    // error — 404 instead of surfacing the Zod failure through RouteError
    // (devin 09-09 16:57 #1).
    const objectId = Number(params.objectId);
    if (!Number.isInteger(objectId) || objectId <= 0) {
      throw notFound();
    }
    return getArtwork({ data: { objectId } });
  },
  pendingComponent: ArtworkDetailPending,
  component: ArtworkDetail,
});

function ArtworkDetail() {
  const result = Route.useLoaderData();
  const { objectId } = Route.useParams();
  const navigate = useNavigate();

  const artwork = result?.status === "success" ? result.artwork : null;
  const adjacent = artwork
    ? getAdjacentArtworks(artwork)
    : { previous: null, next: null, position: 0, total: 0 };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        ) ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      // An open dialog owns the keyboard — navigating underneath it
      // unmounted the artwork being inspected (devin 09-09 19:37 #1).
      if (document.querySelector("[role='dialog']")) {
        return;
      }

      if (event.key === "ArrowLeft" && adjacent.previous) {
        event.preventDefault();
        void navigate({
          from: "/art/$objectId",
          to: "/art/$objectId",
          params: { objectId: String(adjacent.previous.id) },
        });
      } else if (event.key === "ArrowRight" && adjacent.next) {
        event.preventDefault();
        void navigate({
          from: "/art/$objectId",
          to: "/art/$objectId",
          params: { objectId: String(adjacent.next.id) },
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adjacent.previous, adjacent.next, navigate]);

  if (!result || result.status === "error" || !artwork) {
    const message =
      result && result.status === "error"
        ? result.message
        : "The object record could not be loaded.";
    return <ArtworkUnavailable objectId={Number(objectId)} message={message} />;
  }

  const related = getRelatedArtworks(artwork, curatedArtworks);
  // Deduped: a live object whose additionalImages repeat the primary
  // would otherwise yield duplicate tab keys (devin 09-09 23:37 #7).
  const imageSources = [
    ...new Set(
      [
        artwork.primaryImage ?? artwork.primaryImageSmall,
        ...artwork.additionalImages,
      ].filter((source): source is string => Boolean(source)),
    ),
  ];

  return (
    <main className="detail-page">
      <div className="page-frame detail-page__topline">
        <Link to="/explore" className="text-link">
          <ArrowLeftIcon /> Back to Explore
        </Link>
        <div className="detail-page__topline-meta">
          {adjacent.previous ? (
            <span className="cue-inline" aria-hidden="true">
              <kbd className="cue-key">←</kbd>
            </span>
          ) : null}
          <span className="mono">
            Object {artwork.id}
            {adjacent.total > 0 ? (
              <span className="detail-page__position">
                {" "}
                · {String(adjacent.position).padStart(2, "0")} /{" "}
                {String(adjacent.total).padStart(2, "0")}
              </span>
            ) : null}
          </span>
          {adjacent.next ? (
            <span className="cue-inline" aria-hidden="true">
              <kbd className="cue-key">→</kbd>
            </span>
          ) : null}
        </div>
      </div>

      <section
        className="detail-layout page-frame"
        aria-labelledby="artwork-title"
      >
        <div className="detail-image-column">
          {/* Remount per object: ArtworkStage holds activeSrc in state —
              without the key, prev/next navigation kept showing the
              previous object's image until a tab was clicked, and a
              single-image object had no tabs to recover with
              (devin 09-09 18:57 #1). */}
          <ArtworkStage
            key={objectId}
            artwork={artwork}
            imageSources={imageSources}
          />
          <div className="detail-image-footer">
            <p className="image-credit">
              Image: The Metropolitan Museum of Art, Open Access
            </p>
            {artwork.primaryImage || artwork.primaryImageSmall ? (
              <a
                href={artwork.primaryImage ?? artwork.primaryImageSmall ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-link text-link--quiet"
              >
                Open image <ArrowUpRightIcon />
              </a>
            ) : null}
          </div>
        </div>

        <div className="detail-copy">
          <div className="detail-heading">
            <span className="eyebrow">
              {artwork.classification ?? "Collection object"}
            </span>
            <h1 id="artwork-title">{artwork.displayTitle}</h1>
            {artwork.displayTitle !== artwork.title ? (
              <p className="detail-title-full">{artwork.title}</p>
            ) : null}
            <p className="detail-artist">
              {artwork.artist ?? "Artist unknown"}
              {artwork.date ? `, ${artwork.date}` : ""}
            </p>
          </div>

          <div className="detail-actions">
            <SaveButton artwork={artwork} />
            <ShareButton artwork={artwork} />
            <a
              href={artwork.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "record-link",
              )}
            >
              Met record <ArrowUpRightIcon />
            </a>
          </div>

          <Separator className="detail-actions-separator" />

          <dl className="metadata-list">
            <MetadataRow label="Medium" value={artwork.medium} />
            <MetadataRow label="Dimensions" value={artwork.dimensions} />
            <MetadataRow label="Culture" value={artwork.culture} />
            <MetadataRow label="Period" value={artwork.period} />
            <MetadataRow
              label="Department"
              value={
                artwork.department ? (
                  isReviewDepartmentName(artwork.department) ? (
                    <Link
                      to="/explore"
                      search={{ department: artwork.department }}
                    >
                      {artwork.department}
                    </Link>
                  ) : (
                    <Link to="/departments">{artwork.department}</Link>
                  )
                ) : null
              }
            />
            <MetadataRow
              label="Accession"
              value={artwork.accessionNumber}
              mono
              copyable
            />
            <MetadataRow
              label="Rights"
              value={
                artwork.isPublicDomain
                  ? "Public domain"
                  : "Rights status not stated"
              }
            />
          </dl>

          <div className="detail-credit">
            <span className="eyebrow">Credit line</span>
            <p>{artwork.creditLine ?? "Credit line not provided."}</p>
          </div>
          {artwork.artistBio ? (
            <div className="detail-maker">
              <span className="eyebrow">Maker</span>
              <p>{artwork.artistBio}</p>
            </div>
          ) : null}
          {artwork.tags.length > 0 ? (
            <div className="detail-tags">
              <span className="eyebrow">Subjects</span>
              <ul>
                {artwork.tags.map((tag) => (
                  <li key={tag}>
                    <Link to="/explore" search={{ q: tag }}>
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {adjacent.previous || adjacent.next ? (
        <nav
          className="detail-sequence page-frame"
          aria-label="Review set navigation"
        >
          {adjacent.previous ? (
            <Link
              to="/art/$objectId"
              params={{ objectId: String(adjacent.previous.id) }}
              className="detail-sequence__link detail-sequence__link--previous"
            >
              <ArtworkImage artwork={adjacent.previous} />
              <div className="detail-sequence__copy">
                <span className="mono">Previous object</span>
                <h2>{adjacent.previous.displayTitle}</h2>
                <span className="text-link">
                  Open record <span aria-hidden="true">←</span>
                </span>
              </div>
            </Link>
          ) : (
            <span />
          )}
          {adjacent.next ? (
            <Link
              to="/art/$objectId"
              params={{ objectId: String(adjacent.next.id) }}
              className="detail-sequence__link detail-sequence__link--next"
            >
              <ArtworkImage artwork={adjacent.next} />
              <div className="detail-sequence__copy">
                <span className="mono">Next object</span>
                <h2>{adjacent.next.displayTitle}</h2>
                <span className="text-link">
                  Open record <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ) : null}
        </nav>
      ) : null}

      {related.artworks.length > 0 ? (
        <section
          className="related-section page-frame"
          aria-labelledby="related-heading"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{related.label}</span>
              <h2 id="related-heading">Continue looking.</h2>
            </div>
          </div>
          <div className="related-grid">
            {related.artworks.map((candidate) => (
              <ArtworkCard key={candidate.id} artwork={candidate} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function getAdjacentArtworks(artwork: Artwork): {
  previous: Artwork | null;
  next: Artwork | null;
  position: number;
  total: number;
} {
  const index = curatedArtworks.findIndex(
    (candidate) => candidate.id === artwork.id,
  );

  if (index < 0) return { previous: null, next: null, position: 0, total: 0 };

  return {
    previous: curatedArtworks[index - 1] ?? null,
    next: curatedArtworks[index + 1] ?? null,
    position: index + 1,
    total: curatedArtworks.length,
  };
}

function ArtworkDetailPending() {
  return (
    <main className="detail-page">
      <div className="page-frame detail-page__topline">
        <span className="text-link">Reading object record…</span>
      </div>
      <div className="detail-layout page-frame detail-loading" aria-busy="true">
        <div className="detail-image-column">
          <Skeleton className="detail-loading__image" />
          <Skeleton className="detail-loading__credit" />
        </div>
        <div className="detail-loading__copy">
          <Skeleton className="detail-loading__eyebrow" />
          <Skeleton className="detail-loading__title" />
          <Skeleton className="detail-loading__title detail-loading__title--short" />
          <Skeleton className="detail-loading__artist" />
          <div className="detail-loading__actions">
            <Skeleton />
            <Skeleton />
          </div>
          <div className="detail-loading__metadata">
            {[1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={row} />
            ))}
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          Bringing the record and its image into view.
        </p>
      </div>
    </main>
  );
}

function ArtworkStage({
  artwork,
  imageSources,
}: {
  artwork: Artwork;
  imageSources: string[];
}) {
  const [activeSrc, setActiveSrc] = useState(imageSources[0] ?? null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="detail-image-field">
          {activeSrc ? (
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="detail-image-trigger"
                  aria-label={`Inspect ${artwork.displayTitle} in high resolution`}
                />
              }
            >
              <ArtworkImage
                artwork={artwork}
                size="large"
                eager
                src={activeSrc}
              />
              <span className="detail-image-hint mono">
                <ExpandIcon /> Inspect
              </span>
            </DialogTrigger>
          ) : (
            <ArtworkImage
              artwork={artwork}
              size="large"
              eager
              src={activeSrc}
            />
          )}
        </div>

        <DialogContent className="image-dialog-content">
          <div className="image-dialog-inner">
            <div className="image-dialog-topline">
              <div>
                <DialogTitle className="image-dialog-title">
                  {artwork.displayTitle}
                </DialogTitle>
                <DialogDescription className="image-dialog-subtitle">
                  {[artwork.artist, artwork.date].filter(Boolean).join(", ")}
                </DialogDescription>
              </div>
              <DialogClose
                variant="outline"
                size="sm"
                className="image-dialog-close"
              >
                Close <CloseIcon />
              </DialogClose>
            </div>
            <ImageLightboxStage
              src={
                activeSrc ??
                artwork.primaryImage ??
                artwork.primaryImageSmall ??
                ""
              }
              alt={`${artwork.displayTitle}${artwork.artist ? `, ${artwork.artist}` : ""}`}
            />
            {artwork.creditLine ? (
              <p className="image-dialog-credit mono">{artwork.creditLine}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {imageSources.length > 1 ? (
        <div className="artwork-views" role="tablist" aria-label="Object views">
          {imageSources.map((source, index) => {
            const selected = source === activeSrc;
            return (
              <button
                key={source}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={
                  index === 0 ? "Primary image" : `Additional view ${index}`
                }
                className={
                  selected
                    ? "artwork-views__item is-active"
                    : "artwork-views__item"
                }
                onClick={() => setActiveSrc(source)}
              >
                <img src={source} alt="" />
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function ImageLightboxStage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className={cn("image-dialog-stage", zoomed && "is-zoomed")}>
      <button
        type="button"
        className="image-dialog-stage__trigger"
        onClick={() => setZoomed(!zoomed)}
        aria-label={
          zoomed
            ? "Zoomed view. Click to fit to screen."
            : "Fit view. Click to zoom in."
        }
        aria-pressed={zoomed}
      >
        <img src={src} alt={alt} className="image-dialog-asset" />
      </button>
    </div>
  );
}

function ShareButton({ artwork }: { artwork: Artwork }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : artwork.canonicalUrl;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        // clipboard error fallback
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="record-link share-button"
      onClick={handleShare}
      aria-label={copied ? "Link copied to clipboard" : "Copy object page link"}
    >
      <span data-icon="inline-start">
        {copied ? <CheckIcon /> : <ShareIcon />}
      </span>
      <span>{copied ? "Copied link" : "Share"}</span>
    </Button>
  );
}

function ArtworkUnavailable({
  objectId,
  message,
}: {
  objectId: number;
  message: string;
}) {
  const { items, isHydrated } = useSelection();
  const local = items.find((item) => item.id === objectId);

  if (!isHydrated) {
    return <ArtworkDetailPending />;
  }

  if (local) {
    const artwork = artworkFromSelectionItem(local);
    return (
      <main className="detail-page">
        <div className="page-frame detail-page__topline">
          <Link to="/selection" className="text-link">
            <ArrowLeftIcon /> Back to Selection
          </Link>
          <span className="mono">Object {artwork.id}</span>
        </div>
        <section
          className="detail-layout page-frame"
          aria-labelledby="artwork-title"
        >
          <div className="detail-image-column">
            <div className="detail-image-field">
              <ArtworkImage artwork={artwork} size="large" eager />
            </div>
          </div>
          <div className="detail-copy">
            <Alert className="result-alert local-record-alert">
              <AlertTitle>Showing the copy saved in this browser.</AlertTitle>
              <AlertDescription>
                {message} Missing catalog fields stay missing until the live
                record can be opened again.
              </AlertDescription>
            </Alert>
            <div className="detail-heading">
              <span className="eyebrow">Local selection</span>
              <h1 id="artwork-title">{artwork.displayTitle}</h1>
              <p className="detail-artist">
                {artwork.artist ?? "Artist unknown"}
                {artwork.date ? `, ${artwork.date}` : ""}
              </p>
            </div>
            <div className="detail-actions">
              <SaveButton artwork={artwork} />
              <a
                href={artwork.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "record-link",
                )}
              >
                Met record <ArrowUpRightIcon />
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-frame not-found">
      <span className="eyebrow">Object record unavailable</span>
      <h1>This record could not be opened.</h1>
      <p className="not-found__message">{message}</p>
      <Link
        to="/explore"
        className={cn(buttonVariants({ size: "lg" }), "button-link")}
      >
        Return to Explore
      </Link>
    </main>
  );
}

function MetadataRow({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (copyable && typeof value === "string") {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  }

  return (
    <div className="metadata-row">
      <dt>{label}</dt>
      <dd className={cn(mono && "mono", !value && "metadata-row__missing")}>
        {copyable && value && typeof value === "string" ? (
          <button
            type="button"
            className="metadata-row__copy-btn"
            onClick={handleCopy}
            title="Click to copy accession number"
          >
            <span>{value}</span>
            {copied ? (
              <span className="metadata-row__copied mono">✓ Copied</span>
            ) : null}
          </button>
        ) : (
          <span>{value ?? "Not recorded"}</span>
        )}
      </dd>
    </div>
  );
}
