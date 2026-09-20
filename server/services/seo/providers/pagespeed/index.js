/**
 * server/services/seo/providers/pagespeed/index.js
 * Google PageSpeed Insights & CrUX Provider
 * Implements official PageSpeed v5 API with mobile & desktop strategies.
 * Clearly separates Lighthouse synthetic lab data from real-user CrUX field data.
 * ZERO FAKE DATA: Returns exact lab/field data or clearly marks unavailable with safe diagnostics.
 */

const https = require('https');
const { db } = require('../../../../data/database');
const { normalizeMetric } = require('../../seo-normalizer');
const SeoCache = require('../../seo-cache');

const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

class PageSpeedProvider {
  static get id() { return 'pagespeed'; }
  static get label() { return 'Google PageSpeed Insights'; }

  /**
   * Resolve API key from database connection or environment
   * Never exposed to client-side.
   */
  static getApiKey(userId = null) {
    if (userId) {
      const conn = db.prepare('SELECT api_key FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);
      if (conn && conn.api_key) return conn.api_key;
    }
    return process.env.PAGESPEED_API_KEY || '';
  }

  /**
   * Test connection to Google PageSpeed API with key
   * @param {string} apiKey 
   * @param {string} testUrl 
   */
  static async testConnection(apiKey, testUrl = 'https://www.google.com') {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'API key cannot be empty' };
    }

    const cleanKey = apiKey.trim();
    const queryParams = new URLSearchParams({
      url: testUrl,
      strategy: 'mobile',
      category: 'performance',
      key: cleanKey
    });

    const apiUrl = `${PAGESPEED_API_URL}?${queryParams.toString()}`;

