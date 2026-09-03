import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtworkImage } from "@/components/artwork-image";
import { ArrowUpRightIcon } from "@/components/icons";
import { curatedArtworks } from "@/data/curated-artworks";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Meet the Met" },
      {
        name: "description",
        content:
          "An independent Open Access collection explorer. Source, working rules, and the design ledger behind Meet the Met.",
      },
      { property: "og:title", content: "About — Meet the Met" },
      {
        property: "og:description",
        content:
          "An independent Open Access collection explorer — source, working rules, and design ledger.",
      },
    ],
  }),
  component: About,
});

function About() {
  const sourceArtwork = curatedArtworks.find((artwork) => artwork.id === 56353);

  return (
    <main className="page-frame about-page" aria-labelledby="about-heading">
      <section className="about-hero">
        <div className="about-hero__copy">
          <span className="eyebrow">The premise</span>
          <h1 id="about-heading">Open data, given room to breathe.</h1>
          <p className="about-page__lead">
            Meet the Met is an independent collection explorer built around The
            Metropolitan Museum of Art’s Open Access API. It is a reading room
            for looking closer.
          </p>
          <div className="about-hero__actions">
            <Link to="/explore" className="text-link">
              Enter the collection <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"
              target="_blank"
              rel="noreferrer"
              className="text-link text-link--quiet"
            >
              Read the source policy <ArrowUpRightIcon />
            </a>
          </div>
        </div>
        {sourceArtwork ? (
          <figure className="about-hero__image">
            <ArtworkImage artwork={sourceArtwork} size="large" eager />
            <figcaption>
              <span className="mono">Source object</span>
              <span>
                {sourceArtwork.displayTitle}, {sourceArtwork.date}
              </span>
            </figcaption>
          </figure>
        ) : null}
      </section>

      <div className="about-page__columns">
        <section>
          <span className="eyebrow">The source</span>
          <h2>Collection records, honestly framed.</h2>
          <p>
            Artwork data and public-domain imagery come from The Met’s Open
            Access collection. Every detail page links to the canonical museum
            record, and missing metadata stays missing.
          </p>
        </section>
        <section>
          <span className="eyebrow">The lens</span>
          <h2>Less noise, more looking.</h2>
          <p>
            Meet the Met adds a small, deliberate reading layer: bounded search,
            intact image proportions, local selections, and metadata that tells
            you when a field is missing instead of filling the silence.
          </p>
          <Link to="/explore" className="text-link">
            Explore a curated path <span aria-hidden="true">→</span>
          </Link>
          <Link to="/departments" className="text-link">
            Browse departments <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      <section className="about-notes" aria-labelledby="about-notes-heading">
        <div className="about-notes__intro">
          <span className="eyebrow">The working rules</span>
          <h2 id="about-notes-heading">What stays visible.</h2>
        </div>
        <div className="about-notes__list">
          <article>
            <h3>Source</h3>
            <p>
              Object records and public-domain images begin with The Met’s Open
              Access collection.
            </p>
          </article>
          <article>
            <h3>Shape</h3>
            <p>
              Images keep their original proportions. Missing fields remain
              clearly marked instead of being filled with guesses.
            </p>
          </article>
          <article>
            <h3>Return</h3>
            <p>
              Saved works stay local to this browser. The museum record remains
              one click away from every detail page.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
