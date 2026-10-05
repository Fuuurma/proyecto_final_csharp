// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const linkCalls = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
}));

// The card's Link navigates to /explore; this test pins its props,
// not navigation — a stub keeps the harness router-free.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    ...rest
  }: Record<string, unknown> & {
    children: React.ReactNode;
    className?: string;
  }) => {
    linkCalls.props.push({ className, ...rest });
    return (
      // biome-ignore lint/a11y/useValidAnchor: test stub, never navigated
      <a href="#" className={className}>
        {children}
      </a>
    );
  },
}));

import { reviewDepartments } from "@/data/departments";
import { ReviewDepartmentCard } from "./review-department-card";

const here = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(join(here, "../routes/index.tsx"), "utf8");
const departmentsSource = readFileSync(
  join(here, "../routes/departments.tsx"),
  "utf8",
);

afterEach(() => {
  cleanup();
  linkCalls.props.length = 0;
});

/**
 * The home and departments pages both render the collection-index room
 * card. The subtree was maintained as two copies that drifted (key and
 * search-shape differences); it lives in one component now —
 * react-doctor duplicate-jsx-subtree (departments.tsx:102, index.tsx).
 */
describe("ReviewDepartmentCard", () => {
  const asianArt = reviewDepartments[1];

  it("renders the collection-index card contract", () => {
    const { container } = render(
      <ReviewDepartmentCard department={asianArt} />,
    );

    expect(container.querySelector(".collection-index__item")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Asian Art" })).toBeTruthy();
    expect(screen.getByText("6 review works")).toBeTruthy();
    expect(screen.getByText(asianArt.description)).toBeTruthy();
    expect(container.querySelector(".link-action")?.textContent).toContain(
      "Open department",
    );
  });

  it("opens the room as a bounded department search on /explore", () => {
    render(<ReviewDepartmentCard department={asianArt} />);

    expect(linkCalls.props).toHaveLength(1);
    expect(linkCalls.props[0]).toMatchObject({
      className: "collection-index__item",
      to: "/explore",
      search: {
        department: "Asian Art",
        path: undefined,
        departmentId: undefined,
      },
    });
  });

  it("renders nothing when the room's cover leaves the curated set", () => {
    const orphaned = { ...asianArt, artworkId: -1 };
    const { container } = render(
      <ReviewDepartmentCard department={orphaned} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("is the single implementation behind both collection-index lists", () => {
    for (const source of [indexSource, departmentsSource]) {
      expect(source).toContain("ReviewDepartmentCard");
      expect(source).not.toContain('className="collection-index__item"');
    }
  });
});
