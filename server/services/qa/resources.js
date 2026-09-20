/**
 * server/services/qa/resources.js
 * Analyzes total resource footprint, mixed content risks, and third-party domain groupings.
 */

const { URL } = require('url');

function analyzeResources(html, baseUrl, data = {}) {
  const base = new URL(baseUrl);
  const baseHostname = base.hostname.toLowerCase();
  const isBaseHttps = base.protocol === 'https:';

  const {
    stylesheets = [],
    scripts = [],
    images = [],
    fonts = []
  } = data;

  // Detect Videos & Iframes
  const videoRegex = /<video\b([^>]*)>/gi;
  const videoCount = (html.match(videoRegex) || []).length;

  const iframeRegex = /<iframe\b([^>]*)>/gi;
  const iframeMatches = [...html.matchAll(iframeRegex)];
  const iframeCount = iframeMatches.length;

  const iframes = iframeMatches.map(m => {
    const srcMatch = m[1].match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const titleMatch = m[1].match(/\btitle\s*=\s*(["'])(.*?)\1/i);
    return {
      src: srcMatch ? srcMatch[2].trim() : '',
      title: titleMatch ? titleMatch[2].trim() : '(Untitled iframe)'
    };
  });

  // Third-Party Domain Grouping
  const domainMap = new Map();

  function trackResourceDomain(urlStr, type) {
    if (!urlStr || urlStr.startsWith('data:') || urlStr === '(Data URI)') return;
    try {
      const parsed = new URL(urlStr, baseUrl);
      const hostname = parsed.hostname ? parsed.hostname.toLowerCase() : '';
      if (hostname && hostname !== baseHostname && !hostname.endsWith('.' + baseHostname)) {
        if (!domainMap.has(hostname)) {
          domainMap.set(hostname, { domain: hostname, count: 0, types: new Set(), sampleUrls: [] });
        }
        const entry = domainMap.get(hostname);
        entry.count++;
        entry.types.add(type);
        if (entry.sampleUrls.length < 3) {
          entry.sampleUrls.push(urlStr);
        }
      }
    } catch (e) {
      // ignore unparseable
    }
  }

  stylesheets.forEach(s => trackResourceDomain(s.absoluteUrl, 'CSS'));
  scripts.forEach(s => trackResourceDomain(s.absoluteUrl, 'JavaScript'));
  images.forEach(i => trackResourceDomain(i.absoluteUrl, 'Image'));
  fonts.forEach(f => trackResourceDomain(f.url, 'Font'));
  iframes.forEach(f => trackResourceDomain(f.src, 'Iframe'));

  const thirdPartyDomains = Array.from(domainMap.values()).map(d => ({
    domain: d.domain,
    count: d.count,
    types: Array.from(d.types),
    sampleUrls: d.sampleUrls
  })).sort((a, b) => b.count - a.count);

  // Mixed Content Detection on HTTPS Pages
  const mixedContent = [];
  if (isBaseHttps) {
    stylesheets.filter(s => s.isMixedContent).forEach(s => {
      mixedContent.push({ type: 'CSS', url: s.href });
    });
    scripts.filter(s => s.isMixedContent).forEach(s => {
      mixedContent.push({ type: 'JavaScript', url: s.src });
    });
    images.filter(i => i.absoluteUrl && i.absoluteUrl.startsWith('http://')).forEach(i => {
      mixedContent.push({ type: 'Image', url: i.src });
    });
    iframes.filter(f => f.src && f.src.startsWith('http://')).forEach(f => {
      mixedContent.push({ type: 'Iframe', url: f.src });
    });
  }

  const checks = [];

  // Check 1: Mixed Content
  if (isBaseHttps) {
    if (mixedContent.length === 0) {
      checks.push({
        id: 'res-mixed-content',
        name: 'Mixed Content Protection',
        severity: 'PASS',
        detectedValue: '0 insecure HTTP subresources',
        whyItMatters: 'Ensures all subresources are loaded securely over HTTPS without browser blocking.',
        message: 'No unencrypted HTTP subresources detected on this HTTPS page.',
        fix: null
      });
    } else {
      checks.push({
        id: 'res-mixed-content',
        name: 'Insecure Mixed Content Detected',
        severity: 'ERROR',
        detectedValue: `${mixedContent.length} insecure subresource(s)`,
        whyItMatters: 'Browsers block active mixed content (scripts/styles) and display security warnings for passive content (images).',
        message: `Found ${mixedContent.length} resource(s) loaded over HTTP on an HTTPS page.`,
        fix: 'Update all resource URLs to use https:// or relative protocol-agnostic paths.'
      });
    }
  }

  // Check 2: Third-Party Dependencies
  checks.push({
    id: 'res-third-party',
    name: 'Third-Party External Domains',
    severity: thirdPartyDomains.length > 8 ? 'WARNING' : 'INFO',
    detectedValue: `${thirdPartyDomains.length} external domain(s)`,
    whyItMatters: 'Third-party dependencies increase DNS lookups, TCP handshakes, and exposure to external outages.',
    message: `Page connects to ${thirdPartyDomains.length} distinct external domain(s): ${thirdPartyDomains.slice(0, 4).map(d => d.domain).join(', ')}${thirdPartyDomains.length > 4 ? '...' : ''}.`,
    fix: thirdPartyDomains.length > 8 ? 'Audit external dependencies to minimize third-party scripts and trackers.' : null
  });

  return {
    summary: {
      html: 1,
      css: stylesheets.length,
      javascript: scripts.length,
      images: images.length,
      fonts: fonts.length,
      videos: videoCount,
      iframes: iframeCount,
      thirdPartyDomainCount: thirdPartyDomains.length,
      mixedContentCount: mixedContent.length
    },
    thirdPartyDomains,
    mixedContent,
    iframes,
    checks
  };
}

module.exports = {
  analyzeResources
};
