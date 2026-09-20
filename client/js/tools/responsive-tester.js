/**
 * WebDev AI Studio - Responsive Tester Tool Controller
 * Orchestrates DeviceSelector, DevicePreview, ViewportControls,
 * BreakpointRunner, DeviceComparison, ScreenshotGallery,
 * Browser Matrix, Device Matrix, Responsive Audit Report, and Bottom Telemetry Drawer.
 */

(function () {
  'use strict';

  class ResponsiveTesterTool {
    constructor() {
      this.currentUrl = 'https://example.com/';
      this.currentDevice = (window.DeviceRegistry && window.DeviceRegistry.getDevice('iphone-15-pro')) || {
        id: 'iphone-15-pro',
        name: 'iPhone 15 Pro',
        viewportWidth: 393,
        viewportHeight: 852,
        deviceScaleFactor: 3,
        defaultBrowserType: 'webkit',
        isMobile: true
      };
      this.browserType = 'chromium';
      this.orientation = 'portrait';
      this.previewMode = 'interactive'; // 'interactive' | 'playwright' | 'simulation'
      this.zoom = 1;
      this.isInitialized = false;

      // Telemetry store
      this.consoleLogs = [];
      this.networkErrors = [];
      this.measurements = null;
      this.lastReport = null;

      // Subcomponents
      this.deviceSelector = null;
      this.devicePreview = null;
      this.viewportControls = null;
      this.breakpointRunner = null;
      this.deviceComparison = null;
      this.screenshotGallery = null;

      this.init();
    }

    init() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      this.initSubcomponents();
      this.bindToolbar();
      this.bindBottomDrawer();
      this.bindModals();
      this.bindKeyboardShortcuts();
      this.loadInitialUrl();
    }

    initSubcomponents() {
      // 1. Breakpoint Runner
      if (window.BreakpointRunner) {
        this.breakpointRunner = new window.BreakpointRunner({
          onSelectBreakpoint: (width) => {
            this.setCustomViewport(width, Math.round(width * 1.5));
          }
        });
      }

      // 2. Device Comparison
      if (window.DeviceComparison) {
        this.deviceComparison = new window.DeviceComparison({
          currentUrl: this.currentUrl
        });
      }

      // 3. Screenshot Gallery
      if (window.ScreenshotGallery) {
        this.screenshotGallery = new window.ScreenshotGallery();
      }

      // 4. Device Selector (Left panel)
      if (window.DeviceSelector) {
        this.deviceSelector = new window.DeviceSelector({
          containerId: 'deviceSelectorContainer',
          initialDeviceId: this.currentDevice ? this.currentDevice.id : 'iphone-15-pro',
          onSelectDevice: (device) => {
            this.selectDevice(device);
          }
        });
      }

      // 5. Device Preview (Center workspace)
      if (window.DevicePreview) {
        this.devicePreview = new window.DevicePreview({
          containerId: 'devicePreviewContainer',
          initialDevice: this.currentDevice,
          initialUrl: this.currentUrl,
          browserType: this.browserType,
          orientation: this.orientation,
          onNavigationChange: (url, navState) => {
            this.handleNavigationChange(url, navState);
          },
          onDeviceChange: (device, orientation) => {
            this.currentDevice = device;
            this.orientation = orientation;
            this.updateConfigBarDevice();
            if (this.viewportControls) {
              this.viewportControls.updateDevice(device);
              this.viewportControls.updateOrientation(orientation);
            }
          },
          onOrientationChange: (orientation) => {
            this.orientation = orientation;
            this.updateOrientationLabel();
            if (this.viewportControls) {
              this.viewportControls.updateOrientation(orientation);
            }
          },
          onZoomChange: (zoom) => {
            this.zoom = zoom;
            if (this.viewportControls) {
              this.viewportControls.updateZoom(zoom);
            }
          },
          onMeasurementsUpdated: (data) => {
            this.measurements = data;
            this.handleMeasurementsUpdate(data);
            if (this.viewportControls && this.viewportControls.updateMeasurements) {
              this.viewportControls.updateMeasurements(data);
            }
          },
          onConsoleUpdated: (logs) => {
            this.consoleLogs = logs || [];
            this.renderConsoleLogs();
          },
          onNetworkUpdated: (errors) => {
            this.networkErrors = errors || [];
            this.renderNetworkErrors();
          }
        });
      }

      // 6. Viewport Controls (Right panel)
      if (window.ViewportControls) {
        this.viewportControls = new window.ViewportControls({
          containerId: 'viewportControlsContainer',
          device: this.currentDevice,
          orientation: this.orientation,
          url: this.currentUrl,
          onOrientationChange: (orientation) => {
            this.orientation = orientation;
            this.updateOrientationLabel();
            if (this.devicePreview) {
              this.devicePreview.setOrientation(orientation);
            }
          },
          onZoomChange: (zoom) => {
            this.zoom = zoom;
            if (this.devicePreview) {
              this.devicePreview.setZoom(zoom);
            }
          },
          onReload: () => {
            if (this.devicePreview) {
              this.devicePreview.reload();
            }
          },
          onOpenExternal: () => {
            if (this.currentUrl) {
              window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
            }
          },
          onCustomViewportApply: (width, height) => {
            this.setCustomViewport(width, height);
          },
          onCaptureScreenshot: () => {
            this.captureCurrentScreenshot();
          },
          onCaptureFullPage: () => {
            this.captureFullPage();
          },
          onDownloadScreenshot: (record) => {
            this.downloadScreenshot(record);
          },
          onViewScreenshot: (record) => {
            if (this.screenshotGallery && this.screenshotGallery.showModal) {
              this.screenshotGallery.showModal(record);
            }
          },
          onRunBreakpoints: () => {
            this.openBreakpointRunner();
          }
        });
      }
    }

    bindToolbar() {
      // 1. Navigation Controls
      const backBtn = document.getElementById('btnNavBack');
      const fwdBtn = document.getElementById('btnNavForward');
      const reloadBtn = document.getElementById('btnReloadResponsive');

      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (this.devicePreview) this.devicePreview.navigateBack();
        });
      }
      if (fwdBtn) {
        fwdBtn.addEventListener('click', () => {
          if (this.devicePreview) this.devicePreview.navigateForward();
        });
      }
      if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
          if (this.devicePreview) this.devicePreview.reload();
        });
      }

      // 2. URL Input & Load
      const urlInput = document.getElementById('responsiveUrlInput');
      const loadBtn = document.getElementById('btnLoadResponsiveUrl');

      if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.applyUrlFromInput();
          }
        });
      }
      if (loadBtn) {
        loadBtn.addEventListener('click', () => {
          this.applyUrlFromInput();
        });
      }

      // 3. Mode Toggle: Interactive Preview vs Playwright Test Capture vs Local Simulation
      const btnInteractive = document.getElementById('btnModeInteractive');
      const btnPlaywright = document.getElementById('btnModePlaywright');
      const btnSim = document.getElementById('btnModeSimulation');

      const setMode = (mode) => {
        this.previewMode = mode;
        if (btnInteractive) btnInteractive.classList.toggle('active', mode === 'interactive');
        if (btnPlaywright) btnPlaywright.classList.toggle('active', mode === 'playwright');
        if (btnSim) btnSim.classList.toggle('active', mode === 'simulation');
        if (this.devicePreview) this.devicePreview.setMode(mode);
      };

      if (btnInteractive) {
        btnInteractive.addEventListener('click', () => setMode('interactive'));
      }
      if (btnPlaywright) {
        btnPlaywright.addEventListener('click', () => setMode('playwright'));
      }
      if (btnSim) {
        btnSim.addEventListener('click', () => setMode('simulation'));
      }

      // 4. Browser Engine Selection
      const browserSelect = document.getElementById('selectBrowserEngine');
      if (browserSelect) {
        browserSelect.value = this.browserType;
        browserSelect.addEventListener('change', (e) => {
          this.browserType = e.target.value;
          if (this.devicePreview) {
            this.devicePreview.setBrowserType(this.browserType);
          }
        });
      }

      // 5. Orientation Toggle
      const orientBtn = document.getElementById('btnToggleOrientation');
      if (orientBtn) {
        orientBtn.addEventListener('click', () => {
          this.toggleOrientation();
        });
      }

      // 6. Action Triggers
      const bpBtn = document.getElementById('btnOpenBreakpointRunner');
      const bmBtn = document.getElementById('btnOpenBrowserMatrix');
      const dmBtn = document.getElementById('btnOpenDeviceMatrix');
      const qaBtn = document.getElementById('btnOpenQaRunModal');
      const capBtn = document.getElementById('btnCaptureResponsive');
      const fullPageBtn = document.getElementById('btnCaptureFullPageTop');
      const dlBtn = document.getElementById('btnDownloadScreenshotTop');
      const repBtn = document.getElementById('btnOpenResponsiveReport');

      if (bpBtn) bpBtn.addEventListener('click', () => this.openBreakpointRunner());
      if (bmBtn) bmBtn.addEventListener('click', () => this.openBrowserMatrix());
      if (dmBtn) dmBtn.addEventListener('click', () => this.openDeviceMatrix());
      if (qaBtn) qaBtn.addEventListener('click', () => this.openQaRunModal());
      if (capBtn) capBtn.addEventListener('click', () => this.captureCurrentScreenshot());
      if (fullPageBtn) fullPageBtn.addEventListener('click', () => this.captureFullPage());
      if (dlBtn) dlBtn.addEventListener('click', () => this.downloadScreenshot());
      if (repBtn) repBtn.addEventListener('click', () => this.openResponsiveReport());

      // 7. Device Quick Picker
      this.bindDeviceQuickPicker();

      // 8. Collapsible Panels & Maximize
      const maxBtn = document.getElementById('btnMaximizePreview');
      if (maxBtn) {
        maxBtn.addEventListener('click', () => this.toggleMaximizePreview());
      }

      const showLeftBtn = document.getElementById('btnShowDeviceLibrary');
      if (showLeftBtn) {
        showLeftBtn.addEventListener('click', () => this.toggleDeviceLibrary(false));
      }

      const showRightBtn = document.getElementById('btnShowDetails');
      if (showRightBtn) {
        showRightBtn.addEventListener('click', () => this.toggleDetailsPanel(false));
      }

      // Delegate header collapse buttons if present
      document.addEventListener('click', (e) => {
        if (e.target.closest('#btnHideDeviceLibrary')) {
          this.toggleDeviceLibrary(true);
        } else if (e.target.closest('#btnHideDetails')) {
          this.toggleDetailsPanel(true);
        }
      });
    }

    toggleDeviceLibrary(forceCollapse) {
      const panel = document.getElementById('deviceSelectorContainer');
      const restoreBtn = document.getElementById('btnShowDeviceLibrary');
      if (!panel) return;
      const isCollapsed = typeof forceCollapse === 'boolean' ? forceCollapse : !panel.classList.contains('collapsed');
      panel.classList.toggle('collapsed', isCollapsed);
      panel.style.display = isCollapsed ? 'none' : 'flex';
      if (restoreBtn) restoreBtn.style.display = isCollapsed ? 'flex' : 'none';

      this.updateMaximizeState();
      if (this.devicePreview && typeof this.devicePreview.autoFit === 'function') {
        requestAnimationFrame(() => this.devicePreview.autoFit());
        setTimeout(() => this.devicePreview.autoFit(), 60);
      }
    }

    toggleDetailsPanel(forceCollapse) {
      const panel = document.getElementById('viewportControlsContainer');
      const restoreBtn = document.getElementById('btnShowDetails');
      if (!panel) return;
      const isCollapsed = typeof forceCollapse === 'boolean' ? forceCollapse : !panel.classList.contains('collapsed');
      panel.classList.toggle('collapsed', isCollapsed);
      panel.style.display = isCollapsed ? 'none' : 'flex';
      if (restoreBtn) restoreBtn.style.display = isCollapsed ? 'flex' : 'none';

      this.updateMaximizeState();
      if (this.devicePreview && typeof this.devicePreview.autoFit === 'function') {
        requestAnimationFrame(() => this.devicePreview.autoFit());
        setTimeout(() => this.devicePreview.autoFit(), 60);
      }
    }

    updateMaximizeState() {
      const workspace = document.getElementById('responsiveWorkspace');
      const left = document.getElementById('deviceSelectorContainer');
      const right = document.getElementById('viewportControlsContainer');
      const label = document.getElementById('labelMaximizePreview');
      const isMax = Boolean(left?.classList.contains('collapsed') && right?.classList.contains('collapsed'));

      if (workspace) {
        workspace.classList.toggle('maximized-preview', isMax);
      }
      if (label) {
        label.textContent = isMax ? 'Restore Layout' : 'Maximize Preview';
      }
    }

    toggleMaximizePreview() {
      const workspace = document.getElementById('responsiveWorkspace');
      const left = document.getElementById('deviceSelectorContainer');
      const right = document.getElementById('viewportControlsContainer');
      const isCurrentlyMaximized = workspace?.classList.contains('maximized-preview') ||
        (left?.classList.contains('collapsed') && right?.classList.contains('collapsed'));

      if (isCurrentlyMaximized) {
        this.toggleDeviceLibrary(false);
        this.toggleDetailsPanel(false);
      } else {
        this.toggleDeviceLibrary(true);
        this.toggleDetailsPanel(true);
      }
    }

    bindDeviceQuickPicker() {
      const trigger = document.getElementById('btnDevicePickerTrigger');
      if (!trigger) return;

      let dropdown = document.getElementById('devicePickerDropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'devicePickerDropdown';
        dropdown.className = 'device-picker-dropdown';
        document.body.appendChild(dropdown);
      }

      const popularIds = [
        'iphone-15-pro',
        'iphone-16-pro',
        'galaxy-s24',
        'galaxy-s24-ultra',
        'pixel-9-pro',
        'ipad-pro-11',
        'ipad-pro-13',
        'macbook-air-13',
        'macbook-pro-16',
        'desktop-1080p'
      ];

      const renderDropdownContent = () => {
        const devices = popularIds
          .map(id => window.DeviceRegistry ? window.DeviceRegistry.getDevice(id) : null)
          .filter(Boolean);

        dropdown.innerHTML = `
          <div class="device-picker-dropdown-header">
            <span>Quick Switch Device</span>
            <span class="font-mono text-xs" style="color: var(--text-muted);">${devices.length} popular</span>
          </div>
          <div class="device-picker-dropdown-list">
            ${devices.map(d => {
              const isSelected = this.currentDevice && this.currentDevice.id === d.id;
              let icon = '📱';
              if (d.category === 'tablets') icon = '📱';
              if (d.category === 'laptops') icon = '💻';
              if (d.category === 'desktop') icon = '🖥️';
              return `
                <div class="device-picker-dropdown-item ${isSelected ? 'active' : ''}" data-device-id="${d.id}">
                  <span class="dp-item-icon">${icon}</span>
                  <div class="dp-item-meta">
                    <span class="dp-item-name">${escapeHtml(d.name)}</span>
                    <span class="dp-item-sub font-mono">${d.viewportWidth || d.width} × ${d.viewportHeight || d.height} (${d.deviceScaleFactor || d.pixelRatio || 1}x)</span>
                  </div>
                  ${isSelected ? '<span class="dp-check">✓</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div class="device-picker-dropdown-footer">
            <button class="btn btn-secondary btn-sm" id="btnOpenSidebarFromDropdown" type="button" style="width: 100%; justify-content: center; font-size: 11px;">
              Browse All Devices in Sidebar →
            </button>
          </div>
        `;

        dropdown.querySelectorAll('.device-picker-dropdown-item').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.deviceId;
            const dev = window.DeviceRegistry ? window.DeviceRegistry.getDevice(id) : null;
            if (dev) {
              this.selectDevice(dev);
            }
            dropdown.classList.remove('open');
          });
        });

        const browseBtn = dropdown.querySelector('#btnOpenSidebarFromDropdown');
        if (browseBtn) {
          browseBtn.addEventListener('click', () => {
            dropdown.classList.remove('open');
            const sidebar = document.getElementById('deviceSelectorContainer');
            if (sidebar) {
              sidebar.scrollIntoView({ behavior: 'smooth' });
              const searchInput = sidebar.querySelector('#deviceSearchInput');
              if (searchInput) searchInput.focus();
            }
          });
        }
      };

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        if (isOpen) {
          dropdown.classList.remove('open');
        } else {
          renderDropdownContent();
          const rect = trigger.getBoundingClientRect();
          dropdown.style.top = `${rect.bottom + 6}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.classList.add('open');
        }
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });
    }

    bindBottomDrawer() {
      const drawer = document.getElementById('responsiveBottomDrawer');
      const toggleBtn = document.getElementById('btnToggleBottomDrawer');
      const header = document.getElementById('bottomDrawerHeader');
      const body = document.getElementById('bottomDrawerBody');

      if (!drawer) return;

      const toggleDrawer = () => {
        const isCollapsed = drawer.classList.contains('collapsed');
        if (isCollapsed) {
          drawer.classList.remove('collapsed');
          if (body) body.style.display = 'block';
        } else {
          drawer.classList.add('collapsed');
          if (body) body.style.display = 'none';
        }
      };

      if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDrawer();
      });

      // Tabs inside bottom drawer
      const tabBtns = drawer.querySelectorAll('[data-drawer-tab]');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tabKey = btn.dataset.drawerTab;

          // If clicking the active tab while drawer is open, collapse drawer
          if (btn.classList.contains('active') && !drawer.classList.contains('collapsed')) {
            drawer.classList.add('collapsed');
            if (body) body.style.display = 'none';
            return;
          }

          // If collapsed, expand first
          if (drawer.classList.contains('collapsed')) {
            drawer.classList.remove('collapsed');
            if (body) body.style.display = 'block';
          }

          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          drawer.querySelectorAll('.drawer-tab-pane').forEach(p => p.style.display = 'none');
          const targetPane = drawer.querySelector(`#paneDrawer${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
          if (targetPane) targetPane.style.display = 'block';

          if (tabKey === 'history') {
            this.renderHistoryDrawer();
          }
        });
      });
    }

    bindModals() {
      // Close actions
      document.querySelectorAll('[data-action="close-browser-matrix-modal"]').forEach(el => {
        el.addEventListener('click', () => {
          const m = document.getElementById('browserMatrixModal');
          if (m) m.style.display = 'none';
        });
      });

      document.querySelectorAll('[data-action="close-device-matrix-modal"]').forEach(el => {
        el.addEventListener('click', () => {
          const m = document.getElementById('deviceMatrixModal');
          if (m) m.style.display = 'none';
        });
      });

      document.querySelectorAll('[data-action="close-responsive-report-modal"]').forEach(el => {
        el.addEventListener('click', () => {
          const m = document.getElementById('responsiveReportModal');
          if (m) m.style.display = 'none';
        });
      });

      // Run Matrix Actions inside modals
      const runBmBtn = document.getElementById('btnRunBrowserMatrixAction');
      if (runBmBtn) {
        runBmBtn.addEventListener('click', () => this.executeBrowserMatrix());
      }

      const runDmBtn = document.getElementById('btnRunDeviceMatrixAction');
      if (runDmBtn) {
        runDmBtn.addEventListener('click', () => this.executeDeviceMatrix());
      }

      // Report Actions
      const printBtn = document.getElementById('btnPrintResponsiveReport');
      if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
      }

      const exportJsonBtn = document.getElementById('btnExportReportJson');
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
          if (!this.lastReport) return;
          const blob = new Blob([JSON.stringify(this.lastReport, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `responsive-audit-report-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      }
    }

    bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        const view = document.getElementById('viewResponsiveTester');
        if (!view || view.style.display === 'none') return;

        // CRITICAL: NEVER intercept Cmd+R / Ctrl+R - allow native browser reload!
        if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
          return;
        }

        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            this.applyUrlFromInput();
          }
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          this.devicePreview?.reload();
          return;
        }

        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          this.toggleOrientation();
          return;
        }

        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          this.openBreakpointRunner();
          return;
        }

        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.openBrowserMatrix();
          return;
        }
      });
    }

    loadInitialUrl() {
      if (window.ProjectManager && typeof window.ProjectManager.getActiveProject === 'function') {
        const activeProject = window.ProjectManager.getActiveProject();
        if (activeProject && activeProject.url) {
          this.currentUrl = activeProject.url;
        }
      }

      const urlInput = document.getElementById('responsiveUrlInput');
      if (urlInput) urlInput.value = this.currentUrl;

      this.loadUrl(this.currentUrl, false);
    }

    applyUrlFromInput() {
      const urlInput = document.getElementById('responsiveUrlInput');
      if (!urlInput) return;

      let url = urlInput.value.trim();
      if (!url) return;

      if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
        urlInput.value = url;
      }

      this.loadUrl(url, true);
    }

    loadUrl(url, saveHistory = true) {
      this.currentUrl = url;

      const urlInput = document.getElementById('responsiveUrlInput');
      if (urlInput && urlInput.value !== url) {
        urlInput.value = url;
      }

      if (this.devicePreview) {
        this.devicePreview.loadUrl(url);
      }

      if (this.viewportControls) {
        this.viewportControls.updateUrl(url);
      }

      if (this.deviceComparison) {
        this.deviceComparison.currentUrl = url;
      }

      if (this.breakpointRunner) {
        this.breakpointRunner.currentUrl = url;
      }

      if (saveHistory && window.HistoryManager) {
        window.HistoryManager.addEntry({
          type: 'responsive',
          url: url,
          device: this.currentDevice ? this.currentDevice.name : 'Unknown',
          viewport: `${this.currentDevice?.viewportWidth || 390} × ${this.currentDevice?.viewportHeight || 844}`,
          browser: this.browserType,
          timestamp: Date.now()
        });
      }
    }

    handleNavigationChange(url, navState = {}) {
      if (url && url !== this.currentUrl) {
        this.currentUrl = url;
        const urlInput = document.getElementById('responsiveUrlInput');
        if (urlInput) urlInput.value = url;
      }

      const backBtn = document.getElementById('btnNavBack');
      const fwdBtn = document.getElementById('btnNavForward');
      if (backBtn) backBtn.disabled = !navState.canGoBack;
      if (fwdBtn) fwdBtn.disabled = !navState.canGoForward;
    }

    selectDevice(device) {
      if (!device) return;
      this.currentDevice = device;
      this.updateConfigBarDevice();

      if (this.devicePreview) {
        this.devicePreview.setDevice(device);
      }

      if (this.viewportControls) {
        this.viewportControls.updateDevice(device);
      }

      if (this.deviceSelector) {
        this.deviceSelector.selectedDeviceId = device.id;
        this.deviceSelector.renderDeviceList();
      }
    }

    updateConfigBarDevice() {
      const topBarName = document.getElementById('topBarDeviceName');
      const topBarDims = document.getElementById('topBarDeviceDims');
      const topBarIcon = document.getElementById('topBarDeviceIcon');
      if (!this.currentDevice) return;

      if (topBarName) topBarName.textContent = this.currentDevice.name;
      if (topBarDims) topBarDims.textContent = `${this.currentDevice.viewportWidth || this.currentDevice.width} × ${this.currentDevice.viewportHeight || this.currentDevice.height}`;
      if (topBarIcon) {
        if (this.currentDevice.category === 'tablets') topBarIcon.textContent = '📱';
        else if (this.currentDevice.category === 'laptops') topBarIcon.textContent = '💻';
        else if (this.currentDevice.category === 'desktop') topBarIcon.textContent = '🖥️';
        else topBarIcon.textContent = '📱';
      }
    }

    updateOrientationLabel() {
      const label = document.getElementById('orientationLabel');
      if (label) {
        label.textContent = this.orientation.charAt(0).toUpperCase() + this.orientation.slice(1);
      }
    }

    toggleOrientation() {
      const nextOrientation = this.orientation === 'portrait' ? 'landscape' : 'portrait';
      this.orientation = nextOrientation;
      this.updateOrientationLabel();

      if (this.devicePreview) {
        this.devicePreview.setOrientation(nextOrientation);
      }
      if (this.viewportControls) {
        this.viewportControls.updateOrientation(nextOrientation);
      }
    }

    setCustomViewport(width, height) {
      if (window.DeviceRegistry && typeof window.DeviceRegistry.createCustomDevice === 'function') {
        const custom = window.DeviceRegistry.createCustomDevice(width, height);
        this.selectDevice(custom);
      }
    }

    openBreakpointRunner() {
      if (this.breakpointRunner) {
        this.breakpointRunner.show(this.currentUrl);
      }
    }

    openDeviceComparison() {
      if (this.deviceComparison) {
        this.deviceComparison.show(this.currentUrl);
      }
    }

    getSanitizedScreenshotFilename(type = 'viewport', width = 393, height = 852) {
      let domain = 'preview';
      try {
        const u = new URL(this.currentUrl.startsWith('http') ? this.currentUrl : `https://${this.currentUrl}`);
        domain = u.hostname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'preview';
      } catch (e) {
        domain = 'preview';
      }
      const devSlug = ((this.currentDevice && this.currentDevice.name) || 'device')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const kind = (type || 'viewport').toLowerCase().replace(/\s+/g, '-');
      return `${domain}-${devSlug}-${width}x${height}-${kind}-${dateStr}.png`;
    }

    async captureCurrentScreenshot() {
      if (!this.devicePreview || !this.currentDevice) return;

      const captureBtn = document.getElementById('btnCaptureResponsive');
      if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<span class="spinner-inline"></span> Capturing...';
      }

      try {
        const result = await this.devicePreview.captureScreenshot(false);
        if (!result || !result.screenshot) {
          throw new Error('Screenshot data was empty from Playwright session');
        }

        const isLandscape = this.orientation === 'landscape';
        const width = isLandscape ? (this.currentDevice.viewportHeight || 852) : (this.currentDevice.viewportWidth || 393);
        const height = isLandscape ? (this.currentDevice.viewportWidth || 393) : (this.currentDevice.viewportHeight || 852);
        const filename = this.getSanitizedScreenshotFilename('viewport', width, height);

        const record = {
          id: 'shot_vp_' + Date.now(),
          url: this.currentUrl,
          deviceName: this.currentDevice.name,
          deviceSlug: (this.currentDevice.name || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          width,
          height,
          orientation: this.orientation,
          type: 'Viewport',
          dataUrl: result.screenshot,
          timestamp: Date.now(),
          filename,
          fileSizeBytes: Math.round((result.screenshot.length - 22) * 0.75)
        };

        this.latestScreenshot = record;

        if (this.viewportControls && this.viewportControls.addScreenshot) {
          this.viewportControls.addScreenshot(record);
          this.viewportControls.switchTab('screenshots');
        }

        if (this.screenshotGallery && this.screenshotGallery.screenshots) {
          this.screenshotGallery.screenshots.unshift(record);
          if (this.screenshotGallery.renderGallery) this.screenshotGallery.renderGallery();
        }

        if (window.showToast) {
          window.showToast(`Viewport screenshot captured: ${filename}`);
        }
      } catch (err) {
        console.error('Failed to capture viewport screenshot:', err);
        alert('Could not capture viewport: ' + err.message);
      } finally {
        if (captureBtn) {
          captureBtn.disabled = false;
          captureBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            Capture Viewport
          `;
        }
      }
    }

    async captureFullPage() {
      if (!this.devicePreview || !this.currentDevice) return;
      const fullPageBtn = document.getElementById('btnCaptureFullPageTop');
      if (fullPageBtn) {
        fullPageBtn.disabled = true;
        fullPageBtn.innerHTML = '<span class="spinner-inline"></span> Capturing...';
      }

      try {
        const result = await this.devicePreview.captureScreenshot(true);
        if (!result || !result.screenshot) {
          throw new Error('Full page screenshot was empty from Playwright session');
        }

        const isLandscape = this.orientation === 'landscape';
        const width = isLandscape ? (this.currentDevice.viewportHeight || 852) : (this.currentDevice.viewportWidth || 393);
        const height = isLandscape ? (this.currentDevice.viewportWidth || 393) : (this.currentDevice.viewportHeight || 852);
        const filename = this.getSanitizedScreenshotFilename('fullpage', width, height);

        const record = {
          id: 'shot_full_' + Date.now(),
          url: this.currentUrl,
          deviceName: this.currentDevice.name,
          deviceSlug: (this.currentDevice.name || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          width,
          height,
          orientation: this.orientation,
          type: 'Full Page',
          dataUrl: result.screenshot,
          timestamp: Date.now(),
          filename,
          fileSizeBytes: Math.round((result.screenshot.length - 22) * 0.75)
        };

        this.latestScreenshot = record;

        if (this.viewportControls && this.viewportControls.addScreenshot) {
          this.viewportControls.addScreenshot(record);
          this.viewportControls.switchTab('screenshots');
        }

        if (this.screenshotGallery && this.screenshotGallery.screenshots) {
          this.screenshotGallery.screenshots.unshift(record);
          if (this.screenshotGallery.renderGallery) this.screenshotGallery.renderGallery();
        }

        if (window.showToast) {
          window.showToast(`Full page screenshot captured: ${filename}`);
        }
      } catch (err) {
        console.error('Full page capture error:', err);
        alert('Could not capture full page: ' + err.message);
      } finally {
        if (fullPageBtn) {
          fullPageBtn.disabled = false;
          fullPageBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            Full Page
          `;
        }
      }
    }

    async downloadScreenshot(record) {
      let target = record || this.latestScreenshot;
      if (!target && this.viewportControls && this.viewportControls.screenshots && this.viewportControls.screenshots.length > 0) {
        target = this.viewportControls.screenshots[0];
      }
      if (!target || !target.dataUrl) {
        // No screenshot exists yet: capture viewport now and trigger download
        if (window.showToast) window.showToast('Capturing viewport screenshot for download...');
        await this.captureCurrentScreenshot();
        target = this.latestScreenshot;
      }
      if (!target || !target.dataUrl) {
        alert('No screenshot available to download.');
        return;
      }

      const filename = target.filename || `screenshot-${Date.now()}.png`;
      const link = document.createElement('a');
      link.href = target.dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (window.showToast) {
        window.showToast(`Downloaded PNG: ${filename}`);
      }
    }

    openQaRunModal() {
      if (window.openAutomatedQa) {
        window.openAutomatedQa(this.currentUrl);
      } else if (window.Phase2QaModal) {
        window.Phase2QaModal.open({
          url: this.currentUrl,
          device: this.currentDevice,
          browser: this.browserType
        });
      }
    }

    // ----------------------------------------------------
    // BROWSER MATRIX RUNNER
    // ----------------------------------------------------
    openBrowserMatrix() {
      const modal = document.getElementById('browserMatrixModal');
      const urlDisplay = document.getElementById('browserMatrixModalUrl');
      if (!modal) return;

      if (urlDisplay) urlDisplay.textContent = this.currentUrl;
      modal.style.display = 'flex';
    }

    async executeBrowserMatrix() {
      const container = document.getElementById('browserMatrixResultsContainer');
      const runBtn = document.getElementById('btnRunBrowserMatrixAction');
      if (!container) return;

      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-inline"></span> Testing Engines...';
      }

      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted);">
          <div class="spinner-inline" style="width: 24px; height: 24px; border-width: 2px; margin-bottom: 12px;"></div>
          <div>Launching Chromium, Firefox, and Safari / WebKit Playwright browsers in parallel...</div>
        </div>
      `;

      try {
        const res = await fetch('/api/responsive/matrix/browsers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: this.currentUrl,
            browsers: ['chromium', 'firefox', 'webkit']
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to run browser matrix');

        const matrix = data.matrix || {};
        const entries = Object.entries(matrix);

        container.innerHTML = entries.map(([bKey, bResult]) => {
          const isOk = bResult.success && (!bResult.measurements || !bResult.measurements.hasHorizontalOverflow);
          const badgeClass = isOk ? 'badge-success' : 'badge-danger';
          const badgeText = isOk ? 'PASSED' : (bResult.error ? 'FAILED' : 'OVERFLOW');

          return `
            <div class="matrix-card">
              <div class="matrix-card-header">
                <div>
                  <div class="matrix-card-title">${escapeHtml(bResult.label || bKey)}</div>
                  <div class="matrix-card-engine font-mono">${escapeHtml(bResult.engine || bKey)}</div>
                </div>
                <span class="badge ${badgeClass} text-xs font-mono">${badgeText}</span>
              </div>
              <div class="matrix-thumb-wrap">
                ${bResult.screenshot ? `<img src="${bResult.screenshot}" alt="${bKey} render" class="matrix-thumb-img">` : `<div class="matrix-thumb-placeholder font-mono text-xs">No screenshot available</div>`}
              </div>
              <div class="matrix-card-stats font-mono text-xs">
                <div><span>Status:</span> <strong>HTTP ${bResult.statusCode || 200}</strong></div>
                <div><span>Load Time:</span> <strong>${((bResult.loadTimeMs || 0) / 1000).toFixed(2)}s</strong></div>
                <div><span>Console Errors:</span> <strong>${(bResult.consoleLogs || []).filter(l => l.type === 'error').length}</strong></div>
                <div><span>Overflow:</span> <strong>${bResult.measurements?.hasHorizontalOverflow ? 'Detected' : 'None'}</strong></div>
              </div>
            </div>
          `;
        }).join('');

      } catch (err) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-sm); color: #ef4444; font-size: 12px;">
            Failed to execute Browser Matrix: ${escapeHtml(err.message)}
          </div>
        `;
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Run Matrix Now
          `;
        }
      }
    }

    // ----------------------------------------------------
    // DEVICE MATRIX RUNNER
    // ----------------------------------------------------
    openDeviceMatrix() {
      const modal = document.getElementById('deviceMatrixModal');
      const urlDisplay = document.getElementById('deviceMatrixModalUrl');
      if (!modal) return;

      if (urlDisplay) urlDisplay.textContent = this.currentUrl;
      modal.style.display = 'flex';
    }

    async executeDeviceMatrix() {
      const container = document.getElementById('deviceMatrixResultsContainer');
      const runBtn = document.getElementById('btnRunDeviceMatrixAction');
      if (!container) return;

      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-inline"></span> Testing Devices...';
      }

      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted);">
          <div class="spinner-inline" style="width: 24px; height: 24px; border-width: 2px; margin-bottom: 12px;"></div>
          <div>Emulating flagship mobile, tablet, and desktop viewports in Playwright...</div>
        </div>
      `;

      try {
        const res = await fetch('/api/responsive/matrix/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: this.currentUrl,
            devices: ['iPhone 15 Pro', 'Pixel 7', 'iPad Pro 11', 'Desktop 1080p']
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to run device matrix');

        const matrix = data.matrix || {};
        const entries = Object.entries(matrix);

        container.innerHTML = entries.map(([devName, dResult]) => {
          const isOk = dResult.success && (!dResult.measurements || !dResult.measurements.hasHorizontalOverflow);
          const badgeClass = isOk ? 'badge-success' : 'badge-danger';
          const badgeText = isOk ? 'PASSED' : (dResult.error ? 'FAILED' : 'OVERFLOW');

          return `
            <div class="matrix-card">
              <div class="matrix-card-header">
                <div>
                  <div class="matrix-card-title">${escapeHtml(devName)}</div>
                  <div class="matrix-card-engine font-mono">${dResult.viewport?.width || 0} × ${dResult.viewport?.height || 0} (${dResult.deviceScaleFactor || 1}x)</div>
                </div>
                <span class="badge ${badgeClass} text-xs font-mono">${badgeText}</span>
              </div>
              <div class="matrix-thumb-wrap">
                ${dResult.screenshot ? `<img src="${dResult.screenshot}" alt="${devName} render" class="matrix-thumb-img">` : `<div class="matrix-thumb-placeholder font-mono text-xs">No screenshot available</div>`}
              </div>
              <div class="matrix-card-stats font-mono text-xs">
                <div><span>ScrollWidth:</span> <strong>${dResult.measurements?.scrollWidth || '—'}px</strong></div>
                <div><span>Load Time:</span> <strong>${((dResult.loadTimeMs || 0) / 1000).toFixed(2)}s</strong></div>
                <div><span>Console Errors:</span> <strong>${(dResult.consoleLogs || []).filter(l => l.type === 'error').length}</strong></div>
                <div><span>Layout State:</span> <strong>${dResult.measurements?.hasHorizontalOverflow ? 'Horizontal Scroll' : 'Clean'}</strong></div>
              </div>
            </div>
          `;
        }).join('');

      } catch (err) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-sm); color: #ef4444; font-size: 12px;">
            Failed to execute Device Matrix: ${escapeHtml(err.message)}
          </div>
        `;
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Run Device Matrix
          `;
        }
      }
    }

    // ----------------------------------------------------
    // COMPREHENSIVE RESPONSIVE AUDIT REPORT
    // ----------------------------------------------------
    async openResponsiveReport() {
      const modal = document.getElementById('responsiveReportModal');
      const urlDisplay = document.getElementById('reportModalUrl');
      const content = document.getElementById('responsiveReportContent');
      const timeEl = document.getElementById('reportGeneratedTime');

      if (!modal || !content) return;
      if (urlDisplay) urlDisplay.textContent = this.currentUrl;
      modal.style.display = 'flex';

      const completedTest = window.latestCompletedTest || this.devicePreview?.sessionData;
      if (!completedTest) {
        content.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">
            <div style="font-size: 28px; margin-bottom: 12px;">📊</div>
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--text-primary);">No completed test available</div>
            <div>Please enter a URL and run a test first before viewing the responsive audit report.</div>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <div class="spinner-inline" style="width: 24px; height: 24px; border-width: 2px; margin-bottom: 12px;"></div>
          <div>Compiling Playwright Responsive Audit Report...</div>
        </div>
      `;

      try {
        const res = await fetch('/api/responsive/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: this.currentUrl,
            sessionId: this.devicePreview?.sessionId,
            latestCompletedTest: completedTest
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to generate report');

        this.lastReport = data.report;
        if (timeEl) timeEl.textContent = `Generated: ${new Date(data.report.timestamp).toLocaleTimeString()}`;

        this.renderAuditReport(data.report, content);

      } catch (err) {
        content.innerHTML = `
          <div style="padding: 24px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-sm); color: #ef4444; font-size: 13px;">
            Failed to build Responsive Report: ${escapeHtml(err.message)}
          </div>
        `;
      }
    }

    renderAuditReport(report, container) {
      const s = report.summary || {};
      const scoreBadgeClass = s.score >= 90 ? 'badge-success' : (s.score >= 70 ? 'badge-warning' : 'badge-danger');

      container.innerHTML = `
        <div class="audit-report-sheet">
          <!-- Executive Summary -->
          <div class="report-summary-bar">
            <div class="report-score-box">
              <div class="report-score-val ${scoreBadgeClass}">${s.score || 0}</div>
              <div class="report-score-lbl">Responsive Score</div>
            </div>
            <div class="report-meta-stats font-mono">
              <div class="report-stat-item">
                <span class="report-stat-num text-success">${s.totalPassed || 0}</span>
                <span class="report-stat-name">Passed</span>
              </div>
              <div class="report-stat-item">
                <span class="report-stat-num text-warning">${s.warnings || 0}</span>
                <span class="report-stat-name">Warnings</span>
              </div>
              <div class="report-stat-item">
                <span class="report-stat-num text-danger">${s.violations || 0}</span>
                <span class="report-stat-name">Violations</span>
              </div>
              <div class="report-stat-item">
                <span class="report-stat-num text-muted">${s.totalTested || 0}</span>
                <span class="report-stat-name">Total Tests</span>
              </div>
            </div>
          </div>

          <!-- Target & Runtime Info -->
          <div class="report-section">
            <div class="report-section-title">Test Environment &amp; Engine</div>
            <div class="report-info-grid font-mono text-xs">
              <div><span>Target URL:</span> <a href="${escapeHtml(report.url)}" target="_blank">${escapeHtml(report.url)}</a></div>
              <div><span>Final Resolved URL:</span> ${escapeHtml(report.finalUrl || report.url)}</div>
              <div><span>Playwright Engine:</span> Local Headless (${escapeHtml(report.browser?.engine || 'Chromium')})</div>
              <div><span>Test Timestamp:</span> ${new Date(report.timestamp).toLocaleString()}</div>
            </div>
          </div>

          <!-- Issues & Overflow Analysis -->
          <div class="report-section">
            <div class="report-section-title">Responsive Issues &amp; Overflow Analysis</div>
            ${(report.issues && report.issues.length > 0) ? `
              <div class="report-issues-table-wrap">
                <table class="report-table font-mono text-xs">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Category</th>
                      <th>Issue Description</th>
                      <th>Element / Culprit</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.issues.map(iss => `
                      <tr>
                        <td><span class="badge badge-${iss.severity === 'critical' ? 'danger' : 'warning'} text-xs">${iss.severity.toUpperCase()}</span></td>
                        <td>${escapeHtml(iss.type || 'Layout')}</td>
                        <td>${escapeHtml(iss.message)}</td>
                        <td><code>${escapeHtml(iss.element || 'body')}</code></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="tab-empty-state"><div class="empty-desc">✓ No horizontal overflow or layout defects detected!</div></div>
            `}
          </div>

          <!-- Performance & Resource Metrics -->
          <div class="report-section">
            <div class="report-section-title">Performance Timings &amp; Telemetry</div>
            <div class="report-timing-grid font-mono text-xs">
              <div class="timing-box">
                <span class="tb-name">DNS / TCP</span>
                <span class="tb-val">${Math.round(report.performanceTimings?.dns || 0)}ms</span>
              </div>
              <div class="timing-box">
                <span class="tb-name">TTFB</span>
                <span class="tb-val">${Math.round(report.performanceTimings?.ttfb || 0)}ms</span>
              </div>
              <div class="timing-box">
                <span class="tb-name">DOMContentLoaded</span>
                <span class="tb-val">${Math.round(report.performanceTimings?.domContentLoaded || 0)}ms</span>
              </div>
              <div class="timing-box">
                <span class="tb-name">Full Load</span>
                <span class="tb-val">${Math.round(report.performanceTimings?.load || 0)}ms</span>
              </div>
            </div>
          </div>

          <!-- Actionable Recommendations -->
          <div class="report-section">
            <div class="report-section-title">Developer Remediation Steps</div>
            <ul class="report-recommendations-list text-xs">
              ${(report.issues && report.issues.length > 0) ? `
                <li>Ensure container elements specify <code>max-width: 100%</code> and <code>box-sizing: border-box</code> to avoid horizontal viewport overflow.</li>
                <li>Verify images, svgs, and iframes have <code>max-width: 100%</code> and <code>height: auto</code>.</li>
                <li>Avoid rigid pixel widths (e.g. <code>width: 1200px</code>) on containers without media query constraints.</li>
              ` : `
                <li>All responsive viewport metrics and scrollWidth constraints met requirements.</li>
                <li>Continue verifying dynamic interactive states and drawer components.</li>
              `}
            </ul>
          </div>
        </div>
      `;
    }

    // ----------------------------------------------------
    // TELEMETRY & BOTTOM DRAWER LOGGING
    // ----------------------------------------------------
    renderConsoleLogs() {
      const container = document.getElementById('consoleLogsList');
      const badge = document.getElementById('bottomConsoleCount');
      if (badge) badge.textContent = this.consoleLogs.length;

      if (!container) return;
      if (this.consoleLogs.length === 0) {
        container.innerHTML = '<div class="tab-empty-state"><div class="empty-desc">No console messages logged.</div></div>';
        return;
      }

      container.innerHTML = this.consoleLogs.map(log => `
        <div class="console-log-item log-${log.type}">
          <span class="log-type-tag">${log.type.toUpperCase()}</span>
          <span class="log-text font-mono">${escapeHtml(log.text)}</span>
          ${log.location ? `<span class="log-location font-mono">${escapeHtml(log.location)}</span>` : ''}
        </div>
      `).join('');
    }

    renderNetworkErrors() {
      const container = document.getElementById('networkErrorsList');
      const badge = document.getElementById('bottomNetworkCount');
      if (badge) badge.textContent = this.networkErrors.length;

      if (!container) return;
      if (this.networkErrors.length === 0) {
        container.innerHTML = '<div class="tab-empty-state"><div class="empty-desc">No network failures observed.</div></div>';
        return;
      }

      container.innerHTML = this.networkErrors.map(err => `
        <div class="network-error-item">
          <span class="net-method font-mono">${err.method || 'GET'}</span>
          <span class="net-url font-mono">${escapeHtml(err.url)}</span>
          <span class="net-status font-mono text-danger">${err.status || err.errorText || 'Failed'}</span>
        </div>
      `).join('');
    }

    handleMeasurementsUpdate(data) {
      const container = document.getElementById('drawerIssuesList');
      const badge = document.getElementById('bottomIssuesCount');
      const m = data?.measurements;

      let issueCount = 0;
      if (m?.hasHorizontalOverflow) issueCount++;
      if (m?.overflowElements?.length) issueCount += m.overflowElements.length;

      if (badge) badge.textContent = issueCount;
      if (!container) return;

      if (!m || !m.hasHorizontalOverflow) {
        container.innerHTML = '<div class="tab-empty-state"><div class="empty-desc">✓ Zero horizontal overflow detected. Clean responsive layout.</div></div>';
        return;
      }

      container.innerHTML = `
        <div class="overflow-alert-box">
          <strong>⚠️ Horizontal Overflow Detected:</strong> Document scrollWidth (${m.scrollWidth}px) exceeds viewport clientWidth (${m.clientWidth}px).
        </div>
        ${(m.overflowElements && m.overflowElements.length) ? `
          <div class="culprit-elements-list">
            <div class="culprit-title">Culprit Elements Causing Overflow:</div>
            ${m.overflowElements.map(el => `
              <div class="culprit-item font-mono text-xs">
                <code>${escapeHtml(el.tag)}${el.id ? '#' + escapeHtml(el.id) : ''}${el.className ? '.' + escapeHtml(el.className) : ''}</code>
                <span>Width: ${el.box?.width}px &middot; Right edge: ${el.box?.right}px</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    }

    renderHistoryDrawer() {
      const container = document.getElementById('drawerHistoryList');
      if (!container || !window.HistoryManager) return;

      const entries = window.HistoryManager.getEntries('responsive') || [];
      if (entries.length === 0) {
        container.innerHTML = '<div class="tab-empty-state"><div class="empty-desc">No recent responsive test history.</div></div>';
        return;
      }

      container.innerHTML = entries.slice(0, 15).map(e => `
        <div class="history-drawer-item" data-history-url="${escapeHtml(e.url)}">
          <div class="h-item-main">
            <span class="h-item-url font-mono">${escapeHtml(e.url)}</span>
            <span class="h-item-meta">${escapeHtml(e.device || 'Default')} &middot; ${escapeHtml(e.viewport || '')}</span>
          </div>
          <span class="h-item-time text-xs text-muted">${new Date(e.timestamp).toLocaleTimeString()}</span>
        </div>
      `).join('');

      container.querySelectorAll('.history-drawer-item').forEach(el => {
        el.addEventListener('click', () => {
          const url = el.dataset.historyUrl;
          if (url) this.loadUrl(url, false);
        });
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize tool on ready or immediately if loaded
  if (typeof window !== 'undefined') {
    window.ResponsiveTesterTool = ResponsiveTesterTool;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.responsiveTesterInstance = new ResponsiveTesterTool();
        window.ResponsiveTester = window.responsiveTesterInstance;
      });
    } else {
      window.responsiveTesterInstance = new ResponsiveTesterTool();
      window.ResponsiveTester = window.responsiveTesterInstance;
    }
  }
})();
