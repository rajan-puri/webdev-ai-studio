/**
 * server/services/qa/technical.js
 * Analyzes server response, headers, redirects, compression, and caching.
 */

function analyzeTechnical(fetchResult) {
  const {
    targetUrl,
    finalUrl,
    status,
    responseTime,
    headers,
    redirectChain = [],
    isHttps
  } = fetchResult;

  const checks = [];
  const rawHeaders = headers || {};

  const contentType = rawHeaders['content-type'] || 'Not specified';
  const contentLength = rawHeaders['content-length'] ? parseInt(rawHeaders['content-length'], 10) : null;
  const contentEncoding = rawHeaders['content-encoding'] || null;
  const cacheControl = rawHeaders['cache-control'] || null;
  const etag = rawHeaders['etag'] || null;
  const lastModified = rawHeaders['last-modified'] || null;
  const serverHeader = rawHeaders['server'] || null;

  // 1. HTTP Status Check
  if (status >= 200 && status < 300) {
    checks.push({
      id: 'tech-status',
      name: 'HTTP Status Code',
      severity: 'PASS',
      detectedValue: `${status} (Success)`,
      whyItMatters: 'Ensures the server successfully served the requested page to clients and crawlers.',
      message: `The server returned HTTP status code ${status}.`,
      fix: null
    });
  } else if (status >= 300 && status < 400) {
    checks.push({
      id: 'tech-status',
      name: 'HTTP Status Code',
      severity: 'WARNING',
      detectedValue: `${status} (Redirect)`,
      whyItMatters: 'Redirects introduce additional latency for users and search engine bots.',
      message: `The URL resulted in a redirect status ${status}.`,
      fix: 'Update internal links directly to the final destination URL to eliminate redirect hops.'
    });
  } else {
    checks.push({
      id: 'tech-status',
      name: 'HTTP Status Code',
      severity: 'ERROR',
      detectedValue: `${status} (Error)`,
      whyItMatters: 'Client or server error codes prevent the page from being accessed or indexed.',
      message: `The server returned an error HTTP status ${status}.`,
      fix: 'Review web server logs, routing configurations, and permissions to resolve this error code.'
    });
  }

  // 2. HTTPS Usage
  if (isHttps) {
    checks.push({
      id: 'tech-https',
      name: 'HTTPS Protocol',
      severity: 'PASS',
      detectedValue: 'HTTPS Enabled',
      whyItMatters: 'Protects user privacy and data integrity, and is a confirmed search ranking signal.',
      message: 'The page is served securely over HTTPS.',
      fix: null
    });
  } else {
    checks.push({
      id: 'tech-https',
      name: 'HTTPS Protocol',
      severity: 'ERROR',
      detectedValue: 'Insecure HTTP',
      whyItMatters: 'Unencrypted HTTP connections can be intercepted or manipulated in transit.',
      message: 'The website is served over insecure HTTP.',
      fix: 'Install an SSL/TLS certificate and configure 301 redirection from HTTP to HTTPS.'
    });
  }

  // 3. Response Time (TTFB estimate)
  if (responseTime < 500) {
    checks.push({
      id: 'tech-response-time',
      name: 'Server Response Latency',
      severity: 'PASS',
      detectedValue: `${responseTime}ms`,
      whyItMatters: 'Fast server response times reduce initial page wait time and improve crawl budget efficiency.',
      message: `Initial response was received in ${responseTime}ms.`,
      fix: null
    });
  } else if (responseTime < 1200) {
    checks.push({
      id: 'tech-response-time',
      name: 'Server Response Latency',
      severity: 'WARNING',
      detectedValue: `${responseTime}ms`,
      whyItMatters: 'Elevated server response latency delays initial DOM parsing and rendering.',
      message: `Initial response latency was ${responseTime}ms (moderate).`,
      fix: 'Consider server-level caching, CDN edge caching, or optimizing database queries.'
    });
  } else {
    checks.push({
      id: 'tech-response-time',
      name: 'Server Response Latency',
      severity: 'ERROR',
      detectedValue: `${responseTime}ms`,
      whyItMatters: 'Response times over 1200ms indicate severe backend bottleneck or unoptimized hosting.',
      message: `Slow server response time of ${responseTime}ms.`,
      fix: 'Investigate slow database queries, enable dynamic page caching, and configure a high-performance CDN.'
    });
  }

  // 4. Redirect Chain
  const redirectCount = redirectChain.length;
  if (redirectCount === 0) {
    checks.push({
      id: 'tech-redirects',
      name: 'Redirect Chain',
      severity: 'PASS',
      detectedValue: '0 redirects (Direct response)',
      whyItMatters: 'Zero redirects ensures minimal time-to-first-byte.',
      message: 'The page was loaded directly without intermediate redirects.',
      fix: null
    });
  } else if (redirectCount === 1) {
    checks.push({
      id: 'tech-redirects',
      name: 'Redirect Chain',
      severity: 'INFO',
      detectedValue: `1 redirect (${redirectChain[0]} → ${finalUrl})`,
      whyItMatters: 'Single redirects are common (e.g. HTTP to HTTPS or non-www to www).',
      message: `The request redirected once to ${finalUrl}.`,
      fix: 'Point internal links directly to the final URL where practical.'
    });
  } else {
    checks.push({
      id: 'tech-redirects',
      name: 'Redirect Chain',
      severity: 'WARNING',
      detectedValue: `${redirectCount} redirects`,
      whyItMatters: 'Redirect loops or multi-hop chains degrade performance and waste crawler budget.',
      message: `Detected ${redirectCount} redirect hops: ${redirectChain.join(' → ')} → ${finalUrl}`,
      fix: 'Eliminate intermediate redirect hops so users and search bots reach the destination directly.'
    });
  }

  // 5. Compression / Encoding
  if (contentEncoding && /gzip|br|deflate/i.test(contentEncoding)) {
    checks.push({
      id: 'tech-compression',
      name: 'Content Compression',
      severity: 'PASS',
      detectedValue: contentEncoding,
      whyItMatters: 'Compression dramatically shrinks HTML payload size transferred over the wire.',
      message: `Server returned compressed content using ${contentEncoding}.`,
      fix: null
    });
  } else {
    checks.push({
      id: 'tech-compression',
      name: 'Content Compression',
      severity: 'WARNING',
      detectedValue: contentEncoding || 'None detected',
      whyItMatters: 'Uncompressed text assets consume extra bandwidth and increase load latency.',
      message: 'No Gzip or Brotli compression header (Content-Encoding) was returned.',
      fix: 'Enable Brotli or Gzip compression in your web server (Nginx, Apache, or Cloudflare).'
    });
  }

  // 6. Caching Headers (Cache-Control, ETag, Last-Modified)
  if (cacheControl) {
    checks.push({
      id: 'tech-cache-control',
      name: 'Cache-Control Header',
      severity: 'PASS',
      detectedValue: cacheControl,
      whyItMatters: 'Specifies caching directives for browsers, intermediate proxies, and CDNs.',
      message: `Cache-Control directive present: "${cacheControl}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'tech-cache-control',
      name: 'Cache-Control Header',
      severity: 'WARNING',
      detectedValue: 'Missing',
      whyItMatters: 'Missing caching headers can result in unpredictable browser caching behavior.',
      message: 'No Cache-Control header was found in the HTTP response.',
      fix: 'Define explicit Cache-Control headers (e.g., "no-cache" for dynamic HTML or max-age for static pages).'
    });
  }

  return {
    summary: {
      originalUrl: targetUrl,
      finalUrl: finalUrl || targetUrl,
      status,
      isHttps,
      responseTime,
      redirectCount,
      redirectChain,
      contentType,
      contentLength,
      contentEncoding: contentEncoding || 'none',
      cacheControl: cacheControl || 'not set',
      etag: etag || 'not set',
      lastModified: lastModified || 'not set',
      serverHeader: serverHeader || 'hidden/none'
    },
    rawHeaders,
    checks
  };
}

module.exports = {
  analyzeTechnical
};
