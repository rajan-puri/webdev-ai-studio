const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { db } = require('../server/data/database');

const OUTPUT_DIR = path.join(__dirname, '../test-verification-evidence/workspace-captures');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Ensure active session
let activeSession = db.prepare(`
  SELECT s.id, s.user_id 
  FROM sessions s 
  JOIN users u ON s.user_id = u.id 
  WHERE u.email = 'demo@webdev.ai' OR u.id = 'user_demo' 
  LIMIT 1
`).get() || db.prepare('SELECT id, user_id FROM sessions ORDER BY created_at DESC LIMIT 1').get();

if (!activeSession) {
  console.error('No session found in database!');
  process.exit(1);
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844, isMobile: true }
];

const THEMES = ['light', 'dark'];

async function runCaptures() {
  const browser = await chromium.launch({ headless: true });
  console.log(`Starting captures with session ${activeSession.id}...`);

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      console.log(`\n=== Capturing Viewport: ${vp.name}px | Theme: ${theme} ===`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile || false
      });

      await context.addCookies([{
        name: 'studio_session',
        value: activeSession.id,
        domain: '127.0.0.1',
        path: '/'
      }]);

      const page = await context.newPage();

      // Navigate to app
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Set theme attribute explicitly
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('webdev_ai_theme', JSON.stringify({ theme: t, accentColor: '#2563eb' }));
      }, theme);
      await page.waitForTimeout(500);

      // 1. Dashboard View
      const dashFile = path.join(OUTPUT_DIR, `dashboard_${vp.name}_${theme}.png`);
      await page.screenshot({ path: dashFile, fullPage: false });
      console.log(`Saved: ${path.basename(dashFile)}`);

      if (vp.name === '1440') {
        const dashFullFile = path.join(OUTPUT_DIR, `dashboard_full_${vp.name}_${theme}.png`);
        await page.screenshot({ path: dashFullFile, fullPage: true });
        console.log(`Saved: ${path.basename(dashFullFile)}`);
      }

      // For 1440 and 1024, capture the other major workspace views
      if (vp.name === '1440' || vp.name === '1024') {
        // 2. Browser Lab
        try {
          await page.click('#navBrowserLab');
          await page.waitForTimeout(1200);
          const browserLabFile = path.join(OUTPUT_DIR, `browser_lab_${vp.name}_${theme}.png`);
          await page.screenshot({ path: browserLabFile });
          console.log(`Saved: ${path.basename(browserLabFile)}`);
        } catch (e) {
          console.warn('Failed to capture Browser Lab:', e.message);
        }

        // 3. Design -> Code Studio
        try {
          await page.click('#navDesignToCode');
          await page.waitForTimeout(1200);
          const designFile = path.join(OUTPUT_DIR, `design_code_${vp.name}_${theme}.png`);
          await page.screenshot({ path: designFile });
          console.log(`Saved: ${path.basename(designFile)}`);
        } catch (e) {
          console.warn('Failed to capture Design -> Code:', e.message);
        }

        // 4. Automated QA
        try {
          await page.click('#navAutomatedQa');
          await page.waitForTimeout(1200);
          const qaFile = path.join(OUTPUT_DIR, `automated_qa_${vp.name}_${theme}.png`);
          await page.screenshot({ path: qaFile });
          console.log(`Saved: ${path.basename(qaFile)}`);
        } catch (e) {
          console.warn('Failed to capture Automated QA:', e.message);
        }

        // 5. SEO Intelligence
        try {
          await page.click('#navSeoAudit');
          await page.waitForTimeout(1200);
          const seoFile = path.join(OUTPUT_DIR, `seo_intelligence_${vp.name}_${theme}.png`);
          await page.screenshot({ path: seoFile });
          console.log(`Saved: ${path.basename(seoFile)}`);
        } catch (e) {
          console.warn('Failed to capture SEO Intelligence:', e.message);
        }
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('\nAll captures successfully finished!');
}

runCaptures().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
