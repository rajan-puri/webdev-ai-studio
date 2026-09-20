/**
 * client/js/tools/schema-generator.js
 * Production-Grade Schema / Structured Data Workspace Controller
 * Workflow: DISCOVER -> UNDERSTAND -> GENERATE -> VALIDATE -> IMPLEMENT -> EXPORT
 */

(function () {
  'use strict';

  class SchemaGeneratorTool {
    constructor(containerId = 'viewSchemaGenerator') {
      this.container = document.getElementById(containerId);
      this.catalog = null;
      this.currentType = 'LocalBusiness';
      this.currentFacts = {};
      this.fieldSources = {}; // fieldName -> 'extracted' | 'manual'
      this.analyzedPageData = null;
      this.existingSchemas = null;
      this.currentJsonLd = null;
      this.currentValidation = null;
      this.activeCodeView = 'jsonld'; // 'jsonld' | 'script' | 'wordpress' | 'react'
      this.activeSourceTab = 'url'; // 'url' | 'html' | 'manual'
      this.activeCategoryFilter = 'ALL';
      this.typeSearchQuery = '';
      this.savedSchemas = [];
      this.isGenerating = false;
      this.debounceTimer = null;

      this.init();
    }

    async init() {
      if (!this.container) return;
      this.renderWorkspace();
      this.bindEvents();
      await this.loadCatalog();
      await this.loadSavedSchemas();
      this.syncFormToType(this.currentType);
      await this.generateSchema();
    }

    async loadCatalog() {
      try {
        const res = await fetch('/api/schema/catalog');
        const data = await res.json();
        if (data.success && data.catalog) {
          this.catalog = data.catalog;
          this.renderTypeGrid();
        }
      } catch (err) {
        console.error('[SchemaGenerator] Failed to fetch catalog:', err);
      }
    }

    async loadSavedSchemas() {
      try {
        const res = await fetch('/api/schema/history');
        const data = await res.json();
        if (data.success && Array.isArray(data.schemas)) {
          this.savedSchemas = data.schemas;
          this.updateSavedBadge();
          this.renderSavedList();
        }
      } catch (err) {
        console.error('[SchemaGenerator] Failed to fetch saved schemas:', err);
      }
    }

    updateSavedBadge() {
      const badge = this.container.querySelector('#schemaSavedCountBadge');
      if (badge) {
        badge.textContent = this.savedSchemas.length;
      }
    }

    renderWorkspace() {
      this.container.innerHTML = `
        <!-- Workspace Header -->
        <div class="schema-page-header">
          <div class="schema-header-title-wrap">
            <h1 class="schema-page-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              Schema / Structured Data Workspace
            </h1>
            <p class="schema-page-subtitle">
              Discover existing markups, model Schema.org specifications, strictly validate syntax, and export production JSON-LD.
            </p>
          </div>
          <div class="schema-header-actions">
            <button class="schema-btn-secondary" id="schemaBtnOpenLibrary" title="Open Saved Schemas Library">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Saved Schemas (<span id="schemaSavedCountBadge">0</span>)
            </button>
            <button class="schema-btn-secondary" id="schemaBtnReset" title="Start New Schema">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Reset
            </button>
            <button class="schema-btn-primary" id="schemaBtnSave" title="Save Schema to Workspace">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Schema
            </button>
          </div>
        </div>

        <!-- Workflow Stepper Bar -->
        <div class="schema-stepper-bar">
          <button class="schema-step-btn active" data-step-target="stepDiscover">
            <span class="schema-step-num">01</span> DISCOVER
          </button>
          <span class="schema-step-divider">→</span>
          <button class="schema-step-btn" data-step-target="stepUnderstand">
            <span class="schema-step-num">02</span> SCHEMA TYPE
          </button>
          <span class="schema-step-divider">→</span>
          <button class="schema-step-btn" data-step-target="stepGenerate">
            <span class="schema-step-num">03</span> PROPERTY EDITOR
          </button>
          <span class="schema-step-divider">→</span>
          <button class="schema-step-btn" data-step-target="stepValidate">
            <span class="schema-step-num">04</span> VALIDATE & CODE
          </button>
          <span class="schema-step-divider">→</span>
          <button class="schema-step-btn" data-step-target="stepExport">
            <span class="schema-step-num">05</span> IMPLEMENT & EXPORT
          </button>
        </div>

        <!-- Grid Content -->
        <div class="schema-content-grid">
          <!-- Step 1: DISCOVER -->
          <div class="schema-panel-card" id="stepDiscover">
            <div class="schema-card-header">
              <div>
                <h3 class="schema-card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  01. Source Discovery & Extraction
                </h3>
                <p class="schema-card-desc">Extract facts from a live web page or paste raw HTML to detect existing markups and pre-populate properties.</p>
              </div>
            </div>

            <!-- Source Mode Tabs -->
            <div class="schema-source-tabs">
              <button class="schema-source-tab active" data-source-tab="url">Analyze Live URL</button>
              <button class="schema-source-tab" data-source-tab="html">Paste HTML / JSON-LD</button>
              <button class="schema-source-tab" data-source-tab="manual">Enter Manually</button>
            </div>

            <!-- Live URL Mode -->
            <div id="schemaSourceModeUrl" class="schema-source-pane">
              <div class="schema-url-input-wrap">
                <input type="url" class="schema-url-input" id="schemaUrlInput" placeholder="https://example.com/page or http://localhost:3000..." value="">
                <button class="schema-btn-primary" id="schemaBtnAnalyzeUrl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Analyze URL
                </button>
              </div>
              <p class="schema-field-hint" style="margin-top: 6px;">Protected against SSRF. Fetches HTML, canonical tags, Open Graph, and existing JSON-LD.</p>
            </div>

            <!-- Paste HTML Mode -->
            <div id="schemaSourceModeHtml" class="schema-source-pane" style="display: none;">
              <textarea class="schema-textarea" id="schemaHtmlInput" rows="5" placeholder="Paste your <html> source code or <script type='application/ld+json'> markup here..."></textarea>
              <div style="margin-top: 8px;">
                <button class="schema-btn-primary" id="schemaBtnAnalyzeHtml">Extract From HTML</button>
              </div>
            </div>

            <!-- Enter Manually Mode -->
            <div id="schemaSourceModeManual" class="schema-source-pane" style="display: none;">
              <p class="schema-field-hint">Manual mode active. Proceed to select a schema type and fill fields directly.</p>
            </div>

            <!-- Extracted Page Summary Box (Hidden until analyzed) -->
            <div id="schemaPageSummaryBox" style="display: none;" class="schema-page-facts-summary">
              <!-- Dynamically filled -->
            </div>

            <!-- Detected Existing Schemas Box (Hidden until analyzed) -->
            <div id="schemaDetectedBox" style="display: none;" class="schema-detected-container">
              <!-- Dynamically filled -->
            </div>

            <!-- Duplicate Warning (Hidden until applicable) -->
            <div id="schemaDuplicateAlert" style="display: none;" class="schema-duplicate-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <div id="schemaDuplicateText">
                Notice: Existing structured data of this type was detected on this page. Creating duplicate blocks can trigger search engine ambiguity.
              </div>
            </div>
          </div>

          <!-- Step 2: UNDERSTAND (Schema Type Selector) -->
          <div class="schema-panel-card" id="stepUnderstand">
            <div class="schema-card-header">
              <div>
                <h3 class="schema-card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  02. Schema.org Type Selection & Specifications
                </h3>
                <p class="schema-card-desc">Select the Schema.org entity. Each type includes technical guidelines, required properties, and Google Rich Results documentation.</p>
              </div>
            </div>

            <div class="schema-type-toolbar">
              <input type="text" class="schema-type-search" id="schemaTypeSearch" placeholder="Filter schemas (e.g. LocalBusiness, Product, FAQ, Article)...">
              <div class="schema-category-filters">
                <button class="schema-cat-filter-btn active" data-cat="ALL">All</button>
                <button class="schema-cat-filter-btn" data-cat="Business & Organization">Business</button>
                <button class="schema-cat-filter-btn" data-cat="Commerce & Products">Commerce</button>
                <button class="schema-cat-filter-btn" data-cat="Editorial & Content">Content</button>
                <button class="schema-cat-filter-btn" data-cat="Structure & Navigation">Navigation</button>
                <button class="schema-cat-filter-btn" data-cat="Events & Experiences">Events</button>
                <button class="schema-cat-filter-btn" data-cat="Career & Employment">Career</button>
              </div>
            </div>

            <div class="schema-type-grid" id="schemaTypeGrid">
              <!-- Dynamically populated from catalog -->
            </div>
          </div>

          <!-- Step 3, 4, 5: GENERATE, VALIDATE, EXPORT (Split Screen) -->
          <div class="schema-editor-split" id="stepGenerate">
            <!-- Left Pane: Property Form -->
            <div class="schema-panel-card schema-form-pane">
              <div class="schema-card-header">
                <div>
                  <h3 class="schema-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    03. Property Builder: <span id="schemaActiveTypeTitle" style="color:#2563eb;">LocalBusiness</span>
                  </h3>
                  <p class="schema-card-desc">Enter attributes for your Schema.org entity. Properties extracted from source are tagged.</p>
                </div>
                <div>
                  <button class="schema-btn-secondary" id="schemaBtnAddCustomProp" style="font-size: 11px; padding: 4px 8px;">
                    + Custom Property
                  </button>
                </div>
              </div>

              <div id="schemaFormContainer">
                <!-- Form rendered dynamically based on selected schema type -->
              </div>
            </div>

            <!-- Right Pane: Code Editor & Multi-Layer Validation -->
            <div class="schema-panel-card schema-code-pane" id="stepValidate">
              <div class="schema-card-header">
                <div>
                  <h3 class="schema-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    04 & 05. Live Code & Validation
                  </h3>
                  <p class="schema-card-desc">Deterministic JSON-LD generation with multi-layer Schema.org validation and export formats.</p>
                </div>
              </div>

              <!-- Code Box -->
              <div class="schema-code-box">
                <div class="schema-code-topbar">
                  <div class="schema-code-tabs">
                    <button class="schema-code-tab active" data-code-view="jsonld">JSON-LD</button>
                    <button class="schema-code-tab" data-code-view="script">&lt;script&gt; Tag</button>
                    <button class="schema-code-tab" data-code-view="wordpress">WordPress (PHP)</button>
                    <button class="schema-code-tab" data-code-view="react">React / Next.js</button>
                  </div>
                  <div class="schema-code-actions">
                    <button class="schema-code-btn" id="schemaBtnCopyCode" title="Copy code to clipboard">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copy
                    </button>
                    <button class="schema-code-btn" id="schemaBtnDownloadJson" title="Download JSON file">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      .json
                    </button>
                  </div>
                </div>

                <pre class="schema-code-editor" id="schemaCodeEditorDisplay"><code>// Loading schema model...</code></pre>
              </div>

              <!-- Multi-Layer Validation Panel -->
              <div class="schema-validation-panel" id="schemaValidationPanel">
                <div class="schema-validation-status-header">
                  <span style="font-size: 13px; font-weight: 700;" id="schemaValMainStatus">Evaluating Conformance...</span>
                  <span class="schema-badge schema-badge-info" id="schemaValStatsBadge">0 / 0 Props</span>
                </div>

                <div class="schema-validation-layers" id="schemaValLayersList">
                  <!-- Dynamic validation items -->
                </div>

                <!-- Google Disclaimer Box -->
                <div class="schema-google-disclaimer" id="schemaGoogleDisclaimerBox">
                  <strong>Google Rich Results Eligibility Note:</strong>
                  <div style="margin-top: 3px;">
                    Google algorithms dynamically decide rich snippet presentation based on overall site quality, query intent, and policy adherence. Meeting Schema.org technical specifications is required, but rich snippet display is never guaranteed.
                  </div>
                </div>

                <!-- External Test Links -->
                <div class="schema-external-actions">
                  <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" class="schema-btn-secondary" id="schemaLinkGoogleTest">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Google Rich Results Test ↗
                  </a>
                  <a href="https://validator.schema.org" target="_blank" rel="noopener noreferrer" class="schema-btn-secondary" id="schemaLinkSchemaValidator">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Schema.org Validator ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Saved Schemas Library Drawer -->
        <div class="schema-drawer-backdrop" id="schemaDrawerBackdrop"></div>
        <div class="schema-library-drawer" id="schemaLibraryDrawer">
          <div class="schema-drawer-header">
            <h3 class="schema-drawer-title">Saved Schemas Library</h3>
            <button class="schema-drawer-close" id="schemaBtnCloseLibrary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="schema-drawer-body" id="schemaSavedListContainer">
            <div style="text-align: center; color: #64748b; font-size: 13px; padding: 24px;">No saved schemas yet.</div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      // Source Mode Tabs
      this.container.querySelectorAll('[data-source-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
          this.container.querySelectorAll('[data-source-tab]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const mode = tab.getAttribute('data-source-tab');
          this.activeSourceTab = mode;
          this.container.querySelector('#schemaSourceModeUrl').style.display = mode === 'url' ? 'block' : 'none';
          this.container.querySelector('#schemaSourceModeHtml').style.display = mode === 'html' ? 'block' : 'none';
          this.container.querySelector('#schemaSourceModeManual').style.display = mode === 'manual' ? 'block' : 'none';
        });
      });

      // Analyze URL
      const btnAnalyzeUrl = this.container.querySelector('#schemaBtnAnalyzeUrl');
      if (btnAnalyzeUrl) {
        btnAnalyzeUrl.addEventListener('click', () => this.analyzeUrl());
      }
      const urlInput = this.container.querySelector('#schemaUrlInput');
      if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.analyzeUrl();
          }
        });
      }

      // Analyze HTML
      const btnAnalyzeHtml = this.container.querySelector('#schemaBtnAnalyzeHtml');
      if (btnAnalyzeHtml) {
        btnAnalyzeHtml.addEventListener('click', () => this.analyzeHtml());
      }

      // Type Category Filters
      this.container.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.container.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategoryFilter = btn.getAttribute('data-cat');
          this.renderTypeGrid();
        });
      });

      // Type Search Input
      const typeSearch = this.container.querySelector('#schemaTypeSearch');
      if (typeSearch) {
        typeSearch.addEventListener('input', (e) => {
          this.typeSearchQuery = e.target.value.toLowerCase().trim();
          this.renderTypeGrid();
        });
      }

      // Code View Tabs
      this.container.querySelectorAll('[data-code-view]').forEach(tab => {
        tab.addEventListener('click', () => {
          this.container.querySelectorAll('[data-code-view]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeCodeView = tab.getAttribute('data-code-view');
          this.renderCodeOutput();
        });
      });

      // Copy Code
      const btnCopyCode = this.container.querySelector('#schemaBtnCopyCode');
      if (btnCopyCode) {
        btnCopyCode.addEventListener('click', () => this.copyCode());
      }

      // Download JSON
      const btnDownloadJson = this.container.querySelector('#schemaBtnDownloadJson');
      if (btnDownloadJson) {
        btnDownloadJson.addEventListener('click', () => this.downloadJson());
      }

      // Save Schema Button
      const btnSave = this.container.querySelector('#schemaBtnSave');
      if (btnSave) {
        btnSave.addEventListener('click', () => this.saveSchema());
      }

      // Reset Button
      const btnReset = this.container.querySelector('#schemaBtnReset');
      if (btnReset) {
        btnReset.addEventListener('click', () => this.resetWorkspace());
      }

      // Library Drawer Toggle
      const btnOpenLibrary = this.container.querySelector('#schemaBtnOpenLibrary');
      const btnCloseLibrary = this.container.querySelector('#schemaBtnCloseLibrary');
      const drawerBackdrop = this.container.querySelector('#schemaDrawerBackdrop');
      const libraryDrawer = this.container.querySelector('#schemaLibraryDrawer');

      if (btnOpenLibrary) {
        btnOpenLibrary.addEventListener('click', () => {
          libraryDrawer.classList.add('open');
          drawerBackdrop.classList.add('open');
        });
      }
      if (btnCloseLibrary) {
        btnCloseLibrary.addEventListener('click', () => {
          libraryDrawer.classList.remove('open');
          drawerBackdrop.classList.remove('open');
        });
      }
      if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => {
          libraryDrawer.classList.remove('open');
          drawerBackdrop.classList.remove('open');
        });
      }

      // Add Custom Property Button
      const btnAddCustom = this.container.querySelector('#schemaBtnAddCustomProp');
      if (btnAddCustom) {
        btnAddCustom.addEventListener('click', () => this.promptAddCustomProperty());
      }

      // Stepper click to scroll
      this.container.querySelectorAll('[data-step-target]').forEach(stepBtn => {
        stepBtn.addEventListener('click', () => {
          const targetId = stepBtn.getAttribute('data-step-target');
          const targetEl = this.container.querySelector(`#${targetId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this.container.querySelectorAll('.schema-step-btn').forEach(b => b.classList.remove('active'));
            stepBtn.classList.add('active');
          }
        });
      });
    }

    renderTypeGrid() {
      const grid = this.container.querySelector('#schemaTypeGrid');
      if (!grid || !this.catalog) return;

      const types = Object.values(this.catalog);
      const filtered = types.filter(t => {
        const matchesCategory = this.activeCategoryFilter === 'ALL' || t.category === this.activeCategoryFilter;
        const matchesSearch = !this.typeSearchQuery || 
          t.label.toLowerCase().includes(this.typeSearchQuery) || 
          t.type.toLowerCase().includes(this.typeSearchQuery) ||
          t.description.toLowerCase().includes(this.typeSearchQuery);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; font-size: 13px; padding: 20px;">No schemas found matching "${this.typeSearchQuery}".</div>`;
        return;
      }

      grid.innerHTML = filtered.map(t => {
        const isSelected = t.type === this.currentType;
        const richEligible = t.googleRichResult?.supported;
        return `
          <div class="schema-type-card ${isSelected ? 'selected' : ''}" data-select-type="${t.type}">
            <div class="schema-type-card-top">
              <span class="schema-type-name">${t.label}</span>
              ${richEligible ? `
                <span class="schema-badge schema-badge-success" title="Google Rich Result Supported">Rich Result</span>
              ` : `
                <span class="schema-badge schema-badge-info" title="Schema.org Specification">Schema.org</span>
              `}
            </div>
            <p class="schema-type-desc">${t.description}</p>
            <div class="schema-type-pills">
              <span class="schema-badge schema-badge-info" style="font-size:10px;">${t.requiredProps.length} Required</span>
              ${t.recommendedProps.length > 0 ? `<span class="schema-badge schema-badge-warning" style="font-size:10px;">${t.recommendedProps.length} Recommended</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-select-type]').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.getAttribute('data-select-type');
          this.switchSchemaType(type);
        });
      });
    }

    switchSchemaType(type) {
      if (!this.catalog[type]) return;
      this.currentType = type;

      const titleEl = this.container.querySelector('#schemaActiveTypeTitle');
      if (titleEl) titleEl.textContent = this.catalog[type].label;

      this.renderTypeGrid();
      this.syncFormToType(type);
      this.checkDuplicateSchema();
      this.triggerLiveGenerate();
    }

    async analyzeUrl() {
      const input = this.container.querySelector('#schemaUrlInput');
      const url = input ? input.value.trim() : '';
      if (!url) {
        if (window.App && window.App.showToast) window.App.showToast('Please enter a website URL to analyze.');
        return;
      }

      const btn = this.container.querySelector('#schemaBtnAnalyzeUrl');
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">↻</span> Analyzing...`;
      btn.disabled = true;

      try {
        const res = await fetch('/api/schema/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, schemaType: this.currentType })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'URL analysis failed.');
        }

        this.handleExtractionSuccess(data);
        if (window.App && window.App.showToast) window.App.showToast(`Extracted page facts & schemas for ${data.url}`);
      } catch (err) {
        alert(`Analysis Error: ${err.message}`);
      } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    }

    async analyzeHtml() {
      const textarea = this.container.querySelector('#schemaHtmlInput');
      const html = textarea ? textarea.value.trim() : '';
      if (!html) {
        if (window.App && window.App.showToast) window.App.showToast('Please paste HTML content to extract.');
        return;
      }

      const btn = this.container.querySelector('#schemaBtnAnalyzeHtml');
      btn.disabled = true;
      btn.textContent = 'Extracting...';

      try {
        const res = await fetch('/api/schema/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, schemaType: this.currentType })
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'HTML extraction failed.');
        }

        this.handleExtractionSuccess(data);
        if (window.App && window.App.showToast) window.App.showToast('Extracted page facts & structured data from HTML.');
      } catch (err) {
        alert(`Extraction Error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Extract From HTML';
      }
    }

    handleExtractionSuccess(data) {
      this.analyzedPageData = data.pageData;
      this.existingSchemas = data.existingSchemas;

      // Populate facts from initial facts with source tagging
      if (data.initialFacts) {
        for (const [key, val] of Object.entries(data.initialFacts)) {
          if (val) {
            this.currentFacts[key] = val;
            this.fieldSources[key] = 'extracted';
          }
        }
      }

      this.renderPageSummary(data.pageData);
      this.renderDetectedSchemas(data.existingSchemas);
      this.checkDuplicateSchema();
      this.syncFormToType(this.currentType);
      this.triggerLiveGenerate();
    }

    renderPageSummary(page) {
      const box = this.container.querySelector('#schemaPageSummaryBox');
      if (!box || !page) return;

      box.style.display = 'grid';
      box.innerHTML = `
        <div class="schema-fact-item">
          <span class="schema-fact-label">Page Title</span>
          <span class="schema-fact-value">${page.title || '(None)'}</span>
        </div>
        <div class="schema-fact-item">
          <span class="schema-fact-label">Canonical URL</span>
          <span class="schema-fact-value">${page.canonical || '(None)'}</span>
        </div>
        <div class="schema-fact-item">
          <span class="schema-fact-label">Primary H1</span>
          <span class="schema-fact-value">${page.h1?.[0] || '(None)'}</span>
        </div>
        <div class="schema-fact-item">
          <span class="schema-fact-label">Meta Description</span>
          <span class="schema-fact-value" style="font-size:11px;">${page.description ? page.description.slice(0, 120) + '...' : '(None)'}</span>
        </div>
      `;
    }

    renderDetectedSchemas(existing) {
      const box = this.container.querySelector('#schemaDetectedBox');
      if (!box || !existing) return;

      const detectedTypes = existing.detectedTypes || [];
      const blocks = existing.jsonLdBlocks || [];

      box.style.display = 'flex';
      box.innerHTML = `
        <div class="schema-detected-header">
          <span class="schema-detected-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Existing Structured Data on Page (${detectedTypes.length} types detected)
          </span>
          <div>
            ${existing.hasErrors ? '<span class="schema-badge schema-badge-danger">Syntax Errors Found</span>' : '<span class="schema-badge schema-badge-success">Valid Syntax</span>'}
          </div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${detectedTypes.length > 0 ? detectedTypes.map(t => `<span class="schema-badge schema-badge-info">${t}</span>`).join('') : '<span style="color:#64748b; font-size:12px;">No JSON-LD / microdata schema markups detected on this page.</span>'}
        </div>

        ${blocks.length > 0 ? `
          <div style="margin-top: 6px;">
            <button class="schema-btn-secondary" id="schemaBtnInspectDetected" style="font-size:11px; padding: 3px 8px;">
              Inspect Raw Detected JSON (${blocks.length} blocks)
            </button>
          </div>
        ` : ''}
      `;

      const btnInspect = box.querySelector('#schemaBtnInspectDetected');
      if (btnInspect) {
        btnInspect.addEventListener('click', () => {
          const rawSnippets = blocks.map((b, i) => `// Block #${i + 1} (${b.primaryType || 'Unknown'})\n${b.rawContent}`).join('\n\n');
          alert(rawSnippets.slice(0, 1500) + (rawSnippets.length > 1500 ? '\n... (truncated)' : ''));
        });
      }
    }

    checkDuplicateSchema() {
      const alertBox = this.container.querySelector('#schemaDuplicateAlert');
      const alertText = this.container.querySelector('#schemaDuplicateText');
      if (!alertBox || !this.existingSchemas) return;

      const detectedTypes = this.existingSchemas.detectedTypes || [];
      const hasDuplicate = detectedTypes.some(t => t.toLowerCase() === this.currentType.toLowerCase());

      if (hasDuplicate) {
        alertBox.style.display = 'flex';
        alertText.innerHTML = `<strong>Duplicate Warning:</strong> A <code>${this.currentType}</code> schema is already present on this page. Adding another duplicate may cause search engine indexing conflicts unless intentional.`;
      } else {
        alertBox.style.display = 'none';
      }
    }

    syncFormToType(type) {
      const form = this.container.querySelector('#schemaFormContainer');
      if (!form) return;

      const meta = this.catalog?.[type] || { requiredProps: ['name'], recommendedProps: [] };
      const f = this.currentFacts;

      // Helper to render source badge
      const getSourceBadge = (fieldName) => {
        const src = this.fieldSources[fieldName] || 'manual';
        return src === 'extracted' 
          ? `<span class="schema-source-pill schema-source-extracted" title="Auto-extracted from page">Detected</span>`
          : `<span class="schema-source-pill schema-source-manual">Manual</span>`;
      };

      let fieldsHtml = '';

      switch (type) {
        case 'LocalBusiness':
          fieldsHtml = `
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Business Name <span class="schema-req-star">*</span></label>
                ${getSourceBadge('name')}
              </div>
              <input type="text" class="schema-input" data-fact="name" value="${f.name || ''}" placeholder="e.g. Acme Coffee Roasters">
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Specific Subtype</label>
                ${getSourceBadge('subtype')}
              </div>
              <select class="schema-select" data-fact="subtype">
                <option value="LocalBusiness" ${f.subtype === 'LocalBusiness' ? 'selected' : ''}>LocalBusiness (General)</option>
                <option value="Restaurant" ${f.subtype === 'Restaurant' ? 'selected' : ''}>Restaurant</option>
                <option value="Store" ${f.subtype === 'Store' ? 'selected' : ''}>Store</option>
                <option value="MedicalBusiness" ${f.subtype === 'MedicalBusiness' ? 'selected' : ''}>MedicalBusiness</option>
                <option value="ProfessionalService" ${f.subtype === 'ProfessionalService' ? 'selected' : ''}>ProfessionalService</option>
                <option value="AutoRepair" ${f.subtype === 'AutoRepair' ? 'selected' : ''}>AutoRepair</option>
                <option value="Hotel" ${f.subtype === 'Hotel' ? 'selected' : ''}>Hotel</option>
              </select>
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Description</label>
                ${getSourceBadge('description')}
              </div>
              <textarea class="schema-textarea" data-fact="description" rows="2" placeholder="Brief summary of business...">${f.description || ''}</textarea>
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Website URL</label>
                ${getSourceBadge('url')}
              </div>
              <input type="url" class="schema-input" data-fact="url" value="${f.url || ''}" placeholder="https://example.com">
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="schema-field-group">
                <div class="schema-field-label-wrap">
                  <label class="schema-field-label">Telephone</label>
                  ${getSourceBadge('telephone')}
                </div>
                <input type="tel" class="schema-input" data-fact="telephone" value="${f.telephone || ''}" placeholder="+1-555-123-4567">
              </div>
              <div class="schema-field-group">
                <div class="schema-field-label-wrap">
                  <label class="schema-field-label">Price Range</label>
                  ${getSourceBadge('priceRange')}
                </div>
                <input type="text" class="schema-input" data-fact="priceRange" value="${f.priceRange || '$$'}" placeholder="$, $$, $$$, or $$$$">
              </div>
            </div>

            <div style="font-weight: 700; font-size: 12px; margin-top: 6px; color: #0f172a;">Postal Address <span class="schema-req-star">*</span></div>
            <div class="schema-field-group">
              <input type="text" class="schema-input" data-fact="streetAddress" value="${f.streetAddress || ''}" placeholder="Street Address (e.g. 100 Main St)">
            </div>
            <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:8px;">
              <input type="text" class="schema-input" data-fact="addressLocality" value="${f.addressLocality || ''}" placeholder="City / Locality">
              <input type="text" class="schema-input" data-fact="addressRegion" value="${f.addressRegion || ''}" placeholder="State / Region">
              <input type="text" class="schema-input" data-fact="postalCode" value="${f.postalCode || ''}" placeholder="Postal Code">
            </div>
            <div class="schema-field-group" style="margin-top: 6px;">
              <input type="text" class="schema-input" data-fact="addressCountry" value="${f.addressCountry || 'US'}" placeholder="Country (e.g. US, UK)">
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top: 6px;">
              <div class="schema-field-group">
                <label class="schema-field-label">Latitude</label>
                <input type="number" step="any" class="schema-input" data-fact="latitude" value="${f.latitude || ''}" placeholder="37.7749">
              </div>
              <div class="schema-field-group">
                <label class="schema-field-label">Longitude</label>
                <input type="number" step="any" class="schema-input" data-fact="longitude" value="${f.longitude || ''}" placeholder="-122.4194">
              </div>
            </div>
          `;
          break;

        case 'Product':
          fieldsHtml = `
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Product Name <span class="schema-req-star">*</span></label>
                ${getSourceBadge('name')}
              </div>
              <input type="text" class="schema-input" data-fact="name" value="${f.name || ''}" placeholder="e.g. Premium Wireless Headphones">
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Image URL <span class="schema-req-star">*</span></label>
                ${getSourceBadge('image')}
              </div>
              <input type="url" class="schema-input" data-fact="image" value="${f.image || ''}" placeholder="https://example.com/images/product.jpg">
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Description</label>
                ${getSourceBadge('description')}
              </div>
              <textarea class="schema-textarea" data-fact="description" rows="2" placeholder="Product details...">${f.description || ''}</textarea>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="schema-field-group">
                <label class="schema-field-label">Brand</label>
                <input type="text" class="schema-input" data-fact="brand" value="${f.brand || ''}" placeholder="e.g. Sony">
              </div>
              <div class="schema-field-group">
                <label class="schema-field-label">SKU</label>
                <input type="text" class="schema-input" data-fact="sku" value="${f.sku || ''}" placeholder="SKU-10023">
              </div>
            </div>

            <div style="font-weight: 700; font-size: 12px; margin-top: 6px; color: #0f172a;">Offer & Pricing <span class="schema-req-star">*</span></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1.5fr; gap:8px;">
              <input type="number" step="0.01" class="schema-input" data-fact="price" value="${f.price || '99.99'}" placeholder="Price (99.99)">
              <input type="text" class="schema-input" data-fact="priceCurrency" value="${f.priceCurrency || 'USD'}" placeholder="Currency (USD)">
              <select class="schema-select" data-fact="availability">
                <option value="InStock" ${f.availability === 'InStock' ? 'selected' : ''}>InStock</option>
                <option value="OutOfStock" ${f.availability === 'OutOfStock' ? 'selected' : ''}>OutOfStock</option>
                <option value="PreOrder" ${f.availability === 'PreOrder' ? 'selected' : ''}>PreOrder</option>
              </select>
            </div>

            <div style="font-weight: 700; font-size: 12px; margin-top: 6px; color: #0f172a;">Review & Ratings (Optional)</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <input type="number" step="0.1" class="schema-input" data-fact="ratingValue" value="${f.ratingValue || '4.8'}" placeholder="Rating Value (e.g. 4.8)">
              <input type="number" class="schema-input" data-fact="reviewCount" value="${f.reviewCount || '24'}" placeholder="Review Count (e.g. 24)">
            </div>
          `;
          break;

        case 'Article':
        case 'BlogPosting':
          fieldsHtml = `
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Headline / Title <span class="schema-req-star">*</span></label>
                ${getSourceBadge('headline')}
              </div>
              <input type="text" class="schema-input" data-fact="headline" value="${f.headline || f.name || ''}" placeholder="Article Headline">
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Hero Image URL <span class="schema-req-star">*</span></label>
                ${getSourceBadge('image')}
              </div>
              <input type="url" class="schema-input" data-fact="image" value="${f.image || ''}" placeholder="https://example.com/hero.jpg (min 1200px width for Google Top Stories)">
            </div>

            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Description / Summary</label>
                ${getSourceBadge('description')}
              </div>
              <textarea class="schema-textarea" data-fact="description" rows="2" placeholder="Summary snippet...">${f.description || ''}</textarea>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="schema-field-group">
                <label class="schema-field-label">Date Published <span class="schema-req-star">*</span></label>
                <input type="date" class="schema-input" data-fact="datePublished" value="${f.datePublished || new Date().toISOString().split('T')[0]}">
              </div>
              <div class="schema-field-group">
                <label class="schema-field-label">Date Modified</label>
                <input type="date" class="schema-input" data-fact="dateModified" value="${f.dateModified || new Date().toISOString().split('T')[0]}">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="schema-field-group">
                <label class="schema-field-label">Author Name <span class="schema-req-star">*</span></label>
                <input type="text" class="schema-input" data-fact="authorName" value="${f.authorName || f.author || ''}" placeholder="Author Name">
              </div>
              <div class="schema-field-group">
                <label class="schema-field-label">Publisher Name</label>
                <input type="text" class="schema-input" data-fact="publisherName" value="${f.publisherName || f.publisher || ''}" placeholder="Publisher Name">
              </div>
            </div>
          `;
          break;

        case 'FAQPage': {
          const faqs = Array.isArray(f.faqs) && f.faqs.length > 0 ? f.faqs : [
            { question: 'What is WebDev AI Studio?', answer: 'An advanced visual developer workspace and testing studio.' },
            { question: 'Does this generate valid Schema.org JSON-LD?', answer: 'Yes, it provides deterministic Schema.org compliant structured data.' }
          ];
          f.faqs = faqs;

          fieldsHtml = `
            <div class="schema-field-group">
              <label class="schema-field-label">FAQ Items <span class="schema-req-star">*</span></label>
              <p class="schema-field-hint">Add questions and verified answers for Google accordion snippets.</p>
            </div>
            <div class="schema-repeater-container" id="schemaFaqRepeater">
              ${faqs.map((faq, idx) => `
                <div class="schema-repeater-row" data-repeater-idx="${idx}">
                  <div class="schema-repeater-fields">
                    <input type="text" class="schema-input" data-faq-q="${idx}" value="${faq.question || ''}" placeholder="Question">
                    <textarea class="schema-textarea" data-faq-a="${idx}" rows="2" placeholder="Answer">${faq.answer || ''}</textarea>
                  </div>
                  <button class="schema-repeater-remove-btn" data-remove-faq="${idx}" title="Remove Question">✕</button>
                </div>
              `).join('')}
              <button class="schema-repeater-add-btn" id="schemaBtnAddFaq">+ Add Question Item</button>
            </div>
          `;
          break;
        }

        case 'BreadcrumbList': {
          const bcs = Array.isArray(f.breadcrumbs) && f.breadcrumbs.length > 0 ? f.breadcrumbs : [
            { name: 'Home', url: 'https://example.com' },
            { name: 'Docs', url: 'https://example.com/docs' },
            { name: 'Schema Generator', url: 'https://example.com/docs/schema' }
          ];
          f.breadcrumbs = bcs;

          fieldsHtml = `
            <div class="schema-field-group">
              <label class="schema-field-label">Breadcrumb Items <span class="schema-req-star">*</span></label>
              <p class="schema-field-hint">Hierarchical trail leading from the home domain to this document.</p>
            </div>
            <div class="schema-repeater-container" id="schemaBreadcrumbRepeater">
              ${bcs.map((bc, idx) => `
                <div class="schema-repeater-row" data-bc-idx="${idx}">
                  <div style="font-weight: 700; font-size: 12px; align-self: center; width: 24px; color: #64748b;">${idx + 1}.</div>
                  <div class="schema-repeater-fields" style="flex-direction:row; gap:8px;">
                    <input type="text" class="schema-input" data-bc-name="${idx}" value="${bc.name || ''}" placeholder="Page Name">
                    <input type="url" class="schema-input" data-bc-url="${idx}" value="${bc.url || ''}" placeholder="Target URL">
                  </div>
                  <button class="schema-repeater-remove-btn" data-remove-bc="${idx}" title="Remove Breadcrumb">✕</button>
                </div>
              `).join('')}
              <button class="schema-repeater-add-btn" id="schemaBtnAddBc">+ Add Breadcrumb Step</button>
            </div>
          `;
          break;
        }

        default:
          fieldsHtml = `
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Name <span class="schema-req-star">*</span></label>
                ${getSourceBadge('name')}
              </div>
              <input type="text" class="schema-input" data-fact="name" value="${f.name || ''}" placeholder="Entity name">
            </div>
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">Description</label>
                ${getSourceBadge('description')}
              </div>
              <textarea class="schema-textarea" data-fact="description" rows="3" placeholder="Description...">${f.description || ''}</textarea>
            </div>
            <div class="schema-field-group">
              <div class="schema-field-label-wrap">
                <label class="schema-field-label">URL</label>
                ${getSourceBadge('url')}
              </div>
              <input type="url" class="schema-input" data-fact="url" value="${f.url || ''}" placeholder="https://example.com">
            </div>
          `;
          break;
      }

      form.innerHTML = fieldsHtml;

      // Bind input handlers for live re-generation
      form.querySelectorAll('[data-fact]').forEach(el => {
        el.addEventListener('input', (e) => {
          const key = el.getAttribute('data-fact');
          this.currentFacts[key] = e.target.value;
          this.fieldSources[key] = 'manual';
          this.triggerLiveGenerate();
        });
      });

      // Bind FAQ repeater buttons
      if (type === 'FAQPage') {
        form.querySelectorAll('[data-faq-q]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(inp.getAttribute('data-faq-q'), 10);
            if (this.currentFacts.faqs[idx]) {
              this.currentFacts.faqs[idx].question = e.target.value;
              this.triggerLiveGenerate();
            }
          });
        });
        form.querySelectorAll('[data-faq-a]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(inp.getAttribute('data-faq-a'), 10);
            if (this.currentFacts.faqs[idx]) {
              this.currentFacts.faqs[idx].answer = e.target.value;
              this.triggerLiveGenerate();
            }
          });
        });
        form.querySelectorAll('[data-remove-faq]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-remove-faq'), 10);
            this.currentFacts.faqs.splice(idx, 1);
            this.syncFormToType('FAQPage');
            this.triggerLiveGenerate();
          });
        });
        const btnAddFaq = form.querySelector('#schemaBtnAddFaq');
        if (btnAddFaq) {
          btnAddFaq.addEventListener('click', () => {
            this.currentFacts.faqs.push({ question: '', answer: '' });
            this.syncFormToType('FAQPage');
            this.triggerLiveGenerate();
          });
        }
      }

      // Bind Breadcrumb repeater buttons
      if (type === 'BreadcrumbList') {
        form.querySelectorAll('[data-bc-name]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(inp.getAttribute('data-bc-name'), 10);
            if (this.currentFacts.breadcrumbs[idx]) {
              this.currentFacts.breadcrumbs[idx].name = e.target.value;
              this.triggerLiveGenerate();
            }
          });
        });
        form.querySelectorAll('[data-bc-url]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(inp.getAttribute('data-bc-url'), 10);
            if (this.currentFacts.breadcrumbs[idx]) {
              this.currentFacts.breadcrumbs[idx].url = e.target.value;
              this.triggerLiveGenerate();
            }
          });
        });
        form.querySelectorAll('[data-remove-bc]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-remove-bc'), 10);
            this.currentFacts.breadcrumbs.splice(idx, 1);
            this.syncFormToType('BreadcrumbList');
            this.triggerLiveGenerate();
          });
        });
        const btnAddBc = form.querySelector('#schemaBtnAddBc');
        if (btnAddBc) {
          btnAddBc.addEventListener('click', () => {
            this.currentFacts.breadcrumbs.push({ name: '', url: '' });
            this.syncFormToType('BreadcrumbList');
            this.triggerLiveGenerate();
          });
        }
      }
    }

    triggerLiveGenerate() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.generateSchema();
      }, 150);
    }

    async generateSchema() {
      try {
        const res = await fetch('/api/schema/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: this.currentType,
            facts: this.currentFacts
          })
        });
        const data = await res.json();
        if (data.success) {
          this.currentJsonLd = data.jsonld;
          this.currentValidation = data.validation;
          this.renderCodeOutput();
          this.renderValidationPanel();
        }
      } catch (err) {
        console.error('[SchemaGenerator] Generate error:', err);
      }
    }

    renderCodeOutput() {
      const display = this.container.querySelector('#schemaCodeEditorDisplay');
      if (!display) return;

      if (!this.currentJsonLd) {
        display.innerHTML = `<code>// Generating schema output...</code>`;
        return;
      }

      const jsonStr = JSON.stringify(this.currentJsonLd, null, 2);

      switch (this.activeCodeView) {
        case 'jsonld':
          display.textContent = jsonStr;
          break;

        case 'script':
          display.textContent = `<script type="application/ld+json">\n${jsonStr}\n<\/script>`;
          break;

        case 'wordpress':
          display.textContent = `<?php\n/**\n * Insert Schema.org JSON-LD in WordPress Header\n */\nadd_action('wp_head', function() {\n?>\n<script type="application/ld+json">\n${jsonStr}\n<\/script>\n<?php\n});`;
          break;

        case 'react':
          display.textContent = `// Next.js (App Router or Pages Router) / React Component\nexport default function SchemaMarkup() {\n  const schemaData = ${jsonStr};\n\n  return (\n    <script\n      type="application/ld+json"\n      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}\n    />\n  );\n}`;
          break;
      }
    }

    renderValidationPanel() {
      const v = this.currentValidation;
      if (!v) return;

      const mainStatusEl = this.container.querySelector('#schemaValMainStatus');
      const statsBadge = this.container.querySelector('#schemaValStatsBadge');
      const layersList = this.container.querySelector('#schemaValLayersList');
      const disclaimerBox = this.container.querySelector('#schemaGoogleDisclaimerBox');

      if (v.isValid) {
        mainStatusEl.innerHTML = `<span style="color:#15803d;">✔ Passed Schema.org Conformance</span>`;
      } else {
        mainStatusEl.innerHTML = `<span style="color:#b91c1c;">✖ Schema Validation Issues (${v.errors.length})</span>`;
      }

      statsBadge.textContent = `${v.stats.requiredPresent}/${v.stats.requiredTotal} Required Props`;
      statsBadge.className = v.stats.requiredPresent === v.stats.requiredTotal 
        ? 'schema-badge schema-badge-success' 
        : 'schema-badge schema-badge-danger';

      let layersHtml = '';

      // Layer 1: JSON Syntax
      layersHtml += `
        <div class="schema-val-layer-item">
          <span class="schema-val-layer-icon">${v.syntaxValid ? '✅' : '❌'}</span>
          <div>
            <strong>JSON Syntax:</strong> ${v.syntaxValid ? 'Valid JSON-LD' : 'Malformed syntax error'}
          </div>
        </div>
      `;

      // Layer 2: Schema.org Required Properties
      if (v.errors.length > 0) {
        v.errors.forEach(err => {
          layersHtml += `
            <div class="schema-val-layer-item" style="color: #b91c1c;">
              <span class="schema-val-layer-icon">⚠️</span>
              <div>
                <strong>Required Property:</strong> ${err.message}
              </div>
            </div>
          `;
        });
      } else {
        layersHtml += `
          <div class="schema-val-layer-item">
            <span class="schema-val-layer-icon">✅</span>
            <div>
              <strong>Schema.org Standard:</strong> All mandatory properties for <code>${this.currentType}</code> are present.
            </div>
          </div>
        `;
      }

      // Layer 3: Recommended Warnings
      if (v.warnings.length > 0) {
        v.warnings.slice(0, 3).forEach(w => {
          layersHtml += `
            <div class="schema-val-layer-item" style="color: #b45309;">
              <span class="schema-val-layer-icon">ℹ️</span>
              <div>
                <strong>Recommended Enhancement:</strong> ${w.message}
              </div>
            </div>
          `;
        });
        if (v.warnings.length > 3) {
          layersHtml += `<div style="font-size:11px; color:#64748b; margin-left: 24px;">+ ${v.warnings.length - 3} more recommended properties could be added.</div>`;
        }
      }

      // Layer 4: Google Rich Result Guidance
      layersHtml += `
        <div class="schema-val-layer-item" style="background:#f8fafc; padding: 8px; border-radius: 6px;">
          <span class="schema-val-layer-icon">🔍</span>
          <div>
            <strong>Google Search Central Status:</strong> ${v.googleStatusText}
          </div>
        </div>
      `;

      layersList.innerHTML = layersHtml;

      // Update Google Rich Results URL link
      const linkGoogle = this.container.querySelector('#schemaLinkGoogleTest');
      if (linkGoogle && this.currentJsonLd) {
        // Can link to Google test
        linkGoogle.href = `https://search.google.com/test/rich-results`;
      }
    }

    async copyTextToClipboard(text, targetBtn = null, successMsg = 'Copied to clipboard!') {
      if (!text) return false;

      let success = false;

      // 1. Try modern navigator.clipboard if available
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          success = true;
        }
      } catch (err) {
        console.warn('[SchemaGenerator] navigator.clipboard.writeText failed, using fallback:', err);
      }

      // 2. Fallback to hidden textarea with execCommand
      if (!success) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          ta.style.top = '-9999px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          ta.setSelectionRange(0, 999999);
          success = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (fbErr) {
          console.error('[SchemaGenerator] ExecCommand fallback copy failed:', fbErr);
        }
      }

      // 3. Visual feedback on target button if provided
      if (targetBtn) {
        const originalHtml = targetBtn.innerHTML;
        const originalBg = targetBtn.style.background;
        const originalColor = targetBtn.style.color;

        if (success) {
          targetBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
          targetBtn.style.background = '#16a34a';
          targetBtn.style.color = '#ffffff';
          setTimeout(() => {
            targetBtn.innerHTML = originalHtml;
            targetBtn.style.background = originalBg;
            targetBtn.style.color = originalColor;
          }, 2000);
        } else {
          targetBtn.innerHTML = `Failed`;
          setTimeout(() => {
            targetBtn.innerHTML = originalHtml;
          }, 2000);
        }
      }

      // 4. Studio Toast
      if (success) {
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(successMsg);
        }
      } else {
        alert('Unable to copy code automatically. Please select the code and press Ctrl+C or ⌘C.');
      }

      return success;
    }

    async copyCode() {
      if (!this.currentJsonLd) {
        await this.generateSchema();
      }
      const display = this.container.querySelector('#schemaCodeEditorDisplay');
      let textToCopy = display ? display.textContent : '';

      if (!textToCopy || textToCopy.includes('// Loading schema model') || textToCopy.includes('// Generating schema output')) {
        if (this.currentJsonLd) {
          textToCopy = JSON.stringify(this.currentJsonLd, null, 2);
        }
      }

      const btn = this.container.querySelector('#schemaBtnCopyCode');
      await this.copyTextToClipboard(textToCopy, btn, 'Schema code copied to clipboard!');
    }

    downloadJson() {
      if (!this.currentJsonLd) return;
      const jsonStr = JSON.stringify(this.currentJsonLd, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentType.toLowerCase()}-schema.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    async saveSchema() {
      if (!this.currentJsonLd) {
        if (window.App && window.App.showToast) window.App.showToast('No schema generated yet to save.');
        return;
      }

      const defaultName = `${this.currentFacts.name || this.currentType} Schema`;
      const name = prompt('Enter a name for this saved schema:', defaultName);
      if (!name || !name.trim()) return;

      try {
        const res = await fetch('/api/schema/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            schema_type: this.currentType,
            source_url: this.currentFacts.url || (this.analyzedPageData?.canonical) || '',
            facts: this.currentFacts,
            jsonld_output: this.currentJsonLd,
            validation_summary: this.currentValidation || {}
          })
        });
        const data = await res.json();
        if (data.success) {
          if (window.App && window.App.showToast) window.App.showToast('Schema saved to workspace library!');
          await this.loadSavedSchemas();
        } else {
          alert(`Save error: ${data.error}`);
        }
      } catch (err) {
        alert(`Failed to save schema: ${err.message}`);
      }
    }

    renderSavedList() {
      const list = this.container.querySelector('#schemaSavedListContainer');
      if (!list) return;

      if (this.savedSchemas.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 13px; padding: 24px;">No saved schemas yet.</div>`;
        return;
      }

      list.innerHTML = this.savedSchemas.map(s => {
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '';
        return `
          <div class="schema-saved-item" data-saved-id="${s.id}">
            <div class="schema-saved-item-top">
              <span class="schema-saved-item-name">${s.name}</span>
              <span class="schema-badge schema-badge-info">${s.schema_type}</span>
            </div>
            <div class="schema-saved-item-meta">
              ${s.source_url ? `<span>${s.source_url}</span> • ` : ''}<span>${dateStr}</span>
            </div>
            <div class="schema-saved-item-actions">
              <button class="schema-btn-secondary" data-action="load" data-id="${s.id}" style="font-size:11px; padding: 3px 8px;">Load in Editor</button>
              <button class="schema-btn-secondary" data-action="copy" data-id="${s.id}" style="font-size:11px; padding: 3px 8px;">Copy Code</button>
              <button class="schema-btn-secondary" data-action="delete" data-id="${s.id}" style="font-size:11px; padding: 3px 8px; color:#b91c1c;">Delete</button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('[data-action="load"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.loadSavedSchemaIntoEditor(id);
        });
      });

      list.querySelectorAll('[data-action="copy"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const item = this.savedSchemas.find(s => s.id === id);
          if (item && item.jsonld_output) {
            await this.copyTextToClipboard(item.jsonld_output, btn, 'Copied saved schema JSON-LD!');
          }
        });
      });

      list.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Delete this saved schema?')) {
            await this.deleteSavedSchema(id);
          }
        });
      });
    }

    loadSavedSchemaIntoEditor(id) {
      const item = this.savedSchemas.find(s => s.id === id);
      if (!item) return;

      this.currentType = item.schema_type;
      this.currentFacts = item.facts || {};
      this.fieldSources = {};
      this.switchSchemaType(item.schema_type);

      // Close drawer
      const drawer = this.container.querySelector('#schemaLibraryDrawer');
      const backdrop = this.container.querySelector('#schemaDrawerBackdrop');
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');

      if (window.App && window.App.showToast) window.App.showToast(`Loaded "${item.name}" into workspace.`);
    }

    async deleteSavedSchema(id) {
      try {
        const res = await fetch(`/api/schema/history/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          this.savedSchemas = this.savedSchemas.filter(s => s.id !== id);
          this.updateSavedBadge();
          this.renderSavedList();
          if (window.App && window.App.showToast) window.App.showToast('Schema deleted.');
        }
      } catch (err) {
        alert(`Failed to delete schema: ${err.message}`);
      }
    }

    promptAddCustomProperty() {
      const key = prompt('Enter custom Schema.org property name (e.g. foundingDate, paymentAccepted, areaServed):');
      if (!key || !key.trim()) return;
      const val = prompt(`Enter value for property "${key.trim()}":`);
      if (val === null) return;

      if (!this.currentFacts.customProperties) {
        this.currentFacts.customProperties = {};
      }
      this.currentFacts.customProperties[key.trim()] = val.trim();
      this.triggerLiveGenerate();
      if (window.App && window.App.showToast) window.App.showToast(`Added custom property "${key.trim()}"`);
    }

    resetWorkspace() {
      if (confirm('Reset workspace to defaults? Unsaved changes will be cleared.')) {
        this.currentFacts = {};
        this.fieldSources = {};
        this.analyzedPageData = null;
        this.existingSchemas = null;
        this.container.querySelector('#schemaPageSummaryBox').style.display = 'none';
        this.container.querySelector('#schemaDetectedBox').style.display = 'none';
        this.container.querySelector('#schemaDuplicateAlert').style.display = 'none';
        const urlInput = this.container.querySelector('#schemaUrlInput');
        if (urlInput) urlInput.value = '';
        this.syncFormToType(this.currentType);
        this.triggerLiveGenerate();
      }
    }
  }

  // Export to global window
  window.SchemaGeneratorTool = SchemaGeneratorTool;
})();
