/**
 * client/js/tools/automated-qa.js
 * Controller for Dedicated Automated QA Suite (Phase 2) Page
 */

(function () {
  'use strict';

  class AutomatedQaTool {
    constructor() {
      this.container = document.getElementById('viewAutomatedQa');
      this.currentUrl = 'https://example.com/';
      this.currentDevice = this.getDefaultDevice();
      this.orientation = 'portrait';
      this.currentBrowser = 'chromium';
      this.isRunning = false;
      this.results = null;
      this.activeCategory = 'all';
      this.searchQuery = '';
      this.popoverOpen = false;
      this.lightboxData = null;

      // Suite accordion expansion states
      this.expandedSuites = {
        brokenUi: true,
        redirects: true,
        interactions: false,
        forms: false,
        accessibility: true,
        visualRegression: true
      };

      this.init();
    }

    getDefaultDevice() {
      if (window.DeviceRegistry && typeof window.DeviceRegistry.getDevice === 'function') {
        const dev = window.DeviceRegistry.getDevice('laptop-1440') || window.DeviceRegistry.getDevice('desktop-1080p');
        if (dev) return { ...dev };
      }
      return {
        id: 'laptop-1440',
        name: 'Laptop (1440 × 900)',
        playwrightName: 'Laptop 1440×900',
        viewport: { width: 1440, height: 900 },
        viewportWidth: 1440,
        viewportHeight: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        category: 'laptop',
        subCategory: 'laptops'
      };
    }

    init() {
      if (!this.container) return;
      this.render();
      this.bindGlobalEvents();
    }

    loadUrl(url) {
      if (url) {
        this.currentUrl = url;
        const input = this.container.querySelector('#qaTargetUrl');
        if (input) input.value = url;
      }
    }

    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <!-- Page Header -->
        <div class="qa-page-header">
          <div class="qa-page-title-wrap">
            <h1 class="qa-page-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Automated QA Suite</span>
            </h1>
            <p class="qa-page-subtitle">Run automated, browser-based QA checks against any website using genuine Playwright test execution.</p>
          </div>
        </div>

        <!-- Target URL & Execution Bar -->
        <div class="qa-target-card">
          <div class="qa-target-row">
            <div class="qa-url-input-wrap">
              <input type="text" class="qa-url-input" id="qaTargetUrl" value="${this.escapeHtml(this.currentUrl)}" placeholder="https://example.com/ or http://testing-ai.local">
            </div>

            <!-- Device Selector Popover Trigger -->
            <div style="position: relative;">
              <button type="button" class="qa-device-picker-trigger" id="qaDevicePickerBtn" title="Choose test device profile">
                <span id="qaPickerBtnIcon">${this.getDeviceIcon(this.currentDevice)}</span>
                <span id="qaPickerBtnName" style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(this.currentDevice.name)}</span>
                <span class="qa-dim-tag" id="qaPickerBtnDim">${this.getViewportWidth()}×${this.getViewportHeight()}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>

              <!-- Device Picker Popover -->
              <div class="qa-device-popover" id="qaDevicePopover" style="display: none;">
                <div class="qa-popover-header">
                  <input type="text" class="qa-popover-search" id="qaDeviceSearchInput" placeholder="Search devices (e.g. iPhone, Pixel, Laptop)...">
                  <div class="qa-popover-categories" id="qaDeviceCatTabs">
                    <button type="button" class="qa-popover-cat-btn active" data-cat="all">All</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="popular">Popular</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="apple">Apple</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="android">Android</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="tablets">Tablets</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="laptops">Laptops</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="desktop">Desktop</button>
                    <button type="button" class="qa-popover-cat-btn" data-cat="custom">Custom</button>
                  </div>
                </div>

                <div class="qa-popover-list" id="qaDeviceListContainer"></div>

                <!-- Custom Viewport Inputs (shown when Custom is active) -->
                <div class="qa-popover-custom-form" id="qaCustomDeviceForm" style="display: none;">
                  <div class="qa-custom-form-row">
                    <div class="qa-custom-input-group">
                      <label>Width (px)</label>
                      <input type="number" id="qaCustomWidth" class="qa-custom-input" value="390" min="240" max="3840">
                    </div>
                    <div class="qa-custom-input-group">
                      <label>Height (px)</label>
                      <input type="number" id="qaCustomHeight" class="qa-custom-input" value="844" min="240" max="3840">
                    </div>
                    <div class="qa-custom-input-group">
                      <label>DPR</label>
                      <select id="qaCustomDpr" class="qa-custom-input">
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="3" selected>3x</option>
                      </select>
                    </div>
                  </div>
                  <button type="button" class="btn btn-secondary btn-xs" id="btnApplyCustomDevice" style="width: 100%; justify-content: center; margin-top: 4px;">
                    Apply Custom Viewport
                  </button>
                </div>
              </div>
            </div>

            <select class="qa-browser-select" id="qaSelectBrowser" title="Select Browser Engine">
              <option value="chromium" ${this.currentBrowser === 'chromium' ? 'selected' : ''}>Chromium</option>
              <option value="firefox" ${this.currentBrowser === 'firefox' ? 'selected' : ''}>Firefox</option>
              <option value="webkit" ${this.currentBrowser === 'webkit' ? 'selected' : ''}>WebKit (Safari)</option>
            </select>

            <button class="btn btn-primary qa-btn-run" id="btnRunAutomatedQa" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Start QA Run</span>
            </button>
          </div>

          <!-- Compact Device Info Bar -->
          <div class="qa-device-info-bar" id="qaDeviceInfoBar">
            ${this.renderDeviceInfoBarHtml()}
          </div>
        </div>

        <!-- Status Banner (During run) -->
        <div class="qa-running-status" id="qaRunningBanner" style="display: none;">
          <span class="spinner-inline"></span>
          <span id="qaRunningText">Launching Playwright browser engine, navigating to target URL, and executing automated inspection suites...</span>
        </div>

        <!-- Test Suites Configuration Section -->
        <div class="qa-suites-section" id="qaSuitesConfigSection">
          <div class="qa-section-heading">Test Configuration</div>
          <div class="qa-suites-grid">
            <!-- 1. Broken UI Detection -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteBrokenUi" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Broken UI Detection</span>
                </div>
                <div class="qa-suite-desc">Detects horizontal scroll overflow, overflowing element selectors and bounding boxes, broken/0px images, and clipped text.</div>
              </div>
            </label>

            <!-- 2. Redirect Testing -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteRedirects" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Redirect Testing</span>
                </div>
                <div class="qa-suite-desc">Tracks complete HTTP redirect chains (301, 302, 307), verifies protocol upgrade from HTTP to HTTPS, and checks final destination URLs.</div>
              </div>
            </label>

            <!-- 3. Safe Interaction Testing -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteInteractions" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Interaction Testing</span>
                </div>
                <div class="qa-suite-desc">Audits navigation menus, dropdowns, accordions, and tabs. Automatically filters out and skips destructive actions (delete, logout, checkout).</div>
              </div>
            </label>

            <!-- 4. Form Testing -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteForms" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Form Testing</span>
                </div>
                <div class="qa-suite-desc">Validates inputs, textareas, selects, label associations, and HTML5 validation attributes without submitting live leads to remote systems.</div>
              </div>
            </label>

            <!-- 5. Accessibility Testing -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteA11y" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Accessibility (WCAG 2.1 AA)</span>
                </div>
                <div class="qa-suite-desc">Scans for missing image alt text, unnamed interactive buttons, document language tags, and heading hierarchy order.</div>
              </div>
            </label>

            <!-- 6. Visual Regression -->
            <label class="qa-suite-card">
              <input type="checkbox" id="chkSuiteVisual" checked>
              <div class="qa-suite-body">
                <div class="qa-suite-title">
                  <span>Visual Regression</span>
                </div>
                <div class="qa-suite-desc">Captures high-resolution reference viewport snapshots via Playwright for baseline comparison and layout fidelity checks.</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Empty Results State (shown before any run) -->
        <div class="qa-results-empty-card" id="qaEmptyResultsCard">
          <svg class="qa-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <div class="qa-empty-title">QA Results</div>
          <div class="qa-empty-desc">Run your selected tests to see results here. Configure your target URL and device parameters above, then click Start QA Run.</div>
          <div class="qa-empty-hints">
            <span>💡 Real Playwright testing</span>
            <span>•</span>
            <span>Zero fake metrics</span>
            <span>•</span>
            <span>Full reports & screenshots</span>
          </div>
        </div>

        <!-- QA Results Container (shown after run) -->
        <div class="qa-results-container" id="qaResultsContainer" style="display: none;"></div>
      `;

      this.bindEvents();
      this.populateDeviceList();
    }

    getViewportWidth() {
      const w = this.currentDevice.viewport?.width || this.currentDevice.width || 1440;
      const h = this.currentDevice.viewport?.height || this.currentDevice.height || 900;
      return this.orientation === 'landscape' && h > w ? h : (this.orientation === 'portrait' && w > h && Math.min(w, h) < 768 ? h : w);
    }

    getViewportHeight() {
      const w = this.currentDevice.viewport?.width || this.currentDevice.width || 1440;
      const h = this.currentDevice.viewport?.height || this.currentDevice.height || 900;
      return this.orientation === 'landscape' && h > w ? w : (this.orientation === 'portrait' && w > h && Math.min(w, h) < 768 ? w : h);
    }

    getDeviceIcon(dev) {
      const cat = (dev.category || dev.subCategory || '').toLowerCase();
      if (cat.includes('apple') || cat.includes('mobile') || dev.isMobile) return '📱';
      if (cat.includes('tablet')) return '📟';
      if (cat.includes('laptop')) return '💻';
      return '🖥️';
    }

    renderDeviceInfoBarHtml() {
      const w = this.getViewportWidth();
      const h = this.getViewportHeight();
      const dpr = this.currentDevice.deviceScaleFactor || 1;
      const touchText = this.currentDevice.hasTouch ? 'Touch: Enabled' : 'Touch: Disabled';
      const isApple = (this.currentDevice.subCategory === 'apple' || (this.currentDevice.name && this.currentDevice.name.toLowerCase().includes('iphone')));
      const isAndroid = (this.currentDevice.subCategory === 'android' || (this.currentDevice.name && (this.currentDevice.name.toLowerCase().includes('pixel') || this.currentDevice.name.toLowerCase().includes('galaxy'))));

      let compatWarning = '';
      if (isApple && this.currentBrowser !== 'webkit') {
        compatWarning = `<span class="qa-compat-warning" title="Apple devices emulate most accurately under the WebKit (Safari) engine">⚠️ Recommended engine for Apple profiles is WebKit</span>`;
      } else if (isAndroid && this.currentBrowser === 'webkit') {
        compatWarning = `<span class="qa-compat-warning" title="Android devices emulate most accurately under Chromium">⚠️ Recommended engine for Android is Chromium</span>`;
      }

      return `
        <div class="qa-device-meta-group">
          <span class="qa-meta-pill">
            ${this.getDeviceIcon(this.currentDevice)} <strong>${this.escapeHtml(this.currentDevice.name)}</strong>
          </span>
          <span class="qa-meta-pill">
            <span>Viewport:</span> <strong>${w} × ${h} px</strong>
          </span>
          <span class="qa-meta-pill">
            <span>DPR:</span> <strong>${dpr}x</strong>
          </span>
          <span class="qa-meta-pill">
            <strong>${touchText}</strong>
          </span>
          <span class="qa-meta-pill">
            <span>Engine:</span> <strong style="text-transform: capitalize;">${this.currentBrowser}</strong>
          </span>
          ${compatWarning}
        </div>

        <button type="button" class="qa-orientation-btn" id="btnToggleQaOrientation">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>${this.orientation === 'landscape' ? 'Landscape (Click for Portrait)' : 'Portrait (Click for Landscape)'}</span>
        </button>
      `;
    }

    bindEvents() {
      // Run Suite Button
      const runBtn = this.container.querySelector('#btnRunAutomatedQa');
      if (runBtn) {
        runBtn.addEventListener('click', () => this.runSuite());
      }

      // Target URL input
      const urlInput = this.container.querySelector('#qaTargetUrl');
      if (urlInput) {
        urlInput.addEventListener('input', (e) => {
          this.currentUrl = e.target.value;
        });
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.runSuite();
          }
        });
      }

      // Popover toggle button
      const pickerBtn = this.container.querySelector('#qaDevicePickerBtn');
      if (pickerBtn) {
        pickerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDevicePopover();
        });
      }

      // Popover search input
      const searchInput = this.container.querySelector('#qaDeviceSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.populateDeviceList();
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
      }

      // Popover category tabs
      const catTabs = this.container.querySelectorAll('.qa-popover-cat-btn');
      catTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          catTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeCategory = tab.getAttribute('data-cat');
          this.populateDeviceList();
        });
      });

      // Custom form apply
      const applyCustomBtn = this.container.querySelector('#btnApplyCustomDevice');
      if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.applyCustomDevice();
        });
      }

      // Browser select change
      const brSelect = this.container.querySelector('#qaSelectBrowser');
      if (brSelect) {
        brSelect.addEventListener('change', (e) => {
          this.currentBrowser = e.target.value;
          this.updateDeviceInfoBar();
        });
      }

      // Orientation toggle button
      this.bindOrientationToggle();
    }

    bindOrientationToggle() {
      const orientBtn = this.container.querySelector('#btnToggleQaOrientation');
      if (orientBtn) {
        orientBtn.onclick = (e) => {
          e.preventDefault();
          this.orientation = this.orientation === 'landscape' ? 'portrait' : 'landscape';
          this.updatePickerButton();
          this.updateDeviceInfoBar();
        };
      }
    }

    bindGlobalEvents() {
      // Dismiss popover on outside click
      document.addEventListener('click', (e) => {
        if (this.popoverOpen) {
          const popover = this.container?.querySelector('#qaDevicePopover');
          const trigger = this.container?.querySelector('#qaDevicePickerBtn');
          if (popover && !popover.contains(e.target) && !trigger?.contains(e.target)) {
            this.closeDevicePopover();
          }
        }
      });

      // Lightbox keyboard ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.lightboxData) {
          this.closeLightbox();
        }
      });
    }

    toggleDevicePopover() {
      if (this.popoverOpen) {
        this.closeDevicePopover();
      } else {
        this.openDevicePopover();
      }
    }

    openDevicePopover() {
      const popover = this.container.querySelector('#qaDevicePopover');
      if (!popover) return;
      popover.style.display = 'flex';
      this.popoverOpen = true;
      const search = this.container.querySelector('#qaDeviceSearchInput');
      if (search) search.focus();
    }

    closeDevicePopover() {
      const popover = this.container.querySelector('#qaDevicePopover');
      if (!popover) return;
      popover.style.display = 'none';
      this.popoverOpen = false;
    }

    populateDeviceList() {
      const list = this.container.querySelector('#qaDeviceListContainer');
      const customForm = this.container.querySelector('#qaCustomDeviceForm');
      if (!list) return;

      if (this.activeCategory === 'custom') {
        list.innerHTML = '';
        list.style.display = 'none';
        if (customForm) customForm.style.display = 'flex';
        return;
      }

      if (customForm) customForm.style.display = 'none';
      list.style.display = 'flex';

      let devices = [];
      if (window.DeviceRegistry) {
        if (this.searchQuery) {
          devices = window.DeviceRegistry.searchDevices(this.searchQuery);
        } else {
          devices = window.DeviceRegistry.getDevicesByCategory(this.activeCategory);
        }
      }

      if (!devices || devices.length === 0) {
        list.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching devices found.</div>`;
        return;
      }

      list.innerHTML = devices.map(d => {
        const w = d.viewportWidth || d.viewport?.width || 0;
        const h = d.viewportHeight || d.viewport?.height || 0;
        const isSelected = this.currentDevice && (this.currentDevice.id === d.id || this.currentDevice.name === d.name);
        return `
          <div class="qa-popover-device-item ${isSelected ? 'active' : ''}" data-dev-id="${this.escapeHtml(d.id)}">
            <div class="qa-device-item-left">
              <span>${this.getDeviceIcon(d)}</span>
              <span>${this.escapeHtml(d.name)}</span>
            </div>
            <div class="qa-device-item-right">
              <span class="qa-dim-tag">${w}×${h}</span>
              ${d.deviceScaleFactor > 1 ? `<span class="qa-dim-tag">${d.deviceScaleFactor}x</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Bind device item click
      list.querySelectorAll('.qa-popover-device-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const devId = item.getAttribute('data-dev-id');
          this.selectDeviceById(devId);
        });
      });
    }

    selectDeviceById(id) {
      if (window.DeviceRegistry) {
        const found = window.DeviceRegistry.getDevice(id);
        if (found) {
          this.currentDevice = { ...found };
          // If device has a default browser engine recommendation, auto-set if compatible
          if (found.defaultBrowserEngine) {
            this.currentBrowser = found.defaultBrowserEngine;
            const brSelect = this.container.querySelector('#qaSelectBrowser');
            if (brSelect) brSelect.value = found.defaultBrowserEngine;
          }
          this.updatePickerButton();
          this.updateDeviceInfoBar();
          this.closeDevicePopover();
        }
      }
    }

    applyCustomDevice() {
      const wInput = this.container.querySelector('#qaCustomWidth');
      const hInput = this.container.querySelector('#qaCustomHeight');
      const dprInput = this.container.querySelector('#qaCustomDpr');
      const w = parseInt(wInput?.value, 10) || 390;
      const h = parseInt(hInput?.value, 10) || 844;
      const dpr = parseFloat(dprInput?.value) || 1;

      let customDev;
      if (window.DeviceRegistry && typeof window.DeviceRegistry.createCustomDevice === 'function') {
        customDev = window.DeviceRegistry.createCustomDevice(w, h, dpr, this.orientation);
      } else {
        customDev = {
          id: `custom-${w}x${h}`,
          name: `Custom (${w} × ${h})`,
          playwrightName: `Custom (${w} × ${h})`,
          viewport: { width: w, height: h },
          viewportWidth: w,
          viewportHeight: h,
          deviceScaleFactor: dpr,
          isMobile: Math.min(w, h) < 768,
          hasTouch: Math.min(w, h) < 768,
          defaultBrowserEngine: 'chromium',
          category: 'custom'
        };
      }

      this.currentDevice = customDev;
      this.updatePickerButton();
      this.updateDeviceInfoBar();
      this.closeDevicePopover();
    }

    updatePickerButton() {
      const icon = this.container.querySelector('#qaPickerBtnIcon');
      const name = this.container.querySelector('#qaPickerBtnName');
      const dim = this.container.querySelector('#qaPickerBtnDim');
      if (icon) icon.textContent = this.getDeviceIcon(this.currentDevice);
      if (name) name.textContent = this.currentDevice.name;
      if (dim) dim.textContent = `${this.getViewportWidth()}×${this.getViewportHeight()}`;
    }

    updateDeviceInfoBar() {
      const bar = this.container.querySelector('#qaDeviceInfoBar');
      if (bar) {
        bar.innerHTML = this.renderDeviceInfoBarHtml();
        this.bindOrientationToggle();
      }
    }

    async runSuite() {
      if (this.isRunning) return;

      const urlInput = this.container.querySelector('#qaTargetUrl');
      if (urlInput && urlInput.value.trim()) {
        this.currentUrl = urlInput.value.trim();
      }
      if (!this.currentUrl.startsWith('http://') && !this.currentUrl.startsWith('https://')) {
        this.currentUrl = 'https://' + this.currentUrl;
        if (urlInput) urlInput.value = this.currentUrl;
      }

      this.isRunning = true;

      const runBtn = this.container.querySelector('#btnRunAutomatedQa');
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-inline"></span> Running QA Suite...';
      }

      const emptyCard = this.container.querySelector('#qaEmptyResultsCard');
      if (emptyCard) emptyCard.style.display = 'none';

      const statusBanner = this.container.querySelector('#qaRunningBanner');
      if (statusBanner) statusBanner.style.display = 'flex';

      const resultsBox = this.container.querySelector('#qaResultsContainer');
      if (resultsBox) resultsBox.style.display = 'none';

      try {
        const payload = {
          url: this.currentUrl,
          options: {
            brokenUi: this.container.querySelector('#chkSuiteBrokenUi')?.checked ?? true,
            redirects: this.container.querySelector('#chkSuiteRedirects')?.checked ?? true,
            interactions: this.container.querySelector('#chkSuiteInteractions')?.checked ?? true,
            forms: this.container.querySelector('#chkSuiteForms')?.checked ?? true,
            accessibility: this.container.querySelector('#chkSuiteA11y')?.checked ?? true,
            visualRegression: this.container.querySelector('#chkSuiteVisual')?.checked ?? true
          },
          device: {
            id: this.currentDevice.id,
            name: this.currentDevice.name,
            playwrightName: this.currentDevice.playwrightName || this.currentDevice.name,
            width: this.getViewportWidth(),
            height: this.getViewportHeight(),
            dpr: this.currentDevice.deviceScaleFactor || 1,
            isMobile: !!this.currentDevice.isMobile,
            hasTouch: !!this.currentDevice.hasTouch,
            orientation: this.orientation
          },
          browser: this.currentBrowser
        };

        const res = await fetch('/api/qa/phase2-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success && data.error) {
          throw new Error(data.error);
        }

        this.results = data;
        this.lastReportId = null;

        // Auto-record to History & Reports
        if (window.HistoryManager) {
          const s = data.summary || {};
          const status = (s.critical > 0) ? 'failed' : ((s.warnings > 0) ? 'warning' : 'passed');
          window.HistoryManager.addHistoryItem({
            type: 'automated_qa',
            tool: 'Automated QA',
            targetUrl: payload.url,
            status,
            summary: {
              score: s.score,
              passed: s.passed,
              warnings: s.warnings,
              critical: s.critical,
              device: this.currentDevice.name,
              browser: this.currentBrowser
            },
            durationMs: s.executionTimeMs || 0,
            reportData: data
          }).then(item => {
            if (item && item.reportId) {
              this.lastReportId = item.reportId;
            }
          });
        }

        this.renderResults();
      } catch (err) {
        console.error('QA run failed:', err);
        alert('Automated QA Run failed: ' + err.message);
        if (emptyCard && !this.results) emptyCard.style.display = 'flex';
      } finally {
        this.isRunning = false;
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Start QA Run</span>
          `;
        }
        if (statusBanner) statusBanner.style.display = 'none';
      }
    }

    renderResults() {
      const resultsBox = this.container.querySelector('#qaResultsContainer');
      const emptyCard = this.container.querySelector('#qaEmptyResultsCard');
      if (!resultsBox || !this.results) return;

      if (emptyCard) emptyCard.style.display = 'none';
      resultsBox.style.display = 'flex';

      const s = this.results.summary || {};
      const res = this.results;
      const escape = (str) => this.escapeHtml(str);

      // Score class
      const score = s.score || 0;
      const scoreClass = score >= 85 ? 'badge-success' : (score >= 60 ? 'badge-accent' : 'badge-danger');

      resultsBox.innerHTML = `
        <!-- Summary KPI Banner Card -->
        <div class="qa-results-summary-card">
          <div class="qa-summary-top-row">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span class="badge ${scoreClass} font-mono qa-score-badge" style="font-size: 15px; padding: 6px 14px;">
                ${score} / 100 QA Score
              </span>
              <span class="qa-meta-pill">
                ${this.getDeviceIcon(this.currentDevice)} <strong>${escape(this.currentDevice.name)}</strong> (${this.getViewportWidth()}×${this.getViewportHeight()})
              </span>
              <span class="qa-meta-pill">
                Engine: <strong style="text-transform: capitalize;">${escape(this.currentBrowser)}</strong>
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-xs" id="btnQaSaveToProject" type="button">📁 Save to Project</button>
              <button class="btn btn-secondary btn-xs" id="btnQaRerunTest" type="button">‹ Reconfigure Run</button>
              <button class="btn btn-primary btn-xs" id="btnExportQaJson" type="button">📥 Export JSON</button>
            </div>
          </div>

          <div class="qa-summary-metrics-grid">
            <div class="qa-metric-box">
              <span class="qa-metric-label">Passed Checks</span>
              <span class="qa-metric-value" style="color: var(--status-success);">✅ ${s.passed || 0}</span>
            </div>
            <div class="qa-metric-box">
              <span class="qa-metric-label">Warnings</span>
              <span class="qa-metric-value" style="color: var(--status-warning);">⚠️ ${s.warnings || 0}</span>
            </div>
            <div class="qa-metric-box">
              <span class="qa-metric-label">Critical Issues</span>
              <span class="qa-metric-value" style="color: var(--status-danger);">❌ ${s.critical || 0}</span>
            </div>
            <div class="qa-metric-box">
              <span class="qa-metric-label">Execution Time</span>
              <span class="qa-metric-value" style="color: var(--text-primary);">⏱️ ${((s.executionTimeMs || 0) / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        <!-- Collapsible Test Suite Accordions -->
        <div class="qa-accordions-container">
          <!-- 1. Broken UI Detection -->
          ${this.renderBrokenUiAccordion(res.brokenUi)}

          <!-- 2. Redirect & Protocol Testing -->
          ${this.renderRedirectsAccordion(res.redirects)}

          <!-- 3. Safe Interaction Testing -->
          ${this.renderInteractionsAccordion(res.interactions)}

          <!-- 4. Form Structure & Validation -->
          ${this.renderFormsAccordion(res.forms)}

          <!-- 5. Accessibility Testing (WCAG 2.1 AA) -->
          ${this.renderA11yAccordion(res.accessibility)}

          <!-- 6. Visual Regression & Snapshots -->
          ${this.renderVisualAccordion(res.visualRegression, res.screenshots)}
        </div>
      `;

      // Bind Accordion header toggles
      resultsBox.querySelectorAll('.qa-accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          const item = header.closest('.qa-accordion-item');
          if (item) {
            const suiteKey = item.getAttribute('data-suite');
            const isExp = item.classList.toggle('expanded');
            if (suiteKey) this.expandedSuites[suiteKey] = isExp;
          }
        });
      });

      // Bind Re-run button
      const rerunBtn = resultsBox.querySelector('#btnQaRerunTest');
      if (rerunBtn) {
        rerunBtn.onclick = () => {
          const targetCard = this.container.querySelector('.qa-target-card');
          if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth' });
        };
      }

      // Bind JSON Export
      const exportBtn = resultsBox.querySelector('#btnExportQaJson');
      if (exportBtn) {
        exportBtn.onclick = () => {
          const blob = new Blob([JSON.stringify(this.results, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `automated_qa_report_${Date.now()}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      }

      // Bind Save to Project
      const saveProjBtn = resultsBox.querySelector('#btnQaSaveToProject');
      if (saveProjBtn) {
        saveProjBtn.onclick = async () => {
          if (!window.ProjectManager) return;
          const projects = window.ProjectManager.getProjects();
          if (projects.length === 0) {
            alert('No projects created yet. Please create a project first under the Projects tab.');
            return;
          }

          const projectListStr = projects.map((p, idx) => `${idx + 1}. ${p.name} (${p.url})`).join('\n');
          const choice = prompt(`Select project number to associate this QA test with:\n\n${projectListStr}`, '1');
          if (!choice) return;

          const pIdx = parseInt(choice, 10) - 1;
          if (isNaN(pIdx) || pIdx < 0 || pIdx >= projects.length) {
            alert('Invalid selection.');
            return;
          }

          const selectedProject = projects[pIdx];
          try {
            saveProjBtn.disabled = true;
            saveProjBtn.textContent = 'Saving...';

            await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                projectId: selectedProject.id,
                historyId: this.lastReportId || null,
                testType: 'automated_qa',
                targetUrl: this.currentUrl,
                resultJson: this.results
              })
            });

            // Also save screenshots to project
            if (this.results.screenshots && this.results.screenshots.viewport) {
              await fetch('/api/screenshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  projectId: selectedProject.id,
                  filename: `${selectedProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-viewport.png`,
                  deviceName: this.currentDevice.name,
                  viewport: `${this.getViewportWidth()}x${this.getViewportHeight()}`,
                  browser: this.currentBrowser,
                  screenshotType: 'viewport',
                  dataUri: this.results.screenshots.viewport
                })
              });
            }

            alert(`Successfully saved test report and screenshots to project "${selectedProject.name}"!`);
            saveProjBtn.textContent = '✓ Saved to ' + selectedProject.name;
          } catch (e) {
            alert('Failed to save to project: ' + e.message);
            saveProjBtn.disabled = false;
            saveProjBtn.textContent = '📁 Save to Project';
          }
        };
      }

      // Bind Set as Visual Baseline
      const setBaselineBtn = resultsBox.querySelector('.qa-btn-set-baseline');
      if (setBaselineBtn) {
        setBaselineBtn.onclick = async () => {
          const shotSrc = this.results?.screenshots?.viewport || this.results?.visualRegression?.viewportScreenshot;
          if (!shotSrc) {
            alert('No viewport screenshot available to save as baseline.');
            return;
          }

          const projects = window.ProjectManager ? window.ProjectManager.getProjects() : [];
          if (projects.length === 0) {
            alert('Please create a project first under the Projects tab to store visual baselines.');
            return;
          }

          let selectedProject = projects[0];
          if (projects.length > 1) {
            const projectListStr = projects.map((p, idx) => `${idx + 1}. ${p.name}`).join('\n');
            const choice = prompt(`Select project for this baseline:\n\n${projectListStr}`, '1');
            if (!choice) return;
            const pIdx = parseInt(choice, 10) - 1;
            if (pIdx >= 0 && pIdx < projects.length) selectedProject = projects[pIdx];
          }

          try {
            setBaselineBtn.disabled = true;
            setBaselineBtn.textContent = 'Saving Baseline...';

            const res = await fetch('/api/baselines', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                projectId: selectedProject.id,
                targetUrl: this.currentUrl,
                deviceName: this.currentDevice.name,
                viewportWidth: this.getViewportWidth(),
                viewportHeight: this.getViewportHeight(),
                dpr: this.currentDevice.deviceScaleFactor || 1,
                browser: this.currentBrowser,
                orientation: this.orientation,
                baselineDataUri: shotSrc,
                label: `${this.currentDevice.name} Reference Baseline`
              })
            });

            const data = await res.json();
            if (data.success) {
              setBaselineBtn.textContent = '⭐ Baseline Saved!';
              alert(`Visual baseline saved for ${this.currentDevice.name} (${this.getViewportWidth()}×${this.getViewportHeight()}) under ${selectedProject.name}!`);
            } else {
              throw new Error(data.error || 'Failed to save baseline.');
            }
          } catch (err) {
            alert('Error saving baseline: ' + err.message);
            setBaselineBtn.disabled = false;
            setBaselineBtn.textContent = '⭐ Set as Visual Baseline';
          }
        };
      }

      // Bind Screenshot actions (view & download)
      this.bindScreenshotControls(resultsBox);

      resultsBox.scrollIntoView({ behavior: 'smooth' });
    }

    renderBrokenUiAccordion(ui) {
      if (!ui) return '';
      const isExpanded = this.expandedSuites.brokenUi !== false;
      const hasIssues = ui.hasHorizontalOverflow || (ui.overflowing && ui.overflowing.length > 0) || (ui.brokenImages && ui.brokenImages.length > 0);
      const statusBadge = !hasIssues
        ? '<span class="badge badge-success font-mono">0 Issues</span>'
        : `<span class="badge badge-danger font-mono">${(ui.overflowing?.length || 0) + (ui.brokenImages?.length || 0)} Issues</span>`;

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="brokenUi">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">📐</span>
              <div>
                <div class="qa-accordion-title">Broken UI & Horizontal Overflow</div>
                <div class="qa-accordion-subtitle">Detects responsive viewport breaks, scroll overflows, and zero-pixel images</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              ${statusBadge}
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px;">
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Horizontal Scroll Overflow</div>
                <div style="font-size: 16px; font-weight: 700; color: ${ui.hasHorizontalOverflow ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${ui.hasHorizontalOverflow ? `+${ui.overflowAmount}px Overflow` : 'None (Clean)'}
                </div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Overflowing DOM Elements</div>
                <div style="font-size: 16px; font-weight: 700; color: ${ui.overflowing?.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${ui.overflowing?.length || 0}
                </div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Broken Images (0px / Fail)</div>
                <div style="font-size: 16px; font-weight: 700; color: ${ui.brokenImages?.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${ui.brokenImages?.length || 0}
                </div>
              </div>
            </div>

            ${ui.overflowing && ui.overflowing.length > 0 ? `
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Overflowing Elements:</div>
              <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
                ${ui.overflowing.map(o => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: 5px; font-size: 12px;">
                    <span class="font-mono font-semibold">${this.escapeHtml(o.selector)}</span>
                    <span style="color: var(--status-danger);">Excess: +${o.excess}px (Width: ${o.width}px)</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${ui.brokenImages && ui.brokenImages.length > 0 ? `
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Broken Images:</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${ui.brokenImages.map(img => `
                  <div style="padding: 8px 12px; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: 5px; font-size: 12px;">
                    <div class="font-mono font-semibold" style="word-break: break-all;">${this.escapeHtml(img.src)}</div>
                    <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">Alt: "${this.escapeHtml(img.alt || '(none)')}" • ${this.escapeHtml(img.reason)}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    renderRedirectsAccordion(red) {
      if (!red) return '';
      const isExpanded = this.expandedSuites.redirects !== false;
      const statusBadge = red.isHttps
        ? '<span class="badge badge-success font-mono">HTTPS Enforced</span>'
        : '<span class="badge badge-danger font-mono">Insecure</span>';

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="redirects">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">🔀</span>
              <div>
                <div class="qa-accordion-title">Redirect Chains & Protocol Security</div>
                <div class="qa-accordion-subtitle">Validates HTTP/HTTPS protocol upgrades, status codes, and destination URL integrity</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              ${statusBadge}
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 10px 14px; background: var(--bg-surface-subtle); border-radius: 6px; font-size: 12px;">
              <div>Destination: <strong class="font-mono">${this.escapeHtml(red.finalUrl)}</strong></div>
              <div>Hops: <strong>${red.hopCount}</strong></div>
            </div>

            ${red.hops && red.hops.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${red.hops.map((h, idx) => `
                  <div style="padding: 10px 14px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 12px;">
                    <div>Hop ${idx + 1}: <span class="badge badge-accent font-mono">${h.status}</span> <span class="font-mono">${this.escapeHtml(h.from)}</span></div>
                    <div style="margin-top: 4px; color: var(--text-muted);">↳ Forwarded to: <span class="font-mono" style="color: var(--accent-primary);">${this.escapeHtml(h.to)}</span></div>
                  </div>
                `).join('')}
              </div>
            ` : '<div style="padding: 12px; background: var(--bg-surface-subtle); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">Direct navigation. No redirect hops occurred.</div>'}
          </div>
        </div>
      `;
    }

    renderInteractionsAccordion(it) {
      if (!it) return '';
      const isExpanded = this.expandedSuites.interactions === true;
      const statusBadge = it.consoleErrors && it.consoleErrors.length > 0
        ? `<span class="badge badge-danger font-mono">${it.consoleErrors.length} Console Errors</span>`
        : '<span class="badge badge-success font-mono">Clean Interactions</span>';

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="interactions">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">⚡</span>
              <div>
                <div class="qa-accordion-title">Safe Interaction Testing</div>
                <div class="qa-accordion-subtitle">Probes interactive menus, accordions, and dropdowns while skipping destructive actions</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              ${statusBadge}
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px;">
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Triggers Discovered</div>
                <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">${it.totalInteractive || 0}</div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Destructive Actions Skipped</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--status-success); margin-top: 2px;">${it.skippedDestructiveCount || 0} (Safe)</div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Runtime Console Errors</div>
                <div style="font-size: 16px; font-weight: 700; color: ${it.consoleErrors?.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${it.consoleErrors?.length || 0}
                </div>
              </div>
            </div>

            ${it.inspectedTriggers && it.inspectedTriggers.length > 0 ? `
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Sample Inspected Triggers:</div>
              <div style="display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto;">
                ${it.inspectedTriggers.map(t => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; background: var(--bg-surface-subtle); border-radius: 5px; font-size: 12px;">
                    <span><span class="badge badge-secondary font-mono" style="font-size: 10px;">${this.escapeHtml(t.tag)}</span> ${this.escapeHtml(t.text || '(empty)')}</span>
                    <span>${t.isDestructive ? '<span class="badge badge-danger">Skipped Destructive</span>' : '<span class="badge badge-success">Safe</span>'}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    renderFormsAccordion(f) {
      if (!f) return '';
      const isExpanded = this.expandedSuites.forms === true;
      const statusBadge = f.unlabelledStandalone > 0
        ? `<span class="badge badge-accent font-mono">${f.unlabelledStandalone} Unlabelled</span>`
        : '<span class="badge badge-success font-mono">Forms Valid</span>';

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="forms">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">📋</span>
              <div>
                <div class="qa-accordion-title">Form Testing & Field Accessibility</div>
                <div class="qa-accordion-subtitle">Inspects forms, input controls, and label bindings without submitting remote leads</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              ${statusBadge}
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px;">
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Total Forms Detected</div>
                <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">${f.totalForms || 0}</div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Total Input Controls</div>
                <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">${f.totalControls || 0}</div>
              </div>
              <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 11px; color: var(--text-muted);">Inputs Missing Labels</div>
                <div style="font-size: 16px; font-weight: 700; color: ${f.unlabelledStandalone > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${f.unlabelledStandalone || 0}
                </div>
              </div>
            </div>
            <div style="padding: 10px 14px; background: var(--bg-surface-subtle); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">
              🛡️ Form inspection analyzed input labels, names, and HTML5 validation attributes without dispatching submissions to production databases.
            </div>
          </div>
        </div>
      `;
    }

    renderA11yAccordion(a11y) {
      if (!a11y) return '';
      const isExpanded = this.expandedSuites.accessibility !== false;
      const count = a11y.totalViolations || 0;
      const statusBadge = count === 0
        ? '<span class="badge badge-success font-mono">0 Violations</span>'
        : `<span class="badge badge-accent font-mono">${count} Violations</span>`;

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="accessibility">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">♿</span>
              <div>
                <div class="qa-accordion-title">Accessibility (WCAG 2.1 AA Audit)</div>
                <div class="qa-accordion-subtitle">Scans image alt tags, button names, language identifiers, and heading structure</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              ${statusBadge}
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            ${count === 0 ? `
              <div style="padding: 14px; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 6px; font-size: 12px; color: var(--status-success);">
                ✅ No baseline accessibility violations detected for images, interactive button names, document lang, or heading hierarchies.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${a11y.violations.map(v => `
                  <div style="padding: 10px 14px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                      <strong style="color: var(--text-primary); font-mono;">${this.escapeHtml(v.rule)}</strong>
                      <div style="color: var(--text-muted); margin-top: 3px;">${this.escapeHtml(v.description)}</div>
                    </div>
                    <span class="badge ${v.impact === 'critical' ? 'badge-danger' : 'badge-accent'} font-mono" style="font-size: 10px; text-transform: uppercase;">
                      ${this.escapeHtml(v.impact)}
                    </span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    }

    renderVisualAccordion(vis, shots) {
      if (!vis && !shots) return '';
      const isExpanded = this.expandedSuites.visualRegression !== false;
      const viewportShot = shots?.viewport || vis?.viewportScreenshot || vis?.currentScreenshot;
      const fullPageShot = shots?.fullPage || vis?.fullPageScreenshot;

      return `
        <div class="qa-accordion-item ${isExpanded ? 'expanded' : ''}" data-suite="visualRegression">
          <div class="qa-accordion-header">
            <div class="qa-accordion-header-left">
              <span class="qa-accordion-icon">🖼️</span>
              <div>
                <div class="qa-accordion-title">Visual Regression & Screenshot Artifacts</div>
                <div class="qa-accordion-subtitle">Reference snapshots captured by Playwright at target viewport dimensions</div>
              </div>
            </div>
            <div class="qa-accordion-header-right">
              <span class="badge badge-success font-mono">Render Captured</span>
              <svg class="qa-chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
          <div class="qa-accordion-content">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              <!-- Viewport Screenshot Card -->
              ${viewportShot ? `
                <div style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; background: var(--bg-surface-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 12px;">Viewport Screenshot (${this.getViewportWidth()}×${this.getViewportHeight()})</strong>
                    <span class="qa-dim-tag">1:1 Scale</span>
                  </div>
                  <div style="max-height: 280px; overflow: hidden; border-radius: 6px; border: 1px solid var(--border-subtle); background: #000; cursor: pointer;" class="qa-shot-thumb" data-type="viewport">
                    <img src="${viewportShot}" style="width: 100%; height: 280px; object-fit: contain; display: block;" alt="Viewport Screenshot">
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="button" class="btn btn-secondary btn-xs qa-btn-view-shot" data-type="viewport" style="flex: 1; justify-content: center;">
                      👁️ View Fullscreen
                    </button>
                    <button type="button" class="btn btn-primary btn-xs qa-btn-download-shot" data-type="viewport" style="flex: 1; justify-content: center;">
                      📥 Download PNG
                    </button>
                  </div>
                  <button type="button" class="btn btn-secondary btn-xs qa-btn-set-baseline" data-type="viewport" style="width: 100%; margin-top: 6px; justify-content: center;">
                    ⭐ Set as Visual Baseline
                  </button>
                </div>
              ` : ''}

              <!-- Full Page Screenshot Card -->
              ${fullPageShot && fullPageShot !== viewportShot ? `
                <div style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; background: var(--bg-surface-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 12px;">Full-Page Document Screenshot</strong>
                    <span class="qa-dim-tag">Entire Scroll Height</span>
                  </div>
                  <div style="max-height: 280px; overflow: hidden; border-radius: 6px; border: 1px solid var(--border-subtle); background: #000; cursor: pointer;" class="qa-shot-thumb" data-type="fullPage">
                    <img src="${fullPageShot}" style="width: 100%; height: 280px; object-fit: contain; display: block;" alt="Full-Page Screenshot">
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="button" class="btn btn-secondary btn-xs qa-btn-view-shot" data-type="fullPage" style="flex: 1; justify-content: center;">
                      👁️ View Fullscreen
                    </button>
                    <button type="button" class="btn btn-primary btn-xs qa-btn-download-shot" data-type="fullPage" style="flex: 1; justify-content: center;">
                      📥 Download PNG
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    bindScreenshotControls(resultsBox) {
      const getFilename = (type) => {
        let domain = 'target';
        try {
          domain = new URL(this.currentUrl).hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9.-]/g, '_');
        } catch (e) {}
        const devSlug = (this.currentDevice.name || 'device').toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
        const dim = `${this.getViewportWidth()}x${this.getViewportHeight()}`;
        const timestamp = Date.now();
        return `${domain}-${devSlug}-${dim}-${type}-${timestamp}.png`;
      };

      const getSrc = (type) => {
        const shots = this.results?.screenshots || {};
        const vis = this.results?.visualRegression || {};
        if (type === 'fullPage') return shots.fullPage || vis.fullPageScreenshot || shots.viewport;
        return shots.viewport || vis.viewportScreenshot || vis.currentScreenshot;
      };

      // View Click
      resultsBox.querySelectorAll('.qa-btn-view-shot, .qa-shot-thumb').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const type = el.getAttribute('data-type') || 'viewport';
          const src = getSrc(type);
          if (src) {
            this.openLightbox(src, `${this.currentDevice.name} — ${type === 'fullPage' ? 'Full Page' : 'Viewport'} Screenshot`, getFilename(type));
          }
        });
      });

      // Download Click
      resultsBox.querySelectorAll('.qa-btn-download-shot').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const type = el.getAttribute('data-type') || 'viewport';
          const src = getSrc(type);
          if (src) {
            this.downloadScreenshot(src, getFilename(type));
          }
        });
      });
    }

    openLightbox(imgSrc, title, filename) {
      this.closeLightbox();

      const modal = document.createElement('div');
      modal.className = 'qa-lightbox-modal';
      modal.id = 'qaLightboxModal';
      modal.innerHTML = `
        <div class="qa-lightbox-toolbar">
          <div class="qa-lightbox-title">${this.escapeHtml(title)}</div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="btn btn-primary btn-xs" id="btnLightboxDownload">📥 Download</button>
            <button type="button" class="btn btn-secondary btn-xs" id="btnLightboxClose" style="color: #ffffff; border-color: rgba(255,255,255,0.3);">✕ Close</button>
          </div>
        </div>
        <div class="qa-lightbox-content" id="qaLightboxContent">
          <img class="qa-lightbox-img" src="${imgSrc}" alt="${this.escapeHtml(title)}">
        </div>
      `;

      modal.querySelector('#btnLightboxClose').onclick = () => this.closeLightbox();
      modal.querySelector('#btnLightboxDownload').onclick = () => this.downloadScreenshot(imgSrc, filename);
      modal.querySelector('#qaLightboxContent').onclick = (e) => {
        if (e.target.id === 'qaLightboxContent') this.closeLightbox();
      };

      document.body.appendChild(modal);
      this.lightboxData = { modal, imgSrc, filename };
    }

    closeLightbox() {
      if (this.lightboxData && this.lightboxData.modal) {
        this.lightboxData.modal.remove();
        this.lightboxData = null;
      }
      const existing = document.getElementById('qaLightboxModal');
      if (existing) existing.remove();
    }

    downloadScreenshot(dataUri, filename) {
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

  window.AutomatedQaTool = AutomatedQaTool;
})();
