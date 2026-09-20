const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleReportsRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const segments = pathname.split('/').filter(Boolean); // ['api', 'reports', ...]
  const reportId = segments[2] || null;

  try {
    // 1. GET /api/reports - List metadata
    if (!reportId && req.method === 'GET') {
      const projectId = queryParams.get('project_id') || null;
      const testType = queryParams.get('test_type') || null;
      const limit = Math.min(Math.max(parseInt(queryParams.get('limit') || '20', 10), 1), 100);
      const offset = Math.max(parseInt(queryParams.get('offset') || '0', 10), 0);

      let whereClauses = ['r.user_id = ?'];
      let params = [user.id];

      if (projectId) {
        whereClauses.push('r.project_id = ?');
        params.push(projectId);
      }

      if (testType && testType !== 'all') {
        whereClauses.push('r.test_type = ?');
        params.push(testType);
      }

      const whereSql = whereClauses.join(' AND ');

      const total = db.prepare(`SELECT COUNT(*) as count FROM reports r WHERE ${whereSql}`).get(...params).count;

      const rows = db.prepare(`
        SELECT 
          r.id, r.user_id, r.project_id, r.history_id, r.test_type, r.target_url, r.created_at,
          p.name as project_name,
          (SELECT COUNT(*) FROM screenshots s WHERE s.report_id = r.id) as screenshot_count
        FROM reports r
        LEFT JOIN projects p ON p.id = r.project_id
        WHERE ${whereSql}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      return sendJson(res, 200, {
        success: true,
        reports: rows.map(r => ({
          id: r.id,
          projectId: r.project_id,
          projectName: r.project_name,
          historyId: r.history_id,
          testType: r.test_type,
          targetUrl: r.target_url,
          screenshotCount: r.screenshot_count,
          createdAt: r.created_at
        })),
        total,
        limit,
        offset
      });
    }

    // 2. POST /api/reports - Store full report JSON
    if (!reportId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { projectId, historyId, testType, targetUrl, resultJson } = body;

      if (!testType || !targetUrl || !resultJson) {
        return sendError(res, 400, 'testType, targetUrl, and resultJson are required.', 'VALIDATION_ERROR');
      }

      if (projectId) {
        const proj = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
        if (!proj) {
          return sendError(res, 404, 'Project not found or not owned by user.', 'PROJECT_NOT_FOUND');
        }
      }

      const id = 'rep_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const jsonStr = typeof resultJson === 'string' ? resultJson : JSON.stringify(resultJson);

      db.prepare(`
        INSERT INTO reports (id, user_id, project_id, history_id, test_type, target_url, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(id, user.id, projectId || null, historyId || null, testType, targetUrl, jsonStr);

      if (projectId) {
        db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(projectId);
      }

      return sendJson(res, 201, {
        success: true,
        message: 'Report saved successfully.',
        reportId: id
      });
    }

    // 3. GET /api/reports/:id - Fetch complete report
    if (reportId && req.method === 'GET') {
      const row = db.prepare(`
        SELECT r.*, p.name as project_name
        FROM reports r
        LEFT JOIN projects p ON p.id = r.project_id
        WHERE r.id = ? AND r.user_id = ?
      `).get(reportId, user.id);

      if (!row) {
        return sendError(res, 404, 'Report not found.', 'NOT_FOUND');
      }

      let parsedData = {};
      try {
        parsedData = JSON.parse(row.result_json);
      } catch (e) {
        parsedData = { raw: row.result_json };
      }

      const screenshots = db.prepare(`
        SELECT id, filename, device_name, viewport, browser, screenshot_type, created_at
        FROM screenshots
        WHERE report_id = ? AND user_id = ?
      `).all(reportId, user.id);

      return sendJson(res, 200, {
        success: true,
        report: {
          id: row.id,
          projectId: row.project_id,
          projectName: row.project_name,
          historyId: row.history_id,
          testType: row.test_type,
          targetUrl: row.target_url,
          result: parsedData,
          screenshots,
          createdAt: row.created_at
        }
      });
    }

    // 4. DELETE /api/reports/:id
    if (reportId && req.method === 'DELETE') {
      const info = db.prepare('DELETE FROM reports WHERE id = ? AND user_id = ?').run(reportId, user.id);
      if (info.changes === 0) {
        return sendError(res, 404, 'Report not found or access denied.', 'NOT_FOUND');
      }
      return sendJson(res, 200, { success: true, message: 'Report deleted successfully.' });
    }

    return sendError(res, 404, `Reports endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[reports-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in reports API.');
  }
}

module.exports = {
  handleReportsRequest
};