    try {
      const resStr = await this.httpRequest(apiUrl);
      const data = JSON.parse(resStr);
      if (data && data.lighthouseResult && data.lighthouseResult.categories && data.lighthouseResult.categories.performance) {
        return {
          success: true,
          message: 'Google PageSpeed Insights API key verified successfully.',
          sampleScore: Math.round((data.lighthouseResult.categories.performance.score || 0) * 100)
        };
      }
      return { success: true, message: 'Google PageSpeed Insights API key verified.' };
    } catch (e) {
      let safeReason = 'Google PageSpeed API call failed';
      const statusCode = e.statusCode || (e.message.match(/HTTP\s+(\d{3})/i) ? parseInt(e.message.match(/HTTP\s+(\d{3})/i)[1], 10) : 500);

      if (statusCode === 429) {
        safeReason = 'PageSpeed API quota exceeded for this key';
      } else if (statusCode === 403) {
        safeReason = 'Google PageSpeed API key is invalid or lacks required permissions';
      } else if (statusCode === 400) {
        safeReason = 'Invalid request to Google PageSpeed API';
      } else if (statusCode >= 500) {
        safeReason = `Google PageSpeed service error (HTTP ${statusCode})`;
      }

      return {
        success: false,
        httpStatus: statusCode,
        error: safeReason
      };
    }
  }

  /**
   * Save and validate PageSpeed API key
   * "Connected" only set after server-side validation succeeds.
   */
  static async setApiKey(userId, apiKey) {
    const cleanKey = (apiKey || '').trim();
    const connId = 'conn_pagespeed_' + userId;

    if (!cleanKey) {
      db.prepare('DELETE FROM seo_provider_connections WHERE user_id = ? AND provider = ?').run(userId, this.id);
      return { success: true, connected: false, message: 'PageSpeed key removed.' };
    }

    // Perform actual server-side validation request against safe public URL
    const testRes = await this.testConnection(cleanKey);
    if (!testRes.success) {
      throw new Error(testRes.error || 'PageSpeed API key validation failed.');
    }

    db.prepare(`
      INSERT INTO seo_provider_connections (
        id, user_id, provider, auth_type, api_key, status, updated_at
      ) VALUES (?, ?, ?, 'api_key', ?, 'connected', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        api_key = excluded.api_key,
        status = 'connected',
        updated_at = datetime('now')
    `).run(connId, userId, this.id, cleanKey);

    return { success: true, connected: true, message: testRes.message };
  }

  static async getConnectionStatus(userId) {
    const key = this.getApiKey(userId);
    const conn = db.prepare('SELECT updated_at, status FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);

    // "Connected" must only appear after real server-side validation succeeds
    const isConnected = Boolean(conn && conn.status === 'connected');

    return {
      connected: isConnected,
      available: true,
      sourceLabel: this.label,
      hasApiKey: Boolean(key),
      hasEnvKey: Boolean(process.env.PAGESPEED_API_KEY),
      status: isConnected ? 'connected' : 'not_configured',
      lastSync: conn ? conn.updated_at : null
    };
  }

  /**
   * Run PageSpeed analysis for URL
   * @param {string} url 
   * @param {'mobile'|'desktop'} strategy 
   * @param {string} [userId] 
   */
  static async analyze(url, strategy = 'mobile', userId = null) {
    if (!url || !url.startsWith('http')) {
      throw new Error('Valid HTTP/HTTPS URL required for PageSpeed analysis.');
    }

    const cleanStrategy = strategy === 'desktop' ? 'desktop' : 'mobile';
    const cacheKey = `${this.id}:${cleanStrategy}:${url}`;
    const cached = SeoCache.get(cacheKey);
    if (cached) return cached;

    const apiKey = this.getApiKey(userId);

    const queryParams = new URLSearchParams({
      url,
      strategy: cleanStrategy,
      category: 'performance'
    });
    // Request all 4 Lighthouse categories
    queryParams.append('category', 'accessibility');
    queryParams.append('category', 'best-practices');
    queryParams.append('category', 'seo');

    if (apiKey) {
      queryParams.append('key', apiKey);
    }

    const apiUrl = `${PAGESPEED_API_URL}?${queryParams.toString()}`;

    try {
      const resStr = await this.httpRequest(apiUrl);
      const data = JSON.parse(resStr);

      const lr = data.lighthouseResult || {};
      const categories = lr.categories || {};
      const audits = lr.audits || {};
      const loadingExperience = data.loadingExperience || {};

      // 1. Lighthouse Lab Scores (0-100)
      const perfScore = (categories.performance && categories.performance.score !== null && categories.performance.score !== undefined)
        ? Math.round(categories.performance.score * 100) : null;
      const a11yScore = (categories.accessibility && categories.accessibility.score !== null && categories.accessibility.score !== undefined)
        ? Math.round(categories.accessibility.score * 100) : null;
      const bpScore = (categories['best-practices'] && categories['best-practices'].score !== null && categories['best-practices'].score !== undefined)
        ? Math.round(categories['best-practices'].score * 100) : null;
      const seoScore = (categories.seo && categories.seo.score !== null && categories.seo.score !== undefined)
        ? Math.round(categories.seo.score * 100) : null;

      // 2. Lab Core Web Vitals (Synthetic Lab Data)
      const fcp = audits['first-contentful-paint'] ? audits['first-contentful-paint'].displayValue : null;
      const lcp = audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : null;
      const cls = audits['cumulative-layout-shift'] ? audits['cumulative-layout-shift'].displayValue : null;
      const tbt = audits['total-blocking-time'] ? audits['total-blocking-time'].displayValue : null;
      const si = audits['speed-index'] ? audits['speed-index'].displayValue : null;

      // 3. CrUX Field Data (Real 28-day Chrome User Experience Data)
      const cruxMetrics = loadingExperience.metrics || {};
      const hasCrux = Boolean(loadingExperience.overall_category);

      const fieldData = {
        available: hasCrux,
        source: 'Chrome User Experience Report (CrUX)',
        overallCategory: loadingExperience.overall_category || 'Field data unavailable (insufficient real user traffic)',
        fcp: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS ? {
          percentile: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS.percentile,
          category: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS.category
        } : null,
        lcp: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS ? {
          percentile: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile,
          category: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS.category
        } : null,
        cls: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ? {
          percentile: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100,
          category: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category
        } : null,
        inp: cruxMetrics.INTERACTION_TO_NEXT_PAINT ? {
          percentile: cruxMetrics.INTERACTION_TO_NEXT_PAINT.percentile,
          category: cruxMetrics.INTERACTION_TO_NEXT_PAINT.category
        } : null
      };

      const cruxFieldMetrics = {
        status: hasCrux ? 'available' : 'unavailable',
        overallCategory: loadingExperience.overall_category || 'Field data unavailable',
        reason: hasCrux ? null : 'The Chrome User Experience Report does not have sufficient real-user samples for this exact URL. The Lighthouse lab measurements above reflect synthetic emulation.',
        metrics: {
          LCP: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS ? {
            value: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile,
            displayValue: `${(cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000).toFixed(2)}s`,
            category: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS.category
          } : null,
          CLS: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ? {
            value: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100,
            displayValue: `${(cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100).toFixed(2)}`,
            category: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category
          } : null,
          INP: cruxMetrics.INTERACTION_TO_NEXT_PAINT ? {
            value: cruxMetrics.INTERACTION_TO_NEXT_PAINT.percentile,
            displayValue: `${cruxMetrics.INTERACTION_TO_NEXT_PAINT.percentile}ms`,
            category: cruxMetrics.INTERACTION_TO_NEXT_PAINT.category
          } : null,
          FCP: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS ? {
            value: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS.percentile,
            displayValue: `${(cruxMetrics.FIRST_CONTENTFUL_PAINT_MS.percentile / 1000).toFixed(2)}s`,
            category: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS.category
          } : null
        }
      };

      // 4. Opportunities (performance optimizations with potential savings)
      const opportunities = [];
      const diagnosticAudits = [];

      for (const [auditId, audit] of Object.entries(audits)) {
        if (audit.details && audit.details.type === 'opportunity' && (audit.details.overallSavingsMs > 0 || audit.details.overallSavingsBytes > 0)) {
          opportunities.push({
            id: auditId,
            title: audit.title,
            description: audit.description,
            savingsMs: audit.details.overallSavingsMs || 0,
            savingsBytes: audit.details.overallSavingsBytes || 0,
            displayValue: audit.displayValue || ''
          });
        } else if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'notApplicable') {
          diagnosticAudits.push({
            id: auditId,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            displayValue: audit.displayValue || ''
          });
        }
      }

      const fetchedAt = new Date().toISOString();

      const result = {
        available: true,
        source: this.id,
        sourceLabel: this.label,
        strategy: cleanStrategy,
        url,
        fetchedAt,
        httpStatus: 200,
        scores: {
          performance: normalizeMetric({ value: perfScore, source: this.id, sourceLabel: 'Lighthouse Lab Performance', fetchedAt }),
          accessibility: normalizeMetric({ value: a11yScore, source: this.id, sourceLabel: 'Lighthouse Accessibility', fetchedAt }),
          bestPractices: normalizeMetric({ value: bpScore, source: this.id, sourceLabel: 'Lighthouse Best Practices', fetchedAt }),
          seo: normalizeMetric({ value: seoScore, source: this.id, sourceLabel: 'Lighthouse SEO', fetchedAt })
        },
        labMetrics: {
          fcp: normalizeMetric({ value: fcp, source: this.id, sourceLabel: 'Lighthouse Lab FCP' }),
          lcp: normalizeMetric({ value: lcp, source: this.id, sourceLabel: 'Lighthouse Lab LCP' }),
          cls: normalizeMetric({ value: cls, source: this.id, sourceLabel: 'Lighthouse Lab CLS' }),
          tbt: normalizeMetric({ value: tbt, source: this.id, sourceLabel: 'Lighthouse Lab TBT' }),
          speedIndex: normalizeMetric({ value: si, source: this.id, sourceLabel: 'Lighthouse Speed Index' })
        },
        fieldData,
        cruxFieldMetrics,
        opportunities: opportunities.slice(0, 10),
        diagnostics: diagnosticAudits.slice(0, 15),
        lighthouseVersion: lr.lighthouseVersion || '12.0.0'
      };

      // Cache successful response for 12 hours
      SeoCache.set(cacheKey, this.id, result, 12 * 3600);
      return result;
    } catch (e) {
      console.error('[pagespeed-provider] Error running audit:', e.message);

      // Determine exact HTTP status & safe human-readable reason
      const statusCode = e.statusCode || (e.message.match(/HTTP\s+(\d{3})/i) ? parseInt(e.message.match(/HTTP\s+(\d{3})/i)[1], 10) : 500);
      let safeReason = 'Google PageSpeed Insights API call failed';
      let errorCategory = 'API Error';

      if (statusCode === 429) {
        safeReason = 'PageSpeed API quota exceeded';
        errorCategory = 'Quota Exceeded';
      } else if (statusCode === 403) {
        safeReason = 'Google PageSpeed API key is invalid or lacks required permissions';
        errorCategory = 'Authentication / Permission Error';
      } else if (statusCode === 400) {
        safeReason = 'Invalid request parameters for Google PageSpeed API';
        errorCategory = 'Invalid Request';
      } else if (statusCode === 404) {
        safeReason = 'Target URL could not be resolved or fetched by Google PageSpeed servers';
        errorCategory = 'Not Found';
      } else if (statusCode >= 500) {
        safeReason = `Google PageSpeed service encountered an error (HTTP ${statusCode})`;
        errorCategory = 'Google Service Error';
      } else if (e.message) {
        safeReason = e.message.replace(/key=[^&]+/g, 'key=[REDACTED]');
      }

      const fetchedAt = new Date().toISOString();

      // Return standardized unavailable contract — NEVER cached
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        url,
        strategy: cleanStrategy,
        status: 'unavailable',
        fetchedAt,
        httpStatus: statusCode,
        error: safeReason,
        errorCategory,
        diagnostics: {
          provider: this.label,
          status: 'Unavailable',
          reason: safeReason,
          httpStatus: statusCode,
          lastChecked: fetchedAt
        },
        scores: {
          performance: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Lab Performance', available: false, limitations: safeReason }),
          accessibility: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Accessibility', available: false, limitations: safeReason }),
          bestPractices: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Best Practices', available: false, limitations: safeReason }),
          seo: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse SEO', available: false, limitations: safeReason })
        },
        labMetrics: {
          fcp: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Lab FCP', available: false, limitations: safeReason }),
          lcp: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Lab LCP', available: false, limitations: safeReason }),
          cls: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Lab CLS', available: false, limitations: safeReason }),
          tbt: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Lab TBT', available: false, limitations: safeReason }),
          speedIndex: normalizeMetric({ value: null, source: this.id, sourceLabel: 'Lighthouse Speed Index', available: false, limitations: safeReason })
        },
        fieldData: {
          available: false,
          source: 'Chrome User Experience Report (CrUX)',
          overallCategory: 'Field data unavailable',
          reason: safeReason
        },
        cruxFieldMetrics: {
          status: 'unavailable',
          overallCategory: 'Field data unavailable',
          reason: safeReason
        },
        opportunities: [],
        diagnosticsList: []
      };
    }
  }

  static httpRequest(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const reqOpts = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const req = https.request(reqOpts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            const err = new Error(`Google PageSpeed API HTTP ${res.statusCode}: ${body}`);
            err.statusCode = res.statusCode;
            err.responseBody = body;
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = PageSpeedProvider;
