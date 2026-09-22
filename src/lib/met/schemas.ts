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
  accessionNumber: z.string().optional(),
  isPublicDomain: z.boolean().optional(),
  primaryImage: z.string().optional(),
  primaryImageSmall: z.string().optional(),
  additionalImages: z.array(z.string()).optional(),
  constituents: z.array(constituentSchema).optional(),
  title: z.string().optional(),
  culture: z.string().optional(),
  period: z.string().optional(),
  objectDate: z.string().optional(),
  medium: z.string().optional(),
  dimensions: z.string().optional(),
  measurements: z.array(measurementSchema).optional(),
  creditLine: z.string().optional(),
  department: z.string().optional(),
  classification: z.string().optional(),
  rightsAndReproduction: z.string().optional(),
  objectURL: z.string().optional(),
  artistDisplayName: z.string().optional(),
  artistDisplayBio: z.string().optional(),
  tags: z.array(z.looseObject({ term: z.string().optional() })).optional(),
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
