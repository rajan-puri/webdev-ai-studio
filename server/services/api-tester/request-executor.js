/**
 * server/services/api-tester/request-executor.js
 * High-performance, secure HTTP request executor for WebDev AI Studio API Tester.
 * Features:
 * - Accurate timing metrics (DNS, TCP, TLS, TTFB, Total)
 * - SSRF Protection (guards against cloud metadata services like 169.254.169.254)
 * - Redirect chain tracking
 * - Safe payload truncation (up to 5MB)
 * - Automated assertion runner
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

// Blocked hostnames / IPs for cloud security (SSRF prevention)
const BLOCKED_HOSTS = [
  '169.254.169.254',             // AWS/Azure/GCP metadata
  'metadata.google.internal',    // GCP metadata
  'instance-data',
  '100.100.100.200'              // Alibaba Cloud metadata
];

/**
 * Checks if a host is blocked for SSRF prevention
 */
function isBlockedHost(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();
  for (const blocked of BLOCKED_HOSTS) {
    if (lower === blocked || lower.endsWith('.' + blocked)) {
      return true;
    }
  }
  return false;
}

/**
 * Executes an HTTP/S request and returns full diagnostic response
 */
async function executeApiRequest({
  url,
  method = 'GET',
  headers = {},
  queryParams = {},
  auth = null,
  body = null,
  bodyType = 'none', // 'none' | 'json' | 'form' | 'raw'
  timeoutMs = 30000,
  maxRedirects = 8,
  assertions = []
}) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required.');
  }

  // Ensure protocol
  let targetUrlStr = url.trim();
  if (!/^https?:\/\//i.test(targetUrlStr)) {
    targetUrlStr = 'https://' + targetUrlStr;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrlStr);
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`);
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    throw new Error('Request to cloud metadata / restricted IP is blocked for security.');
  }

  // Append query params
  if (queryParams && typeof queryParams === 'object') {
    for (const [key, val] of Object.entries(queryParams)) {
      if (key && val !== undefined && val !== null) {
        parsedUrl.searchParams.set(key, String(val));
      }
    }
  }

  // Prepare outgoing headers
  const outgoingHeaders = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (k && v !== undefined && v !== null) {
      outgoingHeaders[k.toLowerCase()] = String(v);
    }
  }

  // User-Agent default if omitted
  if (!outgoingHeaders['user-agent']) {
    outgoingHeaders['user-agent'] = 'WebDev-AI-Studio-ApiTester/2.0';
  }
  if (!outgoingHeaders['accept']) {
    outgoingHeaders['accept'] = '*/*';
  }

  // Process Authentication
  if (auth && typeof auth === 'object') {
    if (auth.type === 'bearer' && auth.token) {
      outgoingHeaders['authorization'] = `Bearer ${auth.token.trim()}`;
    } else if (auth.type === 'basic' && (auth.username || auth.password)) {
      const creds = `${auth.username || ''}:${auth.password || ''}`;
      outgoingHeaders['authorization'] = `Basic ${Buffer.from(creds).toString('base64')}`;
    } else if (auth.type === 'apiKey' && auth.key && auth.value) {
      if (auth.addTo === 'query') {
        parsedUrl.searchParams.set(auth.key, auth.value);
      } else {
        outgoingHeaders[auth.key.toLowerCase()] = auth.value;
      }
    }
  }

  // Format Body
  let requestPayload = null;
  const upperMethod = method.toUpperCase();

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod) && body !== null && body !== undefined) {
    if (bodyType === 'json') {
      if (typeof body === 'object') {
        requestPayload = Buffer.from(JSON.stringify(body));
      } else if (typeof body === 'string') {
        requestPayload = Buffer.from(body);
      }
      if (!outgoingHeaders['content-type']) {
        outgoingHeaders['content-type'] = 'application/json; charset=utf-8';
      }
    } else if (bodyType === 'form') {
      let formStr = '';
      if (typeof body === 'object') {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(body)) {
          if (k) usp.append(k, String(v));
        }
        formStr = usp.toString();
      } else {
        formStr = String(body);
      }
      requestPayload = Buffer.from(formStr);
      if (!outgoingHeaders['content-type']) {
        outgoingHeaders['content-type'] = 'application/x-www-form-urlencoded';
      }
    } else if (bodyType === 'raw') {
      requestPayload = Buffer.from(String(body));
      if (!outgoingHeaders['content-type']) {
        outgoingHeaders['content-type'] = 'text/plain; charset=utf-8';
      }
    }

    if (requestPayload) {
      outgoingHeaders['content-length'] = Buffer.byteLength(requestPayload);
    }
  }

  // Execute request with redirect trace and timing
  const redirectTrace = [];
  let currentUrl = parsedUrl;
  let remainingRedirects = maxRedirects;

  const runSingleHop = (targetUrl, hopMethod, payload) => {
    return new Promise((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const timing = {
        dnsStart: 0,
        dnsDone: 0,
        connectDone: 0,
        tlsDone: 0,
        ttfb: 0,
        total: 0
      };

      const startTime = process.hrtime.bigint();

      const options = {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: hopMethod,
        headers: outgoingHeaders,
        timeout: timeoutMs
      };

      const req = client.request(options, (res) => {
        timing.ttfb = Number((process.hrtime.bigint() - startTime) / 1000000n);

        const chunks = [];
        let totalBytes = 0;
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB max payload

        res.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes <= MAX_BYTES) {
            chunks.push(chunk);
          }
        });

        res.on('end', () => {
          timing.total = Number((process.hrtime.bigint() - startTime) / 1000000n);
          let rawBuffer = Buffer.concat(chunks);

          // Handle compression
          const enc = (res.headers['content-encoding'] || '').toLowerCase();
          try {
            if (enc.includes('gzip')) {
              rawBuffer = zlib.gunzipSync(rawBuffer);
            } else if (enc.includes('deflate')) {
              rawBuffer = zlib.inflateSync(rawBuffer);
            } else if (enc.includes('br')) {
              rawBuffer = zlib.brotliDecompressSync(rawBuffer);
            }
          } catch (decompErr) {
            // keep raw buffer if decompression fails
          }

          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage || http.STATUS_CODES[res.statusCode] || '',
            headers: res.headers,
            bodyBuffer: rawBuffer,
            sizeBytes: totalBytes,
            timing,
            url: targetUrl.toString()
          });
        });

        res.on('error', (err) => {
          reject(err);
        });
      });

      req.on('socket', (socket) => {
        socket.on('lookup', () => {
          timing.dnsDone = Number((process.hrtime.bigint() - startTime) / 1000000n);
        });
        socket.on('connect', () => {
          timing.connectDone = Number((process.hrtime.bigint() - startTime) / 1000000n);
        });
        socket.on('secureConnect', () => {
          timing.tlsDone = Number((process.hrtime.bigint() - startTime) / 1000000n);
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };

  let finalResponse = null;
  let currentMethod = upperMethod;
  let currentPayload = requestPayload;

  while (true) {
    if (isBlockedHost(currentUrl.hostname)) {
      throw new Error(`Redirect target ${currentUrl.hostname} is restricted.`);
    }

    const hopRes = await runSingleHop(currentUrl, currentMethod, currentPayload);
    const isRedirect = [301, 302, 303, 307, 308].includes(hopRes.statusCode);

    redirectTrace.push({
      url: hopRes.url,
      statusCode: hopRes.statusCode,
      statusMessage: hopRes.statusMessage,
      location: hopRes.headers['location'] || null,
      timingMs: Math.round(hopRes.timing.total)
    });

    if (isRedirect && hopRes.headers['location'] && remainingRedirects > 0) {
      remainingRedirects--;
      const nextLocation = hopRes.headers['location'];
      try {
        currentUrl = new URL(nextLocation, currentUrl);
      } catch (e) {
        finalResponse = hopRes;
        break;
      }

      // If 303 or (301/302 from POST), convert to GET
      if (hopRes.statusCode === 303 || ((hopRes.statusCode === 301 || hopRes.statusCode === 302) && currentMethod === 'POST')) {
        currentMethod = 'GET';
        currentPayload = null;
        delete outgoingHeaders['content-type'];
        delete outgoingHeaders['content-length'];
      }
    } else {
      finalResponse = hopRes;
      break;
    }
  }

  // Parse Body
  const rawText = finalResponse.bodyBuffer.toString('utf8');
  let parsedJson = null;
  let isJson = false;

  const contentType = (finalResponse.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
    try {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    } catch (e) {
      // not valid JSON
    }
  }

  // Evaluate Assertions
  const assertionResults = [];
  if (Array.isArray(assertions) && assertions.length > 0) {
    for (const test of assertions) {
      if (!test || !test.type) continue;
      let passed = false;
      let actual = '';
      let message = '';

      switch (test.type) {
        case 'status_equals': {
          const expected = parseInt(test.expected, 10);
          actual = finalResponse.statusCode;
          passed = actual === expected;
          message = passed ? `Status code is ${expected}` : `Expected status ${expected} but received ${actual}`;
          break;
        }
        case 'response_time_lt': {
          const maxMs = parseInt(test.expected, 10);
          actual = Math.round(finalResponse.timing.total);
          passed = actual <= maxMs;
          message = passed ? `Response time ${actual}ms is under ${maxMs}ms` : `Response time ${actual}ms exceeded max ${maxMs}ms`;
          break;
        }
        case 'content_type_contains': {
          const needle = String(test.expected || '').toLowerCase();
          actual = contentType;
          passed = actual.includes(needle);
          message = passed ? `Content-Type contains "${needle}"` : `Content-Type "${actual}" does not contain "${needle}"`;
          break;
        }
        case 'body_contains': {
          const needle = String(test.expected || '');
          passed = rawText.includes(needle);
          actual = passed ? 'Found' : 'Not found';
          message = passed ? `Body contains text "${needle}"` : `Body does not contain "${needle}"`;
          break;
        }
        case 'json_field_exists': {
          if (!isJson || !parsedJson) {
            passed = false;
            actual = 'Not JSON';
            message = 'Response is not JSON or could not be parsed';
          } else {
            const pathParts = String(test.expected || '').split('.');
            let curr = parsedJson;
            let found = true;
            for (const part of pathParts) {
              if (curr && typeof curr === 'object' && part in curr) {
                curr = curr[part];
              } else {
                found = false;
                break;
              }
            }
            passed = found && curr !== undefined && curr !== null;
            actual = passed ? JSON.stringify(curr) : 'Undefined';
            message = passed ? `JSON field "${test.expected}" exists (${actual})` : `JSON field "${test.expected}" not found`;
          }
          break;
        }
        default:
          continue;
      }

      assertionResults.push({
        id: test.id || String(Date.now()),
        type: test.type,
        name: test.name || test.type,
        expected: test.expected,
        actual,
        passed,
        message
      });
    }
  }

  return {
    success: true,
    url: currentUrl.toString(),
    method: upperMethod,
    statusCode: finalResponse.statusCode,
    statusMessage: finalResponse.statusMessage,
    statusText: `${finalResponse.statusCode} ${finalResponse.statusMessage}`.trim(),
    headers: finalResponse.headers,
    sizeBytes: finalResponse.sizeBytes,
    timing: {
      dnsMs: Math.round(finalResponse.timing.dnsDone),
      tcpMs: Math.round(finalResponse.timing.connectDone - finalResponse.timing.dnsDone),
      tlsMs: Math.round(finalResponse.timing.tlsDone - finalResponse.timing.connectDone),
      ttfbMs: Math.round(finalResponse.timing.ttfb),
      totalMs: Math.round(finalResponse.timing.total)
    },
    redirectTrace,
    isJson,
    jsonData: parsedJson,
    rawBody: rawText.length > 500000 ? rawText.slice(0, 500000) + '... [truncated]' : rawText,
    assertions: assertionResults,
    timestamp: Date.now()
  };
}

module.exports = {
  executeApiRequest
};
