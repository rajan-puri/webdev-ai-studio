/**
 * client/js/tools/history.js
 * History View Controller for WebDev AI Studio.
 * Renders activity log, filters, search, sorting, detail modal/drawer, and history clearing.
 */

(function () {
  'use strict';

  let currentCategory = 'all';
  let currentSearch = '';
  let currentSort = 'newest';
  let selectedHistoryItem = null;

  function init() {
    setupHistoryNavigation();
    setupFilters();
    setupSearchAndSort();
    setupDetailDrawer();
    setupClearHistoryAction();
    renderHistoryList();
    renderDashboardActivity();

    if (window.HistoryManager) {
      window.HistoryManager.subscribe(() => {
        renderHistoryList();
        renderDashboardActivity();
      });
    }
  }

  function setupHistoryNavigation() {
    document.querySelectorAll('[data-view="history"], .js-open-history').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openHistory();
      });
    });
  }

  function openHistory() {
    ['viewDashboard', 'viewWebsiteQa', 'viewProjects', 'viewSettings', 'viewResponsiveTester', 'viewApiTester', 'viewAutomatedQa', 'viewSeoAudit', 'viewDesignToCode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const historyView = document.getElementById('viewHistory');
    if (historyView) historyView.style.display = 'block';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'History';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navHistory = document.getElementById('navHistory');
    if (navHistory) navHistory.classList.add('active');

    renderHistoryList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupFilters() {
    const filterButtons = document.querySelectorAll('.history-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category || 'all';
        renderHistoryList();
      });
    });
  }

  function setupSearchAndSort() {
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderHistoryList();
      });
    }

    const sortSelect = document.getElementById('historySortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderHistoryList();
      });
    }
  }

  function setupClearHistoryAction() {
    const clearBtn = document.getElementById('btnClearHistoryView');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!window.HistoryManager) return;
        const count = window.HistoryManager.getHistory().length;
        if (count === 0) {
          alert('History is already empty.');
          return;
        }
        if (confirm(`Are you sure you want to clear all ${count} history records? This cannot be undone.`)) {
          window.HistoryManager.clearHistory();
          renderHistoryList();
        }
      });
    }
  }

  function renderHistoryList() {
    const container = document.getElementById('historyListContainer');
    if (!container || !window.HistoryManager) return;

    const items = window.HistoryManager.getHistory({
      category: currentCategory,
      search: currentSearch,
      sortBy: currentSort
    });

    const countBadge = document.getElementById('historyCountBadge');
    if (countBadge) {
      countBadge.textContent = `${items.length} ${items.length === 1 ? 'record' : 'records'}`;
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 64px 24px;">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="empty-state-title">No history records found</div>
          <div class="empty-state-text">
            ${currentSearch || currentCategory !== 'all' 
              ? 'No activity matches your active filters. Try resetting the search query or category filter.' 
              : 'Actions, website QA audits, and project operations will automatically be logged here as you work.'}
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="qa-table-wrapper">
        <table class="qa-data-table">
          <thead>
            <tr>
              <th style="width: 170px;">Date &amp; Time</th>
              <th style="width: 140px;">Tool</th>
              <th>Action / Target</th>
              <th style="width: 160px;">Project</th>
              <th style="width: 100px;">Status</th>
              <th style="width: 80px; text-align: right;">Detail</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const dateStr = new Date(item.timestamp).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const statusClass = item.status === 'completed' || item.status === 'success' 
                ? 'text-success' 
                : (item.status === 'failed' || item.status === 'error' ? 'text-danger' : 'text-muted');

              return `
                <tr class="js-history-row" data-history-id="${item.id}" style="cursor: pointer;">
                  <td class="font-mono text-muted text-xs">${dateStr}</td>
                  <td>
                    <span class="badge" style="font-size: 11px; padding: 2px 6px;">
                      ${escapeHtml(item.tool || 'General')}
                    </span>
                  </td>
                  <td>
                    <div style="font-weight: 500; font-size: 13px;">${escapeHtml(item.action)}</div>
                    ${item.url ? `<div class="text-xs text-muted font-mono truncate" style="max-width: 320px;">${escapeHtml(item.url)}</div>` : ''}
                  </td>
                  <td>
                    ${item.projectName 
                      ? `<span class="badge badge-subtle" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;">${escapeHtml(item.projectName)}</span>` 
                      : '<span class="text-muted text-xs">—</span>'}
                  </td>
                  <td>
                    <span class="font-mono text-xs ${statusClass}" style="font-weight: 600;">
                      ${escapeHtml(item.status || 'completed')}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm js-view-history-detail" data-history-id="${item.id}" style="padding: 2px 8px; font-size: 11px;">
                      View
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('.js-history-row, .js-view-history-detail').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.historyId || el.closest('[data-history-id]').dataset.historyId;
        openHistoryDetail(id);
      });
    });
  }

  function setupDetailDrawer() {
    const drawer = document.getElementById('historyDetailDrawer');
    const closeBtn = document.getElementById('closeHistoryDetailDrawer');
    const backdrop = document.getElementById('historyDrawerBackdrop');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeHistoryDetail);
    }
    if (backdrop) {
      backdrop.addEventListener('click', closeHistoryDetail);
    }
  }

  function openHistoryDetail(id) {
    if (!window.HistoryManager) return;
    const item = window.HistoryManager.getHistoryItem(id);
    if (!item) return;

    selectedHistoryItem = item;
    const drawer = document.getElementById('historyDetailDrawer');
    const backdrop = document.getElementById('historyDrawerBackdrop');
    const body = document.getElementById('historyDetailBody');
    if (!drawer || !body) return;

    const formattedDate = new Date(item.timestamp).toLocaleString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let detailsHtml = '';
    if (item.summary && Object.keys(item.summary).length > 0) {
      detailsHtml += `
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">Action Summary</h4>
          <div class="meta-card-grid" style="grid-template-columns: repeat(2, 1fr);">
            ${Object.entries(item.summary).map(([k, v]) => `
              <div class="meta-field">
                <span class="meta-label">${escapeHtml(k)}</span>
                <span class="meta-value">${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (item.type === 'qa_scan' && item.details && item.details.scanData) {
      const scan = item.details.scanData;
      detailsHtml += `
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">Scan Quick Metrics</h4>
          <div class="meta-card-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="meta-field">
              <span class="meta-label">Total Checks</span>
              <span class="meta-value">${scan.totalChecks || 46}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Passed Checks</span>
              <span class="meta-value text-success">${scan.summary ? scan.summary.passed : 0}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Warnings</span>
              <span class="meta-value text-warning">${scan.summary ? scan.summary.warning : 0}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Errors</span>
              <span class="meta-value text-danger">${scan.summary ? scan.summary.error : 0}</span>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <button class="btn btn-secondary btn-sm js-reopen-scan-results" style="width: 100%;">
              Open Full Scan in Website QA Scanner
            </button>
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="meta-field">
          <span class="meta-label">Action</span>
          <span class="meta-value" style="font-size: 14px; font-weight: 600;">${escapeHtml(item.action)}</span>
        </div>

        <div class="meta-card-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="meta-field">
            <span class="meta-label">Tool</span>
            <span class="meta-value">${escapeHtml(item.tool || 'General')}</span>
          </div>
          <div class="meta-field">
            <span class="meta-label">Status</span>
            <span class="meta-value font-mono" style="text-transform: capitalize;">${escapeHtml(item.status)}</span>
          </div>
          <div class="meta-field" style="grid-column: span 2;">
            <span class="meta-label">Timestamp</span>
            <span class="meta-value font-mono text-xs">${formattedDate}</span>
          </div>
        </div>

        ${item.projectName ? `
          <div class="meta-field">
            <span class="meta-label">Associated Project</span>
            <span class="meta-value">
              <a href="#" class="js-goto-history-project" data-project-id="${item.projectId}" style="color: var(--accent); text-decoration: none;">
                ${escapeHtml(item.projectName)} &rarr;
              </a>
            </span>
          </div>
        ` : ''}

        ${item.url ? `
          <div class="meta-field">
            <span class="meta-label">Target URL</span>
            <span class="meta-value font-mono text-xs truncate" style="word-break: break-all;">
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-primary); text-decoration: underline;">
                ${escapeHtml(item.url)}
              </a>
            </span>
          </div>
        ` : ''}

        ${detailsHtml}

        <div style="margin-top: 8px;">
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px;">Record Payload (JSON)</h4>
          <pre class="code-block" style="max-height: 200px; overflow-y: auto; font-size: 11px;"><code>${escapeHtml(JSON.stringify(item, null, 2))}</code></pre>
        </div>
      </div>
    `;

    // Bind link to project
    const projectLink = body.querySelector('.js-goto-history-project');
    if (projectLink && window.ProjectsView) {
      projectLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeHistoryDetail();
        window.ProjectsView.openWorkspace(item.projectId);
      });
    }

    // Bind open full scan
    const reopenBtn = body.querySelector('.js-reopen-scan-results');
    if (reopenBtn && window.WebsiteQa && item.details && item.details.scanData) {
      reopenBtn.addEventListener('click', () => {
        closeHistoryDetail();
        window.WebsiteQa.open();
        window.WebsiteQa.displayResults(item.details.scanData);
      });
    }

    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeHistoryDetail() {
    const drawer = document.getElementById('historyDetailDrawer');
    const backdrop = document.getElementById('historyDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    selectedHistoryItem = null;
  }

  function renderDashboardActivity() {
    const container = document.getElementById('dashboardActivityList');
    if (!container || !window.HistoryManager) return;

    const recent = window.HistoryManager.getHistory({ sortBy: 'newest' }).slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 24px;">
          <div class="empty-state-text" style="font-size: 12px;">No activity logged yet. Start by running a Website QA scan or creating a project.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="activity-feed">
        ${recent.map(item => {
          const timeAgo = formatTimeAgo(new Date(item.timestamp));
          return `
            <div class="activity-item js-dash-history-item" data-history-id="${item.id}" style="cursor: pointer; display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-subtle);">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-size: 13px; font-weight: 500;">${escapeHtml(item.action)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">
                  ${item.tool ? `<span class="badge" style="font-size: 10px; padding: 1px 5px; margin-right: 6px;">${escapeHtml(item.tool)}</span>` : ''}
                  ${item.projectName ? `<span>Project: <strong>${escapeHtml(item.projectName)}</strong></span>` : ''}
                  ${item.url ? `<span class="font-mono" style="margin-left: 6px;">${escapeHtml(item.url)}</span>` : ''}
                </div>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; margin-left: 12px;">
                ${timeAgo}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.js-dash-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.historyId;
        openHistory();
        setTimeout(() => openHistoryDetail(id), 100);
      });
    });
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  window.HistoryView = {
    open: openHistory,
    openDetail: openHistoryDetail,
    renderDashboardActivity
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
