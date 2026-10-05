import fs from "node:fs";
import { chromium } from "playwright";

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "wide-1920", width: 1920, height: 1080 },
];

const routes = [
  { name: "home-full", path: "/" },
  { name: "explore-full", path: "/explore" },
  { name: "explore-search-full", path: "/explore?q=van+gogh" },
  { name: "detail-full", path: "/art/436535" },
  { name: "departments-full", path: "/departments" },
  { name: "about-full", path: "/about" },
];

fs.mkdirSync(".review-screenshots", { recursive: true });

async function main() {
  const browser = await chromium.launch();

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Test populated selection
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "meet-the-met.selection",
        JSON.stringify([
          {
            id: 436535,
            displayTitle: "Wheat Field with Cypresses",
            artist: "Vincent van Gogh",
            date: "1889",
            primaryImageSmall:
              "https://images.metmuseum.org/CRDImages/ep/web-large/DP145914.jpg",
            imageAspectRatio: 1.27,
          },
          {
            id: 436524,
            displayTitle: "Sunflowers",
            artist: "Vincent van Gogh",
            date: "1887",
            primaryImageSmall:
              "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
            imageAspectRatio: 1.25,
          },
          {
            id: 45434,
            displayTitle: "The Great Wave off Kanagawa",
            artist: "Katsushika Hokusai",
            date: "ca. 1830–32",
            primaryImageSmall:
              "https://images.metmuseum.org/CRDImages/as/web-large/DP130155.jpg",
            imageAspectRatio: 1.48,
          },
        ]),
      );
    });

    for (const route of routes) {
      await page.goto(`http://127.0.0.1:3180${route.path}`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      const filename = `.review-screenshots/${route.name}-${vp.name}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Captured ${filename}`);
    }

    // Capture populated selection page
    await page.goto("http://127.0.0.1:3180/selection", {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `.review-screenshots/selection-populated-${vp.name}.png`,
      fullPage: true,
    });
    console.log(`Captured selection-populated-${vp.name}.png`);

    // Capture 404 page
    await page.goto("http://127.0.0.1:3180/non-existent-room", {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `.review-screenshots/404-${vp.name}.png`,
      fullPage: true,
    });
    console.log(`Captured 404-${vp.name}.png`);

    await context.close();
  }

  await browser.close();
}

main().catch((error) => {
  // console.error alone exits 0 — CI and wrappers would read a failed
  // capture run (no server, launch, or navigation) as success.
  console.error(error);
  process.exitCode = 1;
});
