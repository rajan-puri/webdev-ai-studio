const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleScreenshotsRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const segments = pathname.split('/').filter(Boolean); // ['api', 'screenshots', ...]
  const screenshotId = segments[2] || null;

  try {
    // 1. GET /api/screenshots - List metadata
    if (!screenshotId && req.method === 'GET') {
      const projectId = queryParams.get('project_id') || null;
      const reportId = queryParams.get('report_id') || null;
      const limit = Math.min(Math.max(parseInt(queryParams.get('limit') || '30', 10), 1), 100);
      const offset = Math.max(parseInt(queryParams.get('offset') || '0', 10), 0);

      let whereClauses = ['s.user_id = ?'];
      let params = [user.id];

      if (projectId) {
        whereClauses.push('s.project_id = ?');
        params.push(projectId);
      }

      if (reportId) {
        whereClauses.push('s.report_id = ?');
        params.push(reportId);
      }

      const whereSql = whereClauses.join(' AND ');

      const total = db.prepare(`SELECT COUNT(*) as count FROM screenshots s WHERE ${whereSql}`).get(...params).count;

      const rows = db.prepare(`
        SELECT 
          s.id, s.project_id, s.report_id, s.filename, s.device_name,
          s.viewport, s.browser, s.screenshot_type, s.created_at,
          p.name as project_name
        FROM screenshots s
        LEFT JOIN projects p ON p.id = s.project_id
        WHERE ${whereSql}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      return sendJson(res, 200, {
        success: true,
        screenshots: rows,
        total,
        limit,
        offset
      });
    }

    // 2. POST /api/screenshots - Upload / save screenshot
    if (!screenshotId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        projectId,
        reportId,
        filename,
        deviceName,
        viewport,
        browser = 'chromium',
        screenshotType = 'viewport',
        dataUri
      } = body;

      if (!dataUri || !filename) {
        return sendError(res, 400, 'filename and dataUri are required.', 'VALIDATION_ERROR');
      }

      if (projectId) {
        const proj = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
        if (!proj) {
          return sendError(res, 404, 'Project not found or not owned by user.', 'PROJECT_NOT_FOUND');
        }
      }

      const id = 'scr_' + uuidv4().replace(/-/g, '').substring(0, 16);

      db.prepare(`
        INSERT INTO screenshots (id, user_id, project_id, report_id, filename, device_name, viewport, browser, screenshot_type, data_uri, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        id,
        user.id,
        projectId || null,
        reportId || null,
        filename,
        deviceName || null,
        viewport || null,
        browser,
        screenshotType,
        dataUri
      );

      return sendJson(res, 201, {
        success: true,
        message: 'Screenshot stored.',
        screenshotId: id
      });
    }

    // 3. GET /api/screenshots/:id - Get full screenshot with dataUri
    if (screenshotId && req.method === 'GET') {
      const row = db.prepare(`
        SELECT s.*, p.name as project_name
        FROM screenshots s
        LEFT JOIN projects p ON p.id = s.project_id
        WHERE s.id = ? AND s.user_id = ?
      `).get(screenshotId, user.id);

      if (!row) {
        return sendError(res, 404, 'Screenshot not found.', 'NOT_FOUND');
      }

      return sendJson(res, 200, {
        success: true,
        screenshot: row
      });
    }

    // 4. DELETE /api/screenshots/:id
    if (screenshotId && req.method === 'DELETE') {
      const info = db.prepare('DELETE FROM screenshots WHERE id = ? AND user_id = ?').run(screenshotId, user.id);
      if (info.changes === 0) {
        return sendError(res, 404, 'Screenshot not found or unauthorized.', 'NOT_FOUND');
      }
      return sendJson(res, 200, { success: true, message: 'Screenshot deleted.' });
    }

    return sendError(res, 404, `Screenshots endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[screenshots-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in screenshots API.');
  }
}

module.exports = {
  handleScreenshotsRequest
};
