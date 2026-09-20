/**
 * server/routes/seo-intelligence-api.js
 * API routing for the comprehensive SEO Intelligence platform.
 * Supports GSC, Bing Webmaster, Ahrefs, PageSpeed, Competitors, and Log File Analyzer.
 * Strict user isolation, server-side secret management, and zero fake data.
 */

const { requireAuth } = require('../middleware/auth');
const { db } = require('../data/database');
const { getAllDataSources, getDataSourceById } = require('../services/seo/seoDataSources');
const SeoProviderManager = require('../services/seo/seo-provider-manager');
const GoogleSearchConsoleProvider = require('../services/seo/providers/google-search-console');
const BingWebmasterProvider = require('../services/seo/providers/bing-webmaster');
const AhrefsProvider = require('../services/seo/providers/ahrefs');
const PageSpeedProvider = require('../services/seo/providers/pagespeed');
const LogFileAnalyzer = require('../services/seo/log-analyzer');
const { createUnavailableMetric } = require('../services/seo/seo-normalizer');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, code = 'ERROR') {
  sendJson(res, statusCode, { success: false, error: message, code });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

async function handleSeoIntelligenceRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return; // 401 sent by requireAuth

  try {
    // 1. GET /api/seo/providers/registry
    if (pathname === '/api/seo/providers/registry' && req.method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        dataSources: getAllDataSources()
      });
    }

    // 2. GET /api/seo/providers/status
    if (pathname === '/api/seo/providers/status' && req.method === 'GET') {
      const status = await SeoProviderManager.getProvidersStatus(user.id);
      return sendJson(res, 200, {
        success: true,
        providers: status
      });
    }

    // 3. POST /api/seo/providers/test
    if (pathname === '/api/seo/providers/test' && req.method === 'POST') {
      const body = await readBody(req);
      const { provider, apiKey } = body;

      if (provider === 'ahrefs') {
        const testRes = await AhrefsProvider.testConnection(apiKey);
        return sendJson(res, testRes.success ? 200 : 400, testRes);
      } else if (provider === 'bing-webmaster') {
        try {
          const sites = await BingWebmasterProvider.fetchUserSites(apiKey);
          return sendJson(res, 200, { success: true, sitesCount: sites.length });
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      } else if (provider === 'pagespeed') {
        const testRes = await PageSpeedProvider.testConnection(apiKey);
        if (!testRes.success) {
          return sendError(res, 400, testRes.error || 'Google PageSpeed Insights API key verification failed.');
        }
        return sendJson(res, 200, { success: true, message: 'Google PageSpeed Insights API key verified successfully.' });
      }

      return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    // 4. POST /api/seo/providers/connect
    if (pathname === '/api/seo/providers/connect' && req.method === 'POST') {
      const body = await readBody(req);
      const { provider, apiKey } = body;

      if (provider === 'ahrefs') {
        const result = await AhrefsProvider.setApiKey(user.id, apiKey);
        return sendJson(res, 200, { success: true, provider, connected: result.connected });
      } else if (provider === 'bing-webmaster') {
        const result = await BingWebmasterProvider.connect(user.id, apiKey);
        return sendJson(res, 200, { success: true, provider, ...result });
      } else if (provider === 'pagespeed') {
        const result = await PageSpeedProvider.setApiKey(user.id, apiKey);
        return sendJson(res, 200, { success: true, provider, ...result });
      }

      return sendError(res, 400, `Direct connect not supported for provider: ${provider}`);
    }

    // 5. POST /api/seo/providers/disconnect
    if (pathname === '/api/seo/providers/disconnect' && req.method === 'POST') {
      const body = await readBody(req);
      const { provider } = body;

      if (provider === 'google-search-console') {
        GoogleSearchConsoleProvider.disconnect(user.id);
      } else if (provider === 'bing-webmaster') {
        BingWebmasterProvider.disconnect(user.id);
      } else if (provider === 'ahrefs') {
        await AhrefsProvider.setApiKey(user.id, '');
      } else if (provider === 'pagespeed') {
        await PageSpeedProvider.setApiKey(user.id, '');
      } else {
        return sendError(res, 400, `Unknown provider: ${provider}`);
      }

      return sendJson(res, 200, { success: true, provider, disconnected: true });
    }

    // 6. GET /api/seo/providers/gsc/auth-url or /api/seo/gsc/auth-url
    if ((pathname === '/api/seo/providers/gsc/auth-url' || pathname === '/api/seo/gsc/auth-url') && req.method === 'GET') {
      try {
        const authUrl = GoogleSearchConsoleProvider.generateAuthUrl(user.id);
        return sendJson(res, 200, { success: true, authUrl });
      } catch (e) {
        return sendError(res, 400, e.message);
      }
    }

    // GSC Sync
    if ((pathname === '/api/seo/providers/gsc/sync' || pathname === '/api/seo/gsc/sync') && req.method === 'POST') {
      try {
        const syncResult = await GoogleSearchConsoleProvider.syncProperties(user.id);
        return sendJson(res, 200, { success: true, properties: syncResult });
      } catch (e) {
        return sendError(res, 400, e.message);
      }
    }

    // GSC Disconnect
    if ((pathname === '/api/seo/providers/gsc/disconnect' || pathname === '/api/seo/gsc/disconnect') && req.method === 'POST') {
      GoogleSearchConsoleProvider.disconnect(user.id);
      return sendJson(res, 200, { success: true, disconnected: true });
    }

    // Bing Config
    if ((pathname === '/api/seo/bing/config') && req.method === 'POST') {
      const body = await readBody(req);
      const { apiKey } = body;
      if (!apiKey) return sendError(res, 400, 'apiKey is required');
      const result = await BingWebmasterProvider.connect(user.id, apiKey);
      return sendJson(res, 200, { success: true, ...result });
    }

    // Bing Disconnect
    if ((pathname === '/api/seo/bing/disconnect') && req.method === 'POST') {
      BingWebmasterProvider.disconnect(user.id);
      return sendJson(res, 200, { success: true, disconnected: true });
    }

    // Ahrefs Config
    if ((pathname === '/api/seo/ahrefs/config') && req.method === 'POST') {
      const body = await readBody(req);
      const { apiKey } = body;
      const result = await AhrefsProvider.setApiKey(user.id, apiKey || '');
      return sendJson(res, 200, { success: true, ...result });
    }

    // Ahrefs Disconnect
    if ((pathname === '/api/seo/ahrefs/disconnect') && req.method === 'POST') {
      await AhrefsProvider.setApiKey(user.id, '');
      return sendJson(res, 200, { success: true, disconnected: true });
    }

    // PageSpeed Config
    if ((pathname === '/api/seo/pagespeed/config') && req.method === 'POST') {
      const body = await readBody(req);
      const { apiKey } = body;
      try {
        const result = await PageSpeedProvider.setApiKey(user.id, apiKey || '');
        return sendJson(res, 200, { success: true, ...result });
      } catch (e) {
        return sendError(res, 400, e.message);
      }
    }

    // PageSpeed Test Connection
    if ((pathname === '/api/seo/pagespeed/test-connection' || pathname === '/api/seo/providers/pagespeed/test') && req.method === 'POST') {
      const body = await readBody(req);
      const keyToTest = body.apiKey || PageSpeedProvider.getApiKey(user.id);
      if (!keyToTest) {
        return sendError(res, 400, 'No API key provided or found to test.');
      }
      const testRes = await PageSpeedProvider.testConnection(keyToTest);
      if (!testRes.success) {
        return sendError(res, 400, testRes.error || 'Connection test failed', 'TEST_FAILED');
      }
      return sendJson(res, 200, { success: true, ...testRes });
    }

    // 7. GET /api/seo/providers/gsc/oauth-callback
    if (pathname === '/api/seo/providers/gsc/oauth-callback' && req.method === 'GET') {
      const code = queryParams.get('code');
      const state = queryParams.get('state');

      if (!code) {
        return sendError(res, 400, 'Authorization code missing from callback.');
      }

      let targetUserId = user.id;
      if (state) {
        try {
          const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
          if (parsedState.userId) targetUserId = parsedState.userId;
        } catch (e) {}
      }

      try {
        await GoogleSearchConsoleProvider.handleOAuthCallback(code, targetUserId);
        // Redirect back to app Settings -> SEO Data Providers
        res.writeHead(302, { 'Location': '/#settings' });
        res.end();
        return;
      } catch (e) {
        return sendError(res, 500, `OAuth token exchange failed: ${e.message}`);
      }
    }

    // 8. GET /api/seo/providers/gsc/properties or /api/seo/gsc/properties
    if ((pathname === '/api/seo/providers/gsc/properties' || pathname === '/api/seo/gsc/properties') && req.method === 'GET') {
      try {
        if (queryParams.get('sync') === '1') {
          await GoogleSearchConsoleProvider.syncProperties(user.id);
        }
        const status = await GoogleSearchConsoleProvider.getConnectionStatus(user.id);
        const properties = GoogleSearchConsoleProvider.listProperties(user.id);
        return sendJson(res, 200, { success: true, connected: status.connected, properties });
      } catch (e) {
        return sendError(res, 400, e.message);
      }
    }

    // 9. POST /api/seo/providers/gsc/select-property
    if ((pathname === '/api/seo/providers/gsc/select-property' || pathname === '/api/seo/gsc/select-property') && req.method === 'POST') {
      const body = await readBody(req);
      const { propertyId } = body;
      if (!propertyId) return sendError(res, 400, 'propertyId is required');

      GoogleSearchConsoleProvider.selectProperty(user.id, propertyId);
      return sendJson(res, 200, { success: true, propertyId });
    }

    // 10. GET /api/seo/providers/gsc/analytics or /api/seo/gsc/analytics
    if ((pathname === '/api/seo/providers/gsc/analytics' || pathname === '/api/seo/gsc/analytics') && req.method === 'GET') {
      let propertyId = queryParams.get('property_id');
      const dateRange = queryParams.get('range') || queryParams.get('dateRange') || '28d';
      const dimensions = (queryParams.get('dimensions') || queryParams.get('dimension') || 'query').split(',').map(d => d.trim()).filter(Boolean);
      const queryFilter = queryParams.get('query') || null;

      if (!propertyId) {
        // Fallback to first available property for user
        const props = GoogleSearchConsoleProvider.listProperties(user.id);
        if (props && props.length > 0) {
          const sel = props.find(p => p.is_selected) || props[0];
          propertyId = sel.property_id || sel.site_url;
        }
      }

      if (!propertyId) {
        return sendJson(res, 200, {
          success: true,
          connected: false,
          rows: [],
          totals: {
            clicks: createUnavailableMetric('google-search-console', 'Google Search Console', 'OAuth not connected'),
            impressions: createUnavailableMetric('google-search-console', 'Google Search Console', 'OAuth not connected'),
            ctr: createUnavailableMetric('google-search-console', 'Google Search Console', 'OAuth not connected'),
            position: createUnavailableMetric('google-search-console', 'Google Search Console', 'OAuth not connected')
          },
          summary: { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 },
          message: 'Google Search Console not connected. Connect in Settings to view verified search analytics.'
        });
      }

      const data = await GoogleSearchConsoleProvider.querySearchAnalytics(user.id, propertyId, {
        dateRange,
        dimensions,
        queryFilter,
        startDate: queryParams.get('start_date'),
        endDate: queryParams.get('end_date')
      });

      const summary = {
        totalClicks: data.totals?.clicks?.value || 0,
        totalImpressions: data.totals?.impressions?.value || 0,
        averageCtr: data.totals?.ctr?.value ? (data.totals.ctr.value / 100) : 0,
        averagePosition: data.totals?.position?.value || 0
      };

      return sendJson(res, 200, { success: true, summary, ...data });
    }

    // 11. GET /api/seo/providers/bing/stats or /api/seo/bing/stats
    if ((pathname === '/api/seo/providers/bing/stats' || pathname === '/api/seo/bing/stats') && req.method === 'GET') {
      const siteUrl = queryParams.get('site_url') || queryParams.get('domain') || 'https://example.com';
      const data = await BingWebmasterProvider.getRankAndTrafficStats(user.id, siteUrl);
      return sendJson(res, 200, { success: true, ...data });
    }

    // 12. GET /api/seo/providers/bing/queries or /api/seo/bing/queries
    if ((pathname === '/api/seo/providers/bing/queries' || pathname === '/api/seo/bing/queries') && req.method === 'GET') {
      const siteUrl = queryParams.get('site_url') || queryParams.get('domain') || 'https://example.com';
      const data = await BingWebmasterProvider.getQueryStats(user.id, siteUrl);
      return sendJson(res, 200, { success: true, ...data });
    }

    // 13. GET /api/seo/providers/ahrefs/dr or /api/seo/ahrefs/dr
    if ((pathname === '/api/seo/providers/ahrefs/dr' || pathname === '/api/seo/ahrefs/dr') && req.method === 'GET') {
      const domain = queryParams.get('domain');
      if (!domain) return sendError(res, 400, 'domain is required');

      const data = await AhrefsProvider.getDomainRating(domain, user.id);
      return sendJson(res, 200, { success: true, ...data });
    }

    // 14. GET /api/seo/providers/pagespeed or /api/seo/pagespeed/analyze
    if ((pathname === '/api/seo/providers/pagespeed' || pathname === '/api/seo/pagespeed/analyze') && req.method === 'GET') {
      const targetUrl = queryParams.get('url');
      const strategy = queryParams.get('strategy') === 'desktop' ? 'desktop' : 'mobile';

      if (!targetUrl) return sendError(res, 400, 'url parameter is required');

      const data = await PageSpeedProvider.analyze(targetUrl, strategy, user.id);
      return sendJson(res, 200, { success: true, ...data });
    }

    // 15. GET /api/seo/intelligence/overview or /api/seo/overview
    if ((pathname === '/api/seo/intelligence/overview' || pathname === '/api/seo/overview') && req.method === 'GET') {
      const domain = queryParams.get('domain');
      if (!domain) return sendError(res, 400, 'domain parameter is required');

      const overview = await SeoProviderManager.getDomainOverview(domain, user.id, {
        dateRange: queryParams.get('range') || '28d'
      });

      return sendJson(res, 200, { success: true, ...overview });
    }

    // 16. POST or GET /api/seo/competitors/compare
    if (pathname === '/api/seo/competitors/compare') {
      let targetDomain = queryParams.get('domain') || queryParams.get('targetDomain');
      let competitorDomain = queryParams.get('competitor') || queryParams.get('competitorDomain');

      if (req.method === 'POST') {
        const body = await readBody(req);
        targetDomain = body.targetDomain || targetDomain;
        competitorDomain = body.competitorDomain || competitorDomain;
      }

      if (!targetDomain || !competitorDomain) {
        return sendError(res, 400, 'targetDomain and competitorDomain are required');
      }

      const comparison = await SeoProviderManager.compareDomains(targetDomain, competitorDomain, user.id);
      return sendJson(res, 200, { success: true, comparison });
    }

    // 17. GET /api/seo/competitors
    if (pathname === '/api/seo/competitors' && req.method === 'GET') {
      const rows = db.prepare(`
        SELECT * FROM seo_competitors WHERE user_id = ? ORDER BY created_at DESC
      `).all(user.id);
      return sendJson(res, 200, { success: true, competitors: rows });
    }

    // 18. POST /api/seo/competitors
    if (pathname === '/api/seo/competitors' && req.method === 'POST') {
      const body = await readBody(req);
      const { targetDomain, competitorDomain, notes } = body;
      if (!targetDomain || !competitorDomain) {
        return sendError(res, 400, 'targetDomain and competitorDomain are required');
      }

      const id = `comp_${user.id}_${Buffer.from(competitorDomain).toString('hex').slice(0, 12)}`;
      db.prepare(`
        INSERT INTO seo_competitors (id, user_id, target_domain, competitor_domain, notes, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET notes = excluded.notes
      `).run(id, user.id, targetDomain, competitorDomain, notes || '');

      return sendJson(res, 201, { success: true, id });
    }

    // 19. DELETE /api/seo/competitors/:id
    if (pathname.startsWith('/api/seo/competitors/') && req.method === 'DELETE') {
      const compId = pathname.replace('/api/seo/competitors/', '');
      db.prepare('DELETE FROM seo_competitors WHERE id = ? AND user_id = ?').run(compId, user.id);
      return sendJson(res, 200, { success: true, deleted: true });
    }

    // 20. POST /api/seo/logs/analyze or /api/seo/log-analyzer
    if ((pathname === '/api/seo/logs/analyze' || pathname === '/api/seo/log-analyzer') && req.method === 'POST') {
      const body = await readBody(req);
      const { logContent, filename, logText } = body;
      const content = logContent || logText;

      if (!content) {
        return sendError(res, 400, 'logContent is required (plain text server access log).');
      }

      try {
        const analysis = LogFileAnalyzer.parseAndAnalyze(content, filename || 'access.log');

        const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        db.prepare(`
          INSERT INTO seo_log_analyses (
            id, user_id, filename, file_size_bytes, lines_parsed, summary_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(logId, user.id, filename || 'access.log', Buffer.byteLength(content), analysis.totalLines, JSON.stringify(analysis));

        return sendJson(res, 200, { success: true, logId, analysis });
      } catch (e) {
        return sendError(res, 400, e.message);
      }
    }

    return sendError(res, 404, `Endpoint not found: ${pathname}`);
  } catch (err) {
    console.error('[seo-intelligence-api] Unhandled error:', err);
    return sendError(res, 500, err.message || 'Internal SEO Intelligence server error');
  }
}

module.exports = {
  handleSeoIntelligenceRequest
};
