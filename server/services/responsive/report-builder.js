/**
 * server/services/responsive/report-builder.js
 * Generates comprehensive Responsive Test Reports based on genuine Playwright browser testing:
 * - Summary (Total Tests, Passed, Warnings, Failed)
 * - Browsers Tested
 * - Devices Tested
 * - Viewports Tested
 * - Breakpoint Results
 * - Responsive Issues (Severity, Issue, Device, Browser, Viewport, Element, Selector, Actual, Expected, Why, Fix)
 * - Overflow Analysis
 * - Console Errors
 * - Network Errors
 * - Screenshots
 * - Performance (Browser Timing: DNS, TCP, TTFB, DOMContentLoaded, Load Event, Resource Count)
 * - Technical Details
 */

function buildResponsiveReport({
  url,
  finalUrl,
  timestamp,
  browser = null,
  browsersTested = [],
  devicesTested = [],
  viewportsTested = [],
  breakpointResults = null,
  browserMatrixResults = null,
  deviceMatrixResults = null,
  activeMeasurements = null,
  performanceTimings = null,
  consoleErrors = [],
  networkErrors = [],
  screenshots = []
}) {
  const issues = [];

  // Collect from active measurements if provided
  if (activeMeasurements) {
    if (activeMeasurements.hasHorizontalOverflow) {
      issues.push({
        severity: 'High',
        issue: 'Horizontal Document Overflow',
        device: (devicesTested[0] && devicesTested[0].name) || 'Current Device',
        browser: browser ? `${browser.engine} (${browser.type})` : 'Chromium',
        viewport: `${activeMeasurements.expectedWidth}px`,
        element: 'document.documentElement',
        selector: 'html, body',
        actual: `scrollWidth = ${activeMeasurements.scrollWidth}px`,
        expected: `<= ${activeMeasurements.expectedWidth}px`,
        whyItMatters: 'Users on this screen width experience horizontal scrolling and broken layout bounds.',
        howToFix: 'Ensure container widths do not exceed 100vw/100% and inspect child elements with fixed widths.'
      });
    }

    if (Array.isArray(activeMeasurements.overflowingElements)) {
      activeMeasurements.overflowingElements.forEach(el => {
        issues.push({
          severity: el.overflowAmount > 40 ? 'High' : 'Medium',
          issue: 'Element Exceeding Viewport Boundary',
          device: (devicesTested[0] && devicesTested[0].name) || 'Current Device',
          browser: browser ? `${browser.engine} (${browser.type})` : 'Chromium',
          viewport: `${activeMeasurements.expectedWidth}px`,
          element: el.tag || 'div',
          selector: el.selector || el.tag || 'unknown',
          actual: `Element width ${el.width}px, overflows by ${el.overflowAmount}px (right: ${el.right}px)`,
          expected: `Width <= ${activeMeasurements.expectedWidth}px`,
          whyItMatters: 'Forces horizontal scrollbars and creates awkward white margins on mobile devices.',
          howToFix: `Apply max-width: 100%; box-sizing: border-box; or responsive flex/grid rules to ${el.selector}.`
        });
      });
    }

    if (Array.isArray(activeMeasurements.oversizedMedia)) {
      activeMeasurements.oversizedMedia.forEach(m => {
        issues.push({
          severity: 'Medium',
          issue: `Oversized Media (${m.tag.toUpperCase()})`,
          device: (devicesTested[0] && devicesTested[0].name) || 'Current Device',
          browser: browser ? `${browser.engine} (${browser.type})` : 'Chromium',
          viewport: `${m.expectedWidth}px`,
          element: m.tag,
          selector: `${m.tag}[src="${m.src ? m.src.slice(0, 35) + '...' : ''}"]`,
          actual: `Rendered width ${m.width}px exceeds viewport ${m.expectedWidth}px`,
          expected: `max-width: 100%; height: auto;`,
          whyItMatters: 'Fixed-dimension media elements push the page container wider than the device screen.',
          howToFix: `Set img, video, iframe, svg { max-width: 100%; height: auto; } in your CSS stylesheet.`
        });
      });
    }

    if (activeMeasurements.viewportMeta && !activeMeasurements.viewportMeta.exists) {
      issues.push({
        severity: 'Critical',
        issue: 'Missing Viewport Meta Tag',
        device: 'All Mobile Devices',
        browser: 'All Mobile Browsers',
        viewport: 'Mobile',
        element: '<head>',
        selector: 'meta[name="viewport"]',
        actual: 'No viewport meta tag declared in HTML <head>',
        expected: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        whyItMatters: 'Mobile devices render desktop viewport (typically 980px) and scale down, causing illegible text and unusable tap targets.',
        howToFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your document <head>.'
      });
    }
  }

  // Collect from Breakpoint Results
  const bpResults = breakpointResults && Array.isArray(breakpointResults.results)
    ? breakpointResults.results
    : [];

  bpResults.forEach(bp => {
    if (bp.hasHorizontalOverflow) {
      issues.push({
        severity: bp.overflowAmount > 40 ? 'High' : 'Medium',
        issue: `Breakpoint Overflow at ${bp.width}px`,
        device: `Breakpoint ${bp.width}px`,
        browser: breakpointResults.browserType || 'Chromium',
        viewport: `${bp.width}px`,
        element: 'document',
        selector: 'html',
        actual: `scrollWidth = ${bp.scrollWidth}px (overflows by ${bp.overflowAmount}px)`,
        expected: `<= ${bp.width}px`,
        whyItMatters: `Layout breaks when rendered on screens around ${bp.width}px wide.`,
        howToFix: `Inspect layout rules at @media (max-width: ${bp.width}px) or check elements extending past container.`
      });
    }
  });

  // Calculate totals
  let totalTests = 0;
  let passedTests = 0;
  let warningTests = 0;
  let failedTests = 0;

  if (bpResults.length > 0) {
    totalTests += bpResults.length;
    passedTests += bpResults.filter(b => b.status === 'passed').length;
    warningTests += bpResults.filter(b => b.status === 'warning').length;
    failedTests += bpResults.filter(b => b.status === 'failed').length;
  } else {
    totalTests = 1;
    if (issues.some(i => i.severity === 'Critical' || i.severity === 'High')) {
      failedTests = 1;
    } else if (issues.length > 0) {
      warningTests = 1;
    } else {
      passedTests = 1;
    }
  }

  // Calculate balanced responsive audit score (0-100)
  let score = 100;
  if (activeMeasurements) {
    if (activeMeasurements.hasHorizontalOverflow) {
      score -= 25;
      const overflowCount = (activeMeasurements.overflowingElements || []).length;
      score -= Math.min(25, overflowCount * 3);
    }
    if (activeMeasurements.viewportMeta && !activeMeasurements.viewportMeta.exists) {
      score -= 20;
    }
    const mediaCount = (activeMeasurements.oversizedMedia || []).length;
    if (mediaCount > 0) {
      score -= Math.min(15, mediaCount * 2);
    }
  }
  if (failedTests > 0 && score > 60) {
    score -= 15;
  }
  score = Math.max(15, Math.min(100, Math.round(score)));

  return {
    url,
    finalUrl: finalUrl || url,
    timestamp: timestamp || new Date().toISOString(),
    engine: 'Playwright Browser Testing Engine',
    summary: {
      score,
      totalTests,
      totalTested: totalTests,
      passed: passedTests,
      totalPassed: passedTests,
      warnings: warningTests,
      failed: failedTests,
      violations: failedTests,
      totalIssues: issues.length,
      criticalCount: issues.filter(i => i.severity === 'Critical').length,
      highCount: issues.filter(i => i.severity === 'High').length,
      mediumCount: issues.filter(i => i.severity === 'Medium').length,
      lowCount: issues.filter(i => i.severity === 'Low').length
    },
    browsersTested: browsersTested.length > 0 ? browsersTested : (browser ? [browser] : ['Chromium']),
    devicesTested: devicesTested.length > 0 ? devicesTested : ['Selected Device Profile'],
    viewportsTested: viewportsTested.length > 0 ? viewportsTested : (bpResults.map(b => `${b.width}px`)),
    breakpointResults: bpResults,
    browserMatrixResults: browserMatrixResults ? browserMatrixResults.results : null,
    deviceMatrixResults: deviceMatrixResults ? deviceMatrixResults.results : null,
    responsiveIssues: issues,
    overflowAnalysis: {
      hasHorizontalOverflow: activeMeasurements ? activeMeasurements.hasHorizontalOverflow : false,
      scrollWidth: activeMeasurements ? activeMeasurements.scrollWidth : null,
      clientWidth: activeMeasurements ? activeMeasurements.clientWidth : null,
      overflowAmount: activeMeasurements ? activeMeasurements.overflowAmount : 0,
      overflowingElements: activeMeasurements ? activeMeasurements.overflowingElements : []
    },
    consoleErrors: consoleErrors || [],
    networkErrors: networkErrors || [],
    screenshots: screenshots || [],
    performance: performanceTimings ? {
      label: 'Browser Timing',
      dns: `${performanceTimings.dns || 0}ms`,
      tcp: `${performanceTimings.tcp || 0}ms`,
      ttfb: `${performanceTimings.ttfb || 0}ms`,
      domContentLoaded: `${performanceTimings.domContentLoaded || 0}ms`,
      loadEvent: `${performanceTimings.loadEvent || 0}ms`,
      resourceCount: performanceTimings.resourceCount || 0
    } : null,
    technicalDetails: {
      mode: 'Playwright Browser Testing',
      emulation: 'Playwright Device Profile',
      cloudDevicesUsed: false,
      disclaimer: 'Tested using genuine local Playwright browser engines. No fake cloud devices.'
    }
  };
}

module.exports = {
  buildResponsiveReport
};
