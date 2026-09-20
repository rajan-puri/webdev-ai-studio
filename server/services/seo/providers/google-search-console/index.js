/**
 * server/services/seo/providers/google-search-console/index.js
 * Google Search Console Provider
 * Implements real OAuth 2.0 (webmasters.readonly scope) and Search Analytics API.
 * ZERO FAKE DATA: strictly returns real Google data or marks unavailable.
 */

const https = require('https');
const { db } = require('../../../../data/database');
const { normalizeMetric, createUnavailableMetric } = require('../../seo-normalizer');
const SeoCache = require('../../seo-cache');

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const GSC_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GSC_SITES_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';

class GoogleSearchConsoleProvider {
  static get id() { return 'google-search-console'; }
  static get label() { return 'Google Search Console'; }

  /**
   * Get configured client ID & secret from environment
   */
  static getOAuthConfig() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GSC_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GSC_CLIENT_SECRET || '',
      redirectUri: process.env.GSC_REDIRECT_URI || 'http://127.0.0.1:3000/api/seo/providers/gsc/oauth-callback'
    };
  }

  /**
   * Check if GSC OAuth is configured in environment
   */
  static isConfigured() {
    const { clientId, clientSecret } = this.getOAuthConfig();
    return Boolean(clientId && clientSecret);
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  static generateAuthUrl(userId, stateSuffix = '') {
    const { clientId, redirectUri } = this.getOAuthConfig();
    if (!clientId) {
      throw new Error('Google OAuth Client ID is not configured. Set GOOGLE_CLIENT_ID in environment.');
    }

    const state = Buffer.from(JSON.stringify({ userId, nonce: Date.now(), extra: stateSuffix })).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GSC_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access & refresh tokens
   */
  static async handleOAuthCallback(code, userId) {
    const { clientId, clientSecret, redirectUri } = this.getOAuthConfig();
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured on server.');
    }

    const postBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const tokenRes = await this.httpRequest(GSC_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, postBody);

    const tokenData = JSON.parse(tokenRes);
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain access token from Google');
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Fetch user info or profile if accessible
    let accountEmail = '';
    try {
      const userInfoStr = await this.httpRequest('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const userInfo = JSON.parse(userInfoStr);
      accountEmail = userInfo.email || '';
    } catch (e) {
      // non-critical
    }

    const connId = 'conn_gsc_' + userId;

    // Upsert into seo_provider_connections
    db.prepare(`
      INSERT INTO seo_provider_connections (
        id, user_id, provider, auth_type, access_token, refresh_token,
        token_expires_at, account_email, status, updated_at
      ) VALUES (?, ?, ?, 'oauth2', ?, ?, ?, ?, 'connected', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, seo_provider_connections.refresh_token),
        token_expires_at = excluded.token_expires_at,
        account_email = excluded.account_email,
        status = 'connected',
        error_message = null,
        updated_at = datetime('now')
    `).run(connId, userId, this.id, tokenData.access_token, tokenData.refresh_token || null, expiresAt, accountEmail);

    // Automatically discover and sync properties
    await this.syncProperties(userId);

    return { success: true, accountEmail };
  }

  /**
   * Get valid access token for user, auto-refreshing if expired
   */
  static async getValidToken(userId) {
    const conn = db.prepare(`
      SELECT * FROM seo_provider_connections 
      WHERE user_id = ? AND provider = ? AND status = 'connected'
    `).get(userId, this.id);

    if (!conn || !conn.access_token) {
      return null;
    }

    const now = Date.now();
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;

    // If token is still valid for more than 5 minutes, reuse it
    if (expiresAt - now > 300 * 1000) {
      return conn.access_token;
    }

    // Refresh token
    if (!conn.refresh_token) {
      return conn.access_token; // attempt with current token as fallback
    }

    const { clientId, clientSecret } = this.getOAuthConfig();
    const postBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token'
    }).toString();

    try {
      const res = await this.httpRequest(GSC_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }, postBody);

      const data = JSON.parse(res);
      if (data.access_token) {
        const newExpires = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
        db.prepare(`
          UPDATE seo_provider_connections 
          SET access_token = ?, token_expires_at = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(data.access_token, newExpires, conn.id);
        return data.access_token;
      }
    } catch (e) {
      console.error('[gsc-provider] Failed to refresh token:', e.message);
    }

    return conn.access_token;
  }

  /**
   * Check connection status for user
   */
  static async getConnectionStatus(userId) {
    const conn = db.prepare(`
      SELECT * FROM seo_provider_connections 
      WHERE user_id = ? AND provider = ?
    `).get(userId, this.id);

    if (!conn || conn.status !== 'connected') {
      return {
        connected: false,
        available: false,
        sourceLabel: this.label,
        configured: this.isConfigured(),
        status: 'disconnected'
      };
    }

    const properties = db.prepare(`
      SELECT property_id, property_name, property_type, permission_level, is_selected, updated_at
      FROM seo_provider_properties 
      WHERE user_id = ? AND provider = ?
      ORDER BY is_selected DESC, property_name ASC
    `).all(userId, this.id);

    const selectedProp = properties.find(p => p.is_selected) || properties[0] || null;

    return {
      connected: true,
      available: true,
      sourceLabel: this.label,
      accountEmail: conn.account_email,
      lastSync: conn.updated_at,
      status: conn.status,
      configured: true,
      properties,
      selectedProperty: selectedProp ? selectedProp.property_id : null
    };
  }

  /**
   * Disconnect GSC connection
   */
  static disconnect(userId) {
    db.prepare(`
      DELETE FROM seo_provider_connections WHERE user_id = ? AND provider = ?
    `).run(userId, this.id);

    db.prepare(`
      DELETE FROM seo_provider_properties WHERE user_id = ? AND provider = ?
    `).run(userId, this.id);

    SeoCache.invalidateProvider(this.id);
    return true;
  }

  /**
   * Discover and store verified properties from GSC
   */
  static async syncProperties(userId) {
    const token = await this.getValidToken(userId);
    if (!token) throw new Error('Not authenticated with Google Search Console.');

    const resStr = await this.httpRequest(GSC_SITES_ENDPOINT, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = JSON.parse(resStr);
    const sites = data.siteEntry || [];

    const conn = db.prepare('SELECT id FROM seo_provider_connections WHERE user_id = ? AND provider = ?').get(userId, this.id);
    if (!conn) return [];

    let hasSelected = false;
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      const propId = site.siteUrl;
      const isDomain = propId.startsWith('sc-domain:');
      const propName = isDomain ? propId.replace('sc-domain:', '') : propId;
      const isSelected = i === 0 ? 1 : 0;
      if (isSelected) hasSelected = true;

      const rowId = `prop_gsc_${userId}_${Buffer.from(propId).toString('hex').slice(0, 16)}`;

      db.prepare(`
        INSERT INTO seo_provider_properties (
          id, user_id, connection_id, provider, property_id, property_name,
          property_type, permission_level, is_selected, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          property_name = excluded.property_name,
          permission_level = excluded.permission_level,
          updated_at = datetime('now')
      `).run(rowId, userId, conn.id, this.id, propId, propName, isDomain ? 'domain' : 'url-prefix', site.permissionLevel || 'siteOwner', isSelected);
    }

    return this.listProperties(userId);
  }

  static listProperties(userId) {
    return db.prepare(`
      SELECT property_id, property_name, property_type, permission_level, is_selected
      FROM seo_provider_properties
      WHERE user_id = ? AND provider = ?
    `).all(userId, this.id);
  }

  static selectProperty(userId, propertyId) {
    db.prepare('UPDATE seo_provider_properties SET is_selected = 0 WHERE user_id = ? AND provider = ?').run(userId, this.id);
    db.prepare('UPDATE seo_provider_properties SET is_selected = 1 WHERE user_id = ? AND provider = ? AND property_id = ?').run(userId, this.id, propertyId);
    return true;
  }

  /**
   * Query real Search Analytics metrics for a property
   * @param {string} userId 
   * @param {string} propertyId 
   * @param {object} options { dateRange: '28d'|'7d'|'3m'|'6m'|'12m', dimensions: ['query'|'page'|'country'|'device'|'date'], startDate, endDate }
   */
  static async querySearchAnalytics(userId, propertyId, options = {}) {
    const token = await this.getValidToken(userId);
    if (!token) {
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        error: 'Google Search Console not connected or authorization expired'
      };
    }

    const { startDate, endDate } = this.resolveDateRange(options.dateRange || '28d', options.startDate, options.endDate);
    const dimensions = options.dimensions || ['date'];

    const cacheKey = `${this.id}:${propertyId}:${startDate}:${endDate}:${dimensions.join(',')}`;
    const cached = SeoCache.get(cacheKey);
    if (cached) return cached;

    const requestPayload = {
      startDate,
      endDate,
      dimensions,
      rowLimit: Math.min(options.rowLimit || 250, 1000)
    };

    if (options.queryFilter) {
      requestPayload.dimensionFilterGroups = [{
        filters: [{ dimension: 'query', operator: 'contains', expression: options.queryFilter }]
      }];
    }

    const endpoint = `${GSC_SITES_ENDPOINT}/${encodeURIComponent(propertyId)}/searchAnalytics/query`;

    try {
      const resStr = await this.httpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify(requestPayload));

      const data = JSON.parse(resStr);
      const rows = data.rows || [];

      // Calculate totals
      let totalClicks = 0;
      let totalImpressions = 0;
      let weightedPositionSum = 0;

      rows.forEach(r => {
        totalClicks += r.clicks || 0;
        totalImpressions += r.impressions || 0;
        weightedPositionSum += (r.position || 0) * (r.impressions || 0);
      });

      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) : null;
      const avgPosition = totalImpressions > 0 ? (weightedPositionSum / totalImpressions) : null;

      const result = {
        available: true,
        source: this.id,
        sourceLabel: this.label,
        fetchedAt: new Date().toISOString(),
        dateRange: { startDate, endDate },
        propertyId,
        totals: {
          clicks: normalizeMetric({ value: totalClicks, source: this.id, sourceLabel: this.label, fetchedAt: new Date().toISOString() }),
          impressions: normalizeMetric({ value: totalImpressions, source: this.id, sourceLabel: this.label, fetchedAt: new Date().toISOString() }),
          ctr: normalizeMetric({ value: avgCtr !== null ? parseFloat((avgCtr * 100).toFixed(2)) : null, unit: '%', source: this.id, sourceLabel: this.label }),
          position: normalizeMetric({ value: avgPosition !== null ? parseFloat(avgPosition.toFixed(1)) : null, source: this.id, sourceLabel: this.label })
        },
        rows: rows.map(r => ({
          keys: r.keys || [],
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
          position: parseFloat((r.position || 0).toFixed(1))
        }))
      };

      // Cache for 6 hours
      SeoCache.set(cacheKey, this.id, result, 6 * 3600);

      // Persist snapshot in database
      this.persistMetricsSnapshot(userId, propertyId, dimensions, rows);

      return result;
    } catch (e) {
      console.error('[gsc-provider] Search Analytics error:', e.message);
      return {
        available: false,
        source: this.id,
        sourceLabel: this.label,
        error: e.message || 'Google Search Analytics query failed'
      };
    }
  }

  /**
   * Persist rows into historical metrics snapshot table
   */
  static persistMetricsSnapshot(userId, propertyId, dimensions, rows) {
    if (!rows || rows.length === 0) return;

    try {
      const insertStmt = db.prepare(`
        INSERT INTO seo_search_console_metrics (
          id, user_id, property_id, metric_date, query, page, country, device, clicks, impressions, ctr, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insertStmt.run(...item);
        }
      });

      const records = [];
      rows.forEach((r, idx) => {
        const id = `gsc_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
        let date = new Date().toISOString().slice(0, 10);
        let query = '';
        let page = '';
        let country = '';
        let device = '';

        dimensions.forEach((dim, dIdx) => {
          const val = r.keys ? r.keys[dIdx] : '';
          if (dim === 'date') date = val;
          else if (dim === 'query') query = val;
          else if (dim === 'page') page = val;
          else if (dim === 'country') country = val;
          else if (dim === 'device') device = val;
        });

        records.push([
          id, userId, propertyId, date, query, page, country, device,
          r.clicks || 0, r.impressions || 0, r.ctr || 0, r.position || 0
        ]);
      });

      insertMany(records.slice(0, 500));
    } catch (e) {
      // Non-critical persistence
    }
  }

  /**
   * Helper to calculate start & end date strings
   */
  static resolveDateRange(rangeKey, customStart, customEnd) {
    if (customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }

    const end = new Date();
    // GSC data typically has a 2-3 day lag
    end.setDate(end.getDate() - 2);

    const start = new Date(end);

    switch (rangeKey) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '28d':
        start.setDate(end.getDate() - 28);
        break;
      case '3m':
        start.setMonth(end.getMonth() - 3);
        break;
      case '6m':
        start.setMonth(end.getMonth() - 6);
        break;
      case '12m':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 28);
    }

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  }

  static httpRequest(url, options = {}, postData = null) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const reqOpts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      if (postData) {
        reqOpts.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(reqOpts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }
}

module.exports = GoogleSearchConsoleProvider;
