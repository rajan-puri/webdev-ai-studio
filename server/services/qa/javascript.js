/**
 * server/services/qa/javascript.js
 * Analyzes external and inline scripts, loading attributes, mixed content, and script health.
 * Strictly parses metadata without executing code.
 */

const { URL } = require('url');

async function checkJsResource(jsUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const start = Date.now();
  try {
    const res = await fetch(jsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; ScriptChecker)',
        'Accept': '*/*'
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

async function analyzeJavaScript(html, baseUrl) {
  const base = new URL(baseUrl);
  const isBaseHttps = base.protocol === 'https:';

  const rawScripts = [];
  const inlineScripts = [];

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1];
    const content = match[2];

    const srcMatch = attrs.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const typeMatch = attrs.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    const scriptType = typeMatch ? typeMatch[2].trim().toLowerCase() : 'text/javascript';

    // Ignore json-ld or template scripts
    if (scriptType.includes('ld+json') || scriptType.includes('template')) {
      continue;
    }

    const isAsync = /\basync\b/i.test(attrs);
    const isDefer = /\bdefer\b/i.test(attrs);
    const isModule = scriptType === 'module' || /\bmodule\b/i.test(attrs);

    if (srcMatch) {
      const originalSrc = srcMatch[2].trim();
      let absoluteUrl = null;
      let isMixedContent = false;

      try {
        const resolved = new URL(originalSrc, baseUrl);
        absoluteUrl = resolved.toString();
        if (isBaseHttps && resolved.protocol === 'http:') {
          isMixedContent = true;
        }
      } catch (e) {
        absoluteUrl = originalSrc;
      }

      rawScripts.push({
        src: originalSrc,
        absoluteUrl,
        type: scriptType,
        isAsync,
        isDefer,
        isModule,
        isMixedContent,
        status: null,
        responseTime: null,
        fileSizeBytes: null,
        error: null
      });
    } else {
      inlineScripts.push({
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        type: scriptType
      });
    }
  }

  // Check unique external scripts (up to 40)
  const uniqueUrls = Array.from(new Set(
    rawScripts
      .map(s => s.absoluteUrl)
      .filter(url => url && /^https?:\/\//i.test(url))
  )).slice(0, 40);

  const statusMap = new Map();
  const BATCH_SIZE = 8;
  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(url => checkJsResource(url)));
    batch.forEach((url, idx) => {
      statusMap.set(url, results[idx]);
    });
  }

  rawScripts.forEach(s => {
    if (s.absoluteUrl && statusMap.has(s.absoluteUrl)) {
      const res = statusMap.get(s.absoluteUrl);
      s.status = res.status;
      s.responseTime = res.responseTime;
      s.fileSizeBytes = res.fileSizeBytes;
      s.error = res.error;
    }
  });

  // Duplicate check
  const srcCounts = {};
  rawScripts.forEach(s => {
    if (s.absoluteUrl) srcCounts[s.absoluteUrl] = (srcCounts[s.absoluteUrl] || 0) + 1;
  });
  const duplicateScripts = Object.keys(srcCounts).filter(url => srcCounts[url] > 1);

  const failedScripts = rawScripts.filter(s => (s.status && s.status >= 400) || s.error);
  const mixedContentScripts = rawScripts.filter(s => s.isMixedContent);
  const renderBlockingScripts = rawScripts.filter(s => !s.isAsync && !s.isDefer && !s.isModule);
  const largeScripts = rawScripts.filter(s => s.fileSizeBytes && s.fileSizeBytes > 300 * 1024);

  const checks = [];

  // Check 1: Failed JS
  if (failedScripts.length === 0) {
    checks.push({
      id: 'js-failures',
      name: 'JavaScript Availability',
      severity: 'PASS',
      detectedValue: `${rawScripts.length} scripts verified`,
      whyItMatters: 'Failed script downloads can cause runtime errors and broken application features.',
      message: 'All external JavaScript resources responded successfully.',
      fix: null
    });
  } else {
    checks.push({
      id: 'js-failures',
      name: 'Failed JavaScript Files',
      severity: 'ERROR',
      detectedValue: `${failedScripts.length} failed script(s)`,
      whyItMatters: '404 or failed script requests prevent core client-side functions from running.',
      message: `Found ${failedScripts.length} script(s) returning errors: ${failedScripts.map(f => f.src).join(', ')}.`,
      fix: 'Verify script asset URLs and fix missing bundle paths.'
    });
  }

  // Check 2: Mixed Content JS
  if (mixedContentScripts.length === 0) {
    checks.push({
      id: 'js-mixed-content',
      name: 'HTTPS Script Security',
      severity: 'PASS',
      detectedValue: '0 mixed content scripts',
      whyItMatters: 'Browsers block unencrypted HTTP scripts on HTTPS pages to prevent active man-in-the-middle attacks.',
      message: 'No unencrypted HTTP scripts found on HTTPS page.',
      fix: null
    });
  } else {
    checks.push({
      id: 'js-mixed-content',
      name: 'Insecure Mixed Content Scripts',
      severity: 'ERROR',
      detectedValue: `${mixedContentScripts.length} insecure script(s)`,
      whyItMatters: 'Browsers will block HTTP script loading on HTTPS sites immediately.',
      message: `Detected ${mixedContentScripts.length} insecure HTTP script(s): ${mixedContentScripts.map(m => m.src).join(', ')}.`,
      fix: 'Ensure all script src attributes use https://.'
    });
  }

  // Check 3: Render-Blocking Scripts
  if (renderBlockingScripts.length === 0) {
    checks.push({
      id: 'js-render-blocking',
      name: 'Non-Blocking Script Loading',
      severity: 'PASS',
      detectedValue: 'All scripts load async, defer, or module',
      whyItMatters: 'Asynchronous script loading prevents the HTML parser from freezing while downloading JavaScript.',
      message: 'All external scripts use async, defer, or type="module".',
      fix: null
    });
  } else {
    checks.push({
      id: 'js-render-blocking',
      name: 'Render-Blocking Scripts',
      severity: 'WARNING',
      detectedValue: `${renderBlockingScripts.length} render-blocking script(s)`,
      whyItMatters: 'Synchronous scripts pause HTML parsing until the file is fully downloaded and executed.',
      message: `Found ${renderBlockingScripts.length} script(s) loaded synchronously without async or defer.`,
      fix: 'Add defer or async attributes to non-critical external scripts.'
    });
  }

  // Check 4: Duplicate Scripts
  if (duplicateScripts.length > 0) {
    checks.push({
      id: 'js-duplicates',
      name: 'Duplicate Script Requests',
      severity: 'WARNING',
      detectedValue: `${duplicateScripts.length} duplicate URL(s)`,
      whyItMatters: 'Duplicate scripts waste network data and may trigger duplicate initialization code.',
      message: `Found duplicate script tags: ${duplicateScripts.join(', ')}.`,
      fix: 'Remove redundant script inclusions from document templates.'
    });
  }

  return {
    summary: {
      externalCount: rawScripts.length,
      inlineBlocksCount: inlineScripts.length,
      totalInlineBytes: inlineScripts.reduce((acc, s) => acc + s.sizeBytes, 0),
      renderBlockingCount: renderBlockingScripts.length,
      failedCount: failedScripts.length,
      mixedContentCount: mixedContentScripts.length,
      duplicateCount: duplicateScripts.length
    },
    inventory: rawScripts,
    inlineBlocks: inlineScripts,
    checks
  };
}

module.exports = {
  analyzeJavaScript
};
