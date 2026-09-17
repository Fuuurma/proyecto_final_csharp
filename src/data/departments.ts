import { z } from "zod";

export type MetDepartment = {
  id: number;
  name: string;
};

// Single source of truth for the review-room department names. The literal
// union below and every derived filter list / zod schema come from this tuple
// so server functions and client routes cannot drift.
export const reviewDepartmentNames = [
  "European Paintings",
  "Asian Art",
  "Drawings and Prints",
  "Photographs",
] as const;

export type ReviewDepartmentName = (typeof reviewDepartmentNames)[number];

export type ReviewDepartment = MetDepartment & {
  name: ReviewDepartmentName;
  artworkId: number;
  description: string;
};

export const metDepartments: MetDepartment[] = [
  { id: 1, name: "American Decorative Arts" },
  { id: 3, name: "Ancient West Asian Art" },
  { id: 4, name: "Arms and Armor" },
  { id: 5, name: "Arts of Africa, Oceania, and the Americas" },
  { id: 6, name: "Asian Art" },
  { id: 7, name: "The Cloisters" },
  { id: 8, name: "The Costume Institute" },
  { id: 9, name: "Drawings and Prints" },
  { id: 10, name: "Egyptian Art" },
  { id: 11, name: "European Paintings" },
  { id: 12, name: "European Sculpture and Decorative Arts" },
  { id: 13, name: "Greek and Roman Art" },
  { id: 14, name: "Islamic Art" },
  { id: 15, name: "The Robert Lehman Collection" },
  { id: 16, name: "The Libraries" },
  { id: 17, name: "Medieval Art" },
  { id: 18, name: "Musical Instruments" },
  { id: 19, name: "Photographs" },
  { id: 21, name: "Modern Art" },
];

export const reviewDepartments: ReviewDepartment[] = [
  {
    id: 11,
    name: "European Paintings",
    artworkId: 436535,
    description:
      "Painted rooms, weather, faces, and the long afterlife of a brushstroke.",
  },
  {
    id: 6,
    name: "Asian Art",
    artworkId: 56353,
    description:
      "Prints and images that move between daily life, theater, landscape, and legend.",
  },
  {
    id: 9,
    name: "Drawings and Prints",
    artworkId: 345033,
    description:
      "Works on paper, books, and the marks that keep process visible.",
  },
  {
    id: 19,
    name: "Photographs",
    artworkId: 283626,
    description:
      "A small photographic window into landscape, place, and changing light.",
  },
];

export function departmentNameById(id: number): string | undefined {
  return metDepartments.find((department) => department.id === id)?.name;
}

export function departmentIdByName(name: string): number | undefined {
  return metDepartments.find((department) => department.name === name)?.id;
}

export function isReviewDepartmentName(
  name: string,
): name is ReviewDepartmentName {
  return reviewDepartments.some((department) => department.name === name);
}

export function exploreSearchForDepartment(department: MetDepartment): {
  department?: ReviewDepartmentName;
  departmentId?: number;
} {
  if (isReviewDepartmentName(department.name)) {
    return { department: department.name };
  }

  return { departmentId: department.id };
}

// Explore filter list: the four review rooms plus the "all" sentinel that
// means "no department filter". Shared by the explore route's URL schema and
// the collection search server function so the two cannot disagree.
export const exploreDepartmentFilters = [
  "all",
  ...reviewDepartmentNames,
] as const;

export type ExploreDepartmentFilter = (typeof exploreDepartmentFilters)[number];

export const exploreDepartmentSchema = z.enum(exploreDepartmentFilters);

export function isExploreDepartmentFilter(
  value: string | undefined,
): value is ExploreDepartmentFilter {
  return (
    value !== undefined &&
    (exploreDepartmentFilters as readonly string[]).includes(value)
  );
}
