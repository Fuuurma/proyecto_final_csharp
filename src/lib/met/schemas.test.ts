import { describe, expect, it } from "vitest";
import { metObjectSchema } from "./schemas";

/**
 * needs-work 09-23 P1: every metObjectSchema field was `.optional()`
 * but not `.nullable()` — the Met API sends explicit nulls (e.g.
 * `tags: null`, `constituents: null`), which fail safeParse when
 * optional-only, so a real artwork degraded to the error state and the
 * tolerant normalizer downstream never ran. Fields must accept
 * absent AND null; absent-vs-null distinction is normalized later.
 */
describe("metObjectSchema null tolerance", () => {
  it("accepts explicit nulls on optional fields", () => {
    const result = metObjectSchema.safeParse({
      objectID: 1,
      tags: null,
      constituents: null,
      primaryImage: null,
      title: null,
      artistDisplayName: null,
    });
    expect(result.success).toBe(true);
  });

  it("still accepts absent fields", () => {
    const result = metObjectSchema.safeParse({ objectID: 2 });
    expect(result.success).toBe(true);
  });
});
