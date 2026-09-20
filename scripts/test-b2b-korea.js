const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const screenshotDir = path.join(__dirname, 'test-artifacts-b2b');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  console.log('Navigating to Dynasty Korea B2B DMC Landing Page...');
  await page.goto('http://127.0.0.1:3000/korea%20landing%20page/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('Page Title:', await page.title());
  console.log('Console Errors:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.error('Errors found:', pageErrors);
  }

  // =========================================================================
  // 1. DESKTOP TEST (1440 x 900)
  // =========================================================================
  console.log('\n--- 1. TESTING DESKTOP (1440 x 900) ---');
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Desktop has horizontal overflow:', desktopOverflow);

  // Hero Screenshot
  await page.screenshot({ path: path.join(screenshotDir, '01-b2b-hero.png') });
  console.log('Saved 01-b2b-hero.png');

  // Verify Hero Headline & Trust line
  const heroHeadline = await page.locator('.hero-headline').innerText();
  console.log('Hero Headline:\n', heroHeadline.trim());

  // Test Section 01: Korea Network Map
  console.log('\nTesting Section 01: Regional Network Map...');
  const busanNode = page.locator('.map-node[data-node="busan"]');
  if (await busanNode.isVisible()) {
    await busanNode.click({ force: true });
    await page.waitForTimeout(300);
    const inspectorTitle = await page.locator('#inspector-title').textContent();
    console.log('Inspector title after clicking Busan:', inspectorTitle);
    await page.screenshot({ path: path.join(screenshotDir, '02-network-map-busan.png') });
    console.log('Saved 02-network-map-busan.png');
  }

  // Test Section 02: B2B Packages Drawer
  console.log('\nTesting Section 02: Editorial Package Drawer...');
  const firstPkgBtn = page.locator('.open-pkg-drawer').first();
  await firstPkgBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await firstPkgBtn.click();
  await page.waitForTimeout(400);

  const drawerTitle = await page.locator('#drawer-pkg-title').textContent();
  console.log('Package Drawer Opened with Title:', drawerTitle);
  await page.screenshot({ path: path.join(screenshotDir, '03-package-drawer-open.png') });
  console.log('Saved 03-package-drawer-open.png');

  // Close drawer
  await page.locator('#close-pkg-drawer').click();
  await page.waitForTimeout(300);

  // Test Section 05: Itinerary Builder
  console.log('\nTesting Section 05: B2B Itinerary Builder...');
  const builderSection = page.locator('#trade-builder');
  await builderSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Click MICE in style
  const miceBtn = page.locator('.builder-btn[data-val="MICE & Conferences"]');
  if (await miceBtn.isVisible()) {
    await miceBtn.click();
  }
  await page.waitForTimeout(200);

  const bpStyleText = await page.locator('#bp-style').textContent();
  console.log('Blueprint Style updated to:', bpStyleText);
  await page.screenshot({ path: path.join(screenshotDir, '04-trade-builder.png') });
  console.log('Saved 04-trade-builder.png');

  // Test B2B Quote Modal
  console.log('\nTesting B2B Quote Modal...');
  const quoteNavBtn = page.locator('.btn-b2b-primary.trigger-quote-modal').first();
  await quoteNavBtn.click();
  await page.waitForTimeout(400);

  const modalActive = await page.locator('#b2b-quote-modal').evaluate(el => el.classList.contains('active'));
  console.log('Quote Modal active state:', modalActive);
  await page.screenshot({ path: path.join(screenshotDir, '05-quote-modal.png') });
  console.log('Saved 05-quote-modal.png');

  // Close Modal
  await page.locator('#close-quote-modal').click();
  await page.waitForTimeout(300);

  // =========================================================================
  // 2. TABLET TEST (820 x 1180)
  // =========================================================================
  console.log('\n--- 2. TESTING TABLET (820 x 1180) ---');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(500);

  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Tablet horizontal overflow:', tabletOverflow);
  await page.screenshot({ path: path.join(screenshotDir, '06-tablet-view.png') });
  console.log('Saved 06-tablet-view.png');

  // =========================================================================
  // 3. MOBILE TEST (390 x 844)
  // =========================================================================
  console.log('\n--- 3. TESTING MOBILE (390 x 844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Mobile horizontal overflow:', mobileOverflow);

  // Check Sticky Bar
  const stickyBarVisible = await page.locator('.mobile-sticky-bar').isVisible();
  console.log('Mobile Sticky Bar visible:', stickyBarVisible);

  await page.screenshot({ path: path.join(screenshotDir, '07-mobile-hero.png') });
  console.log('Saved 07-mobile-hero.png');

  // Test Mobile Curtain Menu
  const mobileToggle = page.locator('#mobileMenuBtn');
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    await page.waitForTimeout(400);
    const curtainActive = await page.locator('#mobileCurtain').evaluate(el => el.classList.contains('active'));
    console.log('Mobile Curtain active:', curtainActive);
    await page.screenshot({ path: path.join(screenshotDir, '08-mobile-curtain.png') });
    console.log('Saved 08-mobile-curtain.png');
    await mobileToggle.click();
    await page.waitForTimeout(300);
  }

  await browser.close();

  if (pageErrors.length > 0) {
    console.error('TEST FAILED: Found page errors:', pageErrors);
    process.exit(1);
  } else if (desktopOverflow || tabletOverflow || mobileOverflow) {
    console.error('TEST FAILED: Horizontal overflow detected!');
    process.exit(1);
  } else {
    console.log('\nALL B2B TESTS PASSED WITH 0 ERRORS AND 0 OVERFLOW!');
  }
})();
