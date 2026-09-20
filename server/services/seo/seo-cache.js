/**
 * server/services/seo/seo-cache.js
 * High-performance caching layer with SQLite persistence and memory caching.
 */

const { db } = require('../../data/database');

const memoryCache = new Map(); // cacheKey -> { data, expiresAt }

class SeoCache {
  /**
   * Get cached data by key
   * @param {string} cacheKey 
   * @returns {any|null}
   */
  static get(cacheKey) {
    const now = Date.now();

    // 1. Check memory cache first
    const mem = memoryCache.get(cacheKey);
    if (mem) {
      if (mem.expiresAt > now) {
        return mem.data;
      }
      memoryCache.delete(cacheKey);
    }

    // 2. Check SQLite cache
    try {
      const row = db.prepare(`
        SELECT data_json, expires_at 
        FROM seo_provider_cache 
        WHERE cache_key = ?
      `).get(cacheKey);

      if (!row) return null;

      const expiresAt = new Date(row.expires_at).getTime();
      if (expiresAt <= now) {
        db.prepare('DELETE FROM seo_provider_cache WHERE cache_key = ?').run(cacheKey);
        return null;
      }

      const parsed = JSON.parse(row.data_json);
      // Promote to memory
      memoryCache.set(cacheKey, { data: parsed, expiresAt });
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /**
   * Set cache entry
   * @param {string} cacheKey 
   * @param {string} provider 
   * @param {any} data 
   * @param {number} ttlSeconds 
   */
  static set(cacheKey, provider, data, ttlSeconds = 3600) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const dataJson = JSON.stringify(data);

    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    try {
      db.prepare(`
        INSERT INTO seo_provider_cache (cache_key, provider, data_json, expires_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          provider = excluded.provider,
          data_json = excluded.data_json,
          expires_at = excluded.expires_at,
          created_at = datetime('now')
      `).run(cacheKey, provider, dataJson, expiresAt);
    } catch (e) {
      console.error('[seo-cache] Failed to persist cache entry:', e.message);
    }
  }

  /**
   * Invalidate specific key or provider
   */
  static invalidate(cacheKey) {
    memoryCache.delete(cacheKey);
    try {
      db.prepare('DELETE FROM seo_provider_cache WHERE cache_key = ?').run(cacheKey);
    } catch (e) {}
  }

  static invalidateProvider(provider) {
    for (const [key] of memoryCache) {
      if (key.startsWith(provider + ':')) {
        memoryCache.delete(key);
      }
    }
    try {
      db.prepare('DELETE FROM seo_provider_cache WHERE provider = ?').run(provider);
    } catch (e) {}
  }
}

module.exports = SeoCache;
