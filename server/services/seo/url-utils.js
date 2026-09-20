/**
 * server/services/seo/url-utils.js
 * Comprehensive URL normalization, validation, resolution, and SSRF protection.
 */

const dns = require('dns').promises;
const { URL } = require('url');

const DEFAULT_IGNORED_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref', 'source'
]);

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/
];

async function validateAndResolveUrl(inputUrl) {
  let parsed;
  try {
    parsed = new URL(inputUrl);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a full URL including http:// or https://');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsafe protocol. Only http:// and https:// URLs are allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Guard against known metadata and loopback names
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
    // Only allow for local development if testing-ai.local
    if (hostname !== 'testing-ai.local' && hostname !== 'localhost') {
      throw new Error('Access to internal hostnames is prohibited.');
    }
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (addr.address === '169.254.169.254') {
        throw new Error('Access to cloud metadata IP is prohibited.');
      }
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(addr.address)) {
          // Allow loopback for local dev testing if user explicitly tests localhost/local server
          if (addr.address === '127.0.0.1' || addr.address === '::1') {
            continue;
          }
          throw new Error(`Target resolves to private network IP address (${addr.address}), which is prohibited.`);
        }
      }
    }
  } catch (dnsErr) {
    if (dnsErr.message.includes('prohibited')) throw dnsErr;
    // Allow local domain without public DNS if resolved locally
    if (hostname !== 'testing-ai.local' && hostname !== 'localhost') {
      throw new Error(`DNS resolution failed for hostname "${hostname}": ${dnsErr.message}`);
    }
  }

  return parsed;
}

function normalizeUrl(urlStr, options = {}) {
  const ignoredParams = options.ignoredParams ? new Set(options.ignoredParams) : DEFAULT_IGNORED_PARAMS;

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (e) {
    return null;
  }

  // 1. Lowercase protocol and hostname
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // 2. Remove default ports
  if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }

  // 3. Remove fragment completely
  parsed.hash = '';

  // 4. Clean pathname duplicate slashes
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/');

  // 5. Clean & sort query parameters
  const params = new URLSearchParams(parsed.search);
  const cleanParams = new URLSearchParams();
  const sortedKeys = Array.from(new Set(params.keys())).sort();

  for (const key of sortedKeys) {
    if (!ignoredParams.has(key.toLowerCase())) {
      const values = params.getAll(key);
      for (const val of values) {
        cleanParams.append(key, val);
      }
    }
  }

  parsed.search = cleanParams.toString() ? `?${cleanParams.toString()}` : '';

  // 6. Consistent trailing slash
  let result = parsed.toString();
  if (result.endsWith('/') && parsed.pathname !== '/') {
    result = result.slice(0, -1);
  }

  return result;
}

function resolveUrl(target, baseUrl) {
  if (!target || typeof target !== 'string') return null;
  const cleanTarget = target.trim();
  if (!cleanTarget || cleanTarget.startsWith('javascript:') || cleanTarget.startsWith('mailto:') || cleanTarget.startsWith('tel:') || cleanTarget.startsWith('data:')) {
    return null;
  }

  try {
    const resolved = new URL(cleanTarget, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return normalizeUrl(resolved.toString());
  } catch (e) {
    return null;
  }
}

function extractDomain(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function isInternalUrl(urlStr, baseHostname, includeSubdomains = false) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const base = baseHostname.toLowerCase();

    if (host === base) return true;

    if (includeSubdomains) {
      if (host.endsWith('.' + base)) return true;
      // Strip www from base to compare
      const bareBase = base.replace(/^www\./, '');
      if (host === bareBase || host.endsWith('.' + bareBase)) return true;
    } else {
      // If base is www.example.com and host is example.com or vice-versa
      const bareBase = base.replace(/^www\./, '');
      const bareHost = host.replace(/^www\./, '');
      if (bareBase === bareHost) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

const NON_HTML_EXT_REGEX = /\.(pdf|zip|tar|gz|rar|7z|jpg|jpeg|png|gif|webp|avif|svg|ico|bmp|mp4|webm|mp3|wav|ogg|m4a|doc|docx|xls|xlsx|ppt|pptx|exe|dmg|bin|css|js|map|woff|woff2|ttf|eot)(\?.*)?$/i;

function isCrawlableHtmlUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (NON_HTML_EXT_REGEX.test(u.pathname)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  validateAndResolveUrl,
  normalizeUrl,
  resolveUrl,
  extractDomain,
  isInternalUrl,
  isCrawlableHtmlUrl
};
