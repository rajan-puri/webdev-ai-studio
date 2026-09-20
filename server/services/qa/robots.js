/**
 * server/services/qa/robots.js
 * Checks /robots.txt and /sitemap.xml availability, sitemap declarations, and indexing rules.
 */

const { URL } = require('url');

async function checkRobotsAndSitemap(baseUrl) {
  const base = new URL(baseUrl);
  const robotsUrl = `${base.protocol}//${base.host}/robots.txt`;
  const defaultSitemapUrl = `${base.protocol}//${base.host}/sitemap.xml`;

  const results = {
    robotsTxt: {
      url: robotsUrl,
      status: null,
      exists: false,
      content: null,
      sitemaps: [],
      hasDisallowAll: false
    },
    sitemapXml: {
      url: defaultSitemapUrl,
      status: null,
      exists: false,
      contentType: null,
      urlCountEstimate: 0
    },
    checks: []
  };

  // 1. Fetch robots.txt
  try {
    const rController = new AbortController();
    const rTimeout = setTimeout(() => rController.abort(), 4000);
    const rRes = await fetch(robotsUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; RobotsChecker)' },
      signal: rController.signal
    });
    clearTimeout(rTimeout);

    results.robotsTxt.status = rRes.status;
    if (rRes.status === 200) {
      results.robotsTxt.exists = true;
      const text = await rRes.text();
      results.robotsTxt.content = text.length > 5000 ? text.substring(0, 5000) + '\n...(truncated)' : text;

      // Extract Sitemap lines
      const sitemapLines = [...text.matchAll(/^\s*Sitemap:\s*([^\r\n]+)/gmi)].map(m => m[1].trim());
      results.robotsTxt.sitemaps = sitemapLines;

      // Check for Disallow: /
      if (/^\s*User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*$/mi.test(text)) {
        results.robotsTxt.hasDisallowAll = true;
      }
    }
  } catch (err) {
    results.robotsTxt.status = 'error';
  }

  // 2. Determine Sitemap URL to verify
  let sitemapTarget = defaultSitemapUrl;
  if (results.robotsTxt.sitemaps.length > 0) {
    sitemapTarget = results.robotsTxt.sitemaps[0];
  }
  results.sitemapXml.url = sitemapTarget;

  // 3. Fetch sitemap.xml
  try {
    const sController = new AbortController();
    const sTimeout = setTimeout(() => sController.abort(), 4000);
    const sRes = await fetch(sitemapTarget, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebDevAIStudio/1.0; SitemapChecker)' },
      signal: sController.signal
    });
    clearTimeout(sTimeout);

    results.sitemapXml.status = sRes.status;
    results.sitemapXml.contentType = sRes.headers.get('content-type');
    if (sRes.status === 200) {
      results.sitemapXml.exists = true;
      const sText = await sRes.text();
      const locMatches = sText.match(/<loc>/gi) || [];
      results.sitemapXml.urlCountEstimate = locMatches.length;
    }
  } catch (err) {
    results.sitemapXml.status = 'error';
  }

  // Generate Checks
  if (results.robotsTxt.exists) {
    if (results.robotsTxt.hasDisallowAll) {
      results.checks.push({
        id: 'robots-txt-rules',
        name: 'Robots.txt Indexing Directive',
        severity: 'WARNING',
        detectedValue: 'Disallow: / (Blocking all crawlers)',
        whyItMatters: 'A global disallow prevents search engines like Google from crawling and indexing your site.',
        message: 'robots.txt contains "User-agent: * Disallow: /". Verify if this site is meant for staging or production.',
        fix: 'Remove "Disallow: /" if you want public search engines to index your website.'
      });
    } else {
      results.checks.push({
        id: 'robots-txt-rules',
        name: 'Robots.txt Configuration',
        severity: 'PASS',
        detectedValue: `robots.txt active (Status ${results.robotsTxt.status})`,
        whyItMatters: 'Guides search bots on which paths to crawl and specifies the XML sitemap location.',
        message: `robots.txt is accessible and contains ${results.robotsTxt.sitemaps.length} sitemap reference(s).`,
        fix: null
      });
    }
  } else {
    results.checks.push({
      id: 'robots-txt-rules',
      name: 'Robots.txt Availability',
      severity: 'WARNING',
      detectedValue: `HTTP ${results.robotsTxt.status}`,
      whyItMatters: 'Search bots expect /robots.txt to know crawl boundaries and locate sitemaps.',
      message: 'No robots.txt file was found at /robots.txt.',
      fix: 'Create a robots.txt file in the root web directory declaring your sitemap URL.'
    });
  }

  if (results.sitemapXml.exists) {
    results.checks.push({
      id: 'sitemap-xml-check',
      name: 'XML Sitemap Availability',
      severity: 'PASS',
      detectedValue: `Accessible (${results.sitemapXml.urlCountEstimate} estimated URLs/entries)`,
      whyItMatters: 'XML sitemaps ensure search engines discover all canonical pages efficiently.',
      message: `XML Sitemap verified at ${results.sitemapXml.url}.`,
      fix: null
    });
  } else {
    results.checks.push({
      id: 'sitemap-xml-check',
      name: 'XML Sitemap Availability',
      severity: 'WARNING',
      detectedValue: `Status ${results.sitemapXml.status}`,
      whyItMatters: 'Search bots use XML sitemaps to quickly discover newly published and deep content.',
      message: `No accessible XML sitemap detected at ${results.sitemapXml.url}.`,
      fix: 'Generate and publish an XML sitemap and reference it inside robots.txt.'
    });
  }

  return results;
}

module.exports = {
  checkRobotsAndSitemap
};
