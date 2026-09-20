/**
 * server/routes/responsive.js
 * Comprehensive API router for Responsive Tester powered by Playwright:
 * - GET  /api/responsive/diagnostics
 * - GET  /api/responsive/devices
 * - GET  /api/responsive/sessions
 * - POST /api/responsive/session/navigate
 * - POST /api/responsive/session/action (back, forward, reload, click, screenshot, close)
 * - POST /api/responsive/breakpoints
 * - POST /api/responsive/matrix/browsers
 * - POST /api/responsive/matrix/devices
 * - POST /api/responsive/report
 * - POST /api/responsive/inspect
 */

const { provider } = require('../services/responsive/browser-provider');
const { sessionManager } = require('../services/responsive/session-manager');
const { runBreakpointTests } = require('../services/responsive/breakpoint-runner');
const { runBrowserMatrix, runDeviceMatrix } = require('../services/responsive/matrix-runner');
const { buildResponsiveReport } = require('../services/responsive/report-builder');
const { validateAndResolveUrl, fetchUrl, inspectIframeSecurity, parseViewportMeta, extractMediaQueries } = require('../services/responsive/viewport-engine');
const { analyzeOverflows } = require('../services/responsive/overflow-analyzer');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, error: message });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Request body too large (exceeds 5MB).'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

