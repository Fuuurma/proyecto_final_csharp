import { expect, type Page, test } from "@playwright/test";

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
  await expect(page).toHaveURL(/\/art\/436535$/);
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

  await expect(page.locator(".selection-empty__image-link")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Wheat Field with Cypresses" }),
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
  await expect(page).toHaveURL(/\/art\/436535$/);
});

test("Curated paths narrow the review set", async ({ page }) => {
  await page.goto("/explore?path=van-gogh-late-light");

  await expect(
    page.getByRole("heading", { name: "Van Gogh / late light" }),
  ).toBeVisible();
  await expect(page.locator(".explore-count")).toHaveText("3 / 3 review works");
  await expect(page.locator(".artwork-card")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: /Return to all works/ }),
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
  await expect(page.locator(".artwork-card")).toHaveCount(24);
  const loadMore = page.getByRole("button", { name: /Load .* more/ });
  await expect(loadMore).toBeVisible();
  await loadMore.scrollIntoViewIfNeeded();
  await loadMore.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".artwork-card")).toHaveCount(45);
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
