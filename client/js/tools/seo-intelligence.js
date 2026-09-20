/**
 * client/js/tools/seo-intelligence.js
 * Extends WebDev AI Studio SEO Suite with SEMrush-style capabilities:
 * - Unified Domain Overview Dashboard
 * - Side-by-side Competitor Research & Gap Analysis
 * - Google Search Console & Bing Organic Keywords
 * - Google PageSpeed Insights & CrUX Real-User Field Data
 * - Ahrefs Domain Rating (Free Public API with strict attribution)
 * - Server Access Log Analyzer (Googlebot, Bingbot, AI crawlers, wasted crawl budget)
 * - Zero fake data guarantee across all views
 */

(function () {
  'use strict';

  if (!window.SeoAuditTool) {
    console.warn('[seo-intelligence] SeoAuditTool base class not loaded yet.');
    return;
  }

  const Proto = window.SeoAuditTool.prototype;

  // Initialize Suite navigation and bind events
  Proto.bindSuiteEvents = function () {
    const nav = this.container.querySelector('#seoSuiteNav');
    if (!nav) return;

    nav.querySelectorAll('.seo-suite-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-tab');
        this.switchSuiteTab(tab);
      });
    });

    // Header Manage Providers button
    const btnProviders = this.container.querySelector('#btnSeoConfigureProviders');
    if (btnProviders) {
      btnProviders.addEventListener('click', () => {
        if (window.SettingsView && window.SettingsView.open) {
          window.SettingsView.open();
          setTimeout(() => {
            const card = document.getElementById('settingsSeoProvidersCard');
            if (card) card.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        }
      });
    }

    // Bind Dashboard Overview
    const btnAnalyzeOverview = this.container.querySelector('#btnAnalyzeOverview');
    const inputOverviewDomain = this.container.querySelector('#overviewDomainInput');
    if (btnAnalyzeOverview && inputOverviewDomain) {
      btnAnalyzeOverview.addEventListener('click', () => {
        const domain = inputOverviewDomain.value.trim();
        if (domain) this.loadOverviewDashboard(domain);
      });
      inputOverviewDomain.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const domain = inputOverviewDomain.value.trim();
          if (domain) this.loadOverviewDashboard(domain);
        }
      });
    }

    // Bind Competitor Compare
    const btnRunComp = this.container.querySelector('#btnRunCompCompare');
    if (btnRunComp) {
      btnRunComp.addEventListener('click', () => this.runCompetitorComparison());
    }

    // Bind Keywords GSC
    const btnRefreshGsc = this.container.querySelector('#btnRefreshGsc');
    if (btnRefreshGsc) {
      btnRefreshGsc.addEventListener('click', () => this.loadKeywordsData());
    }
    const gscRange = this.container.querySelector('#gscDateRangeSelect');
    if (gscRange) {
      gscRange.addEventListener('change', () => this.loadKeywordsData());
    }
    const gscDim = this.container.querySelector('#gscDimensionSelect');
    if (gscDim) {
      gscDim.addEventListener('change', () => this.loadKeywordsData());
    }
    const gscProp = this.container.querySelector('#gscPropertySelect');
    if (gscProp) {
      gscProp.addEventListener('change', () => this.loadKeywordsData());
    }
    const gscFilter = this.container.querySelector('#gscQueryFilterInput');
    if (gscFilter) {
      gscFilter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.loadKeywordsData();
        }
      });
    }

    // Bind PageSpeed
    const btnRunPs = this.container.querySelector('#btnRunPageSpeedTest');
    if (btnRunPs) {
      btnRunPs.addEventListener('click', () => this.runPageSpeedAnalysis());
    }

    // Bind Ahrefs DR Lookup
    const btnLookupAhrefs = this.container.querySelector('#btnLookupAhrefsDr');
    if (btnLookupAhrefs) {
      btnLookupAhrefs.addEventListener('click', () => this.runAhrefsDrLookup());
    }

    // Bind Export Center buttons
    const btnPdf = this.container.querySelector('#btnExportPdfSuite');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        if (!this.currentAudit) {
          alert('Please run or load an audit from the Site Audit tab or Audit History before downloading a PDF report.');
          return;
        }
        this.exportData('export.pdf');
      });
    }
    const btnCsv = this.container.querySelector('#btnExportCsvSuite');
    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        if (!this.currentAudit) {
          alert('Please run or load an audit before downloading an issues CSV.');
          return;
        }
        this.exportData('export.csv');
      });
    }
    const btnJson = this.container.querySelector('#btnExportJsonSuite');
    if (btnJson) {
      btnJson.addEventListener('click', () => {
        if (!this.currentAudit) {
          alert('Please run or load an audit before downloading JSON data.');
          return;
        }
        this.exportData('export.json');
      });
    }

    // Bind Log Analyzer
    this.initLogAnalyzer();
  };

  Proto.switchSuiteTab = function (tabName) {
    this.activeSuiteTab = tabName;

    // Update active class on tabs
    const nav = this.container.querySelector('#seoSuiteNav');
    if (nav) {
      nav.querySelectorAll('.seo-suite-tab').forEach(b => {
        if (b.getAttribute('data-tab') === tabName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    // Toggle panes
    const paneMap = {
      overview: 'paneSeoDashboard',
      audit: 'paneSeoAudit',
      competitors: 'paneSeoCompetitors',
      keywords: 'paneSeoKeywords',
      performance: 'paneSeoPerformance',
      links: 'paneSeoLinks',
      logs: 'paneSeoLogs',
      reports: 'paneSeoReports'
    };

    Object.entries(paneMap).forEach(([key, paneId]) => {
      const pane = this.container.querySelector('#' + paneId);
      if (pane) {
        pane.style.display = key === tabName ? 'flex' : 'none';
      }
    });

    // Auto-trigger tab specific loads
    if (tabName === 'overview') {
      this.loadSuiteProviderStatuses();
      const domainInput = this.container.querySelector('#overviewDomainInput');
      const seedUrl = this.container.querySelector('#seoTargetUrl')?.value.trim();
      if (domainInput && !domainInput.value && seedUrl) {
        try {
          domainInput.value = new URL(seedUrl).hostname;
        } catch (e) {
          domainInput.value = seedUrl.replace(/^https?:\/\//, '').split('/')[0];
        }
      }
      if (domainInput && domainInput.value && !this.overviewLoaded) {
        this.loadOverviewDashboard(domainInput.value);
      }
    } else if (tabName === 'keywords' && !this.keywordsLoaded) {
      this.loadKeywordsData();
    } else if (tabName === 'performance') {
      const psInput = this.container.querySelector('#psTargetUrl');
      const seedUrl = this.container.querySelector('#seoTargetUrl')?.value.trim();
      if (psInput && !psInput.value && seedUrl) {
        psInput.value = seedUrl;
      }
    } else if (tabName === 'links') {
      const ahrefsInput = this.container.querySelector('#ahrefsDomainInput');
      const seedUrl = this.container.querySelector('#seoTargetUrl')?.value.trim();
      if (ahrefsInput && !ahrefsInput.value && seedUrl) {
        try {
          ahrefsInput.value = new URL(seedUrl).hostname;
        } catch (e) {
          ahrefsInput.value = seedUrl.replace(/^https?:\/\//, '').split('/')[0];
        }
      }
    }
  };

  Proto.loadSuiteProviderStatuses = async function () {
    try {
      const res = await fetch('/api/seo/providers/status');
      const data = await res.json();
      if (!data || !data.success) return;

      const p = data.providers;
      const strip = this.container.querySelector('#seoProviderStatusStrip');
      if (strip) {
        strip.innerHTML = `
          <span style="font-weight: 600; color: #475569; margin-right: 4px;">Data Providers:</span>
          <span class="seo-provider-chip">
            <strong>Crawler:</strong> <span class="seo-cap-badge cap-available">Available</span>
          </span>
          <span class="seo-provider-chip">
            <strong>GSC:</strong> <span class="seo-cap-badge ${p['google-search-console']?.connected ? 'cap-connected' : 'cap-coming-soon'}">${p['google-search-console']?.connected ? 'Connected' : 'Not Connected'}</span>
          </span>
          <span class="seo-provider-chip">
            <strong>Bing:</strong> <span class="seo-cap-badge ${p['bing-webmaster']?.connected ? 'cap-connected' : 'cap-coming-soon'}">${p['bing-webmaster']?.connected ? 'Connected' : 'Not Configured'}</span>
          </span>
          <span class="seo-provider-chip">
            <strong>Ahrefs DR:</strong> <span class="seo-cap-badge ${p['ahrefs']?.connected || p['ahrefs']?.hasEnvKey ? 'cap-connected' : 'cap-limited'}">${p['ahrefs']?.connected || p['ahrefs']?.hasEnvKey ? 'Active' : 'No Key'}</span>
          </span>
          <span class="seo-provider-chip">
            <strong>PageSpeed:</strong> <span class="seo-cap-badge cap-available">Available</span>
          </span>
          <span class="seo-provider-chip">
            <strong>Semrush:</strong> <span class="seo-cap-badge cap-coming-soon">Coming Soon</span>
          </span>
        `;
      }
    } catch (e) {
      console.warn('Failed to load suite provider statuses:', e);
    }
  };

  Proto.loadOverviewDashboard = async function (domain) {
    if (!domain) return;
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    // Set loading state on KPI values
    ['kpiHealthVal', 'kpiDrVal', 'kpiClicksVal', 'kpiImprVal', 'kpiSpeedVal'].forEach(id => {
      const el = this.container.querySelector('#' + id);
      if (el) el.textContent = '...';
    });

    try {
      const res = await fetch(`/api/seo/overview?domain=${encodeURIComponent(cleanDomain)}`);
      const data = await res.json();
      this.overviewLoaded = true;

      if (!data.success) {
        this.showToast(data.error || 'Failed to fetch domain overview', 'error');
        return;
      }

      const p = data.providers || {};

      // 1. Health Score
      const healthEl = this.container.querySelector('#kpiHealthVal');
      const healthSub = this.container.querySelector('#kpiHealthSub');
      if (healthEl) {
        if (p.crawler?.healthScore?.available && p.crawler?.healthScore?.value !== null) {
          healthEl.textContent = p.crawler.healthScore.value + '/100';
          healthEl.style.color = p.crawler.healthScore.value >= 80 ? '#059669' : (p.crawler.healthScore.value >= 60 ? '#d97706' : '#dc2626');
          if (healthSub) healthSub.textContent = `${p.crawler.pagesCrawled?.value || 0} pages crawled`;
        } else {
          healthEl.textContent = 'Not Crawled';
          healthEl.style.color = '#64748b';
          if (healthSub) healthSub.textContent = 'Run Site Audit to calculate';
        }
      }

      // 2. Ahrefs Domain Rating
      const drEl = this.container.querySelector('#kpiDrVal');
      const drSub = this.container.querySelector('#kpiDrSub');
      if (drEl) {
        if (p.ahrefs?.domainRating?.available && p.ahrefs?.domainRating?.value !== null) {
          drEl.textContent = p.ahrefs.domainRating.value;
          drEl.style.color = '#2563eb';
          if (drSub) drSub.textContent = 'Domain Rating by Ahrefs';
        } else {
          drEl.textContent = 'No Key';
          drEl.style.color = '#64748b';
          if (drSub) drSub.textContent = 'Add Ahrefs key in Settings';
        }
      }

      // 3. Organic Clicks (GSC)
      const clicksEl = this.container.querySelector('#kpiClicksVal');
      const clicksSub = this.container.querySelector('#kpiClicksSub');
      if (clicksEl) {
        if (p.gsc?.available && p.gsc?.metrics?.totalClicks?.available) {
          clicksEl.textContent = (p.gsc.metrics.totalClicks.value || 0).toLocaleString();
          clicksEl.style.color = '#0f172a';
          if (clicksSub) clicksSub.textContent = 'Verified 28d search clicks';
        } else {
          clicksEl.textContent = 'Not Connected';
          clicksEl.style.color = '#64748b';
          if (clicksSub) clicksSub.textContent = 'Connect GSC in Settings';
        }
      }

      // 4. Organic Impressions (GSC)
      const imprEl = this.container.querySelector('#kpiImprVal');
      const imprSub = this.container.querySelector('#kpiImprSub');
      if (imprEl) {
        if (p.gsc?.available && p.gsc?.metrics?.totalImpressions?.available) {
          imprEl.textContent = (p.gsc.metrics.totalImpressions.value || 0).toLocaleString();
          imprEl.style.color = '#0f172a';
          if (imprSub) imprSub.textContent = 'Verified 28d search impressions';
        } else {
          imprEl.textContent = 'Not Connected';
          imprEl.style.color = '#64748b';
          if (imprSub) imprSub.textContent = 'Connect GSC in Settings';
        }
      }

      // 5. PageSpeed Performance
      const speedEl = this.container.querySelector('#kpiSpeedVal');
      const speedSub = this.container.querySelector('#kpiSpeedSub');
      if (speedEl) {
        if (p.pagespeed?.available && p.pagespeed?.scores?.performance?.available) {
          speedEl.textContent = p.pagespeed.scores.performance.value + '/100';
          speedEl.style.color = p.pagespeed.scores.performance.value >= 90 ? '#059669' : (p.pagespeed.scores.performance.value >= 50 ? '#d97706' : '#dc2626');
          if (speedSub) speedSub.textContent = 'Lighthouse mobile score';
        } else {
          speedEl.textContent = 'Available';
          speedEl.style.color = '#059669';
          if (speedSub) speedSub.textContent = 'Click to run on PageSpeed tab';
        }
      }

      // Render Top Queries preview in Overview
      const queriesWrap = this.container.querySelector('#overviewQueriesTableWrap');
      if (queriesWrap) {
        if (p.gsc?.available && Array.isArray(p.gsc.topQueries) && p.gsc.topQueries.length > 0) {
          queriesWrap.innerHTML = `
            <table class="seo-comp-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Clicks</th>
                  <th>Impressions</th>
                  <th>Avg Pos</th>
                </tr>
              </thead>
              <tbody>
                ${p.gsc.topQueries.slice(0, 5).map(q => `
                  <tr>
                    <td style="font-weight: 500;">${this.escapeHtml(q.query)}</td>
                    <td>${(q.clicks || 0).toLocaleString()}</td>
                    <td>${(q.impressions || 0).toLocaleString()}</td>
                    <td>${q.position ? Number(q.position).toFixed(1) : '--'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        } else {
          queriesWrap.innerHTML = `
            <div class="seo-unconnected-card" style="padding: 24px 16px;">
              <div class="seo-unconnected-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">
                ${p.gsc?.available ? 'No search queries recorded for this date range.' : 'Google Search Console is not connected. Connect in Settings > SEO Data Providers to see verified search queries and rankings.'}
              </p>
            </div>
          `;
        }
      }

      // Render Recent Audits in Overview
      this.renderOverviewAudits();
    } catch (e) {
      this.showToast('Error loading overview: ' + e.message, 'error');
    }
  };

  Proto.renderOverviewAudits = async function () {
    const wrap = this.container.querySelector('#overviewAuditsTableWrap');
    if (!wrap) return;

    try {
      const res = await fetch('/api/seo-audits?limit=5');
      const data = await res.json();
      const audits = data.audits || [];

      if (audits.length === 0) {
        wrap.innerHTML = '<div style="color: #64748b; padding: 16px; text-align: center;">No previous crawls found. Run your first audit in the Site Audit tab.</div>';
        return;
      }

      wrap.innerHTML = `
        <table class="seo-comp-table">
          <thead>
            <tr>
              <th>Target URL</th>
              <th>Health</th>
              <th>Pages</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${audits.map(a => `
              <tr>
                <td style="font-family: monospace; font-size: 12px;">${this.escapeHtml(a.target_url)}</td>
                <td><strong style="color: ${a.health_score >= 80 ? '#059669' : '#d97706'}">${a.health_score ?? '--'}%</strong></td>
                <td>${a.crawled_pages || 0}</td>
                <td style="font-size: 11px; color: #64748b;">${new Date(a.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="seo-btn seo-btn-secondary seo-btn-xs js-view-audit" data-id="${a.id}">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll('.js-view-audit').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.switchSuiteTab('audit');
          this.loadAudit(id);
        });
      });
    } catch (e) {
      wrap.innerHTML = '<div style="color: #dc2626; padding: 12px;">Failed to load audit history.</div>';
    }
  };

  Proto.runCompetitorComparison = async function () {
    const targetInput = this.container.querySelector('#compTargetDomain');
    const compInput = this.container.querySelector('#compCompetitorDomain');
    const resultsWrap = this.container.querySelector('#compResultsWrap');
    const btn = this.container.querySelector('#btnRunCompCompare');

    const targetDomain = targetInput?.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const competitorDomain = compInput?.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!targetDomain || !competitorDomain) {
      alert('Please enter both your domain and a competitor domain to compare.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Comparing...';
    }
    if (resultsWrap) {
      resultsWrap.style.display = 'block';
      resultsWrap.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b;">Analyzing both domains across available providers...</div>';
    }

    try {
      const res = await fetch(`/api/seo/competitors/compare?domain=${encodeURIComponent(targetDomain)}&competitor=${encodeURIComponent(competitorDomain)}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to compare domains');
      }

      const c = data.comparison || {};
      const t = c.target || {};
      const o = c.competitor || {};

      resultsWrap.innerHTML = `
        <div class="seo-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 15px; font-weight: 700; margin: 0;">Domain Gap &amp; Performance Comparison</h3>
            <span class="seo-provenance-tag">Real Data Comparison</span>
          </div>

          <table class="seo-comp-table">
            <thead>
              <tr>
                <th style="width: 30%;">Metric</th>
                <th style="width: 30%;">${this.escapeHtml(targetDomain)} (You)</th>
                <th style="width: 30%;">${this.escapeHtml(competitorDomain)} (Competitor)</th>
                <th style="width: 10%;">Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ahrefs Domain Rating</strong><br><span style="font-size: 11px; color: #64748b;">Domain Rating by Ahrefs</span></td>
                <td><strong>${t.domainRating?.value !== null && t.domainRating?.value !== undefined ? t.domainRating.value : '<span style="color:#64748b;">No API Key</span>'}</strong></td>
                <td><strong>${o.domainRating?.value !== null && o.domainRating?.value !== undefined ? o.domainRating.value : '<span style="color:#64748b;">No API Key</span>'}</strong></td>
                <td>${(t.domainRating?.value > o.domainRating?.value) ? '<span class="seo-comp-win">You</span>' : (o.domainRating?.value > t.domainRating?.value ? '<span class="seo-comp-loss">Competitor</span>' : 'Tie / --')}</td>
              </tr>
              <tr>
                <td><strong>Mobile PageSpeed</strong><br><span style="font-size: 11px; color: #64748b;">Lighthouse Lab</span></td>
                <td><strong>${t.pagespeedMobile?.value ?? '--'}</strong></td>
                <td><strong>${o.pagespeedMobile?.value ?? '--'}</strong></td>
                <td>${(t.pagespeedMobile?.value > o.pagespeedMobile?.value) ? '<span class="seo-comp-win">You</span>' : (o.pagespeedMobile?.value > t.pagespeedMobile?.value ? '<span class="seo-comp-loss">Competitor</span>' : 'Tie / --')}</td>
              </tr>
              <tr>
                <td><strong>Desktop PageSpeed</strong><br><span style="font-size: 11px; color: #64748b;">Lighthouse Lab</span></td>
                <td><strong>${t.pagespeedDesktop?.value ?? '--'}</strong></td>
                <td><strong>${o.pagespeedDesktop?.value ?? '--'}</strong></td>
                <td>${(t.pagespeedDesktop?.value > o.pagespeedDesktop?.value) ? '<span class="seo-comp-win">You</span>' : (o.pagespeedDesktop?.value > t.pagespeedDesktop?.value ? '<span class="seo-comp-loss">Competitor</span>' : 'Tie / --')}</td>
              </tr>
              <tr>
                <td><strong>Technical Health Score</strong><br><span style="font-size: 11px; color: #64748b;">WebDev Crawler Audit</span></td>
                <td><strong>${t.healthScore?.value ? t.healthScore.value + '%' : '<span style="color:#64748b;">Not Audited</span>'}</strong></td>
                <td><strong>${o.healthScore?.value ? o.healthScore.value + '%' : '<span style="color:#64748b;">Not Audited</span>'}</strong></td>
                <td>${(t.healthScore?.value > o.healthScore?.value) ? '<span class="seo-comp-win">You</span>' : (o.healthScore?.value > t.healthScore?.value ? '<span class="seo-comp-loss">Competitor</span>' : '--')}</td>
              </tr>
              <tr>
                <td><strong>Discovered Pages</strong><br><span style="font-size: 11px; color: #64748b;">Internal URLs</span></td>
                <td><strong>${t.crawledPages?.value ?? '--'}</strong></td>
                <td><strong>${o.crawledPages?.value ?? '--'}</strong></td>
                <td>--</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
            💡 <strong>Keyword Overlap:</strong> In-depth keyword intersection and common ranking queries will appear automatically when Search Console or an external keyword provider is connected for both properties.
          </div>
        </div>
      `;
    } catch (e) {
      if (resultsWrap) {
        resultsWrap.innerHTML = `<div style="padding: 16px; color: #dc2626; background: #fef2f2; border-radius: 6px;">Error comparing domains: ${this.escapeHtml(e.message)}</div>`;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Compare Domains';
      }
    }
  };

  Proto.loadKeywordsData = async function () {
    const range = this.container.querySelector('#gscDateRangeSelect')?.value || '28d';
    const dim = this.container.querySelector('#gscDimensionSelect')?.value || 'query';
    const propSelect = this.container.querySelector('#gscPropertySelect');
    const queryFilter = this.container.querySelector('#gscQueryFilterInput')?.value.trim() || '';
    const wrap = this.container.querySelector('#keywordsTableWrap');
    const clicksChip = this.container.querySelector('#kwClicksChip');
    const imprChip = this.container.querySelector('#kwImprChip');
    const ctrChip = this.container.querySelector('#kwCtrChip');
    const posChip = this.container.querySelector('#kwPosChip');

    // Populate properties dropdown if not already populated
    if (propSelect && propSelect.options.length <= 1) {
      try {
        const pRes = await fetch('/api/seo/gsc/properties');
        const pData = await pRes.json();
        if (pData.success && Array.isArray(pData.properties) && pData.properties.length > 0) {
          propSelect.innerHTML = '<option value="">Auto (Default Property)</option>' +
            pData.properties.map(p => `
              <option value="${this.escapeHtml(p.property_id)}" ${p.is_selected ? 'selected' : ''}>
                ${this.escapeHtml(p.property_name || p.property_id)} (${p.property_type || 'site'})
              </option>
            `).join('');
        }
      } catch (e) {}
    }

    const selectedProp = propSelect?.value || '';
    let apiUrl = `/api/seo/gsc/analytics?range=${range}&dimension=${dim}`;
    if (selectedProp) apiUrl += `&property_id=${encodeURIComponent(selectedProp)}`;
    if (queryFilter) apiUrl += `&query=${encodeURIComponent(queryFilter)}`;

    if (wrap) wrap.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b;">Fetching Search Console analytics...</div>';

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      this.keywordsLoaded = true;

      if (!data.success || !data.connected) {
        if (clicksChip) clicksChip.textContent = '--';
        if (imprChip) imprChip.textContent = '--';
        if (ctrChip) ctrChip.textContent = '--';
        if (posChip) posChip.textContent = '--';

        if (wrap) {
          wrap.innerHTML = `
            <div class="seo-unconnected-card">
              <div class="seo-unconnected-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h4 style="margin: 0; font-size: 15px; color: #0f172a;">Google Search Console Not Connected</h4>
              <p style="font-size: 13px; color: #64748b; max-width: 480px; margin: 0;">
                To view verified clicks, impressions, CTR, and keyword ranking positions directly from Google, connect your Google Search Console account in Settings.
              </p>
              <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnGoToGscSettings">
                Go to Settings &gt; SEO Data Providers
              </button>
            </div>
          `;
          const btn = wrap.querySelector('#btnGoToGscSettings');
          if (btn) {
            btn.addEventListener('click', () => {
              if (window.SettingsView) {
                window.SettingsView.open();
                setTimeout(() => {
                  document.getElementById('settingsSeoProvidersCard')?.scrollIntoView({ behavior: 'smooth' });
                }, 200);
              }
            });
          }
        }
        return;
      }

      // Update stat chips
      const s = data.summary || data.totals || {};
      const totalClicks = s.totalClicks ?? s.clicks?.value ?? s.clicks ?? 0;
      const totalImpressions = s.totalImpressions ?? s.impressions?.value ?? s.impressions ?? 0;
      const averageCtr = s.averageCtr !== undefined ? (s.averageCtr * 100).toFixed(2) + '%' : (s.ctr?.value !== undefined ? s.ctr.value + '%' : '--');
      const averagePosition = s.averagePosition !== undefined ? Number(s.averagePosition).toFixed(1) : (s.position?.value !== undefined ? Number(s.position.value).toFixed(1) : '--');

      if (clicksChip) clicksChip.textContent = Number(totalClicks).toLocaleString();
      if (imprChip) imprChip.textContent = Number(totalImpressions).toLocaleString();
      if (ctrChip) ctrChip.textContent = averageCtr;
      if (posChip) posChip.textContent = averagePosition;

      const rows = data.rows || [];
      if (rows.length === 0) {
        if (wrap) wrap.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">No ${dim === 'page' ? 'page' : 'query'} records returned for this filter/date range in Search Console.</div>`;
        return;
      }

      if (wrap) {
        wrap.innerHTML = `
          <table class="seo-comp-table">
            <thead>
              <tr>
                <th>${dim === 'page' ? 'Page URL' : (dim === 'country' ? 'Country' : (dim === 'device' ? 'Device' : 'Search Query'))}</th>
                <th>Clicks</th>
                <th>Impressions</th>
                <th>CTR</th>
                <th>Avg Position</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td style="font-weight: 500; font-family: ${dim === 'page' ? 'monospace' : 'inherit'}; font-size: ${dim === 'page' ? '12px' : '13px'};">${this.escapeHtml(r.keys?.[0] || r.query || r.page || '--')}</td>
                  <td><strong>${(r.clicks || 0).toLocaleString()}</strong></td>
                  <td>${(r.impressions || 0).toLocaleString()}</td>
                  <td>${((r.ctr || 0) * 100).toFixed(2)}%</td>
                  <td><span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-weight: 600;">#${(r.position || 0).toFixed(1)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      if (wrap) wrap.innerHTML = `<div style="padding: 16px; color: #dc2626;">Failed to load search analytics: ${this.escapeHtml(e.message)}</div>`;
    }
  };

  Proto.runPageSpeedAnalysis = async function () {
    const urlInput = this.container.querySelector('#psTargetUrl');
    const stratInput = this.container.querySelector('#psStrategySelect');
    const resultsWrap = this.container.querySelector('#psResultsWrap');
    const btn = this.container.querySelector('#btnRunPageSpeedTest');

    const url = urlInput?.value.trim();
    const strategy = stratInput?.value || 'mobile';

    if (!url) {
      alert('Please enter a target URL to analyze.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Running PageSpeed...';
    }
    if (resultsWrap) {
      resultsWrap.style.display = 'block';
      resultsWrap.innerHTML = '<div style="padding: 32px; text-align: center; color: #64748b;">Executing Google PageSpeed Insights &amp; fetching CrUX field data...</div>';
    }

    try {
      const res = await fetch(`/api/seo/pagespeed/analyze?url=${encodeURIComponent(url)}&strategy=${strategy}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch PageSpeed data');
      }

      // If PageSpeed is unavailable (e.g. HTTP 429 quota exceeded, 403, etc.)
      if (!data.available) {
        const diag = data.diagnostics || {};
        const safeReason = data.error || diag.reason || 'PageSpeed API quota exceeded';
        const fetchedTime = data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : new Date().toLocaleTimeString();

        resultsWrap.innerHTML = `
          <div class="seo-card" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Google PageSpeed Insights &mdash; ${strategy.toUpperCase()}</h3>
                <span style="font-size: 12px; color: #64748b; font-family: monospace;">${this.escapeHtml(url)}</span>
              </div>
              <span class="seo-provenance-tag">Source: Google PageSpeed Insights API</span>
            </div>

            <!-- Provider Diagnostics Card -->
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #991b1b;">Provider Diagnostics: Analysis Unavailable</h4>
              </div>
              <div style="font-size: 13px; color: #7f1d1d; display: flex; flex-direction: column; gap: 6px;">
                <div><strong>Provider:</strong> Google PageSpeed Insights</div>
                <div><strong>Status:</strong> <span class="seo-cap-badge cap-limited" style="background: #fee2e2; color: #991b1b;">Unavailable</span></div>
                <div><strong>Reason:</strong> <span style="font-weight: 600;">${this.escapeHtml(safeReason)}</span></div>
                <div><strong>Last checked:</strong> ${fetchedTime}</div>
              </div>
              <div style="margin-top: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnRetryPageSpeed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  <span>Retry</span>
                </button>
                <button class="seo-btn seo-btn-secondary seo-btn-sm" id="btnOpenPageSpeedSettings">
                  <span>Configure API Key in Settings</span>
                </button>
              </div>
            </div>

            <!-- CrUX Field Data (Separated) -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 13px; color: #0f172a;">Real-User Core Web Vitals (CrUX Field Data)</strong>
                <span class="seo-cap-badge cap-limited">Field data unavailable</span>
              </div>
              <div style="font-size: 12px; color: #64748b;">
                ℹ️ <strong>Field data unavailable:</strong> Real-world Chrome field data could not be retrieved because the Google PageSpeed request was rate-limited or unavailable.
              </div>
            </div>
          </div>
        `;

        const btnRetry = resultsWrap.querySelector('#btnRetryPageSpeed');
        if (btnRetry) {
          btnRetry.addEventListener('click', () => this.runPageSpeedAnalysis());
        }
        const btnSettings = resultsWrap.querySelector('#btnOpenPageSpeedSettings');
        if (btnSettings) {
          btnSettings.addEventListener('click', () => {
            if (window.SettingsView && window.SettingsView.open) {
              window.SettingsView.open();
            }
          });
        }
        return;
      }

      const scores = data.scores || {};
      const crux = data.cruxFieldMetrics || {};
      const opps = data.opportunities || [];
      const diags = data.diagnostics || [];

      resultsWrap.innerHTML = `
        <div class="seo-card" style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Google PageSpeed Insights &mdash; ${strategy.toUpperCase()}</h3>
              <span style="font-size: 12px; color: #64748b; font-family: monospace;">${this.escapeHtml(url)}</span>
            </div>
            <span class="seo-provenance-tag">Source: Google PageSpeed Insights API</span>
          </div>

          <!-- Lighthouse Scores 4-Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
            <div class="seo-chip" style="padding: 12px; flex-direction: column; align-items: center;">
              <span style="font-size: 26px; font-weight: 700; color: ${scores.performance?.value !== null ? (scores.performance?.value >= 90 ? '#059669' : (scores.performance?.value >= 50 ? '#d97706' : '#dc2626')) : '#64748b'}">${scores.performance?.value !== null ? scores.performance.value : 'Unavailable'}</span>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase;">Performance</span>
            </div>
            <div class="seo-chip" style="padding: 12px; flex-direction: column; align-items: center;">
              <span style="font-size: 26px; font-weight: 700; color: #2563eb;">${scores.accessibility?.value !== null ? scores.accessibility.value : 'Unavailable'}</span>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase;">Accessibility</span>
            </div>
            <div class="seo-chip" style="padding: 12px; flex-direction: column; align-items: center;">
              <span style="font-size: 26px; font-weight: 700; color: #2563eb;">${scores.bestPractices?.value !== null ? scores.bestPractices.value : 'Unavailable'}</span>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase;">Best Practices</span>
            </div>
            <div class="seo-chip" style="padding: 12px; flex-direction: column; align-items: center;">
              <span style="font-size: 26px; font-weight: 700; color: #059669;">${scores.seo?.value !== null ? scores.seo.value : 'Unavailable'}</span>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase;">SEO</span>
            </div>
          </div>

          <!-- Chrome User Experience Report (CrUX) Real-User Field Data -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 13px; color: #0f172a;">Real-User Core Web Vitals (CrUX Field Data)</strong>
                <span style="display: block; font-size: 11px; color: #64748b;">Based on 28-day Chrome user sessions.</span>
              </div>
              <span class="seo-cap-badge ${crux.status === 'available' ? 'cap-connected' : 'cap-limited'}">${crux.status === 'available' ? 'Field Data Present' : 'Field data unavailable'}</span>
            </div>

            ${crux.status === 'available' ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                <div class="seo-chip">
                  <span class="seo-chip-val" style="font-size: 18px;">${crux.metrics?.LCP?.displayValue || '--'}</span>
                  <span class="seo-chip-label">LCP (${crux.metrics?.LCP?.category || 'Field'})</span>
                </div>
                <div class="seo-chip">
                  <span class="seo-chip-val" style="font-size: 18px;">${crux.metrics?.CLS?.displayValue || '--'}</span>
                  <span class="seo-chip-label">CLS (${crux.metrics?.CLS?.category || 'Field'})</span>
                </div>
                <div class="seo-chip">
                  <span class="seo-chip-val" style="font-size: 18px;">${crux.metrics?.INP?.displayValue || crux.metrics?.FID?.displayValue || '--'}</span>
                  <span class="seo-chip-label">INP / FID</span>
                </div>
                <div class="seo-chip">
                  <span class="seo-chip-val" style="font-size: 18px;">${crux.metrics?.FCP?.displayValue || '--'}</span>
                  <span class="seo-chip-label">FCP (${crux.metrics?.FCP?.category || 'Field'})</span>
                </div>
              </div>
            ` : `
              <div style="font-size: 12px; color: #64748b; padding: 8px 0;">
                ℹ️ <strong>Field data unavailable:</strong> The Chrome User Experience Report does not have sufficient real-user samples for this exact URL. The Lighthouse lab measurements above reflect synthetic emulation.
              </div>
            `}
          </div>

          <!-- Opportunities & Diagnostics -->
          ${opps.length > 0 ? `
            <div>
              <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">Performance Opportunities</h4>
              <table class="seo-comp-table">
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Potential Savings</th>
                  </tr>
                </thead>
                <tbody>
                  ${opps.slice(0, 6).map(o => `
                    <tr>
                      <td><strong>${this.escapeHtml(o.title)}</strong><br><span style="font-size: 11px; color: #64748b;">${this.escapeHtml(o.description || '')}</span></td>
                      <td style="color: #dc2626; font-weight: 600;">${o.displayValue || (o.savingsMs ? o.savingsMs + ' ms' : '--')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      `;
    } catch (e) {
      if (resultsWrap) {
        resultsWrap.innerHTML = `
          <div class="seo-card" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <strong style="color: #991b1b;">Error analyzing PageSpeed:</strong>
            </div>
            <div style="color: #7f1d1d; font-size: 13px; margin-bottom: 12px;">${this.escapeHtml(e.message)}</div>
            <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnRetryPageSpeedErr">Retry</button>
          </div>
        `;
        const btnRetry = resultsWrap.querySelector('#btnRetryPageSpeedErr');
        if (btnRetry) btnRetry.addEventListener('click', () => this.runPageSpeedAnalysis());
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Run PageSpeed Test';
      }
    }
  };

  Proto.runAhrefsDrLookup = async function () {
    const input = this.container.querySelector('#ahrefsDomainInput');
    const wrap = this.container.querySelector('#ahrefsResultWrap');
    const btn = this.container.querySelector('#btnLookupAhrefsDr');

    const domain = input?.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) {
      alert('Please enter a valid domain to check Domain Rating.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Looking up DR...';
    }
    if (wrap) {
      wrap.style.display = 'block';
      wrap.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Contacting Ahrefs Public API...</div>';
    }

    try {
      const res = await fetch(`/api/seo/ahrefs/dr?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();

      const dr = data.domainRating;
      if (dr && dr.available && dr.value !== null) {
        wrap.innerHTML = `
          <div class="seo-card" style="display: flex; align-items: center; justify-content: space-between; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="width: 70px; height: 70px; border-radius: 50%; border: 4px solid #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #1e3a8a;">
                ${dr.value}
              </div>
              <div>
                <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">${this.escapeHtml(domain)}</h3>
                <span class="seo-provenance-tag">Domain Rating by Ahrefs</span>
              </div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Status: <strong style="color: #059669;">${dr.status}</strong><br>
              Fetched: ${new Date(dr.fetchedAt).toLocaleString()}
            </div>
          </div>
        `;
      } else {
        wrap.innerHTML = `
          <div class="seo-unconnected-card">
            <div class="seo-unconnected-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </div>
            <h4 style="margin: 0; font-size: 15px; color: #0f172a;">Ahrefs API Key Required</h4>
            <p style="font-size: 13px; color: #64748b; max-width: 480px; margin: 0;">
              ${dr?.limitations || 'Configure your free public Ahrefs API key in Settings > SEO Data Providers to fetch authentic Domain Rating directly from Ahrefs.'}
            </p>
            <button class="seo-btn seo-btn-primary seo-btn-sm" id="btnGoToAhrefsSettings">
              Configure Ahrefs API Key
            </button>
          </div>
        `;
        wrap.querySelector('#btnGoToAhrefsSettings')?.addEventListener('click', () => {
          if (window.SettingsView) {
            window.SettingsView.open();
            setTimeout(() => {
              document.getElementById('settingsSeoProvidersCard')?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
          }
        });
      }
    } catch (e) {
      wrap.innerHTML = `<div style="padding: 16px; color: #dc2626;">Error: ${this.escapeHtml(e.message)}</div>`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Lookup Domain Rating';
      }
    }
  };

  Proto.initLogAnalyzer = function () {
    const dropzone = this.container.querySelector('#seoLogDropzone');
    const fileInput = this.container.querySelector('#seoLogFileInput');
    const sampleBtn = this.container.querySelector('#btnLoadSampleLog');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processLogFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        this.processLogFile(fileInput.files[0]);
      }
    });

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => this.loadSampleLogData());
    }
  };

  Proto.processLogFile = function (file) {
    const reader = new FileReader();
    const wrap = this.container.querySelector('#logResultsWrap');
    if (wrap) {
      wrap.style.display = 'block';
      wrap.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">Reading and parsing ${this.escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)...</div>`;
    }

    reader.onload = async (e) => {
      const content = e.target.result;
      await this.sendAnalyzeLog(content, file.name);
    };
    reader.onerror = () => {
      if (wrap) wrap.innerHTML = '<div style="color: #dc2626; padding: 16px;">Failed to read file.</div>';
    };
    reader.readAsText(file);
  };

  Proto.loadSampleLogData = async function () {
    const sampleContent = `66.249.66.1 - - [18/Sep/2026:10:15:20 +0000] "GET / HTTP/1.1" 200 4520 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
66.249.66.2 - - [18/Sep/2026:10:16:02 +0000] "GET /about HTTP/1.1" 200 3210 "-" "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
40.77.167.1 - - [18/Sep/2026:10:17:15 +0000] "GET /pricing HTTP/1.1" 200 2840 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
66.249.66.3 - - [18/Sep/2026:10:18:44 +0000] "GET /old-deleted-page HTTP/1.1" 404 180 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
40.77.167.2 - - [18/Sep/2026:10:19:10 +0000] "GET /broken-url HTTP/1.1" 404 180 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
52.167.144.1 - - [18/Sep/2026:10:20:05 +0000] "GET /docs HTTP/1.1" 200 12500 "-" "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)"
54.210.12.5 - - [18/Sep/2026:10:21:30 +0000] "GET /blog/ai-search HTTP/1.1" 200 8900 "-" "ClaudeBot/1.0; +claudebot@anthropic.com"
66.249.66.4 - - [18/Sep/2026:10:22:15 +0000] "GET /temporary-redirect HTTP/1.1" 302 0 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
192.168.1.5 - - [18/Sep/2026:10:23:00 +0000] "GET / HTTP/1.1" 200 4520 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"`;

    await this.sendAnalyzeLog(sampleContent, 'sample_production_access.log');
  };

  Proto.sendAnalyzeLog = async function (logContent, filename) {
    const wrap = this.container.querySelector('#logResultsWrap');
    try {
      const res = await fetch('/api/seo/logs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logContent, filename })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to analyze log');

      const a = data.analysis;
      const m = a.metrics || {};
      const bots = a.botDistribution || {};
      const codes = a.statusCodeDistribution || {};
      const urls = a.topCrawledUrls || [];
      const wasted = a.wastedCrawlSamples || [];

      wrap.innerHTML = `
        <div class="seo-card" style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Server Log Analysis &mdash; ${this.escapeHtml(filename)}</h3>
              <span style="font-size: 12px; color: #64748b;">Parsed ${a.totalLines} lines (${a.parsedEntries} valid HTTP log entries)</span>
            </div>
            <span class="seo-provenance-tag">Source: WebDev Log File Analyzer</span>
          </div>

          <!-- Log KPI Chips -->
          <div class="seo-metric-chips" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
            <div class="seo-chip">
              <span class="seo-chip-val" style="color: #2563eb;">${m.totalBotHits || 0}</span>
              <span class="seo-chip-label">Bot Hits</span>
            </div>
            <div class="seo-chip">
              <span class="seo-chip-val">${m.nonBotHits || 0}</span>
              <span class="seo-chip-label">Human / Other</span>
            </div>
            <div class="seo-chip">
              <span class="seo-chip-val">${m.uniqueUrlsCrawled || 0}</span>
              <span class="seo-chip-label">Unique URLs Crawled</span>
            </div>
            <div class="seo-chip chip-error">
              <span class="seo-chip-val" style="color: #dc2626;">${m.wastedCrawlEventsCount || 0}</span>
              <span class="seo-chip-label">Wasted Crawl Events</span>
            </div>
          </div>

          <!-- 2-Column: Bots & Status Codes -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <strong style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 10px;">Bot Distribution</strong>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${Object.entries(bots).map(([botName, count]) => `
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>${this.escapeHtml(botName)}</span>
                    <strong>${count} hits</strong>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <strong style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 10px;">HTTP Status Codes</strong>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${Object.entries(codes).map(([status, count]) => `
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span><strong style="color: ${status.startsWith('2') ? '#059669' : (status.startsWith('3') ? '#2563eb' : '#dc2626')}">${status}</strong></span>
                    <strong>${count} responses</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Wasted Crawl Budget Alert -->
          ${wasted.length > 0 ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px;">
              <strong style="color: #991b1b; font-size: 13px; display: block; margin-bottom: 6px;">⚠️ Crawl Budget Waste Detected (${wasted.length} events)</strong>
              <span style="font-size: 12px; color: #7f1d1d; display: block; margin-bottom: 8px;">Bots attempted to crawl nonexistent or error-prone URLs, consuming server bandwidth without indexation benefit:</span>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #991b1b;">
                ${wasted.map(w => `
                  <li><strong>${this.escapeHtml(w.bot)}</strong> hit <code style="background:#fee2e2; padding:1px 4px; border-radius:3px;">${this.escapeHtml(w.url)}</code> (${w.statusCode} ${this.escapeHtml(w.reason)})</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Top Crawled URLs Table -->
          <div>
            <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">Top Crawled URLs by Search Bots</h4>
            <table class="seo-comp-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Bot Hits</th>
                  <th>Status Codes</th>
                  <th>Crawling Bots</th>
                </tr>
              </thead>
              <tbody>
                ${urls.slice(0, 10).map(u => `
                  <tr>
                    <td style="font-family: monospace; font-size: 12px;">${this.escapeHtml(u.url)}</td>
                    <td><strong>${u.hits}</strong></td>
                    <td>${u.statusCodes.map(c => `<span style="padding:1px 5px; border-radius:3px; background:${String(c).startsWith('2') ? '#ecfdf5' : '#fee2e2'}; color:${String(c).startsWith('2') ? '#059669' : '#dc2626'}; font-size:11px; margin-right:4px;">${c}</span>`).join('')}</td>
                    <td style="font-size: 12px; color: #64748b;">${this.escapeHtml(u.bots.join(', '))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      wrap.innerHTML = `<div style="padding: 16px; color: #dc2626; background: #fef2f2; border-radius: 6px;">Error analyzing log: ${this.escapeHtml(e.message)}</div>`;
    }
  };

  console.log('[seo-intelligence] Suite controller extensions loaded successfully.');
})();
