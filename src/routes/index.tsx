import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { ArtworkImage } from "@/components/artwork-image";
import { ArrowUpRightIcon } from "@/components/icons";
import {
  curatedArtworks,
  curatedPaths,
  featuredArtwork,
  homeGalleryIds,
} from "@/data/curated-artworks";
import { reviewDepartments } from "@/data/departments";
import type { Artwork } from "@/lib/met/normalize";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meet the Met — The contemporary collection ledger" },
      {
        name: "description",
        content:
          "An independent, image-led explorer for The Met's Open Access collection. Browse curated rooms, save works, and follow the ledger.",
      },
      {
        property: "og:title",
        content: "Meet the Met — The contemporary collection ledger",
      },
      {
        property: "og:description",
        content:
          "An independent, image-led explorer for The Met's Open Access collection.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const homeGalleryArtworks = homeGalleryIds
    .map((id) => curatedArtworks.find((artwork) => artwork.id === id))
    .filter((artwork): artwork is Artwork => Boolean(artwork));

  return (
    <main className="home-page">
      <section className="hero page-frame" aria-labelledby="home-heading">
        <figure className="hero__image-panel">
          <Link
            to="/art/$objectId"
            params={{ objectId: String(featuredArtwork.id) }}
            className="hero__image-link"
            aria-label={`${featuredArtwork.displayTitle}${featuredArtwork.artist ? `, ${featuredArtwork.artist}` : ""}`}
          >
            <ArtworkImage
              artwork={featuredArtwork}
              size="large"
              eager
              className="artwork-image--hero"
            />
          </Link>
          <figcaption className="hero__record">
            <span className="eyebrow">Featured object</span>
            <div className="hero__record-row">
              <strong>{featuredArtwork.displayTitle}</strong>
              <span className="mono">Object {featuredArtwork.id}</span>
            </div>
            <p>
              {[featuredArtwork.artist, featuredArtwork.date]
                .filter(Boolean)
                .join(", ")}
            </p>
          </figcaption>
        </figure>

        <div className="hero__copy">
          <p className="eyebrow">
            An independent lens on The Met Open Access collection
          </p>
          <h1 id="home-heading">
            The collection,
            <em> made legible.</em>
          </h1>
          <p className="hero__lede">
            Meet the Met is a quiet place to look closer: a living index of
            public-domain works, their makers, and the details that keep them in
            view.
          </p>
          <div className="hero__actions">
            <Link
              to="/explore"
              className={cn(
                buttonVariants({ size: "lg" }),
                "hero-primary-link",
              )}
            >
              Explore the collection <ArrowUpRightIcon />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="intro-strip page-frame"
        aria-label="About Meet the Met"
      >
        <p>
          Not a museum homepage. Not a recommendation engine. Just a more
          considered way into a collection that is already open.
        </p>
        <Link to="/about" className="text-link text-link--quiet">
          Read the premise <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section
        className="home-gallery page-frame"
        aria-labelledby="gallery-heading"
      >
        <div className="home-gallery__intro">
          <div>
            <span className="eyebrow">The review set</span>
            <h2 id="gallery-heading">Look before you search.</h2>
          </div>
          <p>
            {curatedArtworks.length} public-domain objects, selected to keep the
            collection’s range visible: paintings beside prints, pages,
            photographs, and works on paper.
          </p>
        </div>

        <div className="home-gallery__grid">
          {homeGalleryArtworks.map((artwork, index) => (
            <article
              className={`home-gallery__item home-gallery__item--${index + 1}`}
              key={artwork.id}
            >
              <Link
                to="/art/$objectId"
                params={{ objectId: String(artwork.id) }}
                className="home-gallery__image-link"
              >
                <ArtworkImage artwork={artwork} />
              </Link>
              <div className="home-gallery__caption">
                <span className="home-gallery__classification mono">
                  {artwork.classification ?? "Collection object"}
                </span>
                <h3>
                  <Link
                    to="/art/$objectId"
                    params={{ objectId: String(artwork.id) }}
                  >
                    {artwork.displayTitle}
                  </Link>
                </h3>
                <span className="mono">
                  {artwork.artist ?? "Artist unknown"}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="home-gallery__footer">
          <span className="mono">A larger room, still bounded</span>
          <Link to="/explore" className="text-link">
            Open all {curatedArtworks.length} objects{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="paths page-frame" aria-labelledby="paths-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Curated paths</span>
            <h2 id="paths-heading">Start somewhere specific.</h2>
          </div>
          <span className="mono">{curatedPaths.length} ways in</span>
        </div>

        <div className="paths-grid">
          {curatedPaths.map((path, index) => {
            const artwork =
              curatedArtworks.find(
                (candidate) => candidate.id === path.artworkIds[0],
              ) ?? featuredArtwork;
            return (
              <article
                className={`path-card path-card--${index + 1}`}
                key={path.title}
              >
                <Link
                  to="/explore"
                  search={{
                    path: path.slug,
                    department: undefined,
                  }}
                  className="path-card__image-link"
                >
                  <ArtworkImage artwork={artwork} />
                </Link>
                <div className="path-card__meta">
                  <span className="eyebrow">{path.label}</span>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                  <Link
                    to="/explore"
                    search={{
                      path: path.slug,
                      department: undefined,
                    }}
                    className="text-link"
                  >
                    Explore this path <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="collection-index page-frame"
        aria-labelledby="collection-index-heading"
      >
        <div className="collection-index__intro">
          <span className="eyebrow">The collection, by department</span>
          <h2 id="collection-index-heading">Browse by department.</h2>
          <p>
            The review set is small on purpose, but it still crosses rooms,
            materials, and ways of making an image.
          </p>
        </div>
        <div className="collection-index__list">
          {reviewDepartments.map((department) => {
            const artwork = curatedArtworks.find(
              (candidate) => candidate.id === department.artworkId,
            );
            const count = curatedArtworks.filter(
              (candidate) => candidate.department === department.name,
            ).length;

            if (!artwork) return null;

            return (
              <Link
                className="collection-index__item"
                key={department.name}
                to="/explore"
                search={{ department: department.name, path: undefined }}
              >
                <ArtworkImage artwork={artwork} />
                <div className="collection-index__meta">
                  <span className="mono">{count} review works</span>
                  <h3>{department.name}</h3>
                  <p>{department.description}</p>
                  <span className="text-link">
                    Open department <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="home-gallery__footer collection-index__footer">
          <span className="mono">The rest of the museum rooms</span>
          <Link to="/departments" className="text-link">
            Open the department index <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section
        className="collection-note page-frame"
        aria-labelledby="collection-note-heading"
      >
        <div className="collection-note__mark mono">OA</div>
        <div className="collection-note__copy">
          <span className="eyebrow">Open by design</span>
          <h2 id="collection-note-heading">The source stays in view.</h2>
          <p>
            Every object begins with The Met’s Open Access collection. Meet the
            Met keeps the lens deliberately framed: clear search, intact images,
            and metadata that tells you when something is missing.
          </p>
        </div>
        <Link to="/about" className="text-link collection-note__link">
          Read the source note <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
