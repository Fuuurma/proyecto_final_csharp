// Prevents detail/social metadata from implying a rights state the record lacks.
import { describe, expect, it } from "vitest";
import { normalizeMetObject } from "../../lib/met/normalize";
import { Route } from "./$objectId";

type Meta = {
  name?: string;
  property?: string;
  content?: string;
};

function getDetailDescriptions(isPublicDomain?: boolean | null): string[] {
  const artwork = normalizeMetObject({
    objectID: 100,
    title: "Rights study",
    artistDisplayName: "A Maker",
    objectDate: "1900",
    medium: "Oil on canvas",
    ...(isPublicDomain === undefined ? {} : { isPublicDomain }),
  });
  const head = Route.options.head as unknown as (input: unknown) => {
    meta?: Meta[];
  };
  const result = head({
    loaderData: { status: "success", artwork },
  });

  return (result.meta ?? [])
    .filter(
      (item) =>
        item.name === "description" ||
        item.property === "og:description" ||
        item.name === "twitter:description",
    )
    .flatMap((item) => (item.content ? [item.content] : []));
}

function getUnavailableDescription(): string {
  const head = Route.options.head as unknown as (input: unknown) => {
    meta?: Meta[];
  };
  const result = head({
    loaderData: {
      status: "error",
      message: "The source is temporarily unavailable.",
    },
  });

  return (
    result.meta?.find((item) => item.name === "description")?.content ?? ""
  );
}

describe("artwork detail social metadata", () => {
  it.each([
    ["public-domain", true, "The Met record marks this work as public domain."],
    [
      "not-public-domain",
      false,
      "The Met record marks this work as not public domain.",
    ],
    [
      "missing-status",
      undefined,
      "The Met record does not state its public-domain status.",
    ],
  ] as const)(
    "describes %s without implying other records share its status",
    (_label, status, expected) => {
      const descriptions = getDetailDescriptions(status);

      expect(descriptions[0]).toContain(expected);
      expect(descriptions[0]).not.toMatch(/open access/i);
      expect(descriptions).toHaveLength(3);
      expect(new Set(descriptions).size).toBe(1);
    },
  );

  it("keeps unavailable-object metadata free of rights claims", () => {
    expect(getUnavailableDescription()).not.toMatch(/open access/i);
  });
});
