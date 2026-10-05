import type { CSSProperties } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { rememberArtworkRatio } from "@/lib/artwork-ratio-cache";
import type { Artwork } from "@/lib/met/normalize";

type ArtworkImageProps = {
  // The whole Artwork is not required — only the fields this component
  // reads — so stored browse-sequence entries (a slim pick, review
  // 09-19 P3) render without a fake full record.
  artwork: Pick<
    Artwork,
    | "id"
    | "displayTitle"
    | "artist"
    | "primaryImage"
    | "primaryImageSmall"
    | "imageAspectRatio"
  >;
  size?: "small" | "large";
  eager?: boolean;
  src?: string | null;
  className?: string;
};

export function ArtworkImage({
  artwork,
  size = "small",
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
  const failedSet = useMemo(
    () => new Set(imageState.key === sourceKey ? imageState.failedSources : []),
    [imageState, sourceKey],
  );

  const source = sources.find((candidate) => !failedSet.has(candidate));
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Any rendered surface knows the true ratio — record it so the detail
  // pending skeleton can adopt it on client-side arrivals (grok 10-01).
  useLayoutEffect(() => {
    rememberArtworkRatio(artwork.id, artwork.imageAspectRatio);
  }, [artwork.id, artwork.imageAspectRatio]);

  // A cached image can finish before React attaches onLoad (SSR
  // hydration race) — then it would sit hidden behind is-loading
  // forever (quick-critic 09-10 17:4x, hardening grok 18:45 #5).
  // Mark it loaded from the element itself, before paint.
  useLayoutEffect(() => {
    const img = imageRef.current;
    if (source && img?.complete && img.naturalWidth > 0 && loadedSrc === null) {
      setLoadedSrc(source);
    }
  }, [source, loadedSrc]);

  const imageStyle = {
    "--artwork-ratio": artwork.imageAspectRatio,
  } as CSSProperties;

  return (
    <div
      className={`artwork-image aspect-(--artwork-ratio) ${loadedSrc === source ? "" : "is-loading"} ${className}`.trim()}
      style={imageStyle}
    >
      {source ? (
        <img
          ref={imageRef}
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
          {/* Two honest states: a record with no image vs a record whose
              image failed to arrive — a network failure is not a rights
              fact (grok 09-14). */}
          <span>
            {sources.length === 0
              ? "No image in the public record"
              : "The image did not load"}
          </span>
          <small>Object {artwork.id}</small>
        </div>
      )}
    </div>
  );
}
