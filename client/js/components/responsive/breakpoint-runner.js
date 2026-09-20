/**
 * client/js/components/responsive/breakpoint-runner.js
 * Breakpoint Suite Component powered by real Playwright testing.
 * Allows user to:
 * - Select / deselect breakpoints
 * - Add custom breakpoints
 * - Run Playwright tests across each breakpoint
 * - View real measured table (Breakpoint, Status, Document Width, Scroll Width, Overflow, Console Errors, Network Errors, Load Time, Screenshot)
 */

class BreakpointRunner {
  constructor(options = {}) {
    this.options = options;
    this.modalEl = document.getElementById('breakpointModal');
    this.results = null;
    this.isRunning = false;
    this.currentUrl = options.url || '';
    this.onSelectBreakpoint = options.onSelectBreakpoint || null;

    this.standardBreakpoints = [
      { width: 320, name: 'Mobile Mini', selected: true },
      { width: 360, name: 'Mobile Compact', selected: true },
      { width: 375, name: 'iPhone SE', selected: true },
      { width: 390, name: 'iPhone 13 / 14', selected: true },
      { width: 414, name: 'Mobile Plus', selected: false },
      { width: 480, name: 'Phablet', selected: false },
      { width: 576, name: 'Landscape Mobile', selected: true },
      { width: 768, name: 'Tablet Portrait', selected: true },
      { width: 820, name: 'iPad Air', selected: false },
      { width: 992, name: 'Tablet Landscape', selected: true },
      { width: 1024, name: 'Small Laptop', selected: true },
      { width: 1200, name: 'Desktop Compact', selected: false },
      { width: 1280, name: 'Desktop HD', selected: true },
      { width: 1366, name: 'Laptop WXGA', selected: true },
      { width: 1440, name: 'MacBook Pro', selected: true },
      { width: 1536, name: 'Large Display', selected: false },
      { width: 1920, name: 'Full HD 1080p', selected: true }
    ];

    this.init();
  }

