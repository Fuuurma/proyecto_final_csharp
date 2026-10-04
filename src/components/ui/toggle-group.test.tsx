// @vitest-environment jsdom
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const primitiveRenders = vi.hoisted(() => ({ count: 0 }));

// Render counter on the primitive ToggleGroupItem invokes — a leaf probe
// inside the item keeps a stable element identity and bails out either
// way, so the count must live where the item's own render runs.
vi.mock("@base-ui/react/toggle", () => ({
  Toggle: ({ children }: { children?: ReactNode }) => {
    primitiveRenders.count += 1;
    return <button type="button">{children}</button>;
  },
}));

/**
 * react-doctor jsx-no-constructed-context-values (10-04): the provider
 * value was a fresh object each render, so every ToggleGroup re-render
 * re-rendered every item even when variant/size/spacing/orientation
 * stood still. The memoized value lets consumers bail out — pinned by
 * a group re-render that changes only className.
 */
describe("toggle-group context value", () => {
  it("does not re-render items when only unrelated group props change", () => {
    // The items element must be a stable reference across group
    // re-renders — that element-identity bailout is exactly what the
    // memoized context value protects.
    const items = (
      <ToggleGroupItem value="all">All departments</ToggleGroupItem>
    );
    function Harness({ className }: { className?: string }) {
      return (
        <ToggleGroup
          aria-label="Department"
          className={className}
          onValueChange={() => {}}
          value={["all"]}
        >
          {items}
        </ToggleGroup>
      );
    }

    const { rerender } = render(<Harness />);
    const mounted = primitiveRenders.count;
    expect(mounted).toBeGreaterThan(0);

    rerender(<Harness className="restyled" />);
    expect(primitiveRenders.count).toBe(mounted);
  });
});
