/**
 * App Store Screenshot Generator
 *
 * Takes screenshots at exact App Store dimensions for all required device sizes.
 * Runs against a local dev server.
 *
 * Usage:
 *   node scripts/screenshots.js
 *
 * Environment variables (or edit defaults below):
 *   PORT           - dev server port (default: 3001)
 *   ORG_CODE       - organization gate code
 *   TEST_EMAIL     - login email
 *   TEST_PASSWORD  - login password
 *
 * Screens captured:
 *   01-Login, 02-Home, 03-SalesTools, 04-AIChat, 05-Downloads, 06-ContentViewer
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// --- Config (override with env vars) ---
const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
const ORG_CODE = process.env.ORG_CODE || 'REPLACE_ORG_CODE';
const EMAIL = process.env.TEST_EMAIL || 'REPLACE_TEST_EMAIL';
const PASSWORD = process.env.TEST_PASSWORD || 'REPLACE_TEST_PASSWORD';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');

// App Store required device sizes
// iPhone 6.5" Display: 1242x2688 (iPhone 11 Pro Max / XS Max)
// iPad 12.9" Display: 2048x2732 (iPad Pro 12.9")
const DEVICES = [
  {
    name: 'iPhone-6.5',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    // Output: 1242x2688
  },
  {
    name: 'iPad-12.9',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    // Output: 2048x2732
  },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, device, name) {
  const dir = path.join(OUTPUT_DIR, device.name);
  fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  ${name}.png`);
}

// Wait for URL to change to a given path via client-side routing
async function waitForPath(page, pathPart, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (page.url().includes(pathPart)) return true;
    await sleep(300);
  }
  return false;
}

// Navigate using client-side routing (preserves auth session)
async function navigateTo(page, path) {
  await page.evaluate((p) => window.history.pushState({}, '', p), path);
  // Trigger React Router to re-render by dispatching popstate
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
  await sleep(4000);
}

// Helper: find and click a nav button by label, including inside More menu
async function clickNavButton(page, label) {
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = (await btn.textContent().catch(() => '')).trim();
    if (text === label && await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      return true;
    }
  }
  // Try expanding More menu
  for (const btn of buttons) {
    const text = (await btn.textContent().catch(() => '')).trim();
    if (text === 'More' && await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await sleep(600);
      const expanded = await page.locator('button').all();
      for (const b of expanded) {
        const t = (await b.textContent().catch(() => '')).trim();
        if (t === label && await b.isVisible().catch(() => false)) {
          await b.click({ force: true });
          return true;
        }
      }
      break;
    }
  }
  return false;
}

// Helper: find a clickable content card on the resources page
async function clickContentCard(page) {
  const items = await page.locator('div[style*="cursor"]').all();
  for (const item of items) {
    const box = await item.boundingBox().catch(() => null);
    if (box && box.width > 50 && box.width < 200 && box.height > 50) {
      await item.click();
      return true;
    }
  }
  return false;
}

async function runForDevice(device) {
  console.log(`\n--- ${device.name} (${device.viewport.width}x${device.viewport.height} @${device.deviceScaleFactor}x) ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.name.startsWith('iPhone'),
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    // ---- Organization Gate ----
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const orgInput = page.locator('input[placeholder*="code" i], input[placeholder*="Code"]');
    if (await orgInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orgInput.fill(ORG_CODE);
      await page.locator('button:has-text("Continue")').click();
      // Wait for org gate to dismiss and login form to appear
      await page.waitForSelector('.login-input, input[placeholder="Email"]', { timeout: 15000 });
      await sleep(1000);
    }

    // ---- 01: Login Screen ----
    await page.waitForSelector('.login-input, input[placeholder="Email"]', { timeout: 15000 });
    await sleep(1000);
    await takeScreenshot(page, device, '01-Login');

    // ---- Log in ----
    await page.locator('input[placeholder="Email"]').fill(EMAIL);
    await page.locator('input[placeholder="Password"]').fill(PASSWORD);
    await sleep(300);
    await page.locator('.login-primary-button').click({ force: true });

    // Wait for /home via client-side routing
    const loggedIn = await waitForPath(page, '/home');
    if (!loggedIn) {
      // Debug: screenshot what we're seeing
      await page.screenshot({ path: path.join(OUTPUT_DIR, `debug-${device.name}.png`) });
      const bodyText = await page.locator('body').textContent().catch(() => '');
      console.log('  Login failed. URL:', page.url());
      console.log('  Page text snippet:', bodyText.substring(0, 200));
      await browser.close();
      return;
    }
    await sleep(4000);

    // ---- 02: Home/Feed ----
    await takeScreenshot(page, device, '02-Home');

    // ---- 03: Sales Tools (Resources) ----
    // Use nav button click instead of page.goto to preserve session
    if (await clickNavButton(page, 'Sales Tools')) {
      await sleep(4000);
    }
    await takeScreenshot(page, device, '03-SalesTools');

    // ---- Download files for the Downloads screenshot later ----
    // Click first content card and download
    if (await clickContentCard(page)) {
      await sleep(1500);
      const dlBtn = page.locator('button:has-text("Download for Offline Use")');
      if (await dlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('    Downloading file for offline use...');
        await dlBtn.click();
        await sleep(3000);
      }
      // Close modal
      await page.locator('div[style*="position: fixed"]').first().click({ position: { x: 10, y: 10 }, force: true });
      await sleep(1000);

      // Download a second item
      const allCards = await page.locator('div[style*="cursor"]').all();
      for (let i = 1; i < allCards.length; i++) {
        const box = await allCards[i].boundingBox().catch(() => null);
        if (box && box.width > 50 && box.width < 200 && box.height > 50) {
          await allCards[i].click({ force: true });
          await sleep(1500);
          const dlBtn2 = page.locator('button:has-text("Download for Offline Use")');
          if (await dlBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('    Downloading second file...');
            await dlBtn2.click();
            await sleep(3000);
          }
          await page.locator('div[style*="position: fixed"]').first().click({ position: { x: 10, y: 10 }, force: true });
          await sleep(500);
          break;
        }
      }
    }

    // ---- 04: AI Chat ----
    if (await clickNavButton(page, 'AI Agent')) {
      await sleep(3000);
      // Screenshot the AI panel as-is (product selection screen)
      await takeScreenshot(page, device, '04-AIChat');

      // Close AI panel - try multiple approaches
      await page.keyboard.press('Escape');
      await sleep(500);
      await page.keyboard.press('Escape');
      await sleep(500);
      await page.mouse.click(10, 10);
      await sleep(500);
      // Navigate to home first to fully reset
      await navigateTo(page, '/home');
      await sleep(2000);
    } else {
      console.log('  (skipped 04-AIChat - AI Agent button not found)');
    }

    // ---- 05: Downloads ----
    if (await clickNavButton(page, 'Downloads')) {
      await sleep(3000);
    }
    await takeScreenshot(page, device, '05-Downloads');

    // ---- 06: Content Viewer ----
    // Navigate back to resources via nav
    if (await clickNavButton(page, 'Sales Tools')) {
      await sleep(4000);
    }
    if (await clickContentCard(page)) {
      await sleep(1500);
      await takeScreenshot(page, device, '06-ContentViewer');
    } else {
      console.log('  (skipped 06-ContentViewer - no content cards found)');
    }

    console.log('  Done.');
  } catch (err) {
    console.error(`  Error on ${device.name}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('App Store Screenshot Generator');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Clean output dir
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Verify server is running
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(`Server not running at ${BASE_URL}. Start it first.`);
    process.exit(1);
  }

  for (const device of DEVICES) {
    await runForDevice(device);
  }

  console.log(`\nAll screenshots saved to ${OUTPUT_DIR}/`);
}

main().catch(console.error);
