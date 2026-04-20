import path from "path";
import { chromium } from "playwright";

const MOCKUP_DIR = path.join(__dirname, "mockups");
const OUTPUT_DIR = path.join(__dirname, "..", "docs", "screenshots");

const pages = [
  { file: "dashboard.html", output: "dashboard.png" },
  { file: "subscriptions.html", output: "subscriptions.png" },
  { file: "cost-analytics.html", output: "cost-analytics.png" },
];

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const page of pages) {
    const p = await context.newPage();
    const filePath = path.join(MOCKUP_DIR, page.file);
    await p.goto(`file://${filePath}`);
    await p.waitForTimeout(1000); // Wait for Tailwind CDN + fonts to load
    await p.screenshot({
      path: path.join(OUTPUT_DIR, page.output),
      fullPage: false,
    });
    console.log(`Captured: ${page.output}`);
    await p.close();
  }

  await browser.close();
  console.log("All screenshots captured!");
}

capture().catch(console.error);
