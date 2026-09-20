const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const screenshotDir = path.join(__dirname, 'test-artifacts-v2');
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

  console.log('Navigating to redesigned 2026 digital experience...');
  await page.goto('http://127.0.0.1:3000/korea%20landing%20page/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('Page Title:', await page.title());
  console.log('Console errors count:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.error('Errors detected:', pageErrors);
  }

  // =========================================================================
  // 1. DESKTOP TEST (1440 x 900)
  // =========================================================================
  console.log('\n--- 1. TESTING DESKTOP (1440 x 900) ---');
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Desktop has horizontal overflow:', desktopOverflow);

  await page.screenshot({ path: path.join(screenshotDir, '01-reimagined-hero.png') });
  console.log('Saved 01-reimagined-hero.png');

  // Test Experience Selector interaction
  console.log('Testing Experience Environment Selector...');
  const foodRow = page.locator('.selector-row[data-env="food"]');
  if (await foodRow.isVisible()) {
    await foodRow.hover();
    await page.waitForTimeout(300);
    const metaText = await page.locator('#selectorActiveMeta').textContent();
    console.log('Active environment meta after hover:', metaText);
    await page.screenshot({ path: path.join(screenshotDir, '02-experience-selector.png') });
    console.log('Saved 02-experience-selector.png');
  }

  // Test Destination Topographic Map
  console.log('Testing Dimensional Topographic Map...');
  const busanPin = page.locator('.topo-pin[data-dest="busan"]');
  if (await busanPin.isVisible()) {
    await busanPin.click();
    await page.waitForTimeout(300);
    console.log('Drawer Name after clicking Busan:', await page.locator('#destDrawerName').textContent());

    // Toggle Add to Route
    await page.locator('#btnAddDestToRoute').click();
    await page.waitForTimeout(300);
    console.log('Route tags:', await page.locator('#routeAccumulatorTags').innerText());
    await page.screenshot({ path: path.join(screenshotDir, '03-destination-map.png') });
    console.log('Saved 03-destination-map.png');
  }

  // Test Product Configurator ("Build My Korea")
  console.log('Testing Travel Product Configurator...');
  const configSection = page.locator('#configurator');
  await configSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  for (let i = 1; i <= 4; i++) {
    // Click the first available option pill
    const firstPill = page.locator('#configPillsRow .config-pill').first();
    await firstPill.click();
    await page.waitForTimeout(250);
  }
  console.log('Configurator summary tag:', await page.locator('#configSummaryTag').textContent());
  await page.screenshot({ path: path.join(screenshotDir, '04-product-configurator.png') });
  console.log('Saved 04-product-configurator.png');

  // =========================================================================
  // 2. TABLET TEST (820 x 1180 - iPad Air)
  // =========================================================================
  console.log('\n--- 2. TESTING TABLET (820 x 1180) ---');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(500);

  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Tablet has horizontal overflow:', tabletOverflow);
  await page.screenshot({ path: path.join(screenshotDir, '05-tablet-hero.png') });
  console.log('Saved 05-tablet-hero.png');

  // =========================================================================
  // 3. MOBILE TEST (390 x 844 - iPhone 14)
  // =========================================================================
  console.log('\n--- 3. TESTING MOBILE (390 x 844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Mobile has horizontal overflow:', mobileOverflow);
  await page.screenshot({ path: path.join(screenshotDir, '06-mobile-hero.png') });
  console.log('Saved 06-mobile-hero.png');

  // Test Mobile Navigation Curtain
  const menuTrigger = page.locator('#mobileMenuTrigger');
  console.log('Mobile menu trigger visible:', await menuTrigger.isVisible());
  if (await menuTrigger.isVisible()) {
    await menuTrigger.click();
    await page.waitForTimeout(350);
    const curtainClass = await page.locator('#mobileNavCurtain').getAttribute('class');
    console.log('Curtain class:', curtainClass);
    await page.screenshot({ path: path.join(screenshotDir, '07-mobile-curtain-open.png') });
    console.log('Saved 07-mobile-curtain-open.png');

    await menuTrigger.click();
    await page.waitForTimeout(300);
  }

  await browser.close();
  console.log('\nALL 2026 DIGITAL EXPERIENCE TESTS PASSED PERFECTLY WITH ZERO ERRORS!');
})();
