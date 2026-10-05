import { expect, type Page, test } from "@playwright/test";
import { SEARCH_PAGE_SIZE } from "../src/lib/met/search-query";

function selectionNav(page: Page) {
  return page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: /^Selection/ });
}

test("Home → Explore → detail → Save → Selection", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The collection, made legible/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Explore the collection" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(
    page.getByRole("heading", { name: "Explore the collection." }),
  ).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Search the collection" })
    .fill("van Gogh");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/explore\?q=van\+Gogh/);
  await expect(
    page.getByRole("searchbox", { name: "Search the collection" }),
  ).toHaveValue("van Gogh");
  const artworkLink = page
    .locator(".artwork-card")
    .filter({ hasText: "Wheat Field with Cypresses" })
    .getByRole("heading")
    .getByRole("link", { name: "Wheat Field with Cypresses", exact: true });
  await expect(artworkLink).toBeVisible();
  await artworkLink.click();
  await expect(page).toHaveURL(/\/art\/436535(\?|$)/);
  await expect(
    page.locator(".detail-heading").getByRole("heading", {
      name: "Wheat Field with Cypresses",
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Save Wheat Field with Cypresses/ })
    .click();
  await expect(
    page.getByRole("button", { name: /Remove Wheat Field with Cypresses/ }),
  ).toBeVisible();

  // The persisted payload is the mergeable versioned document, and a reload
  // rehydrates the saved state from it.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("meet-the-met.selection"),
  );
  expect(JSON.parse(stored ?? "null")).toMatchObject({ version: 2 });
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Remove Wheat Field with Cypresses/ }),
  ).toBeVisible();

  await selectionNav(page).click();
  await expect(page).toHaveURL(/\/selection$/);
  await expect(
    page.getByRole("heading", { name: "Your selection." }),
  ).toBeVisible();
  await expect(
    page.locator(".selection-row__meta").getByRole("heading", {
      name: "Wheat Field with Cypresses",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clear this selection?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep works" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
});

test("selection edits synchronize across open tabs", async ({
  page,
  context,
}) => {
  const otherTab = await context.newPage();
  await Promise.all([page.goto("/art/436535"), otherTab.goto("/art/436524")]);

  const saveWheat = page.getByRole("button", {
    name: /Save Wheat Field with Cypresses/,
  });
  const saveSunflowers = otherTab.getByRole("button", {
    name: /Save Sunflowers/,
  });
  await expect(saveWheat).toBeEnabled();
  await expect(saveSunflowers).toBeEnabled();

  await saveWheat.click();
  await expect(
    otherTab.getByRole("button", {
      name: /Remove Wheat Field with Cypresses from your selection/,
    }),
  ).toBeVisible();

  await saveSunflowers.click();
  await expect(
    page.getByRole("button", {
      name: /Remove Sunflowers from your selection/,
    }),
  ).toBeVisible();

  await selectionNav(page).click();
  await expect(page).toHaveURL(/\/selection$/);
  await expect(page.locator(".selection-row__meta")).toHaveCount(2);
  await expect(
    page.locator(".selection-row__meta").getByRole("heading", {
      name: "Wheat Field with Cypresses",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".selection-row__meta").getByRole("heading", {
      name: "Sunflowers",
    }),
  ).toBeVisible();
});

test("Detail Previous/Next follow the browsed Explore order", async ({
  page,
}) => {
  // Fixture mode filters the committed set in curated order, so
  // "van Gogh" lays out a known sequence: Wheat Field, Sunflowers,
  // Irises, Roses, La Berceuse, Women Picking Olives, Bouquet.
  await page.goto("/explore?q=van+Gogh");
  const cards = page.locator(".artwork-card");
  await expect(cards).toHaveCount(7);
  // The `?seq=` link is only truthful once Explore's mount effect has
  // persisted the browsed order — a click in the gap carries a param
  // pointing at nothing and the detail route now renders the honest
  // empty nav instead of the curated pose (review 09-19 18:17 P2).
  // Wait for the write itself, not a timer.
  await page.waitForFunction(() =>
    Object.keys(window.sessionStorage).some(
      (key) => key.startsWith("mtm-seq:") && key !== "mtm-seq:_index",
    ),
  );

  await cards
    .nth(1)
    .getByRole("heading")
    .getByRole("link", { name: "Sunflowers", exact: true })
    .click();
  // The link carries an opaque `<key>.<sig>` sequence param — never the
  // raw search identity (review 09-19 P2 + 18:17 P2).
  await expect(page).toHaveURL(/\/art\/436524\?seq=[a-z0-9]+\.[a-z0-9]+$/);

  // Position resolves inside the browsed list, not the 45-work curated
  // set the deep-link fallback would count.
  await expect(page.locator(".detail-page__position")).toHaveText(/02 \/ 07/);
  const sequence = page.locator(".detail-sequence");
  await expect(
    sequence.getByRole("link", { name: /Wheat Field with Cypresses/ }),
  ).toHaveAttribute("href", /\/art\/436535\?seq=[a-z0-9]+\.[a-z0-9]+/);
  await expect(sequence.getByRole("link", { name: /Irises/ })).toHaveAttribute(
    "href",
    /\/art\/436528\?seq=[a-z0-9]+\.[a-z0-9]+/,
  );

  // Arrow-key paging keeps walking the same sequence.
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/art\/436528\?seq=[a-z0-9]+\.[a-z0-9]+$/);
  await expect(page.locator(".detail-page__position")).toHaveText(/03 \/ 07/);
});

test("Explore explains an empty search", async ({ page }) => {
  await page.goto("/explore?q=not-a-real-object");

  await expect(
    page.getByRole("heading", { name: "The index is quiet here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Reset the search" }),
  ).toBeVisible();
});

test("Selection empty state keeps a featured object in view", async ({
  page,
}) => {
  await page.goto("/selection");

  await expect(
    page.getByRole("link", { name: /Open Wheat Field with Cypresses/ }),
  ).toBeVisible();
});

test("Artwork tiles keep image, title, and a path into the record", async ({
  page,
}) => {
  await page.goto("/explore");
  await page.evaluate(() => document.fonts.ready);

  const firstCard = page.locator(".artwork-card").first();
  const titleLink = firstCard.getByRole("heading").getByRole("link", {
    name: "Wheat Field with Cypresses",
  });

  await expect(titleLink).toBeVisible();
  await expect(firstCard.getByText("Vincent van Gogh")).toBeVisible();

  await firstCard.locator(".artwork-card__image-link").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/art\/436535(\?|$)/);
});

