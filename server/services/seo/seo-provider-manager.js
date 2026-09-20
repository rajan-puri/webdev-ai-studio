/**
 * server/services/seo/seo-provider-manager.js
 * Central coordinator for all SEO data providers.
 * Enforces user isolation, caching, graceful degradation, and zero fake data.
 */

const { db } = require('../../data/database');
const { getAllDataSources, getDataSourceById } = require('./seoDataSources');
const OwnCrawlerProvider = require('./providers/own-crawler');
const GoogleSearchConsoleProvider = require('./providers/google-search-console');
const BingWebmasterProvider = require('./providers/bing-webmaster');
const AhrefsProvider = require('./providers/ahrefs');
const PageSpeedProvider = require('./providers/pagespeed');
const { SemrushProvider, DataForSeoProvider, MozProvider } = require('./providers/future');
const { normalizeMetric, createUnavailableMetric } = require('./seo-normalizer');
const SeoCache = require('./seo-cache');

class SeoProviderManager {
  /**
   * Get overall connectivity and health status across all providers for user
   */
  static async getProvidersStatus(userId) {
    const [gscStatus, bingStatus, ahrefsStatus, pagespeedStatus] = await Promise.all([
      GoogleSearchConsoleProvider.getConnectionStatus(userId),
      BingWebmasterProvider.getConnectionStatus(userId),
      AhrefsProvider.getConnectionStatus(userId),
      PageSpeedProvider.getConnectionStatus(userId)
    ]);

    return {
      'own-crawler': {
        connected: true,
        available: true,
        status: 'available',
        sourceLabel: OwnCrawlerProvider.label,
        costModel: 'FREE'
      },
      'google-search-console': gscStatus,
      'bing-webmaster': bingStatus,
      'ahrefs': ahrefsStatus,
      'pagespeed': pagespeedStatus,
      'semrush': SemrushProvider.getStatus(),
      'dataforseo': DataForSeoProvider.getStatus(),
      'moz': MozProvider.getStatus()
    };
  }

