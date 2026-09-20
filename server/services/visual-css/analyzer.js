/**
 * server/services/visual-css/analyzer.js
 * Visual CSS Engineer - Site & Project Analyzer.
 * Extracts real DOM semantic hierarchy, computed styles, CSS variables/tokens,
 * and detects frame embedding restrictions via Playwright and local file analysis.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const urlModule = require('url');

/**
 * Validates target URL against SSRF and prohibited networks
 */
function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Target URL must be a non-empty string.');
  }

  const trimmed = rawUrl.trim();
  const parsed = urlModule.parse(trimmed);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsafe protocol. Only http:// and https:// URLs are allowed.');
  }

  const hostname = (parsed.hostname || '').toLowerCase();
  if (!hostname) {
    throw new Error('Invalid URL hostname.');
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    throw new Error('Access to cloud metadata endpoints is prohibited.');
  }

  // Block dangerous local protocols
  const dangerousProtocols = ['file:', 'javascript:', 'data:', 'chrome:', 'about:'];
  if (dangerousProtocols.includes(parsed.protocol.toLowerCase())) {
    throw new Error(`Protocol ${parsed.protocol} is disallowed.`);
  }

  return trimmed;
}

/**
 * Launches an isolated browser instance or reuses one
 */
let sharedBrowser = null;
async function getBrowser() {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--mute-audio'
      ]
    });
  }
  return sharedBrowser;
}

/**
 * Analyzes a live website using Playwright
 */
