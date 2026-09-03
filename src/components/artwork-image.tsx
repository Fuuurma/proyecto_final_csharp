import type { CSSProperties } from "react";
import { useState } from "react";
import type { Artwork } from "@/lib/met/normalize";

type ArtworkImageProps = {
  artwork: Artwork;
  size?: "small" | "large";
  layout?: "ratio" | "fill";
  eager?: boolean;
  src?: string | null;
  className?: string;
};

export function ArtworkImage({
  artwork,
  size = "small",
  layout = "ratio",
  eager = false,
  src,
  className = "",
}: ArtworkImageProps) {
  const sources = Array.from(
    new Set(
      [
        src,
        ...(size === "large"
          ? [artwork.primaryImage, artwork.primaryImageSmall]
          : [artwork.primaryImageSmall, artwork.primaryImage]),
      ].filter((source): source is string => Boolean(source)),
    ),
  );
  const sourceKey = `${artwork.id}-${size}-${src ?? "primary"}`;
  const [imageState, setImageState] = useState<{
    key: string;
    failedSources: string[];
  }>({ key: sourceKey, failedSources: [] });
  const failedSources =
    imageState.key === sourceKey ? imageState.failedSources : [];

  const source = sources.find(
    (candidate) => !failedSources.includes(candidate),
  );
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const imageStyle: CSSProperties =
    layout === "ratio"
      ? { aspectRatio: artwork.imageAspectRatio }
      : ({ "--artwork-ratio": artwork.imageAspectRatio } as CSSProperties);

  return (
    <div
      className={`artwork-image ${layout === "fill" ? "artwork-image--fill" : ""} ${loadedSrc === source ? "" : "is-loading"} ${className}`.trim()}
      style={imageStyle}
    >
      {source ? (
        <img
          src={source}
          alt={`${artwork.displayTitle}${artwork.artist ? `, ${artwork.artist}` : ""}`}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className={loadedSrc === source ? "is-loaded" : ""}
          onLoad={() => setLoadedSrc(source)}
          onError={() => {
            setImageState((current) => {
              if (current.key !== sourceKey) {
                return { key: sourceKey, failedSources: [source] };
              }

              return current.failedSources.includes(source)
                ? current
                : {
                    key: sourceKey,
                    failedSources: [...current.failedSources, source],
                  };
            });
          }}
        />
      ) : (
        <div className="artwork-image__missing">
          <span>No image in the public record</span>
          <small>Object {artwork.id}</small>
        </div>
      )}
    </div>
  );
}