async function handleResponsiveRequest(req, res, pathname) {
  const method = req.method;

  // ----------------------------------------------------
  // GET ROUTES
  // ----------------------------------------------------
  if (method === 'GET') {
    // Diagnostics Check (Node, Playwright, Chromium, Firefox, WebKit, Edge)
    if (pathname === '/api/responsive/diagnostics') {
      try {
        const diag = await provider.getDiagnostics();
        sendJson(res, 200, { success: true, ...diag });
      } catch (err) {
        sendError(res, 500, err.message);
      }
      return;
    }

    // Playwright Device Profiles
    if (pathname === '/api/responsive/devices') {
      try {
        const categories = provider.getDeviceProfiles();
        sendJson(res, 200, { success: true, categories });
      } catch (err) {
        sendError(res, 500, err.message);
      }
      return;
    }

    // Active Playwright Sessions
    if (pathname === '/api/responsive/sessions') {
      try {
        const active = sessionManager.getActiveSessionsSummary();
        sendJson(res, 200, { success: true, sessions: active });
      } catch (err) {
        sendError(res, 500, err.message);
      }
      return;
    }

    sendError(res, 404, `Unknown GET endpoint: ${pathname}`);
    return;
  }

  // ----------------------------------------------------
  // POST ROUTES
  // ----------------------------------------------------
  if (method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed. Use GET or POST.');
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    sendError(res, 400, err.message);
    return;
  }

  try {
    // 0. Primary Responsive Test Endpoint: POST /api/responsive/test
    if (pathname === '/api/responsive/test') {
      const { url, browser = 'chromium', device = {}, orientation = 'portrait', sessionId } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      console.log(`[ResponsiveTester] request: ${url} | browser: ${browser} | device: ${device.name || 'default'}`);

      // Run top-level Playwright test directly
      const activeSessionId = sessionId || `test_${Date.now()}`;
      const result = await sessionManager.navigate({
        sessionId: activeSessionId,
        url,
        browserType: browser,
        deviceName: device.name || 'iPhone 15 Pro',
        orientation,
        customViewport: (device.width && device.height) ? {
          width: device.width,
          height: device.height,
          deviceScaleFactor: device.deviceScaleFactor || 1
        } : null
      });

      console.log(`[ResponsiveTester] screenshot captured: ${result.screenshot ? result.screenshot.length : 0} bytes`);
      console.log(`[ResponsiveTester] result returned for ${url}`);

      sendJson(res, 200, {
        success: true,
        engine: 'playwright',
        browser: result.browser ? result.browser.type : browser,
        browserVersion: result.browser ? result.browser.version : 'latest',
        url: result.url || url,
        finalUrl: result.url || url,
        status: result.statusCode || 200,
        statusCode: result.statusCode || 200,
        viewport: result.device?.viewport || { width: device.width || 393, height: device.height || 852 },
        device: result.device,
        navigationTime: result.executionTimeMs || 0,
        loadTimeMs: result.executionTimeMs || 0,
        screenshot: result.screenshot,
        consoleErrors: result.consoleLogs ? result.consoleLogs.filter(l => l.type === 'error').map(l => l.text) : [],
        consoleLogs: result.consoleLogs || [],
        pageErrors: result.pageErrors ? result.pageErrors.map(e => e.message || String(e)) : [],
        failedRequests: result.networkErrors || [],
        networkErrors: result.networkErrors || [],
        overflow: {
          horizontal: Boolean(result.measurements && result.measurements.hasHorizontalOverflow),
          amount: (result.measurements && result.measurements.overflowAmount) || 0,
          elements: (result.measurements && result.measurements.overflowingElements) || []
        },
        measurements: result.measurements,
        timings: result.timings,
        interactivePreview: result.interactivePreview || { allowed: true, reason: null },
        sessionId: result.sessionId,
        navigation: result.navigation
      });
      return;
    }

    // 1. Session Navigate (Load URL in Playwright)
    if (pathname === '/api/responsive/session/navigate') {
      const { sessionId, url, browserType, deviceName, orientation, customViewport } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const result = await sessionManager.navigate({
        sessionId: sessionId || 'default-session',
        url,
        browserType: browserType || 'chromium',
        deviceName: deviceName || 'iPhone 15 Pro',
        orientation: orientation || 'portrait',
        customViewport: customViewport || null
      });

      sendJson(res, 200, result);
      return;
    }

    // 2. Session Action (back, forward, reload, click, screenshot, close)
    if (pathname === '/api/responsive/session/action' || pathname.startsWith('/api/responsive/session/')) {
      let activeSessionId = body.sessionId || 'default-session';
      let action = body.action;

      // Support path-based action: /api/responsive/session/:id/:action
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length >= 5 && pathParts[2] === 'session') {
        activeSessionId = pathParts[3];
        action = pathParts[4];
      }

      const { x, y, fullPage } = body;

      if (action === 'back') {
        const result = await sessionManager.goBack(activeSessionId);
        sendJson(res, 200, result);
        return;
      }

      if (action === 'forward') {
        const result = await sessionManager.goForward(activeSessionId);
        sendJson(res, 200, result);
        return;
      }

      if (action === 'reload') {
        const result = await sessionManager.reload(activeSessionId);
        sendJson(res, 200, result);
        return;
      }

      if (action === 'click') {
        const result = await sessionManager.click(activeSessionId, x, y);
        sendJson(res, 200, result);
        return;
      }

      if (action === 'screenshot') {
        const result = await sessionManager.captureScreenshot(activeSessionId, fullPage);
        sendJson(res, 200, result);
        return;
      }

      if (action === 'close') {
        const closed = await sessionManager.closeSession(activeSessionId);
        sendJson(res, 200, { success: true, closed });
        return;
      }

      sendError(res, 400, `Unknown session action: ${action}`);
      return;
    }

    // 3. Playwright Breakpoint Suite
    if (pathname === '/api/responsive/breakpoints') {
      const { url, breakpoints, browserType } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const results = await runBreakpointTests(url, breakpoints, browserType || 'chromium');
      sendJson(res, 200, { success: true, ...results });
      return;
    }

    // 4. Browser Matrix
    if (pathname === '/api/responsive/matrix/browsers') {
      const { url, browsers, viewport } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const results = await runBrowserMatrix(url, browsers, viewport);
      sendJson(res, 200, { success: true, ...results });
      return;
    }

    // 5. Device Matrix
    if (pathname === '/api/responsive/matrix/devices') {
      const { url, devices } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const results = await runDeviceMatrix(url, devices);
      sendJson(res, 200, { success: true, ...results });
      return;
    }

    // 6. Generate Full Responsive Report
    if (pathname === '/api/responsive/report') {
      const { url, latestCompletedTest } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const session = sessionManager.sessions.get(body.sessionId || 'default-session');
      const testData = latestCompletedTest || (session && session.lastMeasurements ? session : null);

      if (!testData && !session) {
        sendError(res, 400, 'No completed test available. Run a test first.');
        return;
      }

      const activeMeasurements = testData?.measurements || session?.lastMeasurements || null;
      const performanceTimings = testData?.timings || session?.lastTimings || null;
      const consoleErrors = testData?.consoleErrors || (session ? session.consoleLogs.filter(l => l.type === 'error').map(l => l.text) : []);
      const networkErrors = testData?.failedRequests || testData?.networkErrors || session?.networkErrors || [];
      const devName = testData?.device?.name || session?.deviceName || 'Current Device';
      const bType = testData?.browser || session?.browserType || 'chromium';

      const report = buildResponsiveReport({
        url,
        finalUrl: testData?.finalUrl || (session ? session.currentUrl : url),
        browser: {
          type: bType,
          engine: bType === 'webkit' ? 'WebKit' : (bType === 'firefox' ? 'Gecko / Firefox' : 'Chromium')
        },
        devicesTested: body.devicesTested || [devName],
        browsersTested: body.browsersTested || [bType],
        viewportsTested: body.viewportsTested || (testData?.viewport ? [`${testData.viewport.width}x${testData.viewport.height}`] : (session ? [`${session.viewport.width}x${session.viewport.height}`] : [])),
        breakpointResults: body.breakpointResults || null,
        browserMatrixResults: body.browserMatrixResults || null,
        deviceMatrixResults: body.deviceMatrixResults || null,
        activeMeasurements,
        performanceTimings,
        consoleErrors,
        networkErrors,
        screenshots: body.screenshots || (testData?.screenshot ? [{ name: devName, dataUrl: testData.screenshot, width: testData.viewport?.width, height: testData.viewport?.height }] : [])
      });

      sendJson(res, 200, { success: true, report });
      return;
    }

    // 7. Inspect Page & Headers (Legacy / fallback inspect)
    if (pathname === '/api/responsive/inspect') {
      const { url, viewportWidth } = body;
      if (!url) {
        sendError(res, 400, 'Please provide a valid "url" parameter.');
        return;
      }

      const validatedUrl = await validateAndResolveUrl(url.trim());
      const pageData = await fetchUrl(validatedUrl);
      const security = inspectIframeSecurity(pageData.headers);
      const viewportMeta = parseViewportMeta(pageData.html);
      const mediaQueries = extractMediaQueries(pageData.html);
      const activeWidth = parseInt(viewportWidth, 10) || 393;
      const overflowAnalysis = analyzeOverflows(pageData.html, activeWidth);

      sendJson(res, 200, {
        success: true,
        url: validatedUrl,
        finalUrl: pageData.finalUrl,
        statusCode: pageData.statusCode,
        responseTime: pageData.responseTime,
        documentSize: Buffer.byteLength(pageData.html, 'utf8'),
        security,
        viewportMeta,
        mediaQueries,
        overflowAnalysis
      });
      return;
    }

    sendError(res, 404, `Unknown POST endpoint: ${pathname}`);
  } catch (err) {
    console.error(`[ResponsiveRouteError] ${pathname}:`, err);
    sendError(res, 500, err.message || 'An error occurred during responsive execution.');
  }
}

module.exports = {
  handleResponsiveRequest
};
