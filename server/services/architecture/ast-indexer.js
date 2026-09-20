/**
 * AST & Structural Codebase Indexer for WebDev AI Studio
 * Uses acorn & acorn-walk for 100% local, deterministic AST extraction.
 * Extracts functions, classes, imports, exports, routes, SQL queries, AI providers, and tests.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const acorn = require('acorn');
const walk = require('acorn-walk');
const { countLines } = require('./token-estimator');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.playwright',
  'screenshots',
  '.graphify',
  'test-results',
  'dist',
  'build',
  '.cache'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'studio.db',
  'studio.db-shm',
  'studio.db-wal',
  '.DS_Store'
]);

function computeHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Determine the subsystem category from a relative path
 */
function determineSubsystem(relPath) {
  const p = relPath.toLowerCase().replace(/\\/g, '/');
  if (p.includes('/seo/') || p.includes('seo-')) return 'seo';
  if (p.includes('/qa/') || p.includes('qa-') || p.includes('qa_')) return 'qa';
  if (p.includes('/visual-css/') || p.includes('visual-css')) return 'visual-css';
  if (p.includes('/acf/') || p.includes('acf-')) return 'acf';
  if (p.includes('/design-to-code/') || p.includes('design-to-code')) return 'design-to-code';
  if (p.includes('/schema/') || p.includes('schema-')) return 'schema-generator';
  if (p.includes('/api-tester/') || p.includes('api-tester')) return 'api-tester';
  if (p.includes('/responsive/') || p.includes('responsive')) return 'responsive';
  if (p.includes('/architecture/') || p.includes('architecture-')) return 'architecture-graph';
  if (p.includes('database.js') || p.includes('/data/')) return 'database';
  if (p.includes('ai-providers.js') || p.includes('/ai/')) return 'ai-engine';
  if (p.includes('playwright.js') || p.includes('browser')) return 'browser-engine';
  if (p.includes('tests/') || p.includes('test-') || p.endsWith('.test.js')) return 'test-suite';
  if (p.includes('middleware/auth') || p.includes('routes/auth')) return 'auth';
  if (p.startsWith('server/routes/')) return 'api-routing';
  if (p.startsWith('server/')) return 'core-server';
  if (p.startsWith('client/styles/')) return 'frontend-styles';
  if (p.startsWith('client/js/tools/')) return 'frontend-tools';
  if (p.startsWith('client/')) return 'frontend-core';
  if (p.endsWith('.json') || p.endsWith('.config.js')) return 'config';
  return 'general';
}

class AstIndexer {
  constructor(rootDir, db = null) {
    this.rootDir = rootDir;
    this.db = db;
    this.nodes = new Map();
    this.edges = [];
    this.filesIndexed = new Map(); // relPath -> { hash, mtime, nodeCount, edgeCount }
  }

  addNode(node) {
    if (!node.id) return null;
    if (this.nodes.has(node.id)) {
      const existing = this.nodes.get(node.id);
      this.nodes.set(node.id, { ...existing, ...node });
      return this.nodes.get(node.id);
    }
    const fullNode = {
      id: node.id,
      project_id: node.project_id || null,
      type: node.type,
      name: node.name,
      label: node.label || node.name,
      subsystem: node.subsystem || 'general',
      file_path: node.file_path || null,
      loc_start: node.loc_start || null,
      loc_end: node.loc_end || null,
      loc_count: node.loc_count || 0,
      hash: node.hash || null,
      degree_in: 0,
      degree_out: 0,
      metadata_json: JSON.stringify(node.metadata || {})
    };
    this.nodes.set(node.id, fullNode);
    return fullNode;
  }

