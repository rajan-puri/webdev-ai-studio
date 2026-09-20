/**
 * client/js/tools/dashboard.js
 * Visual Developer Workspace Controller.
 * Powers the primary website input, interactive quick workflow suites,
 * toolkit tiles, active project preview, genuine health metrics, and live activity timeline.
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  class DashboardMetricsController {
    constructor() {
      this.cachedData = null;
      this.init();
    }

    init() {
      this.setupWebsiteInput();
      this.setupWorkflowCards();
      this.setupToolkitTiles();
      this.setupActiveProjectActions();
      this.loadMetrics();

      if (window.AuthManager) {
        window.AuthManager.subscribe(() => this.loadMetrics());
      }

      if (window.ProjectManager) {
        window.ProjectManager.subscribe(() => this.loadMetrics());
      }

      if (window.HistoryManager) {
        window.HistoryManager.subscribe(() => this.loadMetrics());
      }
    }

    /* ------------------------------------------------------------------------
       SECTION 2: PRIMARY WEBSITE INPUT CONTROLLER
       ------------------------------------------------------------------------ */
    setupWebsiteInput() {
      const form = document.getElementById('formHomeAnalyze');
      const input = document.getElementById('homeWebsiteInput');
      const btn = document.getElementById('btnHomeAnalyze');
      const onboardingBtn = document.getElementById('btnOnboardingAddWebsite');

      const handleAnalyze = () => {
        if (!input) return;
        let rawVal = input.value.trim();
        if (!rawVal) {
          input.focus();
          input.parentElement.style.borderColor = 'var(--status-danger)';
          setTimeout(() => {
            if (input.parentElement) input.parentElement.style.borderColor = '';
          }, 1200);
          return;
        }

        let fullUrl = rawVal;
        if (!/^https?:\/\//i.test(fullUrl)) {
          fullUrl = 'https://' + fullUrl;
        }

        // Pre-fill target in Browser Lab and open
        const responsiveInput = document.getElementById('responsiveUrl');
        if (responsiveInput) {
          responsiveInput.value = fullUrl;
        }

        const qaInput = document.getElementById('qaTargetUrl');
        if (qaInput) {
          qaInput.value = fullUrl;
        }

        const seoInput = document.getElementById('txtOverviewDomain');
        if (seoInput) {
          try {
            seoInput.value = new URL(fullUrl).hostname;
          } catch (e) {
            seoInput.value = fullUrl;
          }
        }

        // Navigate to Browser Lab
        if (window.openResponsiveTester) {
          window.openResponsiveTester();
        } else {
          const navItem = document.querySelector('[data-view="responsive-tester"]');
          if (navItem) navItem.click();
        }
      };

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          handleAnalyze();
        });
      }

      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          handleAnalyze();
        });
      }

      if (onboardingBtn) {
        onboardingBtn.addEventListener('click', () => {
          if (input) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input.focus();
          }
        });
      }
    }

    /* ------------------------------------------------------------------------
       SECTION 3: QUICK WORKFLOW CARDS
       ------------------------------------------------------------------------ */
    setupWorkflowCards() {
      const bindWf = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            fn();
          });
        }
      };

      bindWf('wfCardDesignToCode', () => {
        if (window.openDesignToCode) window.openDesignToCode();
        else document.querySelector('[data-view="design-to-code"]')?.click();
      });

      bindWf('wfCardBrowserLab', () => {
        if (window.openResponsiveTester) window.openResponsiveTester();
        else document.querySelector('[data-view="responsive-tester"]')?.click();
      });

      bindWf('wfCardSeo', () => {
        if (window.openSeoAudit) window.openSeoAudit();
        else document.querySelector('[data-view="seo-audit"]')?.click();
      });

      bindWf('wfCardAutomatedQa', () => {
        if (window.openAutomatedQa) window.openAutomatedQa();
        else document.querySelector('[data-view="automated-qa"]')?.click();
      });
    }

    /* ------------------------------------------------------------------------
       SECTION 4: TOOL ECOSYSTEM TILES
       ------------------------------------------------------------------------ */
    setupToolkitTiles() {
      document.querySelectorAll('.toolkit-tile').forEach(tile => {
        tile.addEventListener('click', (e) => {
          e.preventDefault();
          const viewName = tile.getAttribute('data-view');
          if (viewName) {
            const navLink = document.querySelector(`[data-view="${viewName}"]`);
            if (navLink) navLink.click();
          }
        });
      });
    }

    /* ------------------------------------------------------------------------
       SECTION 5: ACTIVE PROJECT ACTIONS
       ------------------------------------------------------------------------ */
    setupActiveProjectActions() {
      const btnBrowserLab = document.getElementById('btnOpenActiveInBrowserLab');
      const btnQa = document.getElementById('btnRunActiveQA');
      const btnProjects = document.getElementById('btnManageProjectsView');

      if (btnBrowserLab) {
        btnBrowserLab.addEventListener('click', () => {
          if (this.currentProjectUrl) {
            const rInput = document.getElementById('responsiveUrl');
            if (rInput) rInput.value = this.currentProjectUrl;
          }
          if (window.openResponsiveTester) window.openResponsiveTester();
          else document.querySelector('[data-view="responsive-tester"]')?.click();
        });
      }

      if (btnQa) {
        btnQa.addEventListener('click', () => {
          if (this.currentProjectUrl) {
            const qaInput = document.getElementById('qaTargetUrl');
            if (qaInput) qaInput.value = this.currentProjectUrl;
          }
          if (window.openAutomatedQa) window.openAutomatedQa();
          else document.querySelector('[data-view="automated-qa"]')?.click();
        });
      }

      if (btnProjects) {
        btnProjects.addEventListener('click', () => {
          document.querySelector('[data-view="projects"]')?.click();
        });
      }
    }

    /* ------------------------------------------------------------------------
       DATA LOADING & METRICS DISPATCH
       ------------------------------------------------------------------------ */
    async loadMetrics() {
      try {
        const res = await fetch('/api/dashboard', {
          method: 'GET',
          credentials: 'include'
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            this.cachedData = json.data;
            this.renderProjectSection(json.data);
            this.renderProjectPills(json.data);
            this.renderProjectHealth(json.data);
            this.renderSparkline(json.data);
            this.renderActivityTimeline(json.data.recentTests || json.data.recentActivity || []);
            this.renderTelemetryCounters(json.data);
          }
        }
      } catch (err) {
        console.warn('[DashboardController] Failed to fetch telemetry:', err);
      }
    }

    /* ------------------------------------------------------------------------
       SECTION 2 & 5: PROJECT SELECTION & SURFACE
       ------------------------------------------------------------------------ */
    renderProjectPills(data) {
      const listContainer = document.getElementById('homeQuickProjectsList');
      if (!listContainer) return;

      const projects = data.recentProjects || [];
      if (projects.length === 0) {
        listContainer.innerHTML = '<span class="text-xs font-mono text-muted">No saved projects yet</span>';
        return;
      }

      const activeProjId = window.ProjectManager?.getActiveProject()?.id || projects[0]?.id;

      listContainer.innerHTML = projects.map(p => {
        const isActive = p.id === activeProjId;
        return `
          <button class="quick-project-pill ${isActive ? 'active' : ''}" type="button" data-proj-id="${escapeHtml(p.id)}">
            <span class="pill-dot"></span>
            <span>${escapeHtml(p.name)}</span>
          </button>
        `;
      }).join('');

      listContainer.querySelectorAll('.quick-project-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const projId = btn.getAttribute('data-proj-id');
          const selected = projects.find(p => p.id === projId);
          if (selected) {
            if (window.ProjectManager) {
              window.ProjectManager.setActiveProject(selected.id);
            }
            this.updateActiveProjectView(selected);
            this.renderProjectPills(data);

            const input = document.getElementById('homeWebsiteInput');
            if (input && selected.website_url) {
              input.value = selected.website_url.replace(/^https?:\/\//i, '');
            }
          }
        });
      });
    }

    renderProjectSection(data) {
      const surface = document.getElementById('activeProjectSurface');
      const onboarding = document.getElementById('noProjectOnboardingCard');
      const projects = data.recentProjects || [];

      if (!projects || projects.length === 0) {
        if (surface) surface.style.display = 'none';
        if (onboarding) onboarding.style.display = 'flex';
        return;
      }

      if (surface) surface.style.display = 'block';
      if (onboarding) onboarding.style.display = 'none';

      const activeProj = window.ProjectManager?.getActiveProject() || projects[0];
      this.updateActiveProjectView(activeProj);
    }

    updateActiveProjectView(proj) {
      if (!proj) return;

      const titleEl = document.getElementById('heroProjectTitle');
      const urlEl = document.getElementById('heroProjectUrl');
      const urlTextEl = document.getElementById('heroProjectUrlText');
      const addressBarEl = document.getElementById('heroPreviewAddress');
      const envNameEl = document.getElementById('heroEnvName');
      const canvasFallback = document.getElementById('heroProjectCanvasFallback');
      const screenshotImg = document.getElementById('heroScreenshotImg');

      this.currentProjectUrl = proj.website_url || 'https://example.com';

      if (titleEl) titleEl.textContent = proj.name || 'Active Project';
      if (urlEl) urlEl.href = this.currentProjectUrl;
      if (urlTextEl) urlTextEl.textContent = this.currentProjectUrl;
      if (envNameEl) envNameEl.textContent = 'PRODUCTION';

      try {
        const parsed = new URL(this.currentProjectUrl.startsWith('http') ? this.currentProjectUrl : `https://${this.currentProjectUrl}`);
        if (addressBarEl) addressBarEl.textContent = parsed.hostname;
      } catch (e) {
        if (addressBarEl) addressBarEl.textContent = this.currentProjectUrl.replace(/^https?:\/\//, '');
      }

      // Fetch screenshot if project has any
      this.fetchProjectScreenshot(proj.id, screenshotImg, canvasFallback);
    }

    async fetchProjectScreenshot(projectId, imgEl, fallbackEl) {
      if (!imgEl || !fallbackEl) return;
      try {
        const res = await fetch(`/api/screenshots?${projectId ? `project_id=${projectId}&` : ''}limit=1`, {
          credentials: 'include'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && json.data.length > 0) {
            const detailRes = await fetch(`/api/screenshots/${json.data[0].id}`, { credentials: 'include' });
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              if (detailJson.success && detailJson.data && detailJson.data.data_uri) {
                imgEl.src = detailJson.data.data_uri;
                imgEl.style.display = 'block';
                fallbackEl.style.display = 'none';
                return;
              }
            }
          }
        }
      } catch (e) {}

      // Fallback
      imgEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
    }

    /* ------------------------------------------------------------------------
       SECTION 5: PROJECT HEALTH METRICS (REAL DATA ONLY - NEVER FAKE 0%)
       ------------------------------------------------------------------------ */
    renderProjectHealth(data) {
      const overallValEl = document.getElementById('healthOverallVal');
      const summaryStatusEl = document.getElementById('healthSummaryStatus');
      const summaryDetailEl = document.getElementById('healthSummaryDetail');

      const totalTests = data.totalTests || 0;
      const passedTests = data.passedTests || 0;
      const failedTests = (data.failedTests || 0) + (data.warningTests || 0);

      const meterQa = document.getElementById('meterQa');
      const valQa = document.getElementById('healthValQa');

      if (totalTests > 0) {
        const qaPct = Math.round((passedTests / totalTests) * 100);
        if (meterQa) meterQa.style.width = `${qaPct}%`;
        if (valQa) valQa.textContent = `${passedTests} / ${totalTests} Passed`;

        if (overallValEl) overallValEl.textContent = `${qaPct}%`;
        if (summaryStatusEl) {
          summaryStatusEl.textContent = failedTests > 0 ? `${failedTests} Attention Items` : 'All Suites Passing';
        }
        if (summaryDetailEl) {
          summaryDetailEl.textContent = `Calculated from ${totalTests} verified test runs`;
        }
      } else {
        if (overallValEl) overallValEl.textContent = '--';
        if (summaryStatusEl) summaryStatusEl.textContent = 'No test runs yet';
        if (summaryDetailEl) summaryDetailEl.textContent = 'Run an audit or test suite to measure health';
        if (valQa) valQa.textContent = 'Not measured';
        if (meterQa) meterQa.style.width = '0%';
      }

      const recentActivity = data.recentActivity || [];
      const seoItem = recentActivity.find(t => t.testType === 'seo_audit');
      const a11yItem = recentActivity.find(t => t.testType === 'accessibility');
      const perfItem = recentActivity.find(t => t.testType === 'pagespeed' || t.testType === 'performance');

      // SEO
      const meterSeo = document.getElementById('meterSeo');
      const valSeo = document.getElementById('healthValSeo');
      if (seoItem && seoItem.summary && typeof seoItem.summary.overallScore === 'number') {
        const score = Math.round(seoItem.summary.overallScore);
        if (meterSeo) meterSeo.style.width = `${score}%`;
        if (valSeo) valSeo.textContent = `${score}%`;
      } else if (seoItem) {
        if (meterSeo) meterSeo.style.width = seoItem.status === 'passed' ? '100%' : '50%';
        if (valSeo) valSeo.textContent = seoItem.status === 'passed' ? 'Passing' : 'Review Needed';
      } else {
        if (meterSeo) meterSeo.style.width = '0%';
        if (valSeo) valSeo.textContent = 'Not measured';
      }

      // Accessibility
      const meterA11y = document.getElementById('meterA11y');
      const valA11y = document.getElementById('healthValA11y');
      if (a11yItem && a11yItem.summary && typeof a11yItem.summary.score === 'number') {
        const score = Math.round(a11yItem.summary.score);
        if (meterA11y) meterA11y.style.width = `${score}%`;
        if (valA11y) valA11y.textContent = `${score}%`;
      } else if (a11yItem) {
        if (meterA11y) meterA11y.style.width = a11yItem.status === 'passed' ? '100%' : '50%';
        if (valA11y) valA11y.textContent = a11yItem.status === 'passed' ? 'Passing' : 'Review Needed';
      } else {
        if (meterA11y) meterA11y.style.width = '0%';
        if (valA11y) valA11y.textContent = 'Not measured';
      }

      // Performance
      const meterPerf = document.getElementById('meterPerf');
      const valPerf = document.getElementById('healthValPerf');
      if (perfItem && perfItem.summary && typeof perfItem.summary.score === 'number') {
        const score = Math.round(perfItem.summary.score);
        if (meterPerf) meterPerf.style.width = `${score}%`;
        if (valPerf) valPerf.textContent = `${score}%`;
      } else if (perfItem) {
        if (meterPerf) meterPerf.style.width = perfItem.status === 'passed' ? '100%' : '50%';
        if (valPerf) valPerf.textContent = perfItem.status === 'passed' ? 'Passing' : 'Review Needed';
      } else {
        if (meterPerf) meterPerf.style.width = '0%';
        if (valPerf) valPerf.textContent = 'Not measured';
      }

      // Attention required box
      const attentionBox = document.getElementById('dashAttentionBox');
      const attentionHeading = document.getElementById('dashAttentionHeading');
      const attentionDesc = document.getElementById('dashAttentionDesc');
      const attentionAction = document.getElementById('dashAttentionAction');

      if (attentionBox && attentionHeading && attentionDesc) {
        if (failedTests > 0) {
          attentionBox.style.display = 'block';
          attentionHeading.textContent = `${failedTests} Test Issues Detected`;
          attentionDesc.textContent = `Unresolved failures or test warnings require review in your recent automated runs.`;
          if (attentionAction) {
            attentionAction.innerHTML = `<button class="btn btn-sm" id="btnReviewFailures" type="button">Review Issues &rarr;</button>`;
            document.getElementById('btnReviewFailures')?.addEventListener('click', () => {
              document.querySelector('[data-view="history"]')?.click();
            });
          }
        } else {
          attentionBox.style.display = 'none';
        }
      }
    }

    /* ------------------------------------------------------------------------
       SECTION 6: RECENT ACTIVITY TIMELINE (GENUINE DATA ONLY)
       ------------------------------------------------------------------------ */
    renderActivityTimeline(tests) {
      const container = document.getElementById('dashboardActivityList');
      if (!container) return;

      if (!tests || tests.length === 0) {
        container.innerHTML = `
          <div style="padding: 12px 0; font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
            No test runs recorded yet. Use the analyzer bar above or launch a test suite to begin.
          </div>
        `;
        return;
      }

      container.innerHTML = tests.slice(0, 6).map(t => {
        const status = (t.status || '').toLowerCase();
        const isPassed = status === 'passed' || status === 'completed';
        const isFailed = status === 'failed' || status === 'warning';
        const rawType = t.testType || t.test_type || 'TEST RUN';
        const typeLabel = rawType.replace(/_/g, ' ').toUpperCase();

        let timeLabel = 'Recently';
        const rawDate = t.createdAt || t.created_at;
        if (rawDate) {
          const diffMs = Date.now() - new Date(rawDate).getTime();
          const diffSec = Math.max(0, Math.floor(diffMs / 1000));
          if (diffSec < 60) timeLabel = 'Just now';
          else if (diffSec < 3600) timeLabel = `${Math.floor(diffSec / 60)} minutes ago`;
          else if (diffSec < 86400) timeLabel = `${Math.floor(diffSec / 3600)} hours ago`;
          else timeLabel = `${Math.floor(diffSec / 86400)} days ago`;
        }

        const duration = (t.durationMs || t.duration_ms) ? `${t.durationMs || t.duration_ms}ms` : '';
        const targetUrl = t.targetUrl || t.target_url || '';

        return `
          <div class="home-activity-item">
            <span class="home-activity-dot ${isPassed ? 'passed' : (isFailed ? 'failed' : '')}"></span>
            <div class="home-activity-main">
              <div class="home-activity-title">${escapeHtml(typeLabel)}</div>
              <div class="home-activity-meta">
                <span class="font-mono text-xs truncate" style="max-width: 380px;">${escapeHtml(targetUrl)}</span>
                ${duration ? `<span class="badge font-mono text-xs" style="font-size: 9px; padding: 1px 4px;">${escapeHtml(duration)}</span>` : ''}
              </div>
            </div>
            <span class="home-activity-time font-mono">${escapeHtml(timeLabel)}</span>
          </div>
        `;
      }).join('');
    }

    renderSparkline(data) {
      const activity = data.recentActivity || [];
      const svgArea = document.getElementById('sparklineArea');
      const svgLine = document.getElementById('sparklineLine');
      const noDataEl = document.getElementById('sparklineNoData');
      const svgEl = document.getElementById('sparklineSvg');

      if (!activity || activity.length === 0) {
        if (noDataEl) noDataEl.style.display = 'block';
        if (svgEl) svgEl.style.display = 'none';
        return;
      }

      if (noDataEl) noDataEl.style.display = 'none';
      if (svgEl) svgEl.style.display = 'block';

      const points = activity.slice(0, 10).reverse();
      const width = 180;
      const height = 26;
      const padding = 4;
      const usableH = height - (padding * 2);

      const step = points.length > 1 ? (width - 8) / (points.length - 1) : width / 2;

      const coords = points.map((pt, idx) => {
        const x = 4 + (idx * step);
        let factor = 0.5;
        if (pt.status === 'passed') factor = 0.88;
        else if (pt.status === 'failed') factor = 0.18;
        else if (pt.status === 'warning') factor = 0.5;
        const y = height - padding - (factor * usableH);
        return { x, y };
      });

      let linePath = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        linePath += ` L ${coords[i].x} ${coords[i].y}`;
      }

      const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

      if (svgLine) svgLine.setAttribute('d', linePath);
      if (svgArea) svgArea.setAttribute('d', areaPath);
    }

    renderTelemetryCounters(data) {
      const elProjects = document.getElementById('mTotalProjects');
      const elTests = document.getElementById('mTotalTests');
      const elPassed = document.getElementById('mPassedTests');
      const elFailed = document.getElementById('mFailedTests');
      const elScreenshots = document.getElementById('mTotalScreenshots');
      const elBaselines = document.getElementById('mTotalBaselines');
      const elLastActivity = document.getElementById('dashLastActivityText');

      const failedCount = (data.failedTests || 0) + (data.warningTests || 0);

      if (elProjects) elProjects.textContent = data.projectsCount || 0;
      if (elTests) elTests.textContent = data.totalTests || 0;
      if (elPassed) elPassed.textContent = data.passedTests || 0;
      if (elFailed) elFailed.textContent = failedCount;
      if (elScreenshots) elScreenshots.textContent = data.screenshotsCount || 0;
      if (elBaselines) elBaselines.textContent = data.baselinesCount || 0;

      if (elLastActivity) {
        if (data.lastTestAt) {
          elLastActivity.textContent = 'Last run: ' + new Date(data.lastTestAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          elLastActivity.textContent = 'All engines standby';
        }
      }
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.DashboardMetrics = new DashboardMetricsController();
    });
  } else {
    window.DashboardMetrics = new DashboardMetricsController();
  }
})();
