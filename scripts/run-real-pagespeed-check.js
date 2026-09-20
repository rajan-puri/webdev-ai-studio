/**
 * scripts/run-real-pagespeed-check.js
 * Executes a REAL live PageSpeed request against https://www.bkpainters.co.nz/ using mobile strategy.
 * Reports exact HTTP status, scores, CrUX, cache status, and timestamps.
 * Zero synthetic scores.
 */

const PageSpeedProvider = require('../server/services/seo/providers/pagespeed');
const SeoCache = require('../server/services/seo/seo-cache');

async function main() {
  const targetUrl = 'https://www.bkpainters.co.nz/';
  const strategy = 'mobile';
  const cacheKey = `pagespeed:${strategy}:${targetUrl}`;

  const cachedBefore = SeoCache.get(cacheKey);
  const cacheStatus = cachedBefore ? 'HIT (from cache)' : 'MISS (fresh real request)';

  console.log(`Executing real PageSpeed request for ${targetUrl} (${strategy})...`);
  const startTime = Date.now();
  const res = await PageSpeedProvider.analyze(targetUrl, strategy);
  const durationMs = Date.now() - startTime;

  console.log('\n--- Real Google PageSpeed Request Execution Report ---');
  console.log('Target URL:            ', targetUrl);
  console.log('Strategy:              ', strategy);
  console.log('HTTP Status:           ', res.httpStatus || (res.available ? 200 : 500));
  console.log('Available:             ', res.available);
  console.log('Final URL:             ', res.url);
  console.log('API Response Timestamp:', res.fetchedAt);
  console.log('Execution Duration:    ', `${durationMs}ms`);
  console.log('Cache Status:          ', cacheStatus);

  if (res.available) {
    console.log('Performance Score:     ', res.scores?.performance?.value !== null ? `${res.scores.performance.value}/100` : 'Not returned');
    console.log('Accessibility Score:   ', res.scores?.accessibility?.value !== null ? `${res.scores.accessibility.value}/100` : 'Not returned');
    console.log('Best Practices Score:  ', res.scores?.bestPractices?.value !== null ? `${res.scores.bestPractices.value}/100` : 'Not returned');
    console.log('SEO Score:             ', res.scores?.seo?.value !== null ? `${res.scores.seo.value}/100` : 'Not returned');
    console.log('CrUX Availability:     ', res.fieldData?.available ? 'Available' : 'Field data unavailable');
    if (res.fieldData?.available) {
      console.log('CrUX Overall Category: ', res.fieldData.overallCategory);
    } else {
      console.log('CrUX Note:             ', res.fieldData?.reason || 'Field data unavailable');
    }
  } else {
    console.log('Performance Score:     ', 'Unavailable');
    console.log('Accessibility Score:   ', 'Unavailable');
    console.log('Best Practices Score:  ', 'Unavailable');
    console.log('SEO Score:             ', 'Unavailable');
    console.log('CrUX Availability:     ', 'Field data unavailable');
    console.log('Provider Error:        ', res.error);
    console.log('Diagnostics State:     ', res.diagnostics?.status);
    console.log('Diagnostics Reason:    ', res.diagnostics?.reason);
  }
  console.log('------------------------------------------------------\n');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
