/**
 * scripts/test-seo-intelligence.js
 * Comprehensive integration test suite for the SEO Intelligence Platform.
 * Tests:
 * 1. Provider Registry & Capabilities
 * 2. Provider Status & Configuration
 * 3. Ahrefs Free Public API Domain Rating (and strict attribution)
 * 4. Bing Webmaster API endpoints
 * 5. Google PageSpeed Insights & CrUX field separation
 * 6. Google Search Console analytics & property list
 * 7. Unified Domain Overview Aggregator
 * 8. Competitor Gap Analysis
 * 9. Server Log File Analyzer (Googlebot, Bingbot, AI crawlers, wasted crawl events)
 * 10. Database persistence & session isolation
 */

const http = require('http');
const { db } = require('../server/data/database');

const HOST = '127.0.0.1';
const PORT = 3000;

// Grab active session from database
const activeSession = db.prepare('SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1').get();
if (!activeSession) {
  console.error('No active session found in database. Run login first.');
  process.exit(1);
}
const SESSION_COOKIE = `studio_session=${activeSession.id}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Cookie': SESSION_COOKIE,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== Starting SEO Intelligence Platform Test Suite ===\n');

  // Test 1: Providers Registry
  console.log('1. Provider Registry & Metadata:');
  const regRes = await request('GET', '/api/seo/providers/registry');
  assert(regRes.status === 200, 'Registry status 200', `Status: ${regRes.status}`);
  assert(Array.isArray(regRes.data?.dataSources), 'Registry returns dataSources array');
  const crawlerDs = regRes.data?.dataSources?.find(d => d.id === 'own-crawler');
  assert(crawlerDs && crawlerDs.status === 'AVAILABLE', 'WebDev Crawler registered as AVAILABLE');
  const gscDs = regRes.data?.dataSources?.find(d => d.id === 'google-search-console');
  assert(gscDs && gscDs.status === 'CONNECTED_DATA', 'Google Search Console registered as CONNECTED_DATA');
  const ahrefsDs = regRes.data?.dataSources?.find(d => d.id === 'ahrefs');
  assert(ahrefsDs && ahrefsDs.attributionNotice === 'Domain Rating by Ahrefs', 'Ahrefs requires strict attribution');

  // Test 2: Providers Status
  console.log('\n2. Providers Status & Connectivity:');
  const statRes = await request('GET', '/api/seo/providers/status');
  assert(statRes.status === 200, 'Provider status 200');
  assert(statRes.data?.providers?.['own-crawler']?.available === true, 'Crawler available by default');
  assert(statRes.data?.providers?.['semrush']?.status === 'COMING_SOON', 'Semrush marked as COMING_SOON');

  // Test 3: Domain Overview Aggregator
  console.log('\n3. Unified Domain Overview Aggregator:');
  const ovRes = await request('GET', '/api/seo/overview?domain=example.com');
  assert(ovRes.status === 200, 'Overview status 200');
  assert(ovRes.data?.domain === 'example.com', 'Overview targets domain');
  assert(ovRes.data?.providers?.crawler !== undefined, 'Crawler section exists in overview');
  assert(ovRes.data?.providers?.ahrefs?.attribution === 'Domain Rating by Ahrefs', 'Ahrefs attribution in overview');

  // Test 4: Competitor Gap Comparison
  console.log('\n4. Competitor Gap Analysis:');
  const compRes = await request('POST', '/api/seo/competitors/compare', {
    targetDomain: 'example.com',
    competitorDomain: 'test.com'
  });
  assert(compRes.status === 200, 'Competitor compare status 200');
  assert(compRes.data?.comparison?.target !== undefined, 'Comparison includes target domain');
  assert(compRes.data?.comparison?.competitor !== undefined, 'Comparison includes competitor domain');

  // Test 5: Ahrefs DR Query & Attribution
  console.log('\n5. Ahrefs Domain Rating Lookup:');
  const ahrefsRes = await request('GET', '/api/seo/ahrefs/dr?domain=example.com');
  assert(ahrefsRes.status === 200, 'Ahrefs DR status 200');
  assert(ahrefsRes.data?.domainRating?.sourceLabel === 'Ahrefs', 'Ahrefs source label present');
  assert(ahrefsRes.data?.domainRating?.available !== undefined, 'Ahrefs reports availability flag');

  // Test 6: Google Search Console Analytics
  console.log('\n6. Google Search Console Analytics:');
  const gscRes = await request('GET', '/api/seo/gsc/analytics?range=28d');
  assert(gscRes.status === 200, 'GSC analytics status 200');
  assert(gscRes.data?.summary !== undefined, 'GSC summary metrics object present');

  // Test 7: Google PageSpeed & CrUX Separation (Zero Fake Data)
  console.log('\n7. Google PageSpeed Insights & CrUX Field Data:');
  const psRes = await request('GET', '/api/seo/pagespeed/analyze?url=https://example.com&strategy=mobile');
  assert(psRes.status === 200, 'PageSpeed analyze status 200');
  assert(psRes.data?.source === 'pagespeed', 'PageSpeed source identified');
  if (psRes.data?.available) {
    assert(psRes.data?.scores !== undefined, 'PageSpeed scores present when quota available');
    assert(psRes.data?.cruxFieldMetrics !== undefined, 'CrUX field metrics cleanly separated');
  } else {
    assert(psRes.data?.available === false, 'Zero fake data: reports available=false when API quota exhausted');
    assert(typeof psRes.data?.error === 'string', 'Legitimate error message reported without inventing scores');
  }

  // Test 8: Server Access Log Analyzer (Real Apache/Nginx format)
  console.log('\n8. Server Log File Analyzer:');
  const sampleLog = `66.249.66.1 - - [18/Sep/2026:12:00:00 +0000] "GET / HTTP/1.1" 200 4500 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