test("Curated paths narrow the review set", async ({ page }) => {
  await page.goto("/explore?path=van-gogh-late-light");

  await expect(
    page.getByRole("heading", { name: "Van Gogh / late light" }),
  ).toBeVisible();
  await expect(page.locator(".explore-count")).toHaveText("3 / 3 review works");
  await expect(page.locator(".artwork-card")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: /Return to review set/ }),
  ).toBeVisible();
});

test("Home department index opens a bounded department view", async ({
  page,
}) => {
  await page.goto("/");

  const departmentLink = page
    .locator(".collection-index__item")
    .filter({ hasText: "Asian Art" });
  await departmentLink.click();

  await expect(page).toHaveURL(/\/explore\?department=(?:Asian(?:%20|\+)Art)/);
  await expect(page.getByRole("heading", { name: "Asian Art" })).toBeVisible();
  await expect(page.locator(".explore-count")).toHaveText("6 / 6 review works");
});

test("Collection index intro keeps its sticky header offset", async ({
  page,
}) => {
  // The intro is a sibling of .site-header — its sticky top only
  // resolves while --header-h lives on :root (review 10-05 11:17 #4).
  await page.goto("/");
  const intro = page.locator(".collection-index__intro");
  await expect(intro).toBeVisible();

  const geometry = await intro.evaluate((el) => {
    const computed = getComputedStyle(el);
    const root = getComputedStyle(document.documentElement);
    return {
      position: computed.position,
      top: computed.top,
      headerH: root.getPropertyValue("--header-h").trim(),
      rem: parseFloat(root.fontSize),
    };
  });
  const expectedTop = parseFloat(geometry.headerH) + geometry.rem;

  if ((page.viewportSize()?.width ?? 0) <= 760) {
    // The 760px media block deliberately unpins the intro; the token
    // still narrows the header it would clear.
    expect(geometry.position).toBe("static");
    expect(geometry.headerH).toBe("68px");
    return;
  }

  expect(geometry.position).toBe("sticky");
  expect(geometry.headerH).toBe("76px");
  expect(geometry.top).toBe(`${expectedTop}px`);

  // Scroll the index section's midpoint to the viewport center — safely
  // inside the sticky range at both ends (scrolling to the page bottom
  // would clamp the intro against the section's bottom edge instead).
  const pinned = await intro.evaluate((el) => {
    const section = el.closest(".collection-index");
    if (!section) {
      return null;
    }
    const rect = section.getBoundingClientRect();
    const delta = rect.top + rect.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: window.scrollY + delta, behavior: "instant" });
    return el.getBoundingClientRect().top;
  });
  expect(pinned).toBeCloseTo(expectedTop, 0);
});

