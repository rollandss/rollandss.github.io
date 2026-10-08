// Refreshes project screenshots from the live sites.
// Run by .github/workflows/screenshots.yml (weekly + manual), or locally:
//   npm ci && npx playwright install chromium && node scripts/screenshots.mjs
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// "calendar" is intentionally absent: its live page shows real employee names,
// so its screenshot is maintained by hand with the names replaced.
const PAGES = {
  pricecortex: "https://www.pricecortex.com",
  "oblik-stores": "https://oblik-stores.vercel.app",
  "tests-system": "https://tests-system-vert.vercel.app",
  notificator: "https://notificator-lake.vercel.app",
  "brutal-ui": "https://brutal-ui-one.vercel.app",
  training: "https://training-olive-three.vercel.app",
};

// Same 768:560 ratio the HTML reserves for each image, so layout never shifts.
const VIEWPORT = { width: 1280, height: 933 };
const OUT = "assets/screenshots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1.5,
  colorScheme: "light",
  locale: "uk-UA",
  reducedMotion: "reduce",
});

let failed = 0;
for (const [id, url] of Object.entries(PAGES)) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1500); // let fonts and charts settle
    const png = await page.screenshot({ type: "png" });
    const img = sharp(png).resize({ width: 1536 });
    await img.clone().webp({ quality: 82 }).toFile(`${OUT}/${id}.webp`);
    await img.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(`${OUT}/${id}.jpg`);
    console.log(`ok   ${id}`);
  } catch (err) {
    failed++;
    console.error(`fail ${id}: ${err.message}`); // keep the previous screenshot
  } finally {
    await page.close();
  }
}
await browser.close();
if (failed === Object.keys(PAGES).length) process.exit(1);
