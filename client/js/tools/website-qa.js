/**
 * client/js/tools/website-qa.js
 * Comprehensive Website QA and Health Audit Client Controller.
 * Handles tab navigation, interactive inventories (Links, Images, CSS, JS, Fonts),
 * issue details, and raw technical data inspection.
 */

(function () {
  'use strict';

  // DOM Elements
  const qaView = document.getElementById('viewWebsiteQa');
  const dashboardView = document.getElementById('viewDashboard');
  const qaUrlInput = document.getElementById('qaUrlInput');
  const qaScanBtn = document.getElementById('qaScanBtn');
  const qaLoading = document.getElementById('qaLoading');
  const qaError = document.getElementById('qaError');
  const qaResults = document.getElementById('qaResults');

  let currentScanData = null;
  let activeProject = null;

  function init() {
    setupTriggers();
    setupScannerForm();
  }

  function setActiveProject(project) {
    activeProject = project;
    renderActiveProjectBanner();
  }

  function renderActiveProjectBanner() {
    let banner = document.getElementById('qaActiveProjectBanner');
    if (!banner) {
      const container = document.querySelector('.qa-scanner-container');
      if (container) {
        banner = document.createElement('div');
        banner.id = 'qaActiveProjectBanner';
        banner.style.marginBottom = 'var(--space-16)';
        container.insertBefore(banner, container.children[1] || null);
      }
    }

    if (!banner) return;

    if (!activeProject) {
      banner.innerHTML = '';
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-8) var(--space-16); background-color: var(--bg-surface-subtle); border: 1px solid var(--border-hover); border-radius: var(--radius-md); font-size: 12px;">
        <div style="display: flex; align-items: center; gap: var(--space-8);">
          <span style="color: var(--text-muted);">Active Project:</span>
          <strong style="color: var(--text-primary); font-size: 13px;">${escapeHtml(activeProject.name)}</strong>
          <span class="font-mono text-muted text-xs">(${escapeHtml(activeProject.url)})</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm js-qa-clear-project" style="font-size: 11px; padding: 2px 8px;">
          Clear Project
        </button>
      </div>
    `;

    const clearBtn = banner.querySelector('.js-qa-clear-project');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        setActiveProject(null);
      });
    }
  }

  function setupTriggers() {
    // Links with data-view="website-qa"
    document.querySelectorAll('[data-view="website-qa"], .js-open-qa').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openQaScanner();
      });
    });

    const analyzeCard = document.getElementById('cardAnalyzeWebsite');
    if (analyzeCard) {
      analyzeCard.addEventListener('click', (e) => {
        e.preventDefault();
        openQaScanner();
      });
    }

    const toolQa = document.getElementById('toolWebsiteQa');
    if (toolQa) {
      toolQa.addEventListener('click', (e) => {
        e.preventDefault();
        openQaScanner();
      });
    }

    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) {
      navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
      });
    }

    const breadcrumbRoot = document.getElementById('breadcrumbRoot');
    if (breadcrumbRoot) {
      breadcrumbRoot.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
      });
    }
  }

  function openQaScanner(presetUrl) {
    if (!qaView) return;

    ['viewDashboard', 'viewProjects', 'viewSettings', 'viewHistory', 'viewResponsiveTester', 'viewApiTester', 'viewAutomatedQa', 'viewSeoAudit', 'viewDesignToCode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    qaView.style.display = 'block';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'Website QA Scanner';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const sidebarQaLink = document.getElementById('navWebsiteQa');
    if (sidebarQaLink) sidebarQaLink.classList.add('active');

    renderActiveProjectBanner();

    if (presetUrl && qaUrlInput) {
      qaUrlInput.value = presetUrl;
      triggerScan();
    } else if (qaUrlInput) {
      if (activeProject && !qaUrlInput.value) {
        qaUrlInput.value = activeProject.url;
      }
      qaUrlInput.focus();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDashboard() {
    if (window.App && window.App.openDashboard) {
      window.App.openDashboard();
      return;
    }
    ['viewWebsiteQa', 'viewProjects', 'viewSettings', 'viewHistory'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    if (dashboardView) dashboardView.style.display = 'flex';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'Dashboard';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) navDashboard.classList.add('active');
  }

  function setupScannerForm() {
    if (!qaScanBtn || !qaUrlInput) return;

    qaScanBtn.addEventListener('click', () => triggerScan());
    qaUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerScan();
      }
    });
  }

  async function triggerScan() {
    let url = qaUrlInput.value.trim();
    if (!url) {
      showError('Please enter a website URL to scan.');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      qaUrlInput.value = url;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showError('Invalid protocol. Only http:// and https:// URLs are supported.');
        return;
      }
    } catch (e) {
      showError('Invalid URL format. Example: https://example.com');
      return;
    }

    hideError();
    if (qaResults) qaResults.innerHTML = '';
    showLoading(true);

    try {
      const res = await fetch('/api/qa/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      currentScanData = data;
      renderResults(data);

      // Record scan into project if linked
      if (activeProject && window.ProjectManager) {
        window.ProjectManager.addProjectScan(activeProject.id, data);
      }

      // Record activity into HistoryManager
      if (window.HistoryManager) {
        const summaryMetrics = {
          Score: (data.summary ? data.summary.score : 0) + '%',
          Passed: data.summary ? data.summary.passed : 0,
          Warnings: data.summary ? data.summary.warning : 0,
          Errors: data.summary ? data.summary.error : 0,
          ResponseTime: (data.responseTime || 0) + 'ms'
        };

        window.HistoryManager.addHistoryItem({
          type: 'qa_scan',
          tool: 'Website QA',
          action: `QA Audit of ${data.finalUrl || url}`,
          projectId: activeProject ? activeProject.id : null,
          projectName: activeProject ? activeProject.name : null,
          url: data.finalUrl || url,
          status: data.status >= 400 ? 'failed' : 'completed',
          summary: summaryMetrics,
          details: {
            scanData: data
          }
        });
      }
    } catch (err) {
      showError(err.message || 'Failed to scan website. Verify the target host and try again.');
    } finally {
      showLoading(false);
    }
  }

  function showLoading(isLoading) {
    if (!qaLoading || !qaScanBtn) return;
    if (isLoading) {
      qaLoading.style.display = 'flex';
      qaScanBtn.disabled = true;
      qaScanBtn.style.opacity = '0.6';
    } else {
      qaLoading.style.display = 'none';
      qaScanBtn.disabled = false;
      qaScanBtn.style.opacity = '1';
    }
  }

  function showError(msg) {
    if (!qaError) return;
    qaError.style.display = 'flex';
    qaError.querySelector('.error-msg-text').textContent = msg;
  }

  function hideError() {
    if (!qaError) return;
    qaError.style.display = 'none';
  }

  // --- RENDERING ---

  function renderResults(data) {
    if (!qaResults) return;

    const { url, finalUrl, timestamp, status, responseTime, isHttps, summary } = data;
    const formattedDate = new Date(timestamp).toLocaleString();

    qaResults.innerHTML = `
      <!-- Scan Summary Card -->
      <div class="scan-summary-card">
        <div class="scan-meta-row">
          <div class="scan-meta-group">
            <span class="scan-meta-label">TARGET URL</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <a href="${escapeHtml(finalUrl)}" target="_blank" rel="noopener noreferrer" class="scan-target-url">
                ${escapeHtml(finalUrl)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              <button class="btn-copy" type="button" onclick="navigator.clipboard.writeText('${escapeHtml(finalUrl)}'); alert('Copied URL to clipboard');">Copy</button>
            </div>
          </div>
          <div class="scan-metrics-group">
            <div class="scan-metric-badge">
              <span class="metric-label">HTTP STATUS</span>
              <span class="metric-value font-mono ${status >= 200 && status < 300 ? 'text-success' : 'text-warning'}">${status}</span>
            </div>
            <div class="scan-metric-badge">
              <span class="metric-label">RESPONSE TIME</span>
              <span class="metric-value font-mono">${responseTime}ms</span>
            </div>
            <div class="scan-metric-badge">
              <span class="metric-label">SECURITY</span>
              <span class="metric-value font-mono ${isHttps ? 'text-success' : 'text-error'}">${isHttps ? 'HTTPS' : 'HTTP'}</span>
            </div>
            <div class="scan-metric-badge">
              <span class="metric-label">SCANNED AT</span>
              <span class="metric-value text-secondary">${formattedDate}</span>
            </div>
          </div>
        </div>

        <!-- Summary Score Chips -->
        <div class="summary-chips-row">
          <div class="summary-chip chip-critical">
            <span class="chip-count">${summary.critical}</span>
            <span class="chip-title">Critical Issues</span>
          </div>
          <div class="summary-chip chip-warnings">
            <span class="chip-count">${summary.warnings}</span>
            <span class="chip-title">Warnings</span>
          </div>
          <div class="summary-chip chip-passed">
            <span class="chip-count">${summary.passed}</span>
            <span class="chip-title">Passed Checks</span>
          </div>
        </div>
      </div>

      <!-- Category Navigation Tabs -->
      <div class="qa-tabs-bar" id="qaTabsBar">
        <button class="qa-tab-btn active" data-tab="overview" type="button">Overview</button>
        <button class="qa-tab-btn" data-tab="technical" type="button">Technical <span class="qa-tab-badge">${data.technical.checks.length}</span></button>
        <button class="qa-tab-btn" data-tab="html" type="button">HTML / Doc <span class="qa-tab-badge">${data.htmlDoc.checks.length}</span></button>
        <button class="qa-tab-btn" data-tab="links" type="button">Links <span class="qa-tab-badge">${data.links.summary.total}</span></button>
        <button class="qa-tab-btn" data-tab="images" type="button">Images <span class="qa-tab-badge">${data.images.summary.total}</span></button>
        <button class="qa-tab-btn" data-tab="css" type="button">CSS <span class="qa-tab-badge">${data.css.summary.externalCount}</span></button>
        <button class="qa-tab-btn" data-tab="js" type="button">JavaScript <span class="qa-tab-badge">${data.javascript.summary.externalCount}</span></button>
        <button class="qa-tab-btn" data-tab="fonts" type="button">Fonts <span class="qa-tab-badge">${data.fonts.summary.totalFonts}</span></button>
        <button class="qa-tab-btn" data-tab="accessibility" type="button">Accessibility <span class="qa-tab-badge">${data.accessibility.checks.length}</span></button>
        <button class="qa-tab-btn" data-tab="schema" type="button">Schema <span class="qa-tab-badge">${data.schema.summary.jsonLdCount}</span></button>
        <button class="qa-tab-btn" data-tab="social" type="button">Social Meta</button>
        <button class="qa-tab-btn" data-tab="security" type="button">Security Headers</button>
        <button class="qa-tab-btn" data-tab="robots" type="button">Robots &amp; Sitemap</button>
        <button class="qa-tab-btn" data-tab="resources" type="button">Resources</button>
        <button class="qa-tab-btn" data-tab="raw" type="button">Raw Data</button>
      </div>

      <!-- Tab Panes Container -->
      <div id="qaPanesContainer">
        <!-- 1. OVERVIEW TAB -->
        <div class="qa-tab-pane active" id="pane-overview">
          <div class="qa-category-block">
            <div class="qa-category-header">
              <h3 class="qa-category-title">Audit Highlights &amp; Resource Footprint</h3>
            </div>
            <!-- Resource Footprint Summary Grid -->
            <div class="qa-meta-grid">
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">HTML Document</span>
                <span class="qa-meta-box-value font-mono">${formatBytes(data.htmlDoc.summary?.htmlSize || 0)}</span>
              </div>
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">External CSS</span>
                <span class="qa-meta-box-value font-mono">${data.css.summary.externalCount} (${data.css.summary.inlineBlocksCount} inline)</span>
              </div>
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">External JS</span>
                <span class="qa-meta-box-value font-mono">${data.javascript.summary.externalCount} (${data.javascript.summary.inlineBlocksCount} inline)</span>
              </div>
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">Total Images</span>
                <span class="qa-meta-box-value font-mono">${data.images.summary.total} (${data.images.summary.missingAltCount} missing alt)</span>
              </div>
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">Total Links</span>
                <span class="qa-meta-box-value font-mono">${data.links.summary.total} (${data.links.summary.brokenCount} broken)</span>
              </div>
              <div class="qa-meta-box">
                <span class="qa-meta-box-label">Web Fonts</span>
                <span class="qa-meta-box-value font-mono">${data.fonts.summary.totalFonts} font files</span>
              </div>
            </div>
          </div>

          <!-- All Critical Issues & Warnings -->
          ${renderChecksList('Issues & Warnings Requiring Attention', [
            ...data.technical.checks,
            ...data.htmlDoc.checks,
            ...data.links.checks,
            ...data.images.checks,
            ...data.css.checks,
            ...data.javascript.checks,
            ...data.fonts.checks,
            ...data.accessibility.checks,
            ...data.schema.checks,
            ...data.social.checks,
            ...data.security.checks,
            ...data.robots.checks,
            ...data.resources.checks
          ].filter(c => c.severity === 'ERROR' || c.severity === 'WARNING'))}
        </div>

        <!-- 2. TECHNICAL TAB -->
        <div class="qa-tab-pane" id="pane-technical">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Original URL</span>
              <span class="qa-meta-box-value font-mono" style="font-size: 11px;">${escapeHtml(data.technical.originalUrl)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Final URL</span>
              <span class="qa-meta-box-value font-mono" style="font-size: 11px;">${escapeHtml(data.technical.finalUrl)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Content-Type</span>
              <span class="qa-meta-box-value font-mono">${escapeHtml(data.technical.contentType)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Content-Encoding</span>
              <span class="qa-meta-box-value font-mono">${escapeHtml(data.technical.contentEncoding)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Cache-Control</span>
              <span class="qa-meta-box-value font-mono" style="font-size: 11px;">${escapeHtml(data.technical.cacheControl)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Server Header</span>
              <span class="qa-meta-box-value font-mono">${escapeHtml(data.technical.serverHeader)}</span>
            </div>
          </div>
          ${renderChecksList('Technical Checks', data.technical.checks)}
        </div>

        <!-- 3. HTML / DOC TAB -->
        <div class="qa-tab-pane" id="pane-html">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">HTML Size</span>
              <span class="qa-meta-box-value font-mono">${formatBytes(data.htmlDoc.htmlSize || 0)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Document Charset</span>
              <span class="qa-meta-box-value font-mono">${escapeHtml(data.htmlDoc.charset)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Language (lang)</span>
              <span class="qa-meta-box-value font-mono">${escapeHtml(data.htmlDoc.lang)}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Total DOM Elements</span>
              <span class="qa-meta-box-value font-mono">${data.htmlDoc.totalElementsEstimate} approx.</span>
            </div>
          </div>
          ${renderChecksList('Document Health Checks', data.htmlDoc.checks)}
          ${renderHeadingsHierarchy(data.htmlDoc.headings)}
          ${renderMetaTagsTable(data.htmlDoc.metaTags)}
        </div>

        <!-- 4. LINKS TAB -->
        <div class="qa-tab-pane" id="pane-links">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Total Links</span>
              <span class="qa-meta-box-value font-mono">${data.links.summary.total}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Internal</span>
              <span class="qa-meta-box-value font-mono">${data.links.summary.internal}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">External</span>
              <span class="qa-meta-box-value font-mono">${data.links.summary.external}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Broken Links</span>
              <span class="qa-meta-box-value font-mono ${data.links.summary.brokenCount > 0 ? 'text-error' : 'text-success'}">${data.links.summary.brokenCount}</span>
            </div>
          </div>
          ${renderChecksList('Link Checks', data.links.checks)}
          ${renderLinksInventoryTable(data.links.inventory)}
        </div>

        <!-- 5. IMAGES TAB -->
        <div class="qa-tab-pane" id="pane-images">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Total Images</span>
              <span class="qa-meta-box-value font-mono">${data.images.summary.total}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Missing Alt</span>
              <span class="qa-meta-box-value font-mono ${data.images.summary.missingAltCount > 0 ? 'text-error' : 'text-success'}">${data.images.summary.missingAltCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Missing Dimensions</span>
              <span class="qa-meta-box-value font-mono">${data.images.summary.missingDimCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Legacy Formats</span>
              <span class="qa-meta-box-value font-mono">${data.images.summary.legacyFormatCount}</span>
            </div>
          </div>
          ${renderChecksList('Image Optimization & A11y Checks', data.images.checks)}
          ${renderImagesInventoryTable(data.images.inventory)}
        </div>

        <!-- 6. CSS TAB -->
        <div class="qa-tab-pane" id="pane-css">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">External Stylesheets</span>
              <span class="qa-meta-box-value font-mono">${data.css.summary.externalCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Inline Style Blocks</span>
              <span class="qa-meta-box-value font-mono">${data.css.summary.inlineBlocksCount} (${formatBytes(data.css.summary.totalInlineBytes)})</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Mixed Content CSS</span>
              <span class="qa-meta-box-value font-mono">${data.css.summary.mixedContentCount}</span>
            </div>
          </div>
          ${renderChecksList('CSS Resource Checks', data.css.checks)}
          ${renderCssInventoryTable(data.css.inventory)}
        </div>

        <!-- 7. JAVASCRIPT TAB -->
        <div class="qa-tab-pane" id="pane-js">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">External Scripts</span>
              <span class="qa-meta-box-value font-mono">${data.javascript.summary.externalCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Inline Script Blocks</span>
              <span class="qa-meta-box-value font-mono">${data.javascript.summary.inlineBlocksCount} (${formatBytes(data.javascript.summary.totalInlineBytes)})</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Render-Blocking</span>
              <span class="qa-meta-box-value font-mono">${data.javascript.summary.renderBlockingCount}</span>
            </div>
          </div>
          ${renderChecksList('JavaScript Checks', data.javascript.checks)}
          ${renderJsInventoryTable(data.javascript.inventory)}
        </div>

        <!-- 8. FONTS TAB -->
        <div class="qa-tab-pane" id="pane-fonts">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Total Font Resources</span>
              <span class="qa-meta-box-value font-mono">${data.fonts.summary.totalFonts}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Providers Detected</span>
              <span class="qa-meta-box-value font-mono">${data.fonts.summary.providers.join(', ') || 'Self-hosted / None'}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">WOFF2 Used</span>
              <span class="qa-meta-box-value font-mono">${data.fonts.summary.usesWoff2 ? 'Yes' : 'No'}</span>
            </div>
          </div>
          ${renderChecksList('Font Performance Checks', data.fonts.checks)}
          ${renderFontsInventoryTable(data.fonts.inventory)}
        </div>

        <!-- 9. ACCESSIBILITY TAB -->
        <div class="qa-tab-pane" id="pane-accessibility">
          <div class="qa-category-block">
            <div style="background-color: var(--bg-surface-subtle); border-left: 3px solid var(--accent-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 11px; color: var(--text-secondary);">
              <strong>Automated Accessibility Baseline:</strong> These checks test programmatically detectable accessibility criteria. Manual screen-reader and keyboard testing are also recommended.
            </div>
          </div>
          ${renderChecksList('Automated Accessibility Checks', data.accessibility.checks)}
        </div>

        <!-- 10. SCHEMA TAB -->
        <div class="qa-tab-pane" id="pane-schema">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">JSON-LD Blocks</span>
              <span class="qa-meta-box-value font-mono">${data.schema.summary.jsonLdCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Detected Types</span>
              <span class="qa-meta-box-value font-mono">${data.schema.summary.detectedTypes.join(', ') || 'None'}</span>
            </div>
          </div>
          ${renderChecksList('Structured Data Checks', data.schema.checks)}
          ${renderSchemaInspector(data.schema.jsonLdBlocks)}
        </div>

        <!-- 11. SOCIAL TAB -->
        <div class="qa-tab-pane" id="pane-social">
          ${renderChecksList('Social Metadata Checks', data.social.checks)}
          ${renderSocialMetadataCard(data.social)}
        </div>

        <!-- 12. SECURITY TAB -->
        <div class="qa-tab-pane" id="pane-security">
          ${renderChecksList('Security Header Checks', data.security.checks)}
          ${renderSecurityHeadersTable(data.security.headers)}
        </div>

        <!-- 13. ROBOTS & SITEMAP TAB -->
        <div class="qa-tab-pane" id="pane-robots">
          ${renderChecksList('Robots &amp; Sitemap Checks', data.robots.checks)}
          ${renderRobotsAndSitemapView(data.robots)}
        </div>

        <!-- 14. RESOURCES TAB -->
        <div class="qa-tab-pane" id="pane-resources">
          ${renderChecksList('Resource Integrity &amp; Third-Party Checks', data.resources.checks)}
          ${renderThirdPartyDomainsTable(data.resources.thirdPartyDomains)}
          ${renderMixedContentTable(data.resources.mixedContent)}
        </div>

        <!-- 15. RAW DATA TAB -->
        <div class="qa-tab-pane" id="pane-raw">
          <div class="qa-category-block">
            <div class="qa-category-header">
              <h3 class="qa-category-title">Raw Technical Data (JSON)</h3>
              <button class="btn-copy" type="button" onclick="navigator.clipboard.writeText(document.getElementById('rawJsonBlock').textContent); alert('Raw JSON copied to clipboard');">Copy JSON</button>
            </div>
            <div class="qa-code-block" id="rawJsonBlock">${escapeHtml(JSON.stringify(data.rawTechnicalData, null, 2))}</div>
          </div>
        </div>
      </div>
    `;

    setupTabNavigation();
  }

  function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.qa-tab-btn');
    const tabPanes = document.querySelectorAll('.qa-tab-pane');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(`pane-${targetTab}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  // --- COMPONENT RENDERERS ---

  function renderChecksList(title, checkList) {
    if (!checkList || checkList.length === 0) return '';
    return `
      <section class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">${title}</h3>
          <span class="qa-category-count">${checkList.length} items</span>
        </div>
        <div class="qa-checks-list">
          ${checkList.map(c => renderCheckItem(c)).join('')}
        </div>
      </section>
    `;
  }

  function renderCheckItem(check) {
    const sevClass = check.severity.toLowerCase(); // 'pass', 'warning', 'error', 'info'
    return `
      <div class="qa-check-item ${sevClass}">
        <div class="check-item-header">
          <div class="check-status-badge badge-${sevClass}">${check.severity}</div>
          <span class="check-item-name">${escapeHtml(check.name)}</span>
          ${check.detectedValue ? `<span class="font-mono text-muted" style="margin-left: auto; font-size: 11px;">${escapeHtml(check.detectedValue)}</span>` : ''}
        </div>
        <p class="check-item-desc">${escapeHtml(check.message)}</p>
        ${check.whyItMatters ? `
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.35; margin-top: 2px;">
            <strong>Impact:</strong> ${escapeHtml(check.whyItMatters)}
          </div>
        ` : ''}
        ${check.fix ? `
          <div class="check-how-to-fix">
            <div class="how-to-fix-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              How to fix:
            </div>
            <div class="how-to-fix-content">${escapeHtml(check.fix)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderLinksInventoryTable(links = []) {
    if (!links || links.length === 0) return '';
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Complete Link Inventory (${links.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Anchor Text / Name</th>
                <th>Target URL / Href</th>
                <th>Type</th>
                <th>Rel / Target</th>
              </tr>
            </thead>
            <tbody>
              ${links.slice(0, 150).map(l => `
                <tr>
                  <td>
                    ${l.status ? `<span class="font-mono ${l.status >= 400 ? 'text-error' : l.status >= 300 ? 'text-warning' : 'text-success'}">${l.status}</span>` : `<span class="text-muted font-mono">${l.error || 'N/A'}</span>`}
                  </td>
                  <td style="max-width: 200px;" class="truncate" title="${escapeHtml(l.anchorText)}">${escapeHtml(l.anchorText)}</td>
                  <td style="max-width: 320px;" class="truncate font-mono" title="${escapeHtml(l.resolvedUrl || l.originalHref)}">
                    ${escapeHtml(l.resolvedUrl || l.originalHref)}
                  </td>
                  <td><span class="font-mono text-muted">${l.category}</span></td>
                  <td class="font-mono text-muted">${escapeHtml(l.rel || '')} ${escapeHtml(l.target || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${links.length > 150 ? `<div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">Displaying first 150 of ${links.length} links</div>` : ''}
      </div>
    `;
  }

  function renderImagesInventoryTable(images = []) {
    if (!images || images.length === 0) return '';
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Complete Image Inventory (${images.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Image Source (src)</th>
                <th>Alt Attribute</th>
                <th>Dimensions</th>
                <th>Format</th>
                <th>Loading</th>
                <th>Size / Status</th>
              </tr>
            </thead>
            <tbody>
              ${images.slice(0, 120).map(i => `
                <tr>
                  <td style="max-width: 280px;" class="truncate font-mono" title="${escapeHtml(i.absoluteUrl || i.src)}">
                    ${escapeHtml(i.src)}
                  </td>
                  <td style="max-width: 200px;" class="truncate">
                    ${i.hasAltAttr ? (i.isEmptyAlt ? '<span class="text-muted">(empty alt="")</span>' : escapeHtml(i.alt)) : '<span class="text-error">Missing alt!</span>'}
                  </td>
                  <td class="font-mono">${i.hasDimensions ? `${i.width} &times; ${i.height}` : '<span class="text-muted">None</span>'}</td>
                  <td><span class="font-mono ${i.isModernFormat ? 'text-success' : 'text-muted'}">${i.format.toUpperCase()}</span></td>
                  <td class="font-mono text-muted">${i.loading || 'eager/default'}</td>
                  <td class="font-mono">
                    ${i.fileSizeBytes ? formatBytes(i.fileSizeBytes) : (i.status ? `HTTP ${i.status}` : 'Not measured')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${images.length > 120 ? `<div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">Displaying first 120 of ${images.length} images</div>` : ''}
      </div>
    `;
  }

  function renderCssInventoryTable(stylesheets = []) {
    if (!stylesheets || stylesheets.length === 0) {
      return '<div class="text-muted" style="padding: 12px; font-size: 12px;">No external stylesheets detected.</div>';
    }
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">External Stylesheets (${stylesheets.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Stylesheet URL</th>
                <th>Status</th>
                <th>Size</th>
                <th>Media</th>
                <th>Security</th>
              </tr>
            </thead>
            <tbody>
              ${stylesheets.map(s => `
                <tr>
                  <td class="font-mono truncate" style="max-width: 400px;" title="${escapeHtml(s.absoluteUrl || s.href)}">${escapeHtml(s.absoluteUrl || s.href)}</td>
                  <td class="font-mono ${s.status === 200 ? 'text-success' : 'text-warning'}">${s.status || s.error || 'N/A'}</td>
                  <td class="font-mono">${s.fileSizeBytes ? formatBytes(s.fileSizeBytes) : 'N/A'}</td>
                  <td class="font-mono text-muted">${escapeHtml(s.media)}</td>
                  <td>${s.isMixedContent ? '<span class="text-error">HTTP (Insecure)</span>' : '<span class="text-success">HTTPS</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderJsInventoryTable(scripts = []) {
    if (!scripts || scripts.length === 0) {
      return '<div class="text-muted" style="padding: 12px; font-size: 12px;">No external scripts detected.</div>';
    }
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">External JavaScript Files (${scripts.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Script URL</th>
                <th>Status</th>
                <th>Size</th>
                <th>Execution Mode</th>
                <th>Security</th>
              </tr>
            </thead>
            <tbody>
              ${scripts.map(s => `
                <tr>
                  <td class="font-mono truncate" style="max-width: 400px;" title="${escapeHtml(s.absoluteUrl || s.src)}">${escapeHtml(s.absoluteUrl || s.src)}</td>
                  <td class="font-mono ${s.status === 200 ? 'text-success' : 'text-warning'}">${s.status || s.error || 'N/A'}</td>
                  <td class="font-mono">${s.fileSizeBytes ? formatBytes(s.fileSizeBytes) : 'N/A'}</td>
                  <td class="font-mono text-muted">${s.isModule ? 'module' : (s.isDefer ? 'defer' : (s.isAsync ? 'async' : 'sync/blocking'))}</td>
                  <td>${s.isMixedContent ? '<span class="text-error">HTTP (Insecure)</span>' : '<span class="text-success">HTTPS</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderFontsInventoryTable(fonts = []) {
    if (!fonts || fonts.length === 0) {
      return '<div class="text-muted" style="padding: 12px; font-size: 12px;">No web font resources detected.</div>';
    }
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Web Font Resources (${fonts.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Font URL</th>
                <th>Provider</th>
                <th>Format</th>
                <th>Preload</th>
              </tr>
            </thead>
            <tbody>
              ${fonts.map(f => `
                <tr>
                  <td class="font-mono truncate" style="max-width: 450px;" title="${escapeHtml(f.url)}">${escapeHtml(f.url)}</td>
                  <td>${escapeHtml(f.provider)}</td>
                  <td class="font-mono">${escapeHtml(f.format)}</td>
                  <td class="font-mono text-muted">${f.isPreloaded ? '<span class="text-success">preload</span>' : 'normal'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderHeadingsHierarchy(headings = []) {
    if (!headings || headings.length === 0) return '';
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Heading Hierarchy Breakdown (${headings.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th style="width: 80px;">Level</th>
                <th>Heading Text</th>
              </tr>
            </thead>
            <tbody>
              ${headings.map(h => `
                <tr>
                  <td><span class="font-mono text-muted">${h.level}</span></td>
                  <td>${escapeHtml(h.text)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderMetaTagsTable(metaTags = []) {
    if (!metaTags || metaTags.length === 0) return '';
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Document Meta Tags (${metaTags.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Key / Name</th>
                <th>Content Value</th>
              </tr>
            </thead>
            <tbody>
              ${metaTags.map(m => `
                <tr>
                  <td class="font-mono text-muted">${escapeHtml(m.type)}</td>
                  <td class="font-mono">${escapeHtml(m.key)}</td>
                  <td style="max-width: 400px;" class="truncate" title="${escapeHtml(m.content)}">${escapeHtml(m.content)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderSchemaInspector(jsonLdBlocks = []) {
    if (!jsonLdBlocks || jsonLdBlocks.length === 0) {
      return '<div class="text-muted" style="padding: 12px; font-size: 12px;">No JSON-LD structured data detected.</div>';
    }
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">JSON-LD Structured Data Inspector (${jsonLdBlocks.length})</h3>
        </div>
        ${jsonLdBlocks.map((b, idx) => `
          <div style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="font-mono" style="font-weight: 600; font-size: 12px;">Block #${idx + 1} (${b.primaryType || 'General'})</span>
              <span class="font-mono text-muted" style="font-size: 11px;">${b.isValidJson ? 'Valid JSON' : 'JSON Parse Error'}</span>
            </div>
            <div class="qa-code-block">${escapeHtml(b.rawContent)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSocialMetadataCard(social) {
    const { openGraph, twitter } = social;
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Open Graph &amp; Twitter Card Metadata</h3>
        </div>
        <div class="qa-meta-grid">
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">og:title</span>
            <span class="qa-meta-box-value">${escapeHtml(openGraph.title || 'Not specified')}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">og:description</span>
            <span class="qa-meta-box-value">${escapeHtml(openGraph.description || 'Not specified')}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">og:image</span>
            <span class="qa-meta-box-value font-mono" style="font-size: 11px;">${escapeHtml(openGraph.image || 'Not specified')}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">twitter:card</span>
            <span class="qa-meta-box-value font-mono">${escapeHtml(twitter.card || 'Not specified')}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSecurityHeadersTable(headers = {}) {
    const items = [
      { name: 'Strict-Transport-Security (HSTS)', val: headers.strictTransportSecurity },
      { name: 'Content-Security-Policy (CSP)', val: headers.contentSecurityPolicy },
      { name: 'X-Frame-Options', val: headers.xFrameOptions },
      { name: 'X-Content-Type-Options', val: headers.xContentTypeOptions },
      { name: 'Referrer-Policy', val: headers.referrerPolicy },
      { name: 'Permissions-Policy', val: headers.permissionsPolicy }
    ];

    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Security Headers Evaluation</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Security Header</th>
                <th>Detected Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td class="font-mono"><strong>${escapeHtml(i.name)}</strong></td>
                  <td class="font-mono text-secondary" style="max-width: 400px;">${escapeHtml(i.val || 'Not configured')}</td>
                  <td>${i.val ? '<span class="text-success font-mono">Present</span>' : '<span class="text-muted font-mono">Missing</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRobotsAndSitemapView(robots) {
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Robots.txt &amp; XML Sitemap</h3>
        </div>
        <div class="qa-meta-grid" style="margin-bottom: 12px;">
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">robots.txt Status</span>
            <span class="qa-meta-box-value font-mono ${robots.robotsTxt.exists ? 'text-success' : 'text-warning'}">${robots.robotsTxt.status}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">Sitemaps Declared</span>
            <span class="qa-meta-box-value font-mono">${robots.robotsTxt.sitemaps.length}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">sitemap.xml Status</span>
            <span class="qa-meta-box-value font-mono ${robots.sitemapXml.exists ? 'text-success' : 'text-warning'}">${robots.sitemapXml.status}</span>
          </div>
          <div class="qa-meta-box">
            <span class="qa-meta-box-label">Sitemap URL Count (Est.)</span>
            <span class="qa-meta-box-value font-mono">${robots.sitemapXml.urlCountEstimate} URLs</span>
          </div>
        </div>
        ${robots.robotsTxt.content ? `
          <div style="margin-top: 8px;">
            <span class="font-mono text-muted" style="font-size: 11px;">/robots.txt Content:</span>
            <div class="qa-code-block">${escapeHtml(robots.robotsTxt.content)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderThirdPartyDomainsTable(domains = []) {
    if (!domains || domains.length === 0) {
      return '<div class="text-muted" style="padding: 12px; font-size: 12px;">No third-party domain requests detected.</div>';
    }
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title">Third-Party Connected Domains (${domains.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>External Domain</th>
                <th>Resource Count</th>
                <th>Asset Types</th>
              </tr>
            </thead>
            <tbody>
              ${domains.map(d => `
                <tr>
                  <td class="font-mono"><strong>${escapeHtml(d.domain)}</strong></td>
                  <td class="font-mono">${d.count}</td>
                  <td class="font-mono text-muted">${escapeHtml(d.types.join(', '))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderMixedContentTable(mixed = []) {
    if (!mixed || mixed.length === 0) return '';
    return `
      <div class="qa-category-block">
        <div class="qa-category-header">
          <h3 class="qa-category-title text-error">Insecure Mixed Content Resources (${mixed.length})</h3>
        </div>
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Insecure HTTP URL</th>
              </tr>
            </thead>
            <tbody>
              ${mixed.map(m => `
                <tr>
                  <td class="font-mono text-error">${escapeHtml(m.type)}</td>
                  <td class="font-mono">${escapeHtml(m.url)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
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

  window.WebsiteQa = {
    open: openQaScanner,
    close: openDashboard,
    setActiveProject,
    getActiveProject: () => activeProject,
    displayResults: (data) => {
      currentScanData = data;
      renderResults(data);
    },
    scan: triggerScan
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
