/**
 * server/services/qa/css.js
 * Analyzes external stylesheets, inline styles, HTTP status, sizes, and mixed content.
 */

const { URL } = require('url');

async function checkCssResource(cssUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const start = Date.now();
  try {
    const res = await fetch(cssUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; CssChecker)',
        'Accept': 'text/css,*/*;q=0.1'
      },
      signal: controller.signal
    });

    const elapsed = Date.now() - start;
    clearTimeout(timeoutId);

    const contentLength = res.headers.get('content-length') ? parseInt(res.headers.get('content-length'), 10) : null;
    const contentType = res.headers.get('content-type') || null;

    return {
      status: res.status,
      responseTime: elapsed,
      fileSizeBytes: contentLength,
      contentType,
      error: res.status >= 400 ? `HTTP ${res.status}` : null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: null,
      responseTime: Date.now() - start,
      fileSizeBytes: null,
      contentType: null,
      error: err.message || 'Fetch failed'
    };
  }
}

async function analyzeCss(html, baseUrl) {
  const base = new URL(baseUrl);
  const isBaseHttps = base.protocol === 'https:';

  // 1. External Stylesheets (<link rel="stylesheet">)
  const rawStylesheets = [];
  const linkRegex = /<link\b([^>]*)>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const relMatch = attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    const mediaMatch = attrs.match(/\bmedia\s*=\s*(["'])(.*?)\1/i);

    if (relMatch && /stylesheet/i.test(relMatch[2]) && hrefMatch) {
      const originalHref = hrefMatch[2].trim();
      let absoluteUrl = null;
      let isMixedContent = false;

      try {
        const resolved = new URL(originalHref, baseUrl);
        absoluteUrl = resolved.toString();
        if (isBaseHttps && resolved.protocol === 'http:') {
          isMixedContent = true;
        }
      } catch (e) {
        absoluteUrl = originalHref;
      }

      rawStylesheets.push({
        href: originalHref,
        absoluteUrl,
        media: mediaMatch ? mediaMatch[2].trim() : 'all',
        isMixedContent,
        status: null,
        responseTime: null,
        fileSizeBytes: null,
        error: null
      });
    }
  }

  // 2. Inline <style> blocks
  const inlineStyles = [];
  const styleRegex = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const content = styleMatch[2];
    inlineStyles.push({
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      media: (styleMatch[1].match(/\bmedia\s*=\s*(["'])(.*?)\1/i) || [])[2] || 'all'
    });
  }

  // Check unique external stylesheets
  const uniqueUrls = Array.from(new Set(
    rawStylesheets
      .map(s => s.absoluteUrl)
      .filter(url => url && /^https?:\/\//i.test(url))
  ));

  const statusMap = new Map();
  const results = await Promise.all(uniqueUrls.map(url => checkCssResource(url)));
  uniqueUrls.forEach((url, idx) => {
    statusMap.set(url, results[idx]);
  });

  rawStylesheets.forEach(s => {
    if (s.absoluteUrl && statusMap.has(s.absoluteUrl)) {
      const res = statusMap.get(s.absoluteUrl);
      s.status = res.status;
      s.responseTime = res.responseTime;
      s.fileSizeBytes = res.fileSizeBytes;
      s.error = res.error;
    }
  });

  // Duplicate stylesheets
  const hrefCounts = {};
  rawStylesheets.forEach(s => {
    if (s.absoluteUrl) hrefCounts[s.absoluteUrl] = (hrefCounts[s.absoluteUrl] || 0) + 1;
  });
  const duplicateCss = Object.keys(hrefCounts).filter(url => hrefCounts[url] > 1);

  const failedCss = rawStylesheets.filter(s => (s.status && s.status >= 400) || s.error);
  const mixedContentCss = rawStylesheets.filter(s => s.isMixedContent);
  const largeCss = rawStylesheets.filter(s => s.fileSizeBytes && s.fileSizeBytes > 150 * 1024);

  const checks = [];

  // Check 1: Failed / 404 Stylesheets
  if (failedCss.length === 0) {
    checks.push({
      id: 'css-failures',
      name: 'Stylesheet Availability',
      severity: 'PASS',
      detectedValue: `${rawStylesheets.length} stylesheets verified`,
      whyItMatters: 'Failed CSS files result in unstyled page elements (FOUC) and missing layout rules.',
      message: 'All external stylesheets responded with successful status codes.',
      fix: null
    });
  } else {
    checks.push({
      id: 'css-failures',
      name: 'Missing / Failed Stylesheets',
      severity: 'ERROR',
      detectedValue: `${failedCss.length} failed stylesheet(s)`,
      whyItMatters: 'Missing CSS causes Flash of Unstyled Content (FOUC) or broken layout styles.',
      message: `Found ${failedCss.length} stylesheet(s) returning 4xx/5xx or network errors: ${failedCss.map(f => f.href).join(', ')}.`,
      fix: 'Fix stylesheet paths or verify hosting permissions for missing CSS files.'
    });
  }

  // Check 2: Mixed Content CSS
  if (mixedContentCss.length === 0) {
    checks.push({
      id: 'css-mixed-content',
      name: 'HTTPS Stylesheet Security',
      severity: 'PASS',
      detectedValue: '0 mixed content CSS resources',
      whyItMatters: 'Browsers block insecure HTTP stylesheets on HTTPS pages, breaking site rendering.',
      message: 'No unencrypted HTTP stylesheets found on HTTPS page.',
      fix: null
    });
  } else {
    checks.push({
      id: 'css-mixed-content',
      name: 'Insecure Mixed Content Stylesheets',
      severity: 'ERROR',
      detectedValue: `${mixedContentCss.length} insecure HTTP stylesheet(s)`,
      whyItMatters: 'Modern browsers block insecure HTTP stylesheets on HTTPS websites to prevent code injection.',
      message: `Found ${mixedContentCss.length} insecure HTTP stylesheet(s) on an HTTPS page: ${mixedContentCss.map(m => m.href).join(', ')}.`,
      fix: 'Change stylesheet URLs to use https://.'
    });
  }

  // Check 3: Duplicate Stylesheets
  if (duplicateCss.length === 0) {
    checks.push({
      id: 'css-duplicates',
      name: 'Stylesheet URL Duplication',
      severity: 'PASS',
      detectedValue: '0 duplicate stylesheets',
      whyItMatters: 'Loading the same stylesheet multiple times wastes bandwidth and increases parse times.',
      message: 'No duplicate stylesheet links found.',
      fix: null
    });
  } else {
    checks.push({
      id: 'css-duplicates',
      name: 'Duplicate Stylesheets',
      severity: 'WARNING',
      detectedValue: `${duplicateCss.length} duplicate URL(s)`,
      whyItMatters: 'Redundant stylesheet downloads needlessly increase page load time.',
      message: `Detected duplicate stylesheet inclusions: ${duplicateCss.join(', ')}.`,
      fix: 'Remove duplicate <link rel="stylesheet"> declarations from document templates.'
    });
  }

  // Check 4: Unusually Large Stylesheets
  if (largeCss.length > 0) {
    checks.push({
      id: 'css-large',
      name: 'Large Stylesheet Payloads (>150KB)',
      severity: 'WARNING',
      detectedValue: `${largeCss.length} large stylesheet(s)`,
      whyItMatters: 'CSS is render-blocking. Heavy stylesheets delay first paint.',
      message: `Found ${largeCss.length} stylesheet(s) exceeding 150KB.`,
      fix: 'Purge unused CSS rules using PurgeCSS or split stylesheets into modular critical CSS chunks.'
    });
  }

  return {
    summary: {
      externalCount: rawStylesheets.length,
      inlineBlocksCount: inlineStyles.length,
      totalInlineBytes: inlineStyles.reduce((acc, s) => acc + s.sizeBytes, 0),
      failedCount: failedCss.length,
      mixedContentCount: mixedContentCss.length,
      duplicateCount: duplicateCss.length
    },
    inventory: rawStylesheets,
    inlineBlocks: inlineStyles,
    checks
  };
}

module.exports = {
  analyzeCss
};
