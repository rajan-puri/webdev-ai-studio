/**
 * server/services/responsive/viewport-engine.js
 * Inspects webpage headers, iframe security headers (X-Frame-Options & CSP),
 * viewport meta tags, media query breakpoints, and stylesheets.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const dns = require('dns').promises;

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
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

  // Allow local development hostnames safely
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');

  if (!isLocalDev) {
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (addr.address === '169.254.169.254') {
          throw new Error('Access to cloud metadata endpoints (169.254.169.254) is restricted.');
        }
        for (const pattern of PRIVATE_IP_RANGES) {
          if (pattern.test(addr.address)) {
            throw new Error('Access to private enterprise networks is restricted.');
          }
        }
      }
    } catch (err) {
      if (err.message.includes('restricted')) throw err;
      throw new Error(`Could not resolve hostname "${hostname}". Please verify the domain name.`);
    }
  }

  return parsed.toString();
}

/**
 * Fetch webpage with timeout and redirect following
 */
function fetchUrl(targetUrl, timeoutMs = 10000, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    let redirects = 0;

    function doRequest(currentUrl) {
      if (redirects > maxRedirects) {
        return reject(new Error('Too many redirects encountered.'));
      }

      const parsed = new URL(currentUrl);
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: (parsed.pathname || '/') + (parsed.search || ''),
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 WebDevAI-Studio/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'close'
        },
        timeout: timeoutMs
      };

      const startTime = Date.now();

      const req = lib.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Redirects
        if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
          redirects++;
          const nextUrl = new URL(res.headers.location, currentUrl).toString();
          return doRequest(nextUrl);
        }

        let rawData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          rawData += chunk;
          // Limit memory payload to 5MB
          if (rawData.length > 5 * 1024 * 1024) {
            req.destroy();
            resolve({
              url: currentUrl,
              finalUrl: currentUrl,
              statusCode,
              headers: res.headers,
              html: rawData,
              responseTime
            });
          }
        });

        res.on('end', () => {
          resolve({
            url: targetUrl,
            finalUrl: currentUrl,
            statusCode,
            headers: res.headers,
            html: rawData,
            responseTime
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${timeoutMs}ms.`));
      });

      req.on('error', (err) => {
        reject(new Error(`Network connection error: ${err.message}`));
      });

      req.end();
    }

    doRequest(targetUrl);
  });
}

/**
 * Inspect X-Frame-Options and CSP frame-ancestors
 */
function inspectIframeSecurity(headers = {}) {
  const xfo = (headers['x-frame-options'] || '').toLowerCase().trim();
  const csp = (headers['content-security-policy'] || '').toLowerCase();

  let isBlocked = false;
  let reason = '';
  let policyType = 'none';

  if (xfo) {
    if (xfo === 'deny') {
      isBlocked = true;
      reason = 'X-Frame-Options: DENY explicitly prevents embedding this website in an iframe.';
      policyType = 'x-frame-options';
    } else if (xfo === 'sameorigin') {
      isBlocked = true;
      reason = 'X-Frame-Options: SAMEORIGIN restricts frame embedding to the same origin.';
      policyType = 'x-frame-options';
    } else if (xfo.startsWith('allow-from')) {
      isBlocked = true;
      reason = `X-Frame-Options: ${xfo} restricts frame embedding.`;
      policyType = 'x-frame-options';
    }
  }

  if (csp) {
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/);
    if (frameAncestorsMatch) {
      const directive = frameAncestorsMatch[1].trim();
      if (directive === "'none'") {
        isBlocked = true;
        reason = "Content-Security-Policy: frame-ancestors 'none' forbids any frame embedding.";
        policyType = 'csp';
      } else if (directive === "'self'") {
        isBlocked = true;
        reason = "Content-Security-Policy: frame-ancestors 'self' only allows same-origin embedding.";
        policyType = 'csp';
      } else if (!directive.includes('*')) {
        isBlocked = true;
        reason = `Content-Security-Policy: frame-ancestors restricts embedding to specific domains (${directive}).`;
        policyType = 'csp';
      }
    }
  }

  return {
    isBlocked,
    policyType,
    reason,
    xFrameOptions: headers['x-frame-options'] || null,
    contentSecurityPolicy: headers['content-security-policy'] || null
  };
}

/**
 * Parse and validate viewport meta tag from HTML
 */
function parseViewportMeta(html = '') {
  // Regex for <meta name="viewport" content="...">
  const metaMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i) || 
                    html.match(/<meta[^>]+content=["'][^"']*["'][^>]*name=["']viewport["'][^>]*>/i);

  if (!metaMatch) {
    return {
      exists: false,
      rawContent: null,
      directives: {},
      isResponsive: false,
      issues: [
        {
          severity: 'Critical',
          issue: 'Missing Viewport Meta Tag',
          whyItMatters: 'Mobile browsers will render the website at a desktop width (typically 980px) and scale it down, causing tiny unreadable text.',
          howToFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your document <head>.'
        }
      ]
    };
  }

  const rawMeta = metaMatch[0];
  const contentMatch = rawMeta.match(/content=["']([^"']+)["']/i);
  const rawContent = contentMatch ? contentMatch[1].trim() : '';

  const directives = {};
  const issues = [];

  rawContent.split(',').forEach(part => {
    const [key, val] = part.split('=').map(s => s ? s.trim().toLowerCase() : '');
    if (key) directives[key] = val !== undefined ? val : true;
  });

  const hasDeviceWidth = directives.width === 'device-width';
  const hasInitialScale = directives['initial-scale'] === '1' || directives['initial-scale'] === '1.0';
  const isUserScalableNo = directives['user-scalable'] === 'no' || directives['user-scalable'] === '0';
  const maxScaleOne = directives['maximum-scale'] === '1' || directives['maximum-scale'] === '1.0';

  if (!hasDeviceWidth && !directives.width) {
    issues.push({
      severity: 'High',
      issue: 'Missing "width=device-width" in viewport meta tag',
      whyItMatters: 'The viewport does not match the device physical screen width, causing layout distortion on phones.',
      howToFix: 'Include width=device-width in your viewport meta tag.'
    });
  } else if (directives.width && directives.width !== 'device-width') {
    issues.push({
      severity: 'Critical',
      issue: `Fixed viewport width: "${directives.width}"`,
      whyItMatters: `Setting a fixed pixel width (${directives.width}) in viewport meta disables true responsive reflow across phones.`,
      howToFix: 'Change width to "device-width".'
    });
  }

  if (isUserScalableNo || maxScaleOne) {
    issues.push({
      severity: 'Medium',
      issue: 'Pinch-to-zoom is disabled (user-scalable=no or maximum-scale=1)',
      whyItMatters: 'Prevents visually impaired users from zooming into content, violating WCAG 1.4.4 criteria.',
      howToFix: 'Remove user-scalable=no and maximum-scale=1 to allow users to zoom.'
    });
  }

  return {
    exists: true,
    rawContent,
    directives,
    isResponsive: hasDeviceWidth && issues.filter(i => i.severity === 'Critical').length === 0,
    issues
  };
}

/**
 * Extract Media Queries from HTML inline styles and linked sheets references
 */
function extractMediaQueries(html = '') {
  const mediaQueries = new Set();
  const mqRegex = /@media[^{]+\{/gi;
  let match;

  while ((match = mqRegex.exec(html)) !== null) {
    const raw = match[0].replace(/\{$/, '').trim();
    mediaQueries.add(raw);
  }

  // Parse breakpoint numbers like (max-width: 768px), (min-width: 1024px)
  const detectedBreakpoints = new Set();
  const bpRegex = /(?:min-width|max-width)\s*:\s*([0-9]+)(?:px|em|rem)/gi;

  mediaQueries.forEach(mq => {
    let bpMatch;
    while ((bpMatch = bpRegex.exec(mq)) !== null) {
      const num = parseInt(bpMatch[1], 10);
      if (num && num >= 200 && num <= 3840) {
        detectedBreakpoints.add(num);
      }
    }
  });

  return {
    mediaQueriesCount: mediaQueries.size,
    sampleQueries: Array.from(mediaQueries).slice(0, 10),
    detectedBreakpoints: Array.from(detectedBreakpoints).sort((a, b) => a - b)
  };
}

module.exports = {
  validateAndResolveUrl,
  fetchUrl,
  inspectIframeSecurity,
  parseViewportMeta,
  extractMediaQueries
};