  init() {
    if (!this.modalEl) return;
    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.modalEl.querySelector('[data-action="close-breakpoint-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    const backdrop = this.modalEl.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.hide());
    }

    const runBtn = this.modalEl.querySelector('#btnRunBreakpointSuite');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runSuite());
    }

    const addBtn = this.modalEl.querySelector('#btnAddCustomBreakpoint');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addCustomBreakpointInput());
    }

    const copyBtn = this.modalEl.querySelector('#btnCopyBreakpointReport');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyReport());
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
        this.hide();
      }
    });
  }

  show(url) {
    this.currentUrl = url || this.currentUrl;
    if (!this.modalEl) return;

    this.modalEl.classList.add('active');
    const urlDisplay = this.modalEl.querySelector('#breakpointTargetUrl');
    if (urlDisplay) {
      urlDisplay.textContent = this.currentUrl || 'No URL specified';
    }

    this.renderBreakpointSelectors();

    if (this.currentUrl && !this.results) {
      this.runSuite();
    }
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('active');
  }

  renderBreakpointSelectors() {
    const container = this.modalEl.querySelector('#breakpointSelectorPills');
    if (!container) return;

    container.innerHTML = `
      <div class="bp-pills-row">
        ${this.standardBreakpoints.map(bp => `
          <label class="bp-pill-label ${bp.selected ? 'checked' : ''}">
            <input type="checkbox" class="bp-checkbox" data-width="${bp.width}" ${bp.selected ? 'checked' : ''}>
            <span class="bp-pill-name font-mono">${bp.width}px</span>
          </label>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.bp-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const w = parseInt(cb.dataset.width, 10);
        const target = this.standardBreakpoints.find(b => b.width === w);
        if (target) target.selected = cb.checked;
        cb.parentElement.classList.toggle('checked', cb.checked);
      });
    });
  }

  addCustomBreakpointInput() {
    const val = prompt('Enter custom breakpoint width in pixels (e.g. 500):');
    if (!val) return;
    const width = parseInt(val, 10);
    if (isNaN(width) || width < 240 || width > 3840) {
      alert('Please enter a valid width between 240 and 3840.');
      return;
    }

    if (!this.standardBreakpoints.some(b => b.width === width)) {
      this.standardBreakpoints.push({ width, name: `Custom ${width}px`, selected: true });
      this.standardBreakpoints.sort((a, b) => a.width - b.width);
      this.renderBreakpointSelectors();
    }
  }

  async runSuite() {
    if (!this.currentUrl) {
      alert('Please specify a URL to run the breakpoint suite.');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;

    const runBtn = this.modalEl.querySelector('#btnRunBreakpointSuite');
    const progressContainer = this.modalEl.querySelector('#breakpointProgressContainer');
    const progressBar = this.modalEl.querySelector('#breakpointProgressBar');
    const statusText = this.modalEl.querySelector('#breakpointStatusText');
    const resultsContainer = this.modalEl.querySelector('#breakpointResults');

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<span class="spinner-inline"></span> Testing in Playwright...';
    }
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressBar) progressBar.style.width = '15%';
    if (statusText) statusText.textContent = 'Launching Playwright browser engine...';
    if (resultsContainer) resultsContainer.innerHTML = '';

    const selectedWidths = this.standardBreakpoints.filter(b => b.selected).map(b => b.width);
    if (selectedWidths.length === 0) {
      selectedWidths.push(375, 768, 1280);
    }

    try {
      if (progressBar) progressBar.style.width = '35%';
      if (statusText) statusText.textContent = `Running Playwright tests across ${selectedWidths.length} viewports...`;

      const response = await fetch('/api/responsive/breakpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.currentUrl,
          breakpoints: selectedWidths
        })
      });

      if (progressBar) progressBar.style.width = '85%';
      if (statusText) statusText.textContent = 'Measuring DOM scrollWidth, overflow, and capturing thumbnails...';

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      this.results = data;

      if (progressBar) progressBar.style.width = '100%';
      if (statusText) statusText.textContent = 'Testing complete!';

      setTimeout(() => {
        if (progressContainer) progressContainer.style.display = 'none';
        this.renderResults(data);
      }, 300);

    } catch (err) {
      console.error('Breakpoint runner error:', err);
      if (statusText) statusText.textContent = `Error: ${err.message}`;
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="banner banner-error" style="padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #ef4444;">
            Failed to run Playwright breakpoint suite: ${this.escapeHtml(err.message)}
          </div>
        `;
      }
    } finally {
      this.isRunning = false;
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Suite';
      }
    }
  }

  renderResults(data) {
    const resultsContainer = this.modalEl.querySelector('#breakpointResults');
    if (!resultsContainer) return;

    const list = data.results || [];
    const passed = data.passedCount || list.filter(b => b.status === 'passed').length;
    const warnings = data.warningCount || list.filter(b => b.status === 'warning').length;
    const failed = data.failedCount || list.filter(b => b.status === 'failed').length;

    resultsContainer.innerHTML = `
      <div class="breakpoint-summary-header">
        <div class="summary-stat-group">
          <div class="stat-pill"><span class="stat-num text-success">${passed}</span> Passed</div>
          <div class="stat-pill"><span class="stat-num text-warning">${warnings}</span> Warnings</div>
          <div class="stat-pill"><span class="stat-num text-danger">${failed}</span> Failed</div>
          <div class="stat-pill">Total: <span class="stat-num">${list.length}</span></div>
        </div>
        <div class="summary-badge-wrap">
          <span class="badge ${failed > 0 ? 'badge-danger' : (warnings > 0 ? 'badge-warning' : 'badge-success')} font-mono">
            ${failed > 0 ? `${failed} Overflows` : (warnings > 0 ? `${warnings} Warnings` : 'All Breakpoints Passed')}
          </span>
        </div>
      </div>

      <div class="breakpoint-table-wrap">
        <table class="developer-table font-mono" style="font-size: 11px;">
          <thead>
            <tr>
              <th>Breakpoint</th>
              <th>Status</th>
              <th>Doc Width</th>
              <th>Scroll Width</th>
              <th>Overflow</th>
              <th>Console</th>
              <th>Network</th>
              <th>Load Time</th>
              <th>Screenshot</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(b => {
              const statusBadge = b.status === 'passed'
                ? '<span class="text-success font-semibold">✓ Loaded</span>'
                : (b.status === 'warning'
                  ? '<span class="text-warning font-semibold">⚠ Warning</span>'
                  : '<span class="text-danger font-semibold">✕ Failed</span>');

              const overflowBadge = b.hasHorizontalOverflow
                ? `<span class="text-danger font-semibold">YES (+${b.overflowAmount}px)</span>`
                : '<span class="text-muted">No</span>';

              return `
                <tr>
                  <td class="font-semibold">${b.width}px</td>
                  <td>${statusBadge}</td>
                  <td>${b.documentWidth}px</td>
                  <td>${b.scrollWidth}px</td>
                  <td>${overflowBadge}</td>
                  <td>${b.consoleErrorsCount}</td>
                  <td>${b.networkErrorsCount}</td>
                  <td>${b.loadTimeSeconds}</td>
                  <td>
                    ${b.screenshot ? `
                      <img src="${b.screenshot}" class="bp-mini-thumb" alt="${b.width}px thumbnail" title="Click to inspect" style="width: 44px; height: 28px; object-fit: cover; border-radius: 3px; border: 1px solid var(--border-color); cursor: pointer;">
                    ` : '<span class="text-muted">—</span>'}
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-secondary btn-xs btn-open-bp" data-width="${b.width}">View</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind action to view specific breakpoint in main viewport
    resultsContainer.querySelectorAll('.btn-open-bp').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseInt(btn.dataset.width, 10);
        this.hide();
        if (this.onSelectBreakpoint) {
          this.onSelectBreakpoint(w);
        }
      });
    });

    // Bind click thumbnail preview
    resultsContainer.querySelectorAll('.bp-mini-thumb').forEach(img => {
      img.addEventListener('click', () => {
        const modalImg = document.getElementById('screenshotModalImg');
        const modal = document.getElementById('screenshotModal');
        if (modalImg && modal) {
          modalImg.src = img.src;
          modal.classList.add('active');
        }
      });
    });
  }

  copyReport() {
    if (!this.results || !this.results.results) {
      alert('Run the suite first before copying report.');
      return;
    }

    const lines = [
      `WebDev AI Studio - Breakpoint Test Report`,
      `Target URL: ${this.currentUrl}`,
      `Date: ${new Date().toISOString()}`,
      `Breakpoints Tested: ${this.results.totalBreakpoints}`,
      `Passed: ${this.results.passedCount}, Warnings: ${this.results.warningCount}, Failed: ${this.results.failedCount}`,
      `----------------------------------------------------`
    ];

    this.results.results.forEach(b => {
      lines.push(`${b.width}px: Status=${b.status.toUpperCase()}, ScrollWidth=${b.scrollWidth}px, Overflow=${b.hasHorizontalOverflow ? `YES (+${b.overflowAmount}px)` : 'NO'}, ConsoleErrors=${b.consoleErrorsCount}, NetworkErrors=${b.networkErrorsCount}, LoadTime=${b.loadTimeSeconds}`);
    });

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      alert('Breakpoint audit report copied to clipboard!');
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.BreakpointRunner = BreakpointRunner;