test("About keeps the source and working rules in view", async ({ page }) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "Open data, given room to breathe." }),
  ).toBeVisible();
  await expect(page.getByText("Source object")).toBeVisible();
  await expect(page.getByText("The Great Wave, ca. 1830–32")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What stays visible." }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved works stay local to this browser."),
  ).toBeVisible();
});

test("Explore path chips encode the path in the URL", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("link", { name: "Van Gogh / late light" }).click();
  await expect(page).toHaveURL(/path=van-gogh-late-light/);
  await expect(
    page.getByRole("heading", { name: "Van Gogh / late light" }),
  ).toBeVisible();
  await expect(page.locator(".explore-count")).toHaveText("3 / 3 review works");
});

test("A broad Explore search can load another page of the index", async ({
  page,
}) => {
  await page.goto("/explore");
  await page
    .getByRole("searchbox", { name: "Search the collection" })
    .fill("e");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=e/);
  // First page ships exactly SEARCH_PAGE_SIZE cards — assert the
  // contract, not the fixture's current match count (devin 09-09
  // 22:57 #1-adjacent: a seed edit used to break this spec).
  await expect(page.locator(".artwork-card")).toHaveCount(SEARCH_PAGE_SIZE);
  const loadMore = page.getByRole("button", { name: /Load .* more/ });
  await expect(loadMore).toBeVisible();
  await loadMore.scrollIntoViewIfNeeded();
  await loadMore.click();
  await expect(page).toHaveURL(/page=2/);
  // Loading another page adds works without dropping what arrived.
  // The count must be RETRYING — the tail-fill fetch resolves after
  // the URL changes, and a snapshot read it mid-flight (the 24-cap
  // that masked fixture engagement all night).
  await expect(page.locator(".artwork-card")).not.toHaveCount(SEARCH_PAGE_SIZE);
  const after = await page.locator(".artwork-card").count();
  expect(after).toBeGreaterThan(SEARCH_PAGE_SIZE);
});

