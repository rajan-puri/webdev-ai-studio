/**
 * WebDev AI Studio - Standalone SEO Audit Module Controller
 * Provides end-to-end technical SEO crawler, health scoring, progressive disclosure config,
 * live crawl monitoring, issues & pages inspection drawers, AI bot matrix, and real exports.
 */

(function () {
  'use strict';

  class SeoAuditTool {
    constructor() {
      this.container = document.getElementById('viewSeoAudit');
      this.currentAudit = null;
      this.pages = [];
      this.issues = [];
      this.pollInterval = null;
      this.activeTab = 'issues';
      this.selectedScope = 'domain';
      this.selectedSeverity = 'all';
      this.selectedCategory = 'all';
      this.issueSearch = '';
      this.pageSearch = '';
      this.pageStatusFilter = 'all';
      this.activeDrawer = null; // 'issue' | 'page' | null
      this.selectedIssue = null;
      this.selectedPage = null;
      this.activeSuiteTab = 'overview';

      if (this.container) {
        this.init();
      }
    }

    init() {
      this.renderLayout();
      this.bindEvents();
      if (typeof this.bindSuiteEvents === 'function') {
        this.bindSuiteEvents();
      }
      this.loadRecentAudits();
    }

    renderLayout() {
      this.container.innerHTML = `
        <!-- Page Header -->
        <div class="seo-page-header">
          <div class="seo-page-title-wrap">
            <h1 class="seo-page-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              SEO Intelligence Platform
            </h1>
            <p class="seo-page-subtitle">SEMrush-style SEO Suite powered strictly by real data: first-party recursive crawler, Google Search Console, Bing Webmaster, Ahrefs DR, PageSpeed Insights &amp; Log File Analyzer.</p>
          </div>
          <div class="seo-header-actions">
            <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnSeoConfigureProviders">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Manage Providers</span>
            </button>
            <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnSeoHistoryModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Audit History</span>
            </button>
            <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnNewAudit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>New Audit</span>
            </button>
          </div>
        </div>

        <!-- SEMrush-Style SEO Suite Navigation Bar -->
        <div class="seo-suite-nav" id="seoSuiteNav">
          <button type="button" class="seo-suite-tab active" data-tab="overview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>SEO Dashboard</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="audit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Site Audit</span>
            <span class="seo-cap-badge cap-available">Available</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="competitors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>Competitive Research</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="keywords">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <span>Organic &amp; Keywords</span>
            <span class="seo-cap-badge cap-connected">GSC &amp; Bing</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="performance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>PageSpeed &amp; CrUX</span>
            <span class="seo-cap-badge cap-available">Available</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="links">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            <span>Link Intelligence</span>
            <span class="seo-cap-badge cap-limited">Ahrefs DR</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="logs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span>Log File Analyzer</span>
            <span class="seo-cap-badge cap-available">Available</span>
          </button>
          <button type="button" class="seo-suite-tab" data-tab="reports">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Export Center</span>
          </button>
        </div>

        <!-- Pane 1: SEO Dashboard (Overview) -->
        <div class="seo-suite-pane" id="paneSeoDashboard" style="display: flex;">
          <!-- Provider Status Strip -->
          <div class="seo-provider-strip" id="seoProviderStatusStrip">
            <span style="font-weight: 600; color: #475569;">Data Sources:</span>
            <span class="seo-provider-chip"><strong>Crawler:</strong> <span class="seo-cap-badge cap-available">Available</span></span>
            <span class="seo-provider-chip"><strong>GSC:</strong> <span class="seo-cap-badge cap-connected">Connected Data</span></span>
            <span class="seo-provider-chip"><strong>Bing:</strong> <span class="seo-cap-badge cap-connected">Connected Data</span></span>
            <span class="seo-provider-chip"><strong>Ahrefs DR:</strong> <span class="seo-cap-badge cap-limited">Available</span></span>
            <span class="seo-provider-chip"><strong>PageSpeed:</strong> <span class="seo-cap-badge cap-available">Available</span></span>
          </div>

          <!-- Domain Search Card -->
          <div class="seo-card">
            <div class="seo-target-row">
              <div class="seo-url-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
                <input type="text" id="overviewDomainInput" class="seo-input" placeholder="Enter root domain or URL (e.g. example.com)" spellcheck="false" autocomplete="off" />
              </div>
              <button class="seo-btn seo-btn-primary" id="btnAnalyzeOverview">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Analyze Domain</span>
              </button>
            </div>
          </div>

          <!-- KPI Cards Grid -->
          <div class="seo-kpi-grid">
            <div class="seo-kpi-card">
              <div class="seo-kpi-header">
                <span class="seo-kpi-label">Technical Health</span>
                <span class="seo-provenance-tag">WebDev Crawler</span>
              </div>
              <div class="seo-kpi-value" id="kpiHealthVal">--</div>
              <div class="seo-kpi-footer">
                <span id="kpiHealthSub">Site crawl score</span>
                <span class="seo-cap-badge cap-available">Available</span>
              </div>
            </div>

            <div class="seo-kpi-card">
              <div class="seo-kpi-header">
                <span class="seo-kpi-label">Domain Rating</span>
                <span class="seo-provenance-tag">Ahrefs DR</span>
              </div>
              <div class="seo-kpi-value" id="kpiDrVal">--</div>
              <div class="seo-kpi-footer">
                <span id="kpiDrSub">Domain Rating by Ahrefs</span>
                <span class="seo-cap-badge cap-limited">Public API</span>
              </div>
            </div>

            <div class="seo-kpi-card">
              <div class="seo-kpi-header">
                <span class="seo-kpi-label">Organic Clicks (28d)</span>
                <span class="seo-provenance-tag">Search Console</span>
              </div>
              <div class="seo-kpi-value" id="kpiClicksVal">--</div>
              <div class="seo-kpi-footer">
                <span id="kpiClicksSub">Verified Google traffic</span>
                <span class="seo-cap-badge cap-connected">Connected</span>
              </div>
            </div>

            <div class="seo-kpi-card">
              <div class="seo-kpi-header">
                <span class="seo-kpi-label">Impressions (28d)</span>
                <span class="seo-provenance-tag">Search Console</span>
              </div>
              <div class="seo-kpi-value" id="kpiImprVal">--</div>
              <div class="seo-kpi-footer">
                <span id="kpiImprSub">Search visibility</span>
                <span class="seo-cap-badge cap-connected">Connected</span>
              </div>
            </div>

            <div class="seo-kpi-card">
              <div class="seo-kpi-header">
                <span class="seo-kpi-label">Mobile PageSpeed</span>
                <span class="seo-provenance-tag">PageSpeed Insights</span>
              </div>
              <div class="seo-kpi-value" id="kpiSpeedVal">--</div>
              <div class="seo-kpi-footer">
                <span id="kpiSpeedSub">Lighthouse performance</span>
                <span class="seo-cap-badge cap-available">Available</span>
              </div>
            </div>
          </div>

          <!-- 2-Column Overview Tables -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
            <div class="seo-card" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 14px; font-weight: 700; margin: 0;">Top Organic Search Queries</h3>
                <span class="seo-provenance-tag">Google Search Console</span>
              </div>
              <div id="overviewQueriesTableWrap">
                <div class="seo-unconnected-card" style="padding: 20px;">
                  <span style="font-size: 12px; color: #64748b;">Enter domain above or connect Search Console to view verified query rankings.</span>
                </div>
              </div>
            </div>

            <div class="seo-card" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 14px; font-weight: 700; margin: 0;">Recent Crawl Audits</h3>
                <span class="seo-provenance-tag">WebDev Crawler</span>
              </div>
              <div id="overviewAuditsTableWrap">
                <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading crawl history...</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pane 2: Site Audit Crawler (Existing BFS Engine & Issue Inspector) -->
        <div class="seo-suite-pane" id="paneSeoAudit" style="display: none;">
        <!-- Configuration Card -->
        <div class="seo-card seo-config-card" id="seoConfigCard">
          <div class="seo-target-row">
            <div class="seo-url-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <input type="url" id="seoTargetUrl" class="seo-input" placeholder="https://example.com" spellcheck="false" autocomplete="off" />
            </div>
            <button class="seo-btn seo-btn-primary" id="btnRunSeoAudit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Run SEO Audit</span>
            </button>
          </div>

          <div class="seo-scope-row">
            <span class="seo-scope-label">Crawl Scope:</span>
            <div class="seo-scope-options" id="seoScopeOptions">
              <button type="button" class="seo-scope-btn active" data-scope="domain">Domain Crawl</button>
              <button type="button" class="seo-scope-btn" data-scope="single_page">Single Page</button>
              <button type="button" class="seo-scope-btn" data-scope="sitemap">XML Sitemap</button>
            </div>
            <button type="button" class="seo-advanced-toggle" id="btnToggleAdvanced">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
              <span>Advanced Crawl Settings</span>
            </button>
          </div>

          <!-- Collapsible Advanced Settings -->
          <div class="seo-advanced-panel" id="seoAdvancedPanel" style="display: none;">
            <div class="seo-setting-item">
              <label class="seo-checkbox-label">
                <input type="checkbox" id="optPlaywrightJs" />
                <span><strong>Execute Headless JS</strong> (Playwright)</span>
              </label>
              <p class="seo-setting-desc">Renders pages with headless Chromium to detect SSR vs CSR differences and client-rendered links.</p>
            </div>

            <div class="seo-setting-item">
              <label class="seo-checkbox-label">
                <input type="checkbox" id="optRobotsCompliance" checked />
                <span><strong>Honor robots.txt</strong></span>
              </label>
              <p class="seo-setting-desc">Respect disallow rules found in robots.txt.</p>
            </div>

            <div class="seo-setting-item">
              <label class="seo-setting-label">Crawl Limit (Pages)</label>
              <select id="optCrawlLimit" class="seo-select">
                <option value="10">10 pages (Quick test)</option>
                <option value="25" selected>25 pages (Default)</option>
                <option value="50">50 pages (Standard)</option>
                <option value="100">100 pages (Deep audit)</option>
                <option value="250">250 pages (Large site)</option>
                <option value="500">500 pages (Enterprise)</option>
                <option value="1000">1000 pages (Massive)</option>
                <option value="1500">Entire Site (up to 1,500 pages)</option>
              </select>
            </div>

            <div class="seo-setting-item">
              <label class="seo-checkbox-label">
                <input type="checkbox" id="optAllowSubdomains" />
                <span><strong>Include Subdomains</strong></span>
              </label>
              <p class="seo-setting-desc">Discover and crawl internal subdomains (e.g. blog., shop.).</p>
            </div>

            <div class="seo-setting-item">
              <label class="seo-checkbox-label">
                <input type="checkbox" id="optIgnoreQueryParams" checked />
                <span><strong>Strip Query Parameters</strong></span>
              </label>
              <p class="seo-setting-desc">Ignore tracking params (?ref=, ?utm=) to prevent duplicate crawling.</p>
            </div>

            <div class="seo-setting-item">
              <label class="seo-setting-label">User-Agent</label>
              <select id="optUserAgent" class="seo-select">
                <option value="WebDevBot/1.0">WebDevBot (Standard Crawler)</option>
                <option value="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)">Googlebot Smartphone</option>
                <option value="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)">Googlebot Desktop</option>
                <option value="Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)">Bingbot</option>
              </select>
            </div>

            <div class="seo-setting-item">
              <label class="seo-setting-label">Concurrency</label>
              <select id="optConcurrency" class="seo-select">
                <option value="1">1 Request (Gentle)</option>
                <option value="2" selected>2 Concurrent (Balanced)</option>
                <option value="4">4 Concurrent (Fast)</option>
              </select>
            </div>

            <div class="seo-setting-item">
              <label class="seo-setting-label">Crawl Delay (ms)</label>
              <select id="optDelay" class="seo-select">
                <option value="0">0 ms (Fast)</option>
                <option value="250" selected>250 ms</option>
                <option value="500">500 ms</option>
                <option value="1000">1000 ms</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Live Progress Card -->
        <div class="seo-card seo-progress-card" id="seoProgressCard" style="display: none;">
          <div class="seo-progress-header">
            <div class="seo-progress-status-badge">
              <div class="seo-spinner"></div>
              <span id="seoProgressStatusText">Crawling target site...</span>
            </div>
            <button class="seo-btn seo-btn-danger seo-btn-sm" id="btnCancelAudit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Cancel Crawl
            </button>
          </div>
          <div class="seo-progress-bar-wrap">
            <div class="seo-progress-bar-fill" id="seoProgressBarFill"></div>
          </div>
          <div class="seo-progress-current-url" id="seoProgressCurrentUrl">Initializing crawler...</div>
          <div class="seo-progress-stats">
            <div>Pages Crawled: <strong id="progCrawledCount">0</strong> / <strong id="progDiscoveredCount">0</strong> discovered</div>
            <div>Errors Found: <strong id="progErrorCount" style="color:#dc2626;">0</strong></div>
            <div>Warnings: <strong id="progWarnCount" style="color:#d97706;">0</strong></div>
            <div>Elapsed: <strong id="progElapsedTime">0s</strong></div>
          </div>
        </div>

        <!-- Results Dashboard Container -->
        <div id="seoResultsDashboard" style="display: none; flex-direction: column; gap: 20px;">
          <!-- Crawl Coverage & Audit Status Card -->
          <div class="seo-card seo-coverage-card" id="seoCoverageCard" style="display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span id="coverageBadge" class="seo-badge" style="font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; background: #e0f2fe; color: #0369a1;">FULL SITE CRAWL</span>
                <span id="coverageSummaryText" style="font-size: 13px; color: #475569; font-weight: 500;">Discovered and analyzed internal pages across the target domain.</span>
              </div>
              <div id="crawlSeedUrlDisplay" style="font-family: ui-monospace, monospace; font-size: 12px; color: #64748b;"></div>
            </div>

            <!-- Root failure alert if applicable -->
            <div id="rootFailureAlert" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #991b1b;">
              <strong>⚠️ Audit Incomplete / Blocked:</strong> <span id="rootFailureReasonText">Target root returned an error. Internal links could not be discovered.</span>
            </div>

            <!-- Detailed Coverage Metrics Chips -->
            <div class="seo-metric-chips" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;">
              <div class="seo-chip" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covDiscovered" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Discovered</span>
              </div>
              <div class="seo-chip" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covCrawled" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Crawled</span>
              </div>
              <div class="seo-chip chip-warning" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covBlocked" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Blocked (Robots)</span>
              </div>
              <div class="seo-chip chip-error" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covFailed" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Failed (4xx/5xx)</span>
              </div>
              <div class="seo-chip" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covRedirected" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Redirects (3xx)</span>
              </div>
              <div class="seo-chip" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covExternal" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">External Links</span>
              </div>
              <div class="seo-chip" style="padding: 6px 10px;">
                <span class="seo-chip-val" id="covSitemaps" style="font-size: 16px;">0</span>
                <span class="seo-chip-label" style="font-size: 10px;">Sitemap URLs</span>
              </div>
            </div>
          </div>

          <!-- Executive SEO Health Card -->
          <div class="seo-card seo-health-card">
            <div class="seo-score-gauge-wrap">
              <div class="seo-score-circle">
                <svg viewBox="0 0 100 100">
                  <circle class="seo-score-bg" cx="50" cy="50" r="42" />
                  <circle class="seo-score-progress" id="scoreCircleProgress" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="264" />
                </svg>
                <div class="seo-score-number-wrap">
                  <span class="seo-score-val" id="healthScoreVal">--</span>
                  <span class="seo-score-max">/ 100</span>
                </div>
              </div>
              <div class="seo-score-title">WebDev SEO Health</div>
            </div>

            <div class="seo-health-breakdown">
              <div class="seo-metric-chips">
                <div class="seo-chip">
                  <span class="seo-chip-val" id="chipPagesCount">0</span>
                  <span class="seo-chip-label">Pages Crawled</span>
                </div>
                <div class="seo-chip chip-error">
                  <span class="seo-chip-val" id="chipErrorsCount">0</span>
                  <span class="seo-chip-label">Errors</span>
                </div>
                <div class="seo-chip chip-warning">
                  <span class="seo-chip-val" id="chipWarningsCount">0</span>
                  <span class="seo-chip-label">Warnings</span>
                </div>
                <div class="seo-chip chip-notice">
                  <span class="seo-chip-val" id="chipNoticesCount">0</span>
                  <span class="seo-chip-label">Notices</span>
                </div>
                <div class="seo-chip">
                  <span class="seo-chip-val" id="chipAvgResponseTime">0ms</span>
                  <span class="seo-chip-label">Avg Speed</span>
                </div>
              </div>

              <!-- Category Score Breakdown Bars -->
              <div class="seo-category-bars-grid" id="categoryBarsGrid">
                <!-- Generated dynamically -->
              </div>
            </div>
          </div>

          <!-- Tabs Bar & Actions -->
          <div class="seo-tab-bar">
            <div class="seo-tabs-list">
              <button class="seo-tab-btn active" data-tab="issues">
                <span>Issues</span>
                <span class="seo-tab-count" id="tabIssuesCount">0</span>
              </button>
              <button class="seo-tab-btn" data-tab="pages">
                <span>Crawled Pages</span>
                <span class="seo-tab-count" id="tabPagesCount">0</span>
              </button>
              <button class="seo-tab-btn" data-tab="structure">
                <span>Site Structure</span>
              </button>
              <button class="seo-tab-btn" data-tab="technical">
                <span>Robots & AI Bots</span>
              </button>
            </div>

            <div class="seo-tab-actions">
              <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnExportPdf">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                PDF Report
              </button>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnExportCsv">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                CSV
              </button>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnExportJson">
                JSON
              </button>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCompareAudit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                Compare
              </button>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnSaveToProject">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save to Project
              </button>
            </div>
          </div>

          <!-- Tab Content Panes -->
          <!-- Tab 1: Issues View -->
          <div id="paneIssues" class="seo-tab-pane">
            <div class="seo-filter-row" style="margin-bottom: 14px;">
              <div class="seo-filter-group">
                <button class="seo-filter-pill active" data-filter-severity="all">All Severities</button>
                <button class="seo-filter-pill pill-error" data-filter-severity="ERROR">Errors</button>
                <button class="seo-filter-pill pill-warning" data-filter-severity="WARNING">Warnings</button>
                <button class="seo-filter-pill pill-notice" data-filter-severity="NOTICE">Notices</button>
                <select id="selectIssueCategory" class="seo-select" style="margin-left: 8px;">
                  <option value="all">All Categories</option>
                  <option value="crawlability">Crawlability & Indexing</option>
                  <option value="onpage">On-Page Content & Titles</option>
                  <option value="technical">Technical & Security</option>
                  <option value="links">Links & Architecture</option>
                  <option value="images">Images & Media</option>
                  <option value="structured_data">Structured Data (JSON-LD)</option>
                  <option value="mobile">Mobile & Viewport</option>
                  <option value="ai_search">AI / GEO Search Readiness</option>
                </select>
              </div>
              <div style="width: 260px;">
                <input type="text" id="inputIssueSearch" class="seo-input" style="height: 32px; font-size: 12px;" placeholder="Search issues..." />
              </div>
            </div>

            <div class="seo-table-wrap">
              <table class="seo-table" id="issuesTable">
                <thead>
                  <tr>
                    <th style="width: 100px;">Severity</th>
                    <th style="width: 130px;">Category</th>
                    <th>Issue & Description</th>
                    <th style="width: 110px; text-align: center;">Affected URLs</th>
                    <th style="width: 80px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody id="issuesTableBody">
                  <!-- Generated dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 2: Crawled Pages View -->
          <div id="panePages" class="seo-tab-pane" style="display: none;">
            <div class="seo-filter-row" style="margin-bottom: 14px;">
              <div class="seo-filter-group">
                <button class="seo-filter-pill active" data-filter-status="all">All Pages</button>
                <button class="seo-filter-pill" data-filter-status="2xx">2xx OK</button>
                <button class="seo-filter-pill" data-filter-status="3xx">3xx Redirects</button>
                <button class="seo-filter-pill" data-filter-status="4xx">4xx Client Errors</button>
                <button class="seo-filter-pill" data-filter-status="5xx">5xx Server Errors</button>
              </div>
              <div style="width: 300px;">
                <input type="text" id="inputPageSearch" class="seo-input" style="height: 32px; font-size: 12px;" placeholder="Search URLs or page titles..." />
              </div>
            </div>

            <div class="seo-table-wrap">
              <table class="seo-table" id="pagesTable">
                <thead>
                  <tr>
                    <th style="width: 70px;">Status</th>
                    <th>Page URL & Title</th>
                    <th style="width: 90px; text-align: right;">Words</th>
                    <th style="width: 90px; text-align: right;">Inlinks</th>
                    <th style="width: 90px; text-align: right;">Speed</th>
                    <th style="width: 90px; text-align: center;">Issues</th>
                    <th style="width: 80px; text-align: right;">Inspect</th>
                  </tr>
                </thead>
                <tbody id="pagesTableBody">
                  <!-- Generated dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 3: Site Structure & Architecture View -->
          <div id="paneStructure" class="seo-tab-pane" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <!-- Crawl Depth Distribution -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #0f172a;">Crawl Depth Distribution</h3>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px;">Visualizes how many clicks away from the homepage each discovered page is located.</p>
                <div id="depthDistributionGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
                  <!-- Dynamically rendered -->
                </div>
              </div>

              <!-- Inlink Flow & Orphan Pages Analysis -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #0f172a;">Internal Inlinks & Orphan Page Detection</h3>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 14px;">Pages with 0 internal inlinks (orphan pages) cannot be found by regular crawlers following links.</p>
                <div id="orphanPagesWrap">
                  <!-- Dynamically rendered -->
                </div>
              </div>

              <!-- Directory Structure Tree -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #0f172a;">Directory Hierarchy Tree</h3>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 14px;">Visual tree of URL folders discovered during crawl.</p>
                <div id="directoryTreeWrap" style="font-family: ui-monospace, monospace; font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; max-height: 380px; overflow-y: auto;">
                  <!-- Dynamically rendered -->
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 4: Technical & AI Bots View -->
          <div id="paneTechnical" class="seo-tab-pane" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <!-- Robots.txt summary -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #0f172a;">Robots.txt Analysis</h3>
                <div id="robotsSummaryWrap" style="font-size: 13px; color: #334155; line-height: 1.6;">
                  <!-- Dynamically filled -->
                </div>
              </div>

              <!-- AI Bots Matrix -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #0f172a;">AI & Generative Search Bots Matrix</h3>
                <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px;">Verified permissions for leading AI search engines and crawler agents based on robots.txt rules.</p>
                <div class="seo-ai-bots-grid" id="aiBotsGrid">
                  <!-- Dynamically filled -->
                </div>
              </div>

              <!-- Discovered XML Sitemaps -->
              <div class="seo-card">
                <h3 style="font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #0f172a;">Discovered XML Sitemaps</h3>
                <div id="sitemapsListWrap" style="font-size: 13px; color: #334155;">
                  <!-- Dynamically filled -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Initial Empty State -->
        <div class="seo-empty-state" id="seoInitialState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <path d="M11 8v6"></path>
            <path d="M8 11h6"></path>
          </svg>
          <h2 class="seo-empty-title">Ready to run a Technical SEO Audit</h2>
          <p class="seo-empty-desc">Enter any website URL above to initiate an automated crawl, audit meta tags, canonicals, schema markup, headings, and AI search crawler directives.</p>
        </div>
        </div>
        <!-- End Pane 2: Site Audit -->

        <!-- Pane 3: Competitive Research -->
        <div class="seo-suite-pane" id="paneSeoCompetitors" style="display: none;">
          <div class="seo-card">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">Compare Two Domains</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">Evaluate real domain authority, mobile/desktop speed scores, crawl health, and keyword coverage side-by-side.</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center;">
              <input type="text" id="compTargetDomain" class="seo-input" placeholder="Your domain (e.g. example.com)" />
              <input type="text" id="compCompetitorDomain" class="seo-input" placeholder="Competitor domain (e.g. competitor.com)" />
              <button class="seo-btn seo-btn-primary" id="btnRunCompCompare">Compare Domains</button>
            </div>
          </div>
          <div id="compResultsWrap" style="display: none;"></div>
        </div>

        <!-- Pane 4: Organic & Keywords -->
        <div class="seo-suite-pane" id="paneSeoKeywords" style="display: none;">
          <!-- GSC Controls Bar -->
          <div class="seo-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px;">
                <label style="font-size: 13px; font-weight: 600; color: #475569;">Property:</label>
                <select id="gscPropertySelect" class="seo-select" style="max-width: 220px;">
                  <option value="">Auto (Default Property)</option>
                </select>
                <label style="font-size: 13px; font-weight: 600; color: #475569;">Date Range:</label>
                <select id="gscDateRangeSelect" class="seo-select">
                  <option value="7d">Last 7 Days</option>
                  <option value="28d" selected>Last 28 Days</option>
                  <option value="3m">Last 3 Months</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="12m">Last 12 Months</option>
                </select>
                <label style="font-size: 13px; font-weight: 600; color: #475569;">Dimension:</label>
                <select id="gscDimensionSelect" class="seo-select">
                  <option value="query" selected>Top Queries</option>
                  <option value="page">Top Pages</option>
                  <option value="country">Countries</option>
                  <option value="device">Devices</option>
                </select>
                <input type="text" id="gscQueryFilterInput" class="seo-input" placeholder="Filter queries or pages..." style="width: 180px; height: 32px; font-size: 13px;" />
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnRefreshGsc">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Real Stat Chips -->
          <div class="seo-metric-chips" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
            <div class="seo-chip">
              <span class="seo-chip-val" id="kwClicksChip">--</span>
              <span class="seo-chip-label">Total Clicks</span>
            </div>
            <div class="seo-chip">
              <span class="seo-chip-val" id="kwImprChip">--</span>
              <span class="seo-chip-label">Total Impressions</span>
            </div>
            <div class="seo-chip">
              <span class="seo-chip-val" id="kwCtrChip">--</span>
              <span class="seo-chip-label">Average CTR</span>
            </div>
            <div class="seo-chip">
              <span class="seo-chip-val" id="kwPosChip">--</span>
              <span class="seo-chip-label">Average Position</span>
            </div>
          </div>

          <!-- Queries Table Wrap -->
          <div class="seo-card" id="keywordsTableWrap">
            <!-- Filled dynamically -->
          </div>

          <!-- Enterprise Placeholder Card -->
          <div class="seo-card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 14px; color: #475569;">Enterprise Keyword Databases (Semrush / DataForSEO)</h4>
              <span class="seo-cap-badge cap-coming-soon">Coming Soon</span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Global keyword monthly search volume databases, keyword difficulty metrics, and live SERP scrapes are scaffolded and ready for future enterprise API integration without system redesign.</p>
          </div>
        </div>

        <!-- Pane 5: PageSpeed & Core Web Vitals -->
        <div class="seo-suite-pane" id="paneSeoPerformance" style="display: none;">
          <div class="seo-card">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">Google PageSpeed Insights &amp; Real-User CrUX Data</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">Run real Lighthouse performance audits and inspect Chrome User Experience Report (CrUX) field data.</p>
            <div style="display: grid; grid-template-columns: 1fr 180px auto; gap: 12px; align-items: center;">
              <input type="url" id="psTargetUrl" class="seo-input" placeholder="https://example.com" />
              <select id="psStrategySelect" class="seo-select">
                <option value="mobile" selected>Mobile Strategy</option>
                <option value="desktop">Desktop Strategy</option>
              </select>
              <button class="seo-btn seo-btn-primary" id="btnRunPageSpeedTest">Run PageSpeed Test</button>
            </div>
          </div>
          <div id="psResultsWrap" style="display: none;"></div>
        </div>

        <!-- Pane 6: Link Intelligence -->
        <div class="seo-suite-pane" id="paneSeoLinks" style="display: none;">
          <div class="seo-card">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">Ahrefs Domain Rating Lookup</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">Check official Domain Rating powered directly by the Ahrefs Free Public API. Strictly labeled as <em>Domain Rating by Ahrefs</em>.</p>
            <div style="display: flex; gap: 12px; max-width: 540px;">
              <input type="text" id="ahrefsDomainInput" class="seo-input" placeholder="example.com" style="flex: 1;" />
              <button class="seo-btn seo-btn-primary" id="btnLookupAhrefsDr">Lookup Domain Rating</button>
            </div>
          </div>
          <div id="ahrefsResultWrap" style="display: none;"></div>

          <div class="seo-card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 14px; color: #475569;">Backlink Index &amp; Referring Domains Explorer</h4>
              <span class="seo-cap-badge cap-coming-soon">Coming Soon</span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Full backlink graphs, anchor text distribution, and referring IP analysis require enterprise backlink provider subscriptions (Ahrefs Enterprise / Semrush). Provider interface is pre-scaffolded.</p>
          </div>
        </div>

        <!-- Pane 7: Log File Analyzer -->
        <div class="seo-suite-pane" id="paneSeoLogs" style="display: none;">
          <div class="seo-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700;">Server Access Log Analyzer</h3>
                <p style="font-size: 13px; color: #64748b; margin: 0;">Upload Apache or Nginx access logs (Common or Combined format) to analyze real search bot crawl behavior and detect crawl budget waste.</p>
              </div>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnLoadSampleLog">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                <span>Try Sample Access Log</span>
              </button>
            </div>

            <div class="seo-log-dropzone" id="seoLogDropzone">
              <div class="seo-log-dropzone-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <strong style="font-size: 14px; color: #0f172a;">Drag and drop your server access log here, or click to browse</strong>
              <span style="font-size: 12px; color: #64748b;">Supports .log and .txt files. Logs are parsed on the fly.</span>
              <input type="file" id="seoLogFileInput" accept=".log,.txt" style="display: none;" />
            </div>
          </div>

          <div id="logResultsWrap" style="display: none;"></div>
        </div>

        <!-- Pane 8: Export Center -->
        <div class="seo-suite-pane" id="paneSeoReports" style="display: none;">
          <div class="seo-card">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700;">Export Intelligence Reports</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 20px 0;">Generate client-ready deliverables with full data provenance and zero mock values.</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <strong style="font-size: 14px;">Executive PDF Report</strong>
                </div>
                <span style="font-size: 12px; color: #64748b;">High-resolution vector PDF with executive health gauges, issues breakdown, and AI crawler status.</span>
                <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnExportPdfSuite" style="margin-top: auto;">Download PDF</button>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <strong style="font-size: 14px;">Technical Issues CSV</strong>
                </div>
                <span style="font-size: 12px; color: #64748b;">Raw spreadsheet containing every detected issue, severity, penalty weight, and remediation hint.</span>
                <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnExportCsvSuite" style="margin-top: auto;">Download CSV</button>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <strong style="font-size: 14px;">Complete Audit JSON</strong>
                </div>
                <span style="font-size: 12px; color: #64748b;">Structured JSON export suitable for automated CI/CD pipelines and developer tooling.</span>
                <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnExportJsonSuite" style="margin-top: auto;">Download JSON</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Drawer Backdrop -->
        <div class="seo-drawer-backdrop" id="seoDrawerBackdrop"></div>

        <!-- Side Drawer -->
        <div class="seo-drawer" id="seoSideDrawer">
          <div class="seo-drawer-header">
            <div class="seo-drawer-title-wrap">
              <h2 class="seo-drawer-title" id="drawerTitle">Details</h2>
              <span id="drawerSubtitle" style="font-size: 12px; color: #64748b;">Inspection</span>
            </div>
            <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCloseDrawer">&times;</button>
          </div>
          <div class="seo-drawer-body" id="drawerBody">
            <!-- Dynamic drawer content -->
          </div>
        </div>

        <!-- Compare Modal -->
        <div class="seo-modal-backdrop" id="seoCompareModal">
          <div class="seo-modal">
            <div class="seo-modal-header">
              <h3 style="font-size: 15px; font-weight: 700; margin: 0;">Compare SEO Audits</h3>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCloseCompareModal">&times;</button>
            </div>
            <div class="seo-modal-body">
              <p style="font-size: 13px; color: #64748b; margin: 0;">Select another audit for this domain to view score differences, newly introduced issues, and fixed warnings.</p>
              <select id="selectCompareAudit" class="seo-select" style="width: 100%; height: 38px;">
                <option value="">Loading previous audits...</option>
              </select>
              <div id="compareResultsWrap" style="display: none; flex-direction: column; gap: 12px; font-size: 13px;">
                <!-- Diff stats -->
              </div>
            </div>
            <div class="seo-modal-footer">
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCancelCompare">Cancel</button>
              <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnExecuteCompare">Compare</button>
            </div>
          </div>
        </div>

        <!-- Save to Project Modal -->
        <div class="seo-modal-backdrop" id="seoProjectModal">
          <div class="seo-modal">
            <div class="seo-modal-header">
              <h3 style="font-size: 15px; font-weight: 700; margin: 0;">Save Audit to Project</h3>
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCloseProjectModal">&times;</button>
            </div>
            <div class="seo-modal-body">
              <p style="font-size: 13px; color: #64748b; margin: 0;">Link this SEO Audit report to one of your existing user projects:</p>
              <select id="selectSaveProject" class="seo-select" style="width: 100%; height: 38px;">
                <option value="">Select a project...</option>
              </select>
            </div>
            <div class="seo-modal-footer">
              <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnCancelSaveProject">Cancel</button>
              <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnConfirmSaveProject">Save</button>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      // Crawl Scope selector buttons
      const scopeButtons = this.container.querySelectorAll('#seoScopeOptions .seo-scope-btn');
      scopeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          scopeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedScope = btn.getAttribute('data-scope');
        });
      });

      // Advanced settings toggle
      const btnToggleAdvanced = this.container.querySelector('#btnToggleAdvanced');
      const advancedPanel = this.container.querySelector('#seoAdvancedPanel');
      if (btnToggleAdvanced && advancedPanel) {
        btnToggleAdvanced.addEventListener('click', () => {
          const isHidden = advancedPanel.style.display === 'none';
          advancedPanel.style.display = isHidden ? 'grid' : 'none';
          btnToggleAdvanced.querySelector('svg').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
      }

      // Run Audit button
      const btnRun = this.container.querySelector('#btnRunSeoAudit');
      if (btnRun) {
        btnRun.addEventListener('click', () => this.startAudit());
      }

      // Enter key on URL input
      const targetInput = this.container.querySelector('#seoTargetUrl');
      if (targetInput) {
        targetInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.startAudit();
          }
        });
      }

      // Cancel button
      const btnCancel = this.container.querySelector('#btnCancelAudit');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => this.cancelCurrentAudit());
      }

      // New audit button
      const btnNew = this.container.querySelector('#btnNewAudit');
      if (btnNew) {
        btnNew.addEventListener('click', () => this.resetView());
      }

      // History button
      const btnHistory = this.container.querySelector('#btnSeoHistoryModal');
      if (btnHistory) {
        btnHistory.addEventListener('click', () => {
          if (window.HistoryView && window.HistoryView.open) {
            window.HistoryView.open('seo');
          } else {
            this.showToast('Select an audit from previous tests');
          }
        });
      }

      // Tabs
      const tabBtns = this.container.querySelectorAll('.seo-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTab = btn.getAttribute('data-tab');
          this.renderActiveTab();
        });
      });

      // Issue filter pills
      const issuePills = this.container.querySelectorAll('[data-filter-severity]');
      issuePills.forEach(pill => {
        pill.addEventListener('click', () => {
          issuePills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.selectedSeverity = pill.getAttribute('data-filter-severity');
          this.renderIssuesTable();
        });
      });

      // Issue category dropdown
      const selIssueCat = this.container.querySelector('#selectIssueCategory');
      if (selIssueCat) {
        selIssueCat.addEventListener('change', (e) => {
          this.selectedCategory = e.target.value;
          this.renderIssuesTable();
        });
      }

      // Issue search input
      const inputIssueSearch = this.container.querySelector('#inputIssueSearch');
      if (inputIssueSearch) {
        inputIssueSearch.addEventListener('input', (e) => {
          this.issueSearch = e.target.value.toLowerCase().trim();
          this.renderIssuesTable();
        });
      }

      // Page filter pills
      const pagePills = this.container.querySelectorAll('[data-filter-status]');
      pagePills.forEach(pill => {
        pill.addEventListener('click', () => {
          pagePills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.pageStatusFilter = pill.getAttribute('data-filter-status');
          this.renderPagesTable();
        });
      });

      // Page search input
      const inputPageSearch = this.container.querySelector('#inputPageSearch');
      if (inputPageSearch) {
        inputPageSearch.addEventListener('input', (e) => {
          this.pageSearch = e.target.value.toLowerCase().trim();
          this.renderPagesTable();
        });
      }

      // Export buttons
      const btnExportPdf = this.container.querySelector('#btnExportPdf');
      if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => this.downloadExport('report.pdf'));
      }

      const btnExportCsv = this.container.querySelector('#btnExportCsv');
      if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => this.downloadExport('export.csv'));
      }

      const btnExportJson = this.container.querySelector('#btnExportJson');
      if (btnExportJson) {
        btnExportJson.addEventListener('click', () => this.downloadExport('export.json'));
      }

      // Compare Modal
      const btnCompare = this.container.querySelector('#btnCompareAudit');
      const compareModal = this.container.querySelector('#seoCompareModal');
      const btnCloseCompare = this.container.querySelector('#btnCloseCompareModal');
      const btnCancelCompare = this.container.querySelector('#btnCancelCompare');
      const btnExecuteCompare = this.container.querySelector('#btnExecuteCompare');

      if (btnCompare && compareModal) {
        btnCompare.addEventListener('click', () => this.openCompareModal());
      }
      if (btnCloseCompare) {
        btnCloseCompare.addEventListener('click', () => compareModal.classList.remove('active'));
      }
      if (btnCancelCompare) {
        btnCancelCompare.addEventListener('click', () => compareModal.classList.remove('active'));
      }
      if (btnExecuteCompare) {
        btnExecuteCompare.addEventListener('click', () => this.runComparison());
      }

      // Save to Project Modal
      const btnSaveProject = this.container.querySelector('#btnSaveToProject');
      const projectModal = this.container.querySelector('#seoProjectModal');
      const btnCloseProject = this.container.querySelector('#btnCloseProjectModal');
      const btnCancelSaveProject = this.container.querySelector('#btnCancelSaveProject');
      const btnConfirmSaveProject = this.container.querySelector('#btnConfirmSaveProject');

      if (btnSaveProject && projectModal) {
        btnSaveProject.addEventListener('click', () => this.openSaveToProjectModal());
      }
      if (btnCloseProject) {
        btnCloseProject.addEventListener('click', () => projectModal.classList.remove('active'));
      }
      if (btnCancelSaveProject) {
        btnCancelSaveProject.addEventListener('click', () => projectModal.classList.remove('active'));
      }
      if (btnConfirmSaveProject) {
        btnConfirmSaveProject.addEventListener('click', () => this.confirmSaveToProject());
      }

      // Drawer Close
      const btnCloseDrawer = this.container.querySelector('#btnCloseDrawer');
      const drawerBackdrop = this.container.querySelector('#seoDrawerBackdrop');
      if (btnCloseDrawer) {
        btnCloseDrawer.addEventListener('click', () => this.closeDrawer());
      }
      if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', () => this.closeDrawer());
      }
    }

    async loadUrl(url) {
      const input = this.container.querySelector('#seoTargetUrl');
      if (input) input.value = url;
    }

    async loadAudit(auditId) {
      try {
        const res = await fetch(`/api/seo-audits/${auditId}`);
        if (!res.ok) throw new Error('Audit not found');
        const data = await res.json();
        this.currentAudit = data.audit;
        this.pages = data.pages || [];
        this.issues = data.issues || [];
        this.renderResults();
      } catch (err) {
        this.showToast(`Error loading audit: ${err.message}`, 'error');
      }
    }

    async loadRecentAudits() {
      try {
        const res = await fetch('/api/seo-audits?limit=5');
        if (res.ok) {
          const data = await res.json();
          this.recentAudits = data.items || [];
        }
      } catch (e) {
        // silent
      }
    }

    async startAudit() {
      const input = this.container.querySelector('#seoTargetUrl');
      let url = input ? input.value.trim() : '';
      if (!url) {
        this.showToast('Please enter a target URL', 'warning');
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
        input.value = url;
      }

      const crawlLimit = parseInt(this.container.querySelector('#optCrawlLimit')?.value || '25', 10);
      const allowSubdomains = this.container.querySelector('#optAllowSubdomains')?.checked || false;
      const ignoreQueryParams = this.container.querySelector('#optIgnoreQueryParams')?.checked !== false;
      const executeJs = this.container.querySelector('#optPlaywrightJs')?.checked || false;
      const honorRobots = this.container.querySelector('#optRobotsCompliance')?.checked !== false;
      const userAgent = this.container.querySelector('#optUserAgent')?.value || 'WebDevBot/1.0';
      const concurrency = parseInt(this.container.querySelector('#optConcurrency')?.value || '2', 10);
      const delayMs = parseInt(this.container.querySelector('#optDelay')?.value || '250', 10);

      const payload = {
        target_url: url,
        crawl_scope: this.selectedScope,
        max_pages: crawlLimit,
        crawl_limit: crawlLimit,
        allow_subdomains: allowSubdomains,
        include_subdomains: allowSubdomains,
        ignore_query_params: ignoreQueryParams,
        execute_js: executeJs,
        honor_robots: honorRobots,
        user_agent: userAgent,
        concurrency,
        delay_ms: delayMs
      };

      const btnRun = this.container.querySelector('#btnRunSeoAudit');
      if (btnRun) {
        btnRun.disabled = true;
        btnRun.querySelector('span').textContent = 'Starting...';
      }

      try {
        const res = await fetch('/api/seo-audits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to start audit');
        }

        this.currentAudit = data;
        this.showProgress();
        this.startPolling(data.id);
      } catch (err) {
        this.showToast(err.message, 'error');
        if (btnRun) {
          btnRun.disabled = false;
          btnRun.querySelector('span').textContent = 'Run SEO Audit';
        }
      }
    }

    showProgress() {
      const initCard = this.container.querySelector('#seoInitialState');
      if (initCard) initCard.style.display = 'none';

      const results = this.container.querySelector('#seoResultsDashboard');
      if (results) results.style.display = 'none';

      const progCard = this.container.querySelector('#seoProgressCard');
      if (progCard) progCard.style.display = 'flex';

      this.auditStartTime = Date.now();
      this.updateProgressUI(this.currentAudit);
    }

    startPolling(auditId) {
      if (this.pollInterval) clearInterval(this.pollInterval);

      this.pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/seo-audits/${auditId}`);
          if (!res.ok) return;

          const data = await res.json();
          this.currentAudit = data.audit;
          this.pages = data.pages || [];
          this.issues = data.issues || [];

          this.updateProgressUI(this.currentAudit);

          if (this.currentAudit.status === 'completed' || this.currentAudit.status === 'failed' || this.currentAudit.status === 'cancelled') {
            clearInterval(this.pollInterval);
            this.pollInterval = null;

            const btnRun = this.container.querySelector('#btnRunSeoAudit');
            if (btnRun) {
              btnRun.disabled = false;
              btnRun.querySelector('span').textContent = 'Run SEO Audit';
            }

            const progCard = this.container.querySelector('#seoProgressCard');
            if (progCard) progCard.style.display = 'none';

            if (this.currentAudit.status === 'completed') {
              this.renderResults();
              this.showToast('SEO Audit completed successfully!');
            } else if (this.currentAudit.status === 'cancelled') {
              this.showToast('Crawl was cancelled.', 'warning');
            } else {
              this.showToast(this.currentAudit.error_message || 'Audit encountered errors.', 'error');
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 1200);
    }

    updateProgressUI(audit) {
      if (!audit) return;
      const statusText = this.container.querySelector('#seoProgressStatusText');
      const barFill = this.container.querySelector('#seoProgressBarFill');
      const currentUrl = this.container.querySelector('#seoProgressCurrentUrl');
      const crawledCount = this.container.querySelector('#progCrawledCount');
      const discoveredCount = this.container.querySelector('#progDiscoveredCount');
      const errorCount = this.container.querySelector('#progErrorCount');
      const warnCount = this.container.querySelector('#progWarnCount');
      const elapsedTime = this.container.querySelector('#progElapsedTime');

      if (statusText) statusText.textContent = `Crawling: ${audit.crawled_pages || 0} pages examined...`;
      if (currentUrl) currentUrl.textContent = audit.current_url || audit.target_url || '';
      if (crawledCount) crawledCount.textContent = audit.crawled_pages || 0;
      if (discoveredCount) discoveredCount.textContent = audit.discovered_pages || 0;
      if (errorCount) errorCount.textContent = audit.total_errors || 0;
      if (warnCount) warnCount.textContent = audit.total_warnings || 0;

      const pct = audit.discovered_pages > 0
        ? Math.min(100, Math.round((audit.crawled_pages / audit.discovered_pages) * 100))
        : 10;
      if (barFill) barFill.style.width = `${pct}%`;

      if (elapsedTime && this.auditStartTime) {
        const secs = Math.round((Date.now() - this.auditStartTime) / 1000);
        elapsedTime.textContent = `${secs}s`;
      }
    }

    async cancelCurrentAudit() {
      if (!this.currentAudit || !this.currentAudit.id) return;
      try {
        await fetch(`/api/seo-audits/${this.currentAudit.id}/cancel`, { method: 'POST' });
        this.showToast('Cancelling crawl...', 'info');
      } catch (e) {
        this.showToast('Error cancelling audit', 'error');
      }
    }

    renderResults() {
      const initCard = this.container.querySelector('#seoInitialState');
      if (initCard) initCard.style.display = 'none';

      const progCard = this.container.querySelector('#seoProgressCard');
      if (progCard) progCard.style.display = 'none';

      const results = this.container.querySelector('#seoResultsDashboard');
      if (results) results.style.display = 'flex';

      const audit = this.currentAudit;
      if (!audit) return;

      // Update Crawl Coverage Card
      const coverage = audit.coverage || audit.summary?.coverage || {};
      const covStatus = audit.coverage_status || coverage.status || (audit.crawled_pages >= (audit.config?.max_pages || 25) ? 'CRAWL_LIMIT_REACHED' : 'FULL_SITE_CRAWL');
      
      const badge = this.container.querySelector('#coverageBadge');
      const summaryText = this.container.querySelector('#coverageSummaryText');
      const seedUrlDisplay = this.container.querySelector('#crawlSeedUrlDisplay');
      if (seedUrlDisplay) seedUrlDisplay.textContent = audit.target_url || audit.url || '';

      if (badge && summaryText) {
        if (covStatus === 'FULL_SITE_CRAWL') {
          badge.textContent = 'FULL SITE CRAWL';
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          summaryText.textContent = `Completed comprehensive BFS crawl of entire site (${audit.crawled_pages || this.pages.length} internal pages).`;
        } else if (covStatus === 'CRAWL_LIMIT_REACHED') {
          badge.textContent = 'CRAWL LIMIT REACHED';
          badge.style.background = '#e0f2fe';
          badge.style.color = '#0369a1';
          summaryText.textContent = `Reached configured limit of ${audit.config?.max_pages || audit.crawled_pages} pages. Additional internal links were discovered.`;
        } else if (covStatus === 'BLOCKED_OR_FAILED') {
          badge.textContent = 'AUDIT BLOCKED / FAILED';
          badge.style.background = '#fee2e2';
          badge.style.color = '#b91c1c';
          summaryText.textContent = 'The root URL returned an error or HTTP 403. Crawling could not proceed.';
        } else {
          badge.textContent = 'LIMITED AUDIT';
          badge.style.background = '#fef3c7';
          badge.style.color = '#b45309';
          summaryText.textContent = 'Crawled all accessible pages.';
        }
      }

      // Root Failure Alert
      const rootAlert = this.container.querySelector('#rootFailureAlert');
      const rootReason = this.container.querySelector('#rootFailureReasonText');
      if (rootAlert) {
        if (coverage.rootFailed || covStatus === 'BLOCKED_OR_FAILED') {
          rootAlert.style.display = 'block';
          if (rootReason) {
            rootReason.textContent = coverage.rootFailureReason || `Target URL returned an error or HTTP 403. Affected URL: ${audit.target_url || audit.url}`;
          }
        } else {
          rootAlert.style.display = 'none';
        }
      }

      // Detailed Coverage metrics
      const covDiscovered = this.container.querySelector('#covDiscovered');
      const covCrawled = this.container.querySelector('#covCrawled');
      const covBlocked = this.container.querySelector('#covBlocked');
      const covFailed = this.container.querySelector('#covFailed');
      const covRedirected = this.container.querySelector('#covRedirected');
      const covExternal = this.container.querySelector('#covExternal');
      const covSitemaps = this.container.querySelector('#covSitemaps');

      if (covDiscovered) covDiscovered.textContent = audit.discovered_pages || coverage.pagesDiscovered || (audit.crawled_pages || 0);
      if (covCrawled) covCrawled.textContent = audit.crawled_pages || coverage.pagesCrawled || this.pages.length || 0;
      if (covBlocked) covBlocked.textContent = coverage.pagesBlocked || 0;
      if (covFailed) covFailed.textContent = coverage.pagesFailed || 0;
      if (covRedirected) covRedirected.textContent = coverage.pagesRedirected || 0;
      if (covExternal) covExternal.textContent = coverage.externalLinksCount || 0;
      if (covSitemaps) covSitemaps.textContent = coverage.sitemapUrlsCount || 0;

      // Update Health Score
      const scoreVal = this.container.querySelector('#healthScoreVal');
      const scoreCircle = this.container.querySelector('#scoreCircleProgress');
      const score = Math.round(audit.health_score || 0);

      if (scoreVal) scoreVal.textContent = score;

      // Score color
      let strokeColor = '#10b981'; // Green
      if (score < 70) strokeColor = '#ef4444'; // Red
      else if (score < 90) strokeColor = '#f59e0b'; // Amber

      if (scoreCircle) {
        const circumference = 2 * Math.PI * 42; // ~263.89
        const offset = circumference - (score / 100) * circumference;
        scoreCircle.style.strokeDashoffset = offset;
        scoreCircle.style.stroke = strokeColor;
      }

      // Summary Chips
      const chipPages = this.container.querySelector('#chipPagesCount');
      const chipErrors = this.container.querySelector('#chipErrorsCount');
      const chipWarns = this.container.querySelector('#chipWarningsCount');
      const chipNotices = this.container.querySelector('#chipNoticesCount');
      const chipAvgSpeed = this.container.querySelector('#chipAvgResponseTime');

      if (chipPages) chipPages.textContent = audit.crawled_pages || this.pages.length || 0;
      if (chipErrors) chipErrors.textContent = audit.total_errors || 0;
      if (chipWarns) chipWarns.textContent = audit.total_warnings || 0;
      if (chipNotices) chipNotices.textContent = audit.total_notices || 0;

      // Calculate avg speed
      let avgSpeed = 0;
      if (this.pages.length > 0) {
        const validSpeeds = this.pages.filter(p => p.response_time_ms > 0);
        if (validSpeeds.length > 0) {
          const total = validSpeeds.reduce((acc, p) => acc + p.response_time_ms, 0);
          avgSpeed = Math.round(total / validSpeeds.length);
        }
      }
      if (chipAvgSpeed) chipAvgSpeed.textContent = `${avgSpeed}ms`;

      // Category breakdown bars
      this.renderCategoryBars(audit.category_scores);

      // Update Tab Counts
      const tabIssuesCount = this.container.querySelector('#tabIssuesCount');
      const tabPagesCount = this.container.querySelector('#tabPagesCount');
      if (tabIssuesCount) tabIssuesCount.textContent = this.issues.length;
      if (tabPagesCount) tabPagesCount.textContent = this.pages.length;

      this.renderActiveTab();
    }

    renderCategoryBars(catScores) {
      const grid = this.container.querySelector('#categoryBarsGrid');
      if (!grid) return;

      const labels = {
        crawlability: 'Crawlability',
        onpage: 'On-Page Content',
        technical: 'Technical & Security',
        links: 'Links & Flow',
        images: 'Images & Media',
        structured_data: 'Structured Data',
        mobile: 'Mobile & Layout',
        ai_search: 'AI / GEO Readiness'
      };

      grid.innerHTML = Object.entries(catScores || {}).map(([key, score]) => {
        const title = labels[key] || key;
        let barColor = '#3b82f6';
        if (score >= 90) barColor = '#10b981';
        else if (score < 70) barColor = '#ef4444';
        else if (score < 85) barColor = '#f59e0b';

        return `
          <div class="seo-cat-bar-item">
            <div class="seo-cat-bar-header">
              <span>${this.escapeHtml(title)}</span>
              <strong>${Math.round(score)}%</strong>
            </div>
            <div class="seo-cat-bar-track">
              <div class="seo-cat-bar-fill" style="width: ${Math.round(score)}%; background: ${barColor};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderActiveTab() {
      const paneIssues = this.container.querySelector('#paneIssues');
      const panePages = this.container.querySelector('#panePages');
      const paneStructure = this.container.querySelector('#paneStructure');
      const paneTechnical = this.container.querySelector('#paneTechnical');

      if (paneIssues) paneIssues.style.display = this.activeTab === 'issues' ? 'block' : 'none';
      if (panePages) panePages.style.display = this.activeTab === 'pages' ? 'block' : 'none';
      if (paneStructure) paneStructure.style.display = this.activeTab === 'structure' ? 'block' : 'none';
      if (paneTechnical) paneTechnical.style.display = this.activeTab === 'technical' ? 'block' : 'none';

      if (this.activeTab === 'issues') {
        this.renderIssuesTable();
      } else if (this.activeTab === 'pages') {
        this.renderPagesTable();
      } else if (this.activeTab === 'structure') {
        this.renderStructureTab();
      } else if (this.activeTab === 'technical') {
        this.renderTechnicalTab();
      }
    }

    renderStructureTab() {
      const audit = this.currentAudit;
      if (!audit) return;

      const struct = audit.site_structure || (audit.summary && audit.summary.siteStructure) || {};
      const depths = struct.depths || {};

      // 1. Render Depth Distribution
      const depthGrid = this.container.querySelector('#depthDistributionGrid');
      if (depthGrid) {
        const depthKeys = ['0', '1', '2', '3', '4+'];
        depthGrid.innerHTML = depthKeys.map(k => {
          const count = depths[k] ? depths[k].length : 0;
          return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">
                ${k === '0' ? 'Homepage (Depth 0)' : `Depth ${k}`}
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                ${count}
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                ${count === 1 ? 'page' : 'pages'}
              </div>
            </div>
          `;
        }).join('');
      }

      // 2. Render Inlinks / Orphan Pages
      const orphanWrap = this.container.querySelector('#orphanPagesWrap');
      if (orphanWrap) {
        const orphans = struct.orphanPages || this.pages.filter(p => p.crawl_depth > 0 && (!p.incoming_links_count || p.incoming_links_count === 0));
        if (orphans.length === 0) {
          orphanWrap.innerHTML = `
            <div style="padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; font-size: 13px;">
              ✅ <strong>No Orphan Pages Detected.</strong> All crawled internal pages have at least one incoming internal link.
            </div>
          `;
        } else {
          orphanWrap.innerHTML = `
            <div style="padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; color: #92400e; font-size: 12px; margin-bottom: 12px;">
              ⚠️ Found <strong>${orphans.length} orphan pages</strong> discovered via XML sitemaps or redirects that have 0 incoming internal crawl links.
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
              ${orphans.slice(0, 20).map(u => {
                const urlStr = typeof u === 'string' ? u : (u.url || String(u));
                return `
                  <div style="font-family: ui-monospace, monospace; font-size: 12px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    ${this.escapeHtml(urlStr)}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      }

      // 3. Render Directory Tree
      const treeWrap = this.container.querySelector('#directoryTreeWrap');
      if (treeWrap) {
        const tree = struct.directoryTree || {};
        if (Object.keys(tree).length === 0 && this.pages.length > 0) {
          treeWrap.innerHTML = this.pages.slice(0, 50).map(p => {
            try {
              const u = new URL(p.url);
              return `<div style="padding: 2px 0;">├── ${this.escapeHtml(u.pathname)}</div>`;
            } catch(e) {
              return `<div style="padding: 2px 0;">├── ${this.escapeHtml(p.url)}</div>`;
            }
          }).join('');
        } else {
          let treeHtml = '';
          const renderSubTree = (node, indent = '') => {
            for (const [key, val] of Object.entries(node)) {
              if (key === '__count') continue;
              const count = val.__count || 0;
              treeHtml += `<div style="padding: 2px 0;">${indent}📁 <strong>/${this.escapeHtml(key)}</strong> <span style="color:#64748b; font-size: 11px;">(${count} pages)</span></div>`;
              renderSubTree(val, indent + '&nbsp;&nbsp;&nbsp;&nbsp;');
            }
          };
          renderSubTree(tree);
          treeWrap.innerHTML = treeHtml || '<div>No directory structure detected.</div>';
        }
      }
    }

    renderIssuesTable() {
      const tbody = this.container.querySelector('#issuesTableBody');
      if (!tbody) return;

      let filtered = this.issues.slice();

      // Severity filter
      if (this.selectedSeverity !== 'all') {
        filtered = filtered.filter(i => i.severity === this.selectedSeverity);
      }

      // Category filter
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(i => i.category === this.selectedCategory);
      }

      // Search filter
      if (this.issueSearch) {
        filtered = filtered.filter(i =>
          (i.title && i.title.toLowerCase().includes(this.issueSearch)) ||
          (i.description && i.description.toLowerCase().includes(this.issueSearch))
        );
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">
              No issues match your current filters.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(issue => {
        const sevClass = issue.severity === 'ERROR' ? 'badge-error' : (issue.severity === 'WARNING' ? 'badge-warning' : 'badge-notice');
        const affectedCount = (issue.affected_count !== undefined && issue.affected_count !== null)
          ? issue.affected_count
          : (issue.affected_urls ? issue.affected_urls.length : (issue.affected_url ? 1 : 0));

        return `
          <tr data-issue-id="${this.escapeHtml(issue.id)}">
            <td>
              <span class="seo-badge ${sevClass}">${this.escapeHtml(issue.severity)}</span>
            </td>
            <td>
              <span class="seo-badge badge-neutral">${this.escapeHtml(issue.category)}</span>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">${this.escapeHtml(issue.title)}</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.4;">${this.escapeHtml(issue.description || '')}</div>
            </td>
            <td style="text-align: center;">
              <span style="font-weight: 700; color: #0f172a; font-size: 12px; background: #f1f5f9; padding: 3px 8px; border-radius: 12px;">
                ${affectedCount}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="seo-btn seo-btn-secondary seo-btn-sm js-view-issue" data-id="${this.escapeHtml(issue.id)}">View</button>
            </td>
          </tr>
        `;
      }).join('');

      // Click event for rows
      tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const issueId = row.getAttribute('data-issue-id');
          this.openIssueDrawer(issueId);
        });
      });

      tbody.querySelectorAll('.js-view-issue').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const issueId = btn.getAttribute('data-id');
          this.openIssueDrawer(issueId);
        });
      });
    }

    renderPagesTable() {
      const tbody = this.container.querySelector('#pagesTableBody');
      if (!tbody) return;

      let filtered = this.pages.slice();

      // Status filter
      if (this.pageStatusFilter !== 'all') {
        const prefix = this.pageStatusFilter.charAt(0);
        filtered = filtered.filter(p => p.status_code && p.status_code.toString().startsWith(prefix));
      }

      // Search filter
      if (this.pageSearch) {
        filtered = filtered.filter(p =>
          (p.url && p.url.toLowerCase().includes(this.pageSearch)) ||
          (p.title && p.title.toLowerCase().includes(this.pageSearch))
        );
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
              No crawled pages match your filters.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(page => {
        const code = page.status_code || 0;
        let statusClass = 'status-2xx';
        if (code >= 300 && code < 400) statusClass = 'status-3xx';
        else if (code >= 400 && code < 500) statusClass = 'status-4xx';
        else if (code >= 500) statusClass = 'status-5xx';

        return `
          <tr data-page-id="${this.escapeHtml(page.id)}">
            <td>
              <span class="seo-status-code ${statusClass}">${code}</span>
            </td>
            <td>
              <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 480px;">
                ${this.escapeHtml(page.title || '(No Title)')}
              </div>
              <div style="font-size: 11px; font-family: ui-monospace, monospace; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 480px;">
                ${this.escapeHtml(page.url)}
              </div>
            </td>
            <td style="text-align: right; font-family: ui-monospace, monospace;">${page.word_count || 0}</td>
            <td style="text-align: right; font-family: ui-monospace, monospace;">${page.inlinks_count || 0}</td>
            <td style="text-align: right; font-family: ui-monospace, monospace;">${page.response_time_ms ? page.response_time_ms + 'ms' : '--'}</td>
            <td style="text-align: center;">
              <span style="font-weight: 600; color: ${page.issues_count > 0 ? '#dc2626' : '#10b981'}; font-size: 12px;">
                ${page.issues_count || 0}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="seo-btn seo-btn-secondary seo-btn-sm js-inspect-page" data-id="${this.escapeHtml(page.id)}">Inspect</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const pageId = row.getAttribute('data-page-id');
          this.openPageDrawer(pageId);
        });
      });

      tbody.querySelectorAll('.js-inspect-page').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pageId = btn.getAttribute('data-id');
          this.openPageDrawer(pageId);
        });
      });
    }

    renderTechnicalTab() {
      const robotsWrap = this.container.querySelector('#robotsSummaryWrap');
      const aiBotsGrid = this.container.querySelector('#aiBotsGrid');
      const sitemapsWrap = this.container.querySelector('#sitemapsListWrap');

      const robots = this.currentAudit ? this.currentAudit.robots_txt : null;
      const sitemaps = this.currentAudit ? this.currentAudit.sitemaps : [];

      // Robots Summary
      if (robotsWrap) {
        if (!robots || !robots.fetched) {
          robotsWrap.innerHTML = `<div style="color: #64748b;">No robots.txt was found or fetched for this host.</div>`;
        } else {
          robotsWrap.innerHTML = `
            <div style="display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 12px;">
              <div>Status: <span class="seo-status-code status-2xx">${robots.status_code || 200}</span></div>
              <div>Has Disallow Rules: <strong>${robots.has_disallow ? 'Yes' : 'No'}</strong></div>
              <div>Global Disallow: <strong style="color: ${robots.global_disallow ? '#dc2626' : '#10b981'}">${robots.global_disallow ? 'BLOCKED' : 'Allowed'}</strong></div>
              <div>Sitemaps Declared: <strong>${robots.sitemaps ? robots.sitemaps.length : 0}</strong></div>
            </div>
            ${robots.raw ? `
              <div class="seo-drawer-section-title" style="margin-top: 8px;">Raw robots.txt content:</div>
              <pre class="seo-code-block" style="max-height: 160px;">${this.escapeHtml(robots.raw)}</pre>
            ` : ''}
          `;
        }
      }

      // AI Bots Matrix
      if (aiBotsGrid) {
        const bots = [
          { name: 'GPTBot', purpose: 'OpenAI training and data harvesting', key: 'GPTBot' },
          { name: 'ChatGPT-User', purpose: 'Live browsing initiated by ChatGPT users', key: 'ChatGPT-User' },
          { name: 'OAI-SearchBot', purpose: 'Search index crawler for OpenAI Search', key: 'OAI-SearchBot' },
          { name: 'ClaudeBot', purpose: 'Anthropic model data and web index crawler', key: 'ClaudeBot' },
          { name: 'Claude-SearchBot', purpose: 'Search queries for Claude applications', key: 'Claude-SearchBot' },
          { name: 'PerplexityBot', purpose: 'Real-time conversational search crawler', key: 'PerplexityBot' },
          { name: 'Google-Extended', purpose: 'Controls Gemini training permission', key: 'Google-Extended' },
          { name: 'Applebot-Extended', purpose: 'Controls Apple Intelligence training data', key: 'Applebot-Extended' }
        ];

        const aiStatus = (robots && robots.ai_bots) ? robots.ai_bots : {};

        aiBotsGrid.innerHTML = bots.map(b => {
          const isAllowed = aiStatus[b.key] !== false;
          const badgeClass = isAllowed ? 'badge-success' : 'badge-error';
          const statusText = isAllowed ? 'Allowed' : 'Disallowed';

          return `
            <div class="seo-ai-bot-card">
              <div class="seo-ai-bot-header">
                <span class="seo-ai-bot-name">${this.escapeHtml(b.name)}</span>
                <span class="seo-badge ${badgeClass}">${statusText}</span>
              </div>
              <p class="seo-ai-bot-purpose">${this.escapeHtml(b.purpose)}</p>
            </div>
          `;
        }).join('');
      }

      // Sitemaps Wrap
      if (sitemapsWrap) {
        if (!sitemaps || sitemaps.length === 0) {
          sitemapsWrap.innerHTML = `<div style="color: #64748b;">No XML sitemaps discovered automatically.</div>`;
        } else {
          sitemapsWrap.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${sitemaps.map(s => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                  <span style="font-family: ui-monospace, monospace; font-size: 12px;">${this.escapeHtml(s.url)}</span>
                  <span style="font-size: 11px; font-weight: 600; color: #475569;">${s.urls_count || 0} URLs parsed</span>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    }

    openIssueDrawer(issueId) {
      const issue = this.issues.find(i => i.id === issueId);
      if (!issue) return;

      const title = this.container.querySelector('#drawerTitle');
      const sub = this.container.querySelector('#drawerSubtitle');
      const body = this.container.querySelector('#drawerBody');

      if (title) title.textContent = issue.title;
      if (sub) sub.textContent = `${issue.severity} · Category: ${issue.category}`;

      const sevClass = issue.severity === 'ERROR' ? 'badge-error' : (issue.severity === 'WARNING' ? 'badge-warning' : 'badge-notice');

      let affectedList = [];
      if (Array.isArray(issue.affected_urls) && issue.affected_urls.length > 0) {
        affectedList = issue.affected_urls;
      } else if (issue.affected_urls_json) {
        try {
          affectedList = typeof issue.affected_urls_json === 'string' ? JSON.parse(issue.affected_urls_json) : issue.affected_urls_json;
        } catch (e) {
          affectedList = [];
        }
      } else if (issue.affected_url) {
        affectedList = [issue.affected_url];
      }
      affectedList = (affectedList || []).map(u => typeof u === 'string' ? u : (u.url || String(u))).filter(Boolean);
      const affectedCount = (issue.affected_count !== undefined && issue.affected_count !== null) ? issue.affected_count : affectedList.length;

      if (body) {
        body.innerHTML = `
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="seo-badge ${sevClass}">${this.escapeHtml(issue.severity)}</span>
            <span class="seo-badge badge-neutral">${this.escapeHtml(issue.category)}</span>
            <span style="font-size: 12px; color: #64748b;">Rule: <code>${this.escapeHtml(issue.rule_id || 'custom')}</code></span>
          </div>

          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">What is this issue?</div>
            <div class="seo-drawer-box">${this.escapeHtml(issue.description || '')}</div>
          </div>

          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">Why it matters</div>
            <div class="seo-drawer-box">
              ${this.escapeHtml(issue.recommendation ? issue.recommendation.split('.')[0] + '.' : 'Search engines prioritize pages with clean, descriptive architecture and clear indexing signals.')}
            </div>
          </div>

          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">How to fix</div>
            <div class="seo-drawer-box" style="background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a;">
              ${this.escapeHtml(issue.recommendation || 'Review the page markup and adhere to modern SEO best practices.')}
            </div>
          </div>

          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">Affected URLs (${affectedCount})</div>
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto;">
              ${affectedList.length === 0 ? `
                <div style="font-size: 12px; color: #64748b; font-style: italic;">No specific page URLs recorded for this issue.</div>
              ` : affectedList.map(url => {
                const foundPage = this.pages.find(p => p.url === url);
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: ui-monospace, monospace; font-size: 12px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; word-break: break-all; flex: 1;">
                      ${this.escapeHtml(url)}
                    </a>
                    ${foundPage ? `
                      <button class="seo-btn seo-btn-secondary seo-btn-xs js-inspect-affected-url" data-page-id="${this.escapeHtml(foundPage.id)}" style="padding: 2px 8px; font-size: 11px; flex-shrink: 0;">
                        Inspect
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;

        body.querySelectorAll('.js-inspect-affected-url').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pId = btn.getAttribute('data-page-id');
            this.openPageDrawer(pId);
          });
        });
      }

      this.showDrawer();
    }

    openPageDrawer(pageId) {
      const page = this.pages.find(p => p.id === pageId);
      if (!page) return;

      const title = this.container.querySelector('#drawerTitle');
      const sub = this.container.querySelector('#drawerSubtitle');
      const body = this.container.querySelector('#drawerBody');

      if (title) title.textContent = page.title || 'Page Inspector';
      if (sub) sub.textContent = page.url;

      const code = page.status_code || 200;
      let statusClass = 'status-2xx';
      if (code >= 300 && code < 400) statusClass = 'status-3xx';
      else if (code >= 400 && code < 500) statusClass = 'status-4xx';
      else if (code >= 500) statusClass = 'status-5xx';

      if (body) {
        body.innerHTML = `
          <!-- Page Overview Metrics -->
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="seo-chip" style="min-width: 90px;">
              <span class="seo-chip-val"><span class="seo-status-code ${statusClass}">${code}</span></span>
              <span class="seo-chip-label">Status</span>
            </div>
            <div class="seo-chip" style="min-width: 90px;">
              <span class="seo-chip-val">${page.response_time_ms || 0}ms</span>
              <span class="seo-chip-label">Latency</span>
            </div>
            <div class="seo-chip" style="min-width: 90px;">
              <span class="seo-chip-val">${page.word_count || 0}</span>
              <span class="seo-chip-label">Words</span>
            </div>
            <div class="seo-chip" style="min-width: 90px;">
              <span class="seo-chip-val">${page.inlinks_count || 0}</span>
              <span class="seo-chip-label">Inlinks</span>
            </div>
          </div>

          <!-- Google SERP Snippet Preview -->
          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">SERP Snippet Preview</div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px;">
              <div style="font-size: 12px; color: #202124; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(page.url)}</div>
              <div style="font-size: 16px; color: #1a0dab; font-weight: 500; line-height: 1.3;">${this.escapeHtml(page.title || '(No Title Defined)')}</div>
              <div style="font-size: 13px; color: #4d5156; line-height: 1.4;">${this.escapeHtml(page.meta_description || 'No meta description provided. Search engines will generate a snippet from page content.')}</div>
            </div>
          </div>

          <!-- Headings Hierarchy -->
          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">Heading Hierarchy</div>
            <div class="seo-drawer-box">
              <div style="margin-bottom: 6px;"><strong>H1 Tags (${page.h1_tags ? page.h1_tags.length : 0}):</strong></div>
              ${page.h1_tags && page.h1_tags.length > 0
                ? page.h1_tags.map(h => `<div style="margin-left: 12px; color: #0f172a;">• ${this.escapeHtml(h)}</div>`).join('')
                : '<div style="color: #dc2626; margin-left: 12px;">Missing H1 tag</div>'
              }

              <div style="margin-top: 10px; margin-bottom: 6px;"><strong>H2 Tags (${page.h2_tags ? page.h2_tags.length : 0}):</strong></div>
              ${page.h2_tags && page.h2_tags.length > 0
                ? page.h2_tags.slice(0, 6).map(h => `<div style="margin-left: 12px; color: #475569;">• ${this.escapeHtml(h)}</div>`).join('')
                : '<div style="color: #64748b; margin-left: 12px;">No H2 tags found</div>'
              }
            </div>
          </div>

          <!-- Canonical & Indexability -->
          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">Canonical & Directives</div>
            <div class="seo-drawer-box">
              <div>Canonical URL: <code>${this.escapeHtml(page.canonical_url || '(None declared)')}</code></div>
              <div style="margin-top: 4px;">Robots Meta: <code>${this.escapeHtml(page.meta_robots || 'all, index, follow')}</code></div>
            </div>
          </div>

          <!-- Structured Data -->
          <div class="seo-drawer-section">
            <div class="seo-drawer-section-title">JSON-LD Structured Data (${page.schemas ? page.schemas.length : 0})</div>
            ${page.schemas && page.schemas.length > 0 ? `
              <pre class="seo-code-block" style="max-height: 200px;">${this.escapeHtml(JSON.stringify(page.schemas, null, 2))}</pre>
            ` : `
              <div class="seo-drawer-box" style="color: #64748b;">No JSON-LD schemas detected on this page.</div>
            `}
          </div>

          <!-- Playwright CSR vs SSR Differences (if available) -->
          ${page.rendering_diff ? `
            <div class="seo-drawer-section">
              <div class="seo-drawer-section-title" style="color: #3b82f6;">Playwright JS Client-Side Differences</div>
              <div class="seo-drawer-box">
                <div>Client-Rendered Nodes Added: <strong>${page.rendering_diff.nodeCountDiff || 0}</strong></div>
                <div>Title Modified by JS: <strong>${page.rendering_diff.titleDiff ? 'Yes' : 'No'}</strong></div>
                <div>Links Added via JS: <strong>${page.rendering_diff.extraLinksCount || 0}</strong></div>
              </div>
            </div>
          ` : ''}
        `;
      }

      this.showDrawer();
    }

    showDrawer() {
      const drawer = this.container.querySelector('#seoSideDrawer');
      const backdrop = this.container.querySelector('#seoDrawerBackdrop');
      if (drawer) drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    }

    closeDrawer() {
      const drawer = this.container.querySelector('#seoSideDrawer');
      const backdrop = this.container.querySelector('#seoDrawerBackdrop');
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }

    async downloadExport(type) {
      if (!this.currentAudit || !this.currentAudit.id) return;
      const url = `/api/seo-audits/${this.currentAudit.id}/${type}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = `seo-audit-${this.currentAudit.id}.${type.split('.')[1] || 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast(`Downloading ${type.toUpperCase()}...`);
    }

    async openCompareModal() {
      const modal = this.container.querySelector('#seoCompareModal');
      const select = this.container.querySelector('#selectCompareAudit');
      if (!modal || !select) return;

      modal.classList.add('active');
      select.innerHTML = '<option value="">Loading previous audits...</option>';

      try {
        const res = await fetch('/api/seo-audits?limit=20');
        if (!res.ok) throw new Error('Failed to load audits');
        const data = await res.json();
        const others = (data.items || []).filter(a => a.id !== this.currentAudit?.id);

        if (others.length === 0) {
          select.innerHTML = '<option value="">No other audits available to compare</option>';
        } else {
          select.innerHTML = '<option value="">Select an audit to compare...</option>' +
            others.map(a => `
              <option value="${a.id}">
                ${a.target_url} — Score: ${Math.round(a.health_score || 0)} (${new Date(a.created_at).toLocaleDateString()})
              </option>
            `).join('');
        }
      } catch (err) {
        select.innerHTML = `<option value="">Error: ${err.message}</option>`;
      }
    }

    async runComparison() {
      const select = this.container.querySelector('#selectCompareAudit');
      const otherId = select?.value;
      if (!otherId || !this.currentAudit?.id) {
        this.showToast('Please select an audit to compare', 'warning');
        return;
      }

      const resultsWrap = this.container.querySelector('#compareResultsWrap');
      if (resultsWrap) {
        resultsWrap.style.display = 'flex';
        resultsWrap.innerHTML = '<div style="color: #64748b;">Computing diff...</div>';
      }

      try {
        const res = await fetch(`/api/seo-audits/${this.currentAudit.id}/compare/${otherId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Comparison failed');

        const delta = data.score_delta;
        const deltaColor = delta > 0 ? '#10b981' : (delta < 0 ? '#dc2626' : '#64748b');
        const sign = delta > 0 ? '+' : '';

        resultsWrap.innerHTML = `
          <div style="display: flex; gap: 16px; align-items: center; padding: 12px; background: #f8fafc; border-radius: 6px;">
            <div style="font-size: 24px; font-weight: 800; color: ${deltaColor};">${sign}${delta}</div>
            <div style="font-size: 13px; color: #475569;">Health Score Delta (Current: ${data.current_score} vs Baseline: ${data.baseline_score})</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span>New Issues Detected:</span>
            <strong style="color: #dc2626;">${data.new_issues ? data.new_issues.length : 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Issues Resolved:</span>
            <strong style="color: #10b981;">${data.resolved_issues ? data.resolved_issues.length : 0}</strong>
          </div>
        `;
      } catch (err) {
        resultsWrap.innerHTML = `<div style="color: #dc2626;">Error: ${err.message}</div>`;
      }
    }

    async openSaveToProjectModal() {
      const modal = this.container.querySelector('#seoProjectModal');
      const select = this.container.querySelector('#selectSaveProject');
      if (!modal || !select) return;

      modal.classList.add('active');
      select.innerHTML = '<option value="">Loading projects...</option>';

      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error('Failed to load projects');
        const projects = await res.json();

        if (!Array.isArray(projects) || projects.length === 0) {
          select.innerHTML = '<option value="">No projects found. Create one first!</option>';
        } else {
          select.innerHTML = '<option value="">Select a project...</option>' +
            projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)} (${this.escapeHtml(p.website_url)})</option>`).join('');
        }
      } catch (err) {
        select.innerHTML = `<option value="">Error: ${err.message}</option>`;
      }
    }

    async confirmSaveToProject() {
      const select = this.container.querySelector('#selectSaveProject');
      const projectId = select?.value;
      if (!projectId || !this.currentAudit?.id) {
        this.showToast('Please select a valid project', 'warning');
        return;
      }

      try {
        // Save test history or link to project
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            test_type: 'seo',
            target_url: this.currentAudit.target_url,
            status: 'completed',
            summary: {
              health_score: this.currentAudit.health_score,
              crawled_pages: this.currentAudit.crawled_pages,
              total_errors: this.currentAudit.total_errors,
              audit_id: this.currentAudit.id
            },
            duration_ms: this.currentAudit.duration_ms || 1000
          })
        });

        this.container.querySelector('#seoProjectModal').classList.remove('active');
        this.showToast('SEO Audit saved to project history!');
      } catch (e) {
        this.showToast('Error saving to project', 'error');
      }
    }

    resetView() {
      this.currentAudit = null;
      this.pages = [];
      this.issues = [];
      if (this.pollInterval) clearInterval(this.pollInterval);

      const targetInput = this.container.querySelector('#seoTargetUrl');
      if (targetInput) targetInput.value = '';

      const initCard = this.container.querySelector('#seoInitialState');
      if (initCard) initCard.style.display = 'flex';

      const results = this.container.querySelector('#seoResultsDashboard');
      if (results) results.style.display = 'none';

      const progCard = this.container.querySelector('#seoProgressCard');
      if (progCard) progCard.style.display = 'none';
    }

    showToast(msg, type = 'info') {
      if (window.showToast) {
        window.showToast(msg, type);
      } else {
        console.log(`[Toast ${type}] ${msg}`);
      }
    }

    escapeHtml(str) {
      if (typeof str !== 'string') return String(str || '');
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  window.SeoAuditTool = SeoAuditTool;
})();
