// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailSkeleton } from "./detail-skeleton";

describe("DetailSkeleton", () => {
  it("threads the artwork ratio into the image placeholder", () => {
    const { container } = render(<DetailSkeleton imageAspectRatio={0.75} />);
    const image = container.querySelector(".detail-loading__image");
    expect(image).toBeTruthy();
    expect(image?.getAttribute("style")).toContain("--artwork-ratio");
    expect(image?.getAttribute("style")).toContain("0.75");
  });

  it("drops the min-height floor when the ratio is known (real box is ratio-exact)", () => {
    const { container } = render(<DetailSkeleton imageAspectRatio={1.55} />);
    const image = container.querySelector(".detail-loading__image");
    expect(image?.getAttribute("style")).toContain("--artwork-min-height");
  });

  it("keeps the min-height floor when the ratio is unknown", () => {
    const { container } = render(<DetailSkeleton />);
    const image = container.querySelector(".detail-loading__image");
    expect(image?.getAttribute("style")).toBeNull();
  });

  it("keeps the busy state honest for AT", () => {
    const { container } = render(<DetailSkeleton imageAspectRatio={1.25} />);
    const frame = container.querySelector(".detail-loading");
    expect(frame?.getAttribute("aria-busy")).toBe("true");
  });
});
