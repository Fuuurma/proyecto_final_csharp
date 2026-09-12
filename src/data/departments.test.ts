import { describe, expect, it } from "vitest";
import {
  departmentNameById,
  exploreDepartmentFilters,
  exploreDepartmentSchema,
  isExploreDepartmentFilter,
  metDepartments,
  reviewDepartmentNames,
  reviewDepartments,
} from "./departments";

describe("department fixture", () => {
  it("keeps the live Met department ids for the review rooms", () => {
    expect(departmentNameById(6)).toBe("Asian Art");
    expect(departmentNameById(9)).toBe("Drawings and Prints");
    expect(departmentNameById(11)).toBe("European Paintings");
    expect(departmentNameById(19)).toBe("Photographs");
  });

  it("names every review room from the committed Met index", () => {
    expect(reviewDepartments.map((department) => department.name)).toEqual([
      "European Paintings",
      "Asian Art",
      "Drawings and Prints",
      "Photographs",
    ]);
    expect(
      reviewDepartments.every((department) =>
        metDepartments.some((entry) => entry.id === department.id),
      ),
    ).toBe(true);
  });

  it("derives the explore filter list from the review room names", () => {
    expect(exploreDepartmentFilters).toEqual(["all", ...reviewDepartmentNames]);
    expect(reviewDepartmentNames).toEqual(
      reviewDepartments.map((department) => department.name),
    );
  });

  it("shares one zod schema for server and client department filters", () => {
    expect(exploreDepartmentSchema.parse("all")).toBe("all");
    expect(exploreDepartmentSchema.parse("European Paintings")).toBe(
      "European Paintings",
    );
    expect(() => exploreDepartmentSchema.parse("Medieval Art")).toThrow();
  });

  it("type-guards explore department filters without false positives", () => {
    expect(isExploreDepartmentFilter("all")).toBe(true);
    expect(isExploreDepartmentFilter("Asian Art")).toBe(true);
    expect(isExploreDepartmentFilter("Medieval Art")).toBe(false);
    expect(isExploreDepartmentFilter(undefined)).toBe(false);
  });
});
