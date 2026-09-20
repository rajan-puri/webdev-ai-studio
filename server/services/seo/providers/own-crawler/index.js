/**
 * server/services/seo/providers/own-crawler/index.js
 * Own Crawler Provider Adapter
 * Wraps our recursive BFS engine and generates normalized metrics with full attribution.
 */

const { normalizeMetric } = require('../../seo-normalizer');
const { runSeoCrawler, cancelSeoAudit } = require('../../crawler');

class OwnCrawlerProvider {
  static get id() { return 'own-crawler'; }
  static get label() { return 'WebDev Crawler'; }

  /**
   * Run crawl via existing crawler engine
   */
  static async executeCrawl(auditId, seedUrl, config, userId) {
    return await runSeoCrawler(auditId, seedUrl, config, userId);
  }

  static cancel(auditId) {
    return cancelSeoAudit(auditId);
  }

  /**
   * Transform raw crawled pages & issues into normalized intelligence metrics
   */
  static normalizeAuditData(audit, pages = [], issues = []) {
    const fetchedAt = audit.completed_at || audit.created_at || new Date().toISOString();
    const source = 'own-crawler';
    const sourceLabel = 'WebDev Crawler';

    const healthScore = normalizeMetric({
      value: audit.health_score !== undefined ? audit.health_score : null,
      source,
      sourceLabel,
      fetchedAt,
      methodology: 'Deterministic 100-point indexability & technical audit penalty score',
      limitations: 'Evaluates on-page and crawl signals; does not include external search traffic'
    });

    const pagesCrawled = normalizeMetric({
      value: audit.pages_crawled !== undefined ? audit.pages_crawled : pages.length,
      source,
      sourceLabel,
      fetchedAt,
      methodology: 'Count of unique internal HTML URLs crawled within domain scope'
    });

    const pagesDiscovered = normalizeMetric({
      value: audit.pages_discovered !== undefined ? audit.pages_discovered : pages.length,
      source,
      sourceLabel,
      fetchedAt,
      methodology: 'Total internal URLs discovered via HTML links, XML sitemaps, and robots.txt'
    });

    const errorsCount = normalizeMetric({
      value: audit.errors_count !== undefined ? audit.errors_count : issues.filter(i => i.severity === 'ERROR').length,
      source,
      sourceLabel,
      fetchedAt,
      status: audit.errors_count > 0 ? 'error' : 'pass'
    });

    const warningsCount = normalizeMetric({
      value: audit.warnings_count !== undefined ? audit.warnings_count : issues.filter(i => i.severity === 'WARNING').length,
      source,
      sourceLabel,
      fetchedAt,
      status: audit.warnings_count > 0 ? 'warning' : 'pass'
    });

    const noticesCount = normalizeMetric({
      value: audit.notices_count !== undefined ? audit.notices_count : issues.filter(i => i.severity === 'NOTICE').length,
      source,
      sourceLabel,
      fetchedAt
    });

    // Extract link profile discovered by crawler
    let totalInternalLinks = 0;
    let totalExternalLinks = 0;
    pages.forEach(p => {
      totalInternalLinks += p.incoming_links_count || 0;
      totalExternalLinks += p.outgoing_links_count || 0;
    });

    const discoveredInternalLinks = normalizeMetric({
      value: totalInternalLinks,
      source,
      sourceLabel,
      fetchedAt,
      methodology: 'Sum of internal link relationships discovered on crawled pages'
    });

    const discoveredExternalLinks = normalizeMetric({
      value: totalExternalLinks,
      source,
      sourceLabel,
      fetchedAt,
      methodology: 'Discovered external outgoing links pointing off-domain from crawled pages',
      limitations: 'Web crawl discovered links only; not an external backlink index'
    });

    return {
      healthScore,
      pagesCrawled,
      pagesDiscovered,
      errorsCount,
      warningsCount,
      noticesCount,
      discoveredInternalLinks,
      discoveredExternalLinks,
      coverageStatus: audit.coverage_status || 'FULL_SITE_CRAWL',
      coverage: audit.coverage || {}
    };
  }
}

module.exports = OwnCrawlerProvider;
