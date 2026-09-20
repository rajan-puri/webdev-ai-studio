const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const screenshotDir = path.join(__dirname, 'test-artifacts-light');
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

  console.log('Navigating to Dynasty Korea LIGHT Editorial B2B DMC Landing Page...');
  await page.goto('http://127.0.0.1:3000/korea%20landing%20page/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('Page Title:', await page.title());
  console.log('Console Errors count:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.error('Page errors encountered:', pageErrors);
  }

  // =========================================================================
  // 1. DESKTOP TEST (1440 x 900)
  // =========================================================================
  console.log('\n--- 1. TESTING DESKTOP (1440 x 900) ---');
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Desktop has horizontal overflow:', desktopOverflow);

  // Verify Background is Light
  const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('Body Computed Background Color:', bodyBg);

  // Screenshot 01: Hero
  await page.screenshot({ path: path.join(screenshotDir, '01-light-hero.png') });
  console.log('Saved 01-light-hero.png');

  // Verify Hero Headline
  const heroTitle = await page.locator('.hero-giant-title').innerText();
  console.log('Hero Headline:\n', heroTitle.trim());

  // Test Section 01: Three Cities Asymmetric Grid
  console.log('\nTesting Section 01: Three Cities Asymmetrical Layout...');
  const seoulSpread = page.locator('.seoul-spread');
  await seoulSpread.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotDir, '02-three-cities-asymmetric.png') });
  console.log('Saved 02-three-cities-asymmetric.png');

  // Test Section 02: B2B Packages Drawer
  console.log('\nTesting Section 02: B2B Packages Browser & Drawer...');
  const firstPkgBtn = page.locator('.open-pkg-drawer').first();
  await firstPkgBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await firstPkgBtn.click();
  await page.waitForTimeout(400);

  const drawerTitle = await page.locator('#drawer-title').textContent();
  console.log('Package Drawer Opened with Title:', drawerTitle);
  await page.screenshot({ path: path.join(screenshotDir, '03-package-drawer-light.png') });
  console.log('Saved 03-package-drawer-light.png');

  // Close drawer
  await page.locator('#close-pkg-drawer').click();
  await page.waitForTimeout(300);

  // Test Section 03: Why Dynasty Editorial List
  console.log('\nTesting Section 03: Why Dynasty Editorial List...');
  const secondRow = page.locator('.trade-editorial-row[data-index="02"]');
  await secondRow.scrollIntoViewIfNeeded();
  await secondRow.hover();
  await page.waitForTimeout(300);
  const activeBadge = await page.locator('#why-stage-badge').textContent();
  console.log('Active Stage Badge after row hover:', activeBadge);

  // Test Section 06: Interactive Korea Map
  console.log('\nTesting Section 06: Interactive Light Korea Map & Route Builder...');
  const mapSection = page.locator('#section-map');
  await mapSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const busanNode = page.locator('.interactive-node[data-node="busan"]');
  await busanNode.click({ force: true });
  await page.waitForTimeout(300);
  const inspectorTitle = await page.locator('#map-inspect-title').textContent();
  console.log('Map Inspector Title for Busan:', inspectorTitle);

  // Add to Route
  await page.locator('#btnAddCurrentDest').click();
  await page.waitForTimeout(200);
  const routeChain = await page.locator('#accRouteChain').innerText();
  console.log('Accumulated Client Route Chain:', routeChain.replace(/\n/g, ' '));
  await page.screenshot({ path: path.join(screenshotDir, '04-interactive-light-map.png') });
  console.log('Saved 04-interactive-light-map.png');

  // Test Section 07: Itinerary Builder
  console.log('\nTesting Section 07: B2B Itinerary Configurator...');
  const builderSection = page.locator('#trade-builder');
  await builderSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Toggle MICE pill
  const micePill = page.locator('.cfg-pill[data-val="MICE & Conference (50+ PAX)"]');
  await micePill.click();
  await page.waitForTimeout(200);
  const bpType = await page.locator('#bp-val-type').textContent();
  console.log('Blueprint Client Type:', bpType);
  await page.screenshot({ path: path.join(screenshotDir, '05-itinerary-builder-light.png') });
  console.log('Saved 05-itinerary-builder-light.png');

  // Test Final CTA Section (Confirming it is bright/light)
  console.log('\nTesting Final CTA Section...');
  const finalCta = page.locator('#section-final');
  await finalCta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotDir, '06-final-cta-light.png') });
  console.log('Saved 06-final-cta-light.png');

  // Test B2B Quote Modal
  console.log('\nTesting B2B Quote Modal...');
  const navQuoteBtn = page.locator('.open-quote-modal').first();
  await navQuoteBtn.click();
  await page.waitForTimeout(400);
  const modalActive = await page.locator('#b2b-quote-modal').evaluate(el => el.classList.contains('active'));
  console.log('Quote Modal active state:', modalActive);
  await page.screenshot({ path: path.join(screenshotDir, '07-quote-modal-light.png') });
  console.log('Saved 07-quote-modal-light.png');
  await page.locator('#close-quote-modal').click();
  await page.waitForTimeout(300);

  // =========================================================================
  // 2. TABLET TEST (820 x 1180 - iPad Air)
  // =========================================================================
  console.log('\n--- 2. TESTING TABLET (820 x 1180) ---');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(500);

  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Tablet horizontal overflow:', tabletOverflow);
  await page.screenshot({ path: path.join(screenshotDir, '08-tablet-hero.png') });
  console.log('Saved 08-tablet-hero.png');

  // =========================================================================
  // 3. MOBILE TEST (390 x 844 - iPhone 14)
  // =========================================================================
  console.log('\n--- 3. TESTING MOBILE (390 x 844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Mobile horizontal overflow:', mobileOverflow);

  // Sticky Bottom Bar
  const stickyBarVisible = await page.locator('.mobile-trade-bar').isVisible();
  console.log('Mobile Sticky Bar visible:', stickyBarVisible);

  await page.screenshot({ path: path.join(screenshotDir, '09-mobile-hero.png') });
  console.log('Saved 09-mobile-hero.png');

  // Test Mobile Navigation Curtain
  const mobileToggle = page.locator('#mobileMenuBtn');
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    await page.waitForTimeout(350);
    const curtainActive = await page.locator('#mobileNavCurtain').evaluate(el => el.classList.contains('active'));
    console.log('Mobile Navigation Curtain active:', curtainActive);
    await page.screenshot({ path: path.join(screenshotDir, '10-mobile-curtain.png') });
    console.log('Saved 10-mobile-curtain.png');
    await mobileToggle.click();
    await page.waitForTimeout(300);
  }

  await browser.close();

  if (pageErrors.length > 0) {
    console.error('FAILED: Page console errors detected:', pageErrors);
    process.exit(1);
  } else if (desktopOverflow || tabletOverflow || mobileOverflow) {
    console.error('FAILED: Horizontal overflow detected on one or more viewports!');
    process.exit(1);
  } else {
    console.log('\nALL LIGHT EDITORIAL B2B TESTS PASSED WITH 0 ERRORS AND 0 OVERFLOW!');
  }
})();