  /**
   * Aggregated Domain Overview combining all connected providers
   */
  static async getDomainOverview(domain, userId, options = {}) {
    if (!domain) throw new Error('Target domain is required.');

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const targetUrl = `https://${cleanDomain}/`;

    // 1. Check latest own-crawler audit for this domain
    const latestAudit = db.prepare(`
      SELECT * FROM seo_audits 
      WHERE user_id = ? AND url LIKE ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, `%${cleanDomain}%`);

    let crawlerData = null;
    if (latestAudit) {
      const pages = db.prepare('SELECT * FROM seo_pages WHERE audit_id = ?').all(latestAudit.id);
      const issues = db.prepare('SELECT * FROM seo_issues WHERE audit_id = ?').all(latestAudit.id);
      crawlerData = OwnCrawlerProvider.normalizeAuditData(latestAudit, pages, issues);
      crawlerData.auditId = latestAudit.id;
    } else {
      crawlerData = {
        available: false,
        sourceLabel: OwnCrawlerProvider.label,
        message: 'No completed site crawl found for this domain. Run a Site Audit to populate crawl metrics.'
      };
    }

    // 2. Ahrefs Domain Rating
    let ahrefsData = null;
    try {
      ahrefsData = await AhrefsProvider.getDomainRating(cleanDomain, userId);
    } catch (e) {
      ahrefsData = AhrefsProvider.emptyMetricResponse(e.message);
    }

    // 3. Google Search Console Data (if user connected and has matching property)
    let gscData = null;
    try {
      const gscStatus = await GoogleSearchConsoleProvider.getConnectionStatus(userId);
      if (gscStatus.connected) {
        // Find matching property for this domain
        const matchingProp = (gscStatus.properties || []).find(p => 
          p.property_id.includes(cleanDomain) || cleanDomain.includes(p.property_name)
        ) || (gscStatus.properties || [])[0];

        if (matchingProp) {
          gscData = await GoogleSearchConsoleProvider.querySearchAnalytics(userId, matchingProp.property_id, {
            dateRange: options.dateRange || '28d',
            dimensions: ['date']
          });
        } else {
          gscData = {
            available: false,
            source: 'google-search-console',
            sourceLabel: 'Google Search Console',
            message: `Connected, but no verified property found matching "${cleanDomain}".`
          };
        }
      } else {
        gscData = {
          available: false,
          source: 'google-search-console',
          sourceLabel: 'Google Search Console',
          message: 'Connect Google Search Console in Settings to view clicks, impressions, and queries.'
        };
      }
    } catch (e) {
      gscData = { available: false, source: 'google-search-console', sourceLabel: 'Google Search Console', message: e.message };
    }

    // 4. Bing Webmaster Data
    let bingData = null;
    try {
      const bingStatus = await BingWebmasterProvider.getConnectionStatus(userId);
      if (bingStatus.connected) {
        const matchingSite = (bingStatus.properties || []).find(p => p.property_id.includes(cleanDomain)) || (bingStatus.properties || [])[0];
        if (matchingSite) {
          bingData = await BingWebmasterProvider.getRankAndTrafficStats(userId, matchingSite.property_id);
        } else {
          bingData = { available: false, source: 'bing-webmaster', sourceLabel: 'Bing Webmaster', message: 'No registered Bing site matching domain.' };
        }
      } else {
        bingData = { available: false, source: 'bing-webmaster', sourceLabel: 'Bing Webmaster', message: 'Connect Bing Webmaster in Settings to view Bing search stats.' };
      }
    } catch (e) {
      bingData = { available: false, source: 'bing-webmaster', sourceLabel: 'Bing Webmaster', message: e.message };
    }

    // 5. PageSpeed Data (if cached or requested)
    let pagespeedData = null;
    const cachedPs = SeoCache.get(`pagespeed:mobile:${targetUrl}`);
    if (cachedPs) {
      pagespeedData = cachedPs;
    } else {
      pagespeedData = {
        available: false,
        source: 'pagespeed',
        sourceLabel: 'Google PageSpeed Insights',
        message: 'PageSpeed performance audit not yet executed for this domain.'
      };
    }

    return {
      domain: cleanDomain,
      targetUrl,
      generatedAt: new Date().toISOString(),
      providers: {
        crawler: crawlerData,
        ahrefs: ahrefsData,
        gsc: gscData,
        bing: bingData,
        pagespeed: pagespeedData
      }
    };
  }

  /**
   * Run full technical & authority comparison between target domain and competitor domain
   */
  static async compareDomains(targetDomain, competitorDomain, userId) {
    if (!targetDomain || !competitorDomain) {
      throw new Error('Both target domain and competitor domain are required.');
    }

    const tDomain = targetDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const cDomain = competitorDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    // Fetch Ahrefs Domain Rating for both
    const [tAhrefs, cAhrefs] = await Promise.all([
      AhrefsProvider.getDomainRating(tDomain, userId).catch(e => ({ domainRating: { value: null } })),
      AhrefsProvider.getDomainRating(cDomain, userId).catch(e => ({ domainRating: { value: null } }))
    ]);

    // Check latest audits for each domain
    const tAudit = db.prepare(`
      SELECT * FROM seo_audits WHERE user_id = ? AND url LIKE ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1
    `).get(userId, `%${tDomain}%`);

    const cAudit = db.prepare(`
      SELECT * FROM seo_audits WHERE user_id = ? AND url LIKE ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1
    `).get(userId, `%${cDomain}%`);

    const comparison = {
      target: {
        domain: tDomain,
        domainRating: tAhrefs.domainRating || { value: null, available: false },
        auditFound: Boolean(tAudit),
        healthScore: tAudit ? tAudit.health_score : null,
        pagesCrawled: tAudit ? tAudit.pages_crawled : null,
        errorsCount: tAudit ? tAudit.errors_count : null,
        warningsCount: tAudit ? tAudit.warnings_count : null
      },
      competitor: {
        domain: cDomain,
        domainRating: cAhrefs.domainRating || { value: null, available: false },
        auditFound: Boolean(cAudit),
        healthScore: cAudit ? cAudit.health_score : null,
        pagesCrawled: cAudit ? cAudit.pages_crawled : null,
        errorsCount: cAudit ? cAudit.errors_count : null,
        warningsCount: cAudit ? cAudit.warnings_count : null
      },
      authorityGap: {
        winner: (tAhrefs.domainRating?.value || 0) >= (cAhrefs.domainRating?.value || 0) ? tDomain : cDomain,
        diff: Math.abs((tAhrefs.domainRating?.value || 0) - (cAhrefs.domainRating?.value || 0)),
        source: 'Ahrefs Domain Rating'
      },
      limitations: 'Authority comparison uses official Ahrefs Domain Rating. Organic keyword gap and search volume require future paid intelligence provider.'
    };

    // Save competitor relation in database
    const compId = `comp_${userId}_${Buffer.from(cDomain).toString('hex').slice(0, 12)}`;
    try {
      db.prepare(`
        INSERT INTO seo_competitors (id, user_id, target_domain, competitor_domain, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO NOTHING
      `).run(compId, userId, tDomain, cDomain);
    } catch (e) {}

    return comparison;
  }
}

module.exports = SeoProviderManager;
