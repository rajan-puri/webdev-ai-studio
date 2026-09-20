/**
 * server/services/seo/providers/ahrefs/index.js
 * Ahrefs Free Public API Provider
 * Delivers official Ahrefs Domain Rating (DR) with mandatory attribution.
 * ZERO FAKE DATA: Strictly calls official Ahrefs endpoints or marks unavailable.
 */

const https = require('https');
const { db } = require('../../../../data/database');
const { normalizeMetric } = require('../../seo-normalizer');
const SeoCache = require('../../seo-cache');

const AHREFS_API_BASE = 'https://api.ahrefs.com/v3';

class AhrefsProvider {
  static get id() { return 'ahrefs'; }
  static get label() { return 'Ahrefs'; }
  static get attribution() { return 'Domain Rating by Ahrefs'; }

  /**
   * Resolve API key from environment or user connection
   */
  static getApiKey(userId = null) {
    if (userId) {
      const conn = db.prepare('SELECT api_key FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);
      if (conn && conn.api_key) return conn.api_key;
    }
    return process.env.AHREFS_API_KEY || '';
  }

  static isConfigured(userId = null) {
    return Boolean(this.getApiKey(userId));
  }

  /**
   * Save API key in user settings/connections
   */
  static async setApiKey(userId, apiKey) {
    const cleanKey = (apiKey || '').trim();
    const connId = 'conn_ahrefs_' + userId;

    if (!cleanKey) {
      db.prepare('DELETE FROM seo_provider_connections WHERE user_id = ? AND provider = ?').run(userId, this.id);
      return { success: true, connected: false };
    }

    // Verify key against Ahrefs API
    const testRes = await this.testConnection(cleanKey);
    if (!testRes.success) {
      throw new Error(testRes.error || 'Invalid Ahrefs API key.');
    }

    db.prepare(`
      INSERT INTO seo_provider_connections (
        id, user_id, provider, auth_type, api_key, status, updated_at
      ) VALUES (?, ?, ?, 'api_key', ?, 'connected', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        api_key = excluded.api_key,
        status = 'connected',
        error_message = null,
        updated_at = datetime('now')
    `).run(connId, userId, this.id, cleanKey);

    return { success: true, connected: true };
  }

  static async testConnection(apiKey) {
    try {
      // Test lookup for a well-known domain like google.com
      const res = await this.fetchDomainRating('google.com', apiKey);
      if (res && res.domainRating !== undefined) {
        return { success: true, sampleDr: res.domainRating };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Connection test to Ahrefs API failed' };
    }
  }

  static async getConnectionStatus(userId) {
    const key = this.getApiKey(userId);
    const conn = db.prepare('SELECT updated_at, status FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);

    return {
      connected: Boolean(key),
      available: Boolean(key),
      sourceLabel: this.label,
      attributionNotice: this.attribution,
      status: key ? 'connected' : 'disconnected',
      hasEnvKey: Boolean(process.env.AHREFS_API_KEY),
      lastSync: conn ? conn.updated_at : null
    };
  }

  /**
   * Fetch Domain Rating (DR) for target domain
   * @param {string} domain 
   * @param {string} [overrideKey] 
   * @param {string} [userId]
   */
  static async getDomainRating(domain, userId = null, overrideKey = null) {
    if (!domain) {
      return this.emptyMetricResponse('Domain is required');
    }

    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const apiKey = overrideKey || this.getApiKey(userId);

    if (!apiKey) {
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        attribution: this.attribution,
        domain: cleanDomain,
        domainRating: normalizeMetric({
          value: null,
          source: this.id,
          sourceLabel: this.label,
          available: false,
          limitations: 'Ahrefs API key required. Configure in Settings -> SEO Data Providers.'
        })
      };
    }

    const cacheKey = `${this.id}:dr:${cleanDomain}`;
    const cached = SeoCache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchDomainRating(cleanDomain, apiKey);
      const drValue = data.domainRating !== undefined ? data.domainRating : (data.dr !== undefined ? data.dr : null);

      const result = {
        available: drValue !== null,
        source: this.id,
        sourceLabel: this.label,
        attribution: this.attribution,
        domain: cleanDomain,
        fetchedAt: new Date().toISOString(),
        domainRating: normalizeMetric({
          value: drValue,
          source: this.id,
          sourceLabel: 'Ahrefs Domain Rating',
          fetchedAt: new Date().toISOString(),
          available: drValue !== null,
          methodology: 'Logarithmic 0-100 scale measuring backlink profile strength by Ahrefs',
          limitations: 'Calculated by Ahrefs algorithm. Backlink totals require paid subscription.'
        }),
        raw: {
          ahrefsTop: data.ahrefsTop || null
        }
      };

      // Cache for 24 hours
      SeoCache.set(cacheKey, this.id, result, 24 * 3600);
      return result;
    } catch (e) {
      console.error('[ahrefs-provider] DR fetch error:', e.message);
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        attribution: this.attribution,
        domain: cleanDomain,
        error: e.message,
        domainRating: normalizeMetric({
          value: null,
          source: this.id,
          sourceLabel: this.label,
          available: false,
          limitations: e.message
        })
      };
    }
  }

  /**
   * Internal HTTP caller to Ahrefs Public API
   */
  static fetchDomainRating(domain, apiKey) {
    return new Promise((resolve, reject) => {
      // Official free domain rating public endpoint or fallback v3
      const url = `${AHREFS_API_BASE}/public/domain-rating-free?domain=${encodeURIComponent(domain)}`;
      const u = new URL(url);

      const reqOpts = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      };

      const req = https.request(reqOpts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Invalid JSON response from Ahrefs API'));
            }
          } else {
            reject(new Error(`Ahrefs API HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  static emptyMetricResponse(reason) {
    return {
      available: false,
      source: this.id,
      sourceLabel: this.label,
      attribution: this.attribution,
      domainRating: normalizeMetric({
        value: null,
        source: this.id,
        sourceLabel: this.label,
        available: false,
        limitations: reason
      })
    };
  }
}

module.exports = AhrefsProvider;
