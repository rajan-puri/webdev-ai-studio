/**
 * server/services/qa/links.js
 * Extracts, categorizes, and validates every link on the page.
 */

const { URL } = require('url');

/**
 * Check link status via fast HEAD (falling back to GET if 405)
 */
async function checkLinkStatus(linkUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

  try {
    let res = await fetch(linkUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; LinkChecker)',
        'Accept': '*/*'
      },
      signal: controller.signal,
      redirect: 'manual' // detect redirects directly
    });

    // If server rejects HEAD with 405 Method Not Allowed, fallback to minimal GET
    if (res.status === 405) {
      res = await fetch(linkUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; LinkChecker)',
          'Range': 'bytes=0-0'
        },
        signal: controller.signal,
        redirect: 'manual'
      });
    }

    clearTimeout(timeoutId);
    const redirectUrl = res.headers.get('location') || null;

    return {
      status: res.status,
      redirectDestination: redirectUrl,
      error: null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { status: null, redirectDestination: null, error: 'Timeout (>4s)' };
    }
    return { status: null, redirectDestination: null, error: err.message || 'Connection failed' };
  }
}

async function analyzeLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const baseHostname = base.hostname.toLowerCase();

  const rawLinks = [];
  const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const rawContent = match[2].replace(/<[^>]+>/g, '').trim();

    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    const relMatch = attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    const targetMatch = attrs.match(/\btarget\s*=\s*(["'])(.*?)\1/i);
    const ariaLabelMatch = attrs.match(/\baria-label\s*=\s*(["'])(.*?)\1/i);

    const originalHref = hrefMatch ? hrefMatch[2].trim() : '';
    const rel = relMatch ? relMatch[2].trim() : null;
    const target = targetMatch ? targetMatch[2].trim() : null;
    const accessibleName = ariaLabelMatch ? ariaLabelMatch[2].trim() : rawContent;

    // Categorization
    let category = 'internal';
    let resolvedUrl = null;

    if (!originalHref || originalHref === '') {
      category = 'empty';
    } else if (originalHref === '#') {
      category = 'hash';
    } else if (originalHref.startsWith('#')) {
      category = 'fragment';
    } else if (/^javascript:/i.test(originalHref)) {
      category = 'javascript';
    } else if (/^mailto:/i.test(originalHref)) {
      category = 'mailto';
    } else if (/^tel:/i.test(originalHref)) {
      category = 'tel';
    } else {
      try {
        const resolved = new URL(originalHref, baseUrl);
        resolvedUrl = resolved.toString();
        if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
          if (resolved.hostname.toLowerCase() === baseHostname) {
            category = 'internal';
          } else {
            category = 'external';
          }
        } else {
          category = 'other_protocol';
        }
      } catch (e) {
        category = 'invalid';
      }
    }

    rawLinks.push({
      originalHref,
      resolvedUrl,
      anchorText: rawContent || '(No anchor text)',
      accessibleName: accessibleName || '(Unlabelled link)',
      rel,
      target,
      category,
      status: null,
      redirectDestination: null,
      error: null
    });
  }

  // Count categories
  const counts = {
    total: rawLinks.length,
    internal: 0,
    external: 0,
    mailto: 0,
    tel: 0,
    fragment: 0,
    empty: 0,
    hash: 0,
    javascript: 0,
    other: 0
  };

  rawLinks.forEach(l => {
    if (counts[l.category] !== undefined) {
      counts[l.category]++;
    } else {
      counts.other++;
    }
  });

  // Collect unique HTTP/HTTPS URLs to check status without duplicate queries
  const httpLinks = rawLinks.filter(l => l.resolvedUrl && (l.category === 'internal' || l.category === 'external'));
  const uniqueUrls = Array.from(new Set(httpLinks.map(l => l.resolvedUrl)));

  // Batch checking with concurrency limit of 8 (check up to 60 unique links to keep audit snappy)
  const maxToCheck = uniqueUrls.slice(0, 60);
  const statusMap = new Map();

  const BATCH_SIZE = 8;
  for (let i = 0; i < maxToCheck.length; i += BATCH_SIZE) {
    const batch = maxToCheck.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(url => checkLinkStatus(url)));
    batch.forEach((url, idx) => {
      statusMap.set(url, results[idx]);
    });
  }

  // Map results back to link items
  rawLinks.forEach(l => {
    if (l.resolvedUrl && statusMap.has(l.resolvedUrl)) {
      const res = statusMap.get(l.resolvedUrl);
      l.status = res.status;
      l.redirectDestination = res.redirectDestination;
      l.error = res.error;
    }
  });

  // Identify broken links and redirects
  const brokenLinks = rawLinks.filter(l => (l.status && l.status >= 400) || l.error);
  const redirectedLinks = rawLinks.filter(l => l.status && l.status >= 300 && l.status < 400);
  const emptyLinks = rawLinks.filter(l => l.category === 'empty' || l.category === 'hash');
  const unlabelledLinks = rawLinks.filter(l => l.accessibleName === '(Unlabelled link)');

  const checks = [];

  // Check 1: Broken Links
  if (brokenLinks.length === 0) {
    checks.push({
      id: 'links-broken',
      name: 'Broken Link Check',
      severity: 'PASS',
      detectedValue: `0 broken links verified (${statusMap.size} checked)`,
      whyItMatters: 'Broken links (404/500 errors) harm user experience and waste search engine crawl resources.',
      message: `Verified ${statusMap.size} unique URLs on the page. No broken links detected.`,
      fix: null
    });
  } else {
    checks.push({
      id: 'links-broken',
      name: 'Broken Links Detected',
      severity: 'ERROR',
      detectedValue: `${brokenLinks.length} broken link(s)`,
      whyItMatters: 'Dead links frustrate visitors and signal unmaintained web content.',
      message: `Found ${brokenLinks.length} link(s) returning 4xx/5xx errors or connection timeouts: ${brokenLinks.slice(0, 2).map(b => `${b.originalHref} (${b.status || b.error})`).join(', ')}.`,
      fix: 'Update or remove broken link URLs from the page markup.'
    });
  }

  // Check 2: Redirected Links
  if (redirectedLinks.length > 0) {
    checks.push({
      id: 'links-redirects',
      name: 'Internal / External Link Redirects',
      severity: 'INFO',
      detectedValue: `${redirectedLinks.length} redirected link(s)`,
      whyItMatters: 'Linking to URLs that redirect adds an extra round-trip latency for users.',
      message: `Found ${redirectedLinks.length} link(s) pointing to redirect destinations.`,
      fix: 'Update link hrefs to target destination URLs directly to eliminate intermediate redirect hops.'
    });
  }

  // Check 3: Empty or Hash Links
  if (emptyLinks.length === 0) {
    checks.push({
      id: 'links-empty-href',
      name: 'Placeholder Href Attributes',
      severity: 'PASS',
      detectedValue: '0 placeholder links',
      whyItMatters: 'Empty hrefs or href="#" trigger page reloads or unexpected scroll jumps.',
      message: 'All links possess valid destination references.',
      fix: null
    });
  } else {
    checks.push({
      id: 'links-empty-href',
      name: 'Placeholder Href Attributes',
      severity: 'WARNING',
      detectedValue: `${emptyLinks.length} empty or "#" href(s)`,
      whyItMatters: 'Links with href="#" or empty hrefs are frequently misused as script triggers instead of <button>.',
      message: `Detected ${emptyLinks.length} link(s) with href="" or href="#".`,
      fix: 'Convert script-trigger links to semantic <button type="button"> elements or provide real URLs.'
    });
  }

  // Check 4: Unlabelled Links
  if (unlabelledLinks.length > 0) {
    checks.push({
      id: 'links-unlabelled',
      name: 'Link Accessible Names',
      severity: 'WARNING',
      detectedValue: `${unlabelledLinks.length} unlabelled link(s)`,
      whyItMatters: 'Screen reader users rely on anchor text or aria-label to know where a link leads.',
      message: `Found ${unlabelledLinks.length} link(s) without anchor text or an aria-label.`,
      fix: 'Add descriptive anchor text or an aria-label="Description" for icon-only links.'
    });
  }

  return {
    summary: {
      ...counts,
      checkedCount: statusMap.size,
      brokenCount: brokenLinks.length,
      redirectedCount: redirectedLinks.length
    },
    inventory: rawLinks,
    checks
  };
}

module.exports = {
  analyzeLinks
};
