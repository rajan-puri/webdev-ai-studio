/**
 * server/services/seo/sitemap-parser.js
 * XML Sitemap and Sitemap Index parser with recursive discovery.
 */

const { URL } = require('url');
const zlib = require('zlib');
const { normalizeUrl } = require('./url-utils');

async function discoverAndParseSitemaps(baseUrl, declaredSitemaps = [], userAgent = 'WebDevAIStudio') {
  const base = new URL(baseUrl);
  const defaultSitemap = `${base.protocol}//${base.host}/sitemap.xml`;
  const defaultSitemapIndex = `${base.protocol}//${base.host}/sitemap_index.xml`;

  const candidateUrls = Array.from(new Set([
    ...declaredSitemaps,
    defaultSitemap,
    defaultSitemapIndex
  ]));

  const result = {
    sitemapsFound: [],
    urls: new Map(), // normalizedUrl -> { loc, lastmod, changefreq, priority, sitemapUrl }
    errors: []
  };

  const visitedSitemaps = new Set();

  async function processSitemapUrl(sitemapUrl, depth = 0) {
    if (depth > 3 || visitedSitemaps.has(sitemapUrl)) return;
    visitedSitemaps.add(sitemapUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

        const cleanUA = userAgent && userAgent.includes('Mozilla') ? userAgent : (userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
        const res = await fetch(sitemapUrl, {
          method: 'GET',
          headers: {
            'User-Agent': cleanUA,
            'Accept': 'application/xml,text/xml,application/xhtml+xml,*/*'
          },
          signal: controller.signal
        });
      clearTimeout(timeout);

      if (!res.ok) {
        if (declaredSitemaps.includes(sitemapUrl) || sitemapUrl === defaultSitemap) {
          result.errors.push({
            sitemapUrl,
            status: res.status,
            message: `Sitemap returned HTTP status ${res.status}`
          });
        }
        return;
      }

      let buffer = await res.arrayBuffer();
      let xmlText;

      // Handle gzipped sitemaps (.xml.gz)
      if (sitemapUrl.endsWith('.gz') || res.headers.get('content-encoding') === 'gzip') {
        try {
          xmlText = zlib.gunzipSync(Buffer.from(buffer)).toString('utf8');
        } catch (gzErr) {
          xmlText = Buffer.from(buffer).toString('utf8');
        }
      } else {
        xmlText = Buffer.from(buffer).toString('utf8');
      }

      result.sitemapsFound.push({
        url: sitemapUrl,
        status: res.status,
        sizeBytes: xmlText.length
      });

      // Check if sitemap index
      if (xmlText.includes('<sitemapindex') || xmlText.includes('<sitemap>')) {
        const sitemapMatches = xmlText.matchAll(/<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi);
        const childSitemaps = [];
        for (const match of sitemapMatches) {
          const loc = match[1].trim();
          if (loc) childSitemaps.push(loc);
        }

        for (const childUrl of childSitemaps) {
          await processSitemapUrl(childUrl, depth + 1);
        }
      } else {
        // Parse url entries
        const urlMatches = xmlText.matchAll(/<url>([\s\S]*?)<\/url>/gi);
        for (const match of urlMatches) {
          const block = match[1];
          const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
          if (!locMatch) continue;

          const rawLoc = locMatch[1].trim();
          const cleanLoc = normalizeUrl(rawLoc);
          if (!cleanLoc) continue;

          const lastmodMatch = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
          const changefreqMatch = block.match(/<changefreq>([\s\S]*?)<\/changefreq>/i);
          const priorityMatch = block.match(/<priority>([\s\S]*?)<\/priority>/i);

          if (!result.urls.has(cleanLoc)) {
            result.urls.set(cleanLoc, {
              loc: cleanLoc,
              rawLoc,
              lastmod: lastmodMatch ? lastmodMatch[1].trim() : null,
              changefreq: changefreqMatch ? changefreqMatch[1].trim() : null,
              priority: priorityMatch ? parseFloat(priorityMatch[1].trim()) : null,
              sitemapUrl
            });
          }
        }
      }
    } catch (err) {
      if (declaredSitemaps.includes(sitemapUrl)) {
        result.errors.push({
          sitemapUrl,
          status: 0,
          message: err.message
        });
      }
    }
  }

  for (const url of candidateUrls) {
    await processSitemapUrl(url, 0);
  }

  return {
    sitemapsFound: result.sitemapsFound,
    urls: Array.from(result.urls.values()),
    urlCount: result.urls.size,
    errors: result.errors
  };
}

module.exports = {
  discoverAndParseSitemaps
};
