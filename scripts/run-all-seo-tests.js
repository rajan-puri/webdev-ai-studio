/**
 * scripts/run-all-seo-tests.js
 * Master SEO Test Runner: Executes Suites A, B, C, and D in sequence.
 * Enforces Zero Fake Data across all integration layers.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Suite A: Unit Tests (Pure Logic, No Network)', script: 'scripts/tests/unit-tests.js' },
  { name: 'Suite B: Integration Tests (SQLite DB & Internal Endpoints)', script: 'scripts/tests/integration-tests.js' },
  { name: 'Suite C: External API Verification (Real Network, Zero Fake Data)', script: 'scripts/tests/external-api-tests.js' },
  { name: 'Suite D: Browser / E2E Verification (Playwright Chromium)', script: 'scripts/tests/e2e-browser-tests.js' },
  { name: 'Suite E: PageSpeed & CrUX Comprehensive (Lighthouse, 429, 403, CrUX, Cache)', script: 'scripts/tests/pagespeed-tests.js' }
];

console.log('================================================================');
console.log('       SEO INTELLIGENCE PLATFORM: MASTER VERIFICATION RUNNER     ');
console.log('================================================================');

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;

for (const suite of suites) {
  console.log(`\n>>> Launching ${suite.name} ...`);
  const fullPath = path.resolve(__dirname, '..', suite.script);
  const result = spawnSync(process.execPath, [fullPath], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status === 0) {
    totalSuitesPassed++;
  } else {
    totalSuitesFailed++;
    console.error(`\n[ERROR] ${suite.name} failed with exit code ${result.status}`);
  }
}

console.log('\n================================================================');
console.log(`  TEST RUN SUMMARY: ${totalSuitesPassed}/${suites.length} Suites Passed, ${totalSuitesFailed} Failed`);
console.log('================================================================\n');

if (totalSuitesFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL TEST SUITES PASSED SUCCESSFULLY WITH ZERO FAKE DATA.\n');
}
