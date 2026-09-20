/**
 * client/js/services/history-manager.js
 * Central History & Activity Manager for WebDev AI Studio.
 * Synchronizes with SQLite /api/history backend API with genuine developer actions and reports.
 */

(function () {
  'use strict';

  let listeners = [];

  class HistoryManager {
    constructor() {
      this.history = [];
      this.total = 0;
      this.isLoading = false;
      this.init();

      if (window.AuthManager) {
        window.AuthManager.subscribe(() => {
          this.loadHistory();
        });
      }
    }

    async init() {
      await this.loadHistory();
    }

    async loadHistory(params = {}) {
      this.isLoading = true;
      try {
        const qs = new URLSearchParams();
        if (params.projectId) qs.set('project_id', params.projectId);
        if (params.testType) qs.set('test_type', params.testType);
        if (params.status) qs.set('status', params.status);
        if (params.search) qs.set('search', params.search);
        if (params.sort) qs.set('sort', params.sort);
        qs.set('limit', params.limit || '50');
        qs.set('offset', params.offset || '0');

        const res = await fetch(`/api/history?${qs.toString()}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.items)) {
            this.history = data.items.map(item => ({
              id: item.id,
              type: item.testType,
              tool: this.formatToolName(item.testType),
              action: `Tested ${item.targetUrl}`,
              projectId: item.projectId,
              projectName: item.projectName,
              url: item.targetUrl,
              status: item.status,
              summary: item.summary || {},
              durationMs: item.durationMs || 0,
              reportId: item.reportId || null,
              timestamp: item.createdAt,
              createdAt: item.createdAt
            }));
            this.total = data.total || this.history.length;
            this.notifyListeners();
            return this.history;
          }
        }
      } catch (err) {
        console.warn('[HistoryManager] Failed to fetch history from server:', err);
      } finally {
        this.isLoading = false;
      }
      return this.history;
    }

    formatToolName(testType) {
      if (!testType) return 'General';
      const map = {
        'automated_qa': 'Automated QA',
        'responsive': 'Responsive Tester',
        'website_qa': 'Website QA',
        'api_tester': 'API Tester',
        'seo_audit': 'SEO Audit',
        'accessibility': 'Accessibility',
        'visual_regression': 'Visual Regression'
      };
      return map[testType] || testType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getHistory(filter = {}) {
      let list = [...this.history];
      if (filter.projectId) {
        list = list.filter(item => item.projectId === filter.projectId);
      }
      if (filter.category && filter.category !== 'all') {
        const cat = filter.category.toLowerCase();
        list = list.filter(item => (item.type || '').toLowerCase().includes(cat) || (item.tool || '').toLowerCase().includes(cat));
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.trim().toLowerCase();
        list = list.filter(item =>
          (item.tool && item.tool.toLowerCase().includes(q)) ||
          (item.projectName && item.projectName.toLowerCase().includes(q)) ||
          (item.url && item.url.toLowerCase().includes(q))
        );
      }
      return list;
    }

    async addHistoryItem({
      type = 'action',
      tool = 'General',
      projectId = null,
      targetUrl = '',
      url = '',
      status = 'completed',
      summary = {},
      durationMs = 0,
      reportData = null
    }) {
      const finalUrl = targetUrl || url || '';
      try {
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId: projectId || null,
            testType: type,
            targetUrl: finalUrl,
            status,
            summary,
            durationMs
          })
        });

        const data = await res.json();
        if (data.success && data.item) {
          const createdHistoryId = data.item.id;

          // If reportData is provided, store in /api/reports
          if (reportData) {
            try {
              await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  projectId: projectId || null,
                  historyId: createdHistoryId,
                  testType: type,
                  targetUrl: finalUrl,
                  resultJson: reportData
                })
              });
            } catch (rErr) {
              console.warn('[HistoryManager] Failed to persist report JSON:', rErr);
            }
          }

          await this.loadHistory();
          return data.item;
        }
      } catch (err) {
        console.error('[HistoryManager] Failed to save history item:', err);
      }
      return null;
    }

    async deleteHistoryItem(id) {
      try {
        const res = await fetch(`/api/history/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          await this.loadHistory();
          return true;
        }
      } catch (e) {
        console.error('[HistoryManager] Failed to delete item:', e);
      }
      return false;
    }

    async clearHistory() {
      try {
        const res = await fetch('/api/history', {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          this.history = [];
          this.total = 0;
          this.notifyListeners();
          return true;
        }
      } catch (e) {
        console.error('[HistoryManager] Failed to clear history:', e);
      }
      return false;
    }

    async getReport(reportId) {
      try {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'GET',
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          return data.report || null;
        }
      } catch (e) {
        console.error('[HistoryManager] Failed to fetch report:', e);
      }
      return null;
    }

    subscribe(callback) {
      listeners.push(callback);
      callback(this.history);
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    }

    notifyListeners() {
      listeners.forEach(fn => {
        try {
          fn(this.history);
        } catch (e) {
          console.error('[HistoryManager] Error in listener callback', e);
        }
      });
    }
  }

  window.HistoryManager = new HistoryManager();
})();
