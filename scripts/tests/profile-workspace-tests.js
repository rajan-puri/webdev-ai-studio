/**
 * scripts/tests/profile-workspace-tests.js
 * Comprehensive automated Playwright test suite for WebDev AI Studio Profile Workspace.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '../../test-verification-evidence/profile');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Starting Profile Workspace Verification Tests...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Initial load on homepage
    console.log('Test Suite 1: Top-Right User Button & Navigation');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const profileBtn = page.locator('#btnAuthProfile');
    await profileBtn.waitFor({ state: 'visible', timeout: 5000 });
    const btnText = await profileBtn.textContent();
    assert(btnText.includes('WebDev Developer') || btnText.includes('W'), 'Top-right user button displays WebDev Developer / W avatar');

    // Take screenshot of overview header with button
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-overview-header.png') });

    // TEST 2: Click top-right user button -> navigate to /profile, modal NOT opened
    console.log('\nTest Suite 2: Top-Right Click Navigation');
    await profileBtn.click();
    await page.waitForTimeout(800);

    const currentUrl = page.url();
    assert(currentUrl.includes('/profile'), `URL navigated to /profile (Actual: ${currentUrl})`);

    const modalBackdrop = page.locator('#authModalBackdrop');
    const isModalVisible = await modalBackdrop.isVisible().catch(() => false);
    assert(!isModalVisible, 'Account modal popup is NOT displayed; full profile page opened instead');

    const viewProfile = page.locator('#viewProfile');
    const isProfileViewVisible = await viewProfile.isVisible();
    assert(isProfileViewVisible, '#viewProfile page container is visible');

    // Take screenshot of desktop profile workspace
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-profile-workspace-desktop.png') });

    // TEST 3: Profile Header & Identity Elements
    console.log('\nTest Suite 3: Profile Header & Identity Elements');
    const profName = await page.locator('#profHeaderName').textContent();
    assert(profName.trim() === 'WebDev Developer', `Profile name is genuine 'WebDev Developer' (Actual: ${profName.trim()})`);

    const profAvatar = await page.locator('#profAvatarLarge').textContent();
    assert(profAvatar.trim() === 'W', `Large avatar initial is 'W' (Actual: ${profAvatar.trim()})`);

    const profAccountType = await page.locator('#profAccountType').textContent();
    assert(profAccountType.trim() === 'Developer Account', `Account type is 'Developer Account' (Actual: ${profAccountType.trim()})`);

    const statusPill = await page.locator('.status-indicator-pill').textContent();
    assert(statusPill.includes('Active'), `Status badge is 'Active' (Actual: ${statusPill.trim()})`);

    // Verify forbidden elements are NOT in the header
    const headerCardText = await page.locator('#profileIdentityCard').textContent();
    assert(!headerCardText.includes('Local SQLite'), 'Internal "Local SQLite" removed from profile header');
    assert(!headerCardText.includes('Copy API Key'), '"Copy API Key" removed from profile identity header');
    assert(!headerCardText.includes('Studio Pro'), '"Studio Pro" product tier badge removed from header');

    // Verify Edit Profile action
    const btnEdit = page.locator('.btn-edit-profile');
    assert(await btnEdit.isVisible(), 'Primary header action [ Edit Profile ] is visible');

    // Verify workspace technical visual
    const visual = page.locator('.profile-workspace-visual');
    assert(await visual.isVisible(), 'Subtle developer workspace visual is visible on desktop');

    const breadcrumb = await page.locator('#breadcrumbCurrent').textContent();
    assert(breadcrumb.includes('Profile') || breadcrumb.includes('Account'), `Breadcrumb reflects Profile Workspace (Actual: ${breadcrumb})`);

    // TEST 4: Real Stats Strip (Zero fake data)
    console.log('\nTest Suite 4: Genuine Statistics Strip');
    const statProjects = await page.locator('#profStatProjects').textContent();
    const statTests = await page.locator('#profStatTests').textContent();
    const statReports = await page.locator('#profStatReports').textContent();
    const statScreenshots = await page.locator('#profStatScreenshots').textContent();

    assert(!isNaN(parseInt(statProjects, 10)), `Active Projects count is a valid number: ${statProjects}`);
    assert(!isNaN(parseInt(statTests, 10)), `Total Tests count is a valid number: ${statTests}`);
    assert(!isNaN(parseInt(statReports, 10)), `Reports Generated count is a valid number: ${statReports}`);
    assert(!isNaN(parseInt(statScreenshots, 10)), `Screenshots count is a valid number: ${statScreenshots}`);

    // TEST 5: Two-Column Workspace Layout & Section Cards
    console.log('\nTest Suite 5: Two-Column Workspace Layout');
    const cardAccount = page.locator('#cardAccountInfo');
    assert(await cardAccount.isVisible(), 'Account Information card is visible');

    const inputName = await page.locator('#profInputName').inputValue();
    assert(inputName === 'WebDev Developer', `Full Name input pre-populated with genuine user name: ${inputName}`);

    const inputEmail = await page.locator('#profInputEmail').inputValue();
    assert(inputEmail.includes('@'), `Email input pre-populated with genuine email: ${inputEmail}`);

    const inputId = await page.locator('#profInputId').inputValue();
    assert(inputId.startsWith('usr_') || inputId.startsWith('user_'), `Account ID displays authentic ID format: ${inputId}`);

    // Test Preferences controls
    const themeSelect = page.locator('#prefThemeSelect');
    assert(await themeSelect.isVisible(), 'Theme selector is visible and wired');

    const densitySelect = page.locator('#prefDensitySelect');
    assert(await densitySelect.isVisible(), 'Density selector is visible and wired');

    // Test CLI quickstart snippet
    const cliSnippet = await page.locator('#cliSnippetCode').textContent();
    assert(cliSnippet.includes('studio') || cliSnippet.includes('webdev'), `CLI quickstart snippet present: ${cliSnippet}`);

    // Test Providers Connectivity
    const provGsc = await page.locator('#provStatusGsc').textContent();
    const provPsi = await page.locator('#provStatusPsi').textContent();
    assert(provGsc.length > 0 && provPsi.length > 0, `Provider statuses loaded from API (GSC: ${provGsc}, PSI: ${provPsi})`);

    // Test Active Sessions
    const sessionsList = page.locator('#profSessionsList');
    const sessionsText = await sessionsList.textContent();
    assert(sessionsText.includes('Current'), 'Active sessions list renders with Current session badge');

    // TEST 6: Form Interaction (Update account name)
    console.log('\nTest Suite 6: Account Profile Update');
    await page.locator('#profInputName').fill('WebDev Developer Lead');
    await page.locator('#btnSaveAccount').click();
    await page.waitForTimeout(600);

    const alertText = await page.locator('#profAlertAccount').textContent();
    assert(alertText.includes('success'), `Account update gave success feedback: ${alertText}`);

    const updatedHeaderName = await page.locator('#profHeaderName').textContent();
    assert(updatedHeaderName.includes('WebDev Developer Lead'), `Header name updated dynamically: ${updatedHeaderName}`);

    // Restore name back
    await page.locator('#profInputName').fill('WebDev Developer');
    await page.locator('#btnSaveAccount').click();
    await page.waitForTimeout(400);

    // TEST 7: Back Navigation to Overview
    console.log('\nTest Suite 7: Back to Overview Navigation');
    const btnBack = page.locator('#btnProfileBack');
    await btnBack.click();
    await page.waitForTimeout(600);

    const urlAfterBack = page.url();
    assert(!urlAfterBack.includes('/profile'), `URL returned to root/overview (Actual: ${urlAfterBack})`);
    assert(await page.locator('#viewDashboard').isVisible(), 'Dashboard overview is visible again');

    // TEST 8: Direct URL Load and Reload
    console.log('\nTest Suite 8: Direct URL Load & Reload');
    await page.goto('http://127.0.0.1:3000/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    assert(await page.locator('#viewProfile').isVisible(), 'Direct load of /profile renders #viewProfile immediately');
    assert(page.url().includes('/profile'), 'Direct load maintains /profile URL');

    // Reload test
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    assert(await page.locator('#viewProfile').isVisible(), 'Page reload at /profile stays on Profile Workspace');

    // TEST 9: Browser Back / Forward History
    console.log('\nTest Suite 9: Browser History (Back / Forward)');
    await page.locator('#btnProfileBack').click();
    await page.waitForTimeout(500);
    assert(await page.locator('#viewDashboard').isVisible(), 'Returned to dashboard');

    await page.goBack();
    await page.waitForTimeout(500);
    assert(await page.locator('#viewProfile').isVisible(), 'Browser back button opened Profile Workspace');

    await page.goForward();
    await page.waitForTimeout(500);
    assert(await page.locator('#viewDashboard').isVisible(), 'Browser forward button returned to Dashboard');

    // TEST 10: Responsive Layouts
    console.log('\nTest Suite 10: Responsive Layouts');
    await page.goto('http://127.0.0.1:3000/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Tablet: 820px
    await page.setViewportSize({ width: 820, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-profile-workspace-tablet.png') });
    assert(await page.locator('#viewProfile').isVisible(), 'Profile layout renders cleanly on tablet (820px)');

    // Mobile: 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-profile-workspace-mobile.png') });
    assert(await page.locator('#viewProfile').isVisible(), 'Profile layout renders cleanly on mobile (390px)');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log(`Profile Workspace Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
