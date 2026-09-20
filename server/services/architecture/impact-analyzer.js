/**
 * Impact Analyzer & Blast Radius Engine
 * Answers "What breaks if I change this node or file?"
 * Computes upstream/downstream dependencies, blast radius, affected routes, tools, and tests.
 */

class ImpactAnalyzer {
  constructor(db) {
    this.db = db;
  }

  analyzeImpact(nodeId) {
    const rootNode = this.db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(nodeId);
    if (!rootNode) return null;

    // Upstream (who does rootNode depend on?)
    const outgoing = this.db.prepare(`
      SELECT e.type as edge_type, n.*
      FROM graph_edges e
      JOIN graph_nodes n ON e.target_id = n.id
      WHERE e.source_id = ?
    `).all(nodeId);

    // Downstream (who depends on rootNode? Who breaks if rootNode breaks?)
    // Traverse up to 4 levels of dependents
    const visited = new Set([nodeId]);
    const downstreamNodes = new Map();
    let currentFrontier = [nodeId];

    for (let depth = 1; depth <= 4; depth++) {
      if (currentFrontier.length === 0) break;
      const placeholders = currentFrontier.map(() => '?').join(',');
      const incomingEdges = this.db.prepare(`
        SELECT e.id as edge_id, e.type as edge_type, e.source_id, e.target_id,
               n.id as node_id, n.type as node_type, n.name, n.label, n.subsystem, n.file_path
        FROM graph_edges e
        JOIN graph_nodes n ON e.source_id = n.id
        WHERE e.target_id IN (${placeholders})
      `).all(...currentFrontier);

      const nextFrontier = [];
      for (const row of incomingEdges) {
        if (!visited.has(row.node_id)) {
          visited.add(row.node_id);
          nextFrontier.push(row.node_id);
          downstreamNodes.set(row.node_id, {
            ...row,
            depth
          });
        }
      }
      currentFrontier = nextFrontier;
    }

    const dependentsList = Array.from(downstreamNodes.values());
    const directDependents = dependentsList.filter(d => d.depth === 1);
    const transitiveDependents = dependentsList.filter(d => d.depth > 1);

    // Group by category
    const affectedRoutes = dependentsList.filter(d => d.node_type === 'API_ROUTE');
    const affectedTools = dependentsList.filter(d => d.node_type === 'TOOL');
    const affectedTests = dependentsList.filter(d => d.node_type === 'TEST' || (d.file_path && d.file_path.includes('test')));
    const affectedFiles = [...new Set(dependentsList.map(d => d.file_path).filter(Boolean))];

    // Determine Risk Level
    let riskScore = (directDependents.length * 3) + (transitiveDependents.length * 1) + (affectedRoutes.length * 4) + (affectedTools.length * 5);
    let riskLevel = 'LOW';
    if (riskScore >= 35 || affectedTools.length >= 3) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 18 || affectedRoutes.length >= 2) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 6 || directDependents.length >= 2) {
      riskLevel = 'MEDIUM';
    }

    // Recommended actions
    const recommendations = [];
    if (affectedTests.length > 0) {
      recommendations.push(`Run existing test suites: ${affectedTests.slice(0, 3).map(t => t.name).join(', ')}`);
    } else {
      recommendations.push(`No direct automated test found for this module. Consider adding a test in scripts/tests/.`);
    }

    if (affectedRoutes.length > 0) {
      recommendations.push(`Verify API contract compatibility for ${affectedRoutes.length} route(s): ${affectedRoutes.map(r => r.name).join(', ')}`);
    }

    if (affectedTools.length > 0) {
      recommendations.push(`Manual or Playwright verification needed in frontend tool(s): ${affectedTools.map(t => t.name).join(', ')}`);
    }

    return {
      targetNode: rootNode,
      riskLevel,
      riskScore,
      stats: {
        directDependentsCount: directDependents.length,
        transitiveDependentsCount: transitiveDependents.length,
        totalBlastRadius: dependentsList.length,
        affectedRoutesCount: affectedRoutes.length,
        affectedToolsCount: affectedTools.length,
        affectedTestsCount: affectedTests.length,
        affectedFilesCount: affectedFiles.length
      },
      directDependents,
      transitiveDependents: transitiveDependents.slice(0, 30),
      affectedRoutes,
      affectedTools,
      affectedTests,
      affectedFiles,
      recommendations
    };
  }
}

module.exports = { ImpactAnalyzer };
