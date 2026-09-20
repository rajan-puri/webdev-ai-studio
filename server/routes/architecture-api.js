/**
 * server/routes/architecture-api.js
 * REST API routes for WebDev AI Studio Architecture Graph & AI Context Graph.
 * Exposes graph traversal, shortest path, neighborhood extraction, impact analysis,
 * context budgeting, and AI queries.
 */

const { URL } = require('url');
const { db } = require('../data/database');
const { getSessionUser } = require('../middleware/auth');
const { readJsonBody, sendJson, sendError } = require('../utils/http-helpers');
const { GraphStore } = require('../services/architecture/graph-store');
const { QueryEngine } = require('../services/architecture/query-engine');
const { ImpactAnalyzer } = require('../services/architecture/impact-analyzer');
const { ContextPacker } = require('../services/architecture/context-packer');
const { AiGraphService } = require('../services/architecture/ai-graph-service');

const rootDir = process.cwd();
const store = new GraphStore(db, rootDir);
const queryEngine = new QueryEngine(db);
const impactAnalyzer = new ImpactAnalyzer(db);
const contextPacker = new ContextPacker(db, rootDir);
const aiGraphService = new AiGraphService(db, rootDir);

async function handleArchitectureRequest(req, res, pathname) {
  try {
    const user = getSessionUser(req);
    const parsedUrl = new URL(req.url, 'http://127.0.0.1:3000');
    const searchParams = parsedUrl.searchParams;

    // Normalize endpoint path: /api/architecture/...
    const segments = pathname.replace(/^\/api\/architecture\/?/, '').split('/').filter(Boolean);
    const action = segments[0] || 'graph';
    const subId = segments[1] ? decodeURIComponent(segments.slice(1).join('/')) : null;

    // 1. GET /api/architecture/graph
    if (action === 'graph' && req.method === 'GET') {
      const filters = {
        subsystem: searchParams.get('subsystem') || 'all',
        type: searchParams.get('type') || 'all',
        search: searchParams.get('search') || '',
        projectId: searchParams.get('projectId') || null
      };

      const result = store.getGraph(filters);
      return sendJson(res, 200, {
        success: true,
        ...result
      });
    }

    // 2. POST /api/architecture/index (trigger re-index)
    if (action === 'index' && req.method === 'POST') {
      const body = await readJsonBody(req).catch(() => ({}));
      const projectId = body.projectId || null;
      const stats = await store.rebuildIndex(projectId);

      return sendJson(res, 200, {
        success: true,
        message: 'Architecture graph successfully re-indexed.',
        stats
      });
    }

    // 3. GET /api/architecture/node/:id
    if (action === 'node' && subId && req.method === 'GET') {
      const result = store.getNodeById(subId);
      if (!result) {
        return sendError(res, 404, `Node not found: ${subId}`, 'NOT_FOUND');
      }
      return sendJson(res, 200, {
        success: true,
        ...result
      });
    }

    // 4. GET /api/architecture/path?source=...&target=...
    if (action === 'path' && req.method === 'GET') {
      const source = searchParams.get('source');
      const target = searchParams.get('target');
      if (!source || !target) {
        return sendError(res, 400, 'Both source and target node IDs are required.', 'BAD_REQUEST');
      }

      const result = queryEngine.findShortestPath(source, target);
      if (!result) {
        return sendJson(res, 200, {
          success: false,
          found: false,
          message: 'No path found between the specified nodes within search depth.'
        });
      }

      return sendJson(res, 200, {
        success: true,
        found: true,
        ...result
      });
    }

    // 5. GET /api/architecture/neighborhood?nodeId=...&hops=...
    if (action === 'neighborhood' && req.method === 'GET') {
      const nodeId = searchParams.get('nodeId');
      const hops = parseInt(searchParams.get('hops') || '1', 10);
      if (!nodeId) {
        return sendError(res, 400, 'nodeId parameter is required.', 'BAD_REQUEST');
      }

      const result = queryEngine.getNeighborhood([nodeId], Math.min(3, Math.max(1, hops)));
      return sendJson(res, 200, {
        success: true,
        ...result
      });
    }

    // 6. GET /api/architecture/impact/:id
    if (action === 'impact' && subId && req.method === 'GET') {
      const result = impactAnalyzer.analyzeImpact(subId);
      if (!result) {
        return sendError(res, 404, `Target node not found for impact analysis: ${subId}`, 'NOT_FOUND');
      }

      return sendJson(res, 200, {
        success: true,
        ...result
      });
    }

    // 7. GET /api/architecture/subsystems
    if (action === 'subsystems' && req.method === 'GET') {
      const communities = queryEngine.getSubsystemCommunities();
      return sendJson(res, 200, {
        success: true,
        subsystems: communities
      });
    }

    // 8. POST /api/architecture/context/preview
    if (action === 'context' && segments[1] === 'preview' && req.method === 'POST') {
      const body = await readJsonBody(req).catch(() => ({}));
      const preview = contextPacker.packContext({
        query: body.query || '',
        selectedNodeIds: body.selectedNodeIds || [],
        tokenBudget: parseInt(body.tokenBudget || 8000, 10),
        strategy: body.strategy || 'graph_optimized'
      });

      return sendJson(res, 200, {
        success: true,
        ...preview
      });
    }

    // 9. POST /api/architecture/context/query (run AI query)
    if (action === 'context' && segments[1] === 'query' && req.method === 'POST') {
      const body = await readJsonBody(req).catch(() => ({}));
      const queryResult = await aiGraphService.runQuery(user, {
        query: body.query || '',
        tokenBudget: parseInt(body.tokenBudget || 8000, 10),
        strategy: body.strategy || 'graph_optimized',
        selectedNodeIds: body.selectedNodeIds || [],
        provider: body.provider || 'auto',
        model: body.model || null
      });

      return sendJson(res, 200, {
        success: true,
        ...queryResult
      });
    }

    // 10. GET /api/architecture/history
    if (action === 'history' && req.method === 'GET') {
      const activeUser = user || { id: 'user_demo' };
      const queries = db.prepare(`
        SELECT id, query_text, retrieval_strategy, token_budget, input_tokens, output_tokens,
               baseline_input_tokens, token_reduction_percent, latency_ms, created_at
        FROM graph_ai_queries
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 25
      `).all(activeUser.id);

      return sendJson(res, 200, {
        success: true,
        queries
      });
    }

    // 11. GET /api/architecture/export/:format (json or markdown)
    if (action === 'export' && req.method === 'GET') {
      const format = (segments[1] || 'json').toLowerCase();
      if (format === 'json') {
        const snapshot = store.getSnapshot() || store.getGraph();
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="architecture-graph.json"'
        });
        return res.end(JSON.stringify(snapshot, null, 2));
      }

      if (format === 'markdown' || format === 'report') {
        const stats = store.getStats();
        const markdown = `# WebDev AI Studio Architecture Graph Report
Generated: ${new Date().toISOString()}

## System Overview
- **Total Nodes**: ${stats.nodeCount}
- **Total Edges**: ${stats.edgeCount}
- **Source Files**: ${stats.fileCount}

## Subsystems
${stats.subsystems.map(s => `- **${s.subsystem}**: ${s.count} nodes`).join('\n')}

## Highest Impact Nodes (Degree Centrality)
${stats.highImpactNodes.map(n => `- **${n.label}** (${n.type}): ${n.total_degree} connections (${n.degree_in} in, ${n.degree_out} out)`).join('\n')}
`;
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="architecture-report.md"'
        });
        return res.end(markdown);
      }

      return sendError(res, 400, `Unsupported export format: ${format}`, 'BAD_REQUEST');
    }

    return sendError(res, 404, `Unknown Architecture API endpoint: ${pathname}`, 'NOT_FOUND');
  } catch (err) {
    console.error('[architecture-api] Internal error:', err);
    return sendError(res, 500, `Internal Architecture API error: ${err.message}`, 'SERVER_ERROR');
  }
}

module.exports = {
  handleArchitectureRequest
};
