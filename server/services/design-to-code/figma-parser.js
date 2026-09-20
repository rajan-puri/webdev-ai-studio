/**
 * server/services/design-to-code/figma-parser.js
 * Figma URL validation, Node ID parsing, and official Figma API client.
 * Strictly adheres to Zero Fake Data: never guesses when credentials are missing.
 */

const https = require('https');

/**
 * Validates and extracts fileKey and nodeId from Figma URLs.
 * Handles:
 * - https://www.figma.com/design/:fileKey/:title?node-id=:nodeId
 * - https://www.figma.com/file/:fileKey/:title?node-id=:nodeId
 * - https://figma.com/board/:fileKey/...
 */
function parseFigmaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      valid: false,
      isValid: false,
      error: 'A valid Figma URL string is required.'
    };
  }

  const trimmed = rawUrl.trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err) {
    return {
      valid: false,
      isValid: false,
      error: 'Invalid or unsupported Figma URL.'
    };
  }

  if (!parsedUrl.hostname.includes('figma.com')) {
    return {
      valid: false,
      isValid: false,
      error: 'URL host must be figma.com.'
    };
  }

  // Paths: /design/:fileKey/..., /file/:fileKey/..., /board/:fileKey/...
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return {
      valid: false,
      isValid: false,
      error: 'Figma URL missing file key path segment.'
    };
  }

  const routeType = segments[0]; // 'design', 'file', 'board'
  if (!['design', 'file', 'board'].includes(routeType)) {
    return {
      valid: false,
      isValid: false,
      error: `Unsupported Figma route type: "${routeType}". Expected /design/ or /file/.`
    };
  }

  const fileKey = segments[1];
  if (!/^[a-zA-Z0-9_-]+$/.test(fileKey)) {
    return {
      valid: false,
      isValid: false,
      error: 'Malformed Figma file key format.'
    };
  }

  // Node ID from query parameters (?node-id=0-1 or ?node-id=0%3A1)
  let nodeId = parsedUrl.searchParams.get('node-id') || null;
  if (nodeId) {
    // Normalise 0-1 to 0:1
    nodeId = nodeId.replace('-', ':');
  }

  return {
    valid: true,
    isValid: true,
    fileKey,
    nodeId,
    routeType,
    fullUrl: trimmed
  };
}

/**
 * Queries official Figma REST API for file nodes if access token is available.
 */
function fetchFigmaNodes(fileKey, nodeId, accessToken) {
  return new Promise((resolve, reject) => {
    if (!accessToken) {
      return reject(new Error('Connect Figma to inspect design metadata.'));
    }

    const nodeQuery = nodeId ? `?ids=${encodeURIComponent(nodeId)}` : '';
    const endpoint = `https://api.figma.com/v1/files/${fileKey}/nodes${nodeQuery}`;

    const req = https.get(endpoint, {
      headers: {
        'X-Figma-Token': accessToken,
        'User-Agent': 'WebDev-AI-Studio/1.0'
      },
      timeout: 12000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 403 || res.statusCode === 401) {
          return reject(new Error('Invalid or expired Figma access token.'));
        }
        if (res.statusCode === 404) {
          return reject(new Error('Figma file or node not found. Verify permissions.'));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`Figma API error (HTTP ${res.statusCode}): ${data.slice(0, 200)}`));
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Malformed JSON received from Figma API.'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Figma API connection failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Figma API request timed out after 12s.'));
    });
  });
}

async function extractDesignMetadata({ fileKey, nodeId, accessToken } = {}) {
  if (!accessToken) {
    return {
      connected: false,
      message: 'Connect Figma to inspect design metadata.',
      fileKey: fileKey || null,
      nodeId: nodeId || null
    };
  }

  try {
    const nodes = await fetchFigmaNodes(fileKey, nodeId, accessToken);
    return {
      connected: true,
      nodes,
      fileKey,
      nodeId
    };
  } catch (err) {
    return {
      connected: false,
      message: err.message,
      fileKey,
      nodeId
    };
  }
}

module.exports = {
  parseFigmaUrl,
  fetchFigmaNodes,
  extractDesignMetadata
};
