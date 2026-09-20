/**
 * client/js/tools/architecture-graph.js
 * Interactive Architecture Knowledge Graph & AI Context Optimization Workspace
 * Features: Level-of-Detail (LOD) rendering, community-aware orbital layout,
 * robust viewport centering/fitting, collision physics, and surgical AI context optimization.
 */

(function () {
  const SUBSYSTEM_COLORS = {
    'seo': '#10b981',
    'qa': '#f59e0b',
    'acf': '#8b5cf6',
    'visual-css': '#3b82f6',
    'design-to-code': '#ec4899',
    'schema-generator': '#e11d48',
    'api-tester': '#0ea5e9',
    'responsive': '#f97316',
    'database': '#06b6d4',
    'auth': '#6366f1',
    'core-server': '#4f46e5',
    'api-routing': '#14b8a6',
    'browser-engine': '#ea580c',
    'ai-engine': '#d946ef',
    'test-suite': '#a855f7',
    'frontend-core': '#64748b',
    'frontend-tools': '#38bdf8',
    'external-dependencies': '#475569',
    'general': '#94a3b8'
  };

  // Structured spatial coordinates for architecture communities
  const SUBSYSTEM_CENTROIDS = {
    'database': { x: 0, y: -70 },
    'core-server': { x: -140, y: 50 },
    'auth': { x: 140, y: 50 },
    'api-routing': { x: 0, y: 170 },

    'acf': { x: -520, y: -260 },
    'visual-css': { x: -240, y: -540 },
    'design-to-code': { x: 240, y: -540 },
    'schema-generator': { x: 520, y: -260 },

    'seo': { x: 620, y: 80 },
    'qa': { x: 500, y: 390 },
    'responsive': { x: 180, y: 560 },
    'api-tester': { x: -200, y: 560 },
    'frontend-tools': { x: -540, y: 220 },
    'frontend-core': { x: -620, y: -50 },

    'browser-engine': { x: 780, y: 480 },
    'ai-engine': { x: 0, y: -800 },
    'test-suite': { x: -800, y: 440 },
    'external-dependencies': { x: 820, y: -440 },
    'general': { x: -840, y: -440 }
  };

  class ArchitectureGraphTool {
    constructor(containerId = 'viewArchitecture') {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.nodes = [];
      this.edges = [];
      this.stats = null;
      this.filteredNodes = [];
      this.filteredEdges = [];
      this.selectedNode = null;
      this.selectedNodeIdsForAi = new Set();
      this.pathSourceNode = null;
      this.pathTargetNode = null;
      this.highlightedPath = null;
      this.neighborhoodHops = null;

      this.subsystemCentroids = new Map();

      this.tokenBudget = 8000;
      this.strategy = 'graph_optimized';
      this.currentFilterSubsystem = 'all';
      this.currentFilterType = 'all';
      this.searchQuery = '';

      // Viewport & Pan/Zoom state
      this.panX = 0;
      this.panY = 0;
      this.zoom = 0.5;
      this.isDraggingCanvas = false;
      this.draggedNode = null;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.hoveredNode = null;

      this.simulationAlpha = 1.0;
      this.isSimulating = false;
      this.hasInitiallyFitted = false;

      this.initDom();
      this.loadGraph();
    }

    initDom() {
      this.container.innerHTML = `
        <div class="arch-toolbar">
          <div class="arch-toolbar-left">
            <div class="arch-title-group">
              <div class="arch-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="6" cy="6" r="3"></circle>
                  <circle cx="18" cy="6" r="3"></circle>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="18" r="3"></circle>
                  <line x1="9" y1="6" x2="15" y2="6"></line>
                  <line x1="6" y1="9" x2="6" y2="15"></line>
                  <line x1="18" y1="9" x2="18" y2="15"></line>
                  <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"></line>
                </svg>
                <span>Architecture Graph</span>
              </div>
              <div class="arch-tagline">Codebase Knowledge Graph & AI Context Engine</div>
            </div>
            <div class="arch-status-pill" id="archStatusPill">
              <span class="arch-status-dot"></span>
              <span id="archStatusText">Loading index...</span>
            </div>
          </div>

          <div class="arch-toolbar-center">
            <div class="arch-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" class="arch-search-input" id="archSearchInput" placeholder="Search functions, classes, routes, tables, files...">
            </div>

            <select class="arch-filter-select" id="archSubsystemFilter">
              <option value="all">All Subsystems</option>
            </select>

            <select class="arch-filter-select" id="archTypeFilter">
              <option value="all">All Node Types</option>
              <option value="FUNCTION">Functions</option>
              <option value="CLASS">Classes</option>
              <option value="API_ROUTE">API Routes</option>
              <option value="TABLE">Database Tables</option>
              <option value="TOOL">Frontend Tools</option>
              <option value="FILE">Files</option>
              <option value="TEST">Tests</option>
              <option value="BROWSER_ENGINE">Browser Lab</option>
              <option value="AI_PROVIDER">AI Engines</option>
            </select>
          </div>

          <div class="arch-toolbar-right">
            <button class="arch-btn" id="archBtnReindex" title="Re-scan codebase AST">
              <span>↻ Re-Index</span>
            </button>
            <button class="arch-btn" id="archBtnExportJson" title="Export graph snapshot">
              <span>Export JSON</span>
            </button>
            <button class="arch-btn arch-btn-accent" id="archBtnToggleAiDrawer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>AI Context Optimizer</span>
            </button>
          </div>
        </div>

        <div class="arch-body">
          <!-- Left Sidebar: Subsystems & Clusters -->
          <div class="arch-sidebar-left">
            <div class="arch-sidebar-section">
              <div class="arch-section-title">
                <span>Subsystems</span>
                <span id="archSubsystemCount">0</span>
              </div>
              <div id="archSubsystemsList"></div>
            </div>

            <div class="arch-sidebar-section">
              <div class="arch-section-title">
                <span>High-Impact Nodes</span>
              </div>
              <div id="archHighImpactList"></div>
            </div>
          </div>

          <!-- Center: Interactive Canvas Visualizer -->
          <div class="arch-graph-center" id="archGraphCenter">
            <div class="arch-path-badge" id="archPathBadge"></div>
            <div class="arch-hover-tooltip" id="archHoverTooltip"></div>
            <canvas class="arch-canvas" id="archCanvas"></canvas>

            <div class="arch-canvas-controls">
              <button class="arch-canvas-btn" id="archZoomIn" title="Zoom In">+</button>
              <button class="arch-canvas-btn" id="archZoomOut" title="Zoom Out">−</button>
              <button class="arch-canvas-btn" id="archFitScreen" title="Fit to Screen">⛶</button>
              <button class="arch-canvas-btn" id="archResetView" title="Reset View">↺</button>
            </div>
          </div>

          <!-- Right Sidebar: Node Inspector & Blast Radius -->
          <div class="arch-sidebar-right" id="archSidebarRight">
            <div class="arch-inspector-header">
              <span class="arch-inspector-title" id="archInspectorTitle">Node Inspector</span>
              <span class="arch-node-badge" id="archInspectorBadge" style="display:none;"></span>
            </div>
            <div class="arch-inspector-body" id="archInspectorBody">
              <div style="color: #64748b; font-size: 12px; text-align: center; padding: 40px 10px;">
                Select any node on the graph to inspect its properties, connections, and impact blast radius.
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Drawer: AI Context Graph & Token Optimization -->
        <div class="arch-bottom-drawer" id="archAiDrawer">
          <div class="arch-drawer-header" id="archDrawerHeader">
            <div class="arch-drawer-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>AI Context Graph & Token Optimization Engine</span>
              <span class="arch-drawer-badge" id="archSavingsBadge">60%+ Token Reduction</span>
            </div>
            <div>
              <button class="arch-btn arch-btn-icon" id="archBtnMinimizeDrawer" title="Minimize / Expand">▲</button>
            </div>
          </div>

          <div class="arch-drawer-content">
            <!-- Left: Prompt & Budgets -->
            <div class="arch-drawer-left">
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; display: block;">Engineering Task / Prompt</label>
                <textarea class="arch-prompt-textarea" id="archPromptInput" placeholder="e.g., How does ACF PHP registration work? Or: Fix responsive preview cropping..."></textarea>
              </div>

              <div class="arch-budget-group">
                <span class="arch-budget-label">Token Budget:</span>
                <button class="arch-budget-pill" data-budget="4000">Small (4k)</button>
                <button class="arch-budget-pill active" data-budget="8000">Medium (8k)</button>
                <button class="arch-budget-pill" data-budget="16000">Large (16k)</button>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="arch-btn" id="archBtnPreviewContext" style="flex: 1;">Preview Context</button>
                <button class="arch-btn arch-btn-primary" id="archBtnExecuteAiQuery" style="flex: 1.3;">Ask AI with Graph</button>
              </div>

              <!-- Scorecard -->
              <div class="arch-scorecard">
                <div class="arch-score-item">
                  <span class="arch-score-title">Baseline</span>
                  <span class="arch-score-value" id="archScoreBaseline">-</span>
                </div>
                <div class="arch-score-item">
                  <span class="arch-score-title">Graph Context</span>
                  <span class="arch-score-value" id="archScorePacked">-</span>
                </div>
                <div class="arch-score-item">
                  <span class="arch-score-title">Reduction</span>
                  <span class="arch-score-value arch-score-reduction" id="archScoreReduction">-</span>
                </div>
                <div class="arch-score-item">
                  <span class="arch-score-title">Latency</span>
                  <span class="arch-score-value" id="archScoreLatency">-</span>
                </div>
              </div>
            </div>

            <!-- Right: Code Snippets & AI Output -->
            <div class="arch-drawer-right">
              <div style="font-size: 11px; font-weight: 600; color: #94a3b8; display: flex; justify-content: space-between;">
                <span>Graph-Selected Code Snippets (<span id="archSnippetCount">0</span>)</span>
                <span id="archStrategyLabel" style="color: #6366f1;">Surgical AST Slicing</span>
              </div>
              <div class="arch-snippets-accordion" id="archSnippetsList">
                <div style="color: #64748b; font-size: 11px; padding: 6px;">No snippets loaded yet. Click "Preview Context" or run a query.</div>
              </div>

              <div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-top: 4px;">Architecture Assistant Response</div>
              <div class="arch-response-box" id="archResponseBox">Enter an engineering prompt and click "Ask AI with Graph" to analyze your architecture.</div>
            </div>
          </div>
        </div>
      `;

      this.canvas = document.getElementById('archCanvas');
      this.ctx = this.canvas.getContext('2d');

      this.bindEvents();
      this.setupCanvasResize();
    }

    setupCanvasResize() {
      const container = this.canvas.parentElement;
      if (!container) return;

      const handleResize = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
        this.renderCanvas();
      };

      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
              handleResize();
              if (!this.hasInitiallyFitted && this.nodes.length > 0) {
                this.fitGraphToViewport({ padding: 60 });
              }
            }
          }
        });
        this.resizeObserver.observe(container);
      }

      window.addEventListener('resize', handleResize);
    }

    onViewActivated() {
      // Called when user navigates back to /architecture
      setTimeout(() => {
        const container = this.canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 50) {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.resetTransform();
            this.ctx.scale(dpr, dpr);
            this.fitGraphToViewport({ padding: 60 });
          }
        }
      }, 80);
    }

    bindEvents() {
      // Search Input
      const searchInput = document.getElementById('archSearchInput');
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.applyFilters();
        if (this.searchQuery && this.filteredNodes.length > 0) {
          const topMatch = this.filteredNodes[0];
          this.centerOnNode(topMatch, { zoom: 1.35 });
          this.selectNode(topMatch);
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.filteredNodes.length > 0) {
          e.preventDefault();
          const match = this.filteredNodes[0];
          this.centerOnNode(match, { zoom: 1.4 });
          this.selectNode(match);
        }
      });

      // Subsystem Filter
      document.getElementById('archSubsystemFilter').addEventListener('change', (e) => {
        this.currentFilterSubsystem = e.target.value;
        this.applyFilters();
        this.fitGraphToViewport({ padding: 70 });
      });

      // Type Filter
      document.getElementById('archTypeFilter').addEventListener('change', (e) => {
        this.currentFilterType = e.target.value;
        this.applyFilters();
        this.fitGraphToViewport({ padding: 70 });
      });

      // Re-Index Button
      document.getElementById('archBtnReindex').addEventListener('click', () => this.reindexProject());

      // Export JSON
      document.getElementById('archBtnExportJson').addEventListener('click', () => {
        window.open('/api/architecture/export/json', '_blank');
      });

      // Toggle AI Drawer
      document.getElementById('archBtnToggleAiDrawer').addEventListener('click', () => {
        const drawer = document.getElementById('archAiDrawer');
        drawer.classList.toggle('collapsed');
        setTimeout(() => this.fitGraphToViewport({ padding: 60 }), 260);
      });

      document.getElementById('archBtnMinimizeDrawer').addEventListener('click', () => {
        const drawer = document.getElementById('archAiDrawer');
        drawer.classList.toggle('collapsed');
        setTimeout(() => this.fitGraphToViewport({ padding: 60 }), 260);
      });

      // Token Budget Pills
      this.container.querySelectorAll('.arch-budget-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.container.querySelectorAll('.arch-budget-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.tokenBudget = parseInt(btn.getAttribute('data-budget'), 10);
        });
      });

      // Preview Context
      document.getElementById('archBtnPreviewContext').addEventListener('click', () => this.previewContext());

      // Execute AI Query
      document.getElementById('archBtnExecuteAiQuery').addEventListener('click', () => this.executeAiQuery());

      // Canvas Zoom & Pan Controls
      document.getElementById('archZoomIn').addEventListener('click', () => {
        this.zoomAtCenter(1.3);
      });

      document.getElementById('archZoomOut').addEventListener('click', () => {
        this.zoomAtCenter(0.77);
      });

      document.getElementById('archFitScreen').addEventListener('click', () => {
        this.fitGraphToViewport({ padding: 60 });
      });

      document.getElementById('archResetView').addEventListener('click', () => {
        this.fitGraphToViewport({ padding: 60 });
      });

      // Mouse Drag & Wheel on Canvas
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', (e) => this.onMouseUp(e));
      this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    }

    zoomAtCenter(factor) {
      const container = this.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newZoom = Math.min(3.5, Math.max(0.15, this.zoom * factor));
      this.panX = centerX - (centerX - this.panX) * (newZoom / this.zoom);
      this.panY = centerY - (centerY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this.renderCanvas();
    }

    async loadGraph() {
      try {
        const res = await fetch('/api/architecture/graph');
        const data = await res.json();
        if (data.success) {
          this.nodes = data.nodes || [];
          this.edges = data.edges || [];
          this.stats = data.stats || {};

          this.populateSubsystems(this.stats.subsystems || []);
          this.populateHighImpact(this.stats.highImpactNodes || []);

          this.layoutNodes();
          this.applyFilters();

          // Wait for DOM flex layout to finish, then center & fit
          requestAnimationFrame(() => {
            setTimeout(() => {
              this.fitGraphToViewport({ padding: 60 });
              this.hasInitiallyFitted = true;
            }, 80);
          });

          document.getElementById('archStatusText').textContent = `● Up to date (${this.nodes.length} nodes, ${this.edges.length} relations)`;
        }
      } catch (err) {
        console.error('[arch-tool] Error loading graph:', err);
        document.getElementById('archStatusText').textContent = 'Index load failed';
      }
    }

    async reindexProject() {
      const btn = document.getElementById('archBtnReindex');
      btn.textContent = '↻ Indexing...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/architecture/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullRebuild: true })
        });
        const data = await res.json();
        if (data.success) {
          await this.loadGraph();
          this.fitGraphToViewport({ padding: 60 });
        }
      } catch (err) {
        alert('Re-indexing failed: ' + err.message);
      } finally {
        btn.textContent = '↻ Re-Index';
        btn.disabled = false;
      }
    }

    populateSubsystems(subsystems) {
      const sel = document.getElementById('archSubsystemFilter');
      const list = document.getElementById('archSubsystemsList');
      document.getElementById('archSubsystemCount').textContent = subsystems.length;

      sel.innerHTML = '<option value="all">All Subsystems</option>';
      list.innerHTML = '';

      subsystems.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.subsystem;
        opt.textContent = `${sub.subsystem} (${sub.count})`;
        sel.appendChild(opt);

        const color = SUBSYSTEM_COLORS[sub.subsystem] || '#94a3b8';
        const item = document.createElement('div');
        item.className = 'arch-subsystem-item';
        item.innerHTML = `
          <div style="display:flex; align-items:center;">
            <span class="arch-subsystem-dot" style="background:${color};"></span>
            <span>${sub.subsystem}</span>
          </div>
          <span class="arch-subsystem-count">${sub.count}</span>
        `;
        item.addEventListener('click', () => {
          sel.value = sub.subsystem;
          this.currentFilterSubsystem = sub.subsystem;
          this.applyFilters();
          this.fitGraphToViewport({ padding: 70 });
        });
        list.appendChild(item);
      });
    }

    populateHighImpact(highImpactNodes) {
      const list = document.getElementById('archHighImpactList');
      list.innerHTML = '';

      highImpactNodes.slice(0, 10).forEach(node => {
        const color = SUBSYSTEM_COLORS[node.subsystem] || '#94a3b8';
        const item = document.createElement('div');
        item.className = 'arch-conn-item';
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
            <span style="width:6px; height:6px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
            <span style="font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${node.name}</span>
          </div>
          <span style="color:#38bdf8; font-size:10px;">${node.total_degree} deg</span>
        `;
        item.addEventListener('click', () => {
          const target = this.nodes.find(n => n.id === node.id);
          if (target) {
            this.selectNode(target);
            this.centerOnNode(target, { zoom: 1.35 });
          }
        });
        list.appendChild(item);
      });
    }

    layoutNodes() {
      // Community-aware initial placement
      const subGroups = new Map();
      this.nodes.forEach(n => {
        if (!subGroups.has(n.subsystem)) subGroups.set(n.subsystem, []);
        subGroups.get(n.subsystem).push(n);
      });

      const uniqueSubs = Array.from(subGroups.keys());
      let unmappedIdx = 0;

      for (const [sub, subNodes] of subGroups.entries()) {
        let center = SUBSYSTEM_CENTROIDS[sub];
        if (!center) {
          const angle = (unmappedIdx / (uniqueSubs.length || 1)) * Math.PI * 2;
          center = {
            x: Math.cos(angle) * 880,
            y: Math.sin(angle) * 880
          };
          unmappedIdx++;
        }

        // Compute subsystem cluster dispersion radius based on node count
        const clusterRadius = Math.max(70, Math.min(240, Math.sqrt(subNodes.length) * 26));

        subNodes.forEach((node, idx) => {
          // Golden angle phyllotaxis distribution inside subsystem cluster
          const phi = idx * 2.39996;
          const dist = Math.sqrt(idx / (subNodes.length || 1)) * clusterRadius;

          node.x = center.x + Math.cos(phi) * dist;
          node.y = center.y + Math.sin(phi) * dist;
          node.vx = 0;
          node.vy = 0;
          node.radius = Math.min(16, Math.max(6, 5 + (node.degree_in + node.degree_out) * 0.35));
        });

        this.subsystemCentroids.set(sub, {
          x: center.x,
          y: center.y,
          radius: clusterRadius,
          count: subNodes.length
        });
      }

      // Quick force relaxation pass to align edges & enforce collision padding
      this.startSimulation();
    }

    startSimulation() {
      this.simulationAlpha = 1.0;
      if (!this.isSimulating) {
        this.isSimulating = true;
        this.tickSimulation();
      }
    }

    tickSimulation() {
      if (this.simulationAlpha < 0.02) {
        this.isSimulating = false;
        this.updateSubsystemCentroids();
        this.renderCanvas();
        return;
      }

      const activeNodes = this.filteredNodes.length > 0 ? this.filteredNodes : this.nodes;
      const decay = 0.90;

      const edgeMap = new Map();
      activeNodes.forEach(n => edgeMap.set(n.id, n));

      // 1. Edge spring forces
      this.filteredEdges.forEach(e => {
        const s = edgeMap.get(e.source_id);
        const t = edgeMap.get(e.target_id);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const restLength = 65;
          const force = (dist - restLength) * 0.012 * this.simulationAlpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (s !== this.draggedNode) { s.vx += fx; s.vy += fy; }
          if (t !== this.draggedNode) { t.vx -= fx; t.vy -= fy; }
        }
      });

      // 2. Collision avoidance & node repulsion (radius-based only, no label dimensions!)
      for (let i = 0; i < activeNodes.length; i++) {
        const a = activeNodes[i];
        for (let j = i + 1; j < Math.min(activeNodes.length, i + 25); j++) {
          const b = activeNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const minDist = a.radius + b.radius + 8;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            const overlap = (minDist - dist) * 0.5 * this.simulationAlpha;
            const ox = (dx / dist) * overlap;
            const oy = (dy / dist) * overlap;
            if (a !== this.draggedNode) { a.vx -= ox; a.vy -= oy; }
            if (b !== this.draggedNode) { b.vx += ox; b.vy += oy; }
          }
        }
      }

      // 3. Subsystem cohesive pull
      activeNodes.forEach(n => {
        if (n === this.draggedNode) return;
        const centroid = this.subsystemCentroids.get(n.subsystem);
        if (centroid) {
          n.vx += (centroid.x - n.x) * 0.008 * this.simulationAlpha;
          n.vy += (centroid.y - n.y) * 0.008 * this.simulationAlpha;
        }

        n.x += n.vx;
        n.y += n.vy;
        n.vx *= decay;
        n.vy *= decay;
      });

      this.simulationAlpha *= 0.94;
      this.renderCanvas();

      requestAnimationFrame(() => this.tickSimulation());
    }

    updateSubsystemCentroids() {
      const sums = new Map();
      this.nodes.forEach(n => {
        if (!sums.has(n.subsystem)) sums.set(n.subsystem, { x: 0, y: 0, count: 0 });
        const s = sums.get(n.subsystem);
        s.x += n.x;
        s.y += n.y;
        s.count += 1;
      });

      for (const [sub, data] of sums.entries()) {
        if (data.count > 0) {
          const existing = this.subsystemCentroids.get(sub) || { radius: 140 };
          this.subsystemCentroids.set(sub, {
            x: data.x / data.count,
            y: data.y / data.count,
            radius: existing.radius,
            count: data.count
          });
        }
      }
    }

    applyFilters() {
      let filtered = this.nodes;

      if (this.currentFilterSubsystem !== 'all') {
        filtered = filtered.filter(n => n.subsystem === this.currentFilterSubsystem);
      }

      if (this.currentFilterType !== 'all') {
        filtered = filtered.filter(n => n.type === this.currentFilterType);
      }

      if (this.searchQuery) {
        filtered = filtered.filter(n =>
          n.name.toLowerCase().includes(this.searchQuery) ||
          n.label.toLowerCase().includes(this.searchQuery) ||
          (n.file_path && n.file_path.toLowerCase().includes(this.searchQuery))
        );
      }

      if (this.neighborhoodHops && this.selectedNode) {
        const neighborSet = new Set(this.neighborhoodHops.nodes.map(n => n.id));
        filtered = filtered.filter(n => neighborSet.has(n.id));
      }

      this.filteredNodes = filtered;
      const nodeIds = new Set(filtered.map(n => n.id));
      this.filteredEdges = this.edges.filter(e => nodeIds.has(e.source_id) && nodeIds.has(e.target_id));

      this.renderCanvas();
    }

    fitGraphToViewport(options = {}) {
      const padding = options.padding !== undefined ? options.padding : 60;
      const nodesToFit = this.filteredNodes.length > 0 ? this.filteredNodes : this.nodes;
      if (!nodesToFit || nodesToFit.length === 0) return;

      const container = this.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const viewportWidth = rect.width;
      const viewportHeight = rect.height;

      if (viewportWidth < 50 || viewportHeight < 50) {
        requestAnimationFrame(() => this.fitGraphToViewport(options));
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      if (this.canvas.width !== viewportWidth * dpr || this.canvas.height !== viewportHeight * dpr) {
        this.canvas.width = viewportWidth * dpr;
        this.canvas.height = viewportHeight * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodesToFit.forEach(n => {
        const r = n.radius || 8;
        if (n.x - r < minX) minX = n.x - r;
        if (n.x + r > maxX) maxX = n.x + r;
        if (n.y - r < minY) minY = n.y - r;
        if (n.y + r > maxY) maxY = n.y + r;
      });

      const graphWidth = maxX - minX || 600;
      const graphHeight = maxY - minY || 400;

      const availableWidth = Math.max(100, viewportWidth - padding * 2);
      const availableHeight = Math.max(100, viewportHeight - padding * 2);

      const scaleX = availableWidth / graphWidth;
      const scaleY = availableHeight / graphHeight;

      // Safe bounds: Overview scales comfortably between 0.2 and 1.2
      const targetZoom = Math.min(1.4, Math.max(0.18, Math.min(scaleX, scaleY)));

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;

      this.zoom = targetZoom;
      this.panX = (viewportWidth / 2) - (graphCenterX * targetZoom);
      this.panY = (viewportHeight / 2) - (graphCenterY * targetZoom);

      this.renderCanvas();
    }

    fitToScreen() {
      this.fitGraphToViewport({ padding: 60 });
    }

    centerOnNode(node, options = {}) {
      const container = this.canvas.parentElement;
      if (!container || !node) return;
      const rect = container.getBoundingClientRect();
      const viewportWidth = rect.width;
      const viewportHeight = rect.height;

      if (options.zoom) {
        this.zoom = options.zoom;
      }

      this.panX = (viewportWidth / 2) - (node.x * this.zoom);
      this.panY = (viewportHeight / 2) - (node.y * this.zoom);
      this.renderCanvas();
    }

    // --- High-Performance Level-of-Detail (LOD) Canvas Renderer ---
    renderCanvas() {
      const ctx = this.ctx;
      const container = this.canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.zoom, this.zoom);

      // Frustum culling box in world coordinates
      const viewLeft = -this.panX / this.zoom;
      const viewTop = -this.panY / this.zoom;
      const viewRight = viewLeft + w / this.zoom;
      const viewBottom = viewTop + h / this.zoom;

      const isNodeSelected = !!this.selectedNode;
      const isNodeHovered = !!this.hoveredNode;

      const selectedNeighbors = new Set();
      if (isNodeSelected) {
        selectedNeighbors.add(this.selectedNode.id);
        this.edges.forEach(e => {
          if (e.source_id === this.selectedNode.id) selectedNeighbors.add(e.target_id);
          if (e.target_id === this.selectedNode.id) selectedNeighbors.add(e.source_id);
        });
      }

      const hoveredNeighbors = new Set();
      if (isNodeHovered && !isNodeSelected) {
        hoveredNeighbors.add(this.hoveredNode.id);
        this.edges.forEach(e => {
          if (e.source_id === this.hoveredNode.id) hoveredNeighbors.add(e.target_id);
          if (e.target_id === this.hoveredNode.id) hoveredNeighbors.add(e.source_id);
        });
      }

      // --- 1. Subsystem Community Centroids at Overview Zoom (< 0.75) ---
      if (this.zoom < 0.75 && !isNodeSelected) {
        ctx.save();
        for (const [subName, centroid] of this.subsystemCentroids.entries()) {
          const color = SUBSYSTEM_COLORS[subName] || '#94a3b8';
          // Background soft pill for subsystem community
          ctx.font = `700 ${Math.max(12, Math.min(18, 14 / this.zoom))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const title = `${subName.toUpperCase()}`;
          const textWidth = ctx.measureText(title).width;
          const pillH = Math.max(20, 24 / this.zoom);
          const pillW = textWidth + (20 / this.zoom);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2 / this.zoom;

          const px = centroid.x - pillW / 2;
          const py = centroid.y - centroid.radius - (28 / this.zoom);

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(px, py, pillW, pillH, pillH / 2);
          } else {
            ctx.rect(px, py, pillW, pillH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.fillText(title, centroid.x, py + pillH / 2);
        }
        ctx.restore();
      }

      const nodeMap = new Map();
      this.filteredNodes.forEach(n => nodeMap.set(n.id, n));

      // --- 2. Draw Edges with Level-of-Detail Opacity ---
      this.filteredEdges.forEach(edge => {
        const s = nodeMap.get(edge.source_id);
        const t = nodeMap.get(edge.target_id);
        if (!s || !t) return;

        // Frustum culling for edges
        if (Math.max(s.x, t.x) < viewLeft || Math.min(s.x, t.x) > viewRight ||
            Math.max(s.y, t.y) < viewTop || Math.min(s.y, t.y) > viewBottom) {
          return;
        }

        const isHighlightedSelection = isNodeSelected && (edge.source_id === this.selectedNode.id || edge.target_id === this.selectedNode.id);
        const isHighlightedHover = isNodeHovered && (edge.source_id === this.hoveredNode.id || edge.target_id === this.hoveredNode.id);
        const isPathEdge = this.highlightedPath && this.highlightedPath.edgeIds.has(edge.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isPathEdge) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.5 / this.zoom;
        } else if (isHighlightedSelection) {
          ctx.strokeStyle = edge.source_id === this.selectedNode.id ? '#818cf8' : '#38bdf8';
          ctx.lineWidth = 2.2 / this.zoom;
        } else if (isHighlightedHover) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.8 / this.zoom;
        } else if (isNodeSelected || isNodeHovered) {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.06)';
          ctx.lineWidth = 0.6 / this.zoom;
        } else {
          // At overview zoom, edges are subtle to prevent visual clutter
          ctx.strokeStyle = this.zoom < 0.5 ? 'rgba(51, 65, 85, 0.12)' : 'rgba(51, 65, 85, 0.28)';
          ctx.lineWidth = Math.max(0.6, 0.85 / this.zoom);
        }
        ctx.stroke();
      });

      // --- 3. Draw Nodes ---
      const labelsToDraw = [];

      this.filteredNodes.forEach(node => {
        // Frustum culling
        if (node.x + node.radius < viewLeft || node.x - node.radius > viewRight ||
            node.y + node.radius < viewTop || node.y - node.radius > viewBottom) {
          return;
        }

        const isSelected = this.selectedNode && this.selectedNode.id === node.id;
        const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
        const isNeighbor = (isNodeSelected && selectedNeighbors.has(node.id)) || (isNodeHovered && hoveredNeighbors.has(node.id));
        const isPathNode = this.highlightedPath && this.highlightedPath.nodeIds.has(node.id);
        const color = SUBSYSTEM_COLORS[node.subsystem] || '#94a3b8';

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
        } else if (isHovered) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
        } else if (isPathNode) {
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
        } else if ((isNodeSelected || isNodeHovered) && !isNeighbor) {
          ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = color;
          ctx.shadowBlur = (node.degree_in + node.degree_out > 18) ? 6 : 0;
          ctx.shadowColor = color;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Node border
        ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? '#38bdf8' : (isNeighbor || !isNodeSelected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.05)'));
        ctx.lineWidth = isSelected ? 3.5 / this.zoom : (isHovered ? 2.5 / this.zoom : 1 / this.zoom);
        ctx.stroke();

        // --- LEVEL-OF-DETAIL LABEL DECISION ---
        let renderLabel = false;
        let isPrimary = false;

        if (isSelected || isHovered) {
          renderLabel = true;
          isPrimary = true;
        } else if (isNeighbor) {
          renderLabel = true;
          isPrimary = false;
        } else if (isPathNode) {
          renderLabel = true;
          isPrimary = true;
        } else if (this.searchQuery && node.name.toLowerCase().includes(this.searchQuery)) {
          renderLabel = true;
          isPrimary = true;
        } else if (this.zoom >= 1.8) {
          // Deep zoom: show all visible nodes
          renderLabel = true;
        } else if (this.zoom >= 1.2) {
          // Detail zoom: show nodes with degree >= 8
          renderLabel = (node.degree_in + node.degree_out >= 8);
        } else if (this.zoom >= 0.75) {
          // Mid zoom: only key hubs (degree >= 25)
          renderLabel = (node.degree_in + node.degree_out >= 25);
        } else {
          // Overview zoom (< 0.75): NO general node labels!
          renderLabel = false;
        }

        if (renderLabel) {
          labelsToDraw.push({ node, isPrimary, isSelected, isHovered, isNeighbor });
        }
      });

      // --- 4. Draw Crisp Node Labels on Top with Contrast Pill ---
      labelsToDraw.forEach(({ node, isPrimary, isSelected, isHovered }) => {
        const labelText = node.name.length > 28 ? node.name.substring(0, 26) + '…' : node.name;
        const fontSize = isPrimary ? Math.max(11, Math.min(14, 12 / Math.sqrt(this.zoom))) : Math.max(10, Math.min(12, 10.5 / Math.sqrt(this.zoom)));

        ctx.font = `${isPrimary ? '700' : '500'} ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const pillH = fontSize + (6 / this.zoom);
        const pillW = textWidth + (12 / this.zoom);
        const pillX = node.x - pillW / 2;
        const pillY = node.y + node.radius + (4 / this.zoom);

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, 4 / this.zoom);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }

        if (isSelected || isHovered) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = isSelected ? '#6366f1' : '#38bdf8';
          ctx.lineWidth = 1.5 / this.zoom;
        } else {
          ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
          ctx.lineWidth = 0.8 / this.zoom;
        }

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? '#38bdf8' : '#e2e8f0');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, pillY + pillH / 2);
      });

      ctx.restore();
    }

    // --- Mouse & Zoom Interaction ---
    getCanvasCoordinates(e) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - this.panX) / this.zoom;
      const worldY = (clientY - this.panY) / this.zoom;
      return { clientX, clientY, worldX, worldY };
    }

    findNodeAt(worldX, worldY) {
      const hitRadiusExtra = Math.max(4, 6 / this.zoom);
      for (let i = this.filteredNodes.length - 1; i >= 0; i--) {
        const n = this.filteredNodes[i];
        const dx = worldX - n.x;
        const dy = worldY - n.y;
        const r = n.radius + hitRadiusExtra;
        if (dx * dx + dy * dy <= r * r) {
          return n;
        }
      }
      return null;
    }

    onMouseDown(e) {
      const pos = this.getCanvasCoordinates(e);
      const clicked = this.findNodeAt(pos.worldX, pos.worldY);

      if (clicked) {
        this.draggedNode = clicked;
        this.selectNode(clicked);
      } else {
        this.isDraggingCanvas = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    }

    onMouseMove(e) {
      const pos = this.getCanvasCoordinates(e);

      if (this.draggedNode) {
        this.draggedNode.x = pos.worldX;
        this.draggedNode.y = pos.worldY;
        this.renderCanvas();
        return;
      }

      if (this.isDraggingCanvas) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.panX += dx;
        this.panY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.renderCanvas();
        return;
      }

      // Hover check
      const hovered = this.findNodeAt(pos.worldX, pos.worldY);
      const tooltip = document.getElementById('archHoverTooltip');

      if (hovered !== this.hoveredNode) {
        this.hoveredNode = hovered;
        this.renderCanvas();
      }

      if (hovered) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${pos.clientX + 16}px`;
        tooltip.style.top = `${pos.clientY + 16}px`;
        tooltip.innerHTML = `
          <div style="font-weight:700; color:#fff; margin-bottom:2px;">${hovered.name}</div>
          <div style="font-size:10px; color:#38bdf8;">${hovered.type} • ${hovered.subsystem}</div>
          ${hovered.file_path ? `<div style="font-size:10px; color:#94a3b8; font-family:monospace; margin-top:3px;">${hovered.file_path}</div>` : ''}
          <div style="font-size:10px; color:#a5b4fc; margin-top:4px;">${hovered.degree_in} incoming, ${hovered.degree_out} outgoing</div>
        `;
      } else {
        tooltip.style.display = 'none';
      }
    }

    onMouseUp(e) {
      if (this.draggedNode) {
        this.draggedNode = null;
      }
      this.isDraggingCanvas = false;
    }

    onWheel(e) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.min(3.5, Math.max(0.15, this.zoom * zoomFactor));

      // Zoom accurately around cursor position
      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;

      this.renderCanvas();
    }

    // --- Selection & Inspector Panel ---
    async selectNode(node) {
      this.selectedNode = node;
      this.renderCanvas();

      const title = document.getElementById('archInspectorTitle');
      const badge = document.getElementById('archInspectorBadge');
      const body = document.getElementById('archInspectorBody');

      title.textContent = node.name;
      badge.style.display = 'inline-block';
      badge.textContent = node.type;
      badge.style.background = SUBSYSTEM_COLORS[node.subsystem] || '#6366f1';
      badge.style.color = '#fff';

      body.innerHTML = '<div style="color:#64748b; font-size:12px; padding:20px; text-align:center;">Loading details...</div>';

      try {
        const res = await fetch(`/api/architecture/node/${encodeURIComponent(node.id)}`);
        const data = await res.json();
        if (data.success) {
          this.renderNodeDetails(data);
        }
      } catch (err) {
        body.innerHTML = `<div style="color:#ef4444; font-size:12px;">Failed to load node: ${err.message}</div>`;
      }
    }

    renderNodeDetails(data) {
      const node = data.node;
      const inEdges = data.inEdges || [];
      const outEdges = data.outEdges || [];
      const body = document.getElementById('archInspectorBody');

      const isAddedToAi = this.selectedNodeIdsForAi.has(node.id);

      body.innerHTML = `
        <div class="arch-card">
          <div class="arch-card-title">Properties</div>
          <div class="arch-prop-row">
            <span class="arch-prop-label">Subsystem</span>
            <span class="arch-prop-value">${node.subsystem}</span>
          </div>
          <div class="arch-prop-row">
            <span class="arch-prop-label">File Path</span>
            <span class="arch-prop-value" title="${node.file_path || ''}">${node.file_path || 'N/A'}</span>
          </div>
          ${node.loc_count ? `
          <div class="arch-prop-row">
            <span class="arch-prop-label">Lines of Code</span>
            <span class="arch-prop-value">${node.loc_count} (L${node.loc_start}-L${node.loc_end})</span>
          </div>` : ''}
          <div class="arch-prop-row">
            <span class="arch-prop-label">Total Degree</span>
            <span class="arch-prop-value">${(node.degree_in + node.degree_out)} (${node.degree_in} in, ${node.degree_out} out)</span>
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          <button class="arch-btn ${isAddedToAi ? 'arch-btn-primary' : ''}" id="archBtnToggleAiContext" style="flex: 1;">
            ${isAddedToAi ? '✓ In AI Context' : '+ Add to AI Context'}
          </button>
          <button class="arch-btn arch-btn-accent" id="archBtnAnalyzeImpact" style="flex: 1.2;">
            What breaks?
          </button>
        </div>

        <div class="arch-card">
          <div class="arch-card-title">
            <span>Neighborhood Isolation</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="arch-btn" style="flex:1;" id="archBtnHops1">1 Hop</button>
            <button class="arch-btn" style="flex:1;" id="archBtnHops2">2 Hops</button>
            <button class="arch-btn" style="flex:1;" id="archBtnClearHops">Clear</button>
          </div>
        </div>

        <div class="arch-card">
          <div class="arch-card-title">
            <span>Shortest Path Tracing</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="arch-btn" style="flex:1;" id="archBtnSetSource">Set as Source</button>
            <button class="arch-btn" style="flex:1;" id="archBtnSetTarget">Set as Target</button>
          </div>
        </div>

        <div class="arch-card" id="archImpactSection" style="display:none;"></div>

        <div class="arch-card">
          <div class="arch-card-title">
            <span>Incoming Relations (${inEdges.length})</span>
          </div>
          <div class="arch-conn-list">
            ${inEdges.length === 0 ? '<div style="color:#64748b; font-size:11px;">No incoming relations.</div>' : ''}
            ${inEdges.map(e => `
              <div class="arch-conn-item" data-id="${e.source_id}">
                <span style="color:#a5b4fc; font-weight:600;">${e.type}</span>
                <span style="max-width:140px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${e.source_id.split(':').pop()}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="arch-card">
          <div class="arch-card-title">
            <span>Outgoing Relations (${outEdges.length})</span>
          </div>
          <div class="arch-conn-list">
            ${outEdges.length === 0 ? '<div style="color:#64748b; font-size:11px;">No outgoing relations.</div>' : ''}
            ${outEdges.map(e => `
              <div class="arch-conn-item" data-id="${e.target_id}">
                <span style="color:#38bdf8; font-weight:600;">${e.type}</span>
                <span style="max-width:140px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${e.target_id.split(':').pop()}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.getElementById('archBtnToggleAiContext').addEventListener('click', () => {
        if (this.selectedNodeIdsForAi.has(node.id)) {
          this.selectedNodeIdsForAi.delete(node.id);
        } else {
          this.selectedNodeIdsForAi.add(node.id);
        }
        this.renderNodeDetails(data);
      });

      document.getElementById('archBtnAnalyzeImpact').addEventListener('click', () => this.runImpactAnalysis(node.id));

      document.getElementById('archBtnHops1').addEventListener('click', () => this.isolateNeighborhood(node.id, 1));
      document.getElementById('archBtnHops2').addEventListener('click', () => this.isolateNeighborhood(node.id, 2));
      document.getElementById('archBtnClearHops').addEventListener('click', () => {
        this.neighborhoodHops = null;
        this.applyFilters();
        this.fitGraphToViewport({ padding: 60 });
      });

      document.getElementById('archBtnSetSource').addEventListener('click', () => {
        this.pathSourceNode = node;
        this.updatePathBadge();
      });

      document.getElementById('archBtnSetTarget').addEventListener('click', () => {
        this.pathTargetNode = node;
        this.updatePathBadge();
        if (this.pathSourceNode) {
          this.traceShortestPath(this.pathSourceNode.id, this.pathTargetNode.id);
        }
      });

      body.querySelectorAll('.arch-conn-item').forEach(el => {
        el.addEventListener('click', () => {
          const targetId = el.getAttribute('data-id');
          const target = this.nodes.find(n => n.id === targetId);
          if (target) {
            this.selectNode(target);
            this.centerOnNode(target, { zoom: 1.35 });
          }
        });
      });
    }

    async runImpactAnalysis(nodeId) {
      const section = document.getElementById('archImpactSection');
      section.style.display = 'block';
      section.innerHTML = '<div style="color:#64748b; font-size:11px;">Computing blast radius...</div>';

      try {
        const res = await fetch(`/api/architecture/impact/${encodeURIComponent(nodeId)}`);
        const data = await res.json();
        if (data.success) {
          section.innerHTML = `
            <div class="arch-card-title">Impact Blast Radius</div>
            <div class="arch-impact-box risk-${data.riskLevel}">
              <div style="font-weight:700; font-size:12px;">RISK LEVEL: ${data.riskLevel}</div>
              <div style="font-size:11px;">Blast radius touches <b>${data.stats.totalBlastRadius}</b> components across <b>${data.stats.affectedFilesCount}</b> files.</div>
            </div>
            <div style="margin-top:8px; font-size:11px; display:flex; flex-direction:column; gap:4px;">
              <div>• Affected Routes: <b>${data.stats.affectedRoutesCount}</b></div>
              <div>• Affected Frontend Tools: <b>${data.stats.affectedToolsCount}</b></div>
              <div>• Direct Tests: <b>${data.stats.affectedTestsCount}</b></div>
            </div>
            ${data.recommendations && data.recommendations.length > 0 ? `
              <div style="margin-top:8px; padding-top:6px; border-top:1px solid #1e293b; font-size:10px; color:#cbd5e1;">
                <b>Recommendation:</b><br>${data.recommendations[0]}
              </div>` : ''}
          `;
        }
      } catch (err) {
        section.innerHTML = `<div style="color:#ef4444; font-size:11px;">Impact analysis failed: ${err.message}</div>`;
      }
    }

    async isolateNeighborhood(nodeId, hops) {
      try {
        const res = await fetch(`/api/architecture/neighborhood?nodeId=${encodeURIComponent(nodeId)}&hops=${hops}`);
        const data = await res.json();
        if (data.success) {
          this.neighborhoodHops = data;
          this.applyFilters();
          this.fitGraphToViewport({ padding: 60 });
        }
      } catch (err) {
        console.error('[arch-tool] Error fetching neighborhood:', err);
      }
    }

    updatePathBadge() {
      const badge = document.getElementById('archPathBadge');
      if (this.pathSourceNode || this.pathTargetNode) {
        badge.style.display = 'flex';
        badge.innerHTML = `
          <span>Source: <b>${this.pathSourceNode ? this.pathSourceNode.name : 'None'}</b></span>
          <span>→</span>
          <span>Target: <b>${this.pathTargetNode ? this.pathTargetNode.name : 'None'}</b></span>
          <button style="background:transparent; border:none; color:#cbd5e1; cursor:pointer; font-weight:700;" id="archBtnClearPath">✕</button>
        `;
        document.getElementById('archBtnClearPath').addEventListener('click', () => {
          this.pathSourceNode = null;
          this.pathTargetNode = null;
          this.highlightedPath = null;
          badge.style.display = 'none';
          this.renderCanvas();
        });
      } else {
        badge.style.display = 'none';
      }
    }

    async traceShortestPath(sourceId, targetId) {
      try {
        const res = await fetch(`/api/architecture/path?source=${encodeURIComponent(sourceId)}&target=${encodeURIComponent(targetId)}`);
        const data = await res.json();
        if (data.success && data.found) {
          this.highlightedPath = {
            nodeIds: new Set(data.path.map(n => n.id)),
            edgeIds: new Set(data.edges.map(e => e.id))
          };
          this.renderCanvas();
        } else {
          alert(data.message || 'No path found between selected nodes.');
        }
      } catch (err) {
        alert('Path search error: ' + err.message);
      }
    }

    // --- AI Context Optimizer ---
    async previewContext() {
      const query = document.getElementById('archPromptInput').value.trim();
      const list = document.getElementById('archSnippetsList');
      const countEl = document.getElementById('archSnippetCount');

      list.innerHTML = '<div style="color:#64748b; font-size:11px; padding:6px;">Slicing AST & packing context...</div>';

      try {
        const res = await fetch('/api/architecture/context/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query || 'Architecture Overview',
            tokenBudget: this.tokenBudget,
            strategy: this.strategy,
            selectedNodeIds: Array.from(this.selectedNodeIdsForAi)
          })
        });

        const data = await res.json();
        if (data.success) {
          countEl.textContent = data.snippetCount;
          document.getElementById('archScoreBaseline').textContent = data.baselineTokens.toLocaleString();
          document.getElementById('archScorePacked').textContent = data.packedTokens.toLocaleString();
          document.getElementById('archScoreReduction').textContent = `${data.reductionPercent}%`;
          document.getElementById('archSavingsBadge').textContent = `${data.reductionPercent}% Token Reduction`;

          list.innerHTML = '';
          data.snippets.forEach(s => {
            const item = document.createElement('div');
            item.className = 'arch-snippet-item';
            item.innerHTML = `
              <span style="font-weight:600; max-width:240px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${s.title}</span>
              <span class="arch-snippet-tokens">${s.tokens} tok</span>
            `;
            list.appendChild(item);
          });
        }
      } catch (err) {
        list.innerHTML = `<div style="color:#ef4444; font-size:11px;">Preview failed: ${err.message}</div>`;
      }
    }

    async executeAiQuery() {
      const query = document.getElementById('archPromptInput').value.trim();
      if (!query) {
        alert('Please enter a question or engineering prompt.');
        return;
      }

      const btn = document.getElementById('archBtnExecuteAiQuery');
      const box = document.getElementById('archResponseBox');

      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      box.textContent = 'Querying knowledge graph and generating architectural analysis...';

      try {
        const res = await fetch('/api/architecture/context/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            tokenBudget: this.tokenBudget,
            strategy: this.strategy,
            selectedNodeIds: Array.from(this.selectedNodeIdsForAi)
          })
        });

        const data = await res.json();
        if (data.success) {
          box.textContent = data.response;
          document.getElementById('archScoreBaseline').textContent = data.metrics.baselineInputTokens.toLocaleString();
          document.getElementById('archScorePacked').textContent = data.metrics.inputTokens.toLocaleString();
          document.getElementById('archScoreReduction').textContent = `${data.metrics.reductionPercent}%`;
          document.getElementById('archScoreLatency').textContent = `${data.metrics.latencyMs}ms`;
          document.getElementById('archSavingsBadge').textContent = `${data.metrics.reductionPercent}% Token Reduction`;

          const list = document.getElementById('archSnippetsList');
          document.getElementById('archSnippetCount').textContent = data.context.snippetCount;
          list.innerHTML = '';
          data.context.snippets.forEach(s => {
            const item = document.createElement('div');
            item.className = 'arch-snippet-item';
            item.innerHTML = `
              <span style="font-weight:600; max-width:240px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${s.title}</span>
              <span class="arch-snippet-tokens">${s.tokens} tok</span>
            `;
            list.appendChild(item);
          });
        } else {
          box.textContent = 'Error: ' + (data.message || 'Query failed');
        }
      } catch (err) {
        box.textContent = 'Network or server error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Ask AI with Graph';
      }
    }
  }

  window.ArchitectureGraphTool = ArchitectureGraphTool;
})();
