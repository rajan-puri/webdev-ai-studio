/**
 * client/js/tools/acf-architect.js
 * ACF Architect — Production-Grade WordPress ACF Development Workspace.
 * 
 * Supports:
 * - Full 3-pane responsive desktop workspace (Tree, Editor, Output)
 * - Complete 30+ ACF field types with type-specific editors
 * - Nested Containers: Groups, Repeaters, Flexible Content (with Layouts)
 * - Visual Location Rules & Conditional Logic Builders
 * - Deterministic Native ACF JSON, PHP Registration & PHP Template Generation
 * - Multi-layer Validation Engine
 * - AI Architecture Description & Conversational Patching (with confirmation)
 * - Existing Project Inspection & Code <-> Field Mapping
 * - Safe Project Apply with File Diffs & Confirmations
 * - SQLite Architecture Persistence & Undo/Redo Stack
 */

(function() {
  'use strict';

  class AcfArchitectTool {
    constructor(containerId = 'viewAcfArchitect') {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.currentArchitecture = null;
      this.baseArchitecture = null;
      this.selectedFieldPath = []; // e.g. [0] or [0, 'sub_fields', 1]
      this.activeOutputTab = 'json'; // 'json' | 'php' | 'template' | 'docs' | 'diff'
      this.templateMode = 'single'; // 'single' | 'template_parts'
      this.unsavedChanges = 0;
      this.historyStack = [];
      this.redoStack = [];
      this.activeProject = null;
      this.projectInsights = null;

      this.init();
    }

    async init() {
      this.renderWorkspace();
      this.bindEvents();
      this.loadActiveProject();
      
      // Initialize with default or prompt user
      this.createDefaultArchitecture();
    }

    // 1. Initial State / Default Architecture
    createDefaultArchitecture() {
      this.currentArchitecture = {
        key: 'group_homepage_' + Math.random().toString(36).substring(2, 7),
        title: 'Homepage Content',
        description: 'Primary custom fields for the homepage layout.',
        fields: [
          {
            key: 'field_hero_title_' + Math.random().toString(36).substring(2, 7),
            name: 'hero_title',
            label: 'Hero Title',
            type: 'text',
            instructions: 'Main headline for the hero banner.',
            required: 1,
            default_value: 'Designing directly on your code'
          },
          {
            key: 'field_hero_desc_' + Math.random().toString(36).substring(2, 7),
            name: 'hero_description',
            label: 'Hero Description',
            type: 'textarea',
            instructions: 'Sub-heading narrative.',
            required: 0,
            default_value: ''
          },
          {
            key: 'field_hero_image_' + Math.random().toString(36).substring(2, 7),
            name: 'hero_image',
            label: 'Hero Image',
            type: 'image',
            return_format: 'array',
            instructions: 'Visual background asset.',
            required: 0
          }
        ],
        location: [
          [
            { param: 'post_type', operator: '==', value: 'page' },
            { param: 'page_template', operator: '==', value: 'front-page.php' }
          ]
        ],
        active: true
      };

      this.baseArchitecture = JSON.parse(JSON.stringify(this.currentArchitecture));
      this.selectedFieldPath = [0];
      this.historyStack = [JSON.parse(JSON.stringify(this.currentArchitecture))];
      this.redoStack = [];
      this.unsavedChanges = 0;

      this.refreshAll();
    }

    // 2. Render Main 3-Pane DOM Layout
    renderWorkspace() {
      this.container.innerHTML = `
        <div class="acf-architect-workspace">
          <!-- 1. TOP TOOLBAR -->
          <header class="acf-toolbar">
            <div class="acf-toolbar-left">
              <div class="acf-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 7h16M4 12h16M4 17h10"/>
                </svg>
                <div class="acf-brand-text">
                  <span class="acf-brand-title">ACF Architect</span>
                  <span class="acf-brand-tagline">Design your WordPress content architecture. Generate the code to build it.</span>
                </div>
              </div>
              <div class="acf-project-picker-wrap">
                <select id="acfProjectSelect" class="acf-select-sm" title="Active Project">
                  <option value="">Standalone Architecture</option>
                </select>
              </div>
            </div>

            <div class="acf-toolbar-center">
              <div class="acf-arch-title-wrap">
                <input type="text" id="acfArchTitleInput" class="acf-title-input" value="Homepage Content" placeholder="Architecture / Group Title">
                <span id="acfValidationPill" class="acf-pill acf-pill-valid">✓ Valid</span>
              </div>
              <div id="acfUnsavedBadge" class="acf-unsaved-badge" style="display: none;">
                <span class="acf-unsaved-dot"></span>
                <span id="acfUnsavedText">Unsaved changes</span>
              </div>
            </div>

            <div class="acf-toolbar-right">
              <button class="acf-btn" id="acfBtnStartModal" title="Templates & Entry Options">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>New</span>
              </button>
              <button class="acf-btn" id="acfBtnAiPrompt" title="Describe with AI">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>AI Prompt</span>
              </button>
              <button class="acf-btn" id="acfBtnImportJson" title="Import Native ACF JSON">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Import</span>
              </button>
              <button class="acf-btn" id="acfBtnInspectProject" title="Analyze Current Project">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span>Inspect</span>
              </button>
              <button class="acf-btn" id="acfBtnValidate" title="Validate Architecture">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Validate</span>
              </button>
              
              <!-- Export Dropdown -->
              <div class="acf-dropdown-wrap">
                <button class="acf-btn" id="acfBtnExportToggle">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Export ▾</span>
                </button>
                <div class="acf-dropdown-menu" id="acfExportMenu" style="display: none;">
                  <button class="acf-dropdown-item" id="acfExportJson">Download ACF JSON</button>
                  <button class="acf-dropdown-item" id="acfExportPhp">Download PHP Registration</button>
                  <button class="acf-dropdown-item" id="acfExportTemplate">Download PHP Template</button>
                  <button class="acf-dropdown-item" id="acfExportDocs">Download Field Docs (.md)</button>
                </div>
              </div>

              <button class="acf-btn acf-btn-primary" id="acfBtnApply" title="Apply architecture to project">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Apply to Project</span>
              </button>
            </div>
          </header>

          <!-- 2. MAIN 3-PANE WORKSPACE -->
          <div class="acf-workspace-body">
            <!-- PANE 1: FIELD TREE -->
            <aside class="acf-pane acf-pane-tree">
              <div class="acf-pane-header">
                <span class="acf-pane-title">Field Architecture</span>
                <div class="acf-tree-actions">
                  <button class="acf-btn-icon" id="acfBtnAddGroup" title="Add Field Group">+ Group</button>
                  <button class="acf-btn-icon" id="acfBtnAddRepeater" title="Add Repeater">+ Repeater</button>
                  <button class="acf-btn-icon" id="acfBtnAddFlexible" title="Add Flexible Content">+ Flexible</button>
                  <button class="acf-btn-icon acf-btn-icon-primary" id="acfBtnAddField" title="Add Field">+ Field</button>
                </div>
              </div>
              <div class="acf-tree-search-wrap">
                <input type="text" id="acfTreeSearch" class="acf-search-input" placeholder="Filter fields...">
              </div>
              <div class="acf-tree-container" id="acfTreeContainer">
                <!-- Rendered dynamically -->
              </div>
            </aside>

            <!-- PANE 2: FIELD EDITOR -->
            <main class="acf-pane acf-pane-editor" id="acfFieldEditorPane">
              <!-- Rendered dynamically based on selection -->
            </main>

            <!-- PANE 3: CODE & OUTPUT -->
            <aside class="acf-pane acf-pane-output">
              <div class="acf-pane-header">
                <div class="acf-output-tabs">
                  <button class="acf-tab-btn active" data-tab="json">JSON</button>
                  <button class="acf-tab-btn" data-tab="php">PHP</button>
                  <button class="acf-tab-btn" data-tab="template">Template</button>
                  <button class="acf-tab-btn" data-tab="docs">Docs</button>
                  <button class="acf-tab-btn" data-tab="diff">Diff</button>
                </div>
                <div class="acf-output-actions">
                  <select id="acfTemplateModeSelect" class="acf-select-xs" style="display: none;">
                    <option value="single">Single Template</option>
                    <option value="template_parts">Template Parts</option>
                  </select>
                  <button class="acf-btn-xs" id="acfBtnCopyOutput" title="Copy code">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Copy</span>
                  </button>
                  <button class="acf-btn-xs" id="acfBtnDownloadOutput" title="Download file">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div class="acf-output-content" id="acfOutputContent">
                <pre><code id="acfOutputCode" class="language-json">Generating...</code></pre>
              </div>
            </aside>
          </div>

          <!-- 3. BOTTOM AI COMMAND BAR -->
          <footer class="acf-command-bar">
            <div class="acf-command-chips">
              <span class="acf-chip-label">Quick Prompts:</span>
              <button class="acf-chip" data-prompt="Create a homepage with hero, features, testimonials, FAQ and CTA">Homepage Architecture</button>
              <button class="acf-chip" data-prompt="Add a testimonials repeater with author_name, author_photo, quote and 5-star rating">+ Testimonials Repeater</button>
              <button class="acf-chip" data-prompt="Add a video field that appears when enable_video is true">+ Conditional Video</button>
              <button class="acf-chip" data-prompt="Add a call to action group with headline, description and button">+ CTA Group</button>
              <button class="acf-chip" data-prompt="Convert into flexible content modular sections">+ Flexible Layouts</button>
            </div>
            <div class="acf-command-input-wrap">
              <div class="acf-history-controls">
                <button class="acf-btn-icon" id="acfBtnUndo" title="Undo (Cmd+Z)">↶</button>
                <button class="acf-btn-icon" id="acfBtnRedo" title="Redo (Cmd+Shift+Z)">↷</button>
              </div>
              <input type="text" id="acfCommandInput" class="acf-command-input" placeholder="Ask AI to architect or patch fields (e.g., 'Add a testimonials repeater with photo and rating', 'Make hero image optional')...">
              <button class="acf-btn acf-btn-primary" id="acfBtnRunCommand">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                <span>Architect</span>
              </button>
            </div>
          </footer>

          <!-- MODALS CONTAINER -->
          <div id="acfModalContainer"></div>
        </div>
      `;
    }

    // 3. Bind Core Event Listeners
    bindEvents() {
      // Architecture title update
      const titleInput = document.getElementById('acfArchTitleInput');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          this.currentArchitecture.title = e.target.value;
          this.recordChange();
          this.updateOutputs();
        });
      }

      // Add field buttons
      const btnAddField = document.getElementById('acfBtnAddField');
      if (btnAddField) btnAddField.addEventListener('click', () => this.addNewField('text'));

      const btnAddGroup = document.getElementById('acfBtnAddGroup');
      if (btnAddGroup) btnAddGroup.addEventListener('click', () => this.addNewField('group'));

      const btnAddRepeater = document.getElementById('acfBtnAddRepeater');
      if (btnAddRepeater) btnAddRepeater.addEventListener('click', () => this.addNewField('repeater'));

      const btnAddFlexible = document.getElementById('acfBtnAddFlexible');
      if (btnAddFlexible) btnAddFlexible.addEventListener('click', () => this.addNewField('flexible_content'));

      // Output tabs
      document.querySelectorAll('.acf-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.acf-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.activeOutputTab = e.target.getAttribute('data-tab');
          this.updateOutputs();
        });
      });

      // Template mode switch
      const templateModeSelect = document.getElementById('acfTemplateModeSelect');
      if (templateModeSelect) {
        templateModeSelect.addEventListener('change', (e) => {
          this.templateMode = e.target.value;
          this.updateOutputs();
        });
      }

      // Copy & download buttons
      const btnCopy = document.getElementById('acfBtnCopyOutput');
      if (btnCopy) btnCopy.addEventListener('click', () => this.copyCurrentOutput());

      const btnDownload = document.getElementById('acfBtnDownloadOutput');
      if (btnDownload) btnDownload.addEventListener('click', () => this.downloadCurrentOutput());

      // AI Command submit
      const btnRunCommand = document.getElementById('acfBtnRunCommand');
      const commandInput = document.getElementById('acfCommandInput');
      if (btnRunCommand && commandInput) {
        btnRunCommand.addEventListener('click', () => this.submitAiCommand());
        commandInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.submitAiCommand();
        });
      }

      // Quick prompt chips
      document.querySelectorAll('.acf-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          const prompt = e.target.getAttribute('data-prompt');
          if (commandInput) {
            commandInput.value = prompt;
            this.submitAiCommand();
          }
        });
      });

      // Undo / Redo
      const btnUndo = document.getElementById('acfBtnUndo');
      if (btnUndo) btnUndo.addEventListener('click', () => this.undo());
      const btnRedo = document.getElementById('acfBtnRedo');
      if (btnRedo) btnRedo.addEventListener('click', () => this.redo());

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
      });

      // Modals triggers
      const btnStart = document.getElementById('acfBtnStartModal');
      if (btnStart) btnStart.addEventListener('click', () => this.openStartModal());

      const btnAiPrompt = document.getElementById('acfBtnAiPrompt');
      if (btnAiPrompt) btnAiPrompt.addEventListener('click', () => this.promptAiDescription());

      const btnImport = document.getElementById('acfBtnImportJson');
      if (btnImport) btnImport.addEventListener('click', () => this.openImportModal());

      const btnInspect = document.getElementById('acfBtnInspectProject');
      if (btnInspect) btnInspect.addEventListener('click', () => this.inspectActiveProject());

      const btnValidate = document.getElementById('acfBtnValidate');
      if (btnValidate) btnValidate.addEventListener('click', () => this.runValidation());

      const btnApply = document.getElementById('acfBtnApply');
      if (btnApply) btnApply.addEventListener('click', () => this.openApplyModal());

      // Export menu toggle
      const btnExportToggle = document.getElementById('acfBtnExportToggle');
      const exportMenu = document.getElementById('acfExportMenu');
      if (btnExportToggle && exportMenu) {
        btnExportToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => {
          exportMenu.style.display = 'none';
        });
      }

      // Export menu items
      const btnExJson = document.getElementById('acfExportJson');
      if (btnExJson) btnExJson.addEventListener('click', () => this.downloadSpecific('json'));

      const btnExPhp = document.getElementById('acfExportPhp');
      if (btnExPhp) btnExPhp.addEventListener('click', () => this.downloadSpecific('php'));

      const btnExTemplate = document.getElementById('acfExportTemplate');
      if (btnExTemplate) btnExTemplate.addEventListener('click', () => this.downloadSpecific('template'));

      const btnExDocs = document.getElementById('acfExportDocs');
      if (btnExDocs) btnExDocs.addEventListener('click', () => this.downloadSpecific('docs'));

      // Field Tree Search
      const treeSearch = document.getElementById('acfTreeSearch');
      if (treeSearch) {
        treeSearch.addEventListener('input', (e) => this.filterFieldTree(e.target.value));
      }
    }

    // 4. Load Active Project Selector
    async loadActiveProject() {
      const select = document.getElementById('acfProjectSelect');
      if (!select) return;

      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          if (data && data.projects && data.projects.length) {
            data.projects.forEach(p => {
              const opt = document.createElement('option');
              opt.value = p.id;
              opt.textContent = `${p.name} (${p.website_url})`;
              select.appendChild(opt);
            });
          }
        }
      } catch (e) {}

      select.addEventListener('change', (e) => {
        this.activeProject = e.target.value;
      });
    }

    // 5. Render Interactive Field Tree
    renderFieldTree() {
      const container = document.getElementById('acfTreeContainer');
      if (!container) return;

      if (!this.currentArchitecture.fields || this.currentArchitecture.fields.length === 0) {
        container.innerHTML = `
          <div class="acf-empty-tree">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <p>No fields yet.</p>
            <button class="acf-btn-sm" id="acfEmptyAddBtn">+ Add First Field</button>
          </div>
        `;
        const addBtn = document.getElementById('acfEmptyAddBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.addNewField('text'));
        return;
      }

      let html = `<div class="acf-tree-root">`;
      // Root Header
      html += `
        <div class="acf-tree-node acf-tree-root-node ${this.selectedFieldPath.length === 0 ? 'selected' : ''}" data-path="root">
          <span class="acf-node-icon">📦</span>
          <span class="acf-node-label font-bold">${this.escapeHtml(this.currentArchitecture.title || 'Field Group')}</span>
          <span class="acf-node-badge">Group Settings</span>
        </div>
      `;

      // Render recursive tree
      html += this.renderFieldNodes(this.currentArchitecture.fields, []);
      html += `</div>`;

      container.innerHTML = html;

      // Bind node clicks
      container.querySelectorAll('.acf-tree-node').forEach(node => {
        node.addEventListener('click', (e) => {
          if (e.target.closest('.acf-node-action')) return;
          const pathStr = node.getAttribute('data-path');
          if (pathStr === 'root') {
            this.selectedFieldPath = [];
          } else {
            this.selectedFieldPath = JSON.parse(pathStr);
          }
          this.renderFieldTree();
          this.renderFieldEditor();
        });
      });

      // Bind node actions (up, down, duplicate, delete)
      container.querySelectorAll('.acf-node-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-action');
          const path = JSON.parse(btn.getAttribute('data-path'));
          this.handleNodeAction(action, path);
        });
      });
    }

    renderFieldNodes(fields, parentPath) {
      let html = `<ul class="acf-node-list">`;
      fields.forEach((field, idx) => {
        const currentPath = parentPath.concat([idx]);
        const isSelected = JSON.stringify(this.selectedFieldPath) === JSON.stringify(currentPath);
        const typeBadge = field.type || 'text';
        const hasChildren = (field.sub_fields && field.sub_fields.length > 0) || (field.layouts && field.layouts.length > 0);

        html += `
          <li class="acf-node-item">
            <div class="acf-tree-node ${isSelected ? 'selected' : ''}" data-path='${JSON.stringify(currentPath)}'>
              <span class="acf-node-drag" title="Drag to reorder">⋮⋮</span>
              <span class="acf-node-type-icon">${this.getFieldTypeIcon(field.type)}</span>
              <span class="acf-node-label">${this.escapeHtml(field.label || field.name)}</span>
              ${field.required ? '<span class="acf-req-star" title="Required">*</span>' : ''}
              <span class="acf-node-type-pill">${typeBadge}</span>
              
              <div class="acf-node-controls">
                <button class="acf-node-action" data-action="up" data-path='${JSON.stringify(currentPath)}' title="Move Up">↑</button>
                <button class="acf-node-action" data-action="down" data-path='${JSON.stringify(currentPath)}' title="Move Down">↓</button>
                <button class="acf-node-action" data-action="duplicate" data-path='${JSON.stringify(currentPath)}' title="Duplicate">⧉</button>
                <button class="acf-node-action acf-node-delete" data-action="delete" data-path='${JSON.stringify(currentPath)}' title="Delete">✕</button>
              </div>
            </div>
        `;

        // Nested sub-fields for repeater or group
        if (field.sub_fields && field.sub_fields.length > 0) {
          html += this.renderFieldNodes(field.sub_fields, currentPath.concat(['sub_fields']));
        }

        // Nested layouts for flexible content
        if (field.layouts && field.layouts.length > 0) {
          html += `<ul class="acf-layout-list">`;
          field.layouts.forEach((layout, lIdx) => {
            const layoutPath = currentPath.concat(['layouts', lIdx]);
            html += `
              <li class="acf-layout-item">
                <div class="acf-tree-node acf-tree-layout-node" data-path='${JSON.stringify(layoutPath)}'>
                  <span class="acf-node-icon">📁</span>
                  <span class="acf-node-label">Layout: ${this.escapeHtml(layout.label || layout.name)}</span>
                  <button class="acf-node-action acf-node-delete" data-action="delete_layout" data-path='${JSON.stringify(layoutPath)}' title="Delete Layout">✕</button>
                </div>
                ${this.renderFieldNodes(layout.sub_fields || [], layoutPath.concat(['sub_fields']))}
              </li>
            `;
          });
          html += `</ul>`;
        }

        html += `</li>`;
      });
      html += `</ul>`;
      return html;
    }

    getFieldTypeIcon(type) {
      switch (type) {
        case 'text': return '🔤';
        case 'textarea': return '📝';
        case 'number': return '#️⃣';
        case 'image': return '🖼';
        case 'gallery': return '🖼🖼';
        case 'file': return '📎';
        case 'wysiwyg': return '🖋';
        case 'link': return '🔗';
        case 'repeater': return '🔁';
        case 'group': return '📦';
        case 'flexible_content': return '🧩';
        case 'select': return '▾';
        case 'true_false': return '🔘';
        case 'color_picker': return '🎨';
        case 'date_picker': return '📅';
        case 'relationship': return '⇄';
        default: return '📄';
      }
    }

    // 6. Handle Tree Actions (Move, Duplicate, Delete)
    handleNodeAction(action, path) {
      if (action === 'delete') {
        this.deleteFieldByPath(path);
      } else if (action === 'duplicate') {
        this.duplicateFieldByPath(path);
      } else if (action === 'up') {
        this.moveFieldByPath(path, -1);
      } else if (action === 'down') {
        this.moveFieldByPath(path, 1);
      } else if (action === 'delete_layout') {
        this.deleteLayoutByPath(path);
      }
    }

    getFieldByPath(path) {
      let target = this.currentArchitecture.fields;
      for (let i = 0; i < path.length; i++) {
        const seg = path[i];
        if (i === path.length - 1) {
          return target[seg];
        }
        target = target[seg];
      }
      return null;
    }

    deleteFieldByPath(path) {
      const field = this.getFieldByPath(path);
      const isContainer = field && (field.type === 'repeater' || field.type === 'group' || field.type === 'flexible_content');
      
      if (isContainer) {
        this.showConfirmModal(
          `Delete "${field.label || field.name}"?`,
          `This container contains sub-fields that will also be permanently deleted.`,
          () => this.executeDelete(path)
        );
      } else {
        this.executeDelete(path);
      }
    }

    executeDelete(path) {
      let targetArr = this.currentArchitecture.fields;
      for (let i = 0; i < path.length - 1; i++) {
        targetArr = targetArr[path[i]];
      }
      const removeIdx = path[path.length - 1];
      targetArr.splice(removeIdx, 1);

      this.selectedFieldPath = [];
      this.recordChange();
      this.refreshAll();
      this.showToast('Field deleted.');
    }

    duplicateFieldByPath(path) {
      let targetArr = this.currentArchitecture.fields;
      for (let i = 0; i < path.length - 1; i++) {
        targetArr = targetArr[path[i]];
      }
      const srcIdx = path[path.length - 1];
      const clone = JSON.parse(JSON.stringify(targetArr[srcIdx]));
      clone.name = clone.name + '_copy';
      clone.label = (clone.label || clone.name) + ' (Copy)';
      clone.key = 'field_' + Math.random().toString(36).substring(2, 12);

      targetArr.splice(srcIdx + 1, 0, clone);
      this.selectedFieldPath = path.slice(0, -1).concat([srcIdx + 1]);
      this.recordChange();
      this.refreshAll();
      this.showToast('Field duplicated.');
    }

    moveFieldByPath(path, delta) {
      let targetArr = this.currentArchitecture.fields;
      for (let i = 0; i < path.length - 1; i++) {
        targetArr = targetArr[path[i]];
      }
      const curIdx = path[path.length - 1];
      const newIdx = curIdx + delta;
      if (newIdx < 0 || newIdx >= targetArr.length) return;

      const item = targetArr.splice(curIdx, 1)[0];
      targetArr.splice(newIdx, 0, item);

      this.selectedFieldPath = path.slice(0, -1).concat([newIdx]);
      this.recordChange();
      this.refreshAll();
    }

    deleteLayoutByPath(path) {
      let targetArr = this.currentArchitecture.fields;
      for (let i = 0; i < path.length - 1; i++) {
        targetArr = targetArr[path[i]];
      }
      const removeIdx = path[path.length - 1];
      targetArr.splice(removeIdx, 1);
      this.selectedFieldPath = [];
      this.recordChange();
      this.refreshAll();
    }

    // 7. Render Center Field Editor Pane
    renderFieldEditor() {
      const pane = document.getElementById('acfFieldEditorPane');
      if (!pane) return;

      // If root group is selected
      if (this.selectedFieldPath.length === 0) {
        this.renderGroupSettingsEditor(pane);
        return;
      }

      const field = this.getFieldByPath(this.selectedFieldPath);
      if (!field) {
        pane.innerHTML = `<div class="acf-no-selection"><p>Select a field from the tree to edit its properties.</p></div>`;
        return;
      }

      let html = `
        <div class="acf-editor-header">
          <div class="acf-editor-title-wrap">
            <span class="acf-editor-tag">${field.type}</span>
            <h2 class="acf-editor-title">${this.escapeHtml(field.label || field.name)}</h2>
          </div>
          <div class="acf-editor-actions">
            <span class="acf-key-pill" title="Unique ACF Field Key">${field.key || 'no_key'}</span>
          </div>
        </div>

        <div class="acf-editor-scroll">
          <!-- Standard Common Settings -->
          <div class="acf-form-section">
            <h3 class="acf-section-heading">Basic Settings</h3>
            
            <div class="acf-field-row">
              <label class="acf-field-label">Field Label <span class="text-red-500">*</span></label>
              <input type="text" class="acf-input" id="acfPropLabel" value="${this.escapeHtml(field.label || '')}" placeholder="e.g. Hero Headline">
              <span class="acf-field-help">This is the title that appears on the EDIT page.</span>
            </div>

            <div class="acf-field-row">
              <label class="acf-field-label">Field Name <span class="text-red-500">*</span></label>
              <input type="text" class="acf-input font-mono" id="acfPropName" value="${this.escapeHtml(field.name || '')}" placeholder="hero_headline">
              <span class="acf-field-help">Single word, no spaces. Underscores allowed. Used in <code>get_field('${field.name}')</code>.</span>
            </div>

            <div class="acf-field-row">
              <label class="acf-field-label">Field Type</label>
              <select class="acf-input" id="acfPropType">
                ${this.renderTypeOptions(field.type)}
              </select>
            </div>

            <div class="acf-field-row">
              <label class="acf-field-label">Instructions</label>
              <textarea class="acf-input" id="acfPropInstructions" rows="2" placeholder="Instructions for authors. Shown when submitting data.">${this.escapeHtml(field.instructions || '')}</textarea>
            </div>

            <div class="acf-field-row acf-row-inline">
              <label class="acf-checkbox-label">
                <input type="checkbox" id="acfPropRequired" ${field.required ? 'checked' : ''}>
                <span>Required?</span>
              </label>
            </div>

            <div class="acf-field-row">
              <label class="acf-field-label">Default Value</label>
              <input type="text" class="acf-input" id="acfPropDefault" value="${this.escapeHtml(field.default_value || '')}">
            </div>
          </div>

          <!-- Type-Specific Dynamic Settings -->
          ${this.renderTypeSpecificSettings(field)}

          <!-- Conditional Logic Builder -->
          ${this.renderConditionalLogicBuilder(field)}

          <!-- Wrapper Attributes -->
          <div class="acf-form-section">
            <h3 class="acf-section-heading">Wrapper Attributes</h3>
            <div class="acf-grid-3">
              <div>
                <label class="acf-field-label">Width (%)</label>
                <input type="text" class="acf-input" id="acfPropWrapWidth" value="${(field.wrapper && field.wrapper.width) || ''}" placeholder="e.g. 50">
              </div>
              <div>
                <label class="acf-field-label">Class</label>
                <input type="text" class="acf-input" id="acfPropWrapClass" value="${(field.wrapper && field.wrapper.class) || ''}">
              </div>
              <div>
                <label class="acf-field-label">ID</label>
                <input type="text" class="acf-input" id="acfPropWrapId" value="${(field.wrapper && field.wrapper.id) || ''}">
              </div>
            </div>
          </div>
        </div>
      `;

      pane.innerHTML = html;
      this.bindEditorInputs(field);
    }

    renderTypeOptions(selectedType) {
      const types = [
        { group: 'Basic', items: ['text', 'textarea', 'number', 'range', 'email', 'url', 'password'] },
        { group: 'Content', items: ['image', 'file', 'gallery', 'wysiwyg', 'oembed'] },
        { group: 'Choice', items: ['select', 'checkbox', 'radio', 'button_group', 'true_false'] },
        { group: 'Relational', items: ['link', 'post_object', 'page_link', 'relationship', 'taxonomy'] },
        { group: 'Advanced', items: ['color_picker', 'date_picker', 'date_time_picker', 'time_picker'] },
        { group: 'Layout', items: ['repeater', 'group', 'flexible_content', 'clone'] }
      ];

      return types.map(grp => `
        <optgroup label="${grp.group}">
          ${grp.items.map(t => `<option value="${t}" ${t === selectedType ? 'selected' : ''}>${t}</option>`).join('')}
        </optgroup>
      `).join('');
    }

    renderTypeSpecificSettings(field) {
      let html = `<div class="acf-form-section"><h3 class="acf-section-heading">${field.type.toUpperCase()} Specific Settings</h3>`;

      switch (field.type) {
        case 'image':
        case 'file':
        case 'gallery':
          html += `
            <div class="acf-field-row">
              <label class="acf-field-label">Return Format</label>
              <select class="acf-input" id="acfSpecificReturnFormat">
                <option value="array" ${field.return_format === 'array' ? 'selected' : ''}>Image Array (Recommended for responsive images)</option>
                <option value="url" ${field.return_format === 'url' ? 'selected' : ''}>Image URL</option>
                <option value="id" ${field.return_format === 'id' ? 'selected' : ''}>Image ID (Best for wp_get_attachment_image)</option>
              </select>
            </div>
            <div class="acf-field-row">
              <label class="acf-field-label">Preview Size</label>
              <select class="acf-input" id="acfSpecificPreviewSize">
                <option value="thumbnail">Thumbnail</option>
                <option value="medium" selected>Medium</option>
                <option value="large">Large</option>
                <option value="full">Full</option>
              </select>
            </div>
          `;
          break;

        case 'select':
        case 'checkbox':
        case 'radio':
        case 'button_group':
          const choicesStr = field.choices ? (typeof field.choices === 'object' ? Object.entries(field.choices).map(([k, v]) => `${k} : ${v}`).join('\n') : String(field.choices)) : 'option_1 : Option 1\noption_2 : Option 2';
          html += `
            <div class="acf-field-row">
              <label class="acf-field-label">Choices (Enter each choice on a new line)</label>
              <textarea class="acf-input font-mono" id="acfSpecificChoices" rows="4">${choicesStr}</textarea>
              <span class="acf-field-help">Format: <code>red : Red</code> or simply <code>Red</code></span>
            </div>
            <div class="acf-field-row acf-row-inline">
              <label class="acf-checkbox-label">
                <input type="checkbox" id="acfSpecificAllowNull" ${field.allow_null ? 'checked' : ''}>
                <span>Allow Null?</span>
              </label>
              <label class="acf-checkbox-label">
                <input type="checkbox" id="acfSpecificMultiple" ${field.multiple ? 'checked' : ''}>
                <span>Select Multiple?</span>
              </label>
            </div>
          `;
          break;

        case 'repeater':
          html += `
            <div class="acf-grid-2">
              <div>
                <label class="acf-field-label">Minimum Rows</label>
                <input type="number" class="acf-input" id="acfSpecificMin" value="${field.min || 0}">
              </div>
              <div>
                <label class="acf-field-label">Maximum Rows</label>
                <input type="number" class="acf-input" id="acfSpecificMax" value="${field.max || 0}">
              </div>
            </div>
            <div class="acf-field-row" style="margin-top: 10px;">
              <label class="acf-field-label">Layout</label>
              <select class="acf-input" id="acfSpecificLayout">
                <option value="table" ${field.layout === 'table' ? 'selected' : ''}>Table</option>
                <option value="block" ${field.layout === 'block' ? 'selected' : ''}>Block</option>
                <option value="row" ${field.layout === 'row' ? 'selected' : ''}>Row</option>
              </select>
            </div>
            <div class="acf-field-row">
              <label class="acf-field-label">Button Label</label>
              <input type="text" class="acf-input" id="acfSpecificButtonLabel" value="${field.button_label || 'Add Row'}">
            </div>
            <div class="acf-subfields-quick-add">
              <button class="acf-btn-sm" id="acfBtnAddSubfield">+ Add Sub Field</button>
            </div>
          `;
          break;

        case 'flexible_content':
          html += `
            <div class="acf-field-row">
              <label class="acf-field-label">Button Label</label>
              <input type="text" class="acf-input" id="acfSpecificFlexButton" value="${field.button_label || 'Add Section'}">
            </div>
            <div class="acf-flex-layouts-manager">
              <div class="flex justify-between items-center mb-2">
                <label class="acf-field-label">Layouts</label>
                <button class="acf-btn-xs" id="acfBtnAddLayout">+ Add Layout Block</button>
              </div>
              <div id="acfFlexLayoutsContainer">
                ${(field.layouts || []).map((layout, lIdx) => `
                  <div class="acf-layout-box">
                    <div class="flex justify-between">
                      <input type="text" class="acf-input-sm font-bold" data-layout-idx="${lIdx}" data-prop="label" value="${layout.label || layout.name}">
                      <input type="text" class="acf-input-sm font-mono text-gray-500" data-layout-idx="${lIdx}" data-prop="name" value="${layout.name}">
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
          break;

        case 'true_false':
          html += `
            <div class="acf-field-row">
              <label class="acf-field-label">Message</label>
              <input type="text" class="acf-input" id="acfSpecificMessage" value="${this.escapeHtml(field.message || '')}" placeholder="Displayed beside checkbox">
            </div>
          `;
          break;

        case 'wysiwyg':
          html += `
            <div class="acf-field-row">
              <label class="acf-field-label">Toolbar</label>
              <select class="acf-input" id="acfSpecificToolbar">
                <option value="full" ${field.toolbar === 'full' ? 'selected' : ''}>Full</option>
                <option value="basic" ${field.toolbar === 'basic' ? 'selected' : ''}>Basic</option>
              </select>
            </div>
            <div class="acf-field-row acf-row-inline">
              <label class="acf-checkbox-label">
                <input type="checkbox" id="acfSpecificMedia" ${field.media_upload !== 0 ? 'checked' : ''}>
                <span>Show Media Upload Buttons?</span>
              </label>
            </div>
          `;
          break;

        default:
          html += `<p class="text-xs text-gray-400">Standard field configuration.</p>`;
          break;
      }

      html += `</div>`;
      return html;
    }

    renderConditionalLogicBuilder(field) {
      const hasLogic = field.conditional_logic && Array.isArray(field.conditional_logic) && field.conditional_logic.length > 0;
      const allFields = this.collectSiblingFields(field.key);

      return `
        <div class="acf-form-section">
          <div class="flex justify-between items-center mb-2">
            <h3 class="acf-section-heading">Conditional Logic</h3>
            <label class="acf-checkbox-label">
              <input type="checkbox" id="acfToggleConditionalLogic" ${hasLogic ? 'checked' : ''}>
              <span>Enable</span>
            </label>
          </div>

          <div id="acfConditionalLogicBody" style="display: ${hasLogic ? 'block' : 'none'};">
            <p class="text-xs text-gray-400 mb-2">Show this field if:</p>
            <div id="acfConditionalRulesList">
              ${(field.conditional_logic || []).map((ruleGroup, gIdx) => `
                <div class="acf-rule-group-card">
                  ${ruleGroup.map((rule, rIdx) => `
                    <div class="acf-cond-rule-row">
                      <select class="acf-input-sm" data-group="${gIdx}" data-rule="${rIdx}" data-param="field">
                        ${allFields.map(f => `<option value="${f.key}" ${f.key === rule.field ? 'selected' : ''}>${f.label} (${f.name})</option>`).join('')}
                      </select>
                      <select class="acf-input-sm" data-group="${gIdx}" data-rule="${rIdx}" data-param="operator">
                        <option value="==" ${rule.operator === '==' ? 'selected' : ''}>is equal to</option>
                        <option value="!=" ${rule.operator === '!=' ? 'selected' : ''}>is not equal to</option>
                      </select>
                      <input type="text" class="acf-input-sm" data-group="${gIdx}" data-rule="${rIdx}" data-param="value" value="${rule.value || '1'}">
                      <button class="acf-btn-xs text-red-500" data-remove-group="${gIdx}" data-remove-rule="${rIdx}">✕</button>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
            <button class="acf-btn-xs mt-2" id="acfBtnAddCondRule">+ Add Rule (AND)</button>
          </div>
        </div>
      `;
    }

    collectSiblingFields(excludeKey) {
      const list = [];
      const scan = (fields) => {
        (fields || []).forEach(f => {
          if (f.key !== excludeKey && f.name) {
            list.push({ key: f.key, name: f.name, label: f.label || f.name });
          }
          if (f.sub_fields) scan(f.sub_fields);
        });
      };
      scan(this.currentArchitecture.fields);
      return list;
    }

    renderGroupSettingsEditor(pane) {
      pane.innerHTML = `
        <div class="acf-editor-header">
          <div class="acf-editor-title-wrap">
            <span class="acf-editor-tag">Field Group</span>
            <h2 class="acf-editor-title">${this.escapeHtml(this.currentArchitecture.title || 'Field Group')}</h2>
          </div>
          <span class="acf-key-pill">${this.currentArchitecture.key || 'group_default'}</span>
        </div>

        <div class="acf-editor-scroll">
          <div class="acf-form-section">
            <h3 class="acf-section-heading">Field Group Settings</h3>
            <div class="acf-field-row">
              <label class="acf-field-label">Group Title</label>
              <input type="text" class="acf-input" id="acfGroupTitle" value="${this.escapeHtml(this.currentArchitecture.title || '')}">
            </div>
            <div class="acf-field-row">
              <label class="acf-field-label">Description</label>
              <textarea class="acf-input" id="acfGroupDescription" rows="2">${this.escapeHtml(this.currentArchitecture.description || '')}</textarea>
            </div>
          </div>

          <!-- Location Rules Builder -->
          <div class="acf-form-section">
            <h3 class="acf-section-heading">Location Rules</h3>
            <p class="text-xs text-gray-400 mb-3">Create rules to determine when and where this field group appears in WordPress.</p>
            
            <div id="acfLocationRulesContainer">
              ${(this.currentArchitecture.location || []).map((group, gIdx) => `
                <div class="acf-rule-group-card">
                  <div class="text-xs font-bold text-gray-400 mb-1">Rule Group ${gIdx + 1}</div>
                  ${group.map((rule, rIdx) => `
                    <div class="acf-loc-rule-row">
                      <select class="acf-input-sm" data-gidx="${gIdx}" data-ridx="${rIdx}" data-prop="param">
                        <option value="post_type" ${rule.param === 'post_type' ? 'selected' : ''}>Post Type</option>
                        <option value="page_template" ${rule.param === 'page_template' ? 'selected' : ''}>Page Template</option>
                        <option value="page_type" ${rule.param === 'page_type' ? 'selected' : ''}>Page Type</option>
                        <option value="options_page" ${rule.param === 'options_page' ? 'selected' : ''}>Options Page</option>
                        <option value="block" ${rule.param === 'block' ? 'selected' : ''}>Block</option>
                        <option value="taxonomy" ${rule.param === 'taxonomy' ? 'selected' : ''}>Taxonomy</option>
                        <option value="current_user_role" ${rule.param === 'current_user_role' ? 'selected' : ''}>User Role</option>
                      </select>
                      <select class="acf-input-sm" data-gidx="${gIdx}" data-ridx="${rIdx}" data-prop="operator">
                        <option value="==" ${rule.operator === '==' ? 'selected' : ''}>is equal to</option>
                        <option value="!=" ${rule.operator === '!=' ? 'selected' : ''}>is not equal to</option>
                      </select>
                      <input type="text" class="acf-input-sm" data-gidx="${gIdx}" data-ridx="${rIdx}" data-prop="value" value="${rule.value || 'page'}">
                      <button class="acf-btn-xs text-red-500" data-remove-loc-g="${gIdx}" data-remove-loc-r="${rIdx}">✕</button>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>

            <button class="acf-btn-sm mt-3" id="acfBtnAddLocationGroup">+ Add Location Rule Group (OR)</button>
          </div>
        </div>
      `;

      // Bind group settings inputs
      const titleInput = document.getElementById('acfGroupTitle');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          this.currentArchitecture.title = e.target.value;
          const topTitle = document.getElementById('acfArchTitleInput');
          if (topTitle) topTitle.value = e.target.value;
          this.recordChange();
          this.updateOutputs();
        });
      }

      const descInput = document.getElementById('acfGroupDescription');
      if (descInput) {
        descInput.addEventListener('input', (e) => {
          this.currentArchitecture.description = e.target.value;
          this.recordChange();
          this.updateOutputs();
        });
      }

      const btnAddLoc = document.getElementById('acfBtnAddLocationGroup');
      if (btnAddLoc) {
        btnAddLoc.addEventListener('click', () => {
          if (!this.currentArchitecture.location) this.currentArchitecture.location = [];
          this.currentArchitecture.location.push([
            { param: 'post_type', operator: '==', value: 'page' }
          ]);
          this.recordChange();
          this.renderFieldEditor();
          this.updateOutputs();
        });
      }

      // Location rules row inputs
      pane.querySelectorAll('.acf-loc-rule-row select, .acf-loc-rule-row input').forEach(el => {
        el.addEventListener('change', (e) => {
          const g = parseInt(e.target.getAttribute('data-gidx'));
          const r = parseInt(e.target.getAttribute('data-ridx'));
          const prop = e.target.getAttribute('data-prop');
          if (this.currentArchitecture.location[g] && this.currentArchitecture.location[g][r]) {
            this.currentArchitecture.location[g][r][prop] = e.target.value;
            this.recordChange();
            this.updateOutputs();
          }
        });
      });

      pane.querySelectorAll('[data-remove-loc-g]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const g = parseInt(btn.getAttribute('data-remove-loc-g'));
          const r = parseInt(btn.getAttribute('data-remove-loc-r'));
          if (this.currentArchitecture.location[g]) {
            this.currentArchitecture.location[g].splice(r, 1);
            if (this.currentArchitecture.location[g].length === 0) {
              this.currentArchitecture.location.splice(g, 1);
            }
            this.recordChange();
            this.renderFieldEditor();
            this.updateOutputs();
          }
        });
      });
    }

    // Bind Field Editor Inputs
    bindEditorInputs(field) {
      const sync = (id, prop, transform = v => v) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', (e) => {
            field[prop] = transform(el.type === 'checkbox' ? el.checked : e.target.value);
            this.renderFieldTree();
            this.recordChange();
            this.updateOutputs();
          });
        }
      };

      sync('acfPropLabel', 'label', v => {
        // Auto-generate name if empty or default
        const nameEl = document.getElementById('acfPropName');
        if (nameEl && (!field.name || field.name.startsWith('field_'))) {
          const auto = v.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
          field.name = auto;
          nameEl.value = auto;
        }
        return v;
      });

      sync('acfPropName', 'name', v => v.toLowerCase().replace(/[^a-z0-9_]+/g, '_'));
      sync('acfPropInstructions', 'instructions');
      sync('acfPropRequired', 'required', v => (v ? 1 : 0));
      sync('acfPropDefault', 'default_value');

      // Type change
      const typeEl = document.getElementById('acfPropType');
      if (typeEl) {
        typeEl.addEventListener('change', (e) => {
          field.type = e.target.value;
          this.renderFieldTree();
          this.renderFieldEditor();
          this.recordChange();
          this.updateOutputs();
        });
      }

      // Specific bindings
      sync('acfSpecificReturnFormat', 'return_format');
      sync('acfSpecificMin', 'min', v => parseInt(v) || 0);
      sync('acfSpecificMax', 'max', v => parseInt(v) || 0);
      sync('acfSpecificLayout', 'layout');
      sync('acfSpecificButtonLabel', 'button_label');
      sync('acfSpecificMessage', 'message');
      sync('acfSpecificToolbar', 'toolbar');
      sync('acfSpecificMedia', 'media_upload', v => (v ? 1 : 0));
      sync('acfSpecificAllowNull', 'allow_null', v => (v ? 1 : 0));
      sync('acfSpecificMultiple', 'multiple', v => (v ? 1 : 0));

      const choicesEl = document.getElementById('acfSpecificChoices');
      if (choicesEl) {
        choicesEl.addEventListener('change', (e) => {
          const lines = e.target.value.split('\n').filter(l => l.trim().length > 0);
          const obj = {};
          lines.forEach(l => {
            const parts = l.split(':');
            const k = parts[0].trim();
            const val = parts[1] ? parts[1].trim() : k;
            obj[k] = val;
          });
          field.choices = obj;
          this.recordChange();
          this.updateOutputs();
        });
      }

      // Sub-field add button for repeater
      const btnAddSubfield = document.getElementById('acfBtnAddSubfield');
      if (btnAddSubfield) {
        btnAddSubfield.addEventListener('click', () => {
          if (!field.sub_fields) field.sub_fields = [];
          const newSub = {
            key: 'field_' + Math.random().toString(36).substring(2, 10),
            name: 'sub_item_' + (field.sub_fields.length + 1),
            label: 'Sub Item ' + (field.sub_fields.length + 1),
            type: 'text'
          };
          field.sub_fields.push(newSub);
          this.renderFieldTree();
          this.recordChange();
          this.updateOutputs();
          this.showToast('Sub-field added to repeater.');
        });
      }

      // Layout add button for flexible content
      const btnAddLayout = document.getElementById('acfBtnAddLayout');
      if (btnAddLayout) {
        btnAddLayout.addEventListener('click', () => {
          if (!field.layouts) field.layouts = [];
          const count = field.layouts.length + 1;
          field.layouts.push({
            key: 'layout_' + Math.random().toString(36).substring(2, 10),
            name: 'section_' + count,
            label: 'Section ' + count,
            display: 'block',
            sub_fields: [
              {
                key: 'field_' + Math.random().toString(36).substring(2, 10),
                name: 'section_title',
                label: 'Section Title',
                type: 'text'
              }
            ]
          });
          this.renderFieldTree();
          this.renderFieldEditor();
          this.recordChange();
          this.updateOutputs();
          this.showToast('Flexible Content layout added.');
        });
      }

      // Conditional Logic Toggle
      const toggleCond = document.getElementById('acfToggleConditionalLogic');
      const bodyCond = document.getElementById('acfConditionalLogicBody');
      if (toggleCond && bodyCond) {
        toggleCond.addEventListener('change', (e) => {
          bodyCond.style.display = e.target.checked ? 'block' : 'none';
          if (e.target.checked) {
            const siblings = this.collectSiblingFields(field.key);
            field.conditional_logic = [
              [
                {
                  field: siblings.length ? siblings[0].key : '',
                  operator: '==',
                  value: '1'
                }
              ]
            ];
          } else {
            field.conditional_logic = 0;
          }
          this.recordChange();
          this.updateOutputs();
        });
      }
    }

    // 8. Add New Field to Architecture
    addNewField(type = 'text') {
      const fieldCount = (this.currentArchitecture.fields || []).length + 1;
      const baseName = type === 'repeater' ? 'items_repeater' : (type === 'group' ? 'content_group' : (type === 'flexible_content' ? 'page_sections' : 'custom_field_' + fieldCount));
      const baseLabel = type === 'repeater' ? 'Items List' : (type === 'group' ? 'Content Block' : (type === 'flexible_content' ? 'Page Sections' : 'Custom Field ' + fieldCount));

      const newField = {
        key: 'field_' + Math.random().toString(36).substring(2, 12),
        name: baseName,
        label: baseLabel,
        type: type,
        instructions: '',
        required: 0
      };

      if (type === 'repeater') {
        newField.sub_fields = [
          {
            key: 'field_' + Math.random().toString(36).substring(2, 12),
            name: 'item_title',
            label: 'Title',
            type: 'text',
            required: 1
          }
        ];
        newField.button_label = 'Add Row';
      } else if (type === 'group') {
        newField.sub_fields = [
          {
            key: 'field_' + Math.random().toString(36).substring(2, 12),
            name: 'title',
            label: 'Title',
            type: 'text'
          }
        ];
      } else if (type === 'flexible_content') {
        newField.layouts = [
          {
            key: 'layout_' + Math.random().toString(36).substring(2, 10),
            name: 'hero_layout',
            label: 'Hero Banner',
            display: 'block',
            sub_fields: [
              {
                key: 'field_' + Math.random().toString(36).substring(2, 12),
                name: 'headline',
                label: 'Headline',
                type: 'text'
              }
            ]
          }
        ];
      }

      this.currentArchitecture.fields.push(newField);
      this.selectedFieldPath = [this.currentArchitecture.fields.length - 1];

      this.recordChange();
      this.refreshAll();
      this.showToast(`Added ${type} field.`);
    }

    // 9. Update Outputs (JSON, PHP, Template, Docs, Diff)
    async updateOutputs() {
      const codeEl = document.getElementById('acfOutputCode');
      const tmplSelect = document.getElementById('acfTemplateModeSelect');
      if (!codeEl) return;

      if (tmplSelect) {
        tmplSelect.style.display = this.activeOutputTab === 'template' ? 'inline-block' : 'none';
      }

      try {
        const res = await fetch('/api/acf-architect/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            architecture: this.currentArchitecture,
            baseArchitecture: this.baseArchitecture,
            templateMode: this.templateMode
          })
        });

        if (res.ok) {
          const data = await res.json();
          this.cachedOutputs = data.outputs;
          this.cachedDiff = data.diff;
          this.cachedValidation = data.validation;

          this.renderActiveOutput();
          this.renderValidationPill(data.validation);
        }
      } catch (err) {
        console.warn('[acf-architect] compile notice:', err);
      }
    }

    renderActiveOutput() {
      const codeEl = document.getElementById('acfOutputCode');
      if (!codeEl || !this.cachedOutputs) return;

      switch (this.activeOutputTab) {
        case 'json':
          codeEl.className = 'language-json';
          codeEl.textContent = this.cachedOutputs.acfJson;
          break;
        case 'php':
          codeEl.className = 'language-php';
          codeEl.textContent = this.cachedOutputs.phpRegistration;
          break;
        case 'template':
          codeEl.className = 'language-php';
          codeEl.textContent = this.cachedOutputs.phpTemplate;
          break;
        case 'docs':
          codeEl.className = 'language-markdown';
          codeEl.textContent = this.cachedOutputs.docs;
          break;
        case 'diff':
          codeEl.className = 'language-text';
          codeEl.textContent = this.formatDiffText(this.cachedDiff);
          break;
      }
    }

    formatDiffText(diff) {
      if (!diff) return 'No diff available.';
      let out = `=== ARCHITECTURE DIFF SUMMARY ===\n`;
      out += `Added: ${diff.summary.addedCount} | Modified: ${diff.summary.modifiedCount} | Deleted: ${diff.summary.deletedCount}\n\n`;

      if (diff.added.length) {
        out += `+ ADDED FIELDS (${diff.added.length}):\n`;
        diff.added.forEach(a => out += `  + ${a.label} (${a.name} [${a.type}])\n`);
        out += `\n`;
      }
      if (diff.modified.length) {
        out += `~ MODIFIED FIELDS (${diff.modified.length}):\n`;
        diff.modified.forEach(m => {
          out += `  ~ ${m.label} (${m.name}):\n`;
          m.changes.forEach(c => out += `      ${c}\n`);
        });
        out += `\n`;
      }
      if (diff.deleted.length) {
        out += `- DELETED FIELDS (${diff.deleted.length}):\n`;
        diff.deleted.forEach(d => out += `  - ${d.label} (${d.name})\n`);
        out += `\n`;
      }

      if (diff.summary.addedCount === 0 && diff.summary.modifiedCount === 0 && diff.summary.deletedCount === 0) {
        out += `No modifications detected against base version.\n`;
      }
      return out;
    }

    renderValidationPill(validation) {
      const pill = document.getElementById('acfValidationPill');
      if (!pill || !validation) return;

      if (validation.isValid) {
        pill.className = 'acf-pill acf-pill-valid';
        pill.textContent = `✓ Valid (${validation.summary.fieldCount} fields)`;
      } else {
        pill.className = 'acf-pill acf-pill-error';
        pill.textContent = `✕ ${validation.summary.totalErrors} error(s)`;
      }
    }

    // 10. AI Commands & Structured Patching
    async submitAiCommand() {
      const input = document.getElementById('acfCommandInput');
      if (!input || !input.value.trim()) return;

      const cmdText = input.value.trim();
      input.value = '';

      this.showToast('AI Architect analyzing command...');

      try {
        const res = await fetch('/api/acf-architect/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            architecture: this.currentArchitecture,
            command: cmdText
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.requiresConfirmation) {
            this.showConfirmModal(
              'Confirm Destructive AI Operation',
              `AI proposes to: ${data.explanation}\nAffected fields: ${data.affectedFields.join(', ')}`,
              () => {
                this.applyAiResult(data);
              }
            );
          } else {
            this.applyAiResult(data);
          }
        } else {
          this.showToast('AI command failed. Please try a different instruction.');
        }
      } catch (err) {
        this.showToast('Network error processing AI command.');
      }
    }

    applyAiResult(data) {
      this.currentArchitecture = data.architecture;
      this.recordChange();
      this.refreshAll();
      this.showToast(data.explanation || 'Applied AI architecture modifications.');
    }

    // 11. Undo / Redo System
    recordChange() {
      this.unsavedChanges++;
      this.historyStack.push(JSON.parse(JSON.stringify(this.currentArchitecture)));
      if (this.historyStack.length > 50) this.historyStack.shift();
      this.redoStack = [];
      this.updateUnsavedIndicator();
    }

    undo() {
      if (this.historyStack.length > 1) {
        const current = this.historyStack.pop();
        this.redoStack.push(current);
        this.currentArchitecture = JSON.parse(JSON.stringify(this.historyStack[this.historyStack.length - 1]));
        this.refreshAll();
        this.showToast('Undo.');
      }
    }

    redo() {
      if (this.redoStack.length > 0) {
        const next = this.redoStack.pop();
        this.historyStack.push(next);
        this.currentArchitecture = JSON.parse(JSON.stringify(next));
        this.refreshAll();
        this.showToast('Redo.');
      }
    }

    updateUnsavedIndicator() {
      const badge = document.getElementById('acfUnsavedBadge');
      const text = document.getElementById('acfUnsavedText');
      if (badge && text) {
        if (this.unsavedChanges > 0) {
          badge.style.display = 'inline-flex';
          text.textContent = `${this.unsavedChanges} unsaved change${this.unsavedChanges > 1 ? 's' : ''}`;
        } else {
          badge.style.display = 'none';
        }
      }
    }

    refreshAll() {
      this.renderFieldTree();
      this.renderFieldEditor();
      this.updateOutputs();
      this.updateUnsavedIndicator();
    }

    // 12. Modals (Start, Import, Project Inspect, Apply)
    openStartModal() {
      const container = document.getElementById('acfModalContainer');
      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfStartModal">
          <div class="acf-modal">
            <div class="acf-modal-header">
              <h3>Start WordPress Architecture</h3>
              <button class="acf-modal-close" id="acfModalCloseBtn">✕</button>
            </div>
            <div class="acf-modal-body">
              <div class="acf-start-grid">
                <div class="acf-start-card" id="acfCardAiDesc">
                  <div class="acf-start-icon">✨</div>
                  <h4>Describe with AI</h4>
                  <p>Describe your pages, cards, and sections. AI proposes clean nested fields.</p>
                </div>
                <div class="acf-start-card" id="acfCardImportJson">
                  <div class="acf-start-icon">📥</div>
                  <h4>Import ACF JSON</h4>
                  <p>Load an existing <code>acf-json/*.json</code> file to inspect, edit, or extend.</p>
                </div>
                <div class="acf-start-card" id="acfCardInspectProject">
                  <div class="acf-start-icon">🔍</div>
                  <h4>Inspect Project</h4>
                  <p>Scan your theme files, existing templates, and field references.</p>
                </div>
                <div class="acf-start-card" id="acfCardBlank">
                  <div class="acf-start-icon">🛠</div>
                  <h4>Create Manually</h4>
                  <p>Start from scratch with a clean slate and full developer control.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfModalCloseBtn').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfCardBlank').addEventListener('click', () => {
        container.innerHTML = '';
        this.createDefaultArchitecture();
      });
      document.getElementById('acfCardImportJson').addEventListener('click', () => {
        container.innerHTML = '';
        this.openImportModal();
      });
      document.getElementById('acfCardInspectProject').addEventListener('click', () => {
        container.innerHTML = '';
        this.inspectActiveProject();
      });
      document.getElementById('acfCardAiDesc').addEventListener('click', () => {
        container.innerHTML = '';
        this.promptAiDescription();
      });
    }

    promptAiDescription() {
      const container = document.getElementById('acfModalContainer');
      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfAiPromptModal">
          <div class="acf-modal" style="max-width: 540px;">
            <div class="acf-modal-header">
              <h3>Describe with AI</h3>
              <button class="acf-modal-close" id="acfPromptModalCloseBtn">✕</button>
            </div>
            <div class="acf-modal-body">
              <p class="text-xs text-gray-400 mb-2">Describe the WordPress page, post type, or theme section you want to architect:</p>
              <textarea class="acf-input mb-3" id="acfAiPromptInput" rows="4" placeholder="e.g. Case Study with client name, hero banner image, project metrics repeater, and flexible testimonials layout">Case Study with client name, hero banner image, project metrics repeater, and flexible testimonials layout</textarea>
              <div class="flex justify-end gap-2">
                <button class="acf-btn" id="acfBtnCancelPrompt">Cancel</button>
                <button class="acf-btn acf-btn-primary" id="acfBtnSubmitAiPrompt">Architect Schema</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfPromptModalCloseBtn').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnCancelPrompt').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnSubmitAiPrompt').addEventListener('click', async () => {
        const text = document.getElementById('acfAiPromptInput').value.trim();
        if (text) {
          container.innerHTML = '';
          await this.generateFromDescription(text);
        }
      });
    }

    async generateFromDescription(prompt) {
      this.showToast('Generating content architecture with AI...');
      try {
        const res = await fetch('/api/acf-architect/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        if (res.ok) {
          const data = await res.json();
          this.currentArchitecture = data.architecture;
          this.baseArchitecture = JSON.parse(JSON.stringify(data.architecture));
          this.selectedFieldPath = [0];
          this.recordChange();
          this.refreshAll();
          this.showToast(data.explanation || 'Architecture generated successfully.');
        }
      } catch (e) {
        this.showToast('Generation failed.');
      }
    }

    openImportModal() {
      const container = document.getElementById('acfModalContainer');
      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfImportModal">
          <div class="acf-modal">
            <div class="acf-modal-header">
              <h3>Import Native ACF JSON</h3>
              <button class="acf-modal-close" id="acfModalCloseBtn">✕</button>
            </div>
            <div class="acf-modal-body">
              <p class="text-xs text-gray-400 mb-2">Paste raw ACF JSON or select a JSON file from your <code>acf-json/</code> directory:</p>
              <textarea class="acf-input font-mono mb-3" id="acfImportJsonText" rows="10" placeholder='{ "key": "group_...", "title": "...", "fields": [...] }'></textarea>
              <div class="flex justify-between items-center">
                <input type="file" id="acfImportFileInput" accept=".json" class="text-xs">
                <button class="acf-btn acf-btn-primary" id="acfBtnExecuteImport">Parse & Load Architecture</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfModalCloseBtn').addEventListener('click', () => container.innerHTML = '');
      
      const fileInput = document.getElementById('acfImportFileInput');
      const textArea = document.getElementById('acfImportJsonText');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => textArea.value = re.target.result;
            reader.readAsText(file);
          }
        });
      }

      document.getElementById('acfBtnExecuteImport').addEventListener('click', async () => {
        const jsonContent = textArea.value.trim();
        if (!jsonContent) return;

        try {
          const res = await fetch('/api/acf-architect/parse-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonContent })
          });
          if (res.ok) {
            const data = await res.json();
            this.currentArchitecture = data.architecture;
            this.baseArchitecture = JSON.parse(JSON.stringify(data.architecture));
            this.selectedFieldPath = [0];
            container.innerHTML = '';
            this.recordChange();
            this.refreshAll();
            this.showToast(data.message || 'Import successful.');
          } else {
            const err = await res.json();
            this.showToast(err.error || 'Import failed.');
          }
        } catch (e) {
          this.showToast('Import request error.');
        }
      });
    }

    inspectActiveProject() {
      this.openInspectModal();
    }

    openInspectModal() {
      const container = document.getElementById('acfModalContainer');
      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfInspectModal">
          <div class="acf-modal" style="max-width: 650px;">
            <div class="acf-modal-header">
              <h3>Inspect WordPress Theme & ACF Schema</h3>
              <button class="acf-modal-close" id="acfBtnCloseInspectModal">✕</button>
            </div>
            <div class="acf-modal-body">
              <p class="text-xs text-gray-400 mb-3">Scan theme files for <code>acf-json/</code> directories, template calls (<code>get_field</code>, <code>have_rows</code>), and naming conventions:</p>
              
              <div class="flex gap-2 mb-4">
                <input type="text" class="acf-input font-mono text-xs flex-1" id="acfInspectPathInput" value="./" placeholder="Project or theme path (e.g. ./ or wp-content/themes/my-theme)">
                <button class="acf-btn acf-btn-primary" id="acfBtnRunInspect">Run Scan</button>
              </div>

              <div id="acfInspectResults" style="display: none;"></div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfBtnCloseInspectModal').addEventListener('click', () => container.innerHTML = '');

      const runBtn = document.getElementById('acfBtnRunInspect');
      runBtn.addEventListener('click', async () => {
        const pPath = document.getElementById('acfInspectPathInput').value.trim();
        runBtn.disabled = true;
        runBtn.textContent = 'Scanning...';
        try {
          const res = await fetch('/api/acf-architect/inspect-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectPath: pPath })
          });
          const data = await res.json();
          this.renderInspectResults(data);
        } catch (e) {
          this.showToast('Inspection failed');
        } finally {
          runBtn.disabled = false;
          runBtn.textContent = 'Run Scan';
        }
      });
    }

    renderInspectResults(data) {
      const resultsDiv = document.getElementById('acfInspectResults');
      if (!resultsDiv) return;
      resultsDiv.style.display = 'block';

      const ins = data.insights || {};
      resultsDiv.innerHTML = `
        <div class="acf-grid-3 mb-4">
          <div class="acf-stat-card"><div class="acf-stat-label">Framework</div><div class="acf-stat-val">${ins.framework || 'WordPress'}</div></div>
          <div class="acf-stat-card"><div class="acf-stat-label">Active Theme</div><div class="acf-stat-val">${ins.theme || 'Default Theme'}</div></div>
          <div class="acf-stat-card"><div class="acf-stat-label">ACF Integration</div><div class="acf-stat-val">${ins.acf || 'ACF Pro / Free'}</div></div>
          <div class="acf-stat-card"><div class="acf-stat-label">Field Groups</div><div class="acf-stat-val">${ins.fieldGroupsCount || 0}</div></div>
          <div class="acf-stat-card"><div class="acf-stat-label">PHP Templates</div><div class="acf-stat-val">${ins.templatesCount || 0}</div></div>
          <div class="acf-stat-card"><div class="acf-stat-label">Naming Style</div><div class="acf-stat-val">${ins.namingConvention || 'snake_case'}</div></div>
        </div>

        <h4 class="font-bold text-xs mb-2">Code ↔ Field References Detected</h4>
        <div class="acf-code-mapping-list">
          ${Object.keys(data.codeFieldMapping || {}).length ? Object.entries(data.codeFieldMapping).map(([fName, refs]) => `
            <div class="acf-mapping-item">
              <span class="font-mono text-blue-400 font-bold">${fName}</span>
              <span class="text-xs text-gray-400">${refs.length} reference(s): ${refs.map(r => `${r.file}:${r.line}`).join(', ')}</span>
            </div>
          `).join('') : '<p class="text-xs text-gray-500">No template get_field calls detected in active theme.</p>'}
        </div>
      `;
    }

    openApplyModal() {
      const container = document.getElementById('acfModalContainer');
      const title = this.currentArchitecture.title || 'custom_fields';
      const cleanSlug = title.toLowerCase().replace(/[^a-z0-9_]+/g, '_');

      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfApplyModal">
          <div class="acf-modal" style="max-width: 600px;">
            <div class="acf-modal-header">
              <h3>Apply Architecture to Project</h3>
              <button class="acf-modal-close" id="acfBtnCloseApplyModal">✕</button>
            </div>
            <div class="acf-modal-body">
              <p class="text-xs text-gray-400 mb-3">This operation will write real production files into your active WordPress project directory. Review the target paths below:</p>
              
              <div class="acf-apply-file-list mb-3">
                <label class="acf-apply-file-item">
                  <input type="checkbox" id="acfCheckWriteJson" checked>
                  <div class="ml-2">
                    <span class="font-mono text-sm font-bold" id="acfApplyJsonPath">acf-json/group_${cleanSlug}.json</span>
                    <p class="text-xs text-gray-400">Native ACF JSON sync file for automatic field group synchronization.</p>
                  </div>
                </label>
                <label class="acf-apply-file-item">
                  <input type="checkbox" id="acfCheckWriteTemplate" checked>
                  <div class="ml-2">
                    <span class="font-mono text-sm font-bold" id="acfApplyTemplatePath">template-parts/content-${cleanSlug}.php</span>
                    <p class="text-xs text-gray-400">Semantic WordPress template with proper esc_html and have_rows logic.</p>
                  </div>
                </label>
              </div>

              <div class="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-gray-300 mb-3" id="acfApplyDryRunDiff">
                <span class="text-emerald-400">+ Ready to write:</span> acf-json/group_${cleanSlug}.json & template-parts/content-${cleanSlug}.php
              </div>

              <div class="flex justify-between items-center mt-4">
                <label class="acf-checkbox-label">
                  <input type="checkbox" id="acfApplyConfirmCheckbox" checked>
                  <span class="text-xs">Overwrite if file already exists</span>
                </label>
                <button class="acf-btn acf-btn-primary" id="acfBtnConfirmApply">Confirm & Apply Files</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfBtnCloseApplyModal').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnConfirmApply').addEventListener('click', async () => {
        const writeJson = document.getElementById('acfCheckWriteJson').checked;
        const writeTemplate = document.getElementById('acfCheckWriteTemplate').checked;
        const confirmOverwrite = document.getElementById('acfApplyConfirmCheckbox').checked;

        this.showToast('Writing architecture files to project...');
        try {
          const res = await fetch('/api/acf-architect/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              architecture: this.currentArchitecture,
              writeJson,
              writeTemplate,
              confirmOverwrite
            })
          });

          const data = await res.json();
          if (data.success) {
            container.innerHTML = '';
            this.unsavedChanges = 0;
            this.updateUnsavedIndicator();
            this.showToast(data.message || 'Architecture applied to project!');
          } else {
            this.showToast(data.warning || 'Application failed.');
          }
        } catch (e) {
          this.showToast('Error applying files to project.');
        }
      });
    }

    showConfirmModal(title, message, onConfirm) {
      const container = document.getElementById('acfModalContainer');
      container.innerHTML = `
        <div class="acf-modal-backdrop">
          <div class="acf-modal" style="max-width: 450px;">
            <div class="acf-modal-header">
              <h3 class="text-red-500">${this.escapeHtml(title)}</h3>
              <button class="acf-modal-close" id="acfModalCloseBtn">✕</button>
            </div>
            <div class="acf-modal-body">
              <p class="text-sm mb-4">${this.escapeHtml(message)}</p>
              <div class="flex justify-end gap-2">
                <button class="acf-btn" id="acfBtnCancelConfirm">Cancel</button>
                <button class="acf-btn acf-btn-danger" id="acfBtnDoConfirm">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfModalCloseBtn').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnCancelConfirm').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnDoConfirm').addEventListener('click', () => {
        container.innerHTML = '';
        if (onConfirm) onConfirm();
      });
    }

    // 13. Export & Download Utilities
    copyCurrentOutput() {
      const codeEl = document.getElementById('acfOutputCode');
      if (codeEl && navigator.clipboard) {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          this.showToast('Code copied to clipboard!');
        });
      }
    }

    downloadCurrentOutput() {
      this.downloadSpecific(this.activeOutputTab);
    }

    downloadSpecific(tab) {
      let content = '';
      let filename = 'acf_export.txt';
      let mime = 'text/plain';

      const slug = (this.currentArchitecture.title || 'acf_fields').toLowerCase().replace(/[^a-z0-9_]+/g, '_');

      switch (tab) {
        case 'json':
          content = document.getElementById('acfOutputCode').textContent;
          filename = `group_${slug}.json`;
          mime = 'application/json';
          break;
        case 'php':
          content = document.getElementById('acfOutputCode').textContent;
          filename = `acf-register-${slug}.php`;
          mime = 'application/x-php';
          break;
        case 'template':
          content = document.getElementById('acfOutputCode').textContent;
          filename = `content-${slug}.php`;
          mime = 'application/x-php';
          break;
        case 'docs':
          content = document.getElementById('acfOutputCode').textContent;
          filename = `ACF_${slug}_DOCS.md`;
          mime = 'text/markdown';
          break;
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast(`Downloaded ${filename}`);
    }

    // 14. Validation Engine UI
    runValidation() {
      const val = this.cachedValidation || { isValid: true, issues: [], summary: { fieldCount: (this.currentArchitecture.fields || []).length, score: 100 } };
      const score = val.isValid ? 100 : Math.max(0, 100 - (val.issues.length * 15));
      const container = document.getElementById('acfModalContainer');

      const checks = [
        {
          name: 'Layer 1: Schema Structure Check',
          desc: 'Unique field names, keys, parent scoping and hierarchy integrity.',
          status: val.issues.filter(i => i.category === 'naming' || i.category === 'duplicate').length === 0
        },
        {
          name: 'Layer 2: ACF Rule Compliance',
          desc: 'Supported field types, return format integrity, subfield configurations.',
          status: val.issues.filter(i => i.category === 'rules' || i.category === 'type').length === 0
        },
        {
          name: 'Layer 3: Native JSON & PHP Syntax Check',
          desc: 'Native acf-json sync spec compliance and PHP array validity.',
          status: val.issues.filter(i => i.category === 'syntax').length === 0
        },
        {
          name: 'Layer 4: WordPress Escaping & Template Refs',
          desc: 'have_rows, the_row, and safe esc_html/esc_url/wp_kses_post sanitization.',
          status: val.issues.filter(i => i.category === 'template').length === 0
        }
      ];

      container.innerHTML = `
        <div class="acf-modal-backdrop" id="acfValidationModal">
          <div class="acf-modal" style="max-width: 600px;">
            <div class="acf-modal-header">
              <h3>Architecture Quality & Validation Suite</h3>
              <button class="acf-modal-close" id="acfBtnCloseValidationModal">✕</button>
            </div>
            <div class="acf-modal-body">
              <div class="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800 mb-4">
                <div>
                  <div class="text-xs text-gray-400 font-mono">ARCHITECTURE HEALTH SCORE</div>
                  <div class="text-xl font-bold ${score >= 90 ? 'text-emerald-400' : 'text-amber-400'}" id="acfValidationScore">${score}/100 Score</div>
                </div>
                <div class="text-right">
                  <span class="acf-pill ${val.isValid ? 'acf-pill-valid' : 'acf-pill-warning'}">
                    ${val.isValid ? '✓ Production Ready' : '⚠ Issues Detected'}
                  </span>
                </div>
              </div>

              <div class="acf-validation-checks-list mb-4">
                ${checks.map(c => `
                  <div class="acf-validation-check-item flex items-start gap-2 p-2 border-b border-zinc-800/50">
                    <span class="${c.status ? 'text-emerald-400' : 'text-amber-400'} font-bold">${c.status ? '✓' : '⚠'}</span>
                    <div>
                      <div class="font-bold text-xs">${c.name}</div>
                      <div class="text-xs text-gray-400">${c.desc}</div>
                    </div>
                  </div>
                `).join('')}
              </div>

              ${val.issues && val.issues.length ? `
                <div class="acf-validation-issues-box">
                  <h4 class="text-xs font-bold text-amber-400 mb-2">Detected Issues:</h4>
                  <ul class="text-xs text-gray-300 list-disc pl-4 space-y-1">
                    ${val.issues.map(i => `<li><strong>[${i.category}]</strong> ${this.escapeHtml(i.message)}</li>`).join('')}
                  </ul>
                </div>
              ` : `
                <div class="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded text-xs text-emerald-300">
                  ✓ All fields, sub-fields, layouts, and location rules comply with native ACF specifications.
                </div>
              `}

              <div class="flex justify-end mt-4">
                <button class="acf-btn acf-btn-primary" id="acfBtnDismissValidation">Done</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('acfBtnCloseValidationModal').addEventListener('click', () => container.innerHTML = '');
      document.getElementById('acfBtnDismissValidation').addEventListener('click', () => container.innerHTML = '');
    }

    filterFieldTree(query) {
      const q = (query || '').toLowerCase().trim();
      document.querySelectorAll('.acf-node-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = (!q || text.includes(q)) ? 'block' : 'none';
      });
    }

    showToast(msg) {
      if (window.showToast) {
        window.showToast(msg);
      } else {
        console.log('[ACF Architect]', msg);
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m]));
    }
  }

  function sanitize(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  }

  window.AcfArchitectTool = AcfArchitectTool;

  // Auto-instantiate if container is visible on page load
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('viewAcfArchitect')) {
      window.acfArchitectInstance = new AcfArchitectTool('viewAcfArchitect');
    }
  });
})();
