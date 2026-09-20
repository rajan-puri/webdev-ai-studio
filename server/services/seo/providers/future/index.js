/**
 * server/services/seo/providers/future/index.js
 * Future Paid SEO Provider Stubs & Interfaces.
 * Prepares plug-and-play interfaces for Semrush, DataForSEO, and Moz.
 * ZERO FAKE DATA: Strictly returns capability status COMING_SOON and available: false.
 */

class FutureProviderInterface {
  constructor(id, label, description) {
    this.id = id;
    this.label = label;
    this.description = description;
    this.status = 'COMING_SOON';
  }

  isAvailable() {
    return false;
  }

  getStatus() {
    return {
      id: this.id,
      label: this.label,
      status: 'COMING_SOON',
      available: false,
      costModel: 'PAID',
      message: `${this.label} integration requires an enterprise API subscription. Interface prepared for future activation.`
    };
  }

  async getKeywordMetrics(query) {
    return {
      available: false,
      source: this.id,
      sourceLabel: this.label,
      query,
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      message: `Keyword search volume database requires a connected external intelligence provider like ${this.label}.`
    };
  }

  async getBacklinks(domain) {
    return {
      available: false,
      source: this.id,
      sourceLabel: this.label,
      domain,
      totalBacklinks: null,
      referringDomains: null,
      message: `Comprehensive global backlink indexing requires an external intelligence provider like ${this.label}.`
    };
  }
}

const SemrushProvider = new FutureProviderInterface(
  'semrush',
  'Semrush API',
  'Global keyword volume database, SERP tracking, and backlink index.'
);

const DataForSeoProvider = new FutureProviderInterface(
  'dataforseo',
  'DataForSEO API',
  'On-demand SERP scraping and keyword data API. (Note: sandbox data is not production data).'
);

const MozProvider = new FutureProviderInterface(
  'moz',
  'Moz API',
  'Domain Authority (DA) and Spam Score metrics.'
);

module.exports = {
  FutureProviderInterface,
  SemrushProvider,
  DataForSeoProvider,
  MozProvider
};
