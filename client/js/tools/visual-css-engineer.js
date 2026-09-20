/**
 * client/js/tools/visual-css-engineer.js
 * WebDev AI Studio - Visual CSS Engineer Workspace
 * Tagline: Design directly on your code.
 * Multi-Element Visual CSS Editor with Persistent Overrides and Comprehensive Inspector
 */

(function () {
  'use strict';

  // Two-way CSS property mapping (camelCase <-> kebab-case)
  const CSS_PROP_MAP = {
    fontFamily: 'font-family',
    fontSize: 'font-size',
    fontWeight: 'font-weight',
    lineHeight: 'line-height',
    letterSpacing: 'letter-spacing',
    textTransform: 'text-transform',
    textAlign: 'text-align',
    width: 'width',
    minWidth: 'min-width',
    maxWidth: 'max-width',
    height: 'height',
    minHeight: 'min-height',
    maxHeight: 'max-height',
    marginTop: 'margin-top',
    marginRight: 'margin-right',
    marginBottom: 'margin-bottom',
    marginLeft: 'margin-left',
    paddingTop: 'padding-top',
    paddingRight: 'padding-right',
    paddingBottom: 'padding-bottom',
    paddingLeft: 'padding-left',
    color: 'color',
    backgroundColor: 'background-color',
    opacity: 'opacity',
    borderRadius: 'border-radius',
    border: 'border',
    boxShadow: 'box-shadow',
    transform: 'transform',
    transition: 'transition'
  };

  function toKebabCase(str) {
    return CSS_PROP_MAP[str] || str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  function toCamelCase(str) {
    for (const [camel, kebab] of Object.entries(CSS_PROP_MAP)) {
      if (kebab === str) return camel;
    }
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  function toHexColor(colorStr) {
    if (!colorStr) return '#000000';
    if (colorStr.startsWith('#')) {
      if (colorStr.length === 4) {
        return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3];
      }
      return colorStr.substring(0, 7);
    }
    const rgb = colorStr.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const r = parseInt(rgb[0], 10).toString(16).padStart(2, '0');
      const g = parseInt(rgb[1], 10).toString(16).padStart(2, '0');
      const b = parseInt(rgb[2], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#000000';
  }

  class VisualCssEngineerTool {
    constructor(containerId = 'viewVisualCssEngineer') {
      this.container = document.getElementById(containerId);
      this.currentMode = 'url';
      this.currentUrl = 'https://example.com';
      this.currentDevice = 'desktop';
      this.devicePresets = {
        desktop: { name: 'Desktop', width: 1440, height: 900 },
        tablet: { name: 'Tablet', width: 768, height: 1024 },
        mobile: { name: 'Mobile', width: 390, height: 844 }
      };
      this.zoomMode = 'fit'; // 'fit' (auto responsive scale) | '100' | '75' | '50'
      this.unsavedChanges = 0;

      // MULTI-ELEMENT PERSISTENT STATE
      // previewOverrides = {
      //   [elementIdentity]: {
      //     selector: "...",
      //     tag: "h1",
      //     originalStyles: { ... },
      //     changes: { fontSize: "72px", color: "#2563EB" }
      //   }
      // }
      this.previewOverrides = {};
      this.originalStylesMap = {}; // Persistent initial computed styles per selector

      this.selectedElement = null; // Currently inspected element
      this.domElements = [];
      this.designTokens = { colors: [], spacing: [], typography: [], radius: [], shadows: [], rawVariables: {} };
      this.activePatch = null;
      
      // Before / After state (retained exactly as is)
      this.beforeScreenshot = null;
      this.afterScreenshots = {};
      this.verificationResults = null;
      this.autoFixIteration = 0;
      this.isGenerating = false;
      this.isVerifying = false;
      this.historyList = [];
      this.resizeObserver = null;

      // Spacing linkage state
      this.linkedMargin = false;
      this.linkedPadding = false;

      this.init();
    }

    async init() {
      if (!this.container) return;
      this.renderWorkspace();
      this.setupEventListeners();
      this.setupShortcuts();
      this.setupResizeObserver();
      await this.loadInitialContext();
    }

    showToast(message) {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(message);
        return;
      }
      let tc = document.getElementById('vceToastContainer');
      if (!tc) {
        tc = document.createElement('div');
        tc.id = 'vceToastContainer';
        tc.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
        document.body.appendChild(tc);
      }
      const toast = document.createElement('div');
      toast.style.cssText = 'background:#1e293b; color:#f8fafc; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:10px 16px; font-size:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:flex; align-items:center; gap:8px; pointer-events:auto; transition:all 0.2s ease;';
      toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
      tc.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }, 2800);
    }

    async loadInitialContext() {
      try {
        const res = await fetch('/api/visual-css/projects', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.projectsData = data;
          this.populateProjectsDropdown(data);
        }
      } catch (e) {}

      await this.loadWebsite(this.currentUrl);
      await this.loadHistory();
    }

    populateProjectsDropdown(data) {
      const select = document.getElementById('vceProjectSelect');
      if (!select) return;
      select.innerHTML = '<option value="url">🌐 Live Website URL</option>';

      if (data.dbProjects && data.dbProjects.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Database Projects';
        data.dbProjects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = 'db_' + p.id;
          opt.textContent = p.name + ' (' + (p.website_url || 'No URL') + ')';
          opt.dataset.url = p.website_url;
          group.appendChild(opt);
        });
        select.appendChild(group);
      }

      if (data.localProjects && data.localProjects.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Local Workspace Projects';
        data.localProjects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = 'local_' + p.name;
          opt.textContent = p.name + ' (Local Directory)';
          opt.dataset.path = p.path;
          group.appendChild(opt);
        });
        select.appendChild(group);
      }
    }

    renderWorkspace() {
      this.container.innerHTML = `
        <!-- 1. TOP TOOLBAR -->
        <header class="vce-toolbar">
          <div class="vce-toolbar-left">
            <div class="vce-title-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>Visual CSS Engineer</span>
            </div>
            <span class="vce-title-tagline">Design directly on your code.</span>
            
            <!-- Site / Project Selector -->
            <select id="vceProjectSelect" class="vce-site-selector" style="background: var(--bg-surface-subtle); outline: none; cursor: pointer;">
              <option value="url">Live Website (URL)</option>
            </select>

            <div id="vceUnsavedIndicator" class="vce-unsaved-badge" style="display: none;">
              <span class="vce-unsaved-dot"></span>
              <span id="vceUnsavedCount">0 unsaved changes</span>
            </div>
          </div>

          <div class="vce-toolbar-center">
            <!-- Responsive Device Selector -->
            <div class="vce-device-tabs">
              <button class="vce-device-btn active" data-device="desktop" title="Desktop 1440 × 900">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                <span>Desktop (1440)</span>
              </button>
              <button class="vce-device-btn" data-device="tablet" title="Tablet 768 × 1024">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                <span>Tablet (768)</span>
              </button>
              <button class="vce-device-btn" data-device="mobile" title="Mobile 390 × 844">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                <span>Mobile (390)</span>
              </button>
            </div>

            <!-- Zoom Controls -->
            <select id="vceZoomSelect" class="vce-btn" style="padding: 4px 8px; font-size: 11px;">
              <option value="fit" selected>Fit to View</option>
              <option value="100">100%</option>
              <option value="75">75%</option>
              <option value="50">50%</option>
            </select>
          </div>

          <div class="vce-toolbar-right">
            <button class="vce-btn" id="vceBtnRefresh" title="Reload preview">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              <span>Refresh</span>
            </button>
            <button class="vce-btn" id="vceBtnCompare" title="Compare Before / After">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="9" height="18" rx="1"></rect><rect x="13" y="3" width="9" height="18" rx="1"></rect></svg>
              <span>Before / After</span>
            </button>
            <button class="vce-btn" id="vceBtnVerify" title="Run Playwright verification">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Verify</span>
            </button>
            <button class="vce-btn vce-btn-primary" id="vceBtnApply" title="Apply changes to project">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Apply Changes</span>
            </button>
          </div>
        </header>

        <!-- 2. MAIN 3-PANE WORKSPACE -->
        <div class="vce-workspace">
          <!-- LEFT PANE: Elements & Tokens -->
          <aside class="vce-pane-left">
            <div class="vce-pane-header">
              <span>DOM Elements</span>
              <span id="vceElementsCount" class="vce-tree-tag">0</span>
            </div>
            
            <div class="vce-search-input-wrap">
              <input type="text" id="vceElementSearch" class="vce-search-input" placeholder="Search elements (hero, button, h1)..." autocomplete="off">
            </div>

            <div class="vce-pane-tabs">
              <button class="vce-pane-tab active" id="vceTabTree" data-tab="tree">Elements</button>
              <button class="vce-pane-tab" id="vceTabTokens" data-tab="tokens">Design Tokens</button>
              <button class="vce-pane-tab" id="vceTabCode" data-tab="code">Code View</button>
            </div>

            <!-- Tab Content: Element Tree -->
            <div class="vce-element-tree" id="vceElementTreeContainer">
              <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">
                Loading DOM structure...
              </div>
            </div>

            <!-- Tab Content: Tokens (Hidden by default) -->
            <div class="vce-element-tree" id="vceTokensContainer" style="display: none; padding: 12px;">
              <div id="vceTokensList"></div>
            </div>

            <!-- Tab Content: Code View (Hidden by default) -->
            <div class="vce-element-tree" id="vceCodeViewContainer" style="display: none; padding: 12px;">
              <pre class="vce-diff-preview" id="vceCodeViewContent" style="max-height: 100%;"></pre>
            </div>
          </aside>

          <!-- CENTER PANE: Scaled Viewport Canvas -->
          <main class="vce-pane-center" id="vceCenterStage">
            <!-- Target URL Bar -->
            <div class="vce-preview-topbar">
              <input type="text" id="vceUrlInput" class="vce-command-input" value="https://example.com" placeholder="Enter website URL (https://...)">
              <button class="vce-btn vce-btn-primary" id="vceBtnLoadUrl">Load Site</button>
            </div>

            <!-- Scaled Canvas Viewport Area -->
            <div class="vce-preview-canvas" id="vcePreviewCanvas">
              <div class="vce-scaler-wrapper" id="vceScalerWrapper">
                <div class="vce-preview-viewport-frame" id="vceViewportFrame">
                  <div class="vce-viewport-header-bar">
                    <div class="vce-viewport-dots">
                      <span class="vce-vdot"></span>
                      <span class="vce-vdot"></span>
                      <span class="vce-vdot"></span>
                    </div>
                    <span class="vce-viewport-url-display" id="vceViewportUrlDisplay">https://example.com</span>
                    <span id="vceViewportDimensionsBadge" class="font-mono" style="font-size: 10px;">1440 × 900 (Fit)</span>
                  </div>

                  <div class="vce-preview-stage" id="vcePreviewStage">
                    <!-- Interactive Same-Origin Proxy Iframe -->
                    <iframe id="vcePreviewIframe" class="vce-preview-iframe" src="about:blank"></iframe>
                    
                    <!-- Fallback snapshot image -->
                    <img id="vcePreviewSnapshot" class="vce-preview-snapshot" style="display: none;" alt="Browser Snapshot">
                  </div>
                </div>
              </div>
            </div>
          </main>

          <!-- RIGHT PANE: Comprehensive CSS Inspector -->
          <aside class="vce-pane-right" id="vceInspectorPane">
            <div class="vce-pane-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>CSS Inspector</span>
                <span id="vceInspectModifiedBadge" class="vce-modified-badge" style="display: none;">Modified (0)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button class="vce-btn" id="vceBtnResetElement" title="Reset all changes on this element" style="display: none; padding: 2px 7px; font-size: 10px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                  Reset Element
                </button>
                <button class="vce-btn" id="vceBtnResetChanges" title="Reset all preview style overrides across all elements" style="display: none; padding: 2px 7px; font-size: 10px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                  Reset All
                </button>
                <span id="vceSelectedTagBadge" class="vce-tree-tag">No selection</span>
              </div>
            </div>

            <div id="vceInspectorContent" style="display: none;">
              <!-- Element Selector & Specificity -->
              <div class="vce-inspector-section">
                <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: #38bdf8; word-break: break-all;" id="vceInspectSelectorDisplay">
                  div
                </div>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                  <span class="vce-badge vce-badge-low" id="vceInspectSpecificityBadge">Specificity: 0,1,0</span>
                  <span class="vce-badge vce-badge-low" id="vceInspectA11yBadge">Touch Target: OK</span>
                </div>
              </div>

              <!-- 1. TYPOGRAPHY -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Typography</div>
                <div class="vce-property-row" data-prop="fontFamily">
                  <span class="vce-prop-label">Font Family</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputFontFamily" style="width: 140px;" placeholder="inherit">
                    <button class="vce-prop-reset-btn hidden" data-reset="fontFamily" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="fontSize">
                  <span class="vce-prop-label">Font Size</span>
                  <div class="vce-prop-input-group">
                    <input type="range" class="vce-slider" id="vceSliderFontSize" min="10" max="96" value="16">
                    <input type="text" class="vce-prop-input" id="vceInputFontSize" value="16px">
                    <button class="vce-prop-reset-btn hidden" data-reset="fontSize" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="fontWeight">
                  <span class="vce-prop-label">Font Weight</span>
                  <div class="vce-prop-input-group">
                    <select class="vce-prop-input" id="vceSelectFontWeight" style="width: 120px;">
                      <option value="300">300 (Light)</option>
                      <option value="400">400 (Regular)</option>
                      <option value="500">500 (Medium)</option>
                      <option value="600">600 (Semibold)</option>
                      <option value="700">700 (Bold)</option>
                      <option value="800">800 (Extrabold)</option>
                    </select>
                    <button class="vce-prop-reset-btn hidden" data-reset="fontWeight" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="lineHeight">
                  <span class="vce-prop-label">Line Height</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputLineHeight" value="1.5">
                    <button class="vce-prop-reset-btn hidden" data-reset="lineHeight" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="letterSpacing">
                  <span class="vce-prop-label">Letter Spacing</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputLetterSpacing" value="normal">
                    <button class="vce-prop-reset-btn hidden" data-reset="letterSpacing" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="textTransform">
                  <span class="vce-prop-label">Transform</span>
                  <div class="vce-prop-input-group">
                    <select class="vce-prop-input" id="vceSelectTextTransform" style="width: 110px;">
                      <option value="none">none</option>
                      <option value="capitalize">capitalize</option>
                      <option value="uppercase">uppercase</option>
                      <option value="lowercase">lowercase</option>
                    </select>
                    <button class="vce-prop-reset-btn hidden" data-reset="textTransform" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="textAlign">
                  <span class="vce-prop-label">Align</span>
                  <div class="vce-prop-input-group">
                    <select class="vce-prop-input" id="vceSelectTextAlign" style="width: 110px;">
                      <option value="left">left</option>
                      <option value="center">center</option>
                      <option value="right">right</option>
                      <option value="justify">justify</option>
                    </select>
                    <button class="vce-prop-reset-btn hidden" data-reset="textAlign" title="Reset property">✕</button>
                  </div>
                </div>
              </div>

              <!-- 2. DIMENSIONS -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Dimensions</div>
                <div class="vce-property-row" data-prop="width">
                  <span class="vce-prop-label">Width</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputWidth" placeholder="auto" value="auto">
                    <button class="vce-prop-reset-btn hidden" data-reset="width" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="minWidth">
                  <span class="vce-prop-label">Min Width</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputMinWidth" placeholder="0px" value="0px">
                    <button class="vce-prop-reset-btn hidden" data-reset="minWidth" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="maxWidth">
                  <span class="vce-prop-label">Max Width</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputMaxWidth" placeholder="none" value="none">
                    <button class="vce-prop-reset-btn hidden" data-reset="maxWidth" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="height">
                  <span class="vce-prop-label">Height</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputHeight" placeholder="auto" value="auto">
                    <button class="vce-prop-reset-btn hidden" data-reset="height" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="minHeight">
                  <span class="vce-prop-label">Min Height</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputMinHeight" placeholder="0px" value="0px">
                    <button class="vce-prop-reset-btn hidden" data-reset="minHeight" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="maxHeight">
                  <span class="vce-prop-label">Max Height</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputMaxHeight" placeholder="none" value="none">
                    <button class="vce-prop-reset-btn hidden" data-reset="maxHeight" title="Reset property">✕</button>
                  </div>
                </div>
              </div>

              <!-- 3. SPACING & LIVE BOX MODEL -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Spacing</div>

                <!-- Margin Quad -->
                <div class="vce-spacing-block">
                  <div class="vce-spacing-header">
                    <span>Margin</span>
                    <button class="vce-link-btn" id="vceBtnLinkMargin" title="Toggle linked margin values">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <span id="vceLinkMarginText">Unlinked</span>
                    </button>
                  </div>
                  <div class="vce-spacing-quad">
                    <div class="vce-quad-item" data-prop="marginTop">
                      <span class="vce-quad-label">T</span>
                      <input type="text" class="vce-quad-input" id="vceInputMarginTop" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="marginRight">
                      <span class="vce-quad-label">R</span>
                      <input type="text" class="vce-quad-input" id="vceInputMarginRight" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="marginBottom">
                      <span class="vce-quad-label">B</span>
                      <input type="text" class="vce-quad-input" id="vceInputMarginBottom" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="marginLeft">
                      <span class="vce-quad-label">L</span>
                      <input type="text" class="vce-quad-input" id="vceInputMarginLeft" placeholder="0px">
                    </div>
                  </div>
                </div>

                <!-- Padding Quad -->
                <div class="vce-spacing-block">
                  <div class="vce-spacing-header">
                    <span>Padding</span>
                    <button class="vce-link-btn" id="vceBtnLinkPadding" title="Toggle linked padding values">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <span id="vceLinkPaddingText">Unlinked</span>
                    </button>
                  </div>
                  <div class="vce-spacing-quad">
                    <div class="vce-quad-item" data-prop="paddingTop">
                      <span class="vce-quad-label">T</span>
                      <input type="text" class="vce-quad-input" id="vceInputPaddingTop" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="paddingRight">
                      <span class="vce-quad-label">R</span>
                      <input type="text" class="vce-quad-input" id="vceInputPaddingRight" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="paddingBottom">
                      <span class="vce-quad-label">B</span>
                      <input type="text" class="vce-quad-input" id="vceInputPaddingBottom" placeholder="0px">
                    </div>
                    <div class="vce-quad-item" data-prop="paddingLeft">
                      <span class="vce-quad-label">L</span>
                      <input type="text" class="vce-quad-input" id="vceInputPaddingLeft" placeholder="0px">
                    </div>
                  </div>
                </div>

                <!-- Live Box Model Diagram -->
                <div class="vce-bm-wrapper" id="vceBoxModelDisplay" data-role="box-model-container">
                  <div class="vce-bm-title">MARGIN</div>
                  <div id="vceBmMarginTop">0px</div>
                  <div class="vce-bm-row">
                    <div id="vceBmMarginLeft">0px</div>
                    <div class="vce-bm-border">
                      <div class="vce-bm-title">BORDER (<span id="vceBmBorder">none</span>)</div>
                      <div class="vce-bm-padding">
                        <div class="vce-bm-title">PADDING</div>
                        <div id="vceBmPaddingTop">0px</div>
                        <div class="vce-bm-row">
                          <div id="vceBmPaddingLeft">0px</div>
                          <div class="vce-bm-core" id="vceBmContent">
                            240 × 48
                          </div>
                          <div id="vceBmPaddingRight">0px</div>
                        </div>
                        <div id="vceBmPaddingBottom">0px</div>
                      </div>
                    </div>
                    <div id="vceBmMarginRight">0px</div>
                  </div>
                  <div id="vceBmMarginBottom">0px</div>
                </div>
              </div>

              <!-- 4. COLORS & BACKGROUND -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Colors & Background</div>
                <div class="vce-property-row" data-prop="color">
                  <span class="vce-prop-label">Color</span>
                  <div class="vce-prop-input-group">
                    <input type="color" id="vceColorPickerText" value="#ffffff" style="width: 24px; height: 24px; border: none; cursor: pointer; border-radius: 4px;">
                    <input type="text" class="vce-prop-input" id="vceInputTextColor" value="#ffffff">
                    <button class="vce-prop-reset-btn hidden" data-reset="color" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="backgroundColor">
                  <span class="vce-prop-label">Background</span>
                  <div class="vce-prop-input-group">
                    <input type="color" id="vceColorPickerBg" value="#0f172a" style="width: 24px; height: 24px; border: none; cursor: pointer; border-radius: 4px;">
                    <input type="text" class="vce-prop-input" id="vceInputBgColor" value="#0f172a">
                    <button class="vce-prop-reset-btn hidden" data-reset="backgroundColor" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="opacity">
                  <span class="vce-prop-label">Opacity</span>
                  <div class="vce-prop-input-group">
                    <input type="range" class="vce-slider" id="vceSliderOpacity" min="0" max="1" step="0.05" value="1">
                    <input type="text" class="vce-prop-input" id="vceInputOpacity" value="1">
                    <button class="vce-prop-reset-btn hidden" data-reset="opacity" title="Reset property">✕</button>
                  </div>
                </div>
              </div>

              <!-- 5. BORDER & RADIUS -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Border & Radius</div>
                <div class="vce-property-row" data-prop="borderRadius">
                  <span class="vce-prop-label">Radius</span>
                  <div class="vce-prop-input-group">
                    <input type="range" class="vce-slider" id="vceSliderRadius" min="0" max="48" value="8">
                    <input type="text" class="vce-prop-input" id="vceInputRadius" value="8px">
                    <button class="vce-prop-reset-btn hidden" data-reset="borderRadius" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="border">
                  <span class="vce-prop-label">Border</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputBorder" value="none" style="width: 130px;">
                    <button class="vce-prop-reset-btn hidden" data-reset="border" title="Reset property">✕</button>
                  </div>
                </div>
              </div>

              <!-- 6. EFFECTS -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">Effects</div>
                <div class="vce-property-row" data-prop="boxShadow">
                  <span class="vce-prop-label">Box Shadow</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputBoxShadow" placeholder="none" style="width: 140px;">
                    <button class="vce-prop-reset-btn hidden" data-reset="boxShadow" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="transform">
                  <span class="vce-prop-label">Transform</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputTransform" placeholder="none" style="width: 140px;">
                    <button class="vce-prop-reset-btn hidden" data-reset="transform" title="Reset property">✕</button>
                  </div>
                </div>
                <div class="vce-property-row" data-prop="transition">
                  <span class="vce-prop-label">Transition</span>
                  <div class="vce-prop-input-group">
                    <input type="text" class="vce-prop-input" id="vceInputTransition" placeholder="all 0.2s ease" style="width: 140px;">
                    <button class="vce-prop-reset-btn hidden" data-reset="transition" title="Reset property">✕</button>
                  </div>
                </div>
              </div>

              <!-- 7. CSS QUALITY ANALYZER -->
              <div class="vce-inspector-section">
                <div class="vce-section-title">CSS Quality Analyzer</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-muted);">!important Usage</div>
                    <div style="font-size: 14px; font-weight: 700;" id="vceQualityImportantCount">0</div>
                  </div>
                  <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                    <div style="font-size: 10px; color: var(--text-muted);">Token Usage</div>
                    <div style="font-size: 14px; font-weight: 700;" id="vceQualityTokenUsage">N/A</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State for Right Pane -->
            <div id="vceInspectorEmpty" style="padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 12px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>Select an element in the preview or DOM tree to inspect and visually modify its styles.</div>
            </div>
          </aside>

          <!-- BOTTOM COMMAND BAR: AI Command & Proposal -->
          <footer class="vce-bottom-command">
            <!-- Generated Proposal Card (Initially Hidden) -->
            <div id="vceProposalCard" class="vce-proposal-card" style="display: none;">
              <div class="vce-proposal-header">
                <div class="vce-proposal-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  <span id="vceProposalExplanation">AI Proposed Patch</span>
                </div>
                <div class="vce-proposal-badges">
                  <span class="vce-badge vce-badge-low" id="vceProposalRiskBadge">Risk: Low</span>
                  <span class="vce-badge vce-badge-low" id="vceProposalResponsiveBadge">Desktop ✓ Tablet ✓ Mobile ✓</span>
                </div>
              </div>
              <pre class="vce-diff-preview" id="vceProposalPatchCode"></pre>
              <div class="vce-proposal-actions">
                <button class="vce-btn" id="vceBtnDiscardProposal">Discard</button>
                <button class="vce-btn" id="vceBtnPreviewProposal">Live Preview</button>
                <button class="vce-btn vce-btn-primary" id="vceBtnApplyProposal">Apply to Project</button>
              </div>
            </div>

            <!-- AI Command Bar Row -->
            <div class="vce-command-bar-row">
              <div class="vce-ai-icon-pill">
                <span>AI</span>
                <span class="kbd" style="font-size: 9px; padding: 1px 3px;">⌘K</span>
              </div>
              <input type="text" class="vce-command-input" id="vceCommandInput" placeholder="Describe what you want to change (e.g. 'Make this heading more premium and responsive', 'Add a subtle hover animation')...">
              <button class="vce-btn vce-btn-primary" id="vceBtnGeneratePatch">
                <span>Generate Patch</span>
                <span class="kbd" style="font-size: 9px; padding: 1px 4px; margin-left: 4px;">⌘↵</span>
              </button>
            </div>

            <!-- Quick Suggestions -->
            <div class="vce-suggestions-row">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Suggestions:</span>
              <button class="vce-suggestion-pill" data-prompt="Make this heading more premium and responsive">Make heading premium & responsive</button>
              <button class="vce-suggestion-pill" data-prompt="Add a subtle hover animation">Add subtle hover animation</button>
              <button class="vce-suggestion-pill" data-prompt="Make this button look more modern">Modernize button</button>
              <button class="vce-suggestion-pill" data-prompt="Fix horizontal overflow on mobile">Fix mobile overflow</button>
              <button class="vce-suggestion-pill" data-prompt="Calibrate spacing and padding">Refine spacing</button>
            </div>
          </footer>
        </div>

        <!-- Before / After Compare Modal -->
        <div id="vceCompareModal" class="vce-modal-backdrop" style="display: none;">
          <div class="vce-compare-modal">
            <div class="vce-compare-header">
              <div style="font-weight: 700; font-size: 14px;">Visual Verification & Before / After Compare</div>
              <div style="display: flex; gap: 8px;">
                <button class="vce-btn" id="vceBtnCloseCompare">Close (Esc)</button>
              </div>
            </div>
            <div class="vce-compare-stage" id="vceCompareStage">
              <div class="vce-compare-side">
                <div class="vce-side-label">Before (Baseline)</div>
                <img id="vceCompareBeforeImg" style="width: 100%; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);" alt="Before">
              </div>
              <div class="vce-compare-side">
                <div class="vce-side-label">After (Patched)</div>
                <img id="vceCompareAfterImg" style="width: 100%; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);" alt="After">
              </div>
            </div>
          </div>
        </div>

        <!-- Diff & Confirmation Modal -->
        <div id="vceApplyConfirmModal" class="vce-modal-backdrop" style="display: none;">
          <div class="vce-modal-card">
            <div class="vce-modal-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Review & Apply Visual CSS Changes</span>
              </div>
              <button class="vce-btn" id="vceBtnCloseApplyModal" style="padding: 2px 6px;">✕</button>
            </div>
            <div class="vce-modal-body">
              <div class="vce-diff-meta">
                <span><strong>Target:</strong> <span id="vceApplyModalTarget"></span></span>
                <span><strong>File:</strong> styles/main.css</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">GENERATED CSS PATCH</div>
              <pre class="vce-diff-box" id="vceApplyModalDiff"></pre>
              <div style="font-size: 11px; color: var(--text-muted);">
                Applying will save this patch to project activity history and persist records to SQLite.
              </div>
            </div>
            <div class="vce-modal-footer">
              <button class="vce-btn" id="vceBtnCancelApply">Cancel</button>
              <button class="vce-btn vce-btn-primary" id="vceBtnConfirmApply">Confirm & Apply Patch</button>
            </div>
          </div>
        </div>
      `;
    }

    setupResizeObserver() {
      const canvas = document.getElementById('vcePreviewCanvas');
      if (canvas && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.zoomMode === 'fit') {
            this.updateViewportScale();
          }
        });
        this.resizeObserver.observe(canvas);
      }
    }

    updateViewportScale() {
      const canvas = document.getElementById('vcePreviewCanvas');
      const scaler = document.getElementById('vceScalerWrapper');
      const frame = document.getElementById('vceViewportFrame');
      if (!canvas || !scaler || !frame) return;

      const preset = this.devicePresets[this.currentDevice] || this.devicePresets.desktop;
      const targetW = preset.width;
      const targetH = preset.height;

      let scale = 1.0;
      if (this.zoomMode === 'fit') {
        const padX = 24;
        const padY = 24;
        const availW = Math.max(160, canvas.clientWidth - padX);
        const availH = Math.max(160, canvas.clientHeight - padY);
        scale = Math.min(1.0, Math.min(availW / targetW, availH / targetH));
      } else {
        scale = (parseFloat(this.zoomMode) || 100) / 100;
      }

      scaler.style.width = Math.round(targetW * scale) + 'px';
      scaler.style.height = Math.round(targetH * scale) + 'px';
      scaler.style.position = 'relative';
      scaler.style.margin = 'auto';

      frame.style.width = targetW + 'px';
      frame.style.height = targetH + 'px';
      frame.style.transform = `scale(${scale})`;
      frame.style.transformOrigin = '0 0';

      const dimBadge = document.getElementById('vceViewportDimensionsBadge');
      if (dimBadge) {
        const pct = Math.round(scale * 100);
        dimBadge.textContent = `${targetW} × ${targetH} (${pct}%)`;
      }
    }

    setupEventListeners() {
      // 1. Device Presets
      this.container.querySelectorAll('.vce-device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.container.querySelectorAll('.vce-device-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.setDevice(btn.dataset.device);
        });
      });

      // 2. Zoom Controls
      const zoomSelect = document.getElementById('vceZoomSelect');
      if (zoomSelect) {
        zoomSelect.addEventListener('change', (e) => {
          this.zoomMode = e.target.value;
          this.updateViewportScale();
        });
      }

      // 3. Load Site by URL
      const btnLoadUrl = document.getElementById('vceBtnLoadUrl');
      const urlInput = document.getElementById('vceUrlInput');
      if (btnLoadUrl && urlInput) {
        btnLoadUrl.addEventListener('click', () => {
          const url = urlInput.value.trim();
          if (url) this.loadWebsite(url);
        });
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const url = urlInput.value.trim();
            if (url) this.loadWebsite(url);
          }
        });
      }

      // 4. Project Selector Change
      const projSelect = document.getElementById('vceProjectSelect');
      if (projSelect) {
        projSelect.addEventListener('change', (e) => {
          const val = e.target.value;
          if (val === 'url') {
            this.currentMode = 'url';
          } else if (val.startsWith('db_')) {
            this.currentMode = 'db';
            const selectedOpt = projSelect.options[projSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset.url) {
              this.loadWebsite(selectedOpt.dataset.url);
            }
          } else if (val.startsWith('local_')) {
            this.currentMode = 'local';
            const selectedOpt = projSelect.options[projSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset.path) {
              this.loadLocalProject(selectedOpt.dataset.path);
            }
          }
        });
      }

      // 5. Left Pane Tabs (Tree / Tokens / Code)
      const tabTree = document.getElementById('vceTabTree');
      const tabTokens = document.getElementById('vceTabTokens');
      const tabCode = document.getElementById('vceTabCode');
      const cTree = document.getElementById('vceElementTreeContainer');
      const cTokens = document.getElementById('vceTokensContainer');
      const cCode = document.getElementById('vceCodeViewContainer');

      const switchLeftTab = (activeTab, activeContainer) => {
        [tabTree, tabTokens, tabCode].forEach(t => t.classList.remove('active'));
        [cTree, cTokens, cCode].forEach(c => c.style.display = 'none');
        activeTab.classList.add('active');
        activeContainer.style.display = 'block';
      };

      if (tabTree && tabTokens && tabCode) {
        tabTree.addEventListener('click', () => switchLeftTab(tabTree, cTree));
        tabTokens.addEventListener('click', () => switchLeftTab(tabTokens, cTokens));
        tabCode.addEventListener('click', () => {
          switchLeftTab(tabCode, cCode);
          this.updateCodeView();
        });
      }

      // 6. Element Search filter
      const searchEl = document.getElementById('vceElementSearch');
      if (searchEl) {
        searchEl.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          document.querySelectorAll('.vce-tree-item').forEach(item => {
            const text = (item.textContent || '').toLowerCase();
            item.style.display = text.includes(q) ? 'flex' : 'none';
          });
        });
      }

      // 7. Suggestions Pills
      this.container.querySelectorAll('.vce-suggestion-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const cmdInput = document.getElementById('vceCommandInput');
          if (cmdInput) {
            cmdInput.value = pill.dataset.prompt;
            cmdInput.focus();
          }
        });
      });

      // 8. Generate Patch Button
      const btnGen = document.getElementById('vceBtnGeneratePatch');
      if (btnGen) {
        btnGen.addEventListener('click', () => this.triggerGeneratePatch());
      }

      // 9. Proposal Actions
      const btnPreviewProposal = document.getElementById('vceBtnPreviewProposal');
      const btnDiscardProposal = document.getElementById('vceBtnDiscardProposal');
      const btnApplyProposal = document.getElementById('vceBtnApplyProposal');

      if (btnPreviewProposal) btnPreviewProposal.addEventListener('click', () => this.previewPatch());
      if (btnDiscardProposal) btnDiscardProposal.addEventListener('click', () => this.discardProposal());
      if (btnApplyProposal) btnApplyProposal.addEventListener('click', () => this.applyChanges());

      // 10. Top toolbar action buttons
      const btnRefresh = document.getElementById('vceBtnRefresh');
      const btnCompare = document.getElementById('vceBtnCompare');
      const btnVerify = document.getElementById('vceBtnVerify');
      const btnApply = document.getElementById('vceBtnApply');
      const btnResetAll = document.getElementById('vceBtnResetChanges');
      const btnResetEl = document.getElementById('vceBtnResetElement');

      if (btnRefresh) btnRefresh.addEventListener('click', () => this.loadWebsite(this.currentUrl));
      if (btnCompare) btnCompare.addEventListener('click', () => this.openCompareModal());
      if (btnVerify) btnVerify.addEventListener('click', () => this.runVerification());
      if (btnApply) btnApply.addEventListener('click', () => this.applyChanges());
      if (btnResetAll) btnResetAll.addEventListener('click', () => this.resetAllChanges());
      if (btnResetEl) btnResetEl.addEventListener('click', () => this.resetSelectedElement());

      // 11. Compare modal close
      const btnCloseCompare = document.getElementById('vceBtnCloseCompare');
      const compareModal = document.getElementById('vceCompareModal');
      if (btnCloseCompare && compareModal) {
        btnCloseCompare.addEventListener('click', () => {
          compareModal.style.display = 'none';
        });
      }

      // 12. Apply confirmation modal
      const btnCloseApplyModal = document.getElementById('vceBtnCloseApplyModal');
      const btnCancelApply = document.getElementById('vceBtnCancelApply');
      const btnConfirmApply = document.getElementById('vceBtnConfirmApply');
      const applyModal = document.getElementById('vceApplyConfirmModal');

      if (btnCloseApplyModal && applyModal) {
        btnCloseApplyModal.addEventListener('click', () => { applyModal.style.display = 'none'; });
      }
      if (btnCancelApply && applyModal) {
        btnCancelApply.addEventListener('click', () => { applyModal.style.display = 'none'; });
      }
      if (btnConfirmApply) {
        btnConfirmApply.addEventListener('click', () => this.confirmAndApplyPatch());
      }

      // 13. Spacing Link Toggles
      const btnLinkMargin = document.getElementById('vceBtnLinkMargin');
      const textLinkMargin = document.getElementById('vceLinkMarginText');
      if (btnLinkMargin) {
        btnLinkMargin.addEventListener('click', () => {
          this.linkedMargin = !this.linkedMargin;
          btnLinkMargin.classList.toggle('active', this.linkedMargin);
          if (textLinkMargin) textLinkMargin.textContent = this.linkedMargin ? 'Linked' : 'Unlinked';
        });
      }

      const btnLinkPadding = document.getElementById('vceBtnLinkPadding');
      const textLinkPadding = document.getElementById('vceLinkPaddingText');
      if (btnLinkPadding) {
        btnLinkPadding.addEventListener('click', () => {
          this.linkedPadding = !this.linkedPadding;
          btnLinkPadding.classList.toggle('active', this.linkedPadding);
          if (textLinkPadding) textLinkPadding.textContent = this.linkedPadding ? 'Linked' : 'Unlinked';
        });
      }

      // 14. Setup Inspector Controls (Typo, Dim, Spacing, Color, Border, Effects)
      this.setupInspectorControls();

      // 15. Property-level Reset Buttons
      this.container.querySelectorAll('.vce-prop-reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prop = btn.dataset.reset;
          if (prop) this.resetProperty(prop);
        });
      });

      // 16. Message listener from Proxy Iframe Bridge
      window.addEventListener('message', (ev) => {
        if (!ev.data) return;
        if (ev.data.type === 'VCE_ELEMENT_SELECTED') {
          const d = ev.data;
          this.selectElement({
            selector: d.selector,
            tag: d.tag,
            id: d.id,
            className: d.className,
            label: d.text || d.selector,
            styles: d.styles || {},
            rect: d.rect || null
          });
        } else if (ev.data.type === 'VCE_BRIDGE_READY') {
          this.syncOverridesToPreview();
        }
      });
    }

    setupInspectorControls() {
      // 1. Typography Controls
      const inputFontFamily = document.getElementById('vceInputFontFamily');
      if (inputFontFamily) {
        inputFontFamily.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('fontFamily', e.target.value.trim());
        });
      }

      const sliderFont = document.getElementById('vceSliderFontSize');
      const inputFont = document.getElementById('vceInputFontSize');
      if (sliderFont && inputFont) {
        sliderFont.addEventListener('input', (e) => {
          inputFont.value = e.target.value + 'px';
          this.updateSelectedElementStyle('fontSize', e.target.value + 'px');
        });
        inputFont.addEventListener('change', (e) => {
          let val = e.target.value.trim();
          if (val && !isNaN(val)) val += 'px';
          this.updateSelectedElementStyle('fontSize', val);
        });
      }

      const selectWeight = document.getElementById('vceSelectFontWeight');
      if (selectWeight) {
        selectWeight.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('fontWeight', e.target.value);
        });
      }

      const inputLineHeight = document.getElementById('vceInputLineHeight');
      if (inputLineHeight) {
        inputLineHeight.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('lineHeight', e.target.value.trim());
        });
      }

      const inputLetterSpacing = document.getElementById('vceInputLetterSpacing');
      if (inputLetterSpacing) {
        inputLetterSpacing.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('letterSpacing', e.target.value.trim());
        });
      }

      const selectTextTransform = document.getElementById('vceSelectTextTransform');
      if (selectTextTransform) {
        selectTextTransform.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('textTransform', e.target.value);
        });
      }

      const selectTextAlign = document.getElementById('vceSelectTextAlign');
      if (selectTextAlign) {
        selectTextAlign.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('textAlign', e.target.value);
        });
      }

      // 2. Dimensions Controls
      const dimFields = [
        { id: 'vceInputWidth', prop: 'width' },
        { id: 'vceInputMinWidth', prop: 'minWidth' },
        { id: 'vceInputMaxWidth', prop: 'maxWidth' },
        { id: 'vceInputHeight', prop: 'height' },
        { id: 'vceInputMinHeight', prop: 'minHeight' },
        { id: 'vceInputMaxHeight', prop: 'maxHeight' }
      ];

      dimFields.forEach(({ id, prop }) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (val && !isNaN(val)) val += 'px';
            this.updateSelectedElementStyle(prop, val);
          });
        }
      });

      // 3. Spacing: Margin Quad Controls
      const marginSides = [
        { id: 'vceInputMarginTop', prop: 'marginTop' },
        { id: 'vceInputMarginRight', prop: 'marginRight' },
        { id: 'vceInputMarginBottom', prop: 'marginBottom' },
        { id: 'vceInputMarginLeft', prop: 'marginLeft' }
      ];

      marginSides.forEach(({ id, prop }) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (val && !isNaN(val)) val += 'px';
            if (this.linkedMargin) {
              marginSides.forEach(s => {
                const other = document.getElementById(s.id);
                if (other) other.value = val;
                this.updateSelectedElementStyle(s.prop, val);
              });
            } else {
              this.updateSelectedElementStyle(prop, val);
            }
          });
        }
      });

      // 4. Spacing: Padding Quad Controls
      const paddingSides = [
        { id: 'vceInputPaddingTop', prop: 'paddingTop' },
        { id: 'vceInputPaddingRight', prop: 'paddingRight' },
        { id: 'vceInputPaddingBottom', prop: 'paddingBottom' },
        { id: 'vceInputPaddingLeft', prop: 'paddingLeft' }
      ];

      paddingSides.forEach(({ id, prop }) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('change', (e) => {
            let val = e.target.value.trim();
            if (val && !isNaN(val)) val += 'px';
            if (this.linkedPadding) {
              paddingSides.forEach(s => {
                const other = document.getElementById(s.id);
                if (other) other.value = val;
                this.updateSelectedElementStyle(s.prop, val);
              });
            } else {
              this.updateSelectedElementStyle(prop, val);
            }
          });
        }
      });

      // 5. Colors & Background (Synchronized)
      const colorText = document.getElementById('vceColorPickerText');
      const inputText = document.getElementById('vceInputTextColor');
      if (colorText && inputText) {
        colorText.addEventListener('input', (e) => {
          inputText.value = e.target.value;
          this.updateSelectedElementStyle('color', e.target.value);
        });
        inputText.addEventListener('change', (e) => {
          const val = e.target.value.trim();
          colorText.value = toHexColor(val);
          this.updateSelectedElementStyle('color', val);
        });
      }

      const colorBg = document.getElementById('vceColorPickerBg');
      const inputBg = document.getElementById('vceInputBgColor');
      if (colorBg && inputBg) {
        colorBg.addEventListener('input', (e) => {
          inputBg.value = e.target.value;
          this.updateSelectedElementStyle('backgroundColor', e.target.value);
        });
        inputBg.addEventListener('change', (e) => {
          const val = e.target.value.trim();
          colorBg.value = toHexColor(val);
          this.updateSelectedElementStyle('backgroundColor', val);
        });
      }

      const sliderOpacity = document.getElementById('vceSliderOpacity');
      const inputOpacity = document.getElementById('vceInputOpacity');
      if (sliderOpacity && inputOpacity) {
        sliderOpacity.addEventListener('input', (e) => {
          inputOpacity.value = e.target.value;
          this.updateSelectedElementStyle('opacity', e.target.value);
        });
        inputOpacity.addEventListener('change', (e) => {
          let val = parseFloat(e.target.value);
          if (isNaN(val)) val = 1;
          val = Math.max(0, Math.min(1, val));
          sliderOpacity.value = val;
          inputOpacity.value = val;
          this.updateSelectedElementStyle('opacity', String(val));
        });
      }

      // 6. Border & Radius
      const sliderRad = document.getElementById('vceSliderRadius');
      const inputRad = document.getElementById('vceInputRadius');
      if (sliderRad && inputRad) {
        sliderRad.addEventListener('input', (e) => {
          inputRad.value = e.target.value + 'px';
          this.updateSelectedElementStyle('borderRadius', e.target.value + 'px');
        });
        inputRad.addEventListener('change', (e) => {
          let val = e.target.value.trim();
          if (val && !isNaN(val)) val += 'px';
          this.updateSelectedElementStyle('borderRadius', val);
        });
      }

      const inputBorder = document.getElementById('vceInputBorder');
      if (inputBorder) {
        inputBorder.addEventListener('change', (e) => {
          this.updateSelectedElementStyle('border', e.target.value.trim());
        });
      }

      // 7. Effects Controls
      const effectFields = [
        { id: 'vceInputBoxShadow', prop: 'boxShadow' },
        { id: 'vceInputTransform', prop: 'transform' },
        { id: 'vceInputTransition', prop: 'transition' }
      ];

      effectFields.forEach(({ id, prop }) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('change', (e) => {
            this.updateSelectedElementStyle(prop, e.target.value.trim());
          });
        }
      });
    }

    /**
     * Centralized Multi-Element Style Update Function
     * Updates previewOverrides[elementIdentity].changes[property]
     * Injects compiled CSS into managed <style> tag
     * Updates live inspector indicators, box model, and unsaved count
     */
    updateSelectedElementStyle(property, value) {
      if (!this.selectedElement || !this.selectedElement.selector) return;
      const sel = this.selectedElement.selector;
      const camelProp = toCamelCase(property);
      const kebabProp = toKebabCase(property);

      // Cache original styles once if not present
      if (!this.originalStylesMap[sel]) {
        this.originalStylesMap[sel] = { ...(this.selectedElement.styles || {}) };
      }

      // Initialize element entry in previewOverrides if needed
      if (!this.previewOverrides[sel]) {
        this.previewOverrides[sel] = {
          selector: sel,
          tag: this.selectedElement.tag || 'div',
          originalStyles: { ...(this.originalStylesMap[sel] || {}) },
          changes: {}
        };
      }

      // Apply or delete property change
      if (value === '' || value === null || value === undefined) {
        delete this.previewOverrides[sel].changes[camelProp];
        delete this.previewOverrides[sel].changes[kebabProp];
        if (Object.keys(this.previewOverrides[sel].changes).length === 0) {
          delete this.previewOverrides[sel];
        }
      } else {
        this.previewOverrides[sel].changes[camelProp] = value;
      }

      // Synchronize preview stylesheet
      this.syncOverridesToPreview();

      // Update unsaved changes count across all elements
      this.updateUnsavedCount();

      // Update inspector indicators for this element
      this.updateInspectorModifiedStates();

      // Update Live Box Model
      this.updateLiveBoxModel();

      // Update active patch representation
      this.compileActivePatch();

      // Update code view
      this.updateCodeView();
    }

    compileCurrentCss() {
      const rules = [];
      for (const [sel, entry] of Object.entries(this.previewOverrides)) {
        const changes = entry.changes || {};
        const decls = [];
        for (const [prop, val] of Object.entries(changes)) {
          if (val !== undefined && val !== null && val !== '') {
            const cssProp = toKebabCase(prop);
            decls.push(`  ${cssProp}: ${val} !important;`);
          }
        }
        if (decls.length > 0) {
          rules.push(`${entry.selector || sel} {\n${decls.join('\n')}\n}`);
        }
      }
      return rules.join('\n\n');
    }

    syncOverridesToPreview() {
      const css = this.compileCurrentCss();
      const iframe = document.getElementById('vcePreviewIframe');

      // Direct DOM injection
      if (iframe && iframe.contentDocument) {
        try {
          let styleEl = iframe.contentDocument.getElementById('webdev-ai-preview-overrides');
          if (!styleEl) {
            styleEl = iframe.contentDocument.createElement('style');
            styleEl.id = 'webdev-ai-preview-overrides';
            iframe.contentDocument.head.appendChild(styleEl);
          }
          styleEl.textContent = css;
        } catch (e) {}
      }

      // PostMessage to bridge script
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'VCE_UPDATE_CSS',
          cssText: css
        }, '*');
      }
    }

    updateUnsavedCount() {
      let count = 0;
      for (const sel of Object.keys(this.previewOverrides)) {
        count += Object.keys(this.previewOverrides[sel].changes || {}).length;
      }
      this.unsavedChanges = count;
      this.updateUnsavedIndicator();
    }

    updateUnsavedIndicator() {
      const indicator = document.getElementById('vceUnsavedIndicator');
      const count = document.getElementById('vceUnsavedCount');
      const btnResetAll = document.getElementById('vceBtnResetChanges');
      if (indicator && count) {
        if (this.unsavedChanges > 0) {
          indicator.style.display = 'inline-flex';
          count.textContent = `${this.unsavedChanges} unsaved changes`;
          if (btnResetAll) btnResetAll.style.display = 'inline-flex';
        } else {
          indicator.style.display = 'none';
          if (btnResetAll) btnResetAll.style.display = 'none';
        }
      }
    }

    resetProperty(prop) {
      if (!this.selectedElement || !this.selectedElement.selector) return;
      const sel = this.selectedElement.selector;
      const camelProp = toCamelCase(prop);

      if (this.previewOverrides[sel] && this.previewOverrides[sel].changes) {
        delete this.previewOverrides[sel].changes[camelProp];
        delete this.previewOverrides[sel].changes[toKebabCase(prop)];
        if (Object.keys(this.previewOverrides[sel].changes).length === 0) {
          delete this.previewOverrides[sel];
        }
      }

      this.syncOverridesToPreview();
      this.updateUnsavedCount();
      this.hydrateInspector(this.selectedElement);
      this.showToast(`Reset ${toKebabCase(prop)} to original value.`);
    }

    resetSelectedElement() {
      if (!this.selectedElement || !this.selectedElement.selector) return;
      const sel = this.selectedElement.selector;

      if (this.previewOverrides[sel]) {
        delete this.previewOverrides[sel];
        this.syncOverridesToPreview();
        this.updateUnsavedCount();
        this.hydrateInspector(this.selectedElement);
        this.showToast(`Reset all overrides for <${this.selectedElement.tag || 'element'}>.`);
      }
    }

    resetAllChanges() {
      this.previewOverrides = {};
      this.syncOverridesToPreview();
      this.unsavedChanges = 0;
      this.activePatch = null;
      this.updateUnsavedIndicator();

      if (this.selectedElement) {
        this.hydrateInspector(this.selectedElement);
      }
      this.updateCodeView();
      this.showToast('All visual overrides reset to original website styles.');
    }

    compileActivePatch() {
      const css = this.compileCurrentCss();
      const selList = Object.keys(this.previewOverrides);
      this.activePatch = {
        selector: this.selectedElement ? this.selectedElement.selector : (selList[0] || 'element'),
        cssPatch: css,
        explanation: `Visual CSS modifications across ${selList.length} element(s) (${this.unsavedChanges} properties)`,
        risk: 'Low',
        affectedFiles: ['styles/main.css']
      };
    }

    selectElement(el) {
      this.selectedElement = el;
      const sel = el.selector;

      // Update tree active highlight
      document.querySelectorAll('.vce-tree-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.selector === sel);
      });

      // Cache original styles
      if (!this.originalStylesMap[sel]) {
        this.originalStylesMap[sel] = { ...(el.styles || {}) };
      }

      // Hydrate inspector with original + any existing overrides
      this.hydrateInspector(el);

      // Notify iframe bridge to outline element
      const iframe = document.getElementById('vcePreviewIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'VCE_SELECT_BY_SELECTOR',
          selector: sel
        }, '*');
      }
    }

    hydrateInspector(el) {
      const sel = el.selector;
      const content = document.getElementById('vceInspectorContent');
      const empty = document.getElementById('vceInspectorEmpty');
      const tagBadge = document.getElementById('vceSelectedTagBadge');
      const selectorDisplay = document.getElementById('vceInspectSelectorDisplay');

      if (tagBadge) tagBadge.textContent = '<' + el.tag + '>';
      if (selectorDisplay) selectorDisplay.textContent = sel;
      if (content) content.style.display = 'block';
      if (empty) empty.style.display = 'none';

      // Original computed styles + existing overrides
      const original = this.originalStylesMap[sel] || el.styles || {};
      const existingEntry = this.previewOverrides[sel];
      const changes = existingEntry ? existingEntry.changes : {};
      const effective = { ...original, ...changes };

      // 1. Typography Hydration
      const inputFontFamily = document.getElementById('vceInputFontFamily');
      if (inputFontFamily) inputFontFamily.value = effective.fontFamily || '';

      const sliderFont = document.getElementById('vceSliderFontSize');
      const inputFont = document.getElementById('vceInputFontSize');
      if (effective.fontSize) {
        const px = parseInt(effective.fontSize, 10) || 16;
        if (sliderFont) sliderFont.value = px;
        if (inputFont) inputFont.value = effective.fontSize;
      }

      const selectWeight = document.getElementById('vceSelectFontWeight');
      if (selectWeight && effective.fontWeight) {
        selectWeight.value = effective.fontWeight;
      }

      const inputLineHeight = document.getElementById('vceInputLineHeight');
      if (inputLineHeight) inputLineHeight.value = effective.lineHeight || '1.5';

      const inputLetterSpacing = document.getElementById('vceInputLetterSpacing');
      if (inputLetterSpacing) inputLetterSpacing.value = effective.letterSpacing || 'normal';

      const selectTextTransform = document.getElementById('vceSelectTextTransform');
      if (selectTextTransform && effective.textTransform) selectTextTransform.value = effective.textTransform;

      const selectTextAlign = document.getElementById('vceSelectTextAlign');
      if (selectTextAlign && effective.textAlign) selectTextAlign.value = effective.textAlign;

      // 2. Dimensions Hydration
      const setDimVal = (id, val, fallback) => {
        const input = document.getElementById(id);
        if (input) input.value = val || fallback;
      };
      setDimVal('vceInputWidth', effective.width, 'auto');
      setDimVal('vceInputMinWidth', effective.minWidth, '0px');
      setDimVal('vceInputMaxWidth', effective.maxWidth, 'none');
      setDimVal('vceInputHeight', effective.height, 'auto');
      setDimVal('vceInputMinHeight', effective.minHeight, '0px');
      setDimVal('vceInputMaxHeight', effective.maxHeight, 'none');

      // 3. Spacing: Margin Quad Hydration
      setDimVal('vceInputMarginTop', effective.marginTop, '0px');
      setDimVal('vceInputMarginRight', effective.marginRight, '0px');
      setDimVal('vceInputMarginBottom', effective.marginBottom, '0px');
      setDimVal('vceInputMarginLeft', effective.marginLeft, '0px');

      // 4. Spacing: Padding Quad Hydration
      setDimVal('vceInputPaddingTop', effective.paddingTop, '0px');
      setDimVal('vceInputPaddingRight', effective.paddingRight, '0px');
      setDimVal('vceInputPaddingBottom', effective.paddingBottom, '0px');
      setDimVal('vceInputPaddingLeft', effective.paddingLeft, '0px');

      // 5. Colors & Background
      const colorText = document.getElementById('vceColorPickerText');
      const inputText = document.getElementById('vceInputTextColor');
      if (effective.color) {
        if (colorText) colorText.value = toHexColor(effective.color);
        if (inputText) inputText.value = effective.color;
      }

      const colorBg = document.getElementById('vceColorPickerBg');
      const inputBg = document.getElementById('vceInputBgColor');
      if (effective.backgroundColor) {
        if (colorBg) colorBg.value = toHexColor(effective.backgroundColor);
        if (inputBg) inputBg.value = effective.backgroundColor;
      }

      const sliderOpacity = document.getElementById('vceSliderOpacity');
      const inputOpacity = document.getElementById('vceInputOpacity');
      if (effective.opacity !== undefined) {
        if (sliderOpacity) sliderOpacity.value = effective.opacity;
        if (inputOpacity) inputOpacity.value = effective.opacity;
      }

      // 6. Border & Radius
      const sliderRad = document.getElementById('vceSliderRadius');
      const inputRad = document.getElementById('vceInputRadius');
      if (effective.borderRadius) {
        const radPx = parseInt(effective.borderRadius, 10) || 0;
        if (sliderRad) sliderRad.value = radPx;
        if (inputRad) inputRad.value = effective.borderRadius;
      }

      const inputBorder = document.getElementById('vceInputBorder');
      if (inputBorder) inputBorder.value = effective.border || 'none';

      // 7. Effects
      setDimVal('vceInputBoxShadow', effective.boxShadow, 'none');
      setDimVal('vceInputTransform', effective.transform, 'none');
      setDimVal('vceInputTransition', effective.transition, 'none');

      // Update Live Box Model
      this.updateLiveBoxModel(effective, el.rect);

      // Update Modified Indicators
      this.updateInspectorModifiedStates();
    }

    updateInspectorModifiedStates() {
      if (!this.selectedElement || !this.selectedElement.selector) return;
      const sel = this.selectedElement.selector;
      const entry = this.previewOverrides[sel];
      const changes = entry ? entry.changes : {};
      const numChanges = Object.keys(changes).length;

      // Header modified badge and reset element button
      const modBadge = document.getElementById('vceInspectModifiedBadge');
      const btnResetEl = document.getElementById('vceBtnResetElement');
      if (modBadge) {
        if (numChanges > 0) {
          modBadge.style.display = 'inline-block';
          modBadge.textContent = `Modified (${numChanges})`;
        } else {
          modBadge.style.display = 'none';
        }
      }
      if (btnResetEl) {
        btnResetEl.style.display = numChanges > 0 ? 'inline-flex' : 'none';
      }

      // Individual property rows
      this.container.querySelectorAll('.vce-property-row, .vce-quad-item').forEach(row => {
        const prop = row.dataset.prop;
        if (prop) {
          const isMod = changes[prop] !== undefined || changes[toKebabCase(prop)] !== undefined;
          row.classList.toggle('is-modified', isMod);
          const resetBtn = row.querySelector('.vce-prop-reset-btn');
          if (resetBtn) {
            resetBtn.classList.toggle('hidden', !isMod);
          }
        }
      });
    }

    updateLiveBoxModel(effectiveData, rectData) {
      if (!this.selectedElement) return;
      const sel = this.selectedElement.selector;
      const effective = effectiveData || {
        ...(this.originalStylesMap[sel] || {}),
        ...(this.previewOverrides[sel]?.changes || {})
      };
      const rect = rectData || this.selectedElement.rect || { width: 240, height: 48 };

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '0px';
      };

      setVal('vceBmMarginTop', effective.marginTop);
      setVal('vceBmMarginRight', effective.marginRight);
      setVal('vceBmMarginBottom', effective.marginBottom);
      setVal('vceBmMarginLeft', effective.marginLeft);

      setVal('vceBmPaddingTop', effective.paddingTop);
      setVal('vceBmPaddingRight', effective.paddingRight);
      setVal('vceBmPaddingBottom', effective.paddingBottom);
      setVal('vceBmPaddingLeft', effective.paddingLeft);

      const bmBorder = document.getElementById('vceBmBorder');
      if (bmBorder) bmBorder.textContent = (effective.border && effective.border !== 'none') ? effective.border : 'none';

      const bmContent = document.getElementById('vceBmContent');
      if (bmContent) {
        const w = effective.width && effective.width !== 'auto' ? effective.width : Math.round(rect.width) + 'px';
        const h = effective.height && effective.height !== 'auto' ? effective.height : Math.round(rect.height) + 'px';
        bmContent.textContent = `${w} × ${h}`;
      }
    }

    setDevice(deviceId) {
      this.currentDevice = deviceId;
      this.updateViewportScale();
    }

    async loadWebsite(url) {
      if (!url) return;
      let targetUrl = url.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      this.currentUrl = targetUrl;

      const urlDisplay = document.getElementById('vceViewportUrlDisplay');
      const urlInput = document.getElementById('vceUrlInput');
      if (urlDisplay) urlDisplay.textContent = targetUrl;
      if (urlInput) urlInput.value = targetUrl;

      const iframe = document.getElementById('vcePreviewIframe');
      const snapshot = document.getElementById('vcePreviewSnapshot');

      if (snapshot) snapshot.style.display = 'none';
      if (iframe) {
        iframe.style.display = 'block';
        iframe.src = `/api/visual-css/proxy?url=${encodeURIComponent(targetUrl)}`;
      }

      this.updateViewportScale();

      // Call backend analyzer to fetch DOM tree and tokens in background
      try {
        const res = await fetch('/api/visual-css/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            url: targetUrl,
            viewport: this.devicePresets[this.currentDevice] || this.devicePresets.desktop
          })
        });

        if (res.ok) {
          const data = await res.json();
          this.beforeScreenshot = data.screenshot;
          this.domElements = data.elements || [];
          this.designTokens = data.tokens || { colors: [], spacing: [], typography: [], radius: [], shadows: [], rawVariables: {} };

          this.renderElementTree(this.domElements);
          this.renderTokens(this.designTokens);

          if (this.domElements.length > 0 && !this.selectedElement) {
            const first = this.domElements.find(e => e.role === 'Heading') || this.domElements[0];
            this.selectElement(first);
          }
        }
      } catch (err) {
        console.warn('[VisualCss] Analyzer load note:', err.message);
      }
    }

    renderElementTree(elements) {
      const container = document.getElementById('vceElementTreeContainer');
      const countBadge = document.getElementById('vceElementsCount');
      if (countBadge) countBadge.textContent = elements.length;
      if (!container) return;

      if (!elements || elements.length === 0) {
        container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 12px;">No semantic elements detected in document.</div>';
        return;
      }

      container.innerHTML = '';
      elements.forEach(el => {
        const item = document.createElement('div');
        item.className = 'vce-tree-item';
        item.dataset.selector = el.selector;
        item.innerHTML = `
          <span class="vce-tree-tag">${escapeHtml(el.tag)}</span>
          <span class="vce-tree-label">${escapeHtml(el.label)}</span>
        `;
        item.addEventListener('click', () => this.selectElement(el));
        container.appendChild(item);
      });
    }

    renderTokens(tokens) {
      const list = document.getElementById('vceTokensList');
      if (!list) return;

      const hasColors = tokens.colors && tokens.colors.length > 0;
      const hasSpacing = tokens.spacing && tokens.spacing.length > 0;
      const hasRadius = tokens.radius && tokens.radius.length > 0;

      if (!hasColors && !hasSpacing && !hasRadius) {
        list.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">No design tokens detected in this project.</div>';
        return;
      }

      let html = '';
      if (hasColors) {
        html += '<div style="font-size: 11px; font-weight: 700; margin-bottom: 8px; color: var(--text-muted);">COLOR TOKENS</div>';
        tokens.colors.forEach(c => {
          html += `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 6px; font-family: var(--font-mono);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; border-radius: 2px; background: ${c.value}; display: inline-block; border: 1px solid rgba(255,255,255,0.2);"></span>
                <span>${c.name}</span>
              </div>
              <span style="color: var(--text-muted);">${c.value}</span>
            </div>
          `;
        });
      }

      list.innerHTML = html;
    }

    async triggerGeneratePatch() {
      const cmdInput = document.getElementById('vceCommandInput');
      const prompt = cmdInput ? cmdInput.value.trim() : '';
      if (!prompt) return;

      this.isGenerating = true;
      const btn = document.getElementById('vceBtnGeneratePatch');
      if (btn) btn.innerHTML = '<span>Generating...</span>';

      try {
        const res = await fetch('/api/visual-css/patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt,
            selectedElement: this.selectedElement || { tag: 'div', selector: '.element' },
            computedStyles: this.selectedElement ? this.selectedElement.styles : {},
            projectTokens: this.designTokens
          })
        });

        if (res.ok) {
          const data = await res.json();
          this.activePatch = data;
          this.renderProposalCard(data);
          this.showToast('AI Proposed patch ready for preview and application.');
        }
      } catch (err) {
        this.showToast('Failed to generate patch: ' + err.message);
      } finally {
        this.isGenerating = false;
        if (btn) {
          btn.innerHTML = '<span>Generate Patch</span><span class="kbd" style="font-size: 9px; padding: 1px 4px; margin-left: 4px;">⌘↵</span>';
        }
      }
    }

    renderProposalCard(data) {
      const card = document.getElementById('vceProposalCard');
      const exp = document.getElementById('vceProposalExplanation');
      const code = document.getElementById('vceProposalPatchCode');
      const risk = document.getElementById('vceProposalRiskBadge');
      if (!card || !exp || !code) return;

      exp.textContent = data.explanation || 'Proposed CSS Patch';
      code.textContent = data.cssPatch || '';
      if (risk) {
        risk.textContent = 'Risk: ' + (data.risk || 'Low');
        risk.className = 'vce-badge vce-badge-' + (data.risk || 'low').toLowerCase();
      }

      card.style.display = 'flex';
      this.unsavedChanges++;
      this.updateUnsavedIndicator();
    }

    /**
     * Merge AI proposed patch into previewOverrides so manual and AI edits coexist
     */
    previewPatch() {
      if (!this.activePatch || !this.activePatch.cssPatch) return;
      const patch = this.activePatch.cssPatch;

      // Parse rules and merge into previewOverrides
      const sel = this.selectedElement ? this.selectedElement.selector : 'body';
      const lines = patch.split(';').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const prop = parts[0].replace(/.*\{/, '').trim();
          const val = parts.slice(1).join(':').replace(/!important/g, '').replace(/\}.*/, '').trim();
          if (prop && val) {
            const camel = toCamelCase(prop);
            if (!this.previewOverrides[sel]) {
              this.previewOverrides[sel] = {
                selector: sel,
                tag: this.selectedElement ? this.selectedElement.tag : 'div',
                originalStyles: { ...(this.originalStylesMap[sel] || {}) },
                changes: {}
              };
            }
            this.previewOverrides[sel].changes[camel] = val;
          }
        }
      });

      this.syncOverridesToPreview();
      this.updateUnsavedCount();
      if (this.selectedElement) {
        this.hydrateInspector(this.selectedElement);
      }
      this.showToast('Live preview updated with proposed patch merged.');
    }

    discardProposal() {
      const card = document.getElementById('vceProposalCard');
      if (card) card.style.display = 'none';
      this.activePatch = null;
      this.showToast('Proposal discarded.');
    }

    async runVerification() {
      if (!this.activePatch || !this.activePatch.cssPatch) {
        this.showToast('Generate or define a CSS patch first before verifying.');
        return;
      }

      this.isVerifying = true;
      const btn = document.getElementById('vceBtnVerify');
      if (btn) btn.innerHTML = '<span>Verifying...</span>';

      try {
        const res = await fetch('/api/visual-css/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            targetUrl: this.currentUrl,
            selector: this.selectedElement ? this.selectedElement.selector : 'body',
            cssPatch: this.activePatch.cssPatch
          })
        });

        if (res.ok) {
          const data = await res.json();
          this.verificationResults = data;
          this.afterScreenshots = data.screenshots || {};

          if (data.hasIssues) {
            this.showToast(`Verification detected ${data.totalIssuesCount} responsive issue(s). Auto-fixing...`);
            await this.runAutoFix(data.issuesList);
          } else {
            this.showToast('✓ Playwright Verification Passed! No horizontal overflow or layout clipping detected across viewports.');
          }
        }
      } catch (err) {
        this.showToast('Verification failed: ' + err.message);
      } finally {
        this.isVerifying = false;
        if (btn) btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>Verify</span>';
      }
    }

    async runAutoFix(issuesList) {
      this.autoFixIteration++;
      try {
        const res = await fetch('/api/visual-css/autofix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            originalPatch: this.activePatch.cssPatch,
            selector: this.selectedElement ? this.selectedElement.selector : 'body',
            issuesList,
            iteration: this.autoFixIteration
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.refinedPatch) {
            this.activePatch.cssPatch = data.refinedPatch;
            this.renderProposalCard(this.activePatch);
            this.previewPatch();
            this.showToast('✓ Auto-Fix Applied: ' + data.message);
          }
        }
      } catch (e) {}
    }

    openCompareModal() {
      const modal = document.getElementById('vceCompareModal');
      const beforeImg = document.getElementById('vceCompareBeforeImg');
      const afterImg = document.getElementById('vceCompareAfterImg');

      if (!modal) return;
      if (beforeImg && this.beforeScreenshot) beforeImg.src = this.beforeScreenshot;
      if (afterImg) {
        const curAfter = this.afterScreenshots[this.currentDevice] || this.beforeScreenshot;
        afterImg.src = curAfter || '';
      }
      modal.style.display = 'flex';
    }

    applyChanges() {
      const hasChanges = this.unsavedChanges > 0 || (this.activePatch && this.activePatch.cssPatch);
      if (!hasChanges) {
        this.showToast('No active changes to apply. Make changes in the CSS inspector or generate an AI patch first.');
        return;
      }

      this.compileActivePatch();

      const modal = document.getElementById('vceApplyConfirmModal');
      const targetDisplay = document.getElementById('vceApplyModalTarget');
      const diffDisplay = document.getElementById('vceApplyModalDiff');

      if (targetDisplay) targetDisplay.textContent = this.currentUrl;
      if (diffDisplay) diffDisplay.textContent = this.activePatch.cssPatch;
      if (modal) modal.style.display = 'flex';
    }

    async confirmAndApplyPatch() {
      const modal = document.getElementById('vceApplyConfirmModal');
      if (modal) modal.style.display = 'none';

      if (!this.activePatch || !this.activePatch.cssPatch) return;

      try {
        const res = await fetch('/api/visual-css/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            targetUrl: this.currentUrl,
            prompt: this.activePatch.explanation || 'Visual CSS update',
            selector: this.selectedElement ? this.selectedElement.selector : 'element',
            cssPatch: this.activePatch.cssPatch,
            affectedFiles: this.activePatch.affectedFiles || ['styles/main.css'],
            beforeScreenshot: this.beforeScreenshot,
            verificationResults: this.verificationResults
          })
        });

        if (res.ok) {
          const data = await res.json();
          this.unsavedChanges = 0;
          this.previewOverrides = {};
          this.updateUnsavedIndicator();
          if (this.selectedElement) {
            this.hydrateInspector(this.selectedElement);
          }
          this.showToast(`✓ Changes applied and saved to activity history! (ID: ${data.historyId})`);
          await this.loadHistory();
        } else {
          const err = await res.json();
          this.showToast(`Failed to apply changes: ${err.error || 'Server error'}`);
        }
      } catch (err) {
        this.showToast(`Network error: ${err.message}`);
      }
    }

    async loadHistory() {
      try {
        const res = await fetch('/api/visual-css/history', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          this.historyList = data.items || [];
        }
      } catch (e) {}
    }

    updateCodeView() {
      const codeView = document.getElementById('vceCodeViewContent');
      if (!codeView) return;
      const css = this.compileCurrentCss();
      if (css) {
        codeView.textContent = css;
      } else if (this.selectedElement && this.selectedElement.styles) {
        codeView.textContent = JSON.stringify(this.selectedElement.styles, null, 2);
      } else {
        codeView.textContent = '/* Select an element to view CSS / styles */';
      }
    }

    setupShortcuts() {
      window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        // Cmd/Ctrl + K -> Focus AI Command Bar
        if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
          const activeView = document.getElementById('viewVisualCssEngineer');
          if (activeView && activeView.style.display !== 'none') {
            e.preventDefault();
            const cmdInput = document.getElementById('vceCommandInput');
            if (cmdInput) cmdInput.focus();
          }
        }

        // Cmd/Ctrl + Enter -> Generate Patch
        if (cmdOrCtrl && e.key === 'Enter') {
          const activeView = document.getElementById('viewVisualCssEngineer');
          if (activeView && activeView.style.display !== 'none') {
            e.preventDefault();
            this.triggerGeneratePatch();
          }
        }

        // Cmd/Ctrl + S -> Apply Changes
        if (cmdOrCtrl && e.key.toLowerCase() === 's') {
          const activeView = document.getElementById('viewVisualCssEngineer');
          if (activeView && activeView.style.display !== 'none') {
            e.preventDefault();
            this.applyChanges();
          }
        }

        // Escape -> Close modals
        if (e.key === 'Escape') {
          const compareModal = document.getElementById('vceCompareModal');
          if (compareModal && compareModal.style.display !== 'none') {
            compareModal.style.display = 'none';
          }
          const applyModal = document.getElementById('vceApplyConfirmModal');
          if (applyModal && applyModal.style.display !== 'none') {
            applyModal.style.display = 'none';
          }
        }
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.VisualCssEngineerTool = VisualCssEngineerTool;
})();
