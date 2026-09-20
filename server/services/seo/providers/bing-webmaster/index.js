/**
 * server/services/seo/providers/bing-webmaster/index.js
 * Bing Webmaster Tools Provider
 * Implements modern REST/JSON API for Bing site performance, keywords, and crawl stats.
 * ZERO FAKE DATA: strictly returns real Bing data or marks unavailable.
 */

const https = require('https');
const { db } = require('../../../../data/database');
const { normalizeMetric, createUnavailableMetric } = require('../../seo-normalizer');
const SeoCache = require('../../seo-cache');

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

class BingWebmasterProvider {
  static get id() { return 'bing-webmaster'; }
  static get label() { return 'Bing Webmaster'; }

  /**
   * Connect with API key
   */
  static async connect(userId, apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('Bing Webmaster API key is required.');
    }

    const cleanKey = apiKey.trim();

    // Verify key by testing GetUserSites
    const sites = await this.fetchUserSites(cleanKey);

    const connId = 'conn_bing_' + userId;

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

    // Sync discovered sites into properties table
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      const siteUrl = site.Url || site.url || site;
      const propId = `prop_bing_${userId}_${Buffer.from(siteUrl).toString('hex').slice(0, 16)}`;
      const isSelected = i === 0 ? 1 : 0;

      db.prepare(`
        INSERT INTO seo_provider_properties (
          id, user_id, connection_id, provider, property_id, property_name, is_selected, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          property_name = excluded.property_name,
          updated_at = datetime('now')
      `).run(propId, userId, connId, this.id, siteUrl, siteUrl, isSelected);
    }

    return { success: true, sitesCount: sites.length };
  }

  static disconnect(userId) {
    db.prepare('DELETE FROM seo_provider_connections WHERE user_id = ? AND provider = ?').run(userId, this.id);
    db.prepare('DELETE FROM seo_provider_properties WHERE user_id = ? AND provider = ?').run(userId, this.id);
    SeoCache.invalidateProvider(this.id);
    return true;
  }

  static async getConnectionStatus(userId) {
    const conn = db.prepare(`
      SELECT * FROM seo_provider_connections 
      WHERE user_id = ? AND provider = ?
    `).get(userId, this.id);

    if (!conn || conn.status !== 'connected' || !conn.api_key) {
      return {
        connected: false,
        available: false,
        sourceLabel: this.label,
        status: 'disconnected'
      };
    }

    const properties = db.prepare(`
      SELECT property_id, property_name, is_selected, updated_at
      FROM seo_provider_properties 
      WHERE user_id = ? AND provider = ?
      ORDER BY is_selected DESC, property_name ASC
    `).all(userId, this.id);

    const selectedProp = properties.find(p => p.is_selected) || properties[0] || null;

    return {
      connected: true,
      available: true,
      sourceLabel: this.label,
      lastSync: conn.updated_at,
      status: conn.status,
      properties,
      selectedProperty: selectedProp ? selectedProp.property_id : null
    };
  }

  static async fetchUserSites(apiKey) {
    const url = `${BING_API_BASE}/GetUserSites?apikey=${encodeURIComponent(apiKey)}`;
    const res = await this.httpRequest(url);
    const data = JSON.parse(res);
    return data.d || [];
  }

  /**
   * Get rank & traffic statistics for site
   */
  static async getRankAndTrafficStats(userId, siteUrl) {
    const conn = db.prepare('SELECT api_key FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);
    if (!conn || !conn.api_key) {
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        error: 'Bing Webmaster Tools not connected'
      };
    }

    const cacheKey = `${this.id}:traffic:${siteUrl}`;
    const cached = SeoCache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = `${BING_API_BASE}/GetRankAndTrafficStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(conn.api_key)}`;
      const res = await this.httpRequest(url);
      const data = JSON.parse(res);
      const stats = data.d || [];

      let totalClicks = 0;
      let totalImpressions = 0;

      stats.forEach(s => {
        totalClicks += s.Clicks || 0;
        totalImpressions += s.Impressions || 0;
      });

      const result = {
        available: true,
        source: this.id,
        sourceLabel: this.label,
        fetchedAt: new Date().toISOString(),
        siteUrl,
        totals: {
          clicks: normalizeMetric({ value: totalClicks, source: this.id, sourceLabel: this.label }),
          impressions: normalizeMetric({ value: totalImpressions, source: this.id, sourceLabel: this.label })
        },
        stats: stats.map(s => ({
          date: s.Date ? s.Date.slice(0, 10) : '',
          clicks: s.Clicks || 0,
          impressions: s.Impressions || 0
        }))
      };

      SeoCache.set(cacheKey, this.id, result, 6 * 3600);
      return result;
    } catch (e) {
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        error: e.message || 'Failed to fetch Bing Webmaster traffic stats'
      };
    }
  }

  /**
   * Get query keyword statistics from Bing
   */
  static async getQueryStats(userId, siteUrl) {
    const conn = db.prepare('SELECT api_key FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);
    if (!conn || !conn.api_key) {
      return { available: false, source: this.id, sourceLabel: this.label, error: 'Bing Webmaster not connected' };
    }

    const cacheKey = `${this.id}:queries:${siteUrl}`;
    const cached = SeoCache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = `${BING_API_BASE}/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(conn.api_key)}`;
      const res = await this.httpRequest(url);
      const data = JSON.parse(res);
      const queries = data.d || [];

      const result = {
        available: true,
        source: this.id,
        sourceLabel: this.label,
        fetchedAt: new Date().toISOString(),
        siteUrl,
        queries: queries.map(q => ({
          query: q.Query || '',
          clicks: q.Clicks || 0,
          impressions: q.Impressions || 0,
          avgPosition: q.AvgImpressionPosition ? parseFloat(q.AvgImpressionPosition.toFixed(1)) : null
        }))
      };

      SeoCache.set(cacheKey, this.id, result, 6 * 3600);
      return result;
    } catch (e) {
      return { available: false, source: this.id, sourceLabel: this.label, error: e.message };
    }
  }

  static httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const reqOpts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = https.request(reqOpts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`Bing API HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = BingWebmasterProvider;
