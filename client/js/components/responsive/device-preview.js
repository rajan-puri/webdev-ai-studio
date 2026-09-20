/**
 * client/js/components/responsive/device-preview.js
 * Professional Responsive Viewport Preview Workspace:
 * - Powered by genuine Playwright testing engine + professional visual device frames.
 * - Supports PhoneFrame (iPhone), AndroidFrame (Galaxy/Pixel), TabletFrame (iPad),
 *   MacBookFrame, LaptopFrame (Windows), and DesktopFrame (Monitors).
 * - High-precision visual scaling (FIT mode, Zoom -, Zoom +) preserving aspect ratio.
 * - Three distinct preview states:
 *     1. Interactive Preview (● Live Webpage inside iframe)
 *     2. Iframe Blocked (● Interactive Preview Unavailable -> Auto-runs Playwright)
 *     3. Playwright Test Preview (● Playwright Test Capture)
 *     4. Local Simulation (● Local Viewport Simulation)
 * - Full navigation support (Back, Forward, Reload, Load).
 */

(function () {
  'use strict';

  class DevicePreview {
    constructor(options = {}) {
      this.options = options;
      this.container = document.getElementById(options.containerId || 'devicePreviewContainer');
      this.onNavigationChange = options.onNavigationChange || null;
      this.onDeviceChange = options.onDeviceChange || null;
      this.onOrientationChange = options.onOrientationChange || null;
      this.onZoomChange = options.onZoomChange || null;
      this.onMeasurementsUpdated = options.onMeasurementsUpdated || null;
      this.onConsoleUpdated = options.onConsoleUpdated || null;
      this.onNetworkUpdated = options.onNetworkUpdated || null;

      // Active state
      this.sessionId = 'session_' + Math.random().toString(36).slice(2, 8);
      this.currentDevice = options.initialDevice || (window.DeviceRegistry && window.DeviceRegistry.getDevice('iphone-15-pro')) || {
        id: 'iphone-15-pro',
        name: 'iPhone 15 Pro',
        viewportWidth: 393,
        viewportHeight: 852,
        deviceScaleFactor: 3,
        defaultBrowserType: 'webkit',
        isMobile: true,
        category: 'mobile'
      };
      this.currentUrl = (window.normalizeTargetUrl ? window.normalizeTargetUrl(options.initialUrl) : options.initialUrl) || 'https://example.com/';
      this.browserType = options.browserType || (this.currentDevice.defaultBrowserType || 'chromium');
      this.currentOrientation = options.orientation || 'portrait';
      
      // Modes: 'interactive' | 'playwright' | 'simulation'
      this.previewMode = options.initialMode || 'interactive';
      this.currentZoom = 1.0;
      this.isAutoFit = true;
      this.zoomSteps = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0];

      this.loadState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'blocked' | 'error'
      this.sessionData = null;
      this.securityInfo = null;
      this.canGoBack = false;
      this.canGoForward = false;
      this.browserInfo = { type: this.browserType, engine: 'Chromium', version: '' };
      this.loadTimeMs = 0;
      this.httpStatus = 200;

      this.init();
    }

    init() {
      if (!this.container) {
        this.container = document.getElementById(this.options.containerId || 'devicePreviewContainer');
      }
      if (!this.container) return;

      this.render();

      const stage = this.container.querySelector('#previewCanvasStage');
      if (stage && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.isAutoFit) {
            this.autoFit();
          }
        });
        this.resizeObserver.observe(stage);
      }

      requestAnimationFrame(() => {
        this.autoFit();
      });

      if (this.currentUrl) {
        this.loadUrl(this.currentUrl);
      }
    }

    getViewportDims() {
      const isLandscape = this.currentOrientation === 'landscape';
      const baseW = this.currentDevice.viewportWidth || 390;
      const baseH = this.currentDevice.viewportHeight || 844;
      const width = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
      const height = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
      return { width, height };
    }

    setBrowserType(type) {
      if (this.browserType === type) return;
      this.browserType = type;
      this.updateHeaderBadge();
      if (this.previewMode === 'playwright' && this.currentUrl) {
        this.loadUrl(this.currentUrl);
      }
    }

    setDevice(device) {
      if (!device) return;
      this.currentDevice = device;
      if (device.category === 'desktop' || device.category === 'laptop') {
        this.currentOrientation = 'landscape';
      }

      // Automatically pair recommended browser engine with device
      if (device.defaultBrowserType) {
        this.browserType = device.defaultBrowserType;
        const browserSelect = document.getElementById('selectBrowserEngine');
        if (browserSelect) browserSelect.value = this.browserType;
      }

      this.isAutoFit = true;
      this.render();
      this.autoFit();

      if (this.onDeviceChange) this.onDeviceChange(this.currentDevice, this.currentOrientation);
      if (this.currentUrl) {
        this.loadUrl(this.currentUrl);
      }
    }

    setOrientation(orientation) {
      if (this.currentOrientation === orientation) return;
      this.currentOrientation = orientation;
      this.isAutoFit = true;
      this.render();
      this.autoFit();

      if (this.onOrientationChange) this.onOrientationChange(this.currentOrientation);
      if (this.currentUrl) {
        this.loadUrl(this.currentUrl);
      }
    }

    toggleOrientation() {
      const next = this.currentOrientation === 'portrait' ? 'landscape' : 'portrait';
      this.setOrientation(next);
    }

    setMode(mode) {
      if (this.previewMode === mode) return;
      this.previewMode = mode;
      this.updateHeaderBadge();
      this.updateModeTogglePills();

      if (this.currentUrl) {
        this.loadUrl(this.currentUrl);
      }
    }

    updateModeTogglePills() {
      const btnInteractive = document.getElementById('btnModeInteractive');
      const btnPlaywright = document.getElementById('btnModePlaywright');
      const btnSim = document.getElementById('btnModeSimulation');

      if (btnInteractive) btnInteractive.classList.toggle('active', this.previewMode === 'interactive');
      if (btnPlaywright) btnPlaywright.classList.toggle('active', this.previewMode === 'playwright');
      if (btnSim) btnSim.classList.toggle('active', this.previewMode === 'simulation');
    }

    setZoom(zoom) {
      this.isAutoFit = false;
      this.currentZoom = Math.min(2.0, Math.max(0.2, parseFloat(zoom) || 1.0));
      this.applyZoom();
      this.updateZoomDisplay();
      if (this.onZoomChange) this.onZoomChange(this.currentZoom);
    }

    zoomIn() {
      this.isAutoFit = false;
      const current = Math.round(this.currentZoom * 100) / 100;
      const next = this.zoomSteps.find(z => z > current + 0.04) || (current + 0.1);
      this.setZoom(Math.min(2.0, next));
    }

    zoomOut() {
      this.isAutoFit = false;
      const current = Math.round(this.currentZoom * 100) / 100;
      const reversed = [...this.zoomSteps].reverse();
      const prev = reversed.find(z => z < current - 0.04) || (current - 0.1);
      this.setZoom(Math.max(0.2, prev));
    }

    autoFit() {
      const stage = this.container ? this.container.querySelector('#previewCanvasStage') : null;
      if (!stage || !this.currentDevice) return;

      const { width, height } = this.getViewportDims();
      
      // Calculate extra frame padding based on device category
      let extraW = 32;
      let extraH = 44;
      const cat = (this.currentDevice.category || '').toLowerCase();
      if (cat === 'laptop' || cat === 'laptops') {
        extraW = 48;
        extraH = 72;
      } else if (cat === 'desktop') {
        extraW = 40;
        extraH = 110;
      } else if (cat === 'tablet') {
        extraW = 36;
        extraH = 50;
      }

      const totalW = width + extraW;
      const totalH = height + extraH;

      const availW = Math.max(160, stage.clientWidth - 48);
      const availH = Math.max(160, stage.clientHeight - 48);

      const scaleW = availW / totalW;
      const scaleH = availH / totalH;
      let bestScale = Math.min(scaleW, scaleH);

      bestScale = Math.min(1.0, bestScale);
      bestScale = Math.max(0.2, Math.round(bestScale * 100) / 100);

      this.currentZoom = bestScale;
      this.applyZoom();
      this.updateZoomDisplay();
      if (this.onZoomChange) this.onZoomChange(this.currentZoom);
    }

    applyZoom() {
      const footprint = this.container.querySelector('#viewportFootprint');
      const scaler = this.container.querySelector('#viewportScaler');
      const frameBox = this.container.querySelector('.device-frame-box');
      if (!scaler || !footprint || !frameBox) return;

      const totalW = frameBox.offsetWidth || (this.getViewportDims().width + 30);
      const totalH = frameBox.offsetHeight || (this.getViewportDims().height + 40);

      const scaledW = Math.round(totalW * this.currentZoom);
      const scaledH = Math.round(totalH * this.currentZoom);

      footprint.style.width = `${scaledW}px`;
      footprint.style.height = `${scaledH}px`;
      scaler.style.width = `${totalW}px`;
      scaler.style.height = `${totalH}px`;
      scaler.style.transform = `translate(-50%, -50%) scale(${this.currentZoom})`;
    }

    updateZoomDisplay() {
      const label = this.container.querySelector('#previewZoomLabel');
      if (label) {
        label.textContent = `${Math.round(this.currentZoom * 100)}%`;
      }
      const zoomBadge = this.container.querySelector('#footerZoomBadge');
      if (zoomBadge) {
        zoomBadge.textContent = `Preview Scale: ${Math.round(this.currentZoom * 100)}%`;
      }
    }

    // ----------------------------------------------------
    // MAIN URL LOADING LOGIC
    // ----------------------------------------------------
    async loadUrl(newUrl) {
      let url = (newUrl || this.currentUrl || '').trim();
      if (!url) return;

      url = window.normalizeTargetUrl ? window.normalizeTargetUrl(url) : url;
      this.currentUrl = url;
      this.loadState = 'loading';
      this.updateStatusBadge();
      this.renderLoadingState();

      if (this.previewMode === 'simulation') {
        this.mountSimulationIframe();
        return;
      }

      // Execute Playwright test via /api/responsive/test as the primary testing engine
      await this.runPlaywrightTest();
    }

    async runPlaywrightTest() {
      const startTime = Date.now();
      const dims = this.getViewportDims();
      try {
        const res = await fetch('/api/responsive/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            url: this.currentUrl,
            browser: this.browserType,
            device: {
              id: this.currentDevice.id,
              name: this.currentDevice.playwrightName || this.currentDevice.name,
              width: dims.width,
              height: dims.height,
              deviceScaleFactor: this.currentDevice.deviceScaleFactor || 1
            },
            orientation: this.currentOrientation
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Server responded with ${res.status}`);
        }

        this.sessionData = data;
        this.securityInfo = data.interactivePreview || { allowed: true, reason: null };
        this.loadState = 'loaded';
        this.canGoBack = Boolean(data.navigation && data.navigation.canGoBack);
        this.canGoForward = Boolean(data.navigation && data.navigation.canGoForward);
        this.browserInfo = { type: data.browser, engine: data.engine || 'Playwright', version: data.browserVersion || '' };
        this.loadTimeMs = data.loadTimeMs || data.navigationTime || (Date.now() - startTime);
        this.httpStatus = data.statusCode || data.status || 200;

        // Store central state
        window.latestCompletedTest = data;
        if (window.responsiveTesterState) {
          window.responsiveTesterState.setState({
            latestTest: data,
            latestCompletedTest: data,
            timing: data.timings,
            consoleLogs: data.consoleLogs || [],
            networkErrors: data.networkErrors || [],
            responsiveIssues: (data.measurements && data.measurements.issues) || [],
            overflow: data.overflow || (data.measurements && data.measurements.overflow)
          });
        }

        this.renderViewportContent();
        this.updateHeaderBadge();
        this.updateStatusBadge();
        this.updateNavigationControls();

        if (this.onMeasurementsUpdated && data.measurements) {
          this.onMeasurementsUpdated({
            measurements: data.measurements,
            device: data.device,
            browser: data.browser,
            timings: data.timings
          });
        }

        if (this.onConsoleUpdated && data.consoleLogs) {
          this.onConsoleUpdated(data.consoleLogs);
        }

        if (this.onNetworkUpdated && data.networkErrors) {
          this.onNetworkUpdated(data.networkErrors);
        }
      } catch (err) {
        console.error('[DevicePreview] Playwright test error:', err);
        this.loadState = 'error';
        this.updateStatusBadge();
        this.renderErrorState(err.message);
      }
    }

    async runPlaywrightSession() {
      return this.runPlaywrightTest();
    }

    async loadInteractivePreview() {
      return this.runPlaywrightTest();
    }

    renderInteractiveIframe() {
      const slot = this.container.querySelector('.screen-content-slot');
      if (!slot) return;

      slot.innerHTML = `
        <iframe 
          id="interactivePreviewIframe"
          class="preview-interactive-iframe"
          src="${escapeHtml(this.currentUrl)}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="fullscreen"
          style="width: 100%; height: 100%; border: none; background: #ffffff; display: block;"
        ></iframe>
      `;

      const iframe = slot.querySelector('#interactivePreviewIframe');
      if (iframe) {
        iframe.onload = () => {
          this.loadState = 'loaded';
          this.updateStatusBadge();
        };
        iframe.onerror = () => {
          if (this.sessionData && this.sessionData.screenshot) {
            this.renderViewportContent();
          }
        };
      }
    }

    // ----------------------------------------------------
    // REAL NAVIGATION CONTROLS
    // ----------------------------------------------------
    async navigateBack() {
      if (this.previewMode === 'interactive') {
        const iframe = this.container.querySelector('#interactivePreviewIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.history.back();
            return;
          } catch (e) {}
        }
      }

      if (!this.canGoBack) return;
      this.loadState = 'loading';
      this.updateStatusBadge();
      this.renderLoadingState();

      try {
        const res = await fetch('/api/responsive/session/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, action: 'back' })
        });
        const data = await res.json();
        if (data.success) {
          this.sessionData = data;
          this.currentUrl = data.url;
          this.canGoBack = Boolean(data.navigation && data.navigation.canGoBack);
          this.canGoForward = Boolean(data.navigation && data.navigation.canGoForward);
          this.loadState = 'loaded';
          this.renderViewportContent();
          this.updateHeaderBadge();
          this.updateStatusBadge();
          this.updateNavigationControls();
          if (this.onNavigationChange) this.onNavigationChange(this.currentUrl, { canGoBack: this.canGoBack, canGoForward: this.canGoForward });
        }
      } catch (e) {
        this.loadState = 'error';
        this.updateStatusBadge();
      }
    }

    async navigateForward() {
      if (this.previewMode === 'interactive') {
        const iframe = this.container.querySelector('#interactivePreviewIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.history.forward();
            return;
          } catch (e) {}
        }
      }

      if (!this.canGoForward) return;
      this.loadState = 'loading';
      this.updateStatusBadge();
      this.renderLoadingState();

      try {
        const res = await fetch('/api/responsive/session/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, action: 'forward' })
        });
        const data = await res.json();
        if (data.success) {
          this.sessionData = data;
          this.currentUrl = data.url;
          this.canGoBack = Boolean(data.navigation && data.navigation.canGoBack);
          this.canGoForward = Boolean(data.navigation && data.navigation.canGoForward);
          this.loadState = 'loaded';
          this.renderViewportContent();
          this.updateHeaderBadge();
          this.updateStatusBadge();
          this.updateNavigationControls();
          if (this.onNavigationChange) this.onNavigationChange(this.currentUrl, { canGoBack: this.canGoBack, canGoForward: this.canGoForward });
        }
      } catch (e) {
        this.loadState = 'error';
        this.updateStatusBadge();
      }
    }

    async reload() {
      if (this.previewMode === 'interactive') {
        const iframe = this.container.querySelector('#interactivePreviewIframe');
        if (iframe) {
          iframe.src = iframe.src;
          return;
        }
      }

      if (this.previewMode === 'simulation') {
        this.mountSimulationIframe();
        return;
      }

      // Playwright Reload
      this.loadState = 'loading';
      this.updateStatusBadge();
      this.renderLoadingState();

      try {
        const res = await fetch('/api/responsive/session/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, action: 'reload' })
        });
        const data = await res.json();
        if (data.success) {
          this.sessionData = data;
          this.loadState = 'loaded';
          this.renderViewportContent();
          this.updateHeaderBadge();
          this.updateStatusBadge();
        }
      } catch (e) {
        this.loadState = 'error';
        this.updateStatusBadge();
      }
    }

    mountSimulationIframe() {
      const slot = this.container.querySelector('.screen-content-slot');
      if (!slot) return;

      const { width, height } = this.getViewportDims();

      slot.innerHTML = `
        <div class="simulation-banner">
          <div class="sim-banner-left">
            <span class="badge badge-warning">LOCAL VIEWPORT SIMULATION</span>
            <span class="sim-banner-text">${width} × ${height} Local Browser Viewport</span>
          </div>
          <button class="btn btn-primary btn-xs" id="btnSwitchToInteractiveFromSim">Switch to Interactive</button>
        </div>
        <iframe 
          id="simulationIframe" 
          class="preview-simulation-iframe" 
          src="${escapeHtml(this.currentUrl)}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style="width: 100%; height: calc(100% - 30px); border: none; background: #ffffff;"
        ></iframe>
      `;

      slot.querySelector('#btnSwitchToInteractiveFromSim')?.addEventListener('click', () => {
        this.setMode('interactive');
      });
    }

    renderLoadingState() {
      const slot = this.container.querySelector('.screen-content-slot');
      if (!slot) return;

      const isInteractive = this.previewMode === 'interactive';
      const engineName = this.browserType === 'webkit' ? 'WebKit' : (this.browserType === 'firefox' ? 'Firefox' : 'Chromium');

      slot.innerHTML = `
        <div class="preview-loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-state-title">${isInteractive ? 'Connecting to Webpage...' : `Launching ${engineName}...`}</div>
          <div class="loading-state-desc font-mono">${escapeHtml(this.currentUrl)}</div>
          <div class="loading-state-sub">${isInteractive ? 'Inspecting embedding security headers' : 'Emulating device & measuring DOM metrics'}</div>
        </div>
      `;
    }

    renderErrorState(errMsg) {
      const slot = this.container.querySelector('.screen-content-slot');
      if (!slot) return;

      slot.innerHTML = `
        <div class="preview-error-card">
          <div class="error-badge">Testing Error</div>
          <div class="error-title">Could not load website</div>
          <div class="error-desc">${escapeHtml(errMsg || 'Network or browser launch error occurred.')}</div>
          <div class="error-actions">
            <button class="btn btn-secondary btn-sm" id="btnRetryLoad">Retry in Chromium</button>
            <button class="btn btn-secondary btn-sm" id="btnTryInteractive">Use Interactive Preview</button>
            <a href="${escapeHtml(this.currentUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Open in Browser ↗</a>
          </div>
        </div>
      `;

      slot.querySelector('#btnRetryLoad')?.addEventListener('click', () => {
        this.browserType = 'chromium';
        this.loadUrl(this.currentUrl);
      });
      slot.querySelector('#btnTryInteractive')?.addEventListener('click', () => {
        this.setMode('interactive');
      });
    }

    renderViewportContent() {
      const slot = this.container.querySelector('.screen-content-slot');
      if (!slot) return;

      if (this.previewMode === 'simulation') {
        this.mountSimulationIframe();
        return;
      }

      const { width, height } = this.getViewportDims();
      const browserLabel = this.browserType === 'webkit' ? 'Safari / WebKit' : (this.browserType === 'firefox' ? 'Firefox' : 'Chromium');
      const isSecurityBlocked = Boolean(this.securityInfo && this.securityInfo.allowed === false);

      // In interactive mode, if embedding is allowed and not blocked, render the live iframe
      if (this.previewMode === 'interactive' && !isSecurityBlocked) {
        this.renderInteractiveIframe();
        return;
      }

      // If embedding is blocked OR if mode is 'playwright': render the genuine Playwright test capture
      if (this.sessionData && this.sessionData.screenshot) {
        const bannerNoticeHtml = isSecurityBlocked
          ? `
            <div class="playwright-capture-banner font-mono text-xs" style="background: rgba(234, 179, 8, 0.12); border-bottom: 1px solid rgba(234, 179, 8, 0.25); color: #b45309;">
              <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">EMBEDDING RESTRICTED</span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: calc(100% - 170px);" title="${escapeHtml(this.securityInfo.reason)}">Playwright Capture · ${escapeHtml(this.securityInfo.reason)}</span>
              <a href="${escapeHtml(this.currentUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs" style="margin-left: auto; color: inherit; font-size: 10px;">Open ↗</a>
            </div>
          `
          : `
            <div class="playwright-capture-banner font-mono text-xs">
              <span class="badge badge-subtle">PLAYWRIGHT TEST CAPTURE</span>
              <span>${browserLabel} · ${width} × ${height} · ${((this.loadTimeMs || 0) / 1000).toFixed(2)}s</span>
              <button class="btn btn-ghost btn-xs" id="btnReturnToInteractive" style="margin-left: auto;">Switch to Interactive Webpage →</button>
            </div>
          `;

        slot.innerHTML = `
          <div class="playwright-capture-container">
            ${bannerNoticeHtml}
            <div class="playwright-screenshot-scrollable">
              <img 
                id="previewScreenshotImg" 
                class="preview-live-screenshot" 
                src="${this.sessionData.screenshot}" 
                alt="Playwright Test Capture"
                style="cursor: crosshair; user-select: none;"
                title="Click anywhere to interact with this page in Playwright"
              >
            </div>
          </div>
        `;

        slot.querySelector('#btnReturnToInteractive')?.addEventListener('click', () => {
          this.setMode('interactive');
        });

        // Add interactive click emulation on the Playwright capture
        const img = slot.querySelector('#previewScreenshotImg');
        if (img) {
          img.addEventListener('click', async (e) => {
            const rect = img.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const scaleX = (this.sessionData.viewport?.width || width) / rect.width;
            const scaleY = (this.sessionData.viewport?.height || height) / rect.height;
            const clickX = Math.round((e.clientX - rect.left) * scaleX);
            const clickY = Math.round((e.clientY - rect.top) * scaleY);

            try {
              img.style.opacity = '0.7';
              const res = await fetch('/api/responsive/session/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: this.sessionId,
                  action: 'click',
                  x: clickX,
                  y: clickY
                })
              });
              const actionData = await res.json();
              if (actionData.success && actionData.screenshot) {
                this.sessionData = actionData;
                this.canGoBack = Boolean(actionData.navigation?.canGoBack);
                this.canGoForward = Boolean(actionData.navigation?.canGoForward);
                this.renderViewportContent();
                this.updateNavigationControls();
              }
            } catch (err) {
              console.warn('Playwright click emulation error:', err);
            } finally {
              if (img) img.style.opacity = '1';
            }
          });
        }
      } else {
        this.renderLoadingState();
      }
    }

    async captureScreenshot(fullPage = false) {
      if (!this.sessionId) {
        await this.navigate(this.currentUrl);
      }
      try {
        const res = await fetch('/api/responsive/session/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, action: 'screenshot', fullPage: Boolean(fullPage) })
        });
        const data = await res.json();
        if (data.success && data.screenshot) {
          return data;
        } else {
          throw new Error(data.error || 'Failed to capture screenshot');
        }
      } catch (err) {
        console.error('Capture screenshot error:', err);
        throw err;
      }
    }

    async captureFullPage() {
      return this.captureScreenshot(true);
    }

    render() {
      if (!this.container) return;

      const { width, height } = this.getViewportDims();
      const FrameRegistry = window.DeviceFrameRegistry;

      // Render the professional device mockup frame wrapping the viewport slot
      let frameMarkup = '';
      if (FrameRegistry && typeof FrameRegistry.renderFrame === 'function') {
        frameMarkup = FrameRegistry.renderFrame({
          device: this.currentDevice,
          orientation: this.currentOrientation,
          childrenHtml: '',
          currentUrl: this.currentUrl
        });
      } else {
        frameMarkup = `
          <div class="device-frame-box" style="width:${width}px;">
            <div class="phone-screen" style="width:${width}px;height:${height}px;">
              <div class="screen-content-slot" style="width:100%;height:100%;"></div>
            </div>
          </div>
        `;
      }

      this.container.innerHTML = `
        <div class="viewport-workspace-container">
          <!-- Top Info Strip -->
          <div class="viewport-header-strip">
            <div class="vp-header-left">
              <span class="vp-device-title" id="vpDeviceTitle">${escapeHtml(this.currentDevice.name)}</span>
              <span class="sep">·</span>
              <span class="vp-dims-label font-mono" id="vpDimsLabel">${width} × ${height}</span>
              <span class="sep">·</span>
              <span class="vp-browser-label" id="vpBrowserLabel">${this.browserType === 'webkit' ? 'Safari / WebKit' : (this.browserType === 'firefox' ? 'Firefox' : 'Chromium')}</span>
              <span class="sep">·</span>
              <span class="vp-profile-tag" id="vpProfileTag">${this.previewMode === 'interactive' ? 'Live Webpage' : 'Playwright Capture'}</span>
            </div>
            <div class="vp-header-right">
              <div class="vp-mode-pill font-mono" id="vpModePill">${this.getModeLabel()}</div>
              <span class="vp-status-dot" id="vpStatusDot"></span>
              <span class="vp-status-text font-mono" id="vpStatusText">Ready</span>
            </div>
          </div>

          <!-- Stage Toolbar (Navigation & Visual Zoom) -->
          <div class="viewport-stage-toolbar">
            <div class="stage-nav-group">
              <button class="btn-tool-icon" id="btnStageBack" type="button" title="Back" disabled>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button class="btn-tool-icon" id="btnStageForward" type="button" title="Forward" disabled>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <button class="btn-tool-icon" id="btnStageReload" type="button" title="Reload Webpage">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
            </div>

            <div class="stage-center-meta">
              <span class="font-mono text-muted" id="stageTargetUrl">${escapeHtml(this.currentUrl)}</span>
            </div>

            <div class="stage-zoom-group">
              <button class="btn-zoom-step" id="btnZoomOut" type="button" title="Zoom Out">−</button>
              <span class="zoom-value-label font-mono" id="previewZoomLabel">100%</span>
              <button class="btn-zoom-step" id="btnZoomIn" type="button" title="Zoom In">+</button>
              <button class="btn-zoom-step btn-zoom-fit" id="btnZoomFit" type="button" title="Auto Fit to Screen">FIT</button>
            </div>
          </div>

          <!-- Canvas Stage -->
          <div class="preview-canvas-stage" id="previewCanvasStage">
            <div class="viewport-footprint" id="viewportFootprint">
              <div class="viewport-scaler" id="viewportScaler">
                ${frameMarkup}
              </div>
            </div>
          </div>

          <!-- Bottom Viewport Footer Strip -->
          <div class="viewport-footer-strip">
            <div class="footer-left">
              <span class="font-mono" id="footerActualVp">Actual Viewport: ${width} × ${height}</span>
              <span class="sep">·</span>
              <span class="font-mono" id="footerZoomBadge">Preview Scale: 100%</span>
            </div>
            <div class="footer-right">
              <span class="font-mono" id="footerTimingBadge">Load Time: —</span>
              <span class="sep">·</span>
              <span class="font-mono" id="footerStatusBadge">HTTP 200</span>
            </div>
          </div>
        </div>
      `;

      this.bindControls();
      this.updateHeaderBadge();
      this.updateStatusBadge();
    }

    getModeLabel() {
      if (this.previewMode === 'interactive') {
        const isRestricted = Boolean(this.securityInfo && this.securityInfo.allowed === false);
        return isRestricted ? '● Playwright Test (X-Frame Guard)' : '● Live Webpage';
      }
      if (this.previewMode === 'playwright') {
        return '● Playwright Test Capture';
      }
      return '● Local Viewport Simulation';
    }

    bindControls() {
      const backBtn = this.container.querySelector('#btnStageBack');
      const fwdBtn = this.container.querySelector('#btnStageForward');
      const reloadBtn = this.container.querySelector('#btnStageReload');
      const zoomIn = this.container.querySelector('#btnZoomIn');
      const zoomOut = this.container.querySelector('#btnZoomOut');
      const zoomFit = this.container.querySelector('#btnZoomFit');

      if (backBtn) backBtn.addEventListener('click', () => this.navigateBack());
      if (fwdBtn) fwdBtn.addEventListener('click', () => this.navigateForward());
      if (reloadBtn) reloadBtn.addEventListener('click', () => this.reload());
      if (zoomIn) zoomIn.addEventListener('click', () => this.zoomIn());
      if (zoomOut) zoomOut.addEventListener('click', () => this.zoomOut());
      if (zoomFit) zoomFit.addEventListener('click', () => {
        this.isAutoFit = true;
        this.autoFit();
      });
    }

    updateNavigationControls() {
      const stageBack = this.container.querySelector('#btnStageBack');
      const stageForward = this.container.querySelector('#btnStageForward');
      const topBack = document.getElementById('btnNavBack');
      const topForward = document.getElementById('btnNavForward');

      if (stageBack) stageBack.disabled = !this.canGoBack;
      if (stageForward) stageForward.disabled = !this.canGoForward;
      if (topBack) topBack.disabled = !this.canGoBack;
      if (topForward) topForward.disabled = !this.canGoForward;
    }

    updateHeaderBadge() {
      const { width, height } = this.getViewportDims();
      const devTitle = this.container.querySelector('#vpDeviceTitle');
      const dimsLabel = this.container.querySelector('#vpDimsLabel');
      const browserLabel = this.container.querySelector('#vpBrowserLabel');
      const modePill = this.container.querySelector('#vpModePill');
      const targetUrl = this.container.querySelector('#stageTargetUrl');

      if (devTitle) devTitle.textContent = this.currentDevice.name;
      if (dimsLabel) dimsLabel.textContent = `${width} × ${height}`;
      if (browserLabel) {
        browserLabel.textContent = this.browserType === 'webkit' ? 'Safari / WebKit' : (this.browserType === 'firefox' ? 'Firefox' : 'Chromium');
      }
      if (modePill) {
        modePill.textContent = this.getModeLabel();
      }
      if (targetUrl) {
        targetUrl.textContent = this.currentUrl;
      }
    }

    updateStatusBadge() {
      const dot = this.container.querySelector('#vpStatusDot');
      const text = this.container.querySelector('#vpStatusText');
      const timingBadge = this.container.querySelector('#footerTimingBadge');
      const statusBadge = this.container.querySelector('#footerStatusBadge');

      if (!dot || !text) return;

      dot.className = 'vp-status-dot';

      if (this.loadState === 'loading') {
        dot.classList.add('status-loading');
        text.textContent = 'Testing...';
      } else if (this.loadState === 'loaded' || this.loadState === 'blocked') {
        dot.classList.add('status-loaded');
        const isRestricted = Boolean(this.securityInfo && this.securityInfo.allowed === false);
        text.textContent = isRestricted ? 'Ready (Playwright Test)' : 'Ready';
        if (timingBadge && this.loadTimeMs > 0) {
          timingBadge.textContent = `Load Time: ${(this.loadTimeMs / 1000).toFixed(2)}s`;
        }
        if (statusBadge && this.httpStatus) {
          statusBadge.textContent = `HTTP ${this.httpStatus}`;
        }
      } else if (this.loadState === 'error') {
        dot.classList.add('status-error');
        text.textContent = 'Error';
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.DevicePreview = DevicePreview;
})();
