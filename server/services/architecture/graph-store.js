/**
 * Graph Store & Persistence Layer for Architecture Graph
 * Stores and manages nodes, edges, and file index cache in SQLite (studio.db)
 * and exports cache snapshot to .graphify/graph.json
 */

const fs = require('fs');
const path = require('path');
const { AstIndexer } = require('./ast-indexer');

class GraphStore {
  constructor(db, rootDir) {
    this.db = db;
    this.rootDir = rootDir;
    this.graphifyDir = path.join(rootDir, '.graphify');
    this.graphifyFile = path.join(this.graphifyDir, 'graph.json');
  }

  ensureGraphifyDir() {
    if (!fs.existsSync(this.graphifyDir)) {
      fs.mkdirSync(this.graphifyDir, { recursive: true });
    }
  }

  /**
   * Run full re-index and commit to SQLite and .graphify/graph.json
   */
  async rebuildIndex(projectId = null) {
    const indexer = new AstIndexer(this.rootDir, this.db);
    const result = await indexer.indexProject();

    const insertNode = this.db.prepare(`
      INSERT OR REPLACE INTO graph_nodes (
        id, project_id, type, name, label, subsystem, file_path,
        loc_start, loc_end, loc_count, hash, degree_in, degree_out,
        metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertEdge = this.db.prepare(`
      INSERT OR REPLACE INTO graph_edges (
        id, project_id, source_id, target_id, type,
        provenance, confidence, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertIndex = this.db.prepare(`
      INSERT OR REPLACE INTO graph_indexes (
        id, project_id, file_path, file_hash, file_mtime,
        node_count, edge_count, last_indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const transaction = this.db.transaction(() => {
      // Clear previous graph for this project/global
      if (projectId) {
        this.db.prepare('DELETE FROM graph_edges WHERE project_id = ?').run(projectId);
        this.db.prepare('DELETE FROM graph_nodes WHERE project_id = ?').run(projectId);
        this.db.prepare('DELETE FROM graph_indexes WHERE project_id = ?').run(projectId);
      } else {
        this.db.prepare('DELETE FROM graph_edges WHERE project_id IS NULL').run();
        this.db.prepare('DELETE FROM graph_nodes WHERE project_id IS NULL').run();
        this.db.prepare('DELETE FROM graph_indexes WHERE project_id IS NULL').run();
      }

      for (const node of result.nodes) {
        insertNode.run(
          node.id,
          projectId,
          node.type,
          node.name,
          node.label,
          node.subsystem,
          node.file_path,
          node.loc_start,
          node.loc_end,
          node.loc_count,
          node.hash,
          node.degree_in,
          node.degree_out,
          node.metadata_json
        );
      }

      for (const edge of result.edges) {
        insertEdge.run(
          edge.id,
          projectId,
          edge.source_id,
          edge.target_id,
          edge.type,
          edge.provenance,
          edge.confidence,
          edge.metadata_json
        );
      }

      for (const [relPath, info] of indexer.filesIndexed.entries()) {
        insertIndex.run(
          `idx:${relPath}`,
          projectId,
          relPath,
          info.hash,
          info.mtime,
          0,
          0
        );
      }
    });

    transaction();

    // Export cache to .graphify/graph.json
    this.exportSnapshot(result);

    return {
      status: 'indexed',
      fileCount: result.fileCount,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      timestamp: new Date().toISOString()
    };
  }

  exportSnapshot(graphData) {
    try {
      this.ensureGraphifyDir();
      const exportPayload = {
        meta: {
          version: '1.0.0',
          generated_at: new Date().toISOString(),
          node_count: graphData.nodeCount,
          edge_count: graphData.edgeCount,
          file_count: graphData.fileCount
        },
        nodes: graphData.nodes,
        edges: graphData.edges
      };
      fs.writeFileSync(this.graphifyFile, JSON.stringify(exportPayload, null, 2), 'utf8');
    } catch (err) {
      console.warn('[graph-store] Failed to save .graphify/graph.json:', err.message);
    }
  }

  getSnapshot() {
    if (fs.existsSync(this.graphifyFile)) {
      try {
        const raw = fs.readFileSync(this.graphifyFile, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[graph-store] Failed to read .graphify/graph.json:', err.message);
      }
    }
    return null;
  }

  /**
   * Get all nodes and edges (with optional filtering)
   */
  getGraph(filters = {}) {
    let nodeQuery = 'SELECT * FROM graph_nodes WHERE 1=1';
    let edgeQuery = 'SELECT * FROM graph_edges WHERE 1=1';
    const params = [];

    if (filters.projectId) {
      nodeQuery += ' AND project_id = ?';
      edgeQuery += ' AND project_id = ?';
      params.push(filters.projectId);
    } else {
      nodeQuery += ' AND project_id IS NULL';
      edgeQuery += ' AND project_id IS NULL';
    }

    if (filters.subsystem && filters.subsystem !== 'all') {
      nodeQuery += ' AND subsystem = ?';
      params.push(filters.subsystem);
    }

    if (filters.type && filters.type !== 'all') {
      nodeQuery += ' AND type = ?';
      params.push(filters.type);
    }

    let nodes = this.db.prepare(nodeQuery).all(...params);

    if (filters.search) {
      const s = filters.search.toLowerCase();
      nodes = nodes.filter(n =>
        n.name.toLowerCase().includes(s) ||
        n.label.toLowerCase().includes(s) ||
        (n.file_path && n.file_path.toLowerCase().includes(s))
      );
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const allEdges = this.db.prepare(edgeQuery).all(...(filters.projectId ? [filters.projectId] : []));
    const filteredEdges = allEdges.filter(e => nodeIds.has(e.source_id) && nodeIds.has(e.target_id));

    return {
      nodes,
      edges: filteredEdges,
      stats: this.getStats(filters.projectId)
    };
  }

  getNodeById(id) {
    const node = this.db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(id);
    if (!node) return null;

    const outEdges = this.db.prepare('SELECT * FROM graph_edges WHERE source_id = ?').all(id);
    const inEdges = this.db.prepare('SELECT * FROM graph_edges WHERE target_id = ?').all(id);

    // Get connected neighbor nodes
    const neighborIds = [...new Set([...outEdges.map(e => e.target_id), ...inEdges.map(e => e.source_id)])];
    let neighbors = [];
    if (neighborIds.length > 0) {
      const placeholders = neighborIds.map(() => '?').join(',');
      neighbors = this.db.prepare(`SELECT id, type, name, label, subsystem, file_path FROM graph_nodes WHERE id IN (${placeholders})`).all(...neighborIds);
    }

    return {
      node,
      outEdges,
      inEdges,
      neighbors
    };
  }

  getStats(projectId = null) {
    const pClause = projectId ? 'WHERE project_id = ?' : 'WHERE project_id IS NULL';
    const params = projectId ? [projectId] : [];

    const nodeCount = this.db.prepare(`SELECT COUNT(*) as count FROM graph_nodes ${pClause}`).get(...params)?.count || 0;
    const edgeCount = this.db.prepare(`SELECT COUNT(*) as count FROM graph_edges ${pClause}`).get(...params)?.count || 0;
    const fileCount = this.db.prepare(`SELECT COUNT(DISTINCT file_path) as count FROM graph_nodes ${pClause} AND file_path IS NOT NULL`).get(...params)?.count || 0;

    const typeBreakdown = this.db.prepare(`SELECT type, COUNT(*) as count FROM graph_nodes ${pClause} GROUP BY type ORDER BY count DESC`).all(...params);
    const subsystemBreakdown = this.db.prepare(`SELECT subsystem, COUNT(*) as count FROM graph_nodes ${pClause} GROUP BY subsystem ORDER BY count DESC`).all(...params);
    const highImpactNodes = this.db.prepare(`SELECT id, type, name, label, subsystem, degree_in, degree_out, (degree_in + degree_out) as total_degree FROM graph_nodes ${pClause} ORDER BY total_degree DESC LIMIT 15`).all(...params);

    return {
      nodeCount,
      edgeCount,
      fileCount,
      types: typeBreakdown,
      subsystems: subsystemBreakdown,
      highImpactNodes
    };
  }
}

module.exports = { GraphStore };