async function analyzeLiveWebsite(targetUrl, viewport = { width: 1440, height: 900 }) {
  const safeUrl = validateSafeUrl(targetUrl);
  const browser = await getBrowser();

  const width = Math.min(3840, Math.max(320, parseInt(viewport.width, 10) || 1440));
  const height = Math.min(3840, Math.max(320, parseInt(viewport.height, 10) || 900));

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: width < 768,
    hasTouch: width < 768,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 WebDevAiStudio/2.0'
  });

  const page = await context.newPage();

  let iframeBlocked = false;
  let iframeBlockReason = null;
  let responseHeaders = {};
  let statusCode = 200;

  page.on('response', response => {
    const rUrl = response.url().replace(/\/$/, '');
    const sUrl = safeUrl.replace(/\/$/, '');
    if (rUrl === sUrl || response.request().isNavigationRequest()) {
      statusCode = response.status();
      const headers = response.headers();
      responseHeaders = headers;

      const xfo = (headers['x-frame-options'] || '').toLowerCase();
      const csp = (headers['content-security-policy'] || '').toLowerCase();

      if (xfo === 'deny' || xfo === 'sameorigin') {
        iframeBlocked = true;
        iframeBlockReason = `X-Frame-Options set to '${xfo}'`;
      } else if (csp.includes('frame-ancestors') && !csp.includes('frame-ancestors *')) {
        iframeBlocked = true;
        iframeBlockReason = 'Content-Security-Policy restricts frame-ancestors';
      }
    }
  });

  try {
    await page.goto(safeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 18000
    });

    // Wait briefly for layout reflow and webfonts
    await page.waitForTimeout(700);

    const title = await page.title();

    // Extract semantic DOM element tree, design tokens, and computed styles
    const pageAnalysis = await page.evaluate(({ expectedWidth }) => {
      // 1. Extract CSS variables / design tokens from :root and document stylesheets
      const tokens = {
        colors: [],
        spacing: [],
        typography: [],
        radius: [],
        shadows: [],
        rawVariables: {}
      };

      try {
        const styleSheets = Array.from(document.styleSheets);
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === 'body') {
                const style = rule.style;
                for (let i = 0; i < style.length; i++) {
                  const prop = style[i];
                  if (prop.startsWith('--')) {
                    const val = style.getPropertyValue(prop).trim();
                    tokens.rawVariables[prop] = val;
                    if (prop.includes('color') || prop.includes('bg') || prop.includes('text') || val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl')) {
                      tokens.colors.push({ name: prop, value: val });
                    } else if (prop.includes('space') || prop.includes('gap') || prop.includes('margin') || prop.includes('padding')) {
                      tokens.spacing.push({ name: prop, value: val });
                    } else if (prop.includes('font') || prop.includes('type') || prop.includes('size')) {
                      tokens.typography.push({ name: prop, value: val });
                    } else if (prop.includes('radius') || prop.includes('round')) {
                      tokens.radius.push({ name: prop, value: val });
                    } else if (prop.includes('shadow')) {
                      tokens.shadows.push({ name: prop, value: val });
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheet security restriction
          }
        }
      } catch (err) {}

      // 2. Extract semantic DOM hierarchy
      function buildSelector(el) {
        if (!el || el.nodeType !== 1) return '';
        if (el.id) return '#' + el.id;
        
        let path = [];
        let current = el;
        while (current && current.nodeType === 1 && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector = '#' + current.id;
            path.unshift(selector);
            break;
          } else if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && !c.includes('['));
            if (classes.length > 0) {
              selector += '.' + classes.slice(0, 2).join('.');
            }
          }
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(' > ');
      }

      function getCleanStyles(el) {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          position: computed.position,
          width: computed.width,
          height: computed.height,
          maxWidth: computed.maxWidth,
          minWidth: computed.minWidth,
          margin: computed.marginTop + ' ' + computed.marginRight + ' ' + computed.marginBottom + ' ' + computed.marginLeft,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          padding: computed.paddingTop + ' ' + computed.paddingRight + ' ' + computed.paddingBottom + ' ' + computed.paddingLeft,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          textTransform: computed.textTransform,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          border: computed.borderTopWidth + ' ' + computed.borderTopStyle + ' ' + computed.borderTopColor,
          borderRadius: computed.borderRadius,
          borderTopWidth: computed.borderTopWidth,
          borderTopColor: computed.borderTopColor,
          boxShadow: computed.boxShadow,
          opacity: computed.opacity,
          transform: computed.transform,
          transition: computed.transition,
          flexDirection: computed.flexDirection,
          alignItems: computed.alignItems,
          justifyContent: computed.justifyContent,
          gap: computed.gap
        };
      }

      const semanticElements = [];
      const query = 'header, nav, main, section, article, aside, footer, h1, h2, h3, h4, h5, h6, p, button, a.btn, a[class*="button"], a[class*="cta"], [class*="hero"], [class*="card"], [class*="header"], [class*="footer"], [class*="nav"], [class*="banner"]';
      
      const elements = Array.from(document.querySelectorAll(query)).slice(0, 40);
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const tag = el.tagName.toLowerCase();
          const selector = buildSelector(el);
          const textSnippet = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 50);
          
          let role = 'Element';
          if (tag.startsWith('h')) role = 'Heading';
          else if (tag === 'button' || el.classList.contains('btn') || el.classList.contains('button')) role = 'Button / CTA';
          else if (tag === 'header' || selector.includes('header')) role = 'Header';
          else if (tag === 'footer' || selector.includes('footer')) role = 'Footer';
          else if (tag === 'nav' || selector.includes('nav')) role = 'Navigation';
          else if (selector.includes('hero')) role = 'Hero Section';
          else if (selector.includes('card')) role = 'Card';
          else if (tag === 'p') role = 'Paragraph';

          semanticElements.push({
            tag,
            selector,
            className: typeof el.className === 'string' ? el.className.trim() : '',
            id: el.id || '',
            role,
            label: textSnippet ? (role + ': "' + textSnippet + '"') : (role + ' <' + tag + '>'),
            text: textSnippet,
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            styles: getCleanStyles(el)
          });
        }
      });

      const doc = document.documentElement || document.body;
      const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
      const clientWidth = doc.clientWidth || window.innerWidth;
      const scrollHeight = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      const clientHeight = doc.clientHeight || window.innerHeight;

      return {
        semanticElements,
        tokens,
        measurements: {
          scrollWidth,
          clientWidth,
          scrollHeight,
          clientHeight,
          hasHorizontalOverflow: scrollWidth > expectedWidth,
          overflowAmount: Math.max(0, scrollWidth - expectedWidth)
        }
      };
    }, { expectedWidth: width });

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });
    const screenshot = 'data:image/png;base64,' + screenshotBuffer.toString('base64');

    return {
      success: true,
      url: safeUrl,
      title,
      statusCode,
      iframeAllowed: !iframeBlocked,
      iframeBlockReason,
      viewport: { width, height },
      elements: pageAnalysis.semanticElements,
      tokens: pageAnalysis.tokens,
      measurements: pageAnalysis.measurements,
      screenshot,
      timestamp: new Date().toISOString()
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

/**
 * Inspects a specific element by selector on the live website
 */
async function inspectLiveElement(targetUrl, selector, viewport = { width: 1440, height: 900 }) {
  const safeUrl = validateSafeUrl(targetUrl);
  const browser = await getBrowser();

  const width = Math.min(3840, Math.max(320, parseInt(viewport.width, 10) || 1440));
  const height = Math.min(3840, Math.max(320, parseInt(viewport.height, 10) || 900));

  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  try {
    await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(400);

    const result = await page.evaluate(({ sel }) => {
      let el = null;
      try {
        el = document.querySelector(sel);
      } catch (e) {}
      if (!el) {
        return { found: false, error: 'Element matching selector "' + sel + '" was not found in page DOM.' };
      }

      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      const declaredRules = [];
      try {
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
          try {
            const href = sheet.href || 'inline';
            const rules = Array.from(sheet.cssRules || []);
            for (const r of rules) {
              if (r.selectorText && el.matches(r.selectorText)) {
                declaredRules.push({
                  selectorText: r.selectorText,
                  cssText: r.cssText,
                  source: href.startsWith('http') ? href.split('/').pop() : href
                });
              }
            }
          } catch (e) {}
        }
      } catch (e) {}

      let a11y = {
        touchTargetSufficient: rect.width >= 44 && rect.height >= 44,
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
        fontSizePx: parseFloat(computed.fontSize) || 16,
        isSmallText: (parseFloat(computed.fontSize) || 16) < 12
      };

      return {
        found: true,
        tag: el.tagName.toLowerCase(),
        selector: sel,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        styles: {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          textTransform: computed.textTransform,
          display: computed.display,
          position: computed.position,
          width: computed.width,
          height: computed.height,
          maxWidth: computed.maxWidth,
          minWidth: computed.minWidth,
          flexDirection: computed.flexDirection,
          alignItems: computed.alignItems,
          justifyContent: computed.justifyContent,
          gap: computed.gap,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          opacity: computed.opacity,
          borderTopWidth: computed.borderTopWidth,
          borderTopStyle: computed.borderTopStyle,
          borderTopColor: computed.borderTopColor,
          borderRadius: computed.borderRadius,
          outline: computed.outline,
          boxShadow: computed.boxShadow,
          transform: computed.transform,
          transition: computed.transition,
          filter: computed.filter,
          backdropFilter: computed.backdropFilter
        },
        declaredRules,
        a11y
      };
    }, { sel: selector });

    return {
      success: true,
      url: safeUrl,
      selector,
      ...result
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

/**
 * Inspects an existing project workspace from disk
 */
function analyzeExistingProject(projectPath) {
  const resolvedPath = path.resolve(projectPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('Project directory not found at: ' + projectPath);
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error('Path is not a directory: ' + projectPath);
  }

  let framework = 'HTML / CSS / JS';
  let styling = 'Vanilla CSS';
  let filesCount = 0;
  let stylesheets = [];
  let components = [];
  let tokens = {
    colors: [],
    spacing: [],
    radius: [],
    rawVariables: {}
  };

  const pkgPath = path.join(resolvedPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['next']) framework = 'Next.js';
      else if (deps['react']) framework = 'React';
      else if (deps['vue']) framework = 'Vue';
      else if (deps['svelte']) framework = 'Svelte';

      if (deps['tailwindcss']) styling = 'Tailwind CSS';
      else if (deps['sass'] || deps['node-sass']) styling = 'SCSS / Sass';
      else if (deps['styled-components']) styling = 'Styled Components';
    } catch (e) {}
  }

  function scan(dir, depth = 0) {
    if (depth > 5) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build') continue;
      const full = path.join(dir, ent.name);
      const rel = path.relative(resolvedPath, full);

      if (ent.isDirectory()) {
        scan(full, depth + 1);
      } else if (ent.isFile()) {
        filesCount++;
        const ext = path.extname(ent.name).toLowerCase();
        if (['.css', '.scss', '.sass'].includes(ext)) {
          stylesheets.push(rel);
          try {
            if (fs.statSync(full).size < 100000) {
              const content = fs.readFileSync(full, 'utf8');
              const varMatches = content.match(/--[a-zA-Z0-9_-]+s*:s*[^;]+;/g) || [];
              for (const m of varMatches) {
                const parts = m.split(':');
                if (parts.length >= 2) {
                  const name = parts[0].trim();
                  const val = parts.slice(1).join(':').replace(/;$/, '').trim();
                  tokens.rawVariables[name] = val;
                  if (name.includes('color') || val.startsWith('#') || val.startsWith('rgb')) {
                    tokens.colors.push({ name, value: val });
                  } else if (name.includes('radius')) {
                    tokens.radius.push({ name, value: val });
                  } else if (name.includes('space') || name.includes('gap')) {
                    tokens.spacing.push({ name, value: val });
                  }
                }
              }
            }
          } catch (e) {}
        } else if (['.jsx', '.tsx', '.vue', '.svelte'].includes(ext) || (ext === '.js' && rel.includes('component'))) {
          components.push(rel);
        }
      }
    }
  }

  scan(resolvedPath);

  return {
    success: true,
    projectPath: resolvedPath,
    framework,
    styling,
    filesCount,
    stylesheetsCount: stylesheets.length,
    stylesheets: stylesheets.slice(0, 30),
    componentsCount: components.length,
    components: components.slice(0, 30),
    tokensCount: Object.keys(tokens.rawVariables).length,
    tokens
  };
}

module.exports = {
  validateSafeUrl,
  analyzeLiveWebsite,
  inspectLiveElement,
  analyzeExistingProject
};