// Regression: a stale path must not suppress the selected page of live results.
test("Explore restores live pages through stale paths, filters, and browser history", async ({
  page,
}) => {
  await page.goto("/explore?q=e&path=stale-room&page=2");
  await expect(page.getByRole("heading", { name: "“e”" })).toBeVisible();
  await expect
    .poll(() => page.locator(".artwork-card").count())
    .toBeGreaterThan(SEARCH_PAGE_SIZE);

  // A new department filter clears the stale path and selected page while
  // keeping the live query; browser back restores the shareable prior state.
  await page.getByRole("button", { name: "Asian Art", exact: true }).click();
  await expect
    .poll(() => {
      const search = new URL(page.url()).searchParams;
      return {
        q: search.get("q"),
        department: search.get("department"),
        path: search.get("path"),
        page: search.get("page"),
      };
    })
    .toEqual({ q: "e", department: "Asian Art", path: null, page: null });

  await page.goBack();
  await expect
    .poll(() => {
      const search = new URL(page.url()).searchParams;
      return [search.get("q"), search.get("path"), search.get("page")];
    })
    .toEqual(["e", "stale-room", "2"]);
  await expect
    .poll(() => page.locator(".artwork-card").count())
    .toBeGreaterThan(SEARCH_PAGE_SIZE);

  // Department-only page 2 is empty in this fixture, so the prior page must
  // be restored even though an unrelated path slug remains in the URL.
  await page.goto("/explore?department=Asian%20Art&path=stale-room&page=2");
  await expect(page.getByRole("heading", { name: "Asian Art" })).toBeVisible();
  await expect(page.locator(".artwork-card")).toHaveCount(6);
  await expect(page.locator(".explore-count")).toHaveText("6 / 6 review works");

  // A recognized curated path still owns its own ordered three-work set.
  await page.goto("/explore?path=van-gogh-late-light&page=2");
  await expect(
    page.getByRole("heading", { name: "Van Gogh / late light" }),
  ).toBeVisible();
  await expect(page.locator(".artwork-card")).toHaveCount(3);
  await expect(
    page
      .locator(".path-chip-row")
      .getByRole("link", { name: "Van Gogh / late light", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("Departments index opens a review room and a live department", async ({
  page,
}) => {
  await page.goto("/departments");
  await expect(
    page.getByRole("heading", { name: "Departments." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Egyptian Art" }),
  ).toBeVisible();

  await page
    .locator(".collection-index__item")
    .filter({ hasText: "Asian Art" })
    .click();
  await expect(page).toHaveURL(/\/explore\?department=(?:Asian(?:%20|\+)Art)/);
  await expect(page.locator(".explore-count")).toHaveText("6 / 6 review works");

  await page.goto("/departments");
  await page
    .locator(".department-ledger__item")
    .filter({ hasText: "Egyptian Art" })
    .getByRole("link", { name: /Open in Explore/ })
    .click();
  await expect(page).toHaveURL(/departmentId=10/);
  await expect(
    page.getByRole("heading", { name: "Egyptian Art" }),
  ).toBeVisible();
  await expect(page.locator(".explore-count")).toHaveText("2 / 2 review works");
});

test("Selection hanging can be reordered", async ({ page }) => {
  await page.goto("/art/436535");
  await page
    .getByRole("button", { name: /Save Wheat Field with Cypresses/ })
    .click();
  await expect(
    page.getByRole("button", { name: /Remove Wheat Field with Cypresses/ }),
  ).toBeVisible();

  await page
    .locator(".detail-sequence")
    .getByRole("link", { name: /Sunflowers/ })
    .click();
  await expect(page).toHaveURL(/\/art\/436524$/);
  await page.getByRole("button", { name: /Save Sunflowers/ }).click();
  await expect(
    page.getByRole("button", { name: /Remove Sunflowers/ }),
  ).toBeVisible();

  await selectionNav(page).click();
  await expect(page).toHaveURL(/\/selection$/);
  const rows = page.locator(".selection-row");
  await expect(rows.nth(0).getByRole("heading")).toHaveText("Sunflowers");
  await expect(rows.nth(1).getByRole("heading")).toHaveText(
    "Wheat Field with Cypresses",
  );

  await rows
    .nth(0)
    .getByRole("button", { name: "Move Sunflowers later" })
    .click();
  await expect(rows.nth(0).getByRole("heading")).toHaveText(
    "Wheat Field with Cypresses",
  );
  await expect(rows.nth(1).getByRole("heading")).toHaveText("Sunflowers");
});

test("Artwork detail keeps additional views and a wider related room", async ({
  page,
}) => {
  await page.goto("/art/436535");

  await expect(page.getByRole("link", { name: /Open image/ })).toBeVisible();
  const sequence = page.locator(".detail-sequence");
  await expect(
    sequence.getByRole("heading", { name: "Sunflowers" }),
  ).toBeVisible();
  await expect(
    sequence.getByRole("link", { name: /Sunflowers.*Open record/ }),
  ).toBeVisible();

  await expect(
    page.getByRole("tablist", { name: "Object views" }),
  ).toBeVisible();
  const additionalView = page.getByRole("tab", { name: "Additional view 1" });
  await additionalView.scrollIntoViewIfNeeded();
  await additionalView.click();
  await expect(additionalView).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".related-grid .artwork-card")).toHaveCount(6);
});

test("Explore cards can save a work into the local hanging", async ({
  page,
}) => {
  await page.goto("/explore");
  const wheatCard = page
    .locator(".artwork-card")
    .filter({ hasText: "Wheat Field with Cypresses" });
  const saveButton = wheatCard.getByRole("button", {
    name: "Save Wheat Field with Cypresses to your selection",
  });

  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(
    wheatCard.getByRole("button", {
      name: "Remove Wheat Field with Cypresses from your selection",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Your local selection" }),
  ).toBeVisible();
});

test("A saved work still has a local record when the live object is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "meet-the-met.selection",
      JSON.stringify([
        {
          id: 999999,
          displayTitle: "A local-only work",
          artist: "A remembered maker",
          date: "1900",
          primaryImageSmall:
            "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
          imageAspectRatio: 1.2,
        },
      ]),
    );
  });
  await page.goto("/art/999999");

  await expect(
    page.getByText("Showing the copy saved in this browser."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A local-only work" }),
  ).toBeVisible();
  await expect(page.getByText("A remembered maker")).toBeVisible();
});

/**
 * MTM-TOUCH-ZOOM-CUE-01: the high-resolution cue was `opacity: 0` and
 * revealed only by `:hover` / `:focus-visible`. On a coarse pointer
 * neither exists before the first tap, so a touch user saw a plain
 * picture and had no way to know tapping it opened the full view.
 *
 * This is the behavioral half of the contract: a real browser with a
 * coarse pointer emulated, asserting the cue is actually painted and
 * legible BEFORE any interaction. A source pin cannot prove that, and
 * the previous test suite had no coverage of this case at all.
 */
test.describe("inspect cue by pointer type", () => {
  const cue = (page: Page) => page.locator(".detail-image-hint");

  /**
   * The dev server compiles /art/:id on demand, so the first navigation
   * to a given object can answer ERR_EMPTY_RESPONSE while the route
   * builds. playwright.config.ts documents retries as the intended
   * absorber for that, but a cold-start failure inside a new test is
   * indistinguishable from a real one, so these cases warm the route
   * explicitly and only then assert. A test that passes on retry 2 is
   * not evidence.
   */
  const gotoArtwork = async (page: Page, id = "436535") => {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(`/art/${id}`);
        return;
      } catch (error) {
        const cold = /ERR_EMPTY_RESPONSE|ECONNREFUSED/.test(
          (error as Error).message,
        );
        if (!cold || attempt >= 3) throw error;
        await page.waitForTimeout(1000);
      }
    }
  };

  // No describe-level test.use({ hasTouch }): that would apply to the
  // desktop hover test too, and a touch context has no hover to reveal
  // the cue with. The touch cases build their own coarse-pointer
  // context below; this one runs on the project's normal device.

  test("a touch user sees the inspect cue without hovering or focusing", async ({
    browser,
  }) => {
    // A fresh context so the emulation applies to this page only and
    // cannot leak into the desktop project running in parallel.
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    try {
      await gotoArtwork(page);
      const hint = cue(page);
      await expect(hint).toBeVisible();

      // Visible is not the same as painted: opacity: 0 elements report
      // as visible to Playwright, so read the resolved value.
      const opacity = await hint.evaluate((el) => getComputedStyle(el).opacity);
      expect(
        Number(opacity),
        "the coarse-pointer cue is still transparent",
      ).toBe(1);

      // Legible at arm's length: the desktop register is 10px.
      const fontSize = await hint.evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      );
      expect(fontSize).toBeGreaterThanOrEqual(12);

      // The cue must not swallow the artwork — it is a plate over the
      // image, so its backdrop has to stay translucent. Parse the
      // computed color rather than the source: color-mix() resolves to
      // `color(srgb r g b / a)`, which has no commas, so the obvious
      // split-and-take-the-last regex yields NaN and fails a correct
      // stylesheet. This handles both rgba() and color(srgb … / a).
      const alpha = await hint.evaluate((el) => {
        const raw = getComputedStyle(el).backgroundColor;
        const slashed = raw.match(/\/\s*([\d.]+)\s*\)/);
        if (slashed) return Number(slashed[1]);
        const parts = raw.match(/[\d.]+/g);
        return parts?.length === 4 ? Number(parts[3]) : 1;
      });
      expect(
        alpha,
        "the coarse cue's plate is opaque and hides the artwork",
      ).toBeLessThan(1);

      // And it must not be parked outside the image.
      const offset = await hint.evaluate(
        (el) => getComputedStyle(el).transform,
      );
      expect(
        offset === "none" || offset.includes("matrix(1, 0, 0, 1, 0, 0)"),
      ).toBe(true);

      // The tap still works, and the cue is honest about what it does.
      await page
        .getByRole("button", { name: /Inspect .* in high resolution/ })
        .tap();
      await expect(page.getByRole("dialog")).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("desktop still reveals the cue on hover", async ({ page }) => {
    // A real touch device (the `mobile` project is Pixel 7) has no
    // hover, so asserting the hover enhancement there tests a pointer
    // the device does not have — and would fail by design. This case
    // is only meaningful on a fine pointer.
    test.skip(
      test.info().project.name === "mobile",
      "no hover on the mobile device profile",
    );
    await gotoArtwork(page);
    const hint = cue(page);
    // At rest on a fine pointer the cue stays hidden — the archive
    // stillness the desktop design chose.
    await expect
      .poll(async () =>
        hint.evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBe(0);

    await page
      .getByRole("button", { name: /Inspect .* in high resolution/ })
      .hover();
    await expect
      .poll(async () =>
        hint.evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBe(1);
  });

  test("reduced motion keeps the cue static and visible on touch", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await gotoArtwork(page);
      const hint = cue(page);
      await expect(hint).toBeVisible();
      const styles = await hint.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          opacity: s.opacity,
          transform: s.transform,
          transition: s.transitionDuration,
        };
      });
      expect(Number(styles.opacity)).toBe(1);
      // The global reduce block drives transition-duration to 0.01ms,
      // not 0 — a literal-zero assertion would fail a correct
      // stylesheet. What matters is that the 180ms fade is gone.
      expect(
        parseFloat(styles.transition) || 0,
        "the coarse cue still animates under reduced motion",
      ).toBeLessThanOrEqual(0.01);
    } finally {
      await context.close();
    }
  });
});
