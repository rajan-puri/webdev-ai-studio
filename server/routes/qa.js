/**
 * server/routes/qa.js
 * Express-style route handler for Website QA Scanner
 */

const { scanWebsite } = require('../services/website-scanner');
const { runPhase2QaSuite } = require('../services/qa/phase2-runner');

async function handleQaScan(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    // Safety check: 1MB payload limit
    if (body.length > 1e6) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      let data = {};
      if (body) {
        try {
          data = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload in request.' }));
          return;
        }
      }

      const { url } = data;
      if (!url || typeof url !== 'string' || !url.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or empty "url" field in request body.' }));
        return;
      }

      const result = await scanWebsite(url.trim());
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[QA Scanner Error]', err.message);
      res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: err.message || 'An error occurred while scanning the website.'
      }));
    }
  });
}

async function handlePhase2Qa(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    if (body.length > 2e6) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      let data = {};
      if (body) {
        try {
          data = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload in request.' }));
          return;
        }
      }

      const { url, options, device, browser, orientation } = data;
      if (!url || typeof url !== 'string' || !url.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or empty "url" field in request body.' }));
        return;
      }

      const result = await runPhase2QaSuite({
        url: url.trim(),
        options: options || {},
        device: {
          ...(device || { name: 'Desktop HD', width: 1440, height: 900 }),
          orientation: orientation || device?.orientation || 'portrait'
        },
        browserType: browser || 'chromium'
      });

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store'
      });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[Phase 2 QA Error]', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: err.message || 'An error occurred while running the QA suite.'
      }));
    }
  });
}

module.exports = {
  handleQaScan,
  handlePhase2Qa
};
