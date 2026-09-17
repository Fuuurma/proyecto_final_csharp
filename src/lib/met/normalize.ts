import { type MetObjectPayload, metObjectSchema } from "./schemas";

export type Artwork = {
  id: number;
  accessionNumber: string | null;
  title: string;
  displayTitle: string;
  artist: string | null;
  artistBio: string | null;
  date: string | null;
  culture: string | null;
  period: string | null;
  medium: string | null;
  dimensions: string | null;
  department: string | null;
  classification: string | null;
  primaryImage: string | null;
  primaryImageSmall: string | null;
  additionalImages: string[];
  imageAspectRatio: number;
  isPublicDomain: boolean;
  rights: string | null;
  creditLine: string | null;
  canonicalUrl: string;
  tags: string[];
};

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getImageAspectRatio(payload: MetObjectPayload): number {
  const overall = payload.measurements?.find(
    (measurement) => measurement.elementName?.toLowerCase() === "overall",
  );
  const height = overall?.elementMeasurements?.Height;
  const width = overall?.elementMeasurements?.Width;

  if (!height || !width || height <= 0 || width <= 0) {
    return 1;
  }

  return width / height;
}

function getArtist(payload: MetObjectPayload): string | null {
  const artistConstituent = payload.constituents?.find(
    (constituent) => constituent.role?.toLowerCase() === "artist",
  );

  return clean(payload.artistDisplayName) ?? clean(artistConstituent?.name);
}

export function normalizeMetObject(input: unknown): Artwork {
  const payload = metObjectSchema.parse(input);
  return normalizeMetPayload(payload);
}

export function normalizeMetPayload(payload: MetObjectPayload): Artwork {
  const title = clean(payload.title) ?? "Untitled object";

  return {
    id: payload.objectID,
    accessionNumber: clean(payload.accessionNumber),
    title,
    displayTitle: title,
    artist: getArtist(payload),
    artistBio: clean(payload.artistDisplayBio),
    date: clean(payload.objectDate),
    culture: clean(payload.culture),
    period: clean(payload.period),
    medium: clean(payload.medium),
    dimensions: clean(payload.dimensions),
    department: clean(payload.department),
    classification: clean(payload.classification),
    primaryImage: clean(payload.primaryImage),
    primaryImageSmall: clean(payload.primaryImageSmall),
    additionalImages: (payload.additionalImages ?? []).filter(Boolean),
    imageAspectRatio: getImageAspectRatio(payload),
    isPublicDomain: payload.isPublicDomain ?? false,
    rights: clean(payload.rightsAndReproduction),
    creditLine: clean(payload.creditLine),
    canonicalUrl:
      clean(payload.objectURL) ??
      `https://www.metmuseum.org/art/collection/search/${payload.objectID}`,
    tags: (payload.tags ?? [])
      .map((tag) => clean(tag.term))
      .filter((tag): tag is string => tag !== null),
  };
}
