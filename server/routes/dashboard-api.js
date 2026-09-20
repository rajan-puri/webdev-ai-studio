const { db } = require('../data/database');
const { requireAuth } = require('../middleware/auth');
const { sendJson, sendError } = require('../utils/http-helpers');

async function handleDashboardRequest(req, res, pathname) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed.');
    }

    // Projects count
    const projectsCount = db.prepare(`
      SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND archived = 0
    `).get(user.id).count;

    // Test stats
    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) as total_tests,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_tests,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tests,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_tests,
        MAX(created_at) as last_test_at
      FROM test_history
      WHERE user_id = ?
    `).get(user.id);

    // Screenshots & Baselines count
    const screenshotsCount = db.prepare(`
      SELECT COUNT(*) as count FROM screenshots WHERE user_id = ?
    `).get(user.id).count;

    const baselinesCount = db.prepare(`
      SELECT COUNT(*) as count FROM visual_baselines WHERE user_id = ?
    `).get(user.id).count;

    const reportsCount = db.prepare(`
      SELECT COUNT(*) as count FROM reports WHERE user_id = ?
    `).get(user.id).count;

    // Recent projects
    const recentProjects = db.prepare(`
      SELECT id, name, website_url, description, updated_at,
        (SELECT COUNT(*) FROM test_history th WHERE th.project_id = p.id) as tests_count
      FROM projects p
      WHERE user_id = ? AND archived = 0
      ORDER BY updated_at DESC
      LIMIT 5
    `).all(user.id);

    // Recent tests / activity
    const recentTests = db.prepare(`
      SELECT th.id, th.test_type, th.target_url, th.status, th.summary, th.duration_ms, th.created_at,
        p.name as project_name, p.id as project_id
      FROM test_history th
      LEFT JOIN projects p ON p.id = th.project_id
      WHERE th.user_id = ?
      ORDER BY th.created_at DESC
      LIMIT 10
    `).all(user.id);

    const formattedTests = recentTests.map(t => {
      let parsedSummary = {};
      try {
        parsedSummary = typeof t.summary === 'string' ? JSON.parse(t.summary) : (t.summary || {});
      } catch (e) {}
      return {
        id: t.id,
        testType: t.test_type,
        targetUrl: t.target_url,
        status: t.status,
        summary: parsedSummary,
        durationMs: t.duration_ms,
        projectName: t.project_name,
        projectId: t.project_id,
        createdAt: t.created_at
      };
    });

    return sendJson(res, 200, {
      success: true,
      data: {
        projectsCount,
        totalTests: statsRow.total_tests || 0,
        passedTests: statsRow.passed_tests || 0,
        failedTests: statsRow.failed_tests || 0,
        warningTests: statsRow.warning_tests || 0,
        screenshotsCount,
        baselinesCount,
        reportsCount,
        lastTestAt: statsRow.last_test_at || null,
        recentProjects,
        recentActivity: formattedTests
      }
    });
  } catch (err) {
    console.error('[dashboard-api] Error handling request:', err);
    return sendError(res, 500, err.message || 'Internal server error in dashboard API.');
  }
}

module.exports = {
  handleDashboardRequest
};
