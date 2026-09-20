/**
 * server/services/seo/issue-engine.js
 * Centralized deterministic SEO issue evaluator and health score calculator.
 */

function evaluateSeoIssues(crawledPages, robotsData = {}, sitemapData = {}) {
  const issuesMap = new Map(); // code -> issue object
  const totalPages = crawledPages.length || 1;

  function reportIssue(code, { category, severity, title, description, recommendation, threshold = null, source = 'crawler' }, url, evidence = '') {
    if (!issuesMap.has(code)) {
      issuesMap.set(code, {
        code,
        category,
        severity, // 'ERROR', 'WARNING', 'NOTICE'
        title,
        description,
        recommendation,
        threshold,
        source,
        affectedCount: 0,
        affectedUrls: []
      });
    }
    const issue = issuesMap.get(code);
    if (!issue.affectedUrls.some(u => u.url === url)) {
      issue.affectedUrls.push({ url, evidence: String(evidence || '') });
      issue.affectedCount++;
    }
  }

  // 1. Robots.txt rules
  if (robotsData.hasDisallowAll) {
    reportIssue('ROBOTS_DISALLOW_ALL', {
      category: 'Crawlability',
      severity: 'ERROR',
      title: 'Global disallow in robots.txt (Disallow: /)',
      description: 'robots.txt specifies Disallow: / under wildcard User-agent: *, instructing web crawlers not to crawl any content.',
      recommendation: 'Remove or refine Disallow: / in your robots.txt if this website is meant for public search indexing.'
    }, robotsData.url, 'Disallow: /');
  }

  // AI bot checks
  if (robotsData.aiBots) {
    const blockedBots = Object.entries(robotsData.aiBots).filter(([name, info]) => info.specified && !info.allowed);
    if (blockedBots.length > 0) {
      reportIssue('AI_BOTS_DISALLOWED', {
        category: 'AI / GEO',
        severity: 'NOTICE',
        title: 'AI search crawlers restricted in robots.txt',
        description: `Robots.txt contains restrictive disallow rules for AI agents: ${blockedBots.map(b => b[0]).join(', ')}.`,
        recommendation: 'If you want your website to be surfaced in AI answer engines (ChatGPT, Claude, Perplexity), permit their respective user-agents in robots.txt.'
      }, robotsData.url, blockedBots.map(b => b[0]).join(', '));
    }
  }

  // 2. Sitemap comparison (Orphan Pages)
  if (sitemapData.urls && sitemapData.urls.length > 0) {
    const crawledUrlSet = new Set(crawledPages.map(p => p.url));
    for (const sUrl of sitemapData.urls) {
      const pageObj = crawledPages.find(p => p.url === sUrl.loc);
      if (pageObj && pageObj.incoming_links_count === 0 && pageObj.crawl_depth > 0) {
        reportIssue('ORPHAN_PAGE', {
          category: 'Crawlability',
          severity: 'WARNING',
          title: 'Orphan page (0 incoming internal links)',
          description: 'This URL was discovered in your XML sitemap or queue, but has 0 internal incoming links from other crawled pages.',
          recommendation: 'Add contextual links from relevant parent or sibling pages to ensure visitors and search engines can discover it naturally.'
        }, sUrl.loc, '0 incoming internal links');
      }
    }
  }

  // Track duplicates across pages
  const titlesMap = new Map(); // title -> [url]
  const metaDescMap = new Map(); // desc -> [url]
  const h1Map = new Map(); // h1 -> [url]

  // 3. Per-page checks
  for (const page of crawledPages) {
    const u = page.url;
    const status = page.status_code;
    const d = page.page_data_json ? (typeof page.page_data_json === 'string' ? JSON.parse(page.page_data_json) : page.page_data_json) : {};

    // HTTP Status Errors & Network Failures
    if (status === 0 || status === null || isNaN(status)) {
      reportIssue('CONNECTION_FAILED', {
        category: 'Technical SEO',
        severity: 'ERROR',
        title: 'Connection / Network failure (Unreachable)',
        description: `Failed to establish connection to this URL: ${page.indexability_status || 'Network or DNS failure'}`,
        recommendation: 'Verify server availability, DNS resolution, SSL certificates, and firewall/WAF rate-limiting settings.'
      }, u, page.indexability_status || 'Network error');
    } else if (status >= 400 && status < 500) {
      reportIssue('HTTP_STATUS_4XX', {
        category: 'Technical SEO',
        severity: 'ERROR',
        title: `Client error HTTP ${status}`,
        description: 'The requested page returned a 4xx client error status.',
        recommendation: 'Fix or remove internal links pointing to this broken URL, or configure a 301 redirect to a relevant page.'
      }, u, `Status: ${status}`);
    } else if (status >= 500) {
      reportIssue('HTTP_STATUS_5XX', {
        category: 'Technical SEO',
        severity: 'ERROR',
        title: `Server error HTTP ${status}`,
        description: 'The server failed to fulfill the request, returning a 5xx status code.',
        recommendation: 'Investigate server error logs and application exceptions to resolve the 5xx response.'
      }, u, `Status: ${status}`);
    }

    // Redirects
    if (d.redirectChain && d.redirectChain.length > 1) {
      reportIssue('REDIRECT_CHAIN', {
        category: 'Crawlability',
        severity: 'WARNING',
        title: `Multi-hop redirect chain (${d.redirectChain.length} hops)`,
        description: `This URL undergoes ${d.redirectChain.length} redirect hops before reaching final destination: ${d.finalUrl}`,
        recommendation: 'Update all internal links to point directly to the final destination URL to reduce crawl latency and avoid link equity dissipation.'
      }, u, d.redirectChain.join(' -> '));
    }

    if (status === 302 || status === 307) {
      reportIssue('REDIRECT_302_TEMPORARY', {
        category: 'Crawlability',
        severity: 'NOTICE',
        title: `Temporary redirect (HTTP ${status})`,
        description: 'A 302 or 307 temporary redirect was used instead of a permanent 301 redirect.',
        recommendation: 'If this redirect is intended to be permanent, update it to HTTP 301 to ensure link equity transfers cleanly.'
      }, u, `Redirects to ${d.finalUrl || 'destination'}`);
    }

    // Only run HTML/Content tests for 200 OK HTML pages
    if (status === 200 && (page.content_type || '').includes('html')) {
      const title = page.title || '';
      const metaDesc = page.meta_description || '';
      const h1 = page.h1 || '';

      // Title
      if (!title) {
        reportIssue('TITLE_MISSING', {
          category: 'On-Page SEO',
          severity: 'ERROR',
          title: 'Missing <title> tag',
          description: 'The page has no title tag declared, which is essential for search engine results snippets.',
          recommendation: 'Add a concise, descriptive <title> tag between 30 and 60 characters.'
        }, u);
      } else {
        if (title.length < 30) {
          reportIssue('TITLE_TOO_SHORT', {
            category: 'On-Page SEO',
            severity: 'NOTICE',
            title: `Title tag is short (${title.length} chars)`,
            description: 'Title is under 30 characters and may miss keyword opportunities.',
            recommendation: 'Expand title to 30–60 characters with descriptive branding.'
          }, u, `"${title}" (${title.length} chars)`);
        } else if (title.length > 65) {
          reportIssue('TITLE_TOO_LONG', {
            category: 'On-Page SEO',
            severity: 'NOTICE',
            title: `Title tag is long (${title.length} chars)`,
            description: 'Title exceeds 65 characters and may be truncated in search results.',
            recommendation: 'Shorten title to under 60 characters to prevent SERP truncation.'
          }, u, `"${title}" (${title.length} chars)`);
        }

        if (!titlesMap.has(title)) titlesMap.set(title, []);
        titlesMap.get(title).push(u);
      }

      // Meta Description
      if (!metaDesc) {
        reportIssue('META_DESC_MISSING', {
          category: 'On-Page SEO',
          severity: 'WARNING',
          title: 'Missing meta description',
          description: 'No meta description was found. Search engines will auto-generate an excerpt from page text.',
          recommendation: 'Add a compelling meta description between 70 and 155 characters summarizing the page.'
        }, u);
      } else {
        if (metaDesc.length < 70) {
          reportIssue('META_DESC_TOO_SHORT', {
            category: 'On-Page SEO',
            severity: 'NOTICE',
            title: `Meta description is short (${metaDesc.length} chars)`,
            description: 'Meta description is under 70 characters.',
            recommendation: 'Expand to 120–155 characters for informative search snippet previews.'
          }, u, `${metaDesc.length} chars`);
        } else if (metaDesc.length > 160) {
          reportIssue('META_DESC_TOO_LONG', {
            category: 'On-Page SEO',
            severity: 'NOTICE',
            title: `Meta description is long (${metaDesc.length} chars)`,
            description: 'Meta description exceeds 160 characters and may be truncated.',
            recommendation: 'Keep primary message within 155 characters.'
          }, u, `${metaDesc.length} chars`);
        }

        if (!metaDescMap.has(metaDesc)) metaDescMap.set(metaDesc, []);
        metaDescMap.get(metaDesc).push(u);
      }

      // H1 Headings
      const h1Count = d.headings ? d.headings.h1Count : (h1 ? 1 : 0);
      if (h1Count === 0) {
        reportIssue('H1_MISSING', {
          category: 'On-Page SEO',
          severity: 'ERROR',
          title: 'Missing <h1> heading',
          description: 'No <h1> tag was found. The main heading clarifies primary page topic.',
          recommendation: 'Add a single, semantic <h1> heading describing page contents.'
        }, u);
      } else if (h1Count > 1) {
        reportIssue('H1_MULTIPLE', {
          category: 'On-Page SEO',
          severity: 'NOTICE',
          title: `Multiple <h1> headings found (${h1Count})`,
          description: 'The page declares more than one <h1> heading.',
          recommendation: 'Consider using a single top-level <h1>, and sub-divide sections using <h2> and <h3>.'
        }, u, `${h1Count} H1 headings`);
      } else if (h1) {
        if (!h1Map.has(h1)) h1Map.set(h1, []);
        h1Map.get(h1).push(u);
      }

      // Canonical
      const can = d.canonical || {};
      if (!can.exists) {
        reportIssue('CANONICAL_MISSING', {
          category: 'Indexability',
          severity: 'NOTICE',
          title: 'Missing canonical tag',
          description: 'No rel="canonical" tag is declared on this page.',
          recommendation: 'Specify a self-referencing rel="canonical" to prevent duplicate content ambiguity across query strings and protocols.'
        }, u);
      } else if (can.hasMultiple) {
        reportIssue('CANONICAL_MULTIPLE', {
          category: 'Indexability',
          severity: 'ERROR',
          title: 'Multiple canonical tags declared',
          description: 'Page contains two or more rel="canonical" tags, which may cause search engines to ignore all canonical directives.',
          recommendation: 'Ensure exactly one canonical link element exists per page.'
        }, u);
      } else if (!can.isSelfReferential && can.resolved) {
        reportIssue('CANONICAL_MISMATCH', {
          category: 'Indexability',
          severity: 'WARNING',
          title: 'Canonical points to different URL',
          description: `Page canonical points to ${can.resolved} instead of itself.`,
          recommendation: 'Verify if this page is intended to be canonicalized to an alternative URL.'
        }, u, `Canonical: ${can.resolved}`);
      }

      // Thin Content
      if (page.word_count < 150) {
        reportIssue('LOW_WORD_COUNT', {
          category: 'On-Page SEO',
          severity: 'WARNING',
          title: `Low visible text volume (${page.word_count} words)`,
          description: 'Visible textual body content is under 150 words.',
          recommendation: 'Enrich page with descriptive text, headings, and detailed information for visitors.'
        }, u, `${page.word_count} words`);
      }

      // Images Alt
      if (d.images && d.images.missingAltCount > 0) {
        reportIssue('IMAGE_MISSING_ALT', {
          category: 'Images',
          severity: 'WARNING',
          title: `Images missing alt attribute (${d.images.missingAltCount})`,
          description: 'One or more <img> tags lack an alt attribute entirely.',
          recommendation: 'Add descriptive alt text to informative images, or alt="" with role="presentation" for decorative graphics.'
        }, u, `${d.images.missingAltCount} images without alt`);
      }

      // Structured Data
      if (d.structuredData) {
        if (d.structuredData.hasErrors) {
          reportIssue('SCHEMA_JSON_LD_INVALID', {
            category: 'Structured Data',
            severity: 'ERROR',
            title: 'Malformed JSON-LD structured data',
            description: 'A JSON-LD <script> tag contains invalid JSON syntax.',
            recommendation: 'Validate and repair JSON-LD markup using schema validators.'
          }, u, d.structuredData.errorDetails?.[0]?.message || 'JSON parse error');
        } else if (d.structuredData.items && d.structuredData.items.length === 0) {
          reportIssue('SCHEMA_MISSING', {
            category: 'Structured Data',
            severity: 'NOTICE',
            title: 'No structured data declared',
            description: 'No JSON-LD structured data detected on this page.',
            recommendation: 'Add relevant schemas (Organization, Article, Product, BreadcrumbList) to enable search rich results.'
          }, u);
        }
      }

      // HTTPS & Security
      if (!u.startsWith('https://')) {
        reportIssue('INSECURE_HTTP', {
          category: 'Technical SEO',
          severity: 'ERROR',
          title: 'Page served over unencrypted HTTP',
          description: 'Page is served via plaintext HTTP instead of secure HTTPS.',
          recommendation: 'Configure an SSL/TLS certificate and redirect all HTTP traffic to HTTPS.'
        }, u);
      } else {
        if (d.security && !d.security.hasHsts) {
          reportIssue('SECURITY_MISSING_HSTS', {
            category: 'Technical SEO',
            severity: 'NOTICE',
            title: 'Missing HSTS header (Strict-Transport-Security)',
            description: 'Strict-Transport-Security header is not sent by the web server.',
            recommendation: 'Add Strict-Transport-Security with max-age to enforce HTTPS in modern browsers.'
          }, u);
        }
        if (d.security && d.security.mixedContentUrls && d.security.mixedContentUrls.length > 0) {
          reportIssue('MIXED_CONTENT', {
            category: 'Technical SEO',
            severity: 'ERROR',
            title: 'Mixed content references detected',
            description: 'HTTPS page loads resources over insecure HTTP.',
            recommendation: 'Update insecure resource URLs (images, scripts, styles) to HTTPS.'
          }, u, d.security.mixedContentUrls.join(', '));
        }
      }

      // Viewport
      if (d.viewport && !d.viewport.exists) {
        reportIssue('VIEWPORT_MISSING', {
          category: 'Mobile',
          severity: 'ERROR',
          title: 'Missing viewport meta tag',
          description: 'No <meta name="viewport"> tag declared. Page will render poorly on mobile screens.',
          recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.'
        }, u);
      }

      // HTML Lang
      if (d.international && !d.international.htmlLang) {
        reportIssue('HTML_LANG_MISSING', {
          category: 'International',
          severity: 'WARNING',
          title: 'Missing <html> lang attribute',
          description: 'The root <html> element does not specify a language attribute.',
          recommendation: 'Declare language e.g. <html lang="en"> to assist screen readers and international search engines.'
        }, u);
      }

      // Open Graph
      if (!d.openGraph || (!d.openGraph.title && !d.openGraph.image)) {
        reportIssue('OG_TAGS_MISSING', {
          category: 'Social',
          severity: 'NOTICE',
          title: 'Missing Open Graph metadata (og:title, og:image)',
          description: 'Page lacks Open Graph tags for social media snippet previews.',
          recommendation: 'Include og:title, og:description, and og:image for rich card previews on social platforms.'
        }, u);
      }

      // Deep crawl
      if (page.crawl_depth >= 4) {
        reportIssue('DEEP_CRAWL_PAGE', {
          category: 'Crawlability',
          severity: 'NOTICE',
          title: `Deep crawl depth (${page.crawl_depth} clicks from root)`,
          description: `Page is ${page.crawl_depth} clicks away from the homepage.`,
          recommendation: 'Improve site architecture and internal linking to keep important content within 3 clicks of the homepage.'
        }, u, `Depth: ${page.crawl_depth}`);
      }

      // JS differences (if browser rendering was on)
      if (d.browserRender && d.browserRender.jsDiffs && d.browserRender.jsDiffs.length > 0) {
        reportIssue('JS_RENDERING_REQUIRED', {
          category: 'Technical SEO',
          severity: 'WARNING',
          title: 'SEO elements dependent on JavaScript execution',
          description: 'Key SEO elements (title, canonical, or content) only appear after client JavaScript runs.',
          recommendation: 'Ensure server-side rendering (SSR) or static pre-rendering so search bots that do not execute JS can view complete metadata.'
        }, u, d.browserRender.jsDiffs.map(j => j.element).join(', '));
      }

      if (d.browserRender && d.browserRender.hasHorizontalOverflow) {
        reportIssue('MOBILE_HORIZONTAL_OVERFLOW', {
          category: 'Mobile',
          severity: 'ERROR',
          title: 'Mobile layout horizontal overflow',
          description: 'Page content exceeds viewport width causing horizontal scroll on mobile devices.',
          recommendation: 'Fix CSS dimensions, padding, or unconstrained media elements to eliminate horizontal overflow.'
        }, u, 'scrollWidth > clientWidth');
      }
    }
  }

  // Duplicate checks across pages
  for (const [title, urls] of titlesMap.entries()) {
    if (urls.length > 1) {
      for (const u of urls) {
        reportIssue('TITLE_DUPLICATE', {
          category: 'On-Page SEO',
          severity: 'WARNING',
          title: `Duplicate <title> across ${urls.length} pages`,
          description: `Multiple pages share the exact same title: "${title}".`,
          recommendation: 'Ensure each indexable page has a unique, descriptive title tag.'
        }, u, `Shared by ${urls.length} URLs`);
      }
    }
  }

  for (const [desc, urls] of metaDescMap.entries()) {
    if (urls.length > 1) {
      for (const u of urls) {
        reportIssue('META_DESC_DUPLICATE', {
          category: 'On-Page SEO',
          severity: 'NOTICE',
          title: `Duplicate meta description across ${urls.length} pages`,
          description: 'Multiple pages share the exact same meta description.',
          recommendation: 'Provide custom meta descriptions tailored to each specific page.'
        }, u, `Shared by ${urls.length} URLs`);
      }
    }
  }

  for (const [h1, urls] of h1Map.entries()) {
    if (urls.length > 1) {
      for (const u of urls) {
        reportIssue('H1_DUPLICATE', {
          category: 'On-Page SEO',
          severity: 'WARNING',
          title: `Duplicate <h1> heading across ${urls.length} pages`,
          description: `Multiple pages share the exact same H1 heading: "${h1}".`,
          recommendation: 'Use distinct H1 headings for distinct pages.'
        }, u, `Shared by ${urls.length} URLs`);
      }
    }
  }

  const issuesList = Array.from(issuesMap.values());

  // Count severities
  let errorsCount = 0;
  let warningsCount = 0;
  let noticesCount = 0;

  for (const iss of issuesList) {
    if (iss.severity === 'ERROR') errorsCount += iss.affectedCount;
    else if (iss.severity === 'WARNING') warningsCount += iss.affectedCount;
    else if (iss.severity === 'NOTICE') noticesCount += iss.affectedCount;
  }

  // Check if root / homepage failed (4xx, 5xx, or network failure)
  const rootPage = crawledPages.find(p => p.crawl_depth === 0) || crawledPages[0];
  const isRootBlockedOrFailed = rootPage && (rootPage.status_code >= 400 || rootPage.status_code === 0);

  // Calculate Deterministic WebDev SEO Health Score (0-100)
  let healthScore = 100;
  if (isRootBlockedOrFailed && crawledPages.length <= 1) {
    // If the homepage failed and no other pages were crawled, score cannot be 85!
    healthScore = 0;
  } else {
    let penalty = 0;
    for (const iss of issuesList) {
      const ratio = Math.min(1, iss.affectedCount / totalPages);
      if (iss.severity === 'ERROR') {
        penalty += Math.min(25, 12 + (ratio * 15)); // errors penalize heavily
      } else if (iss.severity === 'WARNING') {
        penalty += Math.min(10, 4 + (ratio * 8));
      } else if (iss.severity === 'NOTICE') {
        penalty += Math.min(4, 1 + (ratio * 3));
      }
    }
    healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  // Calculate Deterministic Category Scores (0-100)
  const categoryKeys = ['crawlability', 'onpage', 'technical', 'links', 'images', 'structured_data', 'mobile', 'ai_search'];
  const categoryScores = {
    crawlability: 100,
    onpage: 100,
    technical: 100,
    links: 100,
    images: 100,
    structured_data: 100,
    mobile: 100,
    ai_search: 100
  };

  if (isRootBlockedOrFailed && crawledPages.length <= 1) {
    categoryScores.crawlability = 0;
    categoryScores.technical = 0;
  } else {
    const catMap = {
      'Crawlability': 'crawlability',
      'Indexability': 'crawlability',
      'On-Page SEO': 'onpage',
      'Technical SEO': 'technical',
      'Links & Redirects': 'links',
      'Images': 'images',
      'Structured Data': 'structured_data',
      'Mobile': 'mobile',
      'AI / Search': 'ai_search',
      'Social': 'onpage',
      'International': 'technical'
    };

    for (const iss of issuesList) {
      const cat = catMap[iss.category] || 'onpage';
      const ratio = Math.min(1, iss.affectedCount / totalPages);
      let catPenalty = 0;
      if (iss.severity === 'ERROR') catPenalty = 15 + (ratio * 15);
      else if (iss.severity === 'WARNING') catPenalty = 8 + (ratio * 8);
      else if (iss.severity === 'NOTICE') catPenalty = 3 + (ratio * 4);

      if (categoryScores[cat] !== undefined) {
        categoryScores[cat] = Math.max(0, categoryScores[cat] - catPenalty);
      }
    }

    for (const k of categoryKeys) {
      categoryScores[k] = Math.round(categoryScores[k]);
    }
  }

  // Ensure every issue has a clean affectedUrls array of strings
  for (const iss of issuesList) {
    iss.affectedUrls = (iss.affectedUrls || []).map(u => (typeof u === 'string' ? u : (u.url || String(u)))).filter(Boolean);
    iss.affectedCount = iss.affectedUrls.length;
  }

  return {
    issues: issuesList,
    healthScore,
    categoryScores,
    isRootBlockedOrFailed,
    isLimitedAudit: crawledPages.length < 3,
    errorsCount,
    warningsCount,
    noticesCount,
    passedChecksCount: Math.max(0, 30 - issuesList.length)
  };
}

module.exports = {
  evaluateSeoIssues
};
