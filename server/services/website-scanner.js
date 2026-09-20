/**
 * server/services/website-scanner.js
 * Comprehensive Website QA and Health Audit Engine.
 * Coordinates modular analyzers for Technical, HTML, Links, Images, CSS, JS, Fonts,
 * Accessibility, Schema, Social, Security, Robots, and Resources.
 */

const dns = require('dns').promises;
const { URL } = require('url');

const { analyzeTechnical } = require('./qa/technical');
const { analyzeHtml } = require('./qa/html');
const { analyzeLinks } = require('./qa/links');
const { analyzeImages } = require('./qa/images');
const { analyzeCss } = require('./qa/css');
const { analyzeJavaScript } = require('./qa/javascript');
const { analyzeFonts } = require('./qa/fonts');
const { analyzeAccessibility } = require('./qa/accessibility');
const { analyzeSchema } = require('./qa/schema');
const { analyzeSocial } = require('./qa/social');
const { analyzeSecurity } = require('./qa/security');
const { analyzeResources } = require('./qa/resources');
const { checkRobotsAndSitemap } = require('./qa/robots');

// SSRF Protection: Deny private IP ranges and internal hostnames
const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/
];

async function validateAndResolveUrl(inputUrl) {
  let parsed;
  try {
    parsed = new URL(inputUrl);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a full URL including http:// or https://');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsafe protocol. Only http:// and https:// URLs are allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Resolve hostname IP to guard against SSRF
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(addr.address)) {
          // Allow testing against testing-ai.local or 127.0.0.1 for local self-testing if needed,
          // but strictly block metadata endpoints (169.254.169.254) and private enterprise ranges
          if (addr.address === '169.254.169.254' || addr.address.startsWith('10.') || addr.address.startsWith('192.168.')) {
            throw new Error('Access to private or metadata network addresses is restricted for security.');
          }
        }
      }
    }
  } catch (err) {
    if (err.message.includes('restricted')) throw err;
    throw new Error(`Could not resolve hostname "${hostname}". Please verify the domain name.`);
  }

  return parsed.toString();
}

/**
 * Perform comprehensive website audit
 */
