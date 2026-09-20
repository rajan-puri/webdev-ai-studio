/**
 * client/js/components/responsive/viewport-controls.js
 * Controls the Right Inspection & Information Panel:
 * - Device Info: exact specifications from Playwright (Viewport, DPR, Touch, Engine, User Agent)
 * - Responsive Issues: real horizontal overflow & overflowing elements
 * - Performance: genuine browser timings (DNS, TCP, TTFB, DOMContentLoaded, Load)
 * - Screenshots: Viewport & Full page captures
 * - Active Sessions: Running Playwright browser sessions management
 */

(function () {
  'use strict';

  class ViewportControls {
    constructor(options = {}) {
      this.options = options;
      this.container = document.getElementById(options.containerId || 'viewportControlsContainer');
      this.onCaptureScreenshot = options.onCaptureScreenshot || null;
      this.onCaptureFullPage = options.onCaptureFullPage || null;
      this.onRunBreakpoints = options.onRunBreakpoints || null;
      this.onRunReport = options.onRunReport || null;

      this.currentTab = 'info'; // 'info' | 'issues' | 'performance' | 'screenshots' | 'sessions'
      this.device = options.device || null;
      this.orientation = options.orientation || 'portrait';
      this.url = options.url || '';
      this.browser = options.browser || null;
      this.measurements = null;
      this.timings = null;
      this.screenshots = [];
      this.activeSessions = [];

      if (this.container) {
        this.render();
      }
    }

    updateDevice(device, orientation) {
      this.device = device;
      if (orientation) this.orientation = orientation;
      this.renderCurrentTab();
    }

    updateOrientation(orientation) {
      this.orientation = orientation;
      this.renderCurrentTab();
    }

    updateBrowser(browser) {
      this.browser = browser;
      this.renderCurrentTab();
    }

    updateUrl(url) {
      this.url = url;
      if (this.currentTab === 'info') {
        this.renderCurrentTab();
      }
    }

    updateZoom(zoom) {
      this.zoom = zoom;
    }

    updateMeasurements(data) {
      if (data) {
        this.measurements = data.measurements || data;
        this.timings = data.timings || this.timings;
        this.browser = data.browser || this.browser;
        this.device = data.device || this.device;
      }
      this.renderCurrentTab();
    }

    addScreenshot(shot) {
      this.screenshots.unshift(shot);
      if (this.currentTab === 'screenshots') {
        this.renderCurrentTab();
      }
    }

    async refreshSessions() {
      try {
        const res = await fetch('/api/responsive/sessions');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            this.activeSessions = data.sessions || [];
            if (this.currentTab === 'sessions') {
              this.renderCurrentTab();
            }
          }
        }
      } catch (e) {}
    }

    switchTab(tabName) {
      this.currentTab = tabName;
      if (!this.container) return;
      const tabs = this.container.querySelectorAll('.vp-tab-btn');
      tabs.forEach(t => t.classList.toggle('active', t.dataset.vpTab === tabName));

      if (tabName === 'sessions') {
        this.refreshSessions();
      }

      this.renderCurrentTab();
    }

    render() {
      if (!this.container) return;

      this.container.innerHTML = `
        <div class="viewport-controls-panel">
          <!-- Panel Header Tabs -->
          <div class="vp-panel-tabs">
            <button class="vp-tab-btn ${this.currentTab === 'info' ? 'active' : ''}" data-vp-tab="info" type="button">Device Info</button>
            <button class="vp-tab-btn ${this.currentTab === 'issues' ? 'active' : ''}" data-vp-tab="issues" type="button">Issues</button>
            <button class="vp-tab-btn ${this.currentTab === 'performance' ? 'active' : ''}" data-vp-tab="performance" type="button">Timing</button>
            <button class="vp-tab-btn ${this.currentTab === 'screenshots' ? 'active' : ''}" data-vp-tab="screenshots" type="button">Screenshots</button>
            <button class="vp-tab-btn ${this.currentTab === 'sessions' ? 'active' : ''}" data-vp-tab="sessions" type="button">Sessions</button>
            <button class="btn btn-ghost btn-icon btn-xs" id="btnHideDetails" type="button" title="Collapse Details Panel" style="margin-left: auto; padding: 2px 6px; font-size: 11px;">›</button>
          </div>

          <!-- Tab Content Body -->
          <div class="vp-tab-content" id="vpTabContent"></div>
        </div>
      `;

      this.bindTabEvents();
      this.renderCurrentTab();
    }

    bindTabEvents() {
      const tabs = this.container.querySelectorAll('.vp-tab-btn');
      tabs.forEach(t => {
        t.addEventListener('click', () => {
          this.switchTab(t.dataset.vpTab);
        });
      });
    }

    renderCurrentTab() {
      const body = this.container.querySelector('#vpTabContent');
      if (!body) return;

      if (this.currentTab === 'info') {
        this.renderDeviceInfoTab(body);
      } else if (this.currentTab === 'issues') {
        this.renderIssuesTab(body);
      } else if (this.currentTab === 'performance') {
        this.renderPerformanceTab(body);
      } else if (this.currentTab === 'screenshots') {
        this.renderScreenshotsTab(body);
      } else if (this.currentTab === 'sessions') {
        this.renderSessionsTab(body);
      }
    }

    renderDeviceInfoTab(el) {
      const dev = this.device || {
        name: 'iPhone 15 Pro',
        viewportWidth: 393,
        viewportHeight: 852,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      };

      const isLandscape = this.orientation === 'landscape';
      const baseW = dev.viewportWidth || (dev.viewport && dev.viewport.width) || 390;
      const baseH = dev.viewportHeight || (dev.viewport && dev.viewport.height) || 844;
      const vpW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
      const vpH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
      const dpr = dev.deviceScaleFactor || dev.pixelRatio || 1;
      const engineName = this.browser ? (this.browser.engine || this.browser.label || 'Chromium') : 'Chromium';
      const ua = dev.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

      let deviceIcon = '📱';
      if (dev.category === 'tablet' || dev.category === 'tablets') deviceIcon = '📱';
      if (dev.category === 'laptop' || dev.category === 'laptops') deviceIcon = '💻';
      if (dev.category === 'desktop') deviceIcon = '🖥️';

      el.innerHTML = `
        <!-- Device Hero Overview Card -->
        <div class="vp-device-card">
          <div class="vp-device-card-header">
            <span class="vp-card-icon">${deviceIcon}</span>
            <div class="vp-card-title-group">
              <span class="vp-card-device-name">${escapeHtml(dev.name || 'Custom Viewport')}</span>
              <span class="vp-card-category-tag font-mono">${dev.isMobile ? 'Mobile Device' : (dev.category === 'tablet' ? 'Tablet' : 'Desktop')}</span>
            </div>
            <span class="vp-badge-accent font-mono">${vpW} × ${vpH}</span>
          </div>
          <div class="vp-card-sub font-mono">
            <span>DPR: <strong>${dpr}x</strong></span>
            <span>Orientation: <strong>${this.orientation.toUpperCase()}</strong></span>
            <span>Engine: <strong>${escapeHtml(engineName)}</strong></span>
          </div>
        </div>

        <!-- Specifications Group -->
        <div class="panel-section">
          <div class="section-title">Device Specifications</div>
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-key">Profile Name</span>
              <span class="spec-val font-semibold">${escapeHtml(dev.name)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Target Viewport</span>
              <span class="spec-val font-mono text-accent font-semibold">${vpW} × ${vpH} px</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Device Pixel Ratio</span>
              <span class="spec-val font-mono">${dpr}x (@${Math.round(dpr * 160)} DPI)</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Orientation</span>
              <span class="spec-val font-mono text-capitalize">${this.orientation}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Touch Emulation</span>
              <span class="spec-val ${dev.hasTouch ? 'text-success font-semibold' : ''}">${dev.hasTouch ? '✓ Enabled' : '○ Disabled'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Playwright Engine</span>
              <span class="spec-val font-mono font-semibold">${escapeHtml(engineName)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-key">Testing Engine</span>
              <span class="spec-val text-accent font-semibold">Local Playwright v1.63</span>
            </div>
          </div>
        </div>

        <!-- User Agent -->
        <div class="panel-section">
          <div class="section-title-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div class="section-title" style="margin: 0;">Emulated User Agent</div>
            <button class="btn btn-ghost btn-xs font-mono" id="btnCopyUA" type="button" style="font-size: 10px; padding: 2px 6px;">Copy</button>
          </div>
          <div class="user-agent-box font-mono" id="uaText">${escapeHtml(ua)}</div>
        </div>

        <!-- Audit Action -->
        <div class="panel-section" style="margin-top: 14px;">
          <button class="btn btn-primary btn-block" id="btnRunAuditFromPanel" type="button" style="height: 36px; font-weight: 600; gap: 8px; box-shadow: 0 2px 8px rgba(37,99,235,0.25); width: 100%;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate Comprehensive Audit Report
          </button>
        </div>
      `;

      el.querySelector('#btnCopyUA')?.addEventListener('click', () => {
        navigator.clipboard.writeText(ua);
        const copyBtn = el.querySelector('#btnCopyUA');
        if (copyBtn) {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        }
      });

      el.querySelector('#btnRunAuditFromPanel')?.addEventListener('click', () => {
        if (this.onRunReport) this.onRunReport();
      });
    }

    renderIssuesTab(el) {
      const m = this.measurements;
      if (!m) {
        el.innerHTML = `
          <div class="tab-empty-state">
            <div class="empty-icon-box" style="font-size: 28px; margin-bottom: 8px;">📊</div>
            <div class="empty-title font-semibold">No Measurements Yet</div>
            <div class="empty-desc">Load a webpage in the interactive or Playwright mode to run DOM overflow analysis.</div>
          </div>
        `;
        return;
      }

      const issues = [];
      if (m.hasHorizontalOverflow) {
        issues.push({
          severity: 'Critical',
          title: 'Document Horizontal Overflow',
          actual: `scrollWidth = ${m.scrollWidth}px`,
          expected: `<= ${m.expectedWidth || m.clientWidth}px`,
          overflow: `${m.overflowAmount || (m.scrollWidth - (m.expectedWidth || m.clientWidth))}px`,
          why: 'Horizontal scrollbars disorient users on touch screens and break mobile layout margins.',
          fix: 'Ensure container elements use max-width: 100% and box-sizing: border-box.'
        });
      }

      if (Array.isArray(m.overflowingElements) && m.overflowingElements.length > 0) {
        m.overflowingElements.forEach(item => {
          issues.push({
            severity: (item.overflowAmount > 40 || (item.box && item.box.width > (m.expectedWidth || m.clientWidth))) ? 'High' : 'Medium',
            title: `Overflowing Element: ${item.selector || item.tag || 'node'}`,
            actual: `Width ${item.box?.width || item.width || 0}px, right edge ${item.box?.right || item.right || 0}px`,
            expected: `Right edge <= ${m.expectedWidth || m.clientWidth}px`,
            overflow: `${item.overflowAmount || 0}px`,
            why: 'Element extends past the physical screen boundaries.',
            fix: `Apply max-width: 100%; box-sizing: border-box; or overflow-x: auto to this element.`
          });
        });
      }

      if (issues.length === 0) {
        el.innerHTML = `
          <div class="clean-status-card">
            <div class="clean-check-circle">✓</div>
            <div>
              <div class="clean-title font-semibold">Zero Layout Defects Detected</div>
              <div class="clean-sub">All document bounds and components fit comfortably within the ${m.expectedWidth || m.clientWidth}px viewport.</div>
            </div>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="issues-list">
          <div class="issues-summary-alert">
            <span class="alert-icon">⚠️</span>
            <div>
              <div class="alert-title"><strong>${issues.length} Responsive Layout Issue${issues.length === 1 ? '' : 's'}</strong></div>
              <div class="alert-sub">Content spills past viewport boundaries (${m.expectedWidth || m.clientWidth}px).</div>
            </div>
          </div>
          ${issues.map(iss => `
            <div class="issue-card severity-${iss.severity.toLowerCase()}">
              <div class="issue-card-top">
                <span class="issue-badge badge-${iss.severity.toLowerCase()} font-mono">${iss.severity.toUpperCase()}</span>
                <span class="issue-title">${escapeHtml(iss.title)}</span>
              </div>
              <div class="issue-body">
                <div class="issue-meta-grid font-mono">
                  <div><span>Actual:</span> <strong>${escapeHtml(iss.actual)}</strong></div>
                  <div><span>Expected:</span> <strong>${escapeHtml(iss.expected)}</strong></div>
                  ${iss.overflow ? `<div><span>Overflow:</span> <strong class="text-danger">+${escapeHtml(iss.overflow)}</strong></div>` : ''}
                </div>
                <div class="issue-remediation-box">
                  <span class="rem-label">Remediation:</span>
                  <span class="rem-text">${escapeHtml(iss.fix)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderPerformanceTab(el) {
      const t = this.timings;
      if (!t) {
        el.innerHTML = `
          <div class="tab-empty-state">
            <div class="empty-icon-box" style="font-size: 28px; margin-bottom: 8px;">⚡</div>
            <div class="empty-title font-semibold">No Timing Data Yet</div>
            <div class="empty-desc">Capture actual browser navigation and network timings with Playwright.</div>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="panel-section">
          <div class="section-title">Navigation Performance Timings</div>
          <div class="timing-stat-cards">
            <div class="timing-card">
              <span class="tc-name">TTFB (Response)</span>
              <span class="tc-val font-mono">${Math.round(t.ttfb || 0)}ms</span>
              <span class="tc-sub">Time to First Byte</span>
            </div>
            <div class="timing-card">
              <span class="tc-name">DOMContentLoaded</span>
              <span class="tc-val font-mono text-accent">${Math.round(t.domContentLoaded || 0)}ms</span>
              <span class="tc-sub">DOM Interactive</span>
            </div>
            <div class="timing-card">
              <span class="tc-name">Window Load</span>
              <span class="tc-val font-mono">${Math.round(t.loadEvent || t.load || 0)}ms</span>
              <span class="tc-sub">Full Assets Loaded</span>
            </div>
            <div class="timing-card">
              <span class="tc-name">DNS &amp; TCP</span>
              <span class="tc-val font-mono">${Math.round((t.dns || 0) + (t.tcp || 0))}ms</span>
              <span class="tc-sub">Handshake &amp; Connect</span>
            </div>
          </div>
          <div class="timing-resources-pill font-mono">
            <span>Total Resource Requests:</span>
            <strong>${t.resourceCount || 0}</strong>
          </div>
        </div>
      `;
    }

    renderScreenshotsTab(el) {
      const latest = this.screenshots.length > 0 ? this.screenshots[0] : null;
      const escapeHtml = window.escapeHtml || (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

      el.innerHTML = `
        <div class="panel-section">
          <div class="section-title">Capture Actions</div>
          <div class="screenshot-actions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btnCaptureCurrentViewport" type="button" style="justify-content: center;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Capture Viewport
            </button>
            <button class="btn btn-secondary btn-sm" id="btnCaptureFullPage" type="button" style="justify-content: center;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Capture Full Page
            </button>
          </div>
        </div>

        ${latest ? `
          <div class="panel-section">
            <div class="section-title-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div class="section-title" style="margin-bottom: 0;">Latest Screenshot</div>
              <span class="badge badge-accent font-mono" style="font-size: 10px; text-transform: uppercase;">${escapeHtml(latest.type || 'Viewport')}</span>
            </div>
            <div class="latest-shot-card" style="border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--bg-surface-subtle); overflow: hidden;">
              <div class="shot-preview-container" style="position: relative; height: 160px; background: #0b0f19; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden;" id="btnViewLatestShot">
                <img src="${latest.dataUrl || latest.src}" style="max-height: 100%; max-width: 100%; object-fit: contain;" alt="Latest Screenshot">
                <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 10px; display: flex; align-items: center; gap: 4px;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Click to View
                </div>
              </div>
              <div style="padding: 10px 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 11px; margin-bottom: 10px;">
                  <div>
                    <span style="color: var(--text-muted);">Device:</span>
                    <strong style="display: block; color: var(--text-primary);">${escapeHtml(latest.deviceName || 'Viewport')}</strong>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Dimensions:</span>
                    <strong style="display: block; font-family: var(--font-mono); color: var(--text-primary);">${latest.width} × ${latest.height} px</strong>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Time:</span>
                    <span style="display: block; color: var(--text-secondary);">${new Date(latest.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Format / Size:</span>
                    <span style="display: block; color: var(--text-secondary);">PNG &middot; ~${Math.round((latest.fileSizeBytes || ((latest.dataUrl || '').length * 0.75)) / 1024)} KB</span>
                  </div>
                </div>
                <button class="btn btn-primary btn-sm" id="btnDownloadLatestShot" type="button" style="width: 100%; justify-content: center; gap: 6px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download PNG (${latest.width}×${latest.height})
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="panel-section">
          <div class="section-title">Captured Gallery (${this.screenshots.length})</div>
          ${this.screenshots.length === 0 ? `
            <div class="tab-empty-state">
              <div class="empty-icon-box" style="font-size: 28px; margin-bottom: 8px;">📷</div>
              <div class="empty-desc">No screenshots captured yet in this session.</div>
            </div>
          ` : `
            <div class="screenshots-thumb-list" style="display: flex; flex-direction: column; gap: 8px;">
              ${this.screenshots.map((s, idx) => `
                <div class="shot-card" style="display: flex; gap: 10px; padding: 8px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface);">
                  <div class="shot-thumb-wrap" style="width: 60px; height: 60px; flex-shrink: 0; background: #0f1117; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer;" data-shot-view-idx="${idx}">
                    <img src="${s.dataUrl || s.src}" class="shot-thumb" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Screenshot ${idx + 1}">
                  </div>
                  <div class="shot-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div class="shot-title font-semibold" style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.deviceName || 'Viewport')} <span class="badge badge-subtle font-mono" style="font-size: 9px; vertical-align: middle;">${escapeHtml(s.type || 'Viewport')}</span></div>
                      <div class="shot-meta font-mono" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${s.width} × ${s.height} &middot; ${new Date(s.timestamp || Date.now()).toLocaleTimeString()}</div>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 6px;">
                      <button class="btn btn-secondary btn-xs btn-shot-view" data-shot-idx="${idx}" type="button" style="flex: 1; justify-content: center;">View</button>
                      <button class="btn btn-primary btn-xs btn-shot-download" data-shot-idx="${idx}" type="button" style="flex: 1; justify-content: center;">Download</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      el.querySelector('#btnCaptureCurrentViewport')?.addEventListener('click', () => {
        if (this.onCaptureScreenshot) this.onCaptureScreenshot();
      });
      el.querySelector('#btnCaptureFullPage')?.addEventListener('click', () => {
        if (this.onCaptureFullPage) this.onCaptureFullPage();
      });
      el.querySelector('#btnDownloadLatestShot')?.addEventListener('click', () => {
        if (latest) {
          if (this.options.onDownloadScreenshot) {
            this.options.onDownloadScreenshot(latest);
          } else {
            const link = document.createElement('a');
            link.href = latest.dataUrl;
            link.download = latest.filename || `screenshot-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      });
      el.querySelector('#btnViewLatestShot')?.addEventListener('click', () => {
        if (latest && this.options.onViewScreenshot) {
          this.options.onViewScreenshot(latest);
        }
      });

      el.querySelectorAll('.btn-shot-view, [data-shot-view-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.getAttribute('data-shot-idx') || btn.getAttribute('data-shot-view-idx'), 10);
          if (!isNaN(idx) && this.screenshots[idx] && this.options.onViewScreenshot) {
            this.options.onViewScreenshot(this.screenshots[idx]);
          }
        });
      });

      el.querySelectorAll('.btn-shot-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.getAttribute('data-shot-idx'), 10);
          if (!isNaN(idx) && this.screenshots[idx]) {
            if (this.options.onDownloadScreenshot) {
              this.options.onDownloadScreenshot(this.screenshots[idx]);
            } else {
              const link = document.createElement('a');
              link.href = this.screenshots[idx].dataUrl;
              link.download = this.screenshots[idx].filename || `screenshot-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }
        });
      });
    }

    renderSessionsTab(el) {
      el.innerHTML = `
        <div class="panel-section">
          <div class="section-title-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div class="section-title" style="margin: 0;">Playwright Workers</div>
            <button class="btn btn-secondary btn-xs" id="btnRefreshSessions" type="button">↻ Refresh</button>
          </div>
          <div class="sessions-meta-note" style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
            Max 3 concurrent isolated browser contexts. Auto-recycled after 10 min idle.
          </div>

          ${this.activeSessions.length === 0 ? `
            <div class="tab-empty-state">
              <div class="empty-icon-box" style="font-size: 28px; margin-bottom: 8px;">⚡</div>
              <div class="empty-title font-semibold">No Active Workers</div>
              <div class="empty-desc">Workers spawn on demand when running tests and matrix benchmarks.</div>
            </div>
          ` : `
            <div class="sessions-list">
              ${this.activeSessions.map(s => `
                <div class="session-card">
                  <div class="session-card-header">
                    <span class="session-badge font-mono">${escapeHtml(s.browserType || 'chromium')}</span>
                    <span class="session-live-pulse text-success font-mono font-semibold" style="font-size: 11px;">● Active</span>
                  </div>
                  <div class="session-card-body font-mono text-xs">
                    <div class="session-row"><span class="key">Target:</span> <span class="val font-semibold">${escapeHtml(s.url || '—')}</span></div>
                    <div class="session-row"><span class="key">Device:</span> <span class="val">${escapeHtml(s.deviceName || 'Custom')}</span></div>
                    <div class="session-row"><span class="key">Viewport:</span> <span class="val">${s.viewport?.width || 0} × ${s.viewport?.height || 0}</span></div>
                    <div class="session-row"><span class="key">Active:</span> <span class="val">${new Date(s.startedAt).toLocaleTimeString()}</span></div>
                  </div>
                  <div class="session-actions" style="margin-top: 8px;">
                    <button class="btn btn-danger btn-xs btn-terminate-session" data-session-id="${s.id}" type="button" style="width: 100%; justify-content: center;">
                      Stop Context
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      el.querySelector('#btnRefreshSessions')?.addEventListener('click', () => this.refreshSessions());
      el.querySelectorAll('.btn-terminate-session').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.sessionId;
          btn.disabled = true;
          btn.textContent = 'Stopping...';
          try {
            await fetch('/api/responsive/session/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: id, action: 'close' })
            });
            await this.refreshSessions();
          } catch (e) {
            console.error('Failed to close session', e);
          }
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

  window.ViewportControls = ViewportControls;
})();
