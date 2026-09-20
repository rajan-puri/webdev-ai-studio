/**
 * client/js/services/project-manager.js
 * Central Project Manager for WebDev AI Studio.
 * Synchronizes with backend SQLite /api/projects API with isolated user ownership.
 */

(function () {
  'use strict';

  let listeners = [];

  class ProjectManager {
    constructor() {
      this.projects = [];
      this.isLoading = false;
      this.activeProjectId = localStorage.getItem('webdev_active_project_id') || null;
      this.init();

      // Refresh projects whenever authenticated user changes
      if (window.AuthManager) {
        window.AuthManager.subscribe(() => {
          this.loadProjects();
        });
      }

      this.setupSwitcherUi();
    }

    async init() {
      await this.loadProjects();
    }

    getActiveProject() {
      if (!this.projects || this.projects.length === 0) return null;
      if (this.activeProjectId) {
        const found = this.projects.find(p => p.id === this.activeProjectId);
        if (found) return found;
      }
      return this.projects[0] || null;
    }

    setActiveProject(id) {
      this.activeProjectId = id;
      try {
        localStorage.setItem('webdev_active_project_id', id);
      } catch (e) {}
      this.updateDomUi();
      this.notifyListeners();
    }

    async loadProjects() {
      this.isLoading = true;
      try {
        const res = await fetch('/api/projects', {
          method: 'GET',
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.projects)) {
            this.projects = data.projects.map(p => ({
              id: p.id,
              name: p.name,
              url: p.website_url,
              website_url: p.website_url,
              description: p.description || '',
              archived: p.archived === 1,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              testsCount: p.tests_count || 0,
              reportsCount: p.reports_count || 0,
              screenshotsCount: p.screenshots_count || 0,
              baselinesCount: p.baselines_count || 0,
              lastActivityAt: p.last_activity_at || null
            }));

            // Re-validate active project
            if (this.projects.length > 0) {
              if (!this.activeProjectId || !this.projects.find(p => p.id === this.activeProjectId)) {
                this.activeProjectId = this.projects[0].id;
              }
            } else {
              this.activeProjectId = null;
            }

            this.updateDomUi();
            this.notifyListeners();
            return this.projects;
          }
        }
      } catch (err) {
        console.warn('[ProjectManager] Failed to fetch projects from server:', err);
      } finally {
        this.isLoading = false;
      }
      return this.projects;
    }

    updateDomUi() {
      const active = this.getActiveProject();
      const activeName = active ? active.name : 'No Active Project';
      const activeUrl = active ? (active.url || active.website_url || 'https://example.com') : 'http://127.0.0.1:3000';
      let hostname = 'example.com';
      try {
        hostname = new URL(activeUrl.startsWith('http') ? activeUrl : `https://${activeUrl}`).hostname;
      } catch(e) {
        hostname = activeUrl.replace(/^https?:\/\//, '');
      }

      // 1. Header project elements
      const headerNameEl = document.getElementById('headerActiveProjectName');
      if (headerNameEl) headerNameEl.textContent = activeName;
      const breadcrumbProjectEl = document.getElementById('breadcrumbProject');
      if (breadcrumbProjectEl) breadcrumbProjectEl.textContent = activeName;

      // 2. Sidebar anchor elements
      const sideNameEl = document.getElementById('sidebarActiveProjectName');
      if (sideNameEl) sideNameEl.textContent = activeName;
      const sideUrlEl = document.getElementById('sidebarActiveProjectUrl');
      if (sideUrlEl) {
        sideUrlEl.textContent = activeUrl;
        sideUrlEl.href = activeUrl;
      }

      // 3. Technical Canvas Target
      const techTargetEl = document.getElementById('techCanvasTarget');
      if (techTargetEl) techTargetEl.textContent = activeUrl;

      // 4. Hero Preview Address & titles
      const heroAddrEl = document.getElementById('heroPreviewAddress');
      if (heroAddrEl) heroAddrEl.textContent = hostname;
      const heroTitleEl = document.getElementById('heroProjectTitle');
      if (heroTitleEl) heroTitleEl.textContent = activeName;
      const heroUrlEl = document.getElementById('heroProjectUrl');
      if (heroUrlEl) heroUrlEl.href = activeUrl;
      const heroUrlTextEl = document.getElementById('heroProjectUrlText');
      if (heroUrlTextEl) heroUrlTextEl.textContent = activeUrl;

      // 5. Render switcher dropdown list
      this.renderSwitcherDropdown();
    }

    setupSwitcherUi() {
      const pickerBtn = document.getElementById('headerProjectPickerBtn');
      const dropdown = document.getElementById('projectSwitcherDropdown');
      const searchInput = document.getElementById('switcherSearchInput');

      if (pickerBtn && dropdown) {
        pickerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('open');
          if (dropdown.classList.contains('open') && searchInput) {
            searchInput.value = '';
            searchInput.focus();
            this.renderSwitcherDropdown();
          }
        });

        document.addEventListener('click', (e) => {
          if (!dropdown.contains(e.target) && e.target !== pickerBtn) {
            dropdown.classList.remove('open');
          }
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          this.renderSwitcherDropdown(searchInput.value);
        });
      }

      // Sidebar Subnav event bindings
      const subnavMap = {
        'subnavOverview': 'dashboard',
        'subnavBrowserLab': 'responsive-tester',
        'subnavSeo': 'seo-audit',
        'subnavQa': 'automated-qa',
        'subnavA11y': 'accessibility',
        'subnavPerf': 'performance'
      };

      Object.entries(subnavMap).forEach(([elId, viewName]) => {
        const el = document.getElementById(elId);
        if (el) {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.project-subnav-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');

            const targetNav = document.querySelector(`[data-view="${viewName}"]`);
            if (targetNav) targetNav.click();
          });
        }
      });
    }

    renderSwitcherDropdown(filterQuery = '') {
      const container = document.getElementById('switcherProjectsList');
      if (!container) return;

      const q = filterQuery.toLowerCase().trim();
      const filtered = this.projects.filter(p => !p.archived && (!q || p.name.toLowerCase().includes(q) || (p.url && p.url.toLowerCase().includes(q))));

      if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 10px; font-size: 11px; color: var(--text-muted); text-align: center;">No projects found</div>`;
        return;
      }

      container.innerHTML = filtered.map(p => {
        const isActive = p.id === this.activeProjectId;
        return `
          <div class="switcher-project-row ${isActive ? 'active' : ''}" data-id="${p.id}">
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 11px;" class="truncate">${p.name}</div>
              <div class="font-mono text-muted text-xs truncate" style="font-size: 9px;">${p.url || ''}</div>
            </div>
            ${isActive ? '<span style="color: var(--accent-primary); font-size: 11px;">✓</span>' : ''}
          </div>
        `;
      }).join('');

      container.querySelectorAll('.switcher-project-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-id');
          this.setActiveProject(id);
          const dropdown = document.getElementById('projectSwitcherDropdown');
          if (dropdown) dropdown.classList.remove('open');
        });
      });
    }

    async reload() {
      return await this.loadProjects();
    }

    getProjects(includeArchived = false) {
      if (includeArchived) return [...this.projects];
      return this.projects.filter(p => !p.archived);
    }

    getProject(id) {
      return this.projects.find(p => p.id === id) || null;
    }

    async fetchProjectDetails(id) {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'GET',
          credentials: 'include'
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.project || null;
      } catch (e) {
        console.error('[ProjectManager] Failed to fetch project detail:', e);
        return null;
      }
    }

    async createProject({ name, url, description = '' }) {
      if (!name || !name.trim()) throw new Error('Project name is required.');
      if (!url || !url.trim()) throw new Error('Website URL is required.');

      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), website_url: cleanUrl, description: (description || '').trim() })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create project.');
      }

      await this.loadProjects();
      return data.project;
    }

    async updateProject(id, { name, url, description }) {
      let cleanUrl = url ? url.trim() : undefined;
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, website_url: cleanUrl, description })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update project.');
      }

      await this.loadProjects();
      return data.project;
    }

    async deleteProject(id) {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete project.');
      }

      await this.loadProjects();
      return true;
    }

    async archiveProject(id) {
      const res = await fetch(`/api/projects/${id}/archive`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      await this.loadProjects();
      return data;
    }

    async addProjectScan(projectId, scanData) {
      // Save directly to reports & test_history
      try {
        const histRes = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId,
            testType: scanData.type || 'website_qa',
            targetUrl: scanData.url,
            status: scanData.status || 'completed',
            summary: scanData.summary || {},
            durationMs: scanData.responseTime || 0
          })
        });
        const histData = await histRes.json();

        if (histData.success && histData.item) {
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              projectId,
              historyId: histData.item.id,
              testType: scanData.type || 'website_qa',
              targetUrl: scanData.url,
              resultJson: scanData
            })
          });
        }
        await this.loadProjects();
      } catch (err) {
        console.error('[ProjectManager] Failed to record project scan:', err);
      }
    }

    subscribe(callback) {
      listeners.push(callback);
      callback(this.getProjects());
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    }

    notifyListeners() {
      listeners.forEach(fn => {
        try {
          fn(this.getProjects());
        } catch (e) {
          console.error('[ProjectManager] Error in listener callback', e);
        }
      });
    }
  }

  window.ProjectManager = new ProjectManager();
})();
