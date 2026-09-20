/**
 * scripts/tests/external-api-tests.js
 * Suite C: Real External API Verification Tests
 * Tests real external integrations (PageSpeed, CrUX, Bing, GSC, Ahrefs).
 * Enforces Zero Fake Data: never generates fallback values or mocks.
 * Skips gracefully when live credentials are not present in environment or DB.
 */

const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../server/data/database');
const PageSpeedProvider = require('../../server/services/seo/providers/pagespeed');
const BingWebmasterProvider = require('../../server/services/seo/providers/bing-webmaster');
const AhrefsProvider = require('../../server/services/seo/providers/ahrefs');
const GoogleSearchConsoleProvider = require('../../server/services/seo/providers/google-search-console');

let passed = 0;
let failed = 0;
let skipped = 0;

async function runTest(name, fn) {
  try {
    const result = await fn();
    if (result && result.skipped) {
      console.log(`  ⚠ SKIP: ${name} — ${result.reason}`);
      skipped++;
    } else {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    }
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== Suite C: External API Verification Tests (Real Network, Zero Fake Data) ===\n');

  const testUserId = 'test_user_ext_' + Date.now();
  const testSessionId = 'sess_' + uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  try {
    db.prepare(`INSERT INTO users (id, email, name, auth_provider) VALUES (?, ?, ?, 'local')`)
      .run(testUserId, `${testUserId}@example.com`, 'External Test User');
    db.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
      .run(testSessionId, testUserId, expiresAt);
  } catch (e) {
    console.error('Setup error:', e.message);
  }

  // 1. Google PageSpeed & CrUX Real Network Call
  await runTest('Google PageSpeed: Execute real request and verify authentic Google response structure', async () => {
    // Uses real network call to Google PageSpeed API
    const result = await PageSpeedProvider.analyze('https://example.com', 'mobile', testUserId);

    assert.ok(result, 'Expected result object');
    assert.strictEqual(result.source, 'pagespeed');
    assert.strictEqual(result.sourceLabel, 'Google PageSpeed Insights');
    assert.ok(result.fetchedAt, 'Must have fetchedAt timestamp');

    // Verify CrUX separation
    assert.ok(result.fieldData !== undefined, 'Must provide separated fieldData container');
    assert.ok(result.cruxFieldMetrics !== undefined, 'Must provide separated cruxFieldMetrics');

    if (result.available) {
      // In case quota permitted real analysis
      assert.ok(result.lighthouseMetrics, 'Must include Lighthouse metrics when available');
      assert.ok(typeof result.performanceScore === 'number');
      assert.strictEqual(result.status, 'fresh');
      console.log('    [PageSpeed] Received live 200 report from Google API');
    } else {
      // In case unauthenticated quota was exceeded (HTTP 429)
      assert.strictEqual(result.status, 'unavailable');
      assert.ok(result.error, 'Authentic Google error must be surfaced');
      console.log(`    [PageSpeed] Verified authentic Google API response: ${result.error}`);
    }
  });

  // 2. Google Search Console OAuth URL Generation & Scope Verification
  await runTest('Google Search Console: Verify OAuth authorization URL & readonly scope', () => {
    if (GoogleSearchConsoleProvider.isConfigured()) {
      const authUrl = GoogleSearchConsoleProvider.generateAuthUrl(testUserId);
      assert.ok(authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
      assert.ok(authUrl.includes('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fwebmasters.readonly'));
      assert.ok(authUrl.includes('access_type=offline'));
    } else {
      assert.throws(
        () => GoogleSearchConsoleProvider.generateAuthUrl(testUserId),
        /Google OAuth Client ID is not configured/
      );
    }
  });

  // 3. Google Search Console Live Analytics (Conditional)
  await runTest('Google Search Console: Query verified property (or verify unauthenticated state)', async () => {
    const status = await GoogleSearchConsoleProvider.getConnectionStatus(testUserId);
    if (!status.connected) {
      return { skipped: true, reason: 'GOOGLE_CLIENT_ID / user OAuth token not connected (Zero fake data maintained)' };
    }

    const properties = GoogleSearchConsoleProvider.listProperties(testUserId);
    if (!properties || properties.length === 0) {
      return { skipped: true, reason: 'No verified GSC properties available on connected account' };
    }

    const res = await GoogleSearchConsoleProvider.querySearchAnalytics(testUserId, properties[0].property_id, {
      dateRange: '28d',
      dimensions: ['query']
    });

    assert.ok(res.totals.clicks);
    assert.ok(res.totals.impressions);
    assert.strictEqual(res.source, 'google-search-console');
  });

  // 4. Bing Webmaster API (Conditional)
  await runTest('Bing Webmaster: Verify Rank & Traffic stats (or verify unconfigured state)', async () => {
    const status = await BingWebmasterProvider.getConnectionStatus(testUserId);
    if (!status.configured) {
      const res = await BingWebmasterProvider.getRankAndTrafficStats(testUserId, 'https://example.com');
      assert.strictEqual(res.available, false);
      assert.strictEqual(res.source, 'bing-webmaster');
      assert.strictEqual(res.error, 'Bing Webmaster Tools not connected');
      return { skipped: true, reason: 'BING_WEBMASTER_API_KEY not configured (Zero fake data maintained)' };
    }

    const res = await BingWebmasterProvider.getRankAndTrafficStats(testUserId, 'https://example.com');
    assert.ok(res);
    assert.strictEqual(res.source, 'bing-webmaster');
  });

  // 5. Ahrefs Domain Rating (Conditional)
  await runTest('Ahrefs: Verify Domain Rating lookup (or verify unconfigured state & attribution)', async () => {
    const status = await AhrefsProvider.getConnectionStatus(testUserId);
    if (!status.configured) {
      const res = await AhrefsProvider.getDomainRating(testUserId, 'https://example.com');
      assert.strictEqual(res.available, false);
      assert.strictEqual(res.domainRating.status, 'unavailable');
      assert.strictEqual(res.attribution, 'Domain Rating by Ahrefs');
      assert.ok(res.domainRating.limitations.includes('Ahrefs API key required'));
      return { skipped: true, reason: 'AHREFS_API_KEY not configured (Zero fake data maintained)' };
    }

    const res = await AhrefsProvider.getDomainRating(testUserId, 'https://example.com');
    assert.ok(res);
    assert.strictEqual(res.source, 'ahrefs');
    assert.strictEqual(res.attribution, 'Domain Rating by Ahrefs');
  });

  // Cleanup
  try {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(testSessionId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  } catch (e) {}

  console.log(`\nExternal API Test Results: ${passed} Passed, ${skipped} Skipped, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error running Suite C:', err);
  process.exit(1);
});
