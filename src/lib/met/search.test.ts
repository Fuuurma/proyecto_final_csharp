import { describe, expect, it } from "vitest";
import { SEARCH_PAGE_SIZE } from "./client.server";
import {
  hydrateWindow,
  isLiveCollectionSearch,
  pageItems,
  resolvedDepartmentId,
  takeOpenAccessPage,
} from "./search-query";

describe("live collection search trigger", () => {
  it("keeps empty Explore on the curated review set", () => {
    expect(
      isLiveCollectionSearch({
        q: "",
        department: "all",
      }),
    ).toBe(false);
  });

  it("treats a keyword, department chip, or department id as live", () => {
    expect(isLiveCollectionSearch({ q: "van Gogh", department: "all" })).toBe(
      true,
    );
    expect(
      isLiveCollectionSearch({
        q: "",
        department: "European Paintings",
      }),
    ).toBe(true);
    expect(
      isLiveCollectionSearch({
        q: "",
        department: "all",
        departmentId: 10,
      }),
    ).toBe(true);
  });
});

describe("resolvedDepartmentId", () => {
  it("maps a review department chip to a Met department id", () => {
    expect(
      resolvedDepartmentId({
        q: "waves",
        department: "Asian Art",
      }),
    ).toBe(6);
  });

  it("prefers an explicit department id from the departments index", () => {
    expect(
      resolvedDepartmentId({
        q: "",
        department: "all",
        departmentId: 10,
      }),
    ).toBe(10);
  });

  it("sends no department id for All works", () => {
    expect(
      resolvedDepartmentId({
        q: "van Gogh",
        department: "all",
      }),
    ).toBeUndefined();
  });
});

describe("pageItems", () => {
  it("pages a matching review set without changing the total", () => {
    const items = Array.from({ length: 33 }, (_, index) => index);
    expect(pageItems(items, 1)).toHaveLength(SEARCH_PAGE_SIZE);
    expect(pageItems(items, 2)).toEqual(items.slice(SEARCH_PAGE_SIZE));
  });
});

describe("open-access page fill", () => {
  it("reads a wider ID window so dropped records can be replaced", () => {
    const ids = Array.from({ length: 50 }, (_, index) => index + 1);
    expect(hydrateWindow(ids, 1)).toEqual(ids.slice(0, 36));
    expect(hydrateWindow(ids, 2)[0]).toBe(25);
    expect(hydrateWindow(ids, 2)).toHaveLength(26);
  });

  it("keeps public-domain image-backed works and drops the rest", () => {
    const page = takeOpenAccessPage([
      {
        isPublicDomain: true,
        primaryImage: "https://example.com/a.jpg",
        primaryImageSmall: "https://example.com/a.jpg",
      },
      {
        isPublicDomain: true,
        primaryImage: null,
        primaryImageSmall: null,
      },
      {
        isPublicDomain: false,
        primaryImage: "https://example.com/b.jpg",
        primaryImageSmall: "https://example.com/b.jpg",
      },
      {
        isPublicDomain: true,
        primaryImage: null,
        primaryImageSmall: "https://example.com/c.jpg",
      },
    ]);

    expect(page).toEqual([
      {
        isPublicDomain: true,
        primaryImage: "https://example.com/a.jpg",
        primaryImageSmall: "https://example.com/a.jpg",
      },
      {
        isPublicDomain: true,
        primaryImage: null,
        primaryImageSmall: "https://example.com/c.jpg",
      },
    ]);
  });
});
