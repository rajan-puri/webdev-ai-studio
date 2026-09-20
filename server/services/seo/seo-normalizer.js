/**
 * server/services/seo/seo-normalizer.js
 * Enforces uniform metric structure across all SEO data providers.
 * ZERO FAKE DATA: If a metric is missing/unavailable, available=false and value=null.
 */

function normalizeMetric({
  value = null,
  source = 'unknown',
  sourceLabel = 'Unknown Source',
  fetchedAt = new Date().toISOString(),
  available = true,
  status = 'fresh',
  methodology = null,
  limitations = null,
  unit = null,
  raw = null
}) {
  const isAvailable = available && value !== null && value !== undefined && !Number.isNaN(value);

  return {
    value: isAvailable ? value : null,
    source,
    sourceLabel,
    fetchedAt: fetchedAt || new Date().toISOString(),
    status: isAvailable ? status : 'unavailable',
    available: isAvailable,
    methodology: methodology || undefined,
    limitations: limitations || undefined,
    unit: unit || undefined,
    raw: raw || undefined
  };
}

function createUnavailableMetric(source, sourceLabel, reason = 'Not connected or no data available', limitations = null) {
  return {
    value: null,
    source,
    sourceLabel,
    fetchedAt: new Date().toISOString(),
    status: 'unavailable',
    available: false,
    limitations: limitations || reason
  };
}

module.exports = {
  normalizeMetric,
  createUnavailableMetric
};
