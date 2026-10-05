import type { Artwork } from "./normalize";

export function publicDomainStatusText(
  isPublicDomain: Artwork["isPublicDomain"],
): string {
  if (isPublicDomain === true) {
    return "The Met record marks this work as public domain";
  }
  if (isPublicDomain === false) {
    return "The Met record marks this work as not public domain";
  }
  return "The Met record does not state its public-domain status";
}

export function artworkDetailMetaDescription(
  artwork: Pick<
    Artwork,
    "displayTitle" | "artist" | "date" | "medium" | "isPublicDomain"
  >,
): string {
  const titleAndMaker = `${artwork.displayTitle}${artwork.artist ? ` by ${artwork.artist}` : ""}${artwork.date ? `, ${artwork.date}` : ""}`;
  return `${titleAndMaker}. ${artwork.medium ?? "Collection object"}. ${publicDomainStatusText(artwork.isPublicDomain)}.`;
}
