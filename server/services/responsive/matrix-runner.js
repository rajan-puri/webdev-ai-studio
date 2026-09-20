/**
 * server/services/responsive/matrix-runner.js
 * Executes:
 * 1. Browser Matrix: Runs target URL independently across Chromium, Firefox, WebKit, and Edge (if installed).
 * 2. Device Matrix: Runs target URL independently across selected Playwright device profiles.
 */

const { provider } = require('./browser-provider');
const { devices } = require('playwright');
const { validateSafeUrl } = require('./session-manager');

/**
 * Runs Browser Matrix
 */
async function runBrowserMatrix(targetUrl, requestedBrowsers = ['chromium', 'firefox', 'webkit'], viewport = { width: 1280, height: 800 }) {
  const safeUrl = validateSafeUrl(targetUrl);
  const diag = await provider.getDiagnostics();

  const results = [];
  for (const bType of requestedBrowsers) {
    const norm = provider.normalizeBrowserType(bType);

    // Check availability
    if (norm === 'edge' && !diag.browsers.edge.installed) {
      results.push({
        browserType: 'edge',
        label: 'Microsoft Edge',
        engine: 'Chromium Edge',
        version: 'Not installed',
        installed: false,
        status: 'not_available',
        error: 'Microsoft Edge is not installed in this environment.'
      });
      continue;
    }

    const startTime = Date.now();
    let browser = null;
    let context = null;
    let page = null;
    const consoleErrors = [];
    const networkErrors = [];

    try {
      browser = await provider.getBrowser(norm);
      context = await browser.newContext({
        viewport: { width: viewport.width || 1280, height: viewport.height || 800 },
        deviceScaleFactor: 1
      });
      page = await context.newPage();

      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => { consoleErrors.push(e.message || String(e)); });
      page.on('requestfailed', r => { networkErrors.push(`${r.method()} ${r.url()}`); });

      const resp = await page.goto(safeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });

      const statusCode = resp ? resp.status() : 200;
      await page.waitForTimeout(400);

      const title = await page.title().catch(() => '');
      const loadTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      const thumbBuf = await page.screenshot({
        type: 'jpeg',
        quality: 65,
        fullPage: false
      }).catch(() => null);

      results.push({
        browserType: norm,
        label: norm === 'webkit' ? 'Safari / WebKit' : (norm === 'firefox' ? 'Firefox' : 'Chromium / Chrome'),
        engine: norm === 'webkit' ? 'WebKit' : (norm === 'firefox' ? 'Gecko' : 'Chromium'),
        version: browser.version(),
        installed: true,
        status: statusCode < 400 ? 'passed' : 'warning',
        statusCode,
        title,
        viewport,
        loadTimeSeconds: `${loadTimeSeconds}s`,
        consoleErrorsCount: consoleErrors.length,
        networkErrorsCount: networkErrors.length,
        screenshot: thumbBuf ? `data:image/jpeg;base64,${thumbBuf.toString('base64')}` : null
      });
    } catch (err) {
      results.push({
        browserType: norm,
        label: norm === 'webkit' ? 'Safari / WebKit' : (norm === 'firefox' ? 'Firefox' : 'Chromium / Chrome'),
        engine: norm === 'webkit' ? 'WebKit' : (norm === 'firefox' ? 'Gecko' : 'Chromium'),
        version: 'Error',
        installed: true,
        status: 'failed',
        error: err.message,
        loadTimeSeconds: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      });
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  return {
    url: safeUrl,
    timestamp: new Date().toISOString(),
    results
  };
}

/**
 * Runs Device Matrix
 */
async function runDeviceMatrix(targetUrl, selectedDeviceNames = ['iPhone 13', 'Pixel 5', 'iPad Pro 11', 'Desktop 1920×1080']) {
  const safeUrl = validateSafeUrl(targetUrl);
  const results = [];

  for (const name of selectedDeviceNames) {
    let pwDev = devices[name];
    let browserType = 'chromium';
    let contextOpts = {
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    };

    if (pwDev) {
      contextOpts = {
        viewport: pwDev.viewport,
        deviceScaleFactor: pwDev.deviceScaleFactor || 1,
        isMobile: Boolean(pwDev.isMobile),
        hasTouch: Boolean(pwDev.hasTouch),
        userAgent: pwDev.userAgent || ''
      };
      browserType = pwDev.defaultBrowserType || 'chromium';
    } else if (name.includes('Desktop')) {
      contextOpts = {
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false
      };
      browserType = 'chromium';
    }

    const startTime = Date.now();
    let browser = null;
    let context = null;
    let page = null;
    const consoleErrors = [];
    const networkErrors = [];

    try {
      browser = await provider.getBrowser(browserType);
      context = await browser.newContext(contextOpts);
      page = await context.newPage();

      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => { consoleErrors.push(e.message || String(e)); });
      page.on('requestfailed', r => { networkErrors.push(`${r.method()} ${r.url()}`); });

      const resp = await page.goto(safeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });

      const statusCode = resp ? resp.status() : 200;
      await page.waitForTimeout(400);

      const title = await page.title().catch(() => '');
      const loadTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      // Evaluate overflow
      const measurements = await page.evaluate(({ expWidth }) => {
        const doc = document.documentElement || document.body;
        const scrollW = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
        return {
          scrollWidth: scrollW,
          hasOverflow: scrollW > expWidth + 1,
          overflowAmount: Math.max(0, scrollW - expWidth)
        };
      }, { expWidth: contextOpts.viewport.width }).catch(() => ({ scrollWidth: contextOpts.viewport.width, hasOverflow: false, overflowAmount: 0 }));

      const thumbBuf = await page.screenshot({
        type: 'jpeg',
        quality: 65,
        fullPage: false
      }).catch(() => null);

      results.push({
        deviceName: name,
        browserType,
        viewport: contextOpts.viewport,
        dpr: contextOpts.deviceScaleFactor,
        isMobile: contextOpts.isMobile,
        status: (!measurements.hasOverflow && statusCode < 400) ? 'passed' : 'warning',
        statusCode,
        title,
        scrollWidth: measurements.scrollWidth,
        hasHorizontalOverflow: measurements.hasOverflow,
        overflowAmount: measurements.overflowAmount,
        loadTimeSeconds: `${loadTimeSeconds}s`,
        consoleErrorsCount: consoleErrors.length,
        networkErrorsCount: networkErrors.length,
        screenshot: thumbBuf ? `data:image/jpeg;base64,${thumbBuf.toString('base64')}` : null
      });
    } catch (err) {
      results.push({
        deviceName: name,
        browserType,
        viewport: contextOpts.viewport,
        status: 'failed',
        error: err.message,
        loadTimeSeconds: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
      });
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  return {
    url: safeUrl,
    timestamp: new Date().toISOString(),
    results
  };
}

module.exports = {
  runBrowserMatrix,
  runDeviceMatrix
};
