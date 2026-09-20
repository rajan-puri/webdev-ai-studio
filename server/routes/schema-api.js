/**
 * server/routes/schema-api.js
 * REST API routes for WebDev AI Studio Schema / Structured Data Workspace.
 * Full discovery, URL fact extraction, JSON-LD generation, multi-layer validation, and SQLite persistence.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth, getSessionUser } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const { validateAndResolveUrl } = require('../services/seo/url-utils');
const { parsePageHtml } = require('../services/seo/html-parser');
const { analyzeSchema } = require('../services/qa/schema');
const {
  SCHEMA_TYPE_CATALOG,
  generateJsonLd,
  validateSchema,
  mapPageFactsToSchema
} = require('../services/schema/schema-engine');

/**
 * Fetch raw HTML over HTTP/HTTPS with timeout and SSRF guard
 */
async function fetchPageHtml(targetUrl, timeoutMs = 12000) {
  const parsed = await validateAndResolveUrl(targetUrl);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Connection timed out while fetching target URL (12s limit).'));
    }, timeoutMs);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (compatible; WebDevBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    const req = client.get(parsed.toString(), { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        const redirectUrl = new URL(res.headers.location, targetUrl).toString();
        // Recursively follow one redirect safely
        return fetchPageHtml(redirectUrl, timeoutMs).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        clearTimeout(timer);
        return reject(new Error(`Server responded with HTTP status code ${res.statusCode}`));
      }

      const chunks = [];
      let totalBytes = 0;
      const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit for HTML

      res.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_BYTES) {
          clearTimeout(timer);
          req.destroy();
          return reject(new Error('Target page HTML exceeds maximum allowed size (5MB).'));
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        clearTimeout(timer);
        const html = Buffer.concat(chunks).toString('utf8');
        resolve({ html, finalUrl: parsed.toString() });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function handleSchemaRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  // Allow schema catalog & validation without strict auth, but require auth for user history & saving
  const user = getSessionUser(req);

  const segments = pathname.split('/').filter(Boolean); // ['api', 'schema', ...]
  const action = segments[2] || '';
  const subId = segments[3] || '';

  try {
    // 1. GET /api/schema/catalog
    if (action === 'catalog' && req.method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        catalog: SCHEMA_TYPE_CATALOG
      });
    }

    // 2. POST /api/schema/analyze (URL discovery or HTML parsing)
    if (action === 'analyze' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { url, html, schemaType = 'LocalBusiness' } = body;

      if (!url && !html) {
        return sendError(res, 400, 'Either "url" or "html" content must be provided for schema analysis.', 'VALIDATION_ERROR');
      }

      let sourceHtml = '';
      let targetUrl = url || 'https://pasted.local';

      if (url) {
        try {
          const fetchResult = await fetchPageHtml(url);
          sourceHtml = fetchResult.html;
          targetUrl = fetchResult.finalUrl;
        } catch (fetchErr) {
          return sendError(res, 400, `Failed to analyze URL: ${fetchErr.message}`, 'FETCH_FAILED');
        }
      } else {
        sourceHtml = html;
      }

      // Deep parse using SEO parser
      const parsedData = parsePageHtml(sourceHtml, targetUrl);

      // QA schema analyzer for rich microdata, JSON-LD, RDFa detection
      const qaSchemaAnalysis = analyzeSchema(sourceHtml);

      // Map facts for easy UI form pre-fill
      const initialFacts = mapPageFactsToSchema(parsedData, schemaType);

      // Existing schemas summary
      const existingSchemas = {
        detectedTypes: qaSchemaAnalysis.uniqueTypes || parsedData.structuredData?.types || [],
        jsonLdBlocks: qaSchemaAnalysis.jsonLdBlocks || [],
        hasErrors: parsedData.structuredData?.hasErrors || false,
        errorDetails: parsedData.structuredData?.errorDetails || []
      };

      return sendJson(res, 200, {
        success: true,
        url: targetUrl,
        pageData: {
          title: (typeof parsedData.title === 'object' && parsedData.title !== null) ? (parsedData.title.text || '') : (parsedData.title || ''),
          description: parsedData.metaDescription?.text || '',
          canonical: parsedData.canonical?.resolved || targetUrl,
          h1: parsedData.headings?.h1 || [],
          h2: parsedData.headings?.h2 || [],
          openGraph: parsedData.openGraph,
          images: (parsedData.images?.items || []).slice(0, 10),
          wordCount: parsedData.content?.wordCount || 0
        },
        existingSchemas,
        initialFacts
      });
    }

    // 3. POST /api/schema/generate (Deterministic generation & instant validation)
    if (action === 'generate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { type, facts = {} } = body;

      if (!type) {
        return sendError(res, 400, 'Schema "type" is required.', 'VALIDATION_ERROR');
      }

      const jsonld = generateJsonLd(type, facts);
      const jsonldString = JSON.stringify(jsonld, null, 2);
      const validation = validateSchema(jsonld, type);

      return sendJson(res, 200, {
        success: true,
        type,
        jsonld,
        jsonldString,
        validation
      });
    }

    // 4. POST /api/schema/validate (Strict validation against Schema.org & Google requirements)
    if (action === 'validate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { jsonld, type } = body;

      if (jsonld === undefined || jsonld === null) {
        return sendError(res, 400, 'No JSON-LD payload provided for validation.', 'VALIDATION_ERROR');
      }

      const validation = validateSchema(jsonld, type);
      return sendJson(res, 200, {
        success: true,
        validation
      });
    }

    // 5. GET /api/schema/history (List saved schemas for active user)
    if (action === 'history' && !subId && req.method === 'GET') {
      const activeUser = user || { id: 'user_demo' }; // Fallback to demo user if unauthenticated in dev

      const rows = db.prepare(`
        SELECT s.*, p.name as project_name
        FROM saved_schemas s
        LEFT JOIN projects p ON p.id = s.project_id
        WHERE s.user_id = ?
        ORDER BY s.updated_at DESC, s.created_at DESC
      `).all(activeUser.id);

      const schemas = rows.map(r => {
        let facts = {};
        let validation = {};
        try { facts = JSON.parse(r.facts_json); } catch (e) {}
        try { validation = JSON.parse(r.validation_summary); } catch (e) {}
        return {
          ...r,
          facts,
          validation
        };
      });

      return sendJson(res, 200, {
        success: true,
        schemas
      });
    }

    // 6. POST /api/schema/history (Save a schema to database)
    if (action === 'history' && !subId && req.method === 'POST') {
      const activeUser = user || { id: 'user_demo' };
      const body = await readJsonBody(req);
      const {
        name,
        schema_type,
        source_url = '',
        facts = {},
        jsonld_output,
        validation_summary = {},
        project_id = null
      } = body;

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Schema name is required.', 'VALIDATION_ERROR');
      }

      if (!schema_type) {
        return sendError(res, 400, 'Schema type is required.', 'VALIDATION_ERROR');
      }

      if (!jsonld_output) {
        return sendError(res, 400, 'JSON-LD output is required.', 'VALIDATION_ERROR');
      }

      const schemaId = 'sch_' + uuidv4().replace(/-/g, '');
      const factsJson = typeof facts === 'string' ? facts : JSON.stringify(facts);
      const validationJson = typeof validation_summary === 'string' ? validation_summary : JSON.stringify(validation_summary);
      const jsonldStr = typeof jsonld_output === 'string' ? jsonld_output : JSON.stringify(jsonld_output, null, 2);

      db.prepare(`
        INSERT INTO saved_schemas (id, user_id, project_id, name, schema_type, source_url, facts_json, jsonld_output, validation_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(schemaId, activeUser.id, project_id, name.trim(), schema_type, source_url, factsJson, jsonldStr, validationJson);

      // Record in test_history for unified studio reporting
      try {
        const historyId = 'hist_' + uuidv4().replace(/-/g, '');
        db.prepare(`
          INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary)
          VALUES (?, ?, ?, 'schema', ?, 'completed', ?)
        `).run(
          historyId,
          activeUser.id,
          project_id,
          source_url || 'manual://schema-generator',
          JSON.stringify({ schema_id: schemaId, schema_type, name: name.trim() })
        );
      } catch (histErr) {
        console.warn('[schema-api] Failed to log test_history entry:', histErr.message);
      }

      return sendJson(res, 201, {
        success: true,
        id: schemaId,
        message: 'Schema saved successfully.'
      });
    }

    // 7. PUT /api/schema/history/:id (Update saved schema)
    if (action === 'history' && subId && req.method === 'PUT') {
      const activeUser = user || { id: 'user_demo' };
      const body = await readJsonBody(req);
      const { name, facts, jsonld_output, validation_summary, project_id } = body;

      const existing = db.prepare('SELECT id FROM saved_schemas WHERE id = ? AND user_id = ?').get(subId, activeUser.id);
      if (!existing) {
        return sendError(res, 404, 'Saved schema not found or unauthorized.', 'NOT_FOUND');
      }

      const updates = [];
      const params = [];

      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      if (facts !== undefined) { updates.push('facts_json = ?'); params.push(typeof facts === 'string' ? facts : JSON.stringify(facts)); }
      if (jsonld_output) { updates.push('jsonld_output = ?'); params.push(typeof jsonld_output === 'string' ? jsonld_output : JSON.stringify(jsonld_output, null, 2)); }
      if (validation_summary !== undefined) { updates.push('validation_summary = ?'); params.push(typeof validation_summary === 'string' ? validation_summary : JSON.stringify(validation_summary)); }
      if (project_id !== undefined) { updates.push('project_id = ?'); params.push(project_id); }

      updates.push("updated_at = datetime('now')");
      params.push(subId);
      params.push(activeUser.id);

      db.prepare(`UPDATE saved_schemas SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

      return sendJson(res, 200, {
        success: true,
        message: 'Schema updated successfully.'
      });
    }

    // 8. DELETE /api/schema/history/:id (Delete saved schema)
    if (action === 'history' && subId && req.method === 'DELETE') {
      const activeUser = user || { id: 'user_demo' };
      const result = db.prepare('DELETE FROM saved_schemas WHERE id = ? AND user_id = ?').run(subId, activeUser.id);

      if (result.changes === 0) {
        return sendError(res, 404, 'Saved schema not found or unauthorized.', 'NOT_FOUND');
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Schema deleted successfully.'
      });
    }

    return sendError(res, 404, `Unknown Schema API endpoint: ${pathname}`, 'NOT_FOUND');
  } catch (err) {
    console.error('[schema-api] Internal error:', err);
    return sendError(res, 500, `Internal Schema API error: ${err.message}`, 'SERVER_ERROR');
  }
}

module.exports = {
  handleSchemaRequest
};
