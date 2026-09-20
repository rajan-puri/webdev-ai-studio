/**
 * Query & Traversal Engine for Architecture Graph
 * Provides BFS shortest path, neighborhood subgraphs (1-3 hops),
 * community grouping, and search algorithms.
 */

class QueryEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Find shortest path between source node and target node using BFS
   */
  findShortestPath(sourceId, targetId, options = {}) {
    if (!sourceId || !targetId) return null;
    if (sourceId === targetId) {
      const node = this.db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(sourceId);
      return { path: [node], edges: [], length: 0 };
    }

    const maxDepth = options.maxDepth || 8;
    const queue = [[sourceId]];
    const visited = new Set([sourceId]);
    const edgeMap = new Map(); // childId -> { parentId, edge }

    let targetFound = false;

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const currentId = currentPath[currentPath.length - 1];

      if (currentPath.length > maxDepth) break;

      if (currentId === targetId) {
        targetFound = true;
        break;
      }

      // Find both outgoing and incoming edges for undirected structural reachability
      const edges = this.db.prepare(`
        SELECT id, source_id, target_id, type, provenance
        FROM graph_edges
        WHERE source_id = ? OR target_id = ?
      `).all(currentId, currentId);

      for (const e of edges) {
        const neighborId = e.source_id === currentId ? e.target_id : e.source_id;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          edgeMap.set(neighborId, { parentId: currentId, edge: e });
          queue.push([...currentPath, neighborId]);
        }
      }
    }

    if (!visited.has(targetId)) {
      return null;
    }

    // Reconstruct path
    const nodeIds = [];
    const edges = [];
    let curr = targetId;
    while (curr !== sourceId) {
      nodeIds.unshift(curr);
      const step = edgeMap.get(curr);
      if (step) {
        edges.unshift(step.edge);
        curr = step.parentId;
      } else {
        break;
      }
    }
    nodeIds.unshift(sourceId);

    const placeholders = nodeIds.map(() => '?').join(',');
    const nodes = this.db.prepare(`SELECT * FROM graph_nodes WHERE id IN (${placeholders})`).all(...nodeIds);
    // Sort nodes in order of path
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const orderedNodes = nodeIds.map(id => nodeMap.get(id)).filter(Boolean);

    return {
      path: orderedNodes,
      edges,
      length: edges.length
    };
  }

  /**
   * Extract neighborhood subgraph up to N hops around anchor node(s)
   */
  getNeighborhood(anchorIds, hops = 1) {
    if (!Array.isArray(anchorIds)) anchorIds = [anchorIds];
    const visitedNodes = new Set(anchorIds);
    let currentFrontier = new Set(anchorIds);

    const collectedEdges = [];
    const edgeIdSet = new Set();

    for (let h = 0; h < hops; h++) {
      if (currentFrontier.size === 0) break;
      const placeholders = Array.from(currentFrontier).map(() => '?').join(',');
      const frontierEdges = this.db.prepare(`
        SELECT * FROM graph_edges
        WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
      `).all(...Array.from(currentFrontier), ...Array.from(currentFrontier));

      const nextFrontier = new Set();

      for (const e of frontierEdges) {
        if (!edgeIdSet.has(e.id)) {
          edgeIdSet.add(e.id);
          collectedEdges.push(e);
        }
        if (!visitedNodes.has(e.source_id)) {
          visitedNodes.add(e.source_id);
          nextFrontier.add(e.source_id);
        }
        if (!visitedNodes.has(e.target_id)) {
          visitedNodes.add(e.target_id);
          nextFrontier.add(e.target_id);
        }
      }

      currentFrontier = nextFrontier;
    }

    const nodePlaceholders = Array.from(visitedNodes).map(() => '?').join(',');
    const nodes = this.db.prepare(`SELECT * FROM graph_nodes WHERE id IN (${nodePlaceholders})`).all(...Array.from(visitedNodes));

    return {
      nodes,
      edges: collectedEdges,
      anchorIds,
      hops
    };
  }

  /**
   * Group nodes by subsystem communities
   */
  getSubsystemCommunities() {
    const subsystems = this.db.prepare(`
      SELECT subsystem, COUNT(*) as node_count
      FROM graph_nodes
      GROUP BY subsystem
      ORDER BY node_count DESC
    `).all();

    const result = [];
    for (const sub of subsystems) {
      const topNodes = this.db.prepare(`
        SELECT id, type, name, label, (degree_in + degree_out) as total_degree
        FROM graph_nodes
        WHERE subsystem = ?
        ORDER BY total_degree DESC
        LIMIT 6
      `).all(sub.subsystem);

      result.push({
        name: sub.subsystem,
        nodeCount: sub.node_count,
        topNodes
      });
    }

    return result;
  }
}

module.exports = { QueryEngine };
