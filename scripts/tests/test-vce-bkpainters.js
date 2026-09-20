const { chromium } = require('playwright');

async function testBkPainters() {
  console.log('--- Testing Visual CSS Engineer with https://www.bkpainters.co.nz/ ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', d => {
    console.error('Alert/Confirm fired:', d.message());
    d.dismiss();
  });

  try {
    await page.goto('http://127.0.0.1:3000/visual-css-engineer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Enter URL into url input
    await page.fill('#vceUrlInput', 'https://www.bkpainters.co.nz/');
    await page.click('#vceBtnLoadUrl');

    console.log('Waiting for proxy iframe to load BK Painters...');
    await page.waitForTimeout(4000);

    // Check iframe src
    const iframeSrc = await page.getAttribute('#vcePreviewIframe', 'src');
    console.log('Iframe src:', iframeSrc);

    // Check scaling
    const scaleInfo = await page.evaluate(() => {
      const canvas = document.getElementById('vcePreviewCanvas');
      const scaler = document.getElementById('vceScalerWrapper');
      const frame = document.getElementById('vceViewportFrame');
      return {
        canvasW: canvas.clientWidth,
        scalerW: scaler.offsetWidth,
        frameW: parseInt(frame.style.width, 10),
        transform: frame.style.transform
      };
    });
    console.log('Scale info on 1440x900 viewport:', JSON.stringify(scaleInfo));
    if (scaleInfo.scalerW > scaleInfo.canvasW) {
      throw new Error('Scaler width exceeds canvas width on 1440 screen!');
    }

    // Modify styles on BK Painters heading
    await page.evaluate(() => {
      const tool = window.visualCssEngineerInstance;
      if (tool) {
        tool.selectElement({
          selector: 'h1',
          tag: 'h1',
          label: 'BK Painters Main Heading',
          styles: { fontSize: '48px', color: '#111827' },
          rect: { top: 120, left: 200, width: 600, height: 60 }
        });
      }

      const slider = document.getElementById('vceSliderFontSize');
      slider.value = '80';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      const color = document.getElementById('vceColorPickerText');
      color.value = '#ef4444';
      color.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.waitForTimeout(500);

    // Check injected override
    const override = await page.evaluate(() => {
      const doc = document.getElementById('vcePreviewIframe').contentDocument;
      const tag = doc ? doc.getElementById('webdev-ai-preview-overrides') : null;
      return tag ? tag.textContent : null;
    });

    console.log('BK Painters Injected CSS Override:\n', override);
    if (!override || !override.includes('80px') || !override.includes('#ef4444')) {
      throw new Error('Override CSS was not properly injected into BK Painters preview!');
    }

    // Test Apply Changes
    await page.click('#vceBtnApply');
    await page.waitForTimeout(400);

    const isModalVisible = await page.isVisible('#vceApplyConfirmModal');
    if (!isModalVisible) {
      throw new Error('Apply confirmation modal did not open!');
    }

    await page.click('#vceBtnConfirmApply');
    await page.waitForTimeout(1500);

    const unsavedHidden = await page.evaluate(() => {
      return document.getElementById('vceUnsavedIndicator').style.display === 'none';
    });

    if (!unsavedHidden) {
      throw new Error('Unsaved changes indicator did not reset after applying patch to BK Painters!');
    }

    console.log('✓ BK Painters end-to-end test PASSED successfully!');
  } finally {
    await browser.close();
  }
}

testBkPainters();
