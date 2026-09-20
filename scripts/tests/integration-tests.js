/**
 * scripts/tests/integration-tests.js
 * Suite B: Integration Tests
 * Tests against our own backend & SQLite DB (database persistence, caching, and internal HTTP endpoints).
 */

const assert = require('assert');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../server/data/database');
const SeoCache = require('../../server/services/seo/seo-cache');

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

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('\n=== Suite B: Integration Tests (SQLite DB & Internal Endpoints) ===\n');

  // Ensure test user and session
  const testUserId = 'test_user_integration_' + Date.now();
  const testSessionId = 'sess_' + uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, email, name, auth_provider)
      VALUES (?, ?, ?, 'local')
    `).run(testUserId, `${testUserId}@example.com`, 'Integration Test User');

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(testSessionId, testUserId, expiresAt);
  } catch (e) {
    console.error('Failed to setup test user/session in DB:', e.message);
  }

  const defaultHeaders = {
    'Authorization': `Bearer ${testSessionId}`,
    'Cookie': `studio_session=${testSessionId}`
  };

  // 1. Database Schema Verification
  await runTest('SQLite Schema: All required SEO tables exist in database', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'seo_%'
    `).all().map(t => t.name);

    const required = [
      'seo_audits',
      'seo_pages',
      'seo_issues',
      'seo_provider_connections',
      'seo_provider_properties',
      'seo_provider_cache',
      'seo_log_analyses'
    ];

    for (const req of required) {
      assert.ok(tables.includes(req), `Expected table ${req} to exist in database`);
    }
  });

  // 2. Audit Run & Page Persistence
  const testAuditId = 'audit_int_' + uuidv4();
  await runTest('SQLite Persistence: Insert audit run, pages, and issues', () => {
    db.prepare(`
      INSERT INTO seo_audits (id, user_id, url, status, pages_crawled, pages_discovered, health_score)
      VALUES (?, ?, 'https://test-integration.com', 'completed', 2, 5, 85)
    `).run(testAuditId, testUserId);

    db.prepare(`
      INSERT INTO seo_pages (id, audit_id, url, final_url, status_code, title, word_count, indexable)
      VALUES (?, ?, 'https://test-integration.com/', 'https://test-integration.com/', 200, 'Home', 150, 1)
    `).run('page_' + uuidv4(), testAuditId);

    db.prepare(`
      INSERT INTO seo_issues (id, audit_id, code, category, severity, title, description, recommendation)
      VALUES (?, ?, 'TEST_WARN', 'content', 'warning', 'Test SEO Warning', 'Description', 'Fix it')
    `).run('issue_' + uuidv4(), testAuditId);

    const audit = db.prepare('SELECT * FROM seo_audits WHERE id = ?').get(testAuditId);
    assert.strictEqual(audit.url, 'https://test-integration.com');
    assert.strictEqual(audit.health_score, 85);

    const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ?').all(testAuditId);
    assert.strictEqual(pages.length, 1);
    assert.strictEqual(pages[0].url, 'https://test-integration.com/');

    const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ?').all(testAuditId);
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].code, 'TEST_WARN');
  });

  // 3. SEO Cache Lifecycle
  await runTest('SeoCache: Set, retrieve from memory, retrieve from SQLite, and invalidate', () => {
    const cacheKey = 'test:cache:integration:' + Date.now();
    const payload = { score: 98, note: 'integration_test_cached' };

    SeoCache.set(cacheKey, 'test-provider', payload, 300);

    // Retrieve
    const fetched = SeoCache.get(cacheKey);
    assert.deepStrictEqual(fetched, payload, 'Memory/SQLite cache retrieval must match');

    // Invalidate
    SeoCache.invalidate(cacheKey);
    const afterInvalidation = SeoCache.get(cacheKey);
    assert.strictEqual(afterInvalidation, null, 'Cache key must return null after invalidation');
  });

  // 4. Provider Connection Persistence
  await runTest('seo_provider_connections: Insert and verify API key storage', () => {
    const connId = 'conn_' + uuidv4();
    db.prepare(`
      INSERT INTO seo_provider_connections (id, user_id, provider, api_key, status)
      VALUES (?, ?, 'test_provider', 'test_key_secret_123', 'active')
    `).run(connId, testUserId);

    const conn = db.prepare('SELECT * FROM seo_provider_connections WHERE id = ?').get(connId);
    assert.strictEqual(conn.provider, 'test_provider');
    assert.strictEqual(conn.api_key, 'test_key_secret_123');

    db.prepare('DELETE FROM seo_provider_connections WHERE id = ?').run(connId);
  });

  // 5. HTTP: Provider Status Endpoint
  await runTest('HTTP GET /api/seo/providers/status: Returns 200 with all provider statuses', async () => {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/seo/providers/status',
      method: 'GET',
      headers: defaultHeaders
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.providers, 'Expected providers object');
    assert.ok(res.body.providers['google-search-console']);
    assert.ok(res.body.providers['bing-webmaster']);
    assert.ok(res.body.providers['pagespeed']);
    assert.ok(res.body.providers['ahrefs']);
  });

  // 6. HTTP: GSC Properties Unconnected State
  await runTest('HTTP GET /api/seo/gsc/properties: Returns 200 with empty list when disconnected', async () => {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/seo/gsc/properties',
      method: 'GET',
      headers: defaultHeaders
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, false);
    assert.deepStrictEqual(res.body.properties, []);
  });

  // 7. HTTP: GSC Analytics Unconnected State (Zero Fake Data Contract)
  await runTest('HTTP GET /api/seo/gsc/analytics: Returns unavailable state when not connected', async () => {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/seo/gsc/analytics?days=28',
      method: 'GET',
      headers: defaultHeaders
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, false);
    assert.strictEqual(res.body.rows.length, 0);
    assert.strictEqual(res.body.totals.clicks.available, false);
    assert.strictEqual(res.body.totals.clicks.value, null);
    assert.strictEqual(res.body.totals.impressions.value, null);
  });

  // 8. HTTP: Log File Analyzer Upload & SQLite Persistence
  await runTest('HTTP POST /api/seo/log-analyzer: Parses log lines and records in database', async () => {
    const sampleLog = [
      '66.249.66.1 - - [18/Sep/2026:12:00:00 +0000] "GET /home HTTP/1.1" 200 4500 "-" "Mozilla/5.0 (compatible; Googlebot/2.1)"',
      '40.77.167.1 - - [18/Sep/2026:12:00:01 +0000] "GET /not-found HTTP/1.1" 404 230 "-" "bingbot/2.0"'
    ].join('\n');

    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/seo/log-analyzer',
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json'
      }
    }, { logText: sampleLog, filename: 'integration-test.log' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.analysis.totalLines, 2);
    assert.strictEqual(res.body.analysis.metrics.totalBotHits, 2);
    assert.strictEqual(res.body.analysis.metrics.wastedCrawlEventsCount, 1);
  });

  // Cleanup test data
  try {
    db.prepare('DELETE FROM seo_issues WHERE audit_id = ?').run(testAuditId);
    db.prepare('DELETE FROM seo_pages WHERE audit_id = ?').run(testAuditId);
    db.prepare('DELETE FROM seo_audits WHERE id = ?').run(testAuditId);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(testSessionId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  } catch (e) {
    console.error('Cleanup warning:', e.message);
  }

  console.log(`\nIntegration Test Results: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
