import { Link } from "@tanstack/react-router";
import type { Artwork } from "@/lib/met/normalize";
import { ArtworkImage } from "./artwork-image";
import { SaveButton } from "./save-button";

type ArtworkCardProps = {
  artwork: Artwork;
};

export function ArtworkCard({ artwork }: ArtworkCardProps) {
  return (
    <article className="artwork-card">
      <Link
        to="/art/$objectId"
        params={{ objectId: String(artwork.id) }}
        className="artwork-card__image-link"
      >
        <ArtworkImage artwork={artwork} />
      </Link>
      <div className="artwork-card__meta">
        <div className="artwork-card__meta-main">
          <div className="artwork-card__line">
            <span>{artwork.date ?? "Date unknown"}</span>
            <span>{artwork.department ?? "Department unknown"}</span>
          </div>
          <h3>
            <Link to="/art/$objectId" params={{ objectId: String(artwork.id) }}>
              {artwork.displayTitle}
            </Link>
          </h3>
          <p>{artwork.artist ?? "Artist unknown"}</p>
        </div>
        <div className="artwork-card__actions">
          <SaveButton artwork={artwork} compact />
        </div>
      </div>
    </article>
  );
}
