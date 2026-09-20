/**
 * server/services/responsive/browser-preview.js
 * High-performance, isolated Chromium browser renderer using Playwright.
 * Generates true browser-rendered previews and real DOM viewport measurements
 * for websites that forbid iframe embedding (X-Frame-Options / CSP).
 */

const { chromium } = require('playwright');
const urlModule = require('url');

let browserInstance = null;

// Ensure browser is launched or reused
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--mute-audio'
      ]
    });
  }
  return browserInstance;
}

/**
 * Validates URL for SSRF protection
 */
function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL must be a non-empty string.');
  }

  const trimmed = rawUrl.trim();
  const parsed = urlModule.parse(trimmed);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsafe protocol. Only http:// and https:// URLs are allowed.');
  }

  const hostname = (parsed.hostname || '').toLowerCase();
  if (!hostname) {
    throw new Error('Invalid URL hostname.');
  }

  // Block cloud metadata IP
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    throw new Error('Access to cloud metadata endpoints is restricted.');
  }

  // Block file, javascript, data, chrome, about
  const dangerousProtocols = ['file:', 'javascript:', 'data:', 'chrome:', 'about:'];
  if (dangerousProtocols.includes(parsed.protocol.toLowerCase())) {
    throw new Error(`Protocol ${parsed.protocol} is disallowed.`);
  }

  return trimmed;
}

/**
 * Renders target URL using genuine Chromium browser context
 */
async function renderBrowserPreview({
  url,
  viewportWidth = 393,
  viewportHeight = 852,
  deviceScaleFactor = 2,
  userAgent,
  isMobile = true,
  hasTouch = true
}) {
  const safeUrl = validateSafeUrl(url);
  const browser = await getBrowser();

  const width = Math.min(3840, Math.max(320, parseInt(viewportWidth, 10) || 393));
  const height = Math.min(3840, Math.max(320, parseInt(viewportHeight, 10) || 852));
  const scale = Math.min(3, Math.max(1, parseFloat(deviceScaleFactor) || 2));

  const contextOptions = {
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: Boolean(isMobile),
    hasTouch: Boolean(hasTouch)
  };

  if (userAgent && typeof userAgent === 'string') {
    contextOptions.userAgent = userAgent;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  let httpStatus = 200;
  page.on('response', response => {
    if (response.url() === safeUrl || response.url().replace(/\/$/, '') === safeUrl.replace(/\/$/, '')) {
      httpStatus = response.status();
    }
  });

  try {
    // Navigate with reasonable timeout
    await page.goto(safeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait a brief moment for fonts / responsive layout reflows
    await page.waitForTimeout(600);

    const title = await page.title();

    // Inspect real DOM scrollWidth, clientWidth, and horizontal overflow
    const measurements = await page.evaluate(({ expectedWidth }) => {
      const doc = document.documentElement || document.body;
      const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
      const clientWidth = doc.clientWidth || window.innerWidth;
      const scrollHeight = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      const clientHeight = doc.clientHeight || window.innerHeight;

      // Find overflowing elements
      const overflows = [];
      const allElements = document.querySelectorAll('body *');
      for (let i = 0; i < allElements.length && overflows.length < 10; i++) {
        const el = allElements[i];
        const rect = el.getBoundingClientRect();
        if (rect.width > expectedWidth + 1) {
          overflows.push({
            tagName: el.tagName.toLowerCase(),
            className: el.className || '',
            width: Math.round(rect.width),
            expectedWidth
          });
        }
      }

      return {
        scrollWidth,
        clientWidth,
        scrollHeight,
        clientHeight,
        hasHorizontalOverflow: scrollWidth > expectedWidth,
        overflowAmount: Math.max(0, scrollWidth - expectedWidth),
        overflowElements: overflows
      };
    }, { expectedWidth: width });

    // Capture crisp viewport screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      url: safeUrl,
      title,
      statusCode: httpStatus,
      viewport: {
        width,
        height,
        deviceScaleFactor: scale,
        isMobile: Boolean(isMobile),
        hasTouch: Boolean(hasTouch)
      },
      measurements,
      screenshot: screenshotBase64,
      timestamp: Date.now()
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

module.exports = {
  renderBrowserPreview,
  validateSafeUrl
};
