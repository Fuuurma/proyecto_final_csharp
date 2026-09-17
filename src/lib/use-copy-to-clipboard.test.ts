// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCopyToClipboard } from "./use-copy-to-clipboard";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useCopyToClipboard", () => {
  it("reports failure when the clipboard API is absent, and the note auto-clears", async () => {
    vi.useFakeTimers();
    const stubbed = navigator;
    // jsdom ships no clipboard; make the absence explicit.
    Object.defineProperty(window, "navigator", {
      value: { ...stubbed, clipboard: undefined },
      configurable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("text");
    });

    expect(outcome).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.copyFailed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copyFailed).toBe(false);
  });

  it("reports copied on success and clears after the reset window", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "navigator", {
      value: { ...navigator, clipboard: { writeText } },
      configurable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("link");
    });

    expect(outcome).toBe(true);
    expect(writeText).toHaveBeenCalledWith("link");
    expect(result.current.copied).toBe(true);
    expect(result.current.copyFailed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it("reports failure when the write rejects", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(window, "navigator", {
      value: { ...navigator, clipboard: { writeText } },
      configurable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("link");
    });

    expect(outcome).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.copyFailed).toBe(true);
  });
});