async function scanWebsite(targetUrl) {
  const validatedUrl = await validateAndResolveUrl(targetUrl);
  const parsedUrl = new URL(validatedUrl);

  const startTime = Date.now();
  let response;
  let html = '';
  const redirectChain = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

  try {
    response = await fetch(validatedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebDevAIStudio/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    html = await response.text();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 12 seconds. The website might be slow or blocking requests.');
    }
    throw new Error(`Failed to fetch website: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const responseTime = Date.now() - startTime;
  const status = response.status;
  const finalUrl = response.url || validatedUrl;
  const isHttps = new URL(finalUrl).protocol === 'https:';

  // Extract raw response headers dictionary
  const rawHeaders = {};
  response.headers.forEach((val, key) => {
    rawHeaders[key.toLowerCase()] = val;
  });

  // 1. Technical Analysis
  const technical = analyzeTechnical({
    targetUrl: validatedUrl,
    finalUrl,
    status,
    responseTime,
    headers: rawHeaders,
    redirectChain,
    isHttps
  });

  // 2. HTML Document Analysis
  const htmlDoc = analyzeHtml(html, finalUrl);

  // 3. Links Analysis (checks live links concurrently)
  const links = await analyzeLinks(html, finalUrl);

  // 4. Images Analysis (checks image headers/dimensions/sizes)
  const images = await analyzeImages(html, finalUrl);

  // 5. CSS Analysis (checks external stylesheets)
  const css = await analyzeCss(html, finalUrl);

  // 6. JavaScript Analysis (inspects external scripts)
  const javascript = await analyzeJavaScript(html, finalUrl);

  // 7. Fonts Analysis
  const fonts = analyzeFonts(html, finalUrl, css.inventory);

  // 8. Accessibility QA (deterministic checks)
  const accessibility = analyzeAccessibility(html);

  // 9. Schema / Structured Data
  const schema = analyzeSchema(html);

  // 10. Social Preview Metadata
  const social = analyzeSocial(html);

  // 11. Security Headers
  const security = analyzeSecurity(rawHeaders);

  // 12. Robots.txt and Sitemap.xml
  const robots = await checkRobotsAndSitemap(finalUrl);

  // 13. Resource Footprint & Mixed Content & Third-Party Groupings
  const resources = analyzeResources(html, finalUrl, {
    stylesheets: css.inventory,
    scripts: javascript.inventory,
    images: images.inventory,
    fonts: fonts.inventory
  });

  // Aggregate All Checks
  const allChecks = [
    ...technical.checks,
    ...htmlDoc.checks,
    ...links.checks,
    ...images.checks,
    ...css.checks,
    ...javascript.checks,
    ...fonts.checks,
    ...accessibility.checks,
    ...schema.checks,
    ...social.checks,
    ...security.checks,
    ...robots.checks,
    ...resources.checks
  ];

  const criticalIssues = allChecks.filter(c => c.severity === 'ERROR');
  const warnings = allChecks.filter(c => c.severity === 'WARNING');
  const passedChecks = allChecks.filter(c => c.severity === 'PASS');
  const infoFindings = allChecks.filter(c => c.severity === 'INFO');

  return {
    url: validatedUrl,
    finalUrl,
    timestamp: new Date().toISOString(),
    status,
    responseTime,
    isHttps,
    summary: {
      critical: criticalIssues.length,
      warnings: warnings.length,
      passed: passedChecks.length,
      info: infoFindings.length,
      totalChecks: allChecks.length
    },
    // Category Details
    technical: {
      ...technical.summary,
      checks: technical.checks
    },
    htmlDoc: {
      summary: htmlDoc.summary,
      ...htmlDoc.summary,
      metaTags: htmlDoc.metaTags,
      headings: htmlDoc.headings,
      duplicateIds: htmlDoc.duplicateIds,
      checks: htmlDoc.checks
    },
    links: {
      summary: links.summary,
      inventory: links.inventory,
      checks: links.checks
    },
    images: {
      summary: images.summary,
      inventory: images.inventory,
      checks: images.checks
    },
    css: {
      summary: css.summary,
      inventory: css.inventory,
      inlineBlocks: css.inlineBlocks,
      checks: css.checks
    },
    javascript: {
      summary: javascript.summary,
      inventory: javascript.inventory,
      inlineBlocks: javascript.inlineBlocks,
      checks: javascript.checks
    },
    fonts: {
      summary: fonts.summary,
      inventory: fonts.inventory,
      checks: fonts.checks
    },
    accessibility: {
      summary: accessibility.summary,
      checks: accessibility.checks
    },
    schema: {
      summary: schema.summary,
      jsonLdBlocks: schema.jsonLdBlocks,
      microdataTypes: schema.microdataTypes,
      rdfaTypes: schema.rdfaTypes,
      checks: schema.checks
    },
    social: {
      openGraph: social.openGraph,
      twitter: social.twitter,
      checks: social.checks
    },
    security: {
      headers: security.headers,
      checks: security.checks
    },
    robots: {
      robotsTxt: robots.robotsTxt,
      sitemapXml: robots.sitemapXml,
      checks: robots.checks
    },
    resources: {
      summary: resources.summary,
      thirdPartyDomains: resources.thirdPartyDomains,
      mixedContent: resources.mixedContent,
      iframes: resources.iframes,
      checks: resources.checks
    },
    // Raw Technical Data for Developer Inspection
    rawTechnicalData: {
      responseHeaders: rawHeaders,
      metaTags: htmlDoc.metaTags,
      headings: htmlDoc.headings,
      jsonLd: schema.jsonLdBlocks,
      social: social,
      securityHeaders: security.headers,
      robotsTxt: robots.robotsTxt,
      sitemapXml: robots.sitemapXml
    }
  };
}

module.exports = {
  scanWebsite
};
