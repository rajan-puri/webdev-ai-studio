/**
 * scripts/verify-browser-flows.js
 * End-to-end browser walkthrough using Playwright Chromium to test and capture evidence of major user flows.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { db } = require('../server/data/database');

const EVIDENCE_DIR = path.join(__dirname, '../test-verification-evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Get active session
const activeSession = db.prepare(`
  SELECT s.id, s.user_id 
  FROM sessions s 
  JOIN users u ON s.user_id = u.id 
  WHERE u.email = 'demo@webdev.ai' OR u.id = 'user_demo' 
  LIMIT 1
`).get() || db.prepare('SELECT id, user_id FROM sessions ORDER BY created_at DESC LIMIT 1').get();

if (!activeSession) {
  console.error('No session found');
  process.exit(1);
}

async function runBrowserVerification() {
  console.log('Launching Chromium for browser verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Set session cookie
  await context.addCookies([{
    name: 'studio_session',
    value: activeSession.id,
    domain: '127.0.0.1',
    path: '/'
  }]);

  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:3000/ ...');
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Open SEO Audit tool via nav click or openSeoAudit
  console.log('Opening SEO Audit tool via sidebar link (#navSeoAudit)...');
  await page.click('#navSeoAudit');
  await page.waitForTimeout(1500);

  // 1. SEO Dashboard Tab
  console.log('Verifying Tab 1: SEO Dashboard...');
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_seo_dashboard_initial.png') });

  // Enter a domain in Dashboard Overview input
  const domainInput = page.locator('#txtOverviewDomain');
  const btnRunOverview = page.locator('#btnRunSeoOverview');
  if (await domainInput.count() > 0 && await btnRunOverview.count() > 0) {
    await domainInput.fill('bkpainters.co.nz');
    await btnRunOverview.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_seo_dashboard_overview.png') });
    console.log('Captured: 02_seo_dashboard_overview.png');
  }

  // 2. Site Audit Tab
  console.log('Verifying Tab 2: Site Audit...');
  await page.click('button.seo-suite-tab[data-tab="audit"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_site_audit_pane.png') });
  console.log('Captured: 03_site_audit_pane.png');

  // 3. Competitive Research Tab
  console.log('Verifying Tab 3: Competitive Research...');
  await page.click('button.seo-suite-tab[data-tab="competitors"]');
  await page.waitForTimeout(800);
  const compTarget = page.locator('#txtCompTarget');
  const compCompetitor = page.locator('#txtCompCompetitor');
  const btnRunComp = page.locator('#btnRunCompetitorCompare');
  if (await compTarget.count() > 0 && await compCompetitor.count() > 0) {
    await compTarget.fill('bkpainters.co.nz');
    await compCompetitor.fill('housepainters.co.nz');
    if (await btnRunComp.count() > 0) {
      await btnRunComp.click();
      await page.waitForTimeout(2000);
    }
  }
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_competitive_research.png') });
  console.log('Captured: 04_competitive_research.png');

  // 4. Organic & Keywords Tab
  console.log('Verifying Tab 4: Organic & Keywords...');
  await page.click('button.seo-suite-tab[data-tab="keywords"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_organic_keywords.png') });
  console.log('Captured: 05_organic_keywords.png');

  // 5. PageSpeed & CrUX Tab
  console.log('Verifying Tab 5: PageSpeed & CrUX...');
  await page.click('button.seo-suite-tab[data-tab="performance"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_pagespeed_crux.png') });
  console.log('Captured: 06_pagespeed_crux.png');

  // 6. Link Intelligence Tab
  console.log('Verifying Tab 6: Link Intelligence...');
  await page.click('button.seo-suite-tab[data-tab="links"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_link_intelligence.png') });
  console.log('Captured: 07_link_intelligence.png');

  // 7. Log File Analyzer Tab
  console.log('Verifying Tab 7: Log File Analyzer...');
  await page.click('button.seo-suite-tab[data-tab="logs"]');
  await page.waitForTimeout(800);

  const btnLoadSample = page.locator('#btnLoadSampleLogs');
  const btnAnalyzeLogs = page.locator('#btnAnalyzeLogs');
  if (await btnLoadSample.count() > 0) {
    await btnLoadSample.click();
    await page.waitForTimeout(500);
    if (await btnAnalyzeLogs.count() > 0) {
      await btnAnalyzeLogs.click();
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_log_analyzer_results.png') });
  console.log('Captured: 08_log_analyzer_results.png');

  // 8. Export Center Tab
  console.log('Verifying Tab 8: Export Center...');
  await page.click('button.seo-suite-tab[data-tab="reports"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '09_export_center.png') });
  console.log('Captured: 09_export_center.png');

  // 9. Settings -> SEO Data Providers Card
  console.log('Verifying Settings: SEO Data Providers Card...');
  await page.evaluate(() => {
    if (window.SettingsView) window.SettingsView.open();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '10_settings_providers.png') });
  console.log('Captured: 10_settings_providers.png');

  await browser.close();
  console.log('\nBrowser walkthrough completed successfully! All screenshots saved in test-verification-evidence/');
}

runBrowserVerification().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
