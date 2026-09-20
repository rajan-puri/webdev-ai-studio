/**
 * server/services/responsive/breakpoint-runner.js
 * Executes real Playwright breakpoint testing across requested viewport widths.
 * For each breakpoint:
 * - Creates isolated Playwright context & page
 * - Sets viewport dimensions
 * - Loads URL with timeout
 * - Real DOM scrollWidth & overflow measurement
 * - Captures real console & network errors
 * - Captures thumbnail screenshot
 * - Measures load time
 * - Properly cleans up context & page
 */

const { provider } = require('./browser-provider');
const { validateSafeUrl } = require('./session-manager');

const DEFAULT_BREAKPOINTS = [
  320, 360, 375, 390, 414, 480, 576, 768, 820, 992, 1024, 1200, 1280, 1366, 1440, 1536, 1920
];

const MAX_BREAKPOINTS_PER_RUN = 20;

async function runBreakpointTests(targetUrl, requestedBreakpoints = null, browserType = 'chromium') {
  const safeUrl = validateSafeUrl(targetUrl);

  let bpList = Array.isArray(requestedBreakpoints) && requestedBreakpoints.length > 0
    ? requestedBreakpoints.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 240 && n <= 3840)
    : DEFAULT_BREAKPOINTS;

  // Deduplicate and sort
  bpList = Array.from(new Set(bpList)).sort((a, b) => a - b);

  // Limit to max 20 breakpoints per run
  if (bpList.length > MAX_BREAKPOINTS_PER_RUN) {
    bpList = bpList.slice(0, MAX_BREAKPOINTS_PER_RUN);
  }

  const browser = await provider.getBrowser(browserType);

  const results = [];
  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;

  for (const width of bpList) {
    const height = Math.max(600, Math.min(1200, Math.round(width * 1.3)));
    const startTime = Date.now();

    let context = null;
    let page = null;
    const consoleErrors = [];
    const networkErrors = [];

    try {
      context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        isMobile: width < 768,
        hasTouch: width < 768
      });

      page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        consoleErrors.push(err.message || String(err));
      });

      page.on('requestfailed', req => {
        networkErrors.push(`${req.method()} ${req.url()}: ${(req.failure() && req.failure().errorText) || 'failed'}`);
      });

      page.on('response', resp => {
        if (resp.status() >= 400) {
          networkErrors.push(`HTTP ${resp.status()} ${resp.url()}`);
        }
      });

      let loadOk = true;
      let statusCode = 200;
      try {
        const resp = await page.goto(safeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        if (resp) statusCode = resp.status();
        await page.waitForTimeout(300);
      } catch (navErr) {
        loadOk = false;
      }

      const loadTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      // Measure real DOM scrollWidth vs viewport width
      let measurements = {
        scrollWidth: width,
        clientWidth: width,
        hasHorizontalOverflow: false,
        overflowAmount: 0,
        overflowingElements: []
      };

      if (loadOk) {
        measurements = await page.evaluate(({ expectedWidth }) => {
          const doc = document.documentElement || document.body;
          const scrollW = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
          const clientW = doc.clientWidth || window.innerWidth;
          const hasHorizontalOverflow = scrollW > expectedWidth + 1;
          const overflowAmount = Math.max(0, scrollW - expectedWidth);

          const overflows = [];
          const all = document.querySelectorAll('body *');
          for (let i = 0; i < all.length && overflows.length < 5; i++) {
            const el = all[i];
            const rect = el.getBoundingClientRect();
            if (rect.right > expectedWidth + 1 || rect.left < -1) {
              let sel = el.tagName.toLowerCase();
              if (el.id) sel += `#${el.id}`;
              else if (el.className && typeof el.className === 'string') {
                const c = el.className.trim().split(/\s+/)[0];
                if (c) sel += `.${c}`;
              }
              overflows.push({
                selector: sel,
                width: Math.round(rect.width),
                overflowAmount: Math.round(Math.max(0, rect.right - expectedWidth, -rect.left))
              });
            }
          }

          return {
            scrollWidth: scrollW,
            clientWidth: clientW,
            hasHorizontalOverflow,
            overflowAmount,
            overflowingElements: overflows
          };
        }, { expectedWidth: width }).catch(() => measurements);
      }

      // Capture real thumbnail screenshot
      let screenshotThumb = null;
      if (loadOk) {
        const thumbBuf = await page.screenshot({
          type: 'jpeg',
          quality: 65,
          fullPage: false
        }).catch(() => null);

        if (thumbBuf) {
          screenshotThumb = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`;
        }
      }

      const hasOverflow = measurements.hasHorizontalOverflow;
      let status = 'passed';
      if (!loadOk || statusCode >= 400 || consoleErrors.length > 2 || measurements.overflowAmount > 30) {
        status = 'failed';
        failedCount++;
      } else if (hasOverflow || consoleErrors.length > 0 || networkErrors.length > 0) {
        status = 'warning';
        warningCount++;
      } else {
        passedCount++;
      }

      results.push({
        width,
        height,
        status,
        passed: status === 'passed',
        loadOk,
        statusCode,
        documentWidth: measurements.scrollWidth,
        scrollWidth: measurements.scrollWidth,
        viewportWidth: width,
        hasHorizontalOverflow: hasOverflow,
        overflowAmount: measurements.overflowAmount,
        overflowingElements: measurements.overflowingElements,
        consoleErrorsCount: consoleErrors.length,
        consoleErrors: consoleErrors.slice(0, 5),
        networkErrorsCount: networkErrors.length,
        networkErrors: networkErrors.slice(0, 5),
        loadTimeSeconds: `${loadTimeSeconds}s`,
        screenshot: screenshotThumb
      });
    } catch (err) {
      failedCount++;
      results.push({
        width,
        height,
        status: 'failed',
        passed: false,
        loadOk: false,
        documentWidth: width,
        scrollWidth: width,
        viewportWidth: width,
        hasHorizontalOverflow: false,
        overflowAmount: 0,
        consoleErrorsCount: 1,
        consoleErrors: [err.message],
        networkErrorsCount: 0,
        loadTimeSeconds: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        screenshot: null
      });
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  return {
    url: safeUrl,
    timestamp: new Date().toISOString(),
    browserType,
    totalBreakpoints: bpList.length,
    passedCount,
    warningCount,
    failedCount,
    results
  };
}

module.exports = {
  runBreakpointTests,
  DEFAULT_BREAKPOINTS
};
