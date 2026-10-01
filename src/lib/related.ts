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
  // Tag membership via Set — includes() inside the catalog filter was
  // O(catalog x tags x tags) (react-doctor 09-23 js-set-map-lookups).
  const artworkTagSet = new Set(artwork.tags);
  const sharedSubjects =
    artwork.tags.length > 0
      ? candidates.filter((candidate) =>
          candidate.tags.some((tag) => artworkTagSet.has(tag)),
        )
      : [];
  const sameDepartment = artwork.department
    ? candidates.filter(
        (candidate) => candidate.department === artwork.department,
      )
    : [];

  const seen = new Set<number>();
  const artworks: Artwork[] = [];
  // Label from what actually rendered, not what the pools held: a
  // non-empty but tiny sameMaker pool still said "Same maker" while
  // most visible works were by other artists (needs-work 10-01 P3).
  // Ties keep the earlier (higher-priority) source.
  const admitted = new Map<string, number>([
    ["Same maker", 0],
    ["Shared subjects", 0],
    ["Same department", 0],
  ]);
  const pools: Array<[string, Artwork[]]> = [
    ["Same maker", sameMaker],
    ["Shared subjects", sharedSubjects],
    ["Same department", sameDepartment],
  ];

  for (const [label, pool] of pools) {
    for (const candidate of pool) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      admitted.set(label, (admitted.get(label) ?? 0) + 1);
      artworks.push(candidate);
      if (artworks.length >= limit) {
        return { label: dominantLabel(admitted), artworks };
      }
    }
  }

  return { label: dominantLabel(admitted), artworks };
}

function dominantLabel(admitted: Map<string, number>): string {
  let best = "Same department";
  let bestCount = -1;
  // Map order is insertion order — Same maker, Shared subjects, Same
  // department — so a strict > keeps the higher-priority source on ties.
  for (const [label, count] of admitted) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}
