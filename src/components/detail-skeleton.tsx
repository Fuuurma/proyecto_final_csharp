import type { CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Detail-page loading frame. When the artwork's aspect ratio is
 * already known (curated objects carry it in the seed data), the
 * image placeholder takes the same `--artwork-ratio` box the real
 * `.artwork-image` uses, so content arrival doesn't shift the page
 * (grok 09-30: the skeleton hard-coded 1/1 while Met paintings are
 * mostly portrait — a guaranteed jump at load). The real box has no
 * min-height, so a known ratio also drops the skeleton's 38rem
 * floor — otherwise landscape pieces collapsed upward on arrival.
 * Unknown ratios fall back to the CSS default square + floor.
 */
export function DetailSkeleton({
  imageAspectRatio,
}: {
  imageAspectRatio?: number;
}) {
  const imageStyle = imageAspectRatio
    ? ({
        "--artwork-ratio": imageAspectRatio,
        "--artwork-min-height": "0rem",
      } as CSSProperties)
    : undefined;

  return (
    <div className="detail-layout page-frame detail-loading" aria-busy="true">
      <div>
        <Skeleton className="detail-loading__image" style={imageStyle} />
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
  );
}
