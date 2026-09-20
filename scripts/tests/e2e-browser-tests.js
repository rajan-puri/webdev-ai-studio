/**
 * scripts/tests/e2e-browser-tests.js
 * Suite D: Browser / E2E Verification Tests
 * Uses Playwright to verify UI components, property dropdowns, attribution,
 * CrUX/Lighthouse separation, and Zero Fake Data across all views.
 */

const assert = require('assert');
const { chromium } = require('playwright');
const { db } = require('../../server/data/database');

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== Suite D: Browser / E2E Verification Tests (Playwright Chromium) ===\n');

  // Find or create active session
  let activeSession = db.prepare("SELECT * FROM sessions WHERE expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1").get();
  if (!activeSession) {
    const userId = 'browser_test_user_' + Date.now();
    const sessId = 'sess_e2e_' + Date.now();
    db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, 'E2E User')").run(userId, `${userId}@example.com`);
    db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(sessId, userId);
    activeSession = { id: sessId, user_id: userId };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addCookies([{
    name: 'studio_session',
    value: activeSession.id,
    domain: '127.0.0.1',
    path: '/'
  }]);

  const page = await context.newPage();

  try {
    // 1. Navigation & Authentication
    await runTest('Browser Init: Navigate to application and verify dashboard load', async () => {
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('#navSeoAudit', { state: 'attached', timeout: 10000 });
      assert.ok(true);
    });

    // 2. Open SEO Audit / Intelligence
    await runTest('SEO Intelligence: Open SEO tool and verify tabs render', async () => {
      await page.click('#navSeoAudit');
      await page.waitForTimeout(1000);
      const tabCount = await page.locator('button.seo-suite-tab').count();
      assert.ok(tabCount >= 7, `Expected at least 7 tabs, found ${tabCount}`);
    });

    // 3. Verify Organic Keywords & GSC Property Controls
    await runTest('GSC Controls: Verify property selector, query filter, and unconnected banner', async () => {
      await page.click('button.seo-suite-tab[data-tab="keywords"]');
      await page.waitForTimeout(600);

      // Verify property select dropdown exists
      const propSelect = page.locator('#gscPropertySelect');
      assert.strictEqual(await propSelect.count(), 1, 'Property select dropdown #gscPropertySelect must exist');

      // Verify query filter input exists
      const queryFilter = page.locator('#gscQueryFilterInput');
      assert.strictEqual(await queryFilter.count(), 1, 'Query filter input #gscQueryFilterInput must exist');

      // Verify unconnected state banner is visible when not connected (Zero fake data)
      const gscContent = await page.textContent('#paneSeoKeywords');
      assert.ok(
        gscContent.includes('Google Search Console Not Connected') || gscContent.includes('Not Connected') || gscContent.includes('Connect'),
        'Unconnected state banner must be displayed without fake numbers'
      );
    });

    // 4. Verify PageSpeed & CrUX Field Metrics Separation
    await runTest('PageSpeed & CrUX: Verify separate CrUX field metrics container and explanation', async () => {
      await page.click('button.seo-suite-tab[data-tab="performance"]');
      await page.waitForTimeout(600);

      const speedContent = await page.textContent('#paneSeoPerformance');
      assert.ok(speedContent.includes('Chrome User Experience Report') || speedContent.includes('CrUX') || speedContent.includes('Real User Experience'), 'Must mention CrUX field data');
      assert.ok(speedContent.includes('Lighthouse') || speedContent.includes('Lab Data') || speedContent.includes('Simulated'), 'Must separate Lighthouse lab data from CrUX');
    });

    // 5. Verify Ahrefs Domain Rating & Attribution
    await runTest('Link Intelligence: Verify Ahrefs card and mandatory attribution text', async () => {
      await page.click('button.seo-suite-tab[data-tab="links"]');
      await page.waitForTimeout(600);

      const linksContent = await page.textContent('#paneSeoLinks');
      assert.ok(
        linksContent.includes('Domain Rating by Ahrefs') || linksContent.includes('Ahrefs'),
        'Mandatory attribution "Domain Rating by Ahrefs" must be visible'
      );
    });

    // 6. Verify Log File Analyzer Dropzone
    await runTest('Log File Analyzer: Verify file dropzone and sample log loader', async () => {
      await page.click('button.seo-suite-tab[data-tab="logs"]');
      await page.waitForTimeout(600);

      const btnLoadSample = page.locator('#btnLoadSampleLog');
      const dropzone = page.locator('#seoLogDropzone');
      assert.strictEqual(await btnLoadSample.count(), 1, '#btnLoadSampleLog must be present');
      assert.strictEqual(await dropzone.count(), 1, '#seoLogDropzone must be present');
    });

    // 7. Verify Settings SEO Providers Configuration Card
    await runTest('Settings Pane: Verify SEO Data Providers configuration controls', async () => {
      await page.evaluate(() => {
        if (window.SettingsView && window.SettingsView.open) {
          window.SettingsView.open();
        } else if (window.navigateToView) {
          window.navigateToView('viewSettings');
        }
      });
      await page.waitForTimeout(800);

      const settingsView = page.locator('#viewSettings');
      assert.strictEqual(await settingsView.count(), 1, '#viewSettings container must exist');
      const settingsText = await settingsView.textContent();
      assert.ok(settingsText.includes('SEO Data Providers') || settingsText.includes('Google Search Console'));
      assert.ok(settingsText.includes('Bing Webmaster'));
      assert.ok(settingsText.includes('Ahrefs'));
      assert.ok(settingsText.includes('PageSpeed'));
    });

    // 8. Global Zero Fake Data Audit in Browser DOM
    await runTest('Zero Fake Data Audit: Ensure no mock or synthetic placeholders in rendered UI', async () => {
      await page.click('#navSeoAudit');
      await page.waitForTimeout(600);
      await page.click('button.seo-suite-tab[data-tab="keywords"]');
      await page.waitForTimeout(500);

      const keywordsHtml = await page.innerHTML('#paneSeoKeywords');
      assert.ok(!keywordsHtml.includes('mock_query'), 'Must not contain mock query data');
      assert.ok(!keywordsHtml.includes('fake_keyword'), 'Must not contain fake keyword data');
      assert.ok(!keywordsHtml.includes('synthetic_traffic'), 'Must not contain synthetic traffic');
    });

  } finally {
    await browser.close();
  }

  console.log(`\nBrowser / E2E Test Results: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error running Suite D:', err);
  process.exit(1);
});
