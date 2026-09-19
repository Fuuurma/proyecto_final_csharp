// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import { ExploreGridFooter } from "./explore-grid-footer";

const base = {
  canLoadMore: true,
  isFilling: false,
  countIsExact: true,
  nextCount: 24,
  onLoadMore: vi.fn(),
  fillFailed: false,
  fillExhausted: false,
  atCap: false,
};

/**
 * Render coverage for the load-more honesty contract — the source-grep
 * tests this replaces passed even when countIsExact/atCap were computed
 * but never wired to the button or the notes (review 09-19 P2).
 */
describe("ExploreGridFooter", () => {
  afterEach(cleanup);

  it("shows a bare 'Load more' for met-source results", () => {
    // `total` counts upstream hits before the open-access sieve — the
    // button cannot promise a deliverable count (devin 09-10 08:17 #1).
    render(<ExploreGridFooter {...base} countIsExact={false} />);
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Load \d+ more/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the exact count for curated/fixture results", () => {
    render(<ExploreGridFooter {...base} nextCount={12} />);
    expect(
      screen.getByRole("button", { name: "Load 12 more" }),
    ).toBeInTheDocument();
  });

  it("suppresses the cap note when the usable stream is exhausted", () => {
    // Once fillExhausted fires, the exhaustion note owns the ending —
    // the raw-total-derived remaining must not also fire the cap
    // (devin 09-10 08:17 #2).
    render(
      <ExploreGridFooter {...base} canLoadMore={false} fillExhausted atCap />,
    );
    expect(
      screen.getByText(/No further open-access works surfaced/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This view stops at \d+ records/),
    ).not.toBeInTheDocument();
  });

  it("explains the record cap when the ceiling owns the ending", () => {
    render(<ExploreGridFooter {...base} canLoadMore={false} atCap />);
    expect(
      screen.getByText(/This view stops at 96 records/),
    ).toBeInTheDocument();
  });

  it("words the failed-fill note against the cap when at the ceiling", () => {
    render(
      <ExploreGridFooter {...base} canLoadMore={false} fillFailed atCap />,
    );
    expect(
      screen.getByText(/failed to load within the record cap/),
    ).toBeInTheDocument();
  });
});
