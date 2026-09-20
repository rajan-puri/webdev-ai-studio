/**
 * scripts/tests/unit-tests.js
 * Suite A: Pure Unit Tests
 * Tests logic without network calls or external mocks.
 */

const assert = require('assert');
const { normalizeMetric, createUnavailableMetric } = require('../../server/services/seo/seo-normalizer');
const LogFileAnalyzer = require('../../server/services/seo/log-analyzer');
const { parseRobotsText, AI_BOT_NAMES } = require('../../server/services/seo/robots-analyzer');
const { generateSeoPagesCsv, generateSeoAuditJson } = require('../../server/services/seo/exporter');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

console.log('\n=== Suite A: Unit Tests (Pure Logic, Zero External Network) ===\n');

// 1. Normalizer Tests
test('normalizeMetric: enforces standard contract keys', () => {
  const m = normalizeMetric({
    value: 85,
    source: 'own-crawler',
    sourceLabel: 'WebDev Crawler',
    unit: '%'
  });
  assert.strictEqual(m.value, 85);
  assert.strictEqual(m.source, 'own-crawler');
  assert.strictEqual(m.sourceLabel, 'WebDev Crawler');
  assert.strictEqual(m.unit, '%');
  assert.strictEqual(m.available, true);
  assert.strictEqual(m.status, 'fresh');
  assert.ok(m.fetchedAt);
});

test('normalizeMetric: marks available=false when value is null', () => {
  const m = normalizeMetric({
    value: null,
    source: 'ahrefs',
    sourceLabel: 'Ahrefs DR'
  });
  assert.strictEqual(m.value, null);
  assert.strictEqual(m.available, false);
  assert.strictEqual(m.status, 'unavailable');
});

test('createUnavailableMetric: formats uniform unavailable state with reason', () => {
  const m = createUnavailableMetric('google-search-console', 'Google Search Console', 'OAuth not connected');
  assert.strictEqual(m.value, null);
  assert.strictEqual(m.available, false);
  assert.strictEqual(m.limitations, 'OAuth not connected');
});

// 2. Robots Analyzer Tests
test('parseRobotsText: correctly parses AI bot restrictions', () => {
  const robotsTxt = `
User-agent: *
Disallow: /admin/
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /private/
`;
  const result = {
    groups: [],
    sitemaps: [],
    hasDisallowAll: false,
    aiBots: {},
    issues: []
  };

  parseRobotsText(robotsTxt, result);
  assert.strictEqual(result.aiBots.gptbot.specified, true);
  assert.strictEqual(result.aiBots.gptbot.allowed, false, 'GPTBot should be blocked');
  assert.strictEqual(result.aiBots.claudebot.specified, true);
  assert.strictEqual(result.aiBots.claudebot.allowed, true, 'ClaudeBot only disallows /private/, not /');
  assert.strictEqual(result.aiBots.perplexitybot.specified, false, 'PerplexityBot not specified in robots');
  assert.strictEqual(result.aiBots.perplexitybot.allowed, true, 'PerplexityBot inherits wildcard');
});

// 3. Log File Analyzer Tests
test('LogFileAnalyzer: correctly parses Combined Log lines and extracts bot hits', () => {
  const line = '66.249.66.1 - - [18/Sep/2026:10:00:00 +0000] "GET /test HTTP/1.1" 200 4521 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"';
  const analysis = LogFileAnalyzer.parseAndAnalyze(line, 'access.log');

  assert.strictEqual(analysis.totalLines, 1);
  assert.strictEqual(analysis.metrics.totalBotHits, 1);
  assert.strictEqual(analysis.botDistribution['Googlebot Desktop'], 1);
  assert.strictEqual(analysis.statusCodeDistribution['200'], 1);
  assert.strictEqual(analysis.metrics.wastedCrawlEventsCount, 0);
});

test('LogFileAnalyzer: identifies wasted crawl budget on 404 and 500 status codes', () => {
  const lines = [
    '66.249.66.1 - - [18/Sep/2026:10:00:00 +0000] "GET /dead-link HTTP/1.1" 404 120 "-" "Googlebot/2.1"',
    '157.55.39.1 - - [18/Sep/2026:10:00:05 +0000] "GET /server-error HTTP/1.1" 500 450 "-" "bingbot/2.0"'
  ].join('\n');

  const analysis = LogFileAnalyzer.parseAndAnalyze(lines, 'access.log');
  assert.strictEqual(analysis.metrics.wastedCrawlEventsCount, 2);
  assert.strictEqual(analysis.wastedCrawlSamples.length, 2);
  assert.strictEqual(analysis.wastedCrawlSamples[0].statusCode, 404);
  assert.strictEqual(analysis.wastedCrawlSamples[1].statusCode, 500);
});

// 4. Exporter Tests
test('generateSeoPagesCsv: formats CSV header and rows properly', () => {
  const pages = [{
    url: 'https://example.com/',
    status_code: 200,
    is_indexable: 1,
    title: 'Example Domain',
    title_length: 14,
    meta_description: 'Example Description',
    meta_description_length: 19,
    h1: 'Example Header',
    canonical_url: 'https://example.com/',
    word_count: 350,
    crawl_depth: 0,
    internal_links_in: 0,
    internal_links_out: 5,
    issues_count: 0,
    response_time_ms: 120
  }];

  const csv = generateSeoPagesCsv(pages);
  const rows = csv.trim().split('\n');
  assert.strictEqual(rows.length, 2);
  assert.ok(rows[0].includes('URL,Status Code,Final URL,Indexable'));
  assert.ok(rows[1].includes('"https://example.com/","200"'));
});

test('generateSeoAuditJson: packages audit, summary, pages, and issues into standard schema', () => {
  const audit = { id: 'audit_123', url: 'https://example.com', health_score: 90 };
  const pages = [{ url: 'https://example.com', status_code: 200 }];
  const issues = [{ code: 'TEST_ISSUE', severity: 'NOTICE' }];

  const json = generateSeoAuditJson(audit, pages, issues);
  assert.strictEqual(json.audit.id, 'audit_123');
  assert.strictEqual(json.pages.length, 1);
  assert.strictEqual(json.issues.length, 1);
});

console.log(`\nUnit Test Results: ${passed} Passed, ${failed} Failed\n`);
if (failed > 0) process.exit(1);
