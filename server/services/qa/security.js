/**
 * server/services/qa/security.js
 * Analyzes HTTP security headers and reports actual values with developer recommendations.
 */

function analyzeSecurity(headers = {}) {
  const hsts = headers['strict-transport-security'] || null;
  const csp = headers['content-security-policy'] || null;
  const xFrameOptions = headers['x-frame-options'] || null;
  const xContentTypeOptions = headers['x-content-type-options'] || null;
  const referrerPolicy = headers['referrer-policy'] || null;
  const permissionsPolicy = headers['permissions-policy'] || null;

  const checks = [];

  // 1. Strict-Transport-Security (HSTS)
  if (hsts) {
    checks.push({
      id: 'sec-hsts',
      name: 'Strict-Transport-Security (HSTS)',
      severity: 'PASS',
      detectedValue: hsts,
      whyItMatters: 'Forces browsers to communicate with the domain exclusively over encrypted HTTPS.',
      message: `HSTS header active: "${hsts}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'sec-hsts',
      name: 'Strict-Transport-Security (HSTS)',
      severity: 'WARNING',
      detectedValue: 'Not configured',
      whyItMatters: 'HSTS prevents protocol downgrade attacks and cookie hijacking.',
      message: 'No Strict-Transport-Security header was returned.',
      fix: 'Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains'
    });
  }

  // 2. Content-Security-Policy (CSP)
  if (csp) {
    checks.push({
      id: 'sec-csp',
      name: 'Content-Security-Policy (CSP)',
      severity: 'PASS',
      detectedValue: csp.length > 80 ? csp.substring(0, 80) + '...' : csp,
      whyItMatters: 'Restricts script, stylesheet, and asset sources to mitigate Cross-Site Scripting (XSS).',
      message: 'Content-Security-Policy header detected.',
      fix: null
    });
  } else {
    checks.push({
      id: 'sec-csp',
      name: 'Content-Security-Policy (CSP)',
      severity: 'INFO',
      detectedValue: 'Not configured',
      whyItMatters: 'CSP helps prevent cross-site scripting (XSS) and unauthorized iframe embedding.',
      message: 'No Content-Security-Policy header returned (optional but recommended for web apps).',
      fix: 'Implement a Content-Security-Policy header allowing trusted script and style domains.'
    });
  }

  // 3. X-Frame-Options
  if (xFrameOptions) {
    checks.push({
      id: 'sec-x-frame-options',
      name: 'X-Frame-Options',
      severity: 'PASS',
      detectedValue: xFrameOptions,
      whyItMatters: 'Protects visitors against clickjacking attacks by forbidding unauthorized iframe embedding.',
      message: `X-Frame-Options set to "${xFrameOptions}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'sec-x-frame-options',
      name: 'X-Frame-Options',
      severity: 'WARNING',
      detectedValue: 'Not configured',
      whyItMatters: 'Without X-Frame-Options or CSP frame-ancestors, attackers could embed this page in a malicious iframe.',
      message: 'No X-Frame-Options header present.',
      fix: 'Add header: X-Frame-Options: SAMEORIGIN or use CSP frame-ancestors.'
    });
  }

  // 4. X-Content-Type-Options
  if (xContentTypeOptions && /nosniff/i.test(xContentTypeOptions)) {
    checks.push({
      id: 'sec-x-content-type',
      name: 'X-Content-Type-Options',
      severity: 'PASS',
      detectedValue: 'nosniff',
      whyItMatters: 'Prevents MIME type sniffing that can cause scripts to execute from disguised text or image files.',
      message: 'X-Content-Type-Options: nosniff is enabled.',
      fix: null
    });
  } else {
    checks.push({
      id: 'sec-x-content-type',
      name: 'X-Content-Type-Options',
      severity: 'WARNING',
      detectedValue: xContentTypeOptions || 'Not configured',
      whyItMatters: 'MIME-sniffing vulnerabilities allow malicious uploads to execute as HTML or scripts.',
      message: 'Missing "X-Content-Type-Options: nosniff" header.',
      fix: 'Add header: X-Content-Type-Options: nosniff'
    });
  }

  // 5. Referrer-Policy
  if (referrerPolicy) {
    checks.push({
      id: 'sec-referrer-policy',
      name: 'Referrer-Policy',
      severity: 'PASS',
      detectedValue: referrerPolicy,
      whyItMatters: 'Controls how much referrer information is sent when users navigate away.',
      message: `Referrer-Policy set to "${referrerPolicy}".`,
      fix: null
    });
  } else {
    checks.push({
      id: 'sec-referrer-policy',
      name: 'Referrer-Policy',
      severity: 'INFO',
      detectedValue: 'Default browser fallback (strict-origin-when-cross-origin)',
      whyItMatters: 'Explicit policy prevents leaking path and query parameters to third-party domains.',
      message: 'No explicit Referrer-Policy header found (browsers will use default fallback).',
      fix: 'Add header: Referrer-Policy: strict-origin-when-cross-origin'
    });
  }

  // 6. Permissions-Policy
  if (permissionsPolicy) {
    checks.push({
      id: 'sec-permissions-policy',
      name: 'Permissions-Policy',
      severity: 'PASS',
      detectedValue: permissionsPolicy,
      whyItMatters: 'Restricts access to browser features like camera, microphone, and geolocation.',
      message: 'Permissions-Policy header detected.',
      fix: null
    });
  }

  return {
    headers: {
      strictTransportSecurity: hsts,
      contentSecurityPolicy: csp,
      xFrameOptions,
      xContentTypeOptions,
      referrerPolicy,
      permissionsPolicy
    },
    checks
  };
}

module.exports = {
  analyzeSecurity
};