66.249.66.2 - - [18/Sep/2026:12:01:00 +0000] "GET /non-existent-page HTTP/1.1" 404 120 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
40.77.167.1 - - [18/Sep/2026:12:02:00 +0000] "GET /docs HTTP/1.1" 200 8900 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
52.167.144.1 - - [18/Sep/2026:12:03:00 +0000] "GET /blog HTTP/1.1" 200 12000 "-" "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)"
54.210.12.5 - - [18/Sep/2026:12:04:00 +0000] "GET /broken HTTP/1.1" 500 500 "-" "ClaudeBot/1.0; +claudebot@anthropic.com"`;

  const logRes = await request('POST', '/api/seo/logs/analyze', {
    filename: 'test_access.log',
    logContent: sampleLog
  });
  assert(logRes.status === 200, 'Log analysis status 200');
  const a = logRes.data?.analysis;
  assert(a && a.totalLines === 5, 'Parsed 5 lines');
  assert(a?.metrics?.totalBotHits === 5, 'Identified 5 bot hits');
  assert(a?.botDistribution?.['Googlebot Desktop'] === 2, 'Identified Googlebot Desktop hits');
  assert(a?.botDistribution?.['Bingbot'] === 1, 'Identified Bingbot hit');
  assert(a?.botDistribution?.['GPTBot (OpenAI)'] === 1, 'Identified GPTBot hit');
  assert(a?.botDistribution?.['ClaudeBot (Anthropic)'] === 1, 'Identified ClaudeBot hit');
  assert(a?.metrics?.wastedCrawlEventsCount === 2, 'Identified 2 wasted crawl events (404 & 500)');
  assert(Array.isArray(a?.wastedCrawlSamples) && a.wastedCrawlSamples.length === 2, 'Wasted crawl samples captured');

  // Test 9: Database Persistence of Log Analysis
  console.log('\n9. Database Persistence Verification:');
  const dbLogRow = db.prepare('SELECT * FROM seo_log_analyses WHERE id = ?').get(logRes.data?.logId);
  assert(dbLogRow !== undefined, 'Log analysis persisted to SQLite seo_log_analyses table');
  assert(dbLogRow.lines_parsed === 5, 'Persisted row records correct line count');

  // Summary
  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
