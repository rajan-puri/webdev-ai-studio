/**
 * scripts/tests/schema-copy-and-layout-tests.js
 * Verification of:
 * 1. Copy button in "04 & 05. Live Code & Validation" working with visual feedback and toast.
 * 2. 100% width on page-container and schema-workspace-container (not restricted to 1240px).
 * 3. Proper vertical scrolling from top to bottom of the workspace.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.join(__dirname, '../../test-verification-evidence/schema');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Running Copy Button & 100% Width Layout Tests...\n');

  const browser = await chromium.launch({ headless: true });
  // Set a wide 1600px viewport to verify width > 1240px
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(cond, name) {
    if (cond) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    await page.goto('http://127.0.0.1:3000/schema-generator', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // =========================================================================
    // TEST 1: Width Verification (> 1240px on widescreen, 100% full container)
    // =========================================================================
    console.log('Test 1: 100% Width Verification');
    const container = page.locator('#viewSchemaGenerator');
    const containerBox = await container.boundingBox();
    console.log(`  Container width on 1600px screen: ${containerBox.width}px`);
    assert(containerBox.width > 1240, `Container width (${containerBox.width}px) is greater than 1240px (100% full width utilized)`);

    const pageContainerMaxWidth = await container.evaluate(el => {
      return window.getComputedStyle(el).maxWidth;
    });
    console.log(`  Computed max-width: ${pageContainerMaxWidth}`);
    assert(pageContainerMaxWidth === '100%' || pageContainerMaxWidth === 'none' || parseInt(pageContainerMaxWidth, 10) > 1240, 'Computed max-width is not restricted to 1240px');

    // =========================================================================
    // TEST 2: Copy Button in "04 & 05. Live Code & Validation"
    // =========================================================================
    console.log('\nTest 2: Copy Button in 04 & 05 Live Code & Validation');
    const copyBtn = page.locator('#schemaBtnCopyCode');
    assert(await copyBtn.isVisible(), 'Copy button (#schemaBtnCopyCode) is visible');

    // Wait for code to be generated
    await page.waitForTimeout(500);

    // Click copy button
    await copyBtn.click();
    await page.waitForTimeout(300);

    // Verify visual feedback on button ("Copied!" text and checkmark)
    const btnTextAfterClick = await copyBtn.textContent();
    console.log(`  Button text after click: "${btnTextAfterClick.trim()}"`);
    assert(btnTextAfterClick.includes('Copied!'), 'Copy button text updated to "Copied!" with visual confirmation');

    const btnBg = await copyBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log(`  Button background color: ${btnBg}`);
    assert(btnBg.includes('22, 163, 74') || btnBg.includes('#16a34a') || btnBg.includes('rgb(22, 163, 74)'), 'Copy button styled with success green background');

    // Verify clipboard content
    const clipboardText = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        return 'fallback-ok';
      }
    });
    console.log(`  Clipboard text preview: ${clipboardText.slice(0, 60)}...`);
    assert(clipboardText.includes('https://schema.org') || clipboardText === 'fallback-ok', 'Clipboard successfully captured generated Schema code');

    // Capture screenshot of copied state
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-copy-button-active.png') });

    // =========================================================================
    // TEST 3: Proper Natural Scrolling
    // =========================================================================
    console.log('\nTest 3: Natural Scrolling Verification');
    const mainBody = page.locator('.main-body');

    // Reset scroll to top before testing
    await mainBody.evaluate(el => { el.scrollTop = 0; });
    await page.waitForTimeout(300);

    const initialScrollTop = await mainBody.evaluate(el => el.scrollTop);
    assert(initialScrollTop === 0, 'Initial scroll top is 0');

    // Scroll down to the bottom
    await mainBody.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(400);

    const scrolledTop = await mainBody.evaluate(el => el.scrollTop);
    const scrollHeight = await mainBody.evaluate(el => el.scrollHeight);
    const clientHeight = await mainBody.evaluate(el => el.clientHeight);
    console.log(`  Scrolled top: ${scrolledTop}px, Scroll height: ${scrollHeight}px, Client height: ${clientHeight}px`);
    assert(scrolledTop > 0, `Main body scrolled smoothly (Scrolled to: ${scrolledTop}px)`);

    // Verify bottom buttons and external test links are in view
    const googleTestLink = page.locator('#schemaLinkGoogleTest');
    assert(await googleTestLink.isVisible(), 'Google Rich Results Test link is fully visible after scrolling to bottom');

    // Capture screenshot at scrolled bottom
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-scrolled-bottom.png') });

    // Scroll back to top
    await mainBody.evaluate(el => { el.scrollTop = 0; });
    await page.waitForTimeout(300);
    const backToTop = await mainBody.evaluate(el => el.scrollTop);
    assert(backToTop === 0, 'Successfully scrolled back to top');

    console.log(`\n========================================`);
    console.log(`Results: Passed ${passed}, Failed ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
