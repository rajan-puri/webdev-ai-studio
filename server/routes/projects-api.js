const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');

async function handleProjectsRequest(req, res, pathname, queryParams = new URLSearchParams()) {
  const user = requireAuth(req, res);
  if (!user) return; // 401 response already sent

  const segments = pathname.split('/').filter(Boolean); // ['api', 'projects', ...]
  const projectId = segments[2] || null;
  const subAction = segments[3] || null;

  try {
    // 1. GET /api/projects - List projects
    if (!projectId && req.method === 'GET') {
      const showArchived = queryParams.get('archived') === '1' ? 1 : 0;

      const stmt = db.prepare(`
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM test_history th WHERE th.project_id = p.id) as tests_count,
          (SELECT COUNT(*) FROM reports r WHERE r.project_id = p.id) as reports_count,
          (SELECT COUNT(*) FROM screenshots s WHERE s.project_id = p.id) as screenshots_count,
          (SELECT COUNT(*) FROM visual_baselines vb WHERE vb.project_id = p.id) as baselines_count,
          (SELECT MAX(created_at) FROM test_history th WHERE th.project_id = p.id) as last_activity_at
        FROM projects p
        WHERE p.user_id = ? AND p.archived = ?
        ORDER BY p.updated_at DESC
      `);

      const projects = stmt.all(user.id, showArchived);
      return sendJson(res, 200, { success: true, projects });
    }

    // 2. POST /api/projects - Create project
    if (!projectId && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { name, website_url, url, description = '' } = body;
      const targetUrl = website_url || url;

      if (!name || !name.trim()) {
        return sendError(res, 400, 'Project name is required.', 'VALIDATION_ERROR');
      }

      if (!targetUrl || !targetUrl.trim()) {
        return sendError(res, 400, 'Website URL is required.', 'VALIDATION_ERROR');
      }

      let cleanUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }

      try {
        new URL(cleanUrl);
      } catch (e) {
        return sendError(res, 400, 'Invalid website URL format.', 'INVALID_URL');
      }

      const id = 'proj_' + uuidv4().replace(/-/g, '').substring(0, 16);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO projects (id, user_id, name, website_url, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, user.id, name.trim(), cleanUrl, (description || '').trim(), now, now);

      const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      return sendJson(res, 201, { success: true, project: created });
    }

    // 3. Project-specific operations
    if (projectId) {
      // Check ownership
      const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, user.id);
      if (!project) {
        return sendError(res, 404, 'Project not found or access denied.', 'NOT_FOUND');
      }

      // POST /api/projects/:id/archive
      if (subAction === 'archive' && req.method === 'POST') {
        const newArchived = project.archived === 1 ? 0 : 1;
        db.prepare('UPDATE projects SET archived = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newArchived, projectId);
        return sendJson(res, 200, {
          success: true,
          message: newArchived ? 'Project archived.' : 'Project restored.',
          archived: newArchived
        });
      }

      // GET /api/projects/:id - Details & full stats
      if (!subAction && req.method === 'GET') {
        const counts = db.prepare(`
          SELECT 
            (SELECT COUNT(*) FROM test_history WHERE project_id = ?) as tests_count,
            (SELECT COUNT(*) FROM reports WHERE project_id = ?) as reports_count,
            (SELECT COUNT(*) FROM screenshots WHERE project_id = ?) as screenshots_count,
            (SELECT COUNT(*) FROM visual_baselines WHERE project_id = ?) as baselines_count
        `).get(projectId, projectId, projectId, projectId);

        const recentTests = db.prepare(`
          SELECT id, test_type, target_url, status, summary, duration_ms, created_at
          FROM test_history
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `).all(projectId);

        const baselines = db.prepare(`
          SELECT id, device_name, viewport_width, viewport_height, dpr, browser, orientation, label, created_at
          FROM visual_baselines
          WHERE project_id = ?
          ORDER BY created_at DESC
        `).all(projectId);

        return sendJson(res, 200, {
          success: true,
          project: {
            ...project,
            stats: counts,
            recentTests: recentTests.map(t => ({
              ...t,
              summary: typeof t.summary === 'string' ? JSON.parse(t.summary || '{}') : t.summary
            })),
            baselines
          }
        });
      }

      // PUT /api/projects/:id - Update
      if (!subAction && (req.method === 'PUT' || req.method === 'PATCH')) {
        const body = await readJsonBody(req);
        const { name, website_url, url, description } = body;
        const targetUrl = website_url || url;

        let cleanUrl = project.website_url;
        if (targetUrl && targetUrl.trim()) {
          cleanUrl = targetUrl.trim();
          if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;
          try {
            new URL(cleanUrl);
          } catch (e) {
            return sendError(res, 400, 'Invalid website URL format.', 'INVALID_URL');
          }
        }

        const newName = name && name.trim() ? name.trim() : project.name;
        const newDesc = description !== undefined ? description.trim() : project.description;

        db.prepare(`
          UPDATE projects
          SET name = ?, website_url = ?, description = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `).run(newName, cleanUrl, newDesc, projectId, user.id);

        const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        return sendJson(res, 200, { success: true, project: updated });
      }

      // DELETE /api/projects/:id - Delete
      if (!subAction && req.method === 'DELETE') {
        db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(projectId, user.id);
        return sendJson(res, 200, { success: true, message: 'Project and all associated data deleted.' });
      }
    }

    return sendError(res, 404, `Project endpoint ${pathname} not found.`);
  } catch (err) {
    console.error('[projects-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in projects API.');
  }
}

module.exports = {
  handleProjectsRequest
};
