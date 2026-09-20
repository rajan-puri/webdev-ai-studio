/**
 * server/services/seo/crawler.js
 * High-performance Breadth-First Technical SEO Crawler.
 * Recursively discovers and crawls internal pages, sitemaps, and client-rendered DOM links.
 * Enforces robots.txt compliance, rate-limiting, SSRF protection, and graceful cancellation.
 */

const { URL } = require('url');
const { db } = require('../../data/database');
const {
  validateAndResolveUrl,
  normalizeUrl,
  resolveUrl,
  isInternalUrl,
  extractDomain,
  isCrawlableHtmlUrl
} = require('./url-utils');
const { fetchAndAnalyzeRobots } = require('./robots-analyzer');
const { discoverAndParseSitemaps } = require('./sitemap-parser');
const { parsePageHtml } = require('./html-parser');
const { renderPageWithBrowser } = require('./browser-renderer');
const { evaluateSeoIssues } = require('./issue-engine');

const activeJobs = new Map(); // auditId -> { isCancelled: boolean, controller: AbortController }

function cancelSeoAudit(auditId) {
  const job = activeJobs.get(auditId);
  if (job) {
    job.isCancelled = true;
    if (job.controller) job.controller.abort();
  }
  db.prepare(`
    UPDATE seo_audits 
    SET status = 'cancelled', completed_at = datetime('now')
    WHERE id = ?
  `).run(auditId);
  activeJobs.delete(auditId);
  return true;
}

