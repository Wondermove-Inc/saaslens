# Screenshot Generation Guide

This directory contains visual assets for the saaslens README and documentation.

## Current Assets

| File                   | Purpose                          | Status |
| ---------------------- | -------------------------------- | ------ |
| `hero-banner.svg`      | README top banner (1280x640)     | Ready  |
| `architecture.svg`     | How it works diagram             | Ready  |
| `social-preview.svg`   | GitHub Social Preview (1280x640) | Ready  |
| `dashboard.png`        | Main dashboard screenshot        | TODO   |
| `subscriptions.png`    | Subscription list screenshot     | TODO   |
| `payment-matching.png` | Payment matching screenshot      | TODO   |
| `cost-analytics.png`   | Cost analytics screenshot        | TODO   |
| `ai-agent.png`         | AI agent screenshot              | TODO   |

## How to Generate Screenshots

### Step 1: Prepare Demo Seed Data

Create demo seed data that showcases realistic (but fictional) SaaS management data:

```bash
# Create the demo seed file
# Location: prisma/seeds/demo.ts

npx tsx prisma/seeds/demo.ts
```

The demo data should include:

- 30-40 SaaS apps (Slack, Notion, Figma, GitHub, AWS, etc.)
- 50-80 users across 5-6 departments
- 6 months of payment records
- Mix of matched/unmatched payments
- Some unused seats and stale users
- Department cost breakdown data

### Step 2: Capture Screenshots

#### Option A: Manual Capture (Quick)

1. Start the dev server: `npm run dev`
2. Navigate to each page and take screenshots (macOS: Cmd+Shift+4)
3. Save to this directory as PNG files

#### Option B: Playwright Automated Capture (Recommended)

```typescript
// scripts/capture-screenshots.ts
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "docs/screenshots";

const pages = [
  { path: "/dashboard", name: "dashboard", waitFor: ".dashboard-grid" },
  {
    path: "/subscriptions",
    name: "subscriptions",
    waitFor: ".subscription-list",
  },
  { path: "/payments", name: "payment-matching", waitFor: ".payment-table" },
  { path: "/reports/cost", name: "cost-analytics", waitFor: ".cost-chart" },
  { path: "/ai-agent", name: "ai-agent", waitFor: ".agent-panel" },
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });

  for (const page of pages) {
    const p = await context.newPage();
    await p.goto(`${BASE_URL}${page.path}`);
    await p.waitForSelector(page.waitFor, { timeout: 10000 });
    await p.screenshot({
      path: `${SCREENSHOT_DIR}/${page.name}.png`,
      fullPage: false,
    });
    await p.close();
  }

  await browser.close();
}

captureScreenshots();
```

Run with:

```bash
npx tsx scripts/capture-screenshots.ts
```

### Step 3: Apply Browser Mockup Frame (Optional)

For a more polished look, wrap screenshots in a browser frame:

1. **Screenshot.rocks** (recommended, open-source):
   - Visit https://screenshot.rocks
   - Upload each PNG
   - Select "Chrome" frame style
   - Download and replace the original PNG

2. **Screely** (alternative):
   - Visit https://screely.com
   - Upload screenshot
   - Customize background color (recommend: `#0F172A` to match banner)
   - Download

### Step 4: Set GitHub Social Preview

1. Go to repository Settings > General
2. Scroll to "Social preview"
3. Upload `social-preview.svg` (or convert to PNG first: 1280x640px)

## Image Guidelines

- **Format**: PNG for screenshots, SVG for diagrams/banners
- **Resolution**: 2x retina (2880x1800 for 1440x900 viewport)
- **Max file size**: Keep under 500KB per image (compress with TinyPNG if needed)
- **Alt text**: Always include descriptive alt text in markdown
- **Dark mode**: Screenshots should use the app's default (light) theme unless showcasing dark mode
- **Data**: Use fictional company names and data — never real customer data

## Maintaining Screenshots

When the UI changes significantly:

1. Re-run the Playwright capture script
2. Re-apply mockup frames if used
3. Commit updated images
4. Check README renders correctly on GitHub
