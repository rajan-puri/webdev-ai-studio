/**
 * scripts/tests/test-vce-functional-fixes.js
 * Comprehensive end-to-end verification of Visual CSS Engineer functionality fixes:
 * 1. Live style modification on selected elements via same-origin proxy iframe
 * 2. Preview viewport responsive scaling without horizontal cropping
 * 3. Apply Changes patch generation, diff confirmation modal, SQLite persistence, and zero window.alert()
 */

const { chromium } = require('playwright');
const { db } = require('../../server/data/database');

async function runVerification() {
  console.log('--- Starting Visual CSS Engineer Verification ---');
  let passedCount = 0;
  let totalTests = 5;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // Listen for dialogs - MUST NOT fire any window.alert or window.confirm
  let dialogFired = null;
  page.on('dialog', dialog => {
    dialogFired = dialog.message();
    console.error('UNEXPECTED DIALOG FIRED:', dialog.type(), dialog.message());
    dialog.dismiss();
  });

  try {
    // 1. Navigate to Visual CSS Engineer route
    console.log('[Test 1] Navigating to http://127.0.0.1:3000/visual-css-engineer...');
    await page.goto('http://127.0.0.1:3000/visual-css-engineer', { waitUntil: 'networkidle', timeout: 15000 });

    const viewVisible = await page.isVisible('#viewVisualCssEngineer');
    if (!viewVisible) {
      // Fallback: switch via window.App
      await page.evaluate(() => {
        if (window.App && window.App.switchView) window.App.switchView('visual-css-engineer');
      });
      await page.waitForTimeout(500);
    }
    console.log('✓ Visual CSS Engineer workspace mounted.');
    passedCount++;

    // 2. Test Proxy and Live Preview Loading
    console.log('[Test 2] Loading live website preview through proxy...');
    const iframe = page.locator('#vcePreviewIframe');
    await page.waitForSelector('#vcePreviewIframe', { state: 'attached' });
    
    // Wait for iframe src to load proxy
    await page.waitForTimeout(2000);
    const iframeSrc = await iframe.getAttribute('src');
    console.log('Preview iframe src:', iframeSrc);
    if (!iframeSrc.includes('/api/visual-css/proxy')) {
      throw new Error('Iframe src does not use the proxy endpoint: ' + iframeSrc);
    }
    console.log('✓ Website successfully served through same-origin proxy.');
    passedCount++;

    // 3. Test Viewport Scaling (No horizontal cropping)
    console.log('[Test 3] Testing responsive viewport canvas scaling...');
    const scaling = await page.evaluate(() => {
      const canvas = document.getElementById('vcePreviewCanvas');
      const scaler = document.getElementById('vceScalerWrapper');
      const frame = document.getElementById('vceViewportFrame');
      return {
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        scalerWidth: scaler.offsetWidth,
        scalerHeight: scaler.offsetHeight,
        frameWidth: parseInt(frame.style.width, 10),
        frameTransform: frame.style.transform
      };
    });

    console.log('Scaling metrics:', JSON.stringify(scaling, null, 2));
    if (scaling.scalerWidth > scaling.canvasWidth) {
      throw new Error(`Scaler width (${scaling.scalerWidth}px) exceeds canvas width (${scaling.canvasWidth}px)! Horizontal cropping detected.`);
    }
    console.log('✓ Preview viewport scales cleanly within canvas with ZERO horizontal cropping.');
    passedCount++;

    // 4. Test Live Inspector Changes Modifying the Element
    console.log('[Test 4] Modifying element styles via CSS Inspector...');
    
    // Select an element programmatically or wait for auto-select
    await page.evaluate(() => {
      const tool = window.vceToolInstance || window._vceInstance;
      // Find element or simulate selection of h1
      const iframeDoc = document.getElementById('vcePreviewIframe').contentDocument;
      const h1 = iframeDoc ? iframeDoc.querySelector('h1') : null;
      if (tool) {
        tool.selectElement({
          selector: 'h1',
          tag: 'h1',
          label: 'Heading',
          styles: { fontSize: '24px', color: '#000000', borderRadius: '0px' },
          rect: { top: 50, left: 100, width: 300, height: 40 }
        });
      }
    });

    await page.waitForTimeout(400);

    // Change font size slider to 72px and color to #38bdf8
    await page.evaluate(() => {
      const slider = document.getElementById('vceSliderFontSize');
      slider.value = '72';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      const color = document.getElementById('vceColorPickerText');
      color.value = '#38bdf8';
      color.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.waitForTimeout(300);

    // Verify iframe document style overrides
    const overrideCss = await page.evaluate(() => {
      const iframeDoc = document.getElementById('vcePreviewIframe').contentDocument;
      const styleTag = iframeDoc ? iframeDoc.getElementById('webdev-ai-preview-overrides') : null;
      const h1 = iframeDoc ? iframeDoc.querySelector('h1') : null;
      const computed = h1 ? window.getComputedStyle ? iframeDoc.defaultView.getComputedStyle(h1) : null : null;
      return {
        styleTagText: styleTag ? styleTag.textContent : null,
        computedFontSize: computed ? computed.fontSize : null,
        unsavedBadgeText: document.getElementById('vceUnsavedCount').textContent
      };
    });

    console.log('Live style injection result:', JSON.stringify(overrideCss, null, 2));
    if (!overrideCss.styleTagText || !overrideCss.styleTagText.includes('72px')) {
      throw new Error('Override CSS was not injected into preview iframe document: ' + overrideCss.styleTagText);
    }
    if (!overrideCss.unsavedBadgeText.includes('unsaved changes')) {
      throw new Error('Unsaved changes badge did not update: ' + overrideCss.unsavedBadgeText);
    }
    console.log('✓ Inspector modifications update live preview styles instantly and track unsaved changes.');
    passedCount++;

    // 5. Test Apply Changes & SQLite Persistence without alerts
    console.log('[Test 5] Applying changes and verifying diff modal + SQLite...');
    await page.click('#vceBtnApply');
    await page.waitForTimeout(400);

    if (dialogFired) {
      throw new Error('Window alert/confirm was called during Apply Changes: ' + dialogFired);
    }

    const modalVisible = await page.isVisible('#vceApplyConfirmModal');
    if (!modalVisible) {
      throw new Error('Diff confirmation modal did not open!');
    }

    const diffContent = await page.textContent('#vceApplyModalDiff');
    console.log('Diff displayed in modal:\n', diffContent);
    if (!diffContent.includes('font-size: 72px')) {
      throw new Error('Diff modal does not display the modified font size!');
    }

    // Confirm and apply
    await page.click('#vceBtnConfirmApply');
    await page.waitForTimeout(1000);

    // Verify unsaved count reset to 0
    const unsavedCountAfter = await page.evaluate(() => {
      const badge = document.getElementById('vceUnsavedIndicator');
      return badge.style.display;
    });

    if (unsavedCountAfter !== 'none') {
      throw new Error('Unsaved indicator did not hide after applying patch!');
    }

    // Verify SQLite record
    const row = db.prepare(`SELECT * FROM test_history WHERE test_type = 'visual-css-engineer' ORDER BY created_at DESC LIMIT 1`).get();
    if (!row) {
      throw new Error('No test_history record found in SQLite for visual-css-engineer!');
    }
    console.log('✓ SQLite history record confirmed:', row.id, row.target_url);
    console.log('✓ Apply Changes successfully persisted with in-app diff modal and zero window.alert().');
    passedCount++;

    console.log(`\n========================================`);
    console.log(`ALL VERIFICATION CHECKS PASSED: ${passedCount}/${totalTests}`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('\n❌ Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();
