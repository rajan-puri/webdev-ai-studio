const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleBaselinesRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const segments = pathname.split('/').filter(Boolean); // ['api', 'baselines', ...]
  const baselineId = segments[2] || null;
  const subAction = segments[3] || null;

  try {
    // 1. POST /api/baselines/find - Lookup baseline by exact parameters
    if (baselineId === 'find' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { projectId, targetUrl, deviceName, viewportWidth, viewportHeight, browser = 'chromium', orientation = 'portrait' } = body;

      if (!projectId || !targetUrl || !deviceName) {
        return sendError(res, 400, 'projectId, targetUrl, and deviceName are required for lookup.', 'VALIDATION_ERROR');
      }

      const match = db.prepare(`
        SELECT *
        FROM visual_baselines
        WHERE user_id = ? AND project_id = ? AND target_url = ? AND device_name = ?
          AND viewport_width = ? AND viewport_height = ? AND browser = ? AND orientation = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(user.id, projectId, targetUrl, deviceName, viewportWidth || 0, viewportHeight || 0, browser, orientation);

      return sendJson(res, 200, {
        success: true,
        baseline: match || null
      });
    }

    // 2. GET /api/baselines - List baselines (metadata only)
    if (!baselineId && req.method === 'GET') {
      const projectId = queryParams.get('project_id') || null;
      const targetUrl = queryParams.get('target_url') || null;

      let whereClauses = ['vb.user_id = ?'];
      let params = [user.id];

      if (projectId) {
        whereClauses.push('vb.project_id = ?');
        params.push(projectId);
      }

      if (targetUrl) {
        whereClauses.push('vb.target_url = ?');
        params.push(targetUrl);
      }

      const rows = db.prepare(`
        SELECT 
          vb.id, vb.project_id, vb.target_url, vb.device_name,
          vb.viewport_width, vb.viewport_height, vb.dpr, vb.browser,
          vb.orientation, vb.label, vb.created_at, vb.updated_at,
          p.name as project_name
        FROM visual_baselines vb
        LEFT JOIN projects p ON p.id = vb.project_id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY vb.updated_at DESC
      `).all(...params);

      return sendJson(res, 200, {
        success: true,
        baselines: rows
      });
    }

    // 3. POST /api/baselines - Create or update baseline
    if (!baselineId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        projectId,
        targetUrl,
        deviceName,
        viewportWidth = 1920,
        viewportHeight = 1080,
        dpr = 1,
        browser = 'chromium',
        orientation = 'portrait',
        baselineDataUri,
        label = 'Baseline'
      } = body;

      if (!projectId || !targetUrl || !deviceName || !baselineDataUri) {
        return sendError(res, 400, 'projectId, targetUrl, deviceName, and baselineDataUri are required.', 'VALIDATION_ERROR');
      }

      // Verify project ownership
      const proj = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
      if (!proj) {
        return sendError(res, 404, 'Project not found or not owned by user.', 'PROJECT_NOT_FOUND');
      }

      // Check if baseline already exists for this exact configuration
      const existing = db.prepare(`
        SELECT id FROM visual_baselines
        WHERE user_id = ? AND project_id = ? AND target_url = ? AND device_name = ?
          AND viewport_width = ? AND viewport_height = ? AND browser = ? AND orientation = ?
      `).get(user.id, projectId, targetUrl, deviceName, viewportWidth, viewportHeight, browser, orientation);

      let savedId;
      const now = new Date().toISOString();

      if (existing) {
        savedId = existing.id;
        db.prepare(`
          UPDATE visual_baselines
          SET baseline_data_uri = ?, label = ?, dpr = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(baselineDataUri, label || 'Updated Baseline', dpr, now, existing.id, user.id);
      } else {
        savedId = 'base_' + uuidv4().replace(/-/g, '').substring(0, 16);
        db.prepare(`
          INSERT INTO visual_baselines (id, user_id, project_id, target_url, device_name, viewport_width, viewport_height, dpr, browser, orientation, baseline_data_uri, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          savedId, user.id, projectId, targetUrl, deviceName,
          viewportWidth, viewportHeight, dpr, browser, orientation,
          baselineDataUri, label, now, now
        );
      }

      return sendJson(res, 201, {
        success: true,
        message: existing ? 'Visual baseline updated.' : 'Visual baseline created.',
        baselineId: savedId
      });
    }

    // 4. GET /api/baselines/:id - Get full baseline with data URI
    if (baselineId && req.method === 'GET') {
      const row = db.prepare(`
        SELECT vb.*, p.name as project_name
        FROM visual_baselines vb
        LEFT JOIN projects p ON p.id = vb.project_id
        WHERE vb.id = ? AND vb.user_id = ?
      `).get(baselineId, user.id);

      if (!row) {
        return sendError(res, 404, 'Baseline not found.', 'NOT_FOUND');
      }

      return sendJson(res, 200, {
        success: true,
        baseline: row
      });
    }

    // 5. DELETE /api/baselines/:id
    if (baselineId && req.method === 'DELETE') {
      const info = db.prepare('DELETE FROM visual_baselines WHERE id = ? AND user_id = ?').run(baselineId, user.id);
      if (info.changes === 0) {
        return sendError(res, 404, 'Baseline not found or unauthorized.', 'NOT_FOUND');
      }
      return sendJson(res, 200, { success: true, message: 'Baseline removed.' });
    }

    return sendError(res, 404, `Baselines endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[baselines-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in baselines API.');
  }
}

module.exports = {
  handleBaselinesRequest
};
