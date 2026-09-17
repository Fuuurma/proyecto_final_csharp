import type { Artwork } from "./met/normalize";

export function getRelatedArtworks(
  artwork: Artwork,
  catalog: Artwork[],
  limit = 6,
): { label: string; artworks: Artwork[] } {
  const candidates = catalog.filter((candidate) => candidate.id !== artwork.id);
  const sameMaker = artwork.artist
    ? candidates.filter((candidate) => candidate.artist === artwork.artist)
    : [];
  const sharedSubjects =
    artwork.tags.length > 0
      ? candidates.filter((candidate) =>
          candidate.tags.some((tag) => artwork.tags.includes(tag)),
        )
      : [];
  const sameDepartment = artwork.department
    ? candidates.filter(
        (candidate) => candidate.department === artwork.department,
      )
    : [];

  const seen = new Set<number>();
  const artworks: Artwork[] = [];

  for (const pool of [sameMaker, sharedSubjects, sameDepartment]) {
    for (const candidate of pool) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      artworks.push(candidate);
      if (artworks.length >= limit) {
        return {
          label: relatedLabel(sameMaker, sharedSubjects),
          artworks,
        };
      }
    }
  }

  return {
    label: relatedLabel(sameMaker, sharedSubjects),
    artworks,
  };
}

function relatedLabel(sameMaker: Artwork[], sharedSubjects: Artwork[]): string {
  if (sameMaker.length > 0) return "Same maker";
  if (sharedSubjects.length > 0) return "Shared subjects";
  return "Same department";
}
