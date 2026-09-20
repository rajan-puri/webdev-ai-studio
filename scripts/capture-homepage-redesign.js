const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { db } = require('../server/data/database');

const OUTPUT_DIR = path.join(__dirname, '../test-verification-evidence/homepage-redesign');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let activeSession = db.prepare(`
  SELECT s.id, s.user_id 
  FROM sessions s 
  JOIN users u ON s.user_id = u.id 
  WHERE u.email = 'demo@webdev.ai' OR u.id = 'user_demo' 
  LIMIT 1
`).get() || db.prepare('SELECT id, user_id FROM sessions ORDER BY created_at DESC LIMIT 1').get();

if (!activeSession) {
  console.error('No session found!');
  process.exit(1);
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844, isMobile: true }
];

async function capture() {
  const browser = await chromium.launch({ headless: true });

  for (const theme of ['light', 'dark']) {
    for (const vp of VIEWPORTS) {
      console.log(`Capturing Homepage: ${vp.name}px | Theme: ${theme}...`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile || false
      });

      await ctx.addCookies([{
        name: 'studio_session',
        value: activeSession.id,
        domain: '127.0.0.1',
        path: '/'
      }]);

      const page = await ctx.newPage();
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 15000 });

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('webdev_ai_theme', JSON.stringify({ theme: t, accentColor: '#2563eb' }));
      }, theme);
      await page.waitForTimeout(600);

      // 1. Viewport Top
      const topFile = path.join(OUTPUT_DIR, `homepage_top_${vp.name}_${theme}.png`);
      await page.screenshot({ path: topFile });
      console.log(`  Saved: ${path.basename(topFile)}`);

      // 2. Scrolled Middle (Workflows + Active Project)
      await page.evaluate(() => {
        const mb = document.querySelector('.main-body');
        if (mb) mb.scrollTop = 500;
      });
      await page.waitForTimeout(400);
      const midFile = path.join(OUTPUT_DIR, `homepage_mid_${vp.name}_${theme}.png`);
      await page.screenshot({ path: midFile });
      console.log(`  Saved: ${path.basename(midFile)}`);

      // 3. Scrolled Bottom (Toolkit + Activity + How it works)
      await page.evaluate(() => {
        const mb = document.querySelector('.main-body');
        if (mb) mb.scrollTop = 1200;
      });
      await page.waitForTimeout(400);
      const botFile = path.join(OUTPUT_DIR, `homepage_bot_${vp.name}_${theme}.png`);
      await page.screenshot({ path: botFile });
      console.log(`  Saved: ${path.basename(botFile)}`);

      await ctx.close();
    }
  }

  await browser.close();
  console.log('Finished capturing homepage redesign screenshots!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
