/**
 * client/js/components/qa/phase2-modal.js
 * Controller for Phase 2 Automated QA Suite Modal
 */

(function () {
  'use strict';

  class Phase2QaModal {
    constructor() {
      this.modalEl = document.getElementById('qaRunModal');
      this.currentUrl = 'https://example.com/';
      this.currentDevice = { name: 'iPhone 15 Pro', width: 393, height: 852 };
      this.currentBrowser = 'chromium';
      this.isRunning = false;
      this.results = null;
      this.activeTab = 'summary';

      this.init();
    }

    init() {
      if (!this.modalEl) return;
      this.bindEvents();
    }

    bindEvents() {
      const closeBtn = this.modalEl.querySelector('[data-action="close-qa-modal"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      const backdrop = this.modalEl.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.close());
      }

      const startBtn = this.modalEl.querySelector('#btnStartQaRun');
      if (startBtn) {
        startBtn.addEventListener('click', () => this.runSuite());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
          this.close();
        }
      });
    }

    open(options = {}) {
      if (!this.modalEl) return;
      if (options.url) this.currentUrl = options.url;
      if (options.device) this.currentDevice = options.device;
      if (options.browser) this.currentBrowser = options.browser;

      this.modalEl.classList.add('active');

      const urlInput = this.modalEl.querySelector('#qaModalUrlInput');
      if (urlInput) urlInput.value = this.currentUrl;

      const metaBadge = this.modalEl.querySelector('#qaModalDeviceBadge');
      if (metaBadge) {
        metaBadge.textContent = `${this.currentDevice.name || 'Device'} (${this.currentDevice.width || 393}×${this.currentDevice.height || 852})`;
      }

      // Reset to config view
      const configSec = this.modalEl.querySelector('#qaModalConfigSection');
      const resultsSec = this.modalEl.querySelector('#qaModalResultsSection');
      if (configSec) configSec.style.display = 'block';
      if (resultsSec) resultsSec.style.display = 'none';
    }

    close() {
      if (!this.modalEl) return;
      this.modalEl.classList.remove('active');
    }

    async runSuite() {
      if (this.isRunning) return;
      this.isRunning = true;

      const urlInput = this.modalEl.querySelector('#qaModalUrlInput');
      if (urlInput) this.currentUrl = urlInput.value.trim();

      const runInteractions = this.modalEl.querySelector('#chkQaInteractions')?.checked ?? true;
      const runForms = this.modalEl.querySelector('#chkQaForms')?.checked ?? true;
      const runBrokenUi = this.modalEl.querySelector('#chkQaBrokenUi')?.checked ?? true;
      const runRedirects = this.modalEl.querySelector('#chkQaRedirects')?.checked ?? true;
      const runA11y = this.modalEl.querySelector('#chkQaA11y')?.checked ?? true;
      const runVisual = this.modalEl.querySelector('#chkQaVisual')?.checked ?? true;

      const startBtn = this.modalEl.querySelector('#btnStartQaRun');
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="spinner-inline"></span> Running Automated Suite...';
      }

      const statusEl = this.modalEl.querySelector('#qaModalRunStatus');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--accent-primary);">
            <span class="spinner-inline"></span>
            <span>Launching headless browser, evaluating redirect hops and inspecting DOM...</span>
          </div>
        `;
      }

      try {
        const payload = {
          url: this.currentUrl,
          options: {
            interactions: runInteractions,
            forms: runForms,
            brokenUi: runBrokenUi,
            redirects: runRedirects,
            accessibility: runA11y,
            visualRegression: runVisual
          },
          device: this.currentDevice,
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
        this.renderResults();
      } catch (err) {
        console.error('QA Suite error:', err);
        alert('QA execution failed: ' + err.message);
      } finally {
        this.isRunning = false;
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Start QA Run</span>
          `;
        }
        if (statusEl) statusEl.style.display = 'none';
      }
    }

    renderResults() {
      const configSec = this.modalEl.querySelector('#qaModalConfigSection');
      const resultsSec = this.modalEl.querySelector('#qaModalResultsSection');
      if (configSec) configSec.style.display = 'none';
      if (resultsSec) resultsSec.style.display = 'flex';

      const res = this.results;
      const s = res.summary;

      // Render summary scoreboard
      const scoreBadge = this.modalEl.querySelector('#qaScoreBadge');
      if (scoreBadge) {
        scoreBadge.textContent = `${s.score} / 100`;
        scoreBadge.className = `badge font-mono ${s.score >= 85 ? 'badge-success' : (s.score >= 60 ? 'badge-accent' : 'badge-danger')}`;
      }

      const statsEl = this.modalEl.querySelector('#qaSummaryStats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div style="display: flex; gap: 12px; font-size: 11px;">
            <span style="color: var(--status-success);">✅ ${s.passed} Passed</span>
            <span style="color: var(--status-warning);">⚠️ ${s.warnings} Warnings</span>
            <span style="color: var(--status-danger);">❌ ${s.critical} Critical</span>
            <span style="color: var(--text-muted);">⏱️ ${(s.executionTimeMs / 1000).toFixed(1)}s</span>
          </div>
        `;
      }

      this.bindResultTabs();
      this.renderActiveResultTab();
    }

    bindResultTabs() {
      const tabs = this.modalEl.querySelectorAll('.qa-res-tab-btn');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeTab = tab.getAttribute('data-qa-tab');
          this.renderActiveResultTab();
        });
      });

      const btnRerun = this.modalEl.querySelector('#btnQaRerun');
      if (btnRerun) {
        btnRerun.onclick = () => {
          const configSec = this.modalEl.querySelector('#qaModalConfigSection');
          const resultsSec = this.modalEl.querySelector('#qaModalResultsSection');
          if (configSec) configSec.style.display = 'block';
          if (resultsSec) resultsSec.style.display = 'none';
        };
      }

      const btnExport = this.modalEl.querySelector('#btnQaExportJson');
      if (btnExport) {
        btnExport.onclick = () => {
          const blob = new Blob([JSON.stringify(this.results, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `qa_audit_report_${Date.now()}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      }
    }

    renderActiveResultTab() {
      const contentEl = this.modalEl.querySelector('#qaTabContentArea');
      if (!contentEl || !this.results) return;

      const escape = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const res = this.results;

      if (this.activeTab === 'summary') {
        const sections = [
          { name: 'Broken UI & Overflow', data: res.brokenUi },
          { name: 'Redirects & Protocol', data: res.redirects },
          { name: 'Safe Interactions', data: res.interactions },
          { name: 'Form Accessibility', data: res.forms },
          { name: 'WCAG Accessibility', data: res.accessibility },
          { name: 'Visual Regression', data: res.visualRegression }
        ];

        contentEl.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Test Execution Summary</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${sections.filter(s => s.data).map(s => {
                const checks = s.data.checks || [];
                const passed = checks.filter(c => c.passed).length;
                const total = checks.length;
                return `
                  <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 600; font-size: 12px;">${escape(s.name)}</span>
                      <span class="badge ${passed === total ? 'badge-success' : 'badge-accent'} font-mono" style="font-size: 10px;">${passed}/${total} Pass</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                      ${checks.map(c => `<div style="margin-top: 2px;">${c.passed ? '✅' : '⚠️'} ${escape(c.name)}: ${escape(c.detail)}</div>`).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else if (this.activeTab === 'brokenUi') {
        const ui = res.brokenUi;
        if (!ui) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Broken UI test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Overflow Status</div>
                <div style="font-size: 14px; font-weight: 700; color: ${ui.hasHorizontalOverflow ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">
                  ${ui.hasHorizontalOverflow ? `Overflow: ${ui.overflowAmount}px` : 'No Horizontal Overflow'}
                </div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Overflowing Elements</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${ui.overflowing.length} element(s)</div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Broken / 0px Images</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${ui.brokenImages.length} image(s)</div>
              </div>
            </div>

            ${ui.overflowing.length > 0 ? `
              <div style="font-size: 12px; font-weight: 600; margin-top: 6px;">Overflowing Element Targets:</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${ui.overflowing.map(o => `
                  <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: 4px; font-size: 11px;">
                    <span class="font-mono font-semibold">${escape(o.selector)}</span>
                    <span style="color: var(--status-danger);">Excess: +${o.excess}px (Width: ${o.width}px)</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${ui.brokenImages.length > 0 ? `
              <div style="font-size: 12px; font-weight: 600; margin-top: 6px;">Broken Images:</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${ui.brokenImages.map(img => `
                  <div style="padding: 6px 10px; background: var(--bg-surface-subtle); border-radius: 4px; font-size: 11px; word-break: break-all;">
                    ⚠️ <span class="font-mono">${escape(img.src)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      } else if (this.activeTab === 'redirects') {
        const red = res.redirects;
        if (!red) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Redirect test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 600;">Redirect Analysis</span>
              <span class="badge ${red.isHttps ? 'badge-success' : 'badge-danger'} font-mono">${red.isHttps ? 'HTTPS Secure' : 'Insecure HTTP'}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">Final URL: <strong class="font-mono">${escape(red.finalUrl)}</strong></div>
            <div style="font-size: 12px; color: var(--text-muted);">Hops: ${red.hopCount}</div>

            ${red.hops.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                ${red.hops.map((h, idx) => `
                  <div style="padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 11px;">
                    <div>Hop ${idx + 1}: <span class="badge badge-accent font-mono">${h.status}</span> <span class="font-mono">${escape(h.from)}</span></div>
                    <div style="margin-top: 4px; color: var(--text-muted);">↳ Target: <span class="font-mono" style="color: var(--accent-primary);">${escape(h.to)}</span></div>
                  </div>
                `).join('')}
              </div>
            ` : '<div style="padding: 12px; background: var(--bg-surface-subtle); border-radius: 6px; font-size: 12px;">No redirects occurred. Direct response.</div>'}
          </div>
        `;
      } else if (this.activeTab === 'interactions') {
        const it = res.interactions;
        if (!it) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Interaction test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Interactive Triggers</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${it.totalInteractive}</div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Destructive Actions Skipped</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--status-success); margin-top: 2px;">${it.skippedDestructiveCount} (Safe)</div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Console Errors</div>
                <div style="font-size: 14px; font-weight: 700; color: ${it.consoleErrors.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">${it.consoleErrors.length}</div>
              </div>
            </div>

            <div style="font-size: 12px; font-weight: 600; margin-top: 6px;">Sample Inspected Elements:</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto;">
              ${it.inspectedTriggers.map(t => `
                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: var(--bg-surface-subtle); border-radius: 4px; font-size: 11px;">
                  <span><span class="badge badge-secondary font-mono" style="font-size: 9px;">${escape(t.tag)}</span> ${escape(t.text)}</span>
                  <span>${t.isDestructive ? '<span class="badge badge-danger">Destructive Skipped</span>' : '<span class="badge badge-success">Safe</span>'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else if (this.activeTab === 'forms') {
        const f = res.forms;
        if (!f) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Form test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Total Forms</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${f.totalForms}</div>
              </div>
              <div style="flex: 1; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Input Controls</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${f.totalControls}</div>
              </div>
              <div style="flex: 1; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-surface-subtle);">
                <div style="font-size: 10px; color: var(--text-muted);">Missing Labels</div>
                <div style="font-size: 14px; font-weight: 700; color: ${f.unlabelledStandalone > 0 ? 'var(--status-danger)' : 'var(--status-success)'}; margin-top: 2px;">${f.unlabelledStandalone}</div>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); background: var(--bg-surface-subtle); padding: 10px; border-radius: 6px;">
              🛡️ Form inspection verified input associations and HTML5 validation attributes without submitting external payloads or polluting remote CRM/lead systems.
            </div>
          </div>
        `;
      } else if (this.activeTab === 'accessibility') {
        const a11y = res.accessibility;
        if (!a11y) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Accessibility test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 600;">WCAG 2.1 AA Violations: ${a11y.totalViolations}</span>
              <span class="badge ${a11y.totalViolations === 0 ? 'badge-success' : 'badge-accent'} font-mono">${a11y.totalViolations === 0 ? 'Passed' : 'Issues Found'}</span>
            </div>

            ${a11y.violations.length === 0 ? `
              <div style="padding: 12px; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 6px; font-size: 12px; color: var(--status-success);">
                ✅ No baseline accessibility violations detected for images, buttons, language tags, and heading hierarchy.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${a11y.violations.map(v => `
                  <div style="padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                      <strong style="color: var(--text-primary);">${escape(v.rule)}</strong>
                      <div style="color: var(--text-muted); margin-top: 2px;">${escape(v.description)}</div>
                    </div>
                    <span class="badge ${v.impact === 'critical' ? 'badge-danger' : 'badge-accent'} font-mono" style="font-size: 9px; text-transform: uppercase;">${v.impact}</span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;
      } else if (this.activeTab === 'visual') {
        const vis = res.visualRegression;
        if (!vis) {
          contentEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Visual regression test was not run.</div>';
          return;
        }
        contentEl.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
            <div style="font-size: 12px; font-weight: 600; align-self: flex-start;">Reference Viewport Snapshot</div>
            <div style="max-height: 380px; max-width: 100%; border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; background: #000;">
              <img src="${vis.currentScreenshot}" style="max-height: 380px; width: auto; object-fit: contain; display: block;" alt="Snapshot">
            </div>
          </div>
        `;
      }
    }
  }

  // Initialize and attach to window
  window.addEventListener('DOMContentLoaded', () => {
    window.Phase2QaModal = new Phase2QaModal();
  });
})();
