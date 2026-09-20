/**
 * server/services/visual-css/verifier.js
 * Visual CSS Engineer - Playwright Browser Verification & Auto-Fix Engine.
 * Injects proposed CSS patches in Chromium, verifies responsive layout,
 * detects horizontal overflow / clipping / layout shifts, and captures 'After' screenshots.
 */

const { chromium } = require('playwright');
const { validateSafeUrl } = require('./analyzer');

let sharedBrowser = null;
async function getBrowser() {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
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
  return sharedBrowser;
}

const DEFAULT_VIEWPORTS = [
  { name: 'Desktop', id: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'Tablet', id: 'tablet', width: 768, height: 1024, isMobile: true },
  { name: 'Mobile', id: 'mobile', width: 390, height: 844, isMobile: true }
];

/**
 * Runs Playwright verification with injected CSS patch across responsive viewports
 */
async function verifyCssPatch({
  targetUrl,
  selector,
  cssPatch,
  viewports = DEFAULT_VIEWPORTS
}) {
  const safeUrl = validateSafeUrl(targetUrl);
  const browser = await getBrowser();

  const results = {};
  const screenshots = {};
  let totalIssuesCount = 0;
  const issuesList = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.isMobile
    });

    const page = await context.newPage();

    try {
      await page.goto(safeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Inject the proposed CSS patch into the DOM
      if (cssPatch && typeof cssPatch === 'string') {
        await page.addStyleTag({ content: cssPatch });
      }

      await page.waitForTimeout(450);

      // Evaluate responsive health & overflow
      const evaluation = await page.evaluate(({ sel, expectedWidth }) => {
        const doc = document.documentElement || document.body;
        const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
        const clientWidth = doc.clientWidth || window.innerWidth;
        const hasHorizontalOverflow = scrollWidth > expectedWidth + 1;
        const overflowAmount = Math.max(0, scrollWidth - expectedWidth);

        let targetFound = false;
        let targetRect = null;
        let isClipped = false;

        if (sel) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              targetFound = true;
              const r = el.getBoundingClientRect();
              targetRect = {
                top: Math.round(r.top),
                left: Math.round(r.left),
                width: Math.round(r.width),
                height: Math.round(r.height)
              };
              if (r.right > expectedWidth || r.left < 0) {
                isClipped = true;
              }
            }
          } catch (e) {}
        }

        return {
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow,
          overflowAmount,
          targetFound,
          targetRect,
          isClipped
        };
      }, { sel: selector, expectedWidth: vp.width });

      // Take screenshot of the patched view
      const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
      const screenshotBase64 = 'data:image/png;base64,' + screenshotBuffer.toString('base64');
      screenshots[vp.id] = screenshotBase64;

      const vpIssues = [];
      if (evaluation.hasHorizontalOverflow) {
        vpIssues.push(`Horizontal scroll overflow detected (${evaluation.overflowAmount}px exceeds ${vp.width}px viewport)`);
      }
      if (evaluation.isClipped) {
        vpIssues.push(`Element boundary extends beyond visible ${vp.name} viewport`);
      }

      if (vpIssues.length > 0) {
        totalIssuesCount += vpIssues.length;
        vpIssues.forEach(msg => issuesList.push({ viewport: vp.name, message: msg }));
      }

      results[vp.id] = {
        viewportName: vp.name,
        width: vp.width,
        height: vp.height,
        measurements: evaluation,
        passed: vpIssues.length === 0,
        issues: vpIssues
      };
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  return {
    success: true,
    url: safeUrl,
    hasIssues: totalIssuesCount > 0,
    totalIssuesCount,
    issuesList,
    results,
    screenshots,
    timestamp: new Date().toISOString()
  };
}

/**
 * AI Auto-Fix loop: takes detected verification issues and refines the CSS patch
 */
function autoFixPatch({
  originalPatch,
  selector,
  issuesList = [],
  iteration = 1
}) {
  if (iteration > 3) {
    return {
      success: false,
      refinedPatch: originalPatch,
      message: 'Reached maximum auto-fix threshold (3 iterations).'
    };
  }

  let fixesApplied = [];
  let refined = originalPatch;

  const hasOverflow = issuesList.some(i => i.message && i.message.includes('overflow'));
  const hasClipping = issuesList.some(i => i.message && i.message.includes('boundary') || i.message.includes('clipped'));

  if (hasOverflow || hasClipping) {
    // Insert robust responsive bounding rules into the selector
    const fixRules = [
      'max-width: 100%;',
      'box-sizing: border-box;',
      'overflow-wrap: break-word;',
      'word-break: break-word;'
    ];

    if (!refined.includes('max-width: 100%')) {
      refined = refined.replace(
        new RegExp('(' + selector.replace(/[-/\^+?.()|[]{}]/g, '\$&') + '\s*\{)', 'g'),
        '\
  ' + fixRules.join('\n  ')
      );
      fixesApplied.push('Constrained max-width to 100% and added break-word wrap rules');
    }

    // Add explicit mobile media query clamp
    if (!refined.includes('@media (max-width: 640px)')) {
      refined += '\n\n@media (max-width: 640px) {\n  ' + selector + ' {\n    width: 100%;\n    max-width: 100%;\n    margin-left: 0;\n    margin-right: 0;\n  }\n}';
      fixesApplied.push('Added @media (max-width: 640px) containment override');
    }
  }

  return {
    success: true,
    iteration,
    fixesApplied,
    refinedPatch: refined,
    message: `Auto-fix iteration ${iteration} applied ${fixesApplied.length} safety constraints.`
  };
}

module.exports = {
  DEFAULT_VIEWPORTS,
  verifyCssPatch,
  autoFixPatch
};
