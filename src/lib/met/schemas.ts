import { z } from "zod";

const constituentSchema = z.looseObject({
  role: z.string().optional(),
  name: z.string().optional(),
});

const measurementSchema = z.looseObject({
  elementName: z.string().optional(),
  elementMeasurements: z.record(z.string(), z.number()).optional(),
});

export const metObjectSchema = z.looseObject({
  objectID: z.number(),
  accessionNumber: z.string().nullish(),
  isPublicDomain: z.boolean().nullish(),
  primaryImage: z.string().nullish(),
  primaryImageSmall: z.string().nullish(),
  additionalImages: z.array(z.string()).nullish(),
  constituents: z.array(constituentSchema).nullish(),
  title: z.string().nullish(),
  culture: z.string().nullish(),
  period: z.string().nullish(),
  objectDate: z.string().nullish(),
  medium: z.string().nullish(),
  dimensions: z.string().nullish(),
  measurements: z.array(measurementSchema).nullish(),
  creditLine: z.string().nullish(),
  department: z.string().nullish(),
  classification: z.string().nullish(),
  rightsAndReproduction: z.string().nullish(),
  objectURL: z.string().nullish(),
  artistDisplayName: z.string().nullish(),
  artistDisplayBio: z.string().nullish(),
  tags: z.array(z.looseObject({ term: z.string().nullish() })).nullish(),
});

export const metSearchSchema = z.looseObject({
  total: z.number(),
  // The Met API really does send null for objectIDs on some responses —
  // .default alone only fires on undefined, so the null case needs
  // nullish + a transform, not a dead default (devin 09-09 14:17 #8).
  objectIDs: z
    .array(z.number())
    .nullish()
    .transform((v) => v ?? []),
});

export const metDepartmentsSchema = z.looseObject({
  departments: z.array(
    z.object({
      departmentId: z.number(),
      displayName: z.string(),
    }),
  ),
});

export type MetObjectPayload = z.infer<typeof metObjectSchema>;
