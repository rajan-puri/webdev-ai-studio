/**
 * server/services/responsive/session-manager.js
 * Manages active Playwright browser sessions:
 * - Resource limits (max 3 concurrent sessions, 10 min TTL)
 * - Navigation: goto, goBack, goForward, reload
 * - Real console & network failure capture
 * - Real DOM responsive & overflow inspection
 * - Performance timing
 * - Screenshot capture (viewport & full page)
 * - Click-to-navigate simulation
 */

const { provider } = require('./browser-provider');
const { devices } = require('playwright');
const urlModule = require('url');

const MAX_CONCURRENT_SESSIONS = 3;
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NAVIGATION_TIMEOUT_MS = 30000; // 30s

function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL must be a non-empty string.');
  }

  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    throw new Error('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsafe protocol. Only http:// and https:// URLs are allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    throw new Error('Invalid URL hostname.');
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    throw new Error('Access to cloud metadata endpoints is restricted.');
  }

  return trimmed;
}

class SessionManager {
  constructor() {
    this.sessions = new Map();

    // Auto-cleanup interval every 60s
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000).unref();
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > SESSION_TTL_MS) {
        console.log(`[SessionManager] Cleaning up expired session: ${id}`);
        await this.closeSession(id);
      }
    }
  }

  getActiveSessionsSummary() {
    const list = [];
    const now = Date.now();
    for (const [id, s] of Array.from(this.sessions.entries())) {
      // If context or page was closed or dead, remove from active list
      if (!s.page || (typeof s.page.isClosed === 'function' && s.page.isClosed()) || !s.context) {
        this.sessions.delete(id);
        continue;
      }
      // If session timed out
      if (now - s.lastActivityAt > SESSION_TTL_MS) {
        this.closeSession(id).catch(() => {});
        continue;
      }

      list.push({
        id,
        url: s.currentUrl,
        browserType: s.browserType,
        deviceName: s.deviceName,
        viewport: s.viewport,
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        status: s.status,
        canGoBack: s.historyIndex > 0,
        canGoForward: s.historyIndex < s.history.length - 1
      });
    }
    return list;
  }

  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      if (session.page) await session.page.close().catch(() => {});
      if (session.context) await session.context.close().catch(() => {});
    } catch (e) {}

    this.sessions.delete(sessionId);
    return true;
  }

  async getOrCreateSession({
    sessionId = 'default-session',
    browserType = 'chromium',
    deviceName,
    orientation = 'portrait',
    customViewport
  }) {
    // If session exists with different browser engine, close old and recreate
    let session = this.sessions.get(sessionId);

    const normBrowser = provider.normalizeBrowserType(browserType);

    if (session) {
      if (session.browserType !== normBrowser) {
        await this.closeSession(sessionId);
        session = null;
      }
    }

    if (!session) {
      // Check concurrent limit
      if (this.sessions.size >= MAX_CONCURRENT_SESSIONS) {
        // Evict oldest session
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, s] of this.sessions.entries()) {
          if (s.lastActivityAt < oldestTime) {
            oldestTime = s.lastActivityAt;
            oldestId = id;
          }
        }
        if (oldestId) {
          await this.closeSession(oldestId);
        }
      }

      session = {
        id: sessionId,
        browserType: normBrowser,
        deviceName: deviceName || 'Desktop (1920×1080 FHD)',
        orientation: orientation || 'portrait',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        userAgent: '',
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        status: 'ready',
        currentUrl: '',
        history: [],
        historyIndex: -1,
        consoleLogs: [],
        pageErrors: [],
        networkErrors: [],
        lastMeasurements: null,
        lastTimings: null,
        context: null,
        page: null
      };

      this.sessions.set(sessionId, session);
    }

    session.lastActivityAt = Date.now();
    return session;
  }

  /**
   * Resolves viewport, scaleFactor, userAgent, isMobile, hasTouch based on device profile or custom
   */
  resolveDeviceConfig(deviceName, orientation = 'portrait', customViewport = null) {
    if (customViewport && customViewport.width && customViewport.height) {
      const width = Math.min(3840, Math.max(320, parseInt(customViewport.width, 10) || 1280));
      const height = Math.min(3840, Math.max(320, parseInt(customViewport.height, 10) || 800));
      const dpr = Math.min(3, Math.max(1, parseFloat(customViewport.deviceScaleFactor) || 1));
      return {
        viewport: { width, height },
        deviceScaleFactor: dpr,
        isMobile: false,
        hasTouch: false,
        userAgent: '',
        deviceName: `Custom (${width}×${height})`,
        isCustom: true
      };
    }

    const isLandscape = orientation === 'landscape';

    // Check Playwright built-in devices
    if (deviceName && devices[deviceName]) {
      const pwDev = devices[deviceName];
      const baseW = pwDev.viewport ? pwDev.viewport.width : (pwDev.screen ? pwDev.screen.width : 390);
      const baseH = pwDev.screen ? pwDev.screen.height : (pwDev.viewport ? pwDev.viewport.height : 844);

      const width = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
      const height = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);

      return {
        viewport: { width, height },
        deviceScaleFactor: pwDev.deviceScaleFactor || 1,
        isMobile: Boolean(pwDev.isMobile),
        hasTouch: Boolean(pwDev.hasTouch),
        userAgent: pwDev.userAgent || '',
        deviceName: deviceName,
        defaultBrowserType: pwDev.defaultBrowserType || 'chromium'
      };
    }

    // Default Desktop / Laptop configurations
    if (deviceName === 'MacBook Air 13"') {
      return {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        deviceName: 'MacBook Air 13"'
      };
    }

    if (deviceName === 'MacBook Pro 16"') {
      return {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        deviceName: 'MacBook Pro 16"'
      };
    }

    if (deviceName === 'Windows Laptop (1366×768)') {
      return {
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        deviceName: 'Windows Laptop (1366×768)'
      };
    }

    // Fallback standard Desktop 1080p
    return {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      deviceName: deviceName || 'Desktop (1920×1080 FHD)'
    };
  }

  /**
   * Initializes or reconfigures page and context for a session
   */
  async setupContextAndPage(session, deviceConfig) {
    const browser = await provider.getBrowser(session.browserType);

    // If context exists, check if viewport/emulation changed
    const needsNewContext = !session.context ||
      session.deviceScaleFactor !== deviceConfig.deviceScaleFactor ||
      session.isMobile !== deviceConfig.isMobile ||
      session.hasTouch !== deviceConfig.hasTouch ||
      session.userAgent !== deviceConfig.userAgent;

    if (needsNewContext) {
      if (session.page) await session.page.close().catch(() => {});
      if (session.context) await session.context.close().catch(() => {});

      const ctxOptions = {
        viewport: deviceConfig.viewport,
        deviceScaleFactor: deviceConfig.deviceScaleFactor,
        isMobile: deviceConfig.isMobile,
        hasTouch: deviceConfig.hasTouch
      };

      if (deviceConfig.userAgent) {
        ctxOptions.userAgent = deviceConfig.userAgent;
      }

      session.context = await browser.newContext(ctxOptions);
      session.page = await session.context.newPage();

      // Attach console & network listeners
      session.consoleLogs = [];
      session.pageErrors = [];
      session.networkErrors = [];

      session.page.on('console', msg => {
        session.consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
          timestamp: Date.now()
        });
        if (session.consoleLogs.length > 200) session.consoleLogs.shift();
      });

      session.page.on('pageerror', err => {
        session.pageErrors.push({
          message: err.message || String(err),
          stack: err.stack || '',
          timestamp: Date.now()
        });
        if (session.pageErrors.length > 50) session.pageErrors.shift();
      });

      session.page.on('requestfailed', req => {
        session.networkErrors.push({
          url: req.url(),
          method: req.method(),
          resourceType: req.resourceType(),
          failureText: (req.failure() && req.failure().errorText) || 'Request failed',
          timestamp: Date.now()
        });
        if (session.networkErrors.length > 100) session.networkErrors.shift();
      });

      session.page.on('response', resp => {
        if (resp.status() >= 400) {
          session.networkErrors.push({
            url: resp.url(),
            method: resp.request().method(),
            resourceType: resp.request().resourceType(),
            status: resp.status(),
            failureText: `HTTP ${resp.status()} ${resp.statusText()}`,
            timestamp: Date.now()
          });
          if (session.networkErrors.length > 100) session.networkErrors.shift();
        }
      });
    } else {
      // Just update viewport size if context was kept
      await session.page.setViewportSize(deviceConfig.viewport);
    }

    session.viewport = deviceConfig.viewport;
    session.deviceScaleFactor = deviceConfig.deviceScaleFactor;
    session.isMobile = deviceConfig.isMobile;
    session.hasTouch = deviceConfig.hasTouch;
    session.userAgent = deviceConfig.userAgent;
    session.deviceName = deviceConfig.deviceName;
  }

  /**
   * Navigates the session to a URL
   */
  async navigate({
    sessionId = 'default-session',
    url,
    browserType = 'chromium',
    deviceName = 'iPhone 15 Pro',
    orientation = 'portrait',
    customViewport = null
  }) {
    const safeUrl = validateSafeUrl(url);
    const session = await this.getOrCreateSession({ sessionId, browserType, deviceName, orientation, customViewport });

    const deviceConfig = this.resolveDeviceConfig(deviceName, orientation, customViewport);
    await this.setupContextAndPage(session, deviceConfig);

    session.status = 'loading';
    const startTime = Date.now();

    let httpStatus = 200;
    try {
      let resp = null;
      try {
        resp = await session.page.goto(safeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: NAVIGATION_TIMEOUT_MS
        });
      } catch (gotoErr) {
        if (gotoErr.message && gotoErr.message.includes('ERR_ABORTED')) {
          await session.page.waitForTimeout(400);
          resp = await session.page.goto(safeUrl, {
            waitUntil: 'domcontentloaded',
            timeout: NAVIGATION_TIMEOUT_MS
          });
        } else {
          throw gotoErr;
        }
      }

      let interactivePreview = { allowed: true, reason: null };
      if (resp) {
        httpStatus = resp.status();
        try {
          const headers = typeof resp.headers === 'function' ? resp.headers() : (resp.headers || {});
          const xfo = headers['x-frame-options'];
          const csp = headers['content-security-policy'];
          if (xfo) {
            interactivePreview = {
              allowed: false,
              reason: `X-Frame-Options: ${xfo}`
            };
          } else if (csp && csp.includes('frame-ancestors')) {
            const match = csp.match(/frame-ancestors\s+([^;]+)/i);
            if (match && !match[1].includes('*')) {
              interactivePreview = {
                allowed: false,
                reason: `CSP: ${match[0]}`
              };
            }
          }
        } catch (hErr) {}
      }
      session.lastInteractivePreview = interactivePreview;

      // Wait a short tick for layout reflow and font adjustments
      await session.page.waitForTimeout(400);

      // Record History
      const finalUrl = session.page.url() || safeUrl;
      session.currentUrl = finalUrl;

      console.log(`[ResponsiveTester] request session: ${sessionId}`);
      console.log(`[ResponsiveTester] target URL: ${safeUrl}`);
      console.log(`[ResponsiveTester] browser: ${browserType} | device: ${deviceName}`);
      console.log(`[ResponsiveTester] response status: ${httpStatus} | final URL: ${finalUrl}`);
      console.log(`[ResponsiveTester] interactivePreview: allowed=${interactivePreview.allowed} (${interactivePreview.reason || 'None'})`);

      // If this is a new navigation (not back/forward), truncate any forward history
      if (session.historyIndex < session.history.length - 1) {
        session.history = session.history.slice(0, session.historyIndex + 1);
      }
      session.history.push(finalUrl);
      session.historyIndex = session.history.length - 1;

      session.status = 'ready';
    } catch (err) {
      session.status = 'error';
      throw new Error(`Navigation failed: ${err.message}`);
    }

    return await this.buildSessionResult(session, httpStatus, Date.now() - startTime);
  }

  /**
   * Browser Back
   */
  async goBack(sessionId = 'default-session') {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) throw new Error('No active session to navigate back.');

    if (session.historyIndex <= 0) {
      return { success: false, message: 'No back history available.', canGoBack: false };
    }

    const startTime = Date.now();
    const resp = await session.page.goBack({ timeout: NAVIGATION_TIMEOUT_MS, waitUntil: 'domcontentloaded' }).catch(() => null);
    await session.page.waitForTimeout(400);

    session.historyIndex = Math.max(0, session.historyIndex - 1);
    session.currentUrl = session.page.url();

    return await this.buildSessionResult(session, resp ? resp.status() : 200, Date.now() - startTime);
  }

  /**
   * Browser Forward
   */
  async goForward(sessionId = 'default-session') {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) throw new Error('No active session to navigate forward.');

    if (session.historyIndex >= session.history.length - 1) {
      return { success: false, message: 'No forward history available.', canGoForward: false };
    }

    const startTime = Date.now();
    const resp = await session.page.goForward({ timeout: NAVIGATION_TIMEOUT_MS, waitUntil: 'domcontentloaded' }).catch(() => null);
    await session.page.waitForTimeout(400);

    session.historyIndex = Math.min(session.history.length - 1, session.historyIndex + 1);
    session.currentUrl = session.page.url();

    return await this.buildSessionResult(session, resp ? resp.status() : 200, Date.now() - startTime);
  }

  /**
   * Browser Reload
   */
  async reload(sessionId = 'default-session') {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) throw new Error('No active session to reload.');

    const startTime = Date.now();
    const resp = await session.page.reload({ timeout: NAVIGATION_TIMEOUT_MS, waitUntil: 'domcontentloaded' }).catch(() => null);
    await session.page.waitForTimeout(400);

    return await this.buildSessionResult(session, resp ? resp.status() : 200, Date.now() - startTime);
  }

  /**
   * Interactive Click on page
   */
  async click(sessionId = 'default-session', x, y) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) throw new Error('No active session.');

    const targetX = Math.max(0, Math.round(x));
    const targetY = Math.max(0, Math.round(y));

    await session.page.mouse.click(targetX, targetY);
    // Allow brief time for navigation or dynamic UI update
    await session.page.waitForTimeout(600);

    const currentUrl = session.page.url();
    if (currentUrl && currentUrl !== session.currentUrl) {
      session.currentUrl = currentUrl;
      session.history.push(currentUrl);
      session.historyIndex = session.history.length - 1;
    }

    return await this.buildSessionResult(session, 200, 0);
  }

  /**
   * Takes full-page or viewport screenshot
   */
  async captureScreenshot(sessionId = 'default-session', fullPage = false) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) throw new Error('No active session.');

    const buffer = await session.page.screenshot({
      type: 'png',
      fullPage: Boolean(fullPage)
    });

    return {
      success: true,
      screenshot: `data:image/png;base64,${buffer.toString('base64')}`,
      viewport: session.viewport,
      fullPage: Boolean(fullPage),
      timestamp: Date.now()
    };
  }

  /**
   * Performs DOM measurements, overflow inspection, and captures screenshot
   */
  async buildSessionResult(session, statusCode = 200, executionTimeMs = 0) {
    const page = session.page;
    session.lastActivityAt = Date.now();

    const title = await page.title().catch(() => '');
    const currentUrl = page.url() || session.currentUrl;

    // DOM & Overflow Evaluation
    const measurements = await page.evaluate(({ expectedWidth }) => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const doc = document.documentElement || document.body;
      const scrollW = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
      const clientW = doc.clientWidth || winW;
      const scrollH = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      const clientH = doc.clientHeight || winH;

      const hasHorizontalOverflow = scrollW > expectedWidth + 1;
      const overflowAmount = Math.max(0, scrollW - expectedWidth);

      // Identify overflowing elements
      const overflowingElements = [];
      const fixedWidthElements = [];
      const oversizedMedia = [];

      const all = document.querySelectorAll('body *');
      for (let i = 0; i < all.length && overflowingElements.length < 15; i++) {
        const el = all[i];
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;

        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();

        // Right edge overflow causing document scroll (ignore intentionally offscreen accessible skip links)
        const isRightOverflow = rect.right > expectedWidth + 2 && rect.left >= -50;
        const isLeftOverflow = rect.left < -2 && rect.right > 0 && rect.left > -50;

        if (isRightOverflow || isLeftOverflow) {
          // Compute selector
          let selector = tag;
          if (el.id) {
            selector += `#${el.id}`;
          } else if (el.className && typeof el.className === 'string') {
            const firstClass = el.className.trim().split(/\s+/)[0];
            if (firstClass) selector += `.${firstClass}`;
          }

          overflowingElements.push({
            tag,
            selector,
            width: Math.round(rect.width),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            overflowAmount: Math.round(isRightOverflow ? rect.right - expectedWidth : -rect.left)
          });
        }

        // Media elements larger than viewport
        if (['img', 'video', 'canvas', 'iframe', 'svg', 'table'].includes(tag)) {
          if (rect.width > expectedWidth + 2) {
            oversizedMedia.push({
              tag,
              src: el.src || el.currentSrc || '',
              width: Math.round(rect.width),
              expectedWidth
            });
          }
        }
      }

      // Check viewport meta tag
      const meta = document.querySelector('meta[name="viewport"]');
      const viewportMeta = {
        exists: Boolean(meta),
        content: meta ? meta.getAttribute('content') : null,
        hasWidthDeviceWidth: meta ? /width\s*=\s*device-width/i.test(meta.getAttribute('content') || '') : false,
        hasInitialScale: meta ? /initial-scale\s*=\s*1/i.test(meta.getAttribute('content') || '') : false
      };

      return {
        windowWidth: winW,
        windowHeight: winH,
        scrollWidth: scrollW,
        clientWidth: clientW,
        scrollHeight: scrollH,
        clientHeight: clientH,
        expectedWidth,
        hasHorizontalOverflow,
        overflowAmount,
        overflowingElements,
        oversizedMedia,
        viewportMeta
      };
    }, { expectedWidth: session.viewport.width }).catch(err => {
      return {
        error: err.message,
        hasHorizontalOverflow: false,
        overflowAmount: 0,
        overflowingElements: []
      };
    });

    session.lastMeasurements = measurements;

    // Performance Timing Evaluation
    const timings = await page.evaluate(() => {
      const perf = window.performance;
      if (!perf) return null;

      const navEntries = perf.getEntriesByType('navigation');
      const nav = navEntries && navEntries[0];
      const resCount = perf.getEntriesByType('resource').length;

      if (nav) {
        return {
          dns: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
          tcp: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
          ttfb: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
          domContentLoaded: Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime)),
          loadEvent: Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)),
          resourceCount: resCount
        };
      }

      // Fallback to legacy timing
      if (perf.timing) {
        const t = perf.timing;
        return {
          dns: Math.max(0, t.domainLookupEnd - t.domainLookupStart),
          tcp: Math.max(0, t.connectEnd - t.connectStart),
          ttfb: Math.max(0, t.responseStart - t.requestStart),
          domContentLoaded: Math.max(0, t.domContentLoadedEventEnd - t.navigationStart),
          loadEvent: Math.max(0, t.loadEventEnd - t.navigationStart),
          resourceCount: resCount
        };
      }

      return null;
    }).catch(() => null);

    session.lastTimings = timings;

    // Viewport Screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });
    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

    return {
      success: true,
      sessionId: session.id,
      url: currentUrl,
      title,
      statusCode,
      executionTimeMs,
      browser: {
        type: session.browserType,
        version: provider.launchedBrowsers.get(session.browserType) ? provider.launchedBrowsers.get(session.browserType).version() : 'latest',
        engine: session.browserType === 'webkit' ? 'WebKit' : (session.browserType === 'firefox' ? 'Gecko / Firefox' : 'Chromium')
      },
      device: {
        name: session.deviceName,
        viewport: session.viewport,
        deviceScaleFactor: session.deviceScaleFactor,
        isMobile: session.isMobile,
        hasTouch: session.hasTouch,
        userAgent: session.userAgent
      },
      navigation: {
        canGoBack: session.historyIndex > 0,
        canGoForward: session.historyIndex < session.history.length - 1,
        historyLength: session.history.length,
        historyIndex: session.historyIndex
      },
      measurements,
      timings,
      consoleLogs: session.consoleLogs.slice(-50),
      pageErrors: session.pageErrors.slice(-20),
      networkErrors: session.networkErrors.slice(-30),
      screenshot: screenshotBase64,
      interactivePreview: session.lastInteractivePreview || { allowed: true, reason: null },
      timestamp: Date.now()
    };
  }
}

// Global Singleton Session Manager
const sessionManager = new SessionManager();

module.exports = {
  SessionManager,
  sessionManager,
  validateSafeUrl
};
