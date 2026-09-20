/**
 * server/routes/api-tester.js
 * API Tester Route Handler
 */

const fs = require('fs');
const path = require('path');
const { executeApiRequest } = require('../services/api-tester/request-executor');

const DATA_DIR = path.join(__dirname, '../data');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'api-collections.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large (5MB max)'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, error: message });
}

function getStoredCollections() {
  if (fs.existsSync(COLLECTIONS_FILE)) {
    try {
      const data = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {}
  }
  // Default starter collection
  return [
    {
      id: 'default-col',
      name: 'Sample Endpoints',
      description: 'Public test endpoints for quick verification',
      requests: [
        {
          id: 'req-ping',
          name: 'Public JSON Echo',
          method: 'GET',
          url: 'https://httpbin.org/json',
          headers: {},
          queryParams: {},
          auth: { type: 'none' },
          bodyType: 'none',
          body: null,
          assertions: [
            { id: '1', type: 'status_equals', expected: 200, name: 'Status is 200' },
            { id: '2', type: 'content_type_contains', expected: 'application/json', name: 'JSON Content-Type' }
          ]
        },
        {
          id: 'req-post',
          name: 'POST Echo Data',
          method: 'POST',
          url: 'https://httpbin.org/post',
          headers: { 'Content-Type': 'application/json' },
          queryParams: {},
          auth: { type: 'none' },
          bodyType: 'json',
          body: JSON.stringify({ message: 'Hello from WebDev AI Studio API Tester!', timestamp: Date.now() }, null, 2),
          assertions: [
            { id: '1', type: 'status_equals', expected: 200, name: 'Status is 200' }
          ]
        }
      ]
    }
  ];
}

async function handleApiTesterRequest(req, res, pathname) {
  const method = req.method;

  // GET /api/tester/collections
  if (pathname === '/api/tester/collections' && method === 'GET') {
    try {
      const collections = getStoredCollections();
      sendJson(res, 200, { success: true, collections });
    } catch (err) {
      sendError(res, 500, err.message);
    }
    return;
  }

  // POST /api/tester/collections
  if (pathname === '/api/tester/collections' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (Array.isArray(body.collections)) {
        fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(body.collections, null, 2), 'utf8');
        sendJson(res, 200, { success: true });
      } else {
        sendError(res, 400, 'Invalid collections array');
      }
    } catch (err) {
      sendError(res, 500, err.message);
    }
    return;
  }

  // POST /api/tester/send
  if (pathname === '/api/tester/send' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body.url) {
        sendError(res, 400, 'Missing "url" parameter');
        return;
      }

      const result = await executeApiRequest({
        url: body.url,
        method: body.method || 'GET',
        headers: body.headers || {},
        queryParams: body.queryParams || {},
        auth: body.auth || null,
        body: body.body || null,
        bodyType: body.bodyType || 'none',
        timeoutMs: body.timeoutMs || 30000,
        assertions: body.assertions || []
      });

      sendJson(res, 200, result);
    } catch (err) {
      console.error('[ApiTester Error]', err.message);
      sendJson(res, 200, {
        success: false,
        error: err.message,
        statusCode: 0,
        statusText: 'Request Failed: ' + err.message,
        timing: { totalMs: 0 },
        headers: {},
        rawBody: '',
        assertions: []
      });
    }
    return;
  }

  sendError(res, 404, `Endpoint not found: ${pathname}`);
}

module.exports = {
  handleApiTesterRequest
};
