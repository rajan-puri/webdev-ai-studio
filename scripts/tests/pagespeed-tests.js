/**
 * scripts/tests/pagespeed-tests.js
 * Comprehensive test suite for Google PageSpeed Insights & CrUX integration.
 * Tests:
 * 1. Successful PageSpeed response
 * 2. Mobile request strategy
 * 3. Desktop request strategy
 * 4. All four Lighthouse categories (Performance, Accessibility, Best Practices, SEO)
 * 5. HTTP 429 (Quota exceeded handling and zero caching of errors)
 * 6. HTTP 403 (Invalid key/permissions handling)
 * 7. Malformed response handling
 * 8. Missing category score handling (no invented fake scores)
 * 9. API key not exposed client-side
 * 10. Cache hit (12-hour persistence)
 * 11. CrUX unavailable (separation from Lighthouse lab success)
 * 12. CrUX available (real-user field metrics extraction)
 */

const assert = require('assert');
const PageSpeedProvider = require('../../server/services/seo/providers/pagespeed');
const SeoCache = require('../../server/services/seo/seo-cache');
const { db } = require('../../server/data/database');

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

// Sample Google PageSpeed v5 API response generator
function makeGooglePageSpeedPayload({
  perf = 0.88,
  a11y = 0.95,
  bp = 0.92,
  seo = 0.90,
  hasCrux = true
} = {}) {
  return JSON.stringify({
    captchaResult: 'CAPTCHA_NOT_NEEDED',
    kind: 'pagespeedonline#result',
    id: 'https://example.com/',
    loadingExperience: hasCrux ? {
      id: 'https://example.com/',
      metrics: {
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 4, category: 'FAST' },
        FIRST_CONTENTFUL_PAINT_MS: { percentile: 1400, category: 'FAST' },
        INTERACTION_TO_NEXT_PAINT: { percentile: 85, category: 'FAST' },
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: 'FAST' }
      },
      overall_category: 'FAST',
      initial_url: 'https://example.com/'
    } : {
      initial_url: 'https://example.com/'
    },
    lighthouseResult: {
      lighthouseVersion: '12.2.0',
      fetchTime: new Date().toISOString(),
      finalUrl: 'https://example.com/',
      categories: {
        performance: perf !== undefined ? { id: 'performance', title: 'Performance', score: perf } : undefined,
        accessibility: a11y !== undefined ? { id: 'accessibility', title: 'Accessibility', score: a11y } : undefined,
        'best-practices': bp !== undefined ? { id: 'best-practices', title: 'Best Practices', score: bp } : undefined,
        seo: seo !== undefined ? { id: 'seo', title: 'SEO', score: seo } : undefined
      },
      audits: {
        'first-contentful-paint': { id: 'first-contentful-paint', title: 'First Contentful Paint', displayValue: '1.4 s' },
        'largest-contentful-paint': { id: 'largest-contentful-paint', title: 'Largest Contentful Paint', displayValue: '2.1 s' },
        'cumulative-layout-shift': { id: 'cumulative-layout-shift', title: 'Cumulative Layout Shift', displayValue: '0.04' },
        'total-blocking-time': { id: 'total-blocking-time', title: 'Total Blocking Time', displayValue: '40 ms' },
        'speed-index': { id: 'speed-index', title: 'Speed Index', displayValue: '1.8 s' }
      }
    }
  });
}

