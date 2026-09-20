/**
 * server/services/seo/seoDataSources.js
 * Central registry of all SEO data sources in WebDev AI Studio.
 * Defines capabilities, auth models, cost tiers, attribution requirements, and status.
 */

const SEO_DATA_SOURCES = [
  {
    id: 'own-crawler',
    name: 'WebDev AI Crawler',
    category: 'Technical & On-Page SEO',
    status: 'AVAILABLE',
    capabilities: [
      'full_site_crawl',
      'xml_sitemap_discovery',
      'robots_txt_analysis',
      'ai_bot_directives',
      'crawl_depth_hierarchy',
      'broken_link_detection',
      'redirect_chains',
      'onpage_meta_analysis',
      'heading_hierarchy',
      'schema_json_ld',
      'open_graph_twitter',
      'image_alt_checks',
      'playwright_js_rendering',
      'orphan_page_detection',
      'internal_link_graph'
    ],
    authType: 'none',
    costModel: 'FREE',
    attributionRequired: false,
    sourceLabel: 'WebDev Crawler',
    documentationUrl: '/docs/SEO_DATA_SOURCES.md#own-crawler',
    enabled: true,
    description: 'First-party recursive BFS web crawler with Playwright headless DOM rendering and deterministic SEO issue engine.'
  },
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    category: 'Organic Search Performance',
    status: 'CONNECTED_DATA',
    capabilities: [
      'search_queries',
      'organic_clicks',
      'impressions',
      'average_ctr',
      'average_position',
      'top_pages',
      'countries_distribution',
      'device_distribution',
      'search_appearance',
      'historical_trend_snapshots',
      'sitemap_indexing_status'
    ],
    authType: 'oauth2',
    oauthScope: 'https://www.googleapis.com/auth/webmasters.readonly',
    costModel: 'FREE',
    attributionRequired: true,
    sourceLabel: 'Google Search Console',
    documentationUrl: '/docs/API_INTEGRATIONS.md#google-search-console',
    enabled: true,
    description: 'Official first-party search performance analytics directly from Google for verified website properties.'
  },
  {
    id: 'bing-webmaster',
    name: 'Bing Webmaster Tools',
    category: 'Organic Search Performance',
    status: 'CONNECTED_DATA',
    capabilities: [
      'bing_rank_traffic_stats',
      'bing_keyword_queries',
      'bing_page_traffic',
      'bing_crawl_statistics',
      'bing_indexed_pages'
    ],
    authType: 'api_key',
    costModel: 'FREE',
    attributionRequired: true,
    sourceLabel: 'Bing Webmaster',
    documentationUrl: '/docs/API_INTEGRATIONS.md#bing-webmaster-tools',
    enabled: true,
    description: 'Official search performance, keyword rankings, and crawl statistics for Microsoft Bing and Yahoo search.'
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs Public API',
    category: 'Authority & Domain Metrics',
    status: 'AVAILABLE',
    capabilities: [
      'ahrefs_domain_rating',
      'competitor_domain_rating',
      'domain_rating_lookup'
    ],
    authType: 'api_key',
    costModel: 'FREE',
    attributionRequired: true,
    attributionNotice: 'Domain Rating by Ahrefs',
    sourceLabel: 'Ahrefs',
    documentationUrl: '/docs/API_INTEGRATIONS.md#ahrefs-public-api',
    enabled: true,
    description: 'Official Ahrefs Free Public API delivering Ahrefs Domain Rating (DR). Backlink details and keyword databases require future paid provider tiers.'
  },
  {
    id: 'pagespeed',
    name: 'Google PageSpeed Insights',
    category: 'Speed & Core Web Vitals',
    status: 'AVAILABLE',
    capabilities: [
      'lighthouse_performance',
      'lighthouse_accessibility',
      'lighthouse_best_practices',
      'lighthouse_seo',
      'lab_core_web_vitals',
      'crux_field_data',
      'audit_opportunities',
      'diagnostic_audits'
    ],
    authType: 'api_key_optional',
    costModel: 'FREE',
    attributionRequired: true,
    sourceLabel: 'Google PageSpeed',
    documentationUrl: '/docs/API_INTEGRATIONS.md#google-pagespeed-insights',
    enabled: true,
    description: 'Google PageSpeed Insights API delivering Lighthouse lab measurements and Chrome User Experience Report (CrUX) field data.'
  },
  {
    id: 'google-trends',
    name: 'Google Trends (Interest Over Time)',
    category: 'Keyword & Topic Research',
    status: 'ALPHA',
    capabilities: [
      'search_interest_trend',
      'related_queries'
    ],
    authType: 'none',
    costModel: 'FREE',
    attributionRequired: true,
    sourceLabel: 'Google Trends',
    documentationUrl: '/docs/API_INTEGRATIONS.md#google-trends',
    enabled: true,
    description: 'Search term interest exploration. Unofficial/alpha integration with rate limiting and polite caching.'
  },
  {
    id: 'semrush',
    name: 'Semrush API (Future Tier)',
    category: 'Competitive Intelligence & Keywords',
    status: 'COMING_SOON',
    capabilities: [
      'keyword_volume_database',
      'keyword_difficulty',
      'serp_competitor_positions',
      'backlink_database',
      'traffic_cost_estimates'
    ],
    authType: 'api_key',
    costModel: 'PAID',
    attributionRequired: true,
    sourceLabel: 'Semrush',
    documentationUrl: '/docs/FEATURE_MATRIX.md#future-providers',
    enabled: false,
    description: 'Enterprise paid intelligence provider placeholder. Plug-and-play provider interface prepared for future API key configuration.'
  },
  {
    id: 'dataforseo',
    name: 'DataForSEO (Future Tier)',
    category: 'SERP & Search Engine Scrapes',
    status: 'COMING_SOON',
    capabilities: [
      'live_serp_data',
      'google_ads_search_volume',
      'on_demand_backlinks',
      'keyword_suggestions'
    ],
    authType: 'api_key',
    costModel: 'PAID',
    attributionRequired: true,
    sourceLabel: 'DataForSEO',
    documentationUrl: '/docs/FEATURE_MATRIX.md#future-providers',
    enabled: false,
    description: 'High-volume SERP and SEO data API provider placeholder. Note: DataForSEO Sandbox data is never treated as real production data.'
  }
];

function getDataSourceById(id) {
  return SEO_DATA_SOURCES.find(s => s.id === id) || null;
}

function getAllDataSources() {
  return SEO_DATA_SOURCES;
}

function getEnabledDataSources() {
  return SEO_DATA_SOURCES.filter(s => s.enabled);
}

module.exports = {
  SEO_DATA_SOURCES,
  getDataSourceById,
  getAllDataSources,
  getEnabledDataSources
};
