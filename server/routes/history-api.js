const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleHistoryRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return;

  const segments = pathname.split('/').filter(Boolean); // ['api', 'history', ...]
  const historyId = segments[2] || null;

  try {
    // 1. GET /api/history - List history with filtering and pagination
    if (!historyId && req.method === 'GET') {
      const projectId = queryParams.get('project_id') || null;
      const testType = queryParams.get('test_type') || null;
      const status = queryParams.get('status') || null;
      const search = queryParams.get('search') ? queryParams.get('search').trim() : '';
      const sort = queryParams.get('sort') === 'oldest' ? 'ASC' : 'DESC';
      const limit = Math.min(Math.max(parseInt(queryParams.get('limit') || '20', 10), 1), 100);
      const offset = Math.max(parseInt(queryParams.get('offset') || '0', 10), 0);

      let whereClauses = ['th.user_id = ?'];
      let params = [user.id];

      if (projectId) {
        whereClauses.push('th.project_id = ?');
        params.push(projectId);
      }

      if (testType && testType !== 'all') {
        whereClauses.push('th.test_type = ?');
        params.push(testType);
      }

      if (status && status !== 'all') {
        whereClauses.push('th.status = ?');
        params.push(status);
      }

      if (search) {
        whereClauses.push('(th.target_url LIKE ? OR th.test_type LIKE ? OR p.name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereSql = whereClauses.join(' AND ');

      // Total count
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM test_history th
        LEFT JOIN projects p ON p.id = th.project_id
        WHERE ${whereSql}
      `);
      const total = countStmt.get(...params).count;

      // Query records
      const querySql = `
        SELECT 
          th.id, th.user_id, th.project_id, th.test_type, th.target_url, 
          th.status, th.summary, th.duration_ms, th.created_at,
          p.name as project_name,
          (SELECT id FROM reports r WHERE r.history_id = th.id LIMIT 1) as report_id
        FROM test_history th
        LEFT JOIN projects p ON p.id = th.project_id
        WHERE ${whereSql}
        ORDER BY th.created_at ${sort}
        LIMIT ? OFFSET ?
      `;

      const rows = db.prepare(querySql).all(...params, limit, offset);

      const items = rows.map(r => {
        let parsedSummary = {};
        try {
          parsedSummary = typeof r.summary === 'string' ? JSON.parse(r.summary || '{}') : (r.summary || {});
        } catch (e) {
          parsedSummary = {};
        }
        return {
          id: r.id,
          projectId: r.project_id,
          projectName: r.project_name,
          testType: r.test_type,
          targetUrl: r.target_url,
          status: r.status,
          summary: parsedSummary,
          durationMs: r.duration_ms,
          reportId: r.report_id,
          createdAt: r.created_at
        };
      });

      return sendJson(res, 200, {
        success: true,
        items,
        total,
        limit,
        offset
      });
    }

    // 2. POST /api/history - Record history item
    if (!historyId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { projectId, testType, targetUrl, status = 'completed', summary = {}, durationMs = 0 } = body;

      if (!testType || !targetUrl) {
        return sendError(res, 400, 'testType and targetUrl are required.', 'VALIDATION_ERROR');
      }

      // If projectId is passed, verify user ownership of project
      if (projectId) {
        const proj = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
        if (!proj) {
          return sendError(res, 404, 'Associated project not found or not owned by user.', 'PROJECT_NOT_FOUND');
        }
      }

      const id = 'hist_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const summaryStr = JSON.stringify(summary || {});

      db.prepare(`
        INSERT INTO test_history (id, user_id, project_id, test_type, target_url, status, summary, duration_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(id, user.id, projectId || null, testType, targetUrl, status, summaryStr, durationMs);

      // Update project updated_at if tied to project
      if (projectId) {
        db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(projectId);
      }

      const created = db.prepare('SELECT * FROM test_history WHERE id = ?').get(id);
      return sendJson(res, 201, {
        success: true,
        item: {
          ...created,
          summary: typeof created.summary === 'string' ? JSON.parse(created.summary) : created.summary
        }
      });
    }

    // 3. DELETE /api/history - Clear all user history
    if (!historyId && req.method === 'DELETE') {
      db.prepare('DELETE FROM test_history WHERE user_id = ?').run(user.id);
      return sendJson(res, 200, { success: true, message: 'All test history cleared.' });
    }

    // 4. GET /api/history/:id - Detail view
    if (historyId && req.method === 'GET') {
      const row = db.prepare(`
        SELECT 
          th.*,
          p.name as project_name,
          r.id as report_id
        FROM test_history th
        LEFT JOIN projects p ON p.id = th.project_id
        LEFT JOIN reports r ON r.history_id = th.id
        WHERE th.id = ? AND th.user_id = ?
      `).get(historyId, user.id);

      if (!row) {
        return sendError(res, 404, 'History record not found.', 'NOT_FOUND');
      }

      let parsedSummary = {};
      try {
        parsedSummary = typeof row.summary === 'string' ? JSON.parse(row.summary || '{}') : (row.summary || {});
      } catch (e) {}

      return sendJson(res, 200, {
        success: true,
        item: {
          ...row,
          summary: parsedSummary
        }
      });
    }

    // 5. DELETE /api/history/:id - Delete single history entry
    if (historyId && req.method === 'DELETE') {
      const info = db.prepare('DELETE FROM test_history WHERE id = ? AND user_id = ?').run(historyId, user.id);
      if (info.changes === 0) {
        return sendError(res, 404, 'History item not found or unauthorized.', 'NOT_FOUND');
      }
      return sendJson(res, 200, { success: true, message: 'History record deleted.' });
    }

    return sendError(res, 404, `History endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[history-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in history API.');
  }
}

module.exports = {
  handleHistoryRequest
};
