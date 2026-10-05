// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Artwork } from "@/lib/met/normalize";
import { ShareButton } from "./share-button";

const artwork = {
  id: 1,
  title: "Probe",
  displayTitle: "Probe",
  canonicalUrl: "https://www.metmuseum.org/art/collection/search/1",
} as unknown as Artwork;

const originalNavigator = window.navigator;

function installClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(window, "navigator", {
    configurable: true,
    value: { ...originalNavigator, clipboard: { writeText } },
  });
}

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
});

describe("share button accessible name", () => {
  it("keeps Share and Copied link in the visible and accessible labels", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);
    render(<ShareButton artwork={artwork} />);

    const share = screen.getByRole("button", {
      name: "Share — copy this object page link",
    });
    expect(share.textContent).toContain("Share");
    expect(share.getAttribute("aria-label")).toContain("Share");

    fireEvent.click(share);
    const copied = await screen.findByRole("button", {
      name: "Copied link — copy this object page link again",
    });
    expect(copied.textContent).toContain("Copied link");
    expect(copied.getAttribute("aria-label")).toContain("Copied link");
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("keeps Copy failed in the accessible name when copying is denied", async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<ShareButton artwork={artwork} />);

    fireEvent.click(screen.getByRole("button", { name: /^Share/ }));
    const failed = await screen.findByRole("button", {
      name: /^Copy failed —/,
    });
    expect(failed.textContent).toContain("Copy failed");
    expect(failed.getAttribute("aria-label")).toContain("Copy failed");
    expect(failed.isConnected).toBe(true);
  });
});
