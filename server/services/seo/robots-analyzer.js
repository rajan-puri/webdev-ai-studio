/**
 * server/services/seo/robots-analyzer.js
 * Comprehensive /robots.txt fetcher, parser, rule evaluator, and AI bot checker.
 */

const { URL } = require('url');

const AI_BOT_NAMES = [
  'gptbot', 'oai-searchbot', 'claude-searchbot', 'claudebot',
  'perplexitybot', 'google-extended', 'cohere-ai', 'anthropic-ai', 'bytespider'
];

async function fetchAndAnalyzeRobots(baseUrl, crawlerUserAgent = 'WebDevAIStudio') {
  const base = new URL(baseUrl);
  const robotsUrl = `${base.protocol}//${base.host}/robots.txt`;

  const result = {
    url: robotsUrl,
    status: null,
    exists: false,
    responseTimeMs: 0,
    sizeBytes: 0,
    rawContent: '',
    sitemaps: [],
    crawlDelay: null,
    hasDisallowAll: false,
    aiBots: {},
    groups: [],
    issues: []
  };

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const cleanUA = crawlerUserAgent && crawlerUserAgent.includes('Mozilla') ? crawlerUserAgent : (crawlerUserAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
    const res = await fetch(robotsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': cleanUA,
        'Accept': 'text/plain,text/html,*/*'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    result.status = res.status;
    result.responseTimeMs = Date.now() - startTime;

    if (res.status === 200) {
      result.exists = true;
      const text = await res.text();
      result.sizeBytes = Buffer.byteLength(text, 'utf8');
      result.rawContent = text.length > 50000 ? text.slice(0, 50000) + '\n...[truncated]' : text;

      // Parse groups and rules
      parseRobotsText(text, result);
    } else if (res.status === 404) {
      result.issues.push({
        severity: 'NOTICE',
        code: 'ROBOTS_TXT_MISSING',
        title: 'robots.txt not found (HTTP 404)',
        message: 'No robots.txt file exists. Crawlers default to crawling all discoverable public URLs.'
      });
    } else if (res.status >= 400) {
      result.issues.push({
        severity: 'WARNING',
        code: 'ROBOTS_TXT_HTTP_ERROR',
        title: `robots.txt returned HTTP ${res.status}`,
        message: `Robots.txt responded with HTTP status ${res.status}, which may lead crawlers to assume access is restricted.`
      });
    }
  } catch (err) {
    result.status = 0;
    result.responseTimeMs = Date.now() - startTime;
    result.issues.push({
      severity: 'WARNING',
      code: 'ROBOTS_TXT_FETCH_FAILED',
      title: 'Failed to fetch robots.txt',
      message: err.message
    });
  }

  // Helper to check if a specific path is allowed for this crawler
  result.isAllowed = function (urlPath, targetAgent = '*') {
    return checkPathAllowed(urlPath, result.groups, targetAgent, crawlerUserAgent);
  };

  return result;
}

function parseRobotsText(text, result) {
  const lines = text.split(/\r?\n/);
  let currentGroup = null;
  const groups = [];
  const sitemaps = [];

  for (let rawLine of lines) {
    // Strip comments
    const commentIdx = rawLine.indexOf('#');
    const line = (commentIdx !== -1 ? rawLine.slice(0, commentIdx) : rawLine).trim();
    if (!line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (directive === 'user-agent') {
      const ua = value.toLowerCase();
      // If previous group had rules, push it and start new group
      if (!currentGroup || currentGroup.rules.length > 0) {
        currentGroup = { userAgents: [ua], rules: [], crawlDelay: null };
        groups.push(currentGroup);
      } else {
        // Chained user-agents for same group
        currentGroup.userAgents.push(ua);
      }
    } else if (directive === 'allow' || directive === 'disallow') {
      if (!currentGroup) {
        currentGroup = { userAgents: ['*'], rules: [], crawlDelay: null };
        groups.push(currentGroup);
      }
      currentGroup.rules.push({
        type: directive,
        path: value
      });
    } else if (directive === 'crawl-delay') {
      const delay = parseFloat(value);
      if (!isNaN(delay) && currentGroup) {
        currentGroup.crawlDelay = delay;
        if (!result.crawlDelay) result.crawlDelay = delay;
      }
    }
  }

  result.groups = groups;
  result.sitemaps = Array.from(new Set(sitemaps));

  // Check for global Disallow: /
  const globalWildcard = groups.find(g => g.userAgents.includes('*'));
  if (globalWildcard) {
    const disallowRoot = globalWildcard.rules.find(r => r.type === 'disallow' && (r.path === '/' || r.path === '/*'));
    const allowRoot = globalWildcard.rules.find(r => r.type === 'allow' && (r.path === '/' || r.path === '/*'));
    if (disallowRoot && !allowRoot) {
      result.hasDisallowAll = true;
      result.issues.push({
        severity: 'ERROR',
        code: 'ROBOTS_DISALLOW_ALL',
        title: 'Global disallow rule detected (Disallow: /)',
        message: 'robots.txt disallows all crawling under User-agent: *. Search engines and web crawlers may be blocked from indexing the entire website.'
      });
    }
  }

  // Analyze AI Crawlers rules
  for (const botName of AI_BOT_NAMES) {
    const botGroup = groups.find(g => g.userAgents.includes(botName));
    if (botGroup) {
      const hasDisallowAll = botGroup.rules.some(r => r.type === 'disallow' && (r.path === '/' || r.path === '/*'));
      result.aiBots[botName] = {
        specified: true,
        allowed: !hasDisallowAll,
        rulesCount: botGroup.rules.length
      };
    } else {
      // Inherits wildcard
      result.aiBots[botName] = {
        specified: false,
        allowed: !result.hasDisallowAll,
        rulesCount: 0
      };
    }
  }
}

function checkPathAllowed(urlPath, groups, targetAgent = '*', customCrawlerAgent = '') {
  if (!groups || groups.length === 0) return true;

  // 1. Check exact agent match first
  const agentLower = (customCrawlerAgent || targetAgent).toLowerCase();
  let matchingGroup = groups.find(g => g.userAgents.includes(agentLower));

  // 2. Fallback to wildcard '*'
  if (!matchingGroup) {
    matchingGroup = groups.find(g => g.userAgents.includes('*'));
  }

  if (!matchingGroup || !matchingGroup.rules || matchingGroup.rules.length === 0) {
    return true;
  }

  // Evaluate rules in order of specificity (longest path match wins)
  const matchingRules = [];
  for (const rule of matchingGroup.rules) {
    if (!rule.path) continue;
    const rulePattern = rule.path.replace(/\*/g, '.*');
    try {
      const re = new RegExp('^' + rulePattern);
      if (re.test(urlPath)) {
        matchingRules.push({
          type: rule.type,
          length: rule.path.length
        });
      }
    } catch (e) {}
  }

  if (matchingRules.length === 0) return true;

  // Longest matching rule takes precedence
  matchingRules.sort((a, b) => b.length - a.length);
  return matchingRules[0].type === 'allow';
}

module.exports = {
  fetchAndAnalyzeRobots,
  parseRobotsText,
  AI_BOT_NAMES,
  checkPathAllowed
};
