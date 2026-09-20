/**
 * server/services/seo/log-analyzer.js
 * Real Web Server Access Log Analyzer.
 * Parses Common Log Format (CLF), Combined Log Format, and Cloudflare/Nginx log formats.
 * Analyzes search engine crawler visits (Googlebot, Bingbot, etc.), crawl budget waste, and HTTP errors.
 * ZERO FAKE DATA: Evaluates strictly the uploaded log entries.
 */

class LogFileAnalyzer {
  /**
   * Parse raw log text content and compute deterministic crawler metrics
   * @param {string} logContent 
   * @param {string} filename 
   * @returns {object}
   */
  static parseAndAnalyze(logContent, filename = 'access.log') {
    if (!logContent || typeof logContent !== 'string') {
      throw new Error('Log content must be a valid text string.');
    }

    const lines = logContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      throw new Error('Log file is empty.');
    }

    const knownBots = [
      { name: 'Googlebot Desktop', pattern: /Googlebot(?!\/2\.1;\s\+http:\/\/www\.google\.com\/bot\.html.*Mobile)/i },
      { name: 'Googlebot Smartphone', pattern: /Googlebot.*Mobile/i },
      { name: 'Bingbot', pattern: /Bingbot|bingbot/i },
      { name: 'Applebot', pattern: /Applebot/i },
      { name: 'YandexBot', pattern: /YandexBot/i },
      { name: 'Baiduspider', pattern: /Baiduspider/i },
      { name: 'GPTBot (OpenAI)', pattern: /GPTBot/i },
      { name: 'ClaudeBot (Anthropic)', pattern: /ClaudeBot/i },
      { name: 'PerplexityBot', pattern: /PerplexityBot/i }
    ];

    // Combined log format regex:
    // 127.0.0.1 - - [10/Oct/2026:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "http://..." "Mozilla/..."
    const logRegex = /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^"\s]+)(?:\s+HTTP\/[0-9.]+)?(?:.*)?"\s+(\d{3})\s+(\S+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/;

    let totalEntries = 0;
    let botHitsCount = 0;
    let nonBotHitsCount = 0;

    const botHitsByName = {};
    const statusCodes = {};
    const crawledUrlsMap = new Map(); // url -> { count, statusCodes: Set, bots: Set }
    const wastedCrawlHits = []; // 404s, 500s, redirects

    for (const line of lines) {
      totalEntries++;
      const match = line.match(logRegex);

      let ip = '';
      let timestamp = '';
      let method = 'GET';
      let path = '';
      let statusCode = 200;
      let userAgent = '';

      if (match) {
        ip = match[1];
        timestamp = match[3];
        method = match[4];
        path = match[5];
        statusCode = parseInt(match[6], 10) || 200;
        userAgent = match[9] || '';
      } else {
        // Fallback simple scanner for non-standard lines
        const statusMatch = line.match(/\s(\d{3})\s/);
        if (statusMatch) statusCode = parseInt(statusMatch[1], 10);
        const urlMatch = line.match(/"[A-Z]+\s+([^"\s]+)/);
        if (urlMatch) path = urlMatch[1];
        userAgent = line;
      }

      // Check for search engine bots
      let matchedBot = null;
      for (const bot of knownBots) {
        if (bot.pattern.test(userAgent)) {
          matchedBot = bot.name;
          break;
        }
      }

      if (matchedBot) {
        botHitsCount++;
        botHitsByName[matchedBot] = (botHitsByName[matchedBot] || 0) + 1;
      } else {
        nonBotHitsCount++;
      }

      // Status codes breakdown
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

      // Track crawled URLs
      if (path) {
        if (!crawledUrlsMap.has(path)) {
          crawledUrlsMap.set(path, {
            url: path,
            hits: 0,
            statusCodes: new Set(),
            bots: new Set()
          });
        }
        const item = crawledUrlsMap.get(path);
        item.hits++;
        item.statusCodes.add(statusCode);
        if (matchedBot) item.bots.add(matchedBot);
      }

      // Crawl waste: 4xx, 5xx, or redirects
      if (statusCode >= 400 || (statusCode >= 300 && statusCode < 400)) {
        if (matchedBot && wastedCrawlHits.length < 50) {
          wastedCrawlHits.push({
            url: path,
            bot: matchedBot,
            statusCode,
            reason: statusCode >= 500 ? 'Server Error (5xx)' : (statusCode >= 400 ? 'Client Error (4xx)' : 'Redirect (3xx)')
          });
        }
      }
    }

    // Sort crawled URLs by hit frequency
    const topCrawledUrls = Array.from(crawledUrlsMap.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 50)
      .map(item => ({
        url: item.url,
        hits: item.hits,
        statusCodes: Array.from(item.statusCodes),
        bots: Array.from(item.bots)
      }));

    return {
      filename,
      analyzedAt: new Date().toISOString(),
      totalLines: lines.length,
      parsedEntries: totalEntries,
      metrics: {
        totalBotHits: botHitsCount,
        nonBotHits: nonBotHitsCount,
        uniqueUrlsCrawled: crawledUrlsMap.size,
        wastedCrawlEventsCount: wastedCrawlHits.length
      },
      botDistribution: botHitsByName,
      statusCodeDistribution: statusCodes,
      topCrawledUrls,
      wastedCrawlSamples: wastedCrawlHits.slice(0, 20)
    };
  }
}

module.exports = LogFileAnalyzer;