async function run() {
  console.log('\n=== Google PageSpeed Insights & CrUX Unit/Integration Test Suite ===\n');

  const origHttpRequest = PageSpeedProvider.httpRequest;

  try {
    // 1. Successful PageSpeed response
    await runTest('1. Successful PageSpeed response: validates all contract keys and scores', async () => {
      SeoCache.invalidateProvider('pagespeed');
      PageSpeedProvider.httpRequest = async () => makeGooglePageSpeedPayload();

      const res = await PageSpeedProvider.analyze('https://test-pagespeed-success-' + Date.now() + '.com', 'mobile');
      assert.strictEqual(res.available, true);
      assert.strictEqual(res.source, 'pagespeed');
      assert.strictEqual(res.sourceLabel, 'Google PageSpeed Insights');
      assert.strictEqual(res.strategy, 'mobile');
      assert.strictEqual(res.scores.performance.value, 88);
      assert.strictEqual(res.scores.performance.available, true);
      assert.strictEqual(res.scores.performance.status, 'fresh');
      assert.strictEqual(res.scores.accessibility.value, 95);
      assert.strictEqual(res.scores.bestPractices.value, 92);
      assert.strictEqual(res.scores.seo.value, 90);
    });

    // 2. Mobile request strategy
    await runTest('2. Mobile request: passes strategy=mobile to API query', async () => {
      SeoCache.invalidateProvider('pagespeed');
      let capturedUrl = null;
      PageSpeedProvider.httpRequest = async (url) => {
        capturedUrl = url;
        return makeGooglePageSpeedPayload();
      };

      const res = await PageSpeedProvider.analyze('https://test-mobile-strat-' + Date.now() + '.com', 'mobile');
      assert.ok(capturedUrl && capturedUrl.includes('strategy=mobile'), 'Expected strategy=mobile in request URL');
      assert.strictEqual(res.strategy, 'mobile');
    });

    // 3. Desktop request strategy
    await runTest('3. Desktop request: passes strategy=desktop to API query', async () => {
      SeoCache.invalidateProvider('pagespeed');
      let capturedUrl = null;
      PageSpeedProvider.httpRequest = async (url) => {
        capturedUrl = url;
        return makeGooglePageSpeedPayload();
      };

      const res = await PageSpeedProvider.analyze('https://test-desktop-strat-' + Date.now() + '.com', 'desktop');
      assert.ok(capturedUrl && capturedUrl.includes('strategy=desktop'), 'Expected strategy=desktop in request URL');
      assert.strictEqual(res.strategy, 'desktop');
    });

    // 4. All four Lighthouse categories
    await runTest('4. All four categories: verifies performance, accessibility, best-practices, and seo request and conversion', async () => {
      SeoCache.invalidateProvider('pagespeed');
      let capturedUrl = null;
      PageSpeedProvider.httpRequest = async (url) => {
        capturedUrl = url;
        return makeGooglePageSpeedPayload({ perf: 0.75, a11y: 0.85, bp: 0.90, seo: 1.0 });
      };

      const res = await PageSpeedProvider.analyze('https://test-four-cats-' + Date.now() + '.com', 'mobile');
      assert.ok(capturedUrl && capturedUrl.includes('category=performance'));
      assert.ok(capturedUrl && capturedUrl.includes('category=accessibility'));
      assert.ok(capturedUrl && capturedUrl.includes('category=best-practices'));
      assert.ok(capturedUrl && capturedUrl.includes('category=seo'));

      assert.strictEqual(res.scores.performance.value, 75);
      assert.strictEqual(res.scores.accessibility.value, 85);
      assert.strictEqual(res.scores.bestPractices.value, 90);
      assert.strictEqual(res.scores.seo.value, 100);
    });

    // 5. HTTP 429 Quota Exceeded handling
    await runTest('5. HTTP 429: detects quota exhaustion, reports safe reason, and does not cache error', async () => {
      PageSpeedProvider.httpRequest = async () => {
        const err = new Error('Google PageSpeed API HTTP 429: {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}');
        err.statusCode = 429;
        throw err;
      };

      const testUrl = 'https://test-quota-exceeded-' + Date.now() + '.com';
      const res = await PageSpeedProvider.analyze(testUrl, 'mobile');

      assert.strictEqual(res.available, false);
      assert.strictEqual(res.status, 'unavailable');
      assert.strictEqual(res.httpStatus, 429);
      assert.strictEqual(res.error, 'PageSpeed API quota exceeded');
      assert.strictEqual(res.scores.performance.value, null);
      assert.strictEqual(res.scores.performance.available, false);
      assert.strictEqual(res.scores.performance.limitations, 'PageSpeed API quota exceeded');

      // Verify error was NOT cached
      const cacheKey = `pagespeed:mobile:${testUrl}`;
      const cached = SeoCache.get(cacheKey);
      assert.strictEqual(cached, null, 'Errors must never be cached in SeoCache');
    });

    // 6. HTTP 403 Authentication / Permission Error
    await runTest('6. HTTP 403: reports safe authentication / permission error', async () => {
      PageSpeedProvider.httpRequest = async () => {
        const err = new Error('Google PageSpeed API HTTP 403: {"error": {"code": 403, "status": "PERMISSION_DENIED"}}');
        err.statusCode = 403;
        throw err;
      };

      const res = await PageSpeedProvider.analyze('https://test-forbidden-key.com', 'mobile');
      assert.strictEqual(res.available, false);
      assert.strictEqual(res.httpStatus, 403);
      assert.strictEqual(res.error, 'Google PageSpeed API key is invalid or lacks required permissions');
      assert.strictEqual(res.diagnostics.status, 'Unavailable');
    });

    // 7. Malformed response handling
    await runTest('7. Malformed response: handles invalid JSON gracefully', async () => {
      PageSpeedProvider.httpRequest = async () => '<html><body>502 Bad Gateway</body></html>';

      const res = await PageSpeedProvider.analyze('https://test-malformed-json.com', 'mobile');
      assert.strictEqual(res.available, false);
      assert.strictEqual(res.status, 'unavailable');
      assert.ok(res.error);
    });

    // 8. Missing category score (no invented fake values)
    await runTest('8. Missing category score: sets value=null, available=false without inventing values', async () => {
      PageSpeedProvider.httpRequest = async () => {
        // Accessibility category missing or null
        return makeGooglePageSpeedPayload({ perf: 0.80, a11y: null, bp: 0.90, seo: 0.85 });
      };

      const res = await PageSpeedProvider.analyze('https://test-missing-category.com', 'mobile');
      assert.strictEqual(res.scores.performance.value, 80);
      assert.strictEqual(res.scores.accessibility.value, null, 'Must be null when Google does not provide score');
      assert.strictEqual(res.scores.accessibility.available, false);
      assert.strictEqual(res.scores.accessibility.status, 'unavailable');
    });

    // 9. API key not exposed client-side
    await runTest('9. Security: getConnectionStatus does not leak API key to client', async () => {
      const dummyUserId = 'test_user_leak_' + Date.now();
      db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, 'Leak Test')`).run(dummyUserId, `${dummyUserId}@example.com`);

      db.prepare(`
        INSERT INTO seo_provider_connections (id, user_id, provider, auth_type, api_key, status)
        VALUES (?, ?, 'pagespeed', 'api_key', 'AIzaSecretKey12345', 'connected')
      `).run('conn_' + dummyUserId, dummyUserId);

      const status = await PageSpeedProvider.getConnectionStatus(dummyUserId);
      assert.strictEqual(status.connected, true);
      assert.strictEqual(status.hasApiKey, true);
      assert.strictEqual(status.api_key, undefined, 'api_key must not be returned in connection status');
      assert.strictEqual(status.apiKey, undefined, 'apiKey must not be returned in connection status');

      db.prepare('DELETE FROM seo_provider_connections WHERE user_id = ?').run(dummyUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(dummyUserId);
    });

    // 10. Cache hit (12-hour caching)
    await runTest('10. Cache hit: returns cached response without making network request', async () => {
      let networkCalls = 0;
      PageSpeedProvider.httpRequest = async () => {
        networkCalls++;
        return makeGooglePageSpeedPayload({ perf: 0.91 });
      };

      const testUrl = 'https://test-cache-hit-' + Date.now() + '.com';
      const first = await PageSpeedProvider.analyze(testUrl, 'mobile');
      assert.strictEqual(networkCalls, 1);
      assert.strictEqual(first.scores.performance.value, 91);

      // Second call to same URL and strategy
      const second = await PageSpeedProvider.analyze(testUrl, 'mobile');
      assert.strictEqual(networkCalls, 1, 'Second call must hit cache and avoid network call');
      assert.strictEqual(second.scores.performance.value, 91);
    });

    // 11. CrUX unavailable (Lighthouse lab success separated from CrUX absence)
    await runTest('11. CrUX unavailable: marks fieldData unavailable while keeping Lighthouse available', async () => {
      PageSpeedProvider.httpRequest = async () => {
        return makeGooglePageSpeedPayload({ perf: 0.85, hasCrux: false });
      };

      const res = await PageSpeedProvider.analyze('https://test-no-crux.com', 'mobile');
      assert.strictEqual(res.available, true, 'PageSpeed audit still succeeds');
      assert.strictEqual(res.scores.performance.value, 85);
      assert.strictEqual(res.fieldData.available, false);
      assert.strictEqual(res.cruxFieldMetrics.status, 'unavailable');
      assert.strictEqual(res.fieldData.overallCategory, 'Field data unavailable (insufficient real user traffic)');
      assert.ok(res.cruxFieldMetrics.reason.includes('Chrome User Experience Report does not have sufficient real-user samples'));
    });

    // 12. CrUX available (real-user field metrics extraction)
    await runTest('12. CrUX available: parses 28-day field data (LCP, CLS, INP, FCP) correctly', async () => {
      PageSpeedProvider.httpRequest = async () => {
        return makeGooglePageSpeedPayload({ perf: 0.92, hasCrux: true });
      };

      const res = await PageSpeedProvider.analyze('https://test-with-crux.com', 'mobile');
      assert.strictEqual(res.available, true);
      assert.strictEqual(res.fieldData.available, true);
      assert.strictEqual(res.cruxFieldMetrics.status, 'available');
      assert.strictEqual(res.cruxFieldMetrics.overallCategory, 'FAST');
      assert.strictEqual(res.cruxFieldMetrics.metrics.LCP.displayValue, '2.10s');
      assert.strictEqual(res.cruxFieldMetrics.metrics.CLS.displayValue, '0.04');
      assert.strictEqual(res.cruxFieldMetrics.metrics.INP.displayValue, '85ms');
      assert.strictEqual(res.cruxFieldMetrics.metrics.FCP.displayValue, '1.40s');
    });

  } finally {
    PageSpeedProvider.httpRequest = origHttpRequest;
  }

  console.log(`\nPageSpeed Integration Test Results: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error in pagespeed test suite:', err);
  process.exit(1);
});