async function runSeoAudit(auditId, seedUrl, config = {}, userId = '') {
  const abortController = new AbortController();
  activeJobs.set(auditId, { isCancelled: false, controller: abortController });

  const startTime = Date.now();

  // Parse configuration options
  const rawMaxPages = config.max_pages || config.maxPages || config.crawl_limit || '50';
  const isEntireSite = rawMaxPages === 'entire_site' || rawMaxPages === '0' || rawMaxPages === 0 || rawMaxPages === 'unlimited';
  const maxUrls = isEntireSite ? 1500 : Math.min(Math.max(parseInt(rawMaxPages, 10) || 50, 1), 1500);

  const rawScope = (config.crawl_scope || config.crawlScope || 'domain').toLowerCase();
  const crawlScope = (rawScope === 'single' || rawScope === 'single_page') ? 'single_page' : (rawScope === 'sitemap' ? 'sitemap' : 'domain');

  const respectRobots = config.honor_robots !== false && config.respectRobots !== false;
  const renderJs = config.execute_js === true || config.renderJs === true;
  const includeSubdomains = config.include_subdomains === true || config.includeSubdomains === true || config.allow_subdomains === true;

  let userAgent = config.user_agent || config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
  if (!userAgent.includes('Mozilla') && !userAgent.includes('bot') && !userAgent.includes('Bot')) {
    userAgent = 'Mozilla/5.0 (compatible; WebDevBot/1.0; +https://webdevai.studio/bot)';
  }

  const concurrency = Math.min(Math.max(parseInt(config.concurrency || '2', 10), 1), 8);
  const delayMs = parseInt(config.delay_ms || config.delay || '0', 10);
  const ignoredParams = config.ignored_params || config.ignoredParams || null;

  try {
    // 1. SSRF and URL validation
    const parsedSeed = await validateAndResolveUrl(seedUrl);
    const normalizedSeed = normalizeUrl(parsedSeed.toString(), { ignoredParams });
    const baseDomain = extractDomain(normalizedSeed);
    const baseOrigin = `${parsedSeed.protocol}//${parsedSeed.host}`;

    updateAuditProgress(auditId, {
      progress: 3,
      currentUrl: 'Checking robots.txt & XML sitemaps...',
      status: 'running'
    });

    // 2. Robots.txt Analysis
    const robotsData = await fetchAndAnalyzeRobots(baseOrigin, userAgent);

    // 3. Sitemap Analysis
    const sitemapData = await discoverAndParseSitemaps(baseOrigin, robotsData.sitemaps, userAgent);

    // 4. Initialize Queue and Discovery tracking
    // Queue item: { url, depth, discoveredFrom, discoveryMethod }
    const queue = [];
    const visited = new Set();
    const discoveredUrls = new Set();
    const crawledPages = [];
    const blockedUrls = [];
    const failedUrls = [];
    const redirectedUrls = [];
    const externalLinksSet = new Set();
    const incomingLinksMap = new Map(); // targetUrl -> count

    // Add seed URL to queue
    queue.push({
      url: normalizedSeed,
      depth: 0,
      discoveredFrom: 'user_input',
      discoveryMethod: 'homepage'
    });
    visited.add(normalizedSeed);
    discoveredUrls.add(normalizedSeed);

    // In 'domain' or 'sitemap' mode, also enqueue sitemap URLs
    if (crawlScope === 'domain' || crawlScope === 'sitemap') {
      for (const sItem of (sitemapData.urls || [])) {
        if (!sItem.loc) continue;
        const normSitemapUrl = normalizeUrl(sItem.loc, { ignoredParams });
        if (!normSitemapUrl) continue;

        discoveredUrls.add(normSitemapUrl);

        if (!visited.has(normSitemapUrl)) {
          visited.add(normSitemapUrl);
          // Only add up to maxUrls to initial queue
          if (queue.length < maxUrls) {
            queue.push({
              url: normSitemapUrl,
              depth: 1,
              discoveredFrom: sItem.sitemapUrl || 'sitemap.xml',
              discoveryMethod: 'sitemap'
            });
          }
        }
      }
    }

    let pagesCrawled = 0;
    let rootFailed = false;
    let rootFailureReason = '';

    // Concurrency worker loop
    async function worker() {
      while (queue.length > 0 && pagesCrawled < maxUrls) {
        const currentJob = activeJobs.get(auditId);
        if (!currentJob || currentJob.isCancelled) break;

        const task = queue.shift();
        if (!task) break;

        const currentUrl = task.url;

        // Check robots.txt compliance before fetching
        if (respectRobots && robotsData.exists && robotsData.isAllowed) {
          try {
            const uObj = new URL(currentUrl);
            const isAllowed = robotsData.isAllowed(uObj.pathname + uObj.search, userAgent);
            if (!isAllowed) {
              blockedUrls.push({
                url: currentUrl,
                depth: task.depth,
                discoveredFrom: task.discoveredFrom,
                reason: 'Disallowed by robots.txt'
              });

              // Create blocked page record
              crawledPages.push({
                url: currentUrl,
                final_url: currentUrl,
                status_code: 403,
                content_type: 'text/plain',
                content_length: 0,
                response_time_ms: 0,
                crawl_depth: task.depth,
                discovered_from: task.discoveredFrom,
                discovery_method: task.discoveryMethod,
                indexable: 0,
                indexability_status: 'Blocked by robots.txt',
                title: '',
                meta_description: '',
                h1: '',
                canonical: '',
                word_count: 0,
                incoming_links_count: incomingLinksMap.get(currentUrl) || 0,
                outgoing_links_count: 0,
                issues_count: 1,
                page_data_json: {
                  url: currentUrl,
                  status: 403,
                  blockedByRobots: true,
                  reason: 'Blocked by robots.txt disallow directive'
                }
              });

              continue; // Do not fetch disallowed URL
            }
          } catch (e) {}
        }

        pagesCrawled++;

        // Live progress update
        const progressPct = Math.min(94, Math.round((pagesCrawled / Math.min(maxUrls, pagesCrawled + queue.length)) * 88) + 6);
        updateAuditProgress(auditId, {
          progress: progressPct,
          currentUrl,
          pagesCrawled,
          pagesDiscovered: discoveredUrls.size
        });

        // Fetch page with manual redirect tracing
        const pageResult = await fetchPageWithRedirects(currentUrl, userAgent, abortController.signal);

        // Check for homepage failure (Section 11 & 12)
        if (task.depth === 0 && (pageResult.status >= 400 || pageResult.status === 0)) {
          rootFailed = true;
          rootFailureReason = pageResult.status === 0 ? `Network/DNS error: ${pageResult.error || 'Connection failed'}` : `HTTP ${pageResult.status} ${pageResult.status === 403 ? 'Forbidden' : 'Error'}`;
        }

        if (pageResult.redirectChain && pageResult.redirectChain.length > 0) {
          redirectedUrls.push({
            from: currentUrl,
            to: pageResult.finalUrl,
            chain: pageResult.redirectChain
          });
        }

        if (pageResult.status >= 400 || pageResult.status === 0) {
          failedUrls.push({
            url: currentUrl,
            status: pageResult.status,
            error: pageResult.error || `HTTP ${pageResult.status}`
          });
        }

        // Parse HTML
        let parsedHtml = {};
        if (pageResult.isHtml && pageResult.body) {
          parsedHtml = parsePageHtml(pageResult.body, pageResult.finalUrl, pageResult.headers, baseDomain, includeSubdomains);

          // Optional Playwright rendering for JS differences (limit to first 10 pages)
          if (renderJs && crawledPages.length < 10) {
            try {
              const browserData = await renderPageWithBrowser(pageResult.finalUrl, parsedHtml, userAgent);
              parsedHtml.browserRender = browserData;

              // Also merge client-rendered anchors discovered from Playwright DOM
              if (browserData && browserData.renderedAnchors && Array.isArray(browserData.renderedAnchors)) {
                for (const rHref of browserData.renderedAnchors) {
                  const resolvedR = resolveUrl(rHref, pageResult.finalUrl);
                  if (resolvedR && isInternalUrl(resolvedR, baseDomain, includeSubdomains) && isCrawlableHtmlUrl(resolvedR)) {
                    const normR = normalizeUrl(resolvedR, { ignoredParams });
                    if (normR && !parsedHtml.links.internal.some(l => l.url === normR)) {
                      parsedHtml.links.internal.push({
                        url: normR,
                        rawHref: rHref,
                        text: '(Rendered DOM link)',
                        rel: '',
                        isNofollow: false
                      });
                    }
                  }
                }
              }
            } catch (bErr) {
              console.warn('[crawler] Browser render failed for', pageResult.finalUrl, bErr.message);
            }
          }

          // Recursive BFS link discovery for 'domain' crawl
          if (crawlScope === 'domain') {
            for (const link of (parsedHtml.links.internal || [])) {
              const targetUrl = link.url;
              if (!targetUrl || !isCrawlableHtmlUrl(targetUrl)) continue;

              const normTarget = normalizeUrl(targetUrl, { ignoredParams });
              if (!normTarget) continue;

              // Increment link graph edge
              incomingLinksMap.set(normTarget, (incomingLinksMap.get(normTarget) || 0) + 1);
              discoveredUrls.add(normTarget);

              // Add to queue if not visited and within limits
              if (!visited.has(normTarget)) {
                visited.add(normTarget);

                // Check crawl limit boundary
                if (queue.length + pagesCrawled < maxUrls) {
                  queue.push({
                    url: normTarget,
                    depth: task.depth + 1,
                    discoveredFrom: currentUrl,
                    discoveryMethod: 'internal-link'
                  });
                }
              }
            }

            // Track external links
            for (const ext of (parsedHtml.links.external || [])) {
              if (ext.url) externalLinksSet.add(ext.url);
            }
          }
        }

        // Store page record
        const pageRecord = {
          url: currentUrl,
          final_url: pageResult.finalUrl || currentUrl,
          status_code: pageResult.status,
          content_type: pageResult.contentType,
          content_length: pageResult.contentLength,
          response_time_ms: pageResult.responseTimeMs,
          crawl_depth: task.depth,
          discovered_from: task.discoveredFrom || 'homepage',
          discovery_method: task.discoveryMethod || 'internal-link',
          indexable: parsedHtml.indexability?.isIndexable ? 1 : 0,
          indexability_status: parsedHtml.indexability?.reason || (pageResult.status === 200 ? 'indexable' : `HTTP ${pageResult.status}`),
          title: parsedHtml.title?.text || '',
          meta_description: parsedHtml.metaDescription?.text || '',
          h1: parsedHtml.headings?.h1?.[0] || '',
          canonical: parsedHtml.canonical?.resolved || '',
          word_count: parsedHtml.content?.wordCount || 0,
          incoming_links_count: incomingLinksMap.get(currentUrl) || 0,
          outgoing_links_count: parsedHtml.links?.internalCount || 0,
          issues_count: 0,
          page_data_json: {
            ...parsedHtml,
            status: pageResult.status,
            finalUrl: pageResult.finalUrl,
            redirectChain: pageResult.redirectChain,
            headers: pageResult.headers,
            discoveredFrom: task.discoveredFrom,
            discoveryMethod: task.discoveryMethod
          }
        };

        crawledPages.push(pageRecord);

        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    // Launch worker pool
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    // Check cancellation
    const checkCancel = activeJobs.get(auditId);
    if (checkCancel && checkCancel.isCancelled) {
      return;
    }

    updateAuditProgress(auditId, {
      progress: 96,
      currentUrl: 'Aggregating issues & computing health score...'
    });

    // Update incoming link counts
    for (const p of crawledPages) {
      p.incoming_links_count = incomingLinksMap.get(p.url) || 0;
    }

    // 5. Evaluate SEO Issues across all crawled pages
    const evalResults = evaluateSeoIssues(crawledPages, robotsData, sitemapData);

    const totalDurationMs = Date.now() - startTime;
    const crawlLimitReached = queue.length > 0 && pagesCrawled >= maxUrls;

    // Determine Coverage Status
    let coverageStatus = 'FULL_SITE_CRAWL';
    if (rootFailed) {
      coverageStatus = 'BLOCKED_OR_FAILED';
    } else if (crawlLimitReached) {
      coverageStatus = 'CRAWL_LIMIT_REACHED';
    } else if (crawledPages.length <= 1) {
      coverageStatus = 'LIMITED_AUDIT';
    }

    // Build Directory Tree for Site Structure view
    const siteStructure = buildSiteStructureTree(crawledPages.map(p => p.url));

    // Summary JSON
    const summaryData = {
      seedUrl,
      baseDomain,
      coverageStatus,
      rootFailed,
      rootFailureReason,
      crawlLimitReached,
      pagesCrawled: crawledPages.length,
      pagesDiscovered: discoveredUrls.size,
      pagesBlocked: blockedUrls.length,
      pagesFailed: failedUrls.length,
      pagesRedirected: redirectedUrls.length,
      externalLinksCount: externalLinksSet.size,
      sitemapUrlsCount: sitemapData.urls ? sitemapData.urls.length : 0,
      durationMs: totalDurationMs,
      healthScore: evalResults.healthScore,
      categoryScores: evalResults.categoryScores || {},
      errorsCount: evalResults.errorsCount,
      warningsCount: evalResults.warningsCount,
      noticesCount: evalResults.noticesCount,
      passedChecksCount: evalResults.passedChecksCount,
      robots: robotsData || {},
      robotsTxt: {
        exists: robotsData.exists,
        status: robotsData.status,
        sitemaps: robotsData.sitemaps,
        hasDisallowAll: robotsData.hasDisallowAll,
        aiBots: robotsData.aiBots
      },
      sitemaps: sitemapData.sitemapsFound || [],
      siteStructure
    };

    // 6. Save to SQLite inside transaction
    const saveTransaction = db.transaction(() => {
      db.prepare('DELETE FROM seo_pages WHERE audit_id = ?').run(auditId);
      db.prepare('DELETE FROM seo_issues WHERE audit_id = ?').run(auditId);

      const pageStmt = db.prepare(`
        INSERT INTO seo_pages (
          id, audit_id, url, final_url, status_code, content_type, content_length,
          response_time_ms, crawl_depth, indexable, indexability_status, title,
          meta_description, h1, canonical, word_count, incoming_links_count,
          outgoing_links_count, issues_count, page_data_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      for (let i = 0; i < crawledPages.length; i++) {
        const p = crawledPages[i];
        const pageId = `spg_${auditId}_${i + 1}`;
        pageStmt.run(
          pageId, auditId, p.url, p.final_url, p.status_code, p.content_type, p.content_length,
          p.response_time_ms, p.crawl_depth, p.indexable, p.indexability_status, p.title,
          p.meta_description, p.h1, p.canonical, p.word_count, p.incoming_links_count,
          p.outgoing_links_count, p.issues_count, JSON.stringify(p.page_data_json || {})
        );
      }

      const issueStmt = db.prepare(`
        INSERT INTO seo_issues (
          id, audit_id, code, category, severity, title, description,
          recommendation, affected_count, affected_urls_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      for (let i = 0; i < evalResults.issues.length; i++) {
        const iss = evalResults.issues[i];
        const issueId = `sis_${auditId}_${i + 1}`;
        // Store affected URLs as simple array of url strings for standard compatibility
        const affectedUrlStrings = (iss.affectedUrls || []).map(item => (typeof item === 'string' ? item : item.url)).filter(Boolean);
        issueStmt.run(
          issueId, auditId, iss.code, iss.category, iss.severity, iss.title, iss.description,
          iss.recommendation, iss.affectedCount || affectedUrlStrings.length, JSON.stringify(affectedUrlStrings)
        );
      }

      // Update Audit record
      db.prepare(`
        UPDATE seo_audits SET
          status = 'completed',
          progress = 100,
          current_url = 'Audit complete',
          pages_crawled = ?,
          pages_discovered = ?,
          health_score = ?,
          errors_count = ?,
          warnings_count = ?,
          notices_count = ?,
          summary_json = ?,
          duration_ms = ?,
          completed_at = datetime('now')
        WHERE id = ?
      `).run(
        crawledPages.length,
        discoveredUrls.size,
        evalResults.healthScore,
        evalResults.errorsCount,
        evalResults.warningsCount,
        evalResults.noticesCount,
        JSON.stringify(summaryData),
        totalDurationMs,
        auditId
      );

      // Record in test_history
      if (userId) {
        const auditRow = db.prepare('SELECT project_id FROM seo_audits WHERE id = ?').get(auditId);
        const histId = `hist_${Date.now()}_seo`;
        db.prepare(`
          INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary, duration_ms, created_at)
          VALUES (?, ?, ?, 'seo_audit', ?, ?, ?, ?, datetime('now'))
        `).run(
          histId,
          userId,
          auditRow?.project_id || null,
          seedUrl,
          evalResults.errorsCount > 0 ? 'warning' : 'passed',
          JSON.stringify({
            score: evalResults.healthScore,
            errors: evalResults.errorsCount,
            warnings: evalResults.warningsCount,
            notices: evalResults.noticesCount,
            pagesCrawled: crawledPages.length,
            pagesDiscovered: discoveredUrls.size,
            coverageStatus,
            auditId
          }),
          totalDurationMs
        );
      }
    });

    saveTransaction();
    activeJobs.delete(auditId);
  } catch (err) {
    console.error('[crawler] Fatal error during SEO crawl:', err);
    db.prepare(`
      UPDATE seo_audits SET
        status = 'failed',
        error_message = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(err.message, auditId);
    activeJobs.delete(auditId);
  }
}

function updateAuditProgress(auditId, fields) {
  const sets = [];
  const vals = [];
  for (const [key, val] of Object.entries(fields)) {
    if (key === 'progress') { sets.push('progress = ?'); vals.push(val); }
    if (key === 'currentUrl') { sets.push('current_url = ?'); vals.push(val); }
    if (key === 'status') { sets.push('status = ?'); vals.push(val); }
    if (key === 'pagesCrawled') { sets.push('pages_crawled = ?'); vals.push(val); }
    if (key === 'pagesDiscovered') { sets.push('pages_discovered = ?'); vals.push(val); }
  }
  if (sets.length > 0) {
    vals.push(auditId);
    db.prepare(`UPDATE seo_audits SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
}

async function fetchPageWithRedirects(targetUrl, userAgent, abortSignal) {
  let current = targetUrl;
  const redirectChain = [];
  const maxRedirects = 6;
  const startTime = Date.now();

  const cleanUA = userAgent && userAgent.includes('Mozilla') ? userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  for (let i = 0; i <= maxRedirects; i++) {
    try {
      const res = await fetch(current, {
        method: 'GET',
        headers: {
          'User-Agent': cleanUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'manual',
        signal: abortSignal
      });

      const status = res.status;
      const headers = {};
      for (const [k, v] of res.headers.entries()) {
        headers[k.toLowerCase()] = v;
      }

      // Handle Rate-Limiting (HTTP 429)
      if (status === 429) {
        const retryAfter = parseInt(headers['retry-after'] || '2', 10);
        await new Promise(r => setTimeout(r, Math.min(retryAfter, 5) * 1000));
        // Retry once
        return fetchPageWithRedirects(current, userAgent, abortSignal);
      }

      // Handle Redirects (3xx)
      if (status >= 300 && status < 400 && headers.location) {
        redirectChain.push(current);
        const nextUrl = new URL(headers.location, current).toString();
        current = nextUrl;
        continue;
      }

      const contentType = headers['content-type'] || '';
      const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
      let body = '';
      if (isHtml) {
        body = await res.text().catch(() => '');
      }

      return {
        status,
        finalUrl: current,
        redirectChain,
        headers,
        contentType,
        contentLength: body ? Buffer.byteLength(body, 'utf8') : parseInt(headers['content-length'] || '0', 10),
        isHtml,
        body,
        responseTimeMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        status: 0,
        finalUrl: current,
        redirectChain,
        headers: {},
        contentType: 'error',
        contentLength: 0,
        isHtml: false,
        body: '',
        responseTimeMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  return {
    status: 310,
    finalUrl: current,
    redirectChain,
    headers: {},
    contentType: 'error',
    contentLength: 0,
    isHtml: false,
    body: '',
    responseTimeMs: Date.now() - startTime,
    error: 'Too many redirects (> 6 hops)'
  };
}

function buildSiteStructureTree(urls = []) {
  const root = { name: '/', path: '/', count: 0, children: {} };

  for (const u of urls) {
    try {
      const parsed = new URL(u);
      const parts = parsed.pathname.split('/').filter(Boolean);
      let current = root;
      current.count++;

      let curPath = '';
      for (const part of parts) {
        curPath += '/' + part;
        if (!current.children[part]) {
          current.children[part] = { name: part, path: curPath, count: 0, children: {} };
        }
        current = current.children[part];
        current.count++;
      }
    } catch (e) {}
  }

  function formatNode(node) {
    return {
      name: node.name,
      path: node.path,
      count: node.count,
      children: Object.values(node.children).map(formatNode)
    };
  }

  return formatNode(root);
}

module.exports = {
  runSeoAudit,
  cancelSeoAudit
};