  addEdge(edge) {
    if (!edge.source_id || !edge.target_id || edge.source_id === edge.target_id) return null;
    const id = `edge:${edge.type}:${edge.source_id}->${edge.target_id}`;
    const fullEdge = {
      id,
      project_id: edge.project_id || null,
      source_id: edge.source_id,
      target_id: edge.target_id,
      type: edge.type,
      provenance: edge.provenance || 'EXTRACTED',
      confidence: edge.confidence !== undefined ? edge.confidence : 1.0,
      metadata_json: JSON.stringify(edge.metadata || {})
    };
    this.edges.push(fullEdge);
    return fullEdge;
  }

  /**
   * Traverse directory and collect indexable files
   */
  collectFiles(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        this.collectFiles(fullPath, fileList);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.json', '.html', '.css', '.md', '.sql'].includes(ext)) {
          fileList.push({ fullPath, relPath, ext });
        }
      }
    }
    return fileList;
  }

  /**
   * Index entire project
   */
  async indexProject(options = {}) {
    this.nodes.clear();
    this.edges = [];
    this.filesIndexed.clear();

    const files = this.collectFiles(this.rootDir);

    // 1. First pass: Create Directory and File nodes
    for (const file of files) {
      const stats = fs.statSync(file.fullPath);
      const content = fs.readFileSync(file.fullPath, 'utf8');
      const hash = computeHash(content);
      const loc = countLines(content);
      const subsystem = determineSubsystem(file.relPath);

      const fileNodeId = `file:${file.relPath}`;
      this.addNode({
        id: fileNodeId,
        type: 'FILE',
        name: path.basename(file.relPath),
        label: file.relPath,
        subsystem,
        file_path: file.relPath,
        loc_start: 1,
        loc_end: loc,
        loc_count: loc,
        hash,
        metadata: {
          extension: file.ext,
          sizeBytes: stats.size,
          mtime: stats.mtimeMs
        }
      });

      // Add parent directory node
      const dirName = path.dirname(file.relPath).replace(/\\/g, '/');
      if (dirName && dirName !== '.') {
        const dirNodeId = `dir:${dirName}`;
        if (!this.nodes.has(dirNodeId)) {
          this.addNode({
            id: dirNodeId,
            type: 'DIRECTORY',
            name: path.basename(dirName),
            label: dirName,
            subsystem: determineSubsystem(dirName),
            file_path: dirName,
            metadata: { isDirectory: true }
          });
        }
        this.addEdge({
          source_id: dirNodeId,
          target_id: fileNodeId,
          type: 'CONTAINS',
          provenance: 'EXTRACTED'
        });
      }

      this.filesIndexed.set(file.relPath, {
        hash,
        mtime: stats.mtimeMs,
        fullPath: file.fullPath,
        ext: file.ext,
        content
      });
    }

    // 2. Discover Database Schema (Tables & Columns) if DB is available
    this.indexDatabaseSchema();

    // 3. Second pass: Parse AST for JS files
    for (const [relPath, fileInfo] of this.filesIndexed.entries()) {
      if (fileInfo.ext === '.js') {
        this.indexJavaScriptFile(relPath, fileInfo.content);
      } else if (fileInfo.ext === '.html') {
        this.indexHtmlFile(relPath, fileInfo.content);
      } else if (fileInfo.ext === '.json' && relPath === 'package.json') {
        this.indexPackageJson(relPath, fileInfo.content);
      }
    }

    // 4. Calculate Degree In and Out for all nodes
    const inDegrees = new Map();
    const outDegrees = new Map();
    for (const edge of this.edges) {
      outDegrees.set(edge.source_id, (outDegrees.get(edge.source_id) || 0) + 1);
      inDegrees.set(edge.target_id, (inDegrees.get(edge.target_id) || 0) + 1);
    }
    for (const node of this.nodes.values()) {
      node.degree_in = inDegrees.get(node.id) || 0;
      node.degree_out = outDegrees.get(node.id) || 0;
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      fileCount: files.length,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length
    };
  }

  /**
   * Index SQLite schema from database connection
   */
  indexDatabaseSchema() {
    if (!this.db) return;
    try {
      const dbNodeId = 'database:studio.db';
      this.addNode({
        id: dbNodeId,
        type: 'DATABASE',
        name: 'studio.db',
        label: 'SQLite: studio.db',
        subsystem: 'database',
        file_path: 'server/data/database.js',
        metadata: { dialect: 'sqlite' }
      });

      const tables = this.db.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all();

      for (const t of tables) {
        const tableNodeId = `table:${t.name}`;
        const tableSubsystem = determineSubsystem(t.name);
        this.addNode({
          id: tableNodeId,
          type: 'TABLE',
          name: t.name,
          label: `Table: ${t.name}`,
          subsystem: tableSubsystem,
          file_path: 'server/data/database.js',
          metadata: { sqlDefinition: t.sql }
        });

        this.addEdge({
          source_id: dbNodeId,
          target_id: tableNodeId,
          type: 'CONTAINS',
          provenance: 'EXTRACTED'
        });

        this.addEdge({
          source_id: 'file:server/data/database.js',
          target_id: tableNodeId,
          type: 'DEFINES',
          provenance: 'EXTRACTED'
        });
      }
    } catch (err) {
      console.warn('[ast-indexer] Error indexing database schema:', err.message);
    }
  }

  /**
   * Parse JavaScript AST with Acorn
   */
  indexJavaScriptFile(relPath, content) {
    const fileNodeId = `file:${relPath}`;
    const subsystem = determineSubsystem(relPath);
    let ast = null;

    try {
      ast = acorn.parse(content, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
        allowReturnOutsideFunction: true,
        allowHashBang: true
      });
    } catch (e1) {
      try {
        ast = acorn.parse(content, {
          ecmaVersion: 'latest',
          sourceType: 'script',
          locations: true,
          allowReturnOutsideFunction: true,
          allowHashBang: true
        });
      } catch (e2) {
        // Syntax error or unsupported syntax in file
        console.warn(`[ast-indexer] Could not parse AST for ${relPath}: ${e2.message}`);
        return;
      }
    }

    const self = this;
    const lines = content.split('\n');

    // Track local declared functions and variables for call graph resolution
    const localFunctions = new Map(); // name -> nodeId
    const importedModules = new Map(); // localAlias -> targetRelPath/module

    walk.simple(ast, {
      // 1. Imports / Requires
      CallExpression(node) {
        if (node.callee && node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const reqPath = arg.value;
            self.handleRequire(relPath, fileNodeId, reqPath, node);
          }
        }

        // Database calls: db.prepare(...)
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          (node.callee.object?.name === 'db' || node.callee.property?.name === 'prepare' || node.callee.property?.name === 'exec')
        ) {
          if (node.arguments.length > 0 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
            self.detectSqlTableAccess(fileNodeId, node.arguments[0].value);
          }
        }

        // AI Provider calls
        if (
          (node.callee?.name && /generateWithProvider|callGemini|callOpenAI|callAnthropic/i.test(node.callee.name)) ||
          (node.callee?.property?.name && /generateWithProvider|callGemini|callOpenAI/i.test(node.callee.property.name))
        ) {
          const aiNodeId = 'provider:ai-providers';
          self.addNode({
            id: aiNodeId,
            type: 'AI_PROVIDER',
            name: 'AI Providers Abstraction',
            label: 'AI Provider Engine',
            subsystem: 'ai-engine',
            file_path: 'server/services/ai-providers.js'
          });
          self.addEdge({
            source_id: fileNodeId,
            target_id: aiNodeId,
            type: 'USES_PROVIDER',
            provenance: 'EXTRACTED'
          });
        }

        // Browser / Playwright calls
        if (
          (node.callee?.property?.name && /launch|newPage|screenshot|waitForSelector/i.test(node.callee.property.name)) ||
          (node.callee?.name && /runPlaywright/i.test(node.callee.name))
        ) {
          const browserNodeId = 'engine:playwright';
          self.addNode({
            id: browserNodeId,
            type: 'BROWSER_ENGINE',
            name: 'Playwright Headless Engine',
            label: 'Browser Automation Lab',
            subsystem: 'browser-engine',
            file_path: 'server/services/playwright.js'
          });
          self.addEdge({
            source_id: fileNodeId,
            target_id: browserNodeId,
            type: 'USES_BROWSER',
            provenance: 'EXTRACTED'
          });
        }

        // Test assertions / test runners
        if (node.callee?.name && ['describe', 'test', 'it'].includes(node.callee.name)) {
          if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
            const testTitle = String(node.arguments[0].value);
            const testNodeId = `test:${relPath}:${testTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            self.addNode({
              id: testNodeId,
              type: 'TEST',
              name: testTitle,
              label: `Test: ${testTitle}`,
              subsystem: 'test-suite',
              file_path: relPath,
              loc_start: node.loc.start.line,
              loc_end: node.loc.end.line,
              loc_count: node.loc.end.line - node.loc.start.line + 1
            });
            self.addEdge({
              source_id: fileNodeId,
              target_id: testNodeId,
              type: 'CONTAINS',
              provenance: 'EXTRACTED'
            });
          }
        }
      },

      ImportDeclaration(node) {
        if (node.source && typeof node.source.value === 'string') {
          self.handleRequire(relPath, fileNodeId, node.source.value, node);
        }
      },

      // 2. Functions (Declarations)
      FunctionDeclaration(node) {
        if (!node.id) return;
        const fnName = node.id.name;
        const fnNodeId = `fn:${relPath}:${fnName}`;
        localFunctions.set(fnName, fnNodeId);

        const locCount = node.loc.end.line - node.loc.start.line + 1;
        const params = (node.params || []).map(p => p.name || (p.left && p.left.name) || 'param');

        self.addNode({
          id: fnNodeId,
          type: 'FUNCTION',
          name: fnName,
          label: `${fnName}(${params.join(', ')})`,
          subsystem,
          file_path: relPath,
          loc_start: node.loc.start.line,
          loc_end: node.loc.end.line,
          loc_count: locCount,
          metadata: {
            isAsync: !!node.async,
            isGenerator: !!node.generator,
            params
          }
        });

        self.addEdge({
          source_id: fileNodeId,
          target_id: fnNodeId,
          type: 'EXPORTS',
          provenance: 'EXTRACTED'
        });

        // Check if function is a Route Handler (e.g. handleSeoRequest, handleAuthRequest)
        if (fnName.startsWith('handle') && fnName.endsWith('Request')) {
          self.detectRouteHandlers(relPath, fnNodeId, content, node.loc.start.line, node.loc.end.line);
        }
      },

      // 3. Variable Declarations containing functions
      VariableDeclarator(node) {
        if (node.id && node.id.name && node.init) {
          const varName = node.id.name;
          if (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') {
            const fnNodeId = `fn:${relPath}:${varName}`;
            localFunctions.set(varName, fnNodeId);
            const locCount = node.init.loc.end.line - node.init.loc.start.line + 1;
            const params = (node.init.params || []).map(p => p.name || (p.left && p.left.name) || 'param');

            self.addNode({
              id: fnNodeId,
              type: 'FUNCTION',
              name: varName,
              label: `${varName}(${params.join(', ')})`,
              subsystem,
              file_path: relPath,
              loc_start: node.init.loc.start.line,
              loc_end: node.init.loc.end.line,
              loc_count: locCount,
              metadata: {
                isAsync: !!node.init.async,
                isArrow: node.init.type === 'ArrowFunctionExpression',
                params
              }
            });

            self.addEdge({
              source_id: fileNodeId,
              target_id: fnNodeId,
              type: 'CONTAINS',
              provenance: 'EXTRACTED'
            });

            if (varName.startsWith('handle') && varName.endsWith('Request')) {
              self.detectRouteHandlers(relPath, fnNodeId, content, node.init.loc.start.line, node.init.loc.end.line);
            }
          }
        }
      },

      // 4. Classes
      ClassDeclaration(node) {
        if (!node.id) return;
        const className = node.id.name;
        const classNodeId = `class:${relPath}:${className}`;
        const locCount = node.loc.end.line - node.loc.start.line + 1;

        self.addNode({
          id: classNodeId,
          type: 'CLASS',
          name: className,
          label: `Class: ${className}`,
          subsystem,
          file_path: relPath,
          loc_start: node.loc.start.line,
          loc_end: node.loc.end.line,
          loc_count: locCount
        });

        self.addEdge({
          source_id: fileNodeId,
          target_id: classNodeId,
          type: 'EXPORTS',
          provenance: 'EXTRACTED'
        });

        if (node.superClass && node.superClass.name) {
          const superName = node.superClass.name;
          const superId = `class:${relPath}:${superName}`;
          self.addEdge({
            source_id: classNodeId,
            target_id: superId,
            type: 'EXTENDS',
            provenance: 'INFERRED'
          });
        }
      }
    });

    // Detect API Routes using regex scanner over server route files
    if (relPath.startsWith('server/routes/') || relPath === 'server.js') {
      this.extractApiRoutesFromCode(relPath, content);
    }

    // Detect Client Tools & API Fetch calls from client js
    if (relPath.startsWith('client/js/tools/')) {
      this.extractClientToolEndpoints(relPath, content);
    }
  }

  handleRequire(fromRelPath, fromFileNodeId, reqPath, astNode) {
    if (reqPath.startsWith('.')) {
      // Relative file path
      const dir = path.dirname(fromRelPath);
      let resolved = path.normalize(path.join(dir, reqPath)).replace(/\\/g, '/');
      if (!path.extname(resolved)) {
        if (fs.existsSync(path.join(this.rootDir, resolved + '.js'))) {
          resolved += '.js';
        } else if (fs.existsSync(path.join(this.rootDir, resolved, 'index.js'))) {
          resolved += '/index.js';
        }
      }
      const targetFileNodeId = `file:${resolved}`;
      this.addEdge({
        source_id: fromFileNodeId,
        target_id: targetFileNodeId,
        type: 'IMPORTS',
        provenance: 'EXTRACTED'
      });
    } else {
      // External package or core module
      const pkgNodeId = `pkg:${reqPath}`;
      if (!this.nodes.has(pkgNodeId)) {
        this.addNode({
          id: pkgNodeId,
          type: 'EXTERNAL_INTEGRATION',
          name: reqPath,
          label: `Package: ${reqPath}`,
          subsystem: 'external-dependencies'
        });
      }
      this.addEdge({
        source_id: fromFileNodeId,
        target_id: pkgNodeId,
        type: 'DEPENDS_ON',
        provenance: 'EXTRACTED'
      });
    }
  }

  detectSqlTableAccess(fromNodeId, sqlString) {
    const tableRegex = /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = tableRegex.exec(sqlString)) !== null) {
      const tableName = match[1].toLowerCase();
      if (['if', 'exists', 'set', 'where', 'select', 'default'].includes(tableName)) continue;
      const tableNodeId = `table:${tableName}`;
      if (this.nodes.has(tableNodeId)) {
        const isWrite = /\b(?:INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i.test(sqlString);
        this.addEdge({
          source_id: fromNodeId,
          target_id: tableNodeId,
          type: isWrite ? 'WRITES' : 'READS',
          provenance: 'EXTRACTED'
        });
      }
    }
  }

  detectRouteHandlers(relPath, fnNodeId, content, startLine, endLine) {
    const lines = content.split('\n').slice(startLine - 1, endLine);
    const bodyText = lines.join('\n');
    this.extractApiRoutesFromCode(relPath, bodyText, fnNodeId);
  }

  extractApiRoutesFromCode(relPath, codeText, parentFnId = null) {
    const routeRegex = /pathname\s*===?\s*['"](\/api\/[^'"]+)['"]|pathname\.startsWith\(['"](\/api\/[^'"]+)['"]\)/g;
    let match;
    while ((match = routeRegex.exec(codeText)) !== null) {
      const apiPath = match[1] || match[2];
      const methodMatch = /req\.method\s*===?\s*['"](GET|POST|PUT|DELETE|PATCH)['"]/i.exec(codeText.substring(Math.max(0, match.index - 100), Math.min(codeText.length, match.index + 200)));
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'ANY';
      const routeNodeId = `route:${method}:${apiPath}`;
      const subsystem = determineSubsystem(apiPath);

      this.addNode({
        id: routeNodeId,
        type: 'API_ROUTE',
        name: `${method} ${apiPath}`,
        label: `${method} ${apiPath}`,
        subsystem,
        file_path: relPath,
        metadata: { method, path: apiPath }
      });

      this.addEdge({
        source_id: parentFnId || `file:${relPath}`,
        target_id: routeNodeId,
        type: 'ROUTES_TO',
        provenance: 'EXTRACTED'
      });
    }
  }

  extractClientToolEndpoints(relPath, content) {
    const toolBase = path.basename(relPath, '.js');
    const toolNodeId = `tool:${toolBase}`;
    const subsystem = determineSubsystem(relPath);

    this.addNode({
      id: toolNodeId,
      type: 'TOOL',
      name: toolBase,
      label: `Tool: ${toolBase}`,
      subsystem,
      file_path: relPath
    });

    this.addEdge({
      source_id: `file:${relPath}`,
      target_id: toolNodeId,
      type: 'DEFINES',
      provenance: 'EXTRACTED'
    });

    // Detect fetch('/api/...')
    const fetchRegex = /fetch\(\s*['"`](\/api\/[^'"`\?]+)/g;
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      const apiPath = match[1];
      // Match any known route or create placeholder
      for (const node of this.nodes.values()) {
        if (node.type === 'API_ROUTE' && node.metadata_json.includes(apiPath)) {
          this.addEdge({
            source_id: toolNodeId,
            target_id: node.id,
            type: 'CALLS',
            provenance: 'EXTRACTED'
          });
        }
      }
    }
  }

  indexHtmlFile(relPath, content) {
    const fileNodeId = `file:${relPath}`;
    if (relPath === 'client/index.html') {
      const toolMatches = content.matchAll(/data-tool=["']([^"']+)["']/g);
      for (const m of toolMatches) {
        const toolName = m[1];
        const toolNodeId = `tool:${toolName}`;
        this.addNode({
          id: toolNodeId,
          type: 'TOOL',
          name: toolName,
          label: `Tool: ${toolName}`,
          subsystem: determineSubsystem(toolName),
          file_path: relPath
        });
        this.addEdge({
          source_id: fileNodeId,
          target_id: toolNodeId,
          type: 'CONTAINS',
          provenance: 'EXTRACTED'
        });
      }
    }
  }

  indexPackageJson(relPath, content) {
    try {
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [depName, version] of Object.entries(deps)) {
        const pkgNodeId = `pkg:${depName}`;
        this.addNode({
          id: pkgNodeId,
          type: 'EXTERNAL_INTEGRATION',
          name: depName,
          label: `${depName}@${version}`,
          subsystem: 'external-dependencies',
          file_path: relPath,
          metadata: { version }
        });
        this.addEdge({
          source_id: `file:${relPath}`,
          target_id: pkgNodeId,
          type: 'CONFIGURED_BY',
          provenance: 'EXTRACTED'
        });
      }
    } catch (e) {
      console.warn('[ast-indexer] Error parsing package.json:', e.message);
    }
  }
}

module.exports = {
  AstIndexer,
  determineSubsystem,
  computeHash
};
