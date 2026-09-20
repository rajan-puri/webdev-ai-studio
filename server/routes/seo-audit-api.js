/**
 * server/routes/seo-audit-api.js
 * Comprehensive REST API for SEO Audits: execution, polling, cancellation,
 * pages, issues, comparison, CSV, JSON, and vector PDF exports.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const { runSeoAudit, cancelSeoAudit } = require('../services/seo/crawler');
const { generateSeoAuditPdf } = require('../services/seo/pdf-generator');
const { generateSeoPagesCsv, generateSeoAuditJson } = require('../services/seo/exporter');
const { validateAndResolveUrl } = require('../services/seo/url-utils');

async function handleSeoAuditRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const segments = pathname.split('/').filter(Boolean); // ['api', 'seo-audits', ...]
  const auditId = segments[2] || null;
  const subAction = segments[3] || null;

  try {
    // 1. GET /api/seo-audits - List user audits
    if (!auditId && req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(queryParams.get('limit') || '20', 10), 1), 100);
      const projectId = queryParams.get('project_id');

      let sql = `
        SELECT id, user_id, project_id, url, status, progress, current_url,
               pages_crawled, pages_discovered, health_score, errors_count,
               warnings_count, notices_count, duration_ms, created_at, completed_at
        FROM seo_audits
        WHERE user_id = ?
      `;
      const params = [user.id];

      if (projectId) {
        sql += ' AND project_id = ?';
        params.push(projectId);
      }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const audits = db.prepare(sql).all(...params);
      const formatted = audits.map(a => ({
        ...a,
        target_url: a.url,
        crawled_pages: a.pages_crawled,
        total_errors: a.errors_count,
        total_warnings: a.warnings_count,
        total_notices: a.notices_count
      }));
      return sendJson(res, 200, { success: true, items: formatted, audits: formatted });
    }

    // 2. POST /api/seo-audits - Start new audit
    if (!auditId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const rawUrl = body.url || body.target_url;
      const { projectId = null } = body;
      const config = body.config || {};

      // Merge flat top-level parameters into config if provided
      if (body.crawl_scope) config.crawl_scope = body.crawl_scope;
      if (body.max_pages) config.max_pages = body.max_pages;
      if (body.execute_js !== undefined) config.execute_js = body.execute_js;
      if (body.honor_robots !== undefined) config.honor_robots = body.honor_robots;
      if (body.user_agent) config.user_agent = body.user_agent;
      if (body.concurrency) config.concurrency = body.concurrency;
      if (body.delay_ms !== undefined) config.delay_ms = body.delay_ms;
      if (body.allow_subdomains !== undefined) config.allow_subdomains = body.allow_subdomains;
      if (body.include_subdomains !== undefined) config.include_subdomains = body.include_subdomains;
      if (body.ignore_query_params !== undefined) config.ignore_query_params = body.ignore_query_params;

      if (!rawUrl || !rawUrl.trim()) {
        return sendError(res, 400, 'Target website URL is required.', 'VALIDATION_ERROR');
      }

      let cleanUrl = rawUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }

      try {
        await validateAndResolveUrl(cleanUrl);
      } catch (err) {
        return sendError(res, 400, err.message, 'INVALID_TARGET_URL');
      }

      // Verify project ownership if project is specified
      if (projectId) {
        const proj = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
        if (!proj) {
          return sendError(res, 404, 'Project not found or not owned by user.', 'PROJECT_NOT_FOUND');
        }
      }

      const id = 'seo_' + uuidv4().replace(/-/g, '').slice(0, 16);
      const configStr = JSON.stringify(config || {});

      db.prepare(`
        INSERT INTO seo_audits (id, user_id, project_id, url, config, status, progress, current_url, created_at)
        VALUES (?, ?, ?, ?, ?, 'running', 0, 'Initializing crawler...', datetime('now'))
      `).run(id, user.id, projectId || null, cleanUrl, configStr);

      // Launch crawler in the background
      setImmediate(() => {
        runSeoAudit(id, cleanUrl, config, user.id).catch(err => {
          console.error('[seo-api] Background crawl uncaught error:', err);
        });
      });

      return sendJson(res, 201, {
        success: true,
        message: 'SEO audit initialized.',
        id: id,
        auditId: id,
        status: 'running',
        target_url: cleanUrl
      });
    }

    // Operations on specific audit ID
    if (auditId) {
      // Check ownership
      const audit = db.prepare('SELECT * FROM seo_audits WHERE id = ? AND user_id = ?').get(auditId, user.id);
      if (!audit) {
        return sendError(res, 404, 'SEO audit not found or access denied.', 'NOT_FOUND');
      }

      // POST /api/seo-audits/:id/cancel
      if (subAction === 'cancel' && req.method === 'POST') {
        cancelSeoAudit(auditId);
        return sendJson(res, 200, { success: true, message: 'Audit cancelled.' });
      }

      // GET /api/seo-audits/:id - Detailed status & summary
      if (!subAction && req.method === 'GET') {
        const summary = typeof audit.summary_json === 'string' ? JSON.parse(audit.summary_json || '{}') : (audit.summary_json || {});
        const config = typeof audit.config === 'string' ? JSON.parse(audit.config || '{}') : (audit.config || {});
        const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ?').all(auditId);
        const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ?').all(auditId);

        const parsedPages = pages.map(p => ({
          ...p,
          headings: typeof p.headings_json === 'string' ? JSON.parse(p.headings_json || '{}') : (p.headings_json || {}),
          schemas: typeof p.schemas_json === 'string' ? JSON.parse(p.schemas_json || '[]') : (p.schemas_json || []),
          images: typeof p.images_json === 'string' ? JSON.parse(p.images_json || '[]') : (p.images_json || []),
          h1_tags: typeof p.h1_tags === 'string' ? JSON.parse(p.h1_tags || '[]') : (p.h1_tags || []),
          h2_tags: typeof p.h2_tags === 'string' ? JSON.parse(p.h2_tags || '[]') : (p.h2_tags || []),
          rendering_diff: typeof p.rendering_diff === 'string' ? JSON.parse(p.rendering_diff || 'null') : p.rendering_diff
        }));

        const parsedIssues = issues.map(iss => {
          let urls = [];
          try {
            urls = typeof iss.affected_urls_json === 'string' ? JSON.parse(iss.affected_urls_json || '[]') : (iss.affected_urls_json || []);
          } catch (e) {
            urls = [];
          }
          const cleanUrls = urls.map(u => (typeof u === 'string' ? u : (u.url || String(u)))).filter(Boolean);
          return {
            ...iss,
            affected_urls: cleanUrls,
            affected_count: iss.affected_count || cleanUrls.length,
            details: typeof iss.details === 'string' ? JSON.parse(iss.details || '{}') : (iss.details || {})
          };
        });

        const coverage = summary.coverage || {
          status: summary.coverageStatus || 'FULL_SITE_CRAWL',
          pagesCrawled: audit.pages_crawled,
          pagesDiscovered: audit.pages_discovered,
          pagesBlocked: summary.pagesBlocked || 0,
          pagesFailed: summary.pagesFailed || 0,
          pagesRedirected: summary.pagesRedirected || 0,
          externalLinksCount: summary.externalLinksCount || 0,
          sitemapUrlsCount: summary.sitemapUrlsCount || 0,
          crawlLimitReached: summary.crawlLimitReached || false,
          rootFailed: summary.rootFailed || false,
          rootFailureReason: summary.rootFailureReason || ''
        };

        return sendJson(res, 200, {
          success: true,
          audit: {
            ...audit,
            target_url: audit.url,
            crawled_pages: audit.pages_crawled,
            discovered_pages: audit.pages_discovered,
            total_errors: audit.errors_count,
            total_warnings: audit.warnings_count,
            total_notices: audit.notices_count,
            coverage,
            coverage_status: summary.coverageStatus || 'FULL_SITE_CRAWL',
            category_scores: summary.categoryScores || {},
            robots_txt: summary.robots || {},
            sitemaps: summary.sitemaps || [],
            site_structure: summary.siteStructure || {},
            config,
            summary
          },
          pages: parsedPages,
          issues: parsedIssues
        });
      }

      // GET /api/seo-audits/:id/pages
      if (subAction === 'pages' && req.method === 'GET') {
        const limit = Math.min(Math.max(parseInt(queryParams.get('limit') || '100', 10), 1), 500);
        const offset = Math.max(parseInt(queryParams.get('offset') || '0', 10), 0);
        const search = queryParams.get('search') ? queryParams.get('search').trim() : '';

        let sql = 'SELECT * FROM seo_pages WHERE audit_id = ?';
        const params = [auditId];

        if (search) {
          sql += ' AND (url LIKE ? OR title LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY crawl_depth ASC, url ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const pages = db.prepare(sql).all(...params);
        const total = db.prepare('SELECT COUNT(*) as count FROM seo_pages WHERE audit_id = ?').get(auditId).count;

        return sendJson(res, 200, {
          success: true,
          pages: pages.map(p => ({
            ...p,
            page_data_json: typeof p.page_data_json === 'string' ? JSON.parse(p.page_data_json || '{}') : p.page_data_json
          })),
          total,
          limit,
          offset
        });
      }

      // GET /api/seo-audits/:id/issues
      if (subAction === 'issues' && req.method === 'GET') {
        const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ? ORDER BY severity ASC, affected_count DESC').all(auditId);
        return sendJson(res, 200, {
          success: true,
          issues: issues.map(iss => {
            let urls = [];
            try {
              urls = typeof iss.affected_urls_json === 'string' ? JSON.parse(iss.affected_urls_json || '[]') : (iss.affected_urls_json || []);
            } catch (e) {
              urls = [];
            }
            const cleanUrls = urls.map(u => (typeof u === 'string' ? u : (u.url || String(u)))).filter(Boolean);
            return {
              ...iss,
              affected_urls: cleanUrls,
              affected_urls_json: cleanUrls,
              affected_count: iss.affected_count || cleanUrls.length,
              details: typeof iss.details === 'string' ? JSON.parse(iss.details || '{}') : (iss.details || {})
            };
          })
        });
      }

      // GET /api/seo-audits/:id/export.csv
      if ((subAction === 'export.csv' || pathname.endsWith('/export.csv')) && req.method === 'GET') {
        const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ? ORDER BY crawl_depth ASC, url ASC').all(auditId);
        const csvContent = generateSeoPagesCsv(pages);

        let domainSlug = 'site';
        try { domainSlug = new URL(audit.url).hostname.replace(/[^a-z0-9]/gi, '-'); } catch (e) {}

        const filename = `seo-audit-${domainSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.end(csvContent);
        return;
      }

      // GET /api/seo-audits/:id/export.json
      if ((subAction === 'export.json' || pathname.endsWith('/export.json')) && req.method === 'GET') {
        const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ? ORDER BY crawl_depth ASC, url ASC').all(auditId);
        const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ? ORDER BY severity ASC').all(auditId);
        const jsonPayload = generateSeoAuditJson(audit, pages, issues);

        let domainSlug = 'site';
        try { domainSlug = new URL(audit.url).hostname.replace(/[^a-z0-9]/gi, '-'); } catch (e) {}

        const filename = `seo-audit-${domainSlug}-${new Date().toISOString().slice(0, 10)}.json`;
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.end(JSON.stringify(jsonPayload, null, 2));
        return;
      }

      // GET /api/seo-audits/:id/export.pdf or /report.pdf - Vector PDF download
      if ((subAction === 'report.pdf' || subAction === 'export.pdf' || pathname.endsWith('/report.pdf') || pathname.endsWith('/export.pdf')) && req.method === 'GET') {
        const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ? ORDER BY crawl_depth ASC, url ASC').all(auditId);
        const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ? ORDER BY severity ASC').all(auditId);

        const pdfBuffer = await generateSeoAuditPdf(audit, pages, issues);

        let domainSlug = 'site';
        try { domainSlug = new URL(audit.url).hostname.replace(/[^a-z0-9]/gi, '-'); } catch (e) {}

        const filename = `seo-audit-${domainSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': pdfBuffer.length,
          'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.end(pdfBuffer);
        return;
      }

      // GET /api/seo-audits/:id/compare/:otherId
      if (subAction === 'compare' && req.method === 'GET') {
        const otherId = segments[4];
        if (!otherId) return sendError(res, 400, 'Second audit ID required for comparison.');

        const other = db.prepare('SELECT * FROM seo_audits WHERE id = ? AND user_id = ?').get(otherId, user.id);
        if (!other) return sendError(res, 404, 'Comparison audit not found or access denied.');

        const currentIssues = db.prepare('SELECT code, title, severity FROM seo_issues WHERE audit_id = ?').all(auditId);
        const pastIssues = db.prepare('SELECT code, title, severity FROM seo_issues WHERE audit_id = ?').all(otherId);

        const currentCodes = new Set(currentIssues.map(i => i.code));
        const pastCodes = new Set(pastIssues.map(i => i.code));

        const newIssues = currentIssues.filter(i => !pastCodes.has(i.code));
        const fixedIssues = pastIssues.filter(i => !currentCodes.has(i.code));
        const unchangedIssues = currentIssues.filter(i => pastCodes.has(i.code));

        const currentPages = db.prepare('SELECT url FROM seo_pages WHERE audit_id = ?').all(auditId).map(p => p.url);
        const pastPages = db.prepare('SELECT url FROM seo_pages WHERE audit_id = ?').all(otherId).map(p => p.url);

        const currentUrlSet = new Set(currentPages);
        const pastUrlSet = new Set(pastPages);

        const newUrls = currentPages.filter(u => !pastUrlSet.has(u));
        const removedUrls = pastPages.filter(u => !currentUrlSet.has(u));

        return sendJson(res, 200, {
          success: true,
          score_delta: (audit.health_score || 0) - (other.health_score || 0),
          current_score: audit.health_score,
          baseline_score: other.health_score,
          new_issues: newIssues,
          resolved_issues: fixedIssues,
          comparison: {
            currentAuditId: auditId,
            previousAuditId: otherId,
            currentScore: audit.health_score,
            previousScore: other.health_score,
            scoreDelta: (audit.health_score || 0) - (other.health_score || 0),
            errorsDelta: (audit.errors_count || 0) - (other.errors_count || 0),
            warningsDelta: (audit.warnings_count || 0) - (other.warnings_count || 0),
            newIssues,
            fixedIssues,
            unchangedIssues,
            newUrls,
            removedUrls
          }
        });
      }

      // DELETE /api/seo-audits/:id
      if (!subAction && req.method === 'DELETE') {
        cancelSeoAudit(auditId);
        db.prepare('DELETE FROM seo_audits WHERE id = ? AND user_id = ?').run(auditId, user.id);
        return sendJson(res, 200, { success: true, message: 'Audit deleted successfully.' });
      }
    }

    return sendError(res, 404, `SEO Audit endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[seo-audit-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in SEO Audit API.');
  }
}

module.exports = {
  handleSeoAuditRequest
};
