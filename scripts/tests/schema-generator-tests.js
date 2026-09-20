/**
 * scripts/tests/schema-generator-tests.js
 * Comprehensive automated Playwright test suite for WebDev AI Studio Schema / Structured Data Workspace.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '../../test-verification-evidence/schema');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Starting Schema Generator Verification Tests...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 }
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // TEST SUITE 1: Navigation & Direct Route Loading
    // =========================================================================
    console.log('Test Suite 1: Navigation & Direct Route Loading');
    await page.goto('http://127.0.0.1:3000/schema-generator', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const schemaContainer = page.locator('#viewSchemaGenerator');
    const isVisible = await schemaContainer.isVisible();
    assert(isVisible, 'Direct navigation to /schema-generator renders #viewSchemaGenerator container');

    const breadcrumb = page.locator('#breadcrumbCurrent');
    const bcText = await breadcrumb.textContent();
    assert(bcText.includes('Schema Generator'), `Breadcrumb displays "Schema Generator" (Actual: "${bcText}")`);

    const navItem = page.locator('#navSchemaGenerator');
    const isNavActive = await navItem.evaluate(el => el.classList.contains('active'));
    assert(isNavActive, 'Sidebar item #navSchemaGenerator is marked as active');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-direct-route-loaded.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 2: Workflow Stepper & Layout Structure
    // =========================================================================
    console.log('\nTest Suite 2: Workflow Stepper & Workspace Layout');
    const stepper = page.locator('.schema-stepper-bar');
    assert(await stepper.isVisible(), 'Workflow stepper bar is visible');

    const stepBtns = await page.locator('.schema-step-btn').allTextContents();
    const hasAllSteps = stepBtns.some(s => s.includes('DISCOVER')) &&
                        stepBtns.some(s => s.includes('SCHEMA TYPE')) &&
                        stepBtns.some(s => s.includes('PROPERTY EDITOR')) &&
                        stepBtns.some(s => s.includes('VALIDATE & CODE')) &&
                        stepBtns.some(s => s.includes('IMPLEMENT & EXPORT'));
    assert(hasAllSteps, `Stepper contains all 5 stages (Found: ${stepBtns.join(', ')})`);

    // =========================================================================
    // TEST SUITE 3: Schema Type Catalog & Search Filtering
    // =========================================================================
    console.log('\nTest Suite 3: Schema Type Catalog & Search Filtering');
    await page.waitForSelector('.schema-type-card', { timeout: 5000 });
    const initialCardCount = await page.locator('.schema-type-card').count();
    assert(initialCardCount >= 10, `Type catalog rendered multiple Schema types (Count: ${initialCardCount})`);

    // Test Search filter
    const searchInput = page.locator('#schemaTypeSearch');
    await searchInput.fill('Product');
    await page.waitForTimeout(300);
    const filteredCount = await page.locator('.schema-type-card').count();
    assert(filteredCount >= 1 && filteredCount < initialCardCount, `Search filter narrowed cards for "Product" (Count: ${filteredCount})`);

    // Reset search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // =========================================================================
    // TEST SUITE 4: Property Builder & Live Code Generation (LocalBusiness)
    // =========================================================================
    console.log('\nTest Suite 4: Property Builder & Live Code Generation (LocalBusiness)');
    const localBizCard = page.locator('[data-select-type="LocalBusiness"]');
    await localBizCard.click();
    await page.waitForTimeout(400);

    // Fill Business Name and Address
    const nameInput = page.locator('input[data-fact="name"]');
    await nameInput.fill('Bluefin Sushi Bar');
    const streetInput = page.locator('input[data-fact="streetAddress"]');
    await streetInput.fill('456 Harbor Blvd');
    const cityInput = page.locator('input[data-fact="addressLocality"]');
    await cityInput.fill('San Francisco');
    await page.waitForTimeout(500);

    const codeDisplay = page.locator('#schemaCodeEditorDisplay');
    const codeText = await codeDisplay.textContent();
    assert(codeText.includes('"@context": "https://schema.org"'), 'Generated JSON-LD contains Schema.org context');
    assert(codeText.includes('"@type": "LocalBusiness"'), 'Generated JSON-LD contains @type LocalBusiness');
    assert(codeText.includes('"name": "Bluefin Sushi Bar"'), 'Generated JSON-LD contains input name "Bluefin Sushi Bar"');
    assert(codeText.includes('"streetAddress": "456 Harbor Blvd"'), 'Generated JSON-LD contains structured PostalAddress streetAddress');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-localbusiness-generated.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 5: Switch to Product Schema & Offers
    // =========================================================================
    console.log('\nTest Suite 5: Product Schema & Offers');
    const productCard = page.locator('[data-select-type="Product"]');
    await productCard.click();
    await page.waitForTimeout(400);

    const prodNameInput = page.locator('input[data-fact="name"]');
    await prodNameInput.fill('Noise-Cancelling Studio Headphones');
    const prodPriceInput = page.locator('input[data-fact="price"]');
    await prodPriceInput.fill('249.99');
    await page.waitForTimeout(500);

    const prodCode = await codeDisplay.textContent();
    assert(prodCode.includes('"@type": "Product"'), 'Code updated to @type Product');
    assert(prodCode.includes('"price": "249.99"'), 'Code includes structured offers with price 249.99');
    assert(prodCode.includes('"priceCurrency": "USD"'), 'Code includes default priceCurrency USD');

    // =========================================================================
    // TEST SUITE 6: Multi-layer Validation & Google Disclaimer
    // =========================================================================
    console.log('\nTest Suite 6: Multi-layer Validation & Google Disclaimer');
    const valStatus = page.locator('#schemaValMainStatus');
    const statusText = await valStatus.textContent();
    assert(statusText.length > 0, `Validation header rendered: "${statusText}"`);

    const disclaimerBox = page.locator('#schemaGoogleDisclaimerBox');
    const disclaimerText = await disclaimerBox.textContent();
    assert(disclaimerText.includes('Google Rich Results Eligibility Note'), 'Google Rich Results disclaimer heading present');
    assert(disclaimerText.includes('never guaranteed') || disclaimerText.includes('dynamically decide'), 'Google disclaimer explicitly states eligibility is unverified and presentation is dynamically determined');

    const googleBtn = page.locator('#schemaLinkGoogleTest');
    assert(await googleBtn.isVisible(), 'Google Rich Results Test external button is present');

    // =========================================================================
    // TEST SUITE 7: Source Discovery (HTML Extraction & Duplicate Detection)
    // =========================================================================
    console.log('\nTest Suite 7: Source Discovery & Duplicate Detection');
    const htmlTab = page.locator('[data-source-tab="html"]');
    await htmlTab.click();
    await page.waitForTimeout(300);

    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Apex Coffee Co. | Fresh Roasted Beans</title>
          <meta name="description" content="Artisan micro-roasted coffee delivered to your doorstep.">
          <link rel="canonical" href="https://apexcoffee.example.com/">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Apex Coffee Co.",
              "url": "https://apexcoffee.example.com"
            }
          </script>
        </head>
        <body>
          <h1>Artisan Coffee Delivered</h1>
        </body>
      </html>
    `;

    const htmlTextarea = page.locator('#schemaHtmlInput');
    await htmlTextarea.fill(testHtml);
    const extractBtn = page.locator('#schemaBtnAnalyzeHtml');
    await extractBtn.click();
    await page.waitForTimeout(1000);

    const summaryBox = page.locator('#schemaPageSummaryBox');
    assert(await summaryBox.isVisible(), 'Extracted page summary box is displayed');
    const summaryContent = await summaryBox.textContent();
    assert(summaryContent.includes('Apex Coffee Co.'), 'Summary extracted page title');

    const detectedBox = page.locator('#schemaDetectedBox');
    assert(await detectedBox.isVisible(), 'Detected existing schemas box is displayed');
    const detectedContent = await detectedBox.textContent();
    assert(detectedContent.includes('Organization'), 'Detected existing Organization schema on page');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-discovery-extracted.png'), fullPage: false });

    // =========================================================================
    // TEST SUITE 8: Code Formats & Export
    // =========================================================================
    console.log('\nTest Suite 8: Code Formats & Export Viewers');
    const scriptTab = page.locator('[data-code-view="script"]');
    await scriptTab.click();
    await page.waitForTimeout(200);
    const scriptCode = await codeDisplay.textContent();
    assert(scriptCode.includes('<script type="application/ld+json">'), 'Code viewer renders HTML <script> wrapper');

    const wpTab = page.locator('[data-code-view="wordpress"]');
    await wpTab.click();
    await page.waitForTimeout(200);
    const wpCode = await codeDisplay.textContent();
    assert(wpCode.includes("add_action('wp_head'"), 'Code viewer renders WordPress PHP snippet');

    const reactTab = page.locator('[data-code-view="react"]');
    await reactTab.click();
    await page.waitForTimeout(200);
    const reactCode = await codeDisplay.textContent();
    assert(reactCode.includes('dangerouslySetInnerHTML'), 'Code viewer renders React / Next.js snippet');

    // Switch back to JSON-LD
    const jsonldTab = page.locator('[data-code-view="jsonld"]');
    await jsonldTab.click();

    // =========================================================================
    // TEST SUITE 9: Save Schema to Workspace Library
    // =========================================================================
    console.log('\nTest Suite 9: Workspace Persistence & Library');
    page.once('dialog', async dialog => {
      console.log(`  [Dialog] prompt: "${dialog.message()}", filling with "Automated Test Schema"`);
      await dialog.accept('Automated Test Schema');
    });

    const saveBtn = page.locator('#schemaBtnSave');
    await saveBtn.click();
    await page.waitForTimeout(1000);

    const savedBadge = page.locator('#schemaSavedCountBadge');
    const count = parseInt(await savedBadge.textContent(), 10);
    assert(count >= 1, `Saved schemas count increased to ${count}`);

    // Open Library Drawer
    const libraryBtn = page.locator('#schemaBtnOpenLibrary');
    await libraryBtn.click();
    await page.waitForTimeout(500);

    const drawer = page.locator('#schemaLibraryDrawer');
    assert(await drawer.evaluate(el => el.classList.contains('open')), 'Saved schemas library drawer opened');

    const savedItem = page.locator('.schema-saved-item').first();
    assert(await savedItem.isVisible(), 'Saved schema item displayed in drawer');
    const itemText = await savedItem.textContent();
    assert(itemText.includes('Automated Test Schema'), 'Saved schema name matches in drawer list');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-library-drawer.png'), fullPage: false });

    // Close drawer
    const closeBtn = page.locator('#schemaBtnCloseLibrary');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // =========================================================================
    // TEST SUITE 10: SSRF Safety Verification
    // =========================================================================
    console.log('\nTest Suite 10: SSRF Safety Verification');
    const ssrfRes = await page.request.post('http://127.0.0.1:3000/api/schema/analyze', {
      data: { url: 'http://169.254.169.254/latest/meta-data/' }
    });
    assert(ssrfRes.status() === 400, `SSRF request to cloud metadata blocked with HTTP 400 (Status: ${ssrfRes.status()})`);
    const ssrfJson = await ssrfRes.json();
    assert(ssrfJson.error.includes('prohibited') || ssrfJson.error.includes('Target resolves to private network'), 'SSRF error message indicates prohibited target');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log(`\n========================================`);
    console.log(`Schema Generator Test Results:`);
    console.log(`  Total:  ${passed + failed}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
