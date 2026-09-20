/**
 * client/js/tools/projects.js
 * Projects Workspace & Management Controller.
 * Handles Project List, Creation, and Full 6-Tab Project Workspace:
 * (Overview, Tests & QA, Reports, Screenshots, Visual Baselines, Settings)
 * Fully connected to SQLite backend with isolated user ownership.
 */

(function () {
  'use strict';

  let currentProject = null;
  let activeTab = 'overview';

  function init() {
    setupProjectsNavigation();
    setupCreateProjectModal();
    setupEditProjectModal();
    renderProjectsList();
    renderDashboardProjects();

    if (window.ProjectManager) {
      window.ProjectManager.subscribe(() => {
        renderProjectsList();
        renderDashboardProjects();
        if (currentProject) {
          const updated = window.ProjectManager.getProject(currentProject.id);
          if (updated) {
            currentProject = updated;
            renderProjectWorkspace(updated);
          } else {
            closeProjectWorkspace();
          }
        }
      });
    }
  }

  function setupProjectsNavigation() {
    document.querySelectorAll('[data-view="projects"], .js-open-projects').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openProjects();
      });
    });
  }

  function openProjects() {
    ['viewDashboard', 'viewWebsiteQa', 'viewSettings', 'viewHistory', 'viewResponsiveTester', 'viewApiTester', 'viewAutomatedQa', 'viewSeoAudit', 'viewDesignToCode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const projectsView = document.getElementById('viewProjects');
    if (projectsView) projectsView.style.display = 'block';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'Projects';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navProjects = document.getElementById('navProjects');
    if (navProjects) navProjects.classList.add('active');

    closeProjectWorkspace();
    renderProjectsList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderProjectsList() {
    const container = document.getElementById('projectsListContainer');
    if (!container || !window.ProjectManager) return;

    const projects = window.ProjectManager.getProjects();

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px 24px; margin: 0 auto;">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="empty-state-title">No projects created yet</div>
          <div class="empty-state-text">Create your first project to organize test suites, visual baselines, reports, and screenshots.</div>
          <button class="btn btn-primary js-trigger-create-project" type="button">+ Create Project</button>
        </div>
      `;
      container.querySelectorAll('.js-trigger-create-project').forEach(b => {
        b.addEventListener('click', openCreateModal);
      });
      return;
    }

    container.innerHTML = `
      <div class="tools-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
        ${projects.map(p => {
          const updatedDate = new Date(p.updatedAt || p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          let hostName = 'example.com';
          try {
            hostName = new URL(p.url.startsWith('http') ? p.url : `https://${p.url}`).hostname;
          } catch(e) {
            hostName = p.url.replace(/^https?:\/\//, '');
          }

          return `
            <div class="panel project-card js-open-workspace" data-id="${escapeHtml(p.id)}" style="cursor: pointer; overflow: hidden; display: flex; flex-direction: column; transition: all var(--transition-fast); background: var(--surface-card-gradient, var(--bg-surface)); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
              <!-- Top Preview Frame -->
              <div style="height: 100px; background: var(--bg-canvas); border-bottom: 1px solid var(--border-subtle); position: relative; overflow: hidden; display: flex; flex-direction: column;">
                <div style="height: 22px; background: var(--bg-surface-subtle); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; padding: 0 8px;">
                  <div style="display: flex; gap: 4px;">
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--border-hover);"></span>
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--border-hover);"></span>
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--border-hover);"></span>
                  </div>
                  <span class="font-mono text-muted text-xs" style="font-size: 9px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(hostName)}</span>
                  <span class="font-mono text-xs" style="font-size: 8px; color: var(--status-success); font-weight: 700;">ACTIVE</span>
                </div>
                <div style="flex: 1; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                  <div class="bp-grid-overlay" style="opacity: 0.5;"></div>
                  <div style="display: flex; flex-direction: column; gap: 4px; position: relative; z-index: 1;">
                    <div style="height: 6px; width: 60%; background: rgba(37, 99, 235, 0.18); border-radius: 2px;"></div>
                    <div style="height: 18px; border: 1px dashed rgba(37, 99, 235, 0.25); border-radius: 2px; display: flex; align-items: center; padding: 0 6px;">
                      <span class="font-mono text-muted" style="font-size: 8px;">PLAYWRIGHT AUDIT TARGET</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: flex-end; position: relative; z-index: 1;">
                    <span class="font-mono text-muted" style="font-size: 8px;">CHROMIUM &bull; 1440px</span>
                  </div>
                </div>
              </div>

              <!-- Card Content -->
              <div class="panel-body" style="padding: 14px 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                    <h3 class="panel-title truncate" style="font-size: 15px; font-weight: 700; margin: 0;">${escapeHtml(p.name)}</h3>
                    <span class="badge font-mono text-xs" style="font-size: 9px; padding: 2px 5px; background: var(--status-success-bg); color: var(--status-success); border: 1px solid rgba(16, 185, 129, 0.25);">LOCAL</span>
                  </div>
                  <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" class="font-mono text-muted truncate" style="font-size: 11px; display: block; margin-bottom: 8px; color: var(--accent-primary); text-decoration: none;" onclick="event.stopPropagation();">
                    ${escapeHtml(p.url)}
                  </a>
                  <p style="font-size: 11px; color: var(--text-secondary); margin: 0; line-height: 1.4; height: 32px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${escapeHtml(p.description || 'Monitored workspace project with automated test suites.')}
                  </p>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; font-size: 11px;">
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="badge font-mono" style="font-size: 10px;">${p.testsCount || 0} tests</span>
                    <span class="text-muted font-mono" style="font-size: 10px;">${p.screenshotsCount || 0} screens</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn btn-xs js-delete-project-direct" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" title="Delete project" type="button" style="color: var(--status-warning, #ef4444); background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                    <span class="font-mono text-xs" style="color: var(--accent-primary); font-weight: 700;">OPEN &rarr;</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.js-delete-project-direct').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`Permanently delete project "${name}"?\n\nAll associated reports, screenshots, and test history will be deleted.`)) {
          try {
            await window.ProjectManager.deleteProject(id);
          } catch (err) {
            alert('Failed to delete project: ' + err.message);
          }
        }
      });
    });

    container.querySelectorAll('.js-open-workspace').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openProjectWorkspace(id);
      });
    });
  }

  function renderDashboardProjects() {
    const container = document.getElementById('dashboardProjectsContainer') || document.getElementById('projectsContainer');
    if (!container || !window.ProjectManager) return;

    const projects = window.ProjectManager.getProjects();
    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 24px;">
          <div class="empty-state-title" style="font-size: 13px;">No active projects</div>
          <div class="empty-state-text" style="font-size: 11px;">Create a workspace project to begin tracking test suites, reports, and code generations.</div>
          <button class="btn btn-sm js-trigger-create-project" type="button" style="margin-top: 8px;">+ Initialize Project</button>
        </div>
      `;
      container.querySelectorAll('.js-trigger-create-project').forEach(b => {
        b.addEventListener('click', openCreateModal);
      });
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${projects.slice(0, 5).map(p => `
          <div class="js-open-workspace" data-id="${escapeHtml(p.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; transition: border-color var(--transition-fast);">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);" class="truncate">${escapeHtml(p.name)}</span>
                <span class="badge font-mono text-xs" style="font-size: 9px; padding: 1px 4px;">LOCAL</span>
              </div>
              <div class="font-mono text-muted text-xs truncate" style="font-size: 10px; margin-top: 2px;">${escapeHtml(p.url)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;">
              <span class="badge font-mono" style="font-size: 10px;">${p.testsCount || 0} tests</span>
              <button class="btn btn-xs js-delete-project-direct" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" title="Delete project" type="button" style="color: var(--status-warning, #ef4444); background: transparent; border: 1px solid rgba(239, 68, 68, 0.25); padding: 1px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">
                Delete
              </button>
              <span class="font-mono text-muted" style="font-size: 11px;">&rarr;</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.js-delete-project-direct').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`Permanently delete project "${name}"?\n\nAll associated reports, screenshots, and test history will be deleted.`)) {
          try {
            await window.ProjectManager.deleteProject(id);
          } catch (err) {
            alert('Failed to delete project: ' + err.message);
          }
        }
      });
    });

    container.querySelectorAll('.js-open-workspace').forEach(item => {
      item.addEventListener('click', () => {
        openProjects();
        openProjectWorkspace(item.getAttribute('data-id'));
      });
    });
  }

  async function openProjectWorkspace(projectId) {
    if (!window.ProjectManager) return;
    const project = window.ProjectManager.getProject(projectId);
    if (!project) return;

    currentProject = project;
    activeTab = 'overview';

    const listSection = document.getElementById('projectsMainListSection');
    const workspaceSection = document.getElementById('projectWorkspaceSection');
    if (listSection) listSection.style.display = 'none';
    if (workspaceSection) workspaceSection.style.display = 'block';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = `Projects / ${project.name}`;

    renderProjectWorkspace(project);
  }

  function closeProjectWorkspace() {
    currentProject = null;
    const listSection = document.getElementById('projectsMainListSection');
    const workspaceSection = document.getElementById('projectWorkspaceSection');
    if (listSection) listSection.style.display = 'block';
    if (workspaceSection) workspaceSection.style.display = 'none';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'Projects';
  }

  async function renderProjectWorkspace(project) {
    const workspace = document.getElementById('projectWorkspaceSection');
    if (!workspace) return;

    // Fetch detailed stats from API
    let details = project;
    try {
      const full = await window.ProjectManager.fetchProjectDetails(project.id);
      if (full) details = full;
    } catch (e) {}

    const stats = details.stats || {};
    const testsCount = stats.tests_count || project.testsCount || 0;
    const reportsCount = stats.reports_count || project.reportsCount || 0;
    const screenshotsCount = stats.screenshots_count || project.screenshotsCount || 0;
    const baselinesCount = stats.baselines_count || project.baselinesCount || 0;

    workspace.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-20);">
        <!-- Top Nav & Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <button class="btn btn-sm" id="btnBackToProjectsList" type="button" style="margin-bottom: 8px;">
              ← Back to Projects
            </button>
            <h1 class="dashboard-title">${escapeHtml(project.name)}</h1>
            <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" class="font-mono text-muted" style="font-size: 12px; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
              ${escapeHtml(project.url)}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
            ${project.description ? `<p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(project.description)}</p>` : ''}
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" id="btnProjectRunQa" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Website QA
            </button>
            <button class="btn" id="btnProjectRunAutomatedQa" type="button">
              Automated QA Suite
            </button>
          </div>
        </div>

        <!-- Project Workspace Tabs -->
        <div class="qa-tabs-bar" id="projectTabsBar">
          <button class="qa-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-ptab="overview" type="button">Overview</button>
          <button class="qa-tab-btn ${activeTab === 'tests' ? 'active' : ''}" data-ptab="tests" type="button">Tests & QA <span class="qa-tab-badge">${testsCount}</span></button>
          <button class="qa-tab-btn ${activeTab === 'reports' ? 'active' : ''}" data-ptab="reports" type="button">Reports <span class="qa-tab-badge">${reportsCount}</span></button>
          <button class="qa-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}" data-ptab="screenshots" type="button">Screenshots <span class="qa-tab-badge">${screenshotsCount}</span></button>
          <button class="qa-tab-btn ${activeTab === 'baselines' ? 'active' : ''}" data-ptab="baselines" type="button">Visual Baselines <span class="qa-tab-badge">${baselinesCount}</span></button>
          <button class="qa-tab-btn ${activeTab === 'settings' ? 'active' : ''}" data-ptab="settings" type="button">Settings</button>
        </div>

        <!-- Tab 1: Overview -->
        <div class="qa-tab-pane ${activeTab === 'overview' ? 'active' : ''}" id="ppane-overview">
          <div class="qa-meta-grid">
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Created Date</span>
              <span class="qa-meta-box-value font-mono">${new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Last Activity</span>
              <span class="qa-meta-box-value font-mono">${new Date(project.updatedAt || project.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Total Tests Executed</span>
              <span class="qa-meta-box-value font-mono">${testsCount}</span>
            </div>
            <div class="qa-meta-box">
              <span class="qa-meta-box-label">Visual Baselines Active</span>
              <span class="qa-meta-box-value font-mono">${baselinesCount}</span>
            </div>
          </div>

          <div class="panel" style="margin-top: 16px;">
            <div class="panel-header">
              <span class="panel-title">Quick Actions</span>
            </div>
            <div class="panel-body" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn-secondary" id="btnQuickWebsiteQa" type="button">🔍 Run Website QA</button>
              <button class="btn btn-secondary" id="btnQuickAutomatedQa" type="button">⚡ Run Automated QA Suite</button>
              <button class="btn btn-secondary" id="btnQuickResponsiveTester" type="button">📱 Open in Responsive Tester</button>
            </div>
          </div>
        </div>

        <!-- Tab 2: Tests & QA -->
        <div class="qa-tab-pane ${activeTab === 'tests' ? 'active' : ''}" id="ppane-tests">
          <div id="projectTestsContainer">Loading tests...</div>
        </div>

        <!-- Tab 3: Reports -->
        <div class="qa-tab-pane ${activeTab === 'reports' ? 'active' : ''}" id="ppane-reports">
          <div id="projectReportsContainer">Loading reports...</div>
        </div>

        <!-- Tab 4: Screenshots -->
        <div class="qa-tab-pane ${activeTab === 'screenshots' ? 'active' : ''}" id="ppane-screenshots">
          <div id="projectScreenshotsContainer">Loading screenshots...</div>
        </div>

        <!-- Tab 5: Visual Baselines -->
        <div class="qa-tab-pane ${activeTab === 'baselines' ? 'active' : ''}" id="ppane-baselines">
          <div id="projectBaselinesContainer">Loading baselines...</div>
        </div>

        <!-- Tab 6: Settings -->
        <div class="qa-tab-pane ${activeTab === 'settings' ? 'active' : ''}" id="ppane-settings">
          <div class="panel" style="max-width: 600px;">
            <div class="panel-header">
              <span class="panel-title">Project Configuration</span>
            </div>
            <div class="panel-body" style="padding: 20px;">
              <form id="projectSettingsForm">
                <div class="auth-form-group">
                  <label class="auth-form-label" for="psName">Project Name</label>
                  <input class="auth-form-input" id="psName" type="text" value="${escapeHtml(project.name)}" required>
                </div>
                <div class="auth-form-group">
                  <label class="auth-form-label" for="psUrl">Website URL</label>
                  <input class="auth-form-input" id="psUrl" type="url" value="${escapeHtml(project.url)}" required>
                </div>
                <div class="auth-form-group">
                  <label class="auth-form-label" for="psDesc">Description</label>
                  <textarea class="auth-form-input" id="psDesc" rows="3">${escapeHtml(project.description || '')}</textarea>
                </div>
                <button class="btn btn-primary" type="submit">Save Changes</button>
              </form>

              <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border-subtle);">

              <div>
                <h4 style="color: var(--status-warning, #dc2626); margin: 0 0 8px;">Danger Zone</h4>
                <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Permanently delete this project and all its associated reports, screenshots, and visual baselines.</p>
                <button class="btn" id="btnProjectDeleteDanger" type="button" style="color: var(--status-warning, #dc2626); border-color: var(--status-warning, #dc2626);">Delete Project</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Back Button
    document.getElementById('btnBackToProjectsList')?.addEventListener('click', closeProjectWorkspace);

    // Bind Quick Actions
    document.getElementById('btnProjectRunQa')?.addEventListener('click', () => runQaForProject(project));
    document.getElementById('btnQuickWebsiteQa')?.addEventListener('click', () => runQaForProject(project));
    document.getElementById('btnProjectRunAutomatedQa')?.addEventListener('click', () => runAutomatedQaForProject(project));
    document.getElementById('btnQuickAutomatedQa')?.addEventListener('click', () => runAutomatedQaForProject(project));
    document.getElementById('btnQuickResponsiveTester')?.addEventListener('click', () => runResponsiveForProject(project));

    // Bind Settings Form
    const settingsForm = document.getElementById('projectSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('psName').value;
        const url = document.getElementById('psUrl').value;
        const description = document.getElementById('psDesc').value;
        try {
          await window.ProjectManager.updateProject(project.id, { name, url, description });
          alert('Project updated successfully.');
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
    }

    // Bind Delete
    document.getElementById('btnProjectDeleteDanger')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to permanently delete "${project.name}"? All associated reports, screenshots, and baselines will be removed.`)) {
        await window.ProjectManager.deleteProject(project.id);
        closeProjectWorkspace();
      }
    });

    // Tab Switcher
    const ptabs = workspace.querySelectorAll('#projectTabsBar .qa-tab-btn');
    ptabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-ptab');
        activeTab = target;
        ptabs.forEach(b => b.classList.remove('active'));
        workspace.querySelectorAll('.qa-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetPane = document.getElementById(`ppane-${target}`);
        if (targetPane) targetPane.classList.add('active');

        if (target === 'tests') loadProjectTests(project.id);
        if (target === 'reports') loadProjectReports(project.id);
        if (target === 'screenshots') loadProjectScreenshots(project.id);
        if (target === 'baselines') loadProjectBaselines(project.id);
      });
    });

    // Auto-load initial active tab content
    if (activeTab === 'tests') loadProjectTests(project.id);
    if (activeTab === 'reports') loadProjectReports(project.id);
    if (activeTab === 'screenshots') loadProjectScreenshots(project.id);
    if (activeTab === 'baselines') loadProjectBaselines(project.id);
  }

  async function loadProjectTests(projectId) {
    const container = document.getElementById('projectTestsContainer');
    if (!container) return;
    try {
      const res = await fetch(`/api/history?project_id=${projectId}&limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 32px;">
            <div class="empty-state-title">No tests recorded for this project yet</div>
            <div class="empty-state-text">Execute a QA Scan or Automated QA Suite run to record results.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Test Suite</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(h => `
                <tr>
                  <td class="font-mono">${new Date(h.createdAt).toLocaleString()}</td>
                  <td><strong>${escapeHtml(h.testType)}</strong></td>
                  <td class="font-mono truncate" style="max-width: 250px;">${escapeHtml(h.targetUrl)}</td>
                  <td><span class="badge ${h.status === 'passed' ? 'badge-success' : (h.status === 'failed' ? 'badge-danger' : 'badge-accent')} font-mono">${h.status}</span></td>
                  <td class="font-mono">${h.durationMs ? (h.durationMs / 1000).toFixed(1) + 's' : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="empty-state">Failed to load tests.</div>`;
    }
  }

  async function loadProjectReports(projectId) {
    const container = document.getElementById('projectReportsContainer');
    if (!container) return;
    try {
      const res = await fetch(`/api/reports?project_id=${projectId}&limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (!data.reports || data.reports.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 32px;">
            <div class="empty-state-title">No reports saved for this project</div>
            <div class="empty-state-text">Save results from Automated QA Suite to populate reports.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Created At</th>
                <th>Test Type</th>
                <th>Target URL</th>
                <th>Screenshots</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.reports.map(r => `
                <tr>
                  <td class="font-mono">${new Date(r.createdAt).toLocaleString()}</td>
                  <td><strong>${escapeHtml(r.testType)}</strong></td>
                  <td class="font-mono truncate" style="max-width: 250px;">${escapeHtml(r.targetUrl)}</td>
                  <td class="font-mono">📸 ${r.screenshotCount || 0}</td>
                  <td>
                    <button class="btn btn-secondary btn-xs js-view-report" data-id="${escapeHtml(r.id)}" type="button">View Report JSON</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      container.querySelectorAll('.js-view-report').forEach(btn => {
        btn.addEventListener('click', async () => {
          const repId = btn.getAttribute('data-id');
          const res = await fetch(`/api/reports/${repId}`, { credentials: 'include' });
          const repData = await res.json();
          if (repData.success) {
            const jsonWindow = window.open('', '_blank');
            if (jsonWindow) {
              jsonWindow.document.write(`<pre style="font-family: monospace; padding: 20px;">${escapeHtml(JSON.stringify(repData.report.result, null, 2))}</pre>`);
            }
          }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state">Failed to load reports.</div>`;
    }
  }

  async function loadProjectScreenshots(projectId) {
    const container = document.getElementById('projectScreenshotsContainer');
    if (!container) return;
    try {
      const res = await fetch(`/api/screenshots?project_id=${projectId}&limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (!data.screenshots || data.screenshots.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 32px;">
            <div class="empty-state-title">No screenshots captured for this project</div>
            <div class="empty-state-text">Screenshots taken in Automated QA or Responsive Tester will appear here.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
          ${data.screenshots.map(s => `
            <div class="panel" style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <strong>${escapeHtml(s.device_name || 'Screenshot')}</strong>
                <span class="qa-dim-tag">${escapeHtml(s.viewport || '1:1')}</span>
              </div>
              <div style="height: 180px; background: #000; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <span class="font-mono text-muted" style="font-size: 11px;">Loading preview...</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span class="font-mono text-muted" style="font-size: 10px;">${new Date(s.created_at).toLocaleDateString()}</span>
                <button class="btn btn-primary btn-xs js-open-full-screenshot" data-id="${escapeHtml(s.id)}" type="button">View Full</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Load thumbnails asynchronously
      data.screenshots.forEach(async s => {
        try {
          const sRes = await fetch(`/api/screenshots/${s.id}`, { credentials: 'include' });
          const sData = await sRes.json();
          if (sData.success && sData.screenshot.data_uri) {
            const btn = container.querySelector(`button[data-id="${s.id}"]`);
            if (btn) {
              const card = btn.closest('.panel');
              const previewBox = card.querySelector('div[style*="height: 180px"]');
              if (previewBox) {
                previewBox.innerHTML = `<img src="${sData.screenshot.data_uri}" style="width: 100%; height: 100%; object-fit: contain;" alt="Screenshot">`;
              }
              btn.onclick = () => {
                const win = window.open('', '_blank');
                if (win) {
                  win.document.write(`<img src="${sData.screenshot.data_uri}" style="max-width: 100%; display: block; margin: auto;">`);
                }
              };
            }
          }
        } catch (err) {}
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state">Failed to load screenshots.</div>`;
    }
  }

  async function loadProjectBaselines(projectId) {
    const container = document.getElementById('projectBaselinesContainer');
    if (!container) return;
    try {
      const res = await fetch(`/api/baselines?project_id=${projectId}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.baselines || data.baselines.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 32px;">
            <div class="empty-state-title">No visual baselines defined for this project</div>
            <div class="empty-state-text">Capture a baseline snapshot in Automated QA to track layout regressions over time.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="qa-table-wrapper">
          <table class="qa-data-table">
            <thead>
              <tr>
                <th>Device Profile</th>
                <th>Dimensions</th>
                <th>Browser</th>
                <th>Orientation</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${data.baselines.map(b => `
                <tr>
                  <td><strong>${escapeHtml(b.device_name)}</strong></td>
                  <td class="font-mono">${b.viewport_width} × ${b.viewport_height} (${b.dpr}x)</td>
                  <td style="text-transform: capitalize;">${escapeHtml(b.browser)}</td>
                  <td style="text-transform: capitalize;">${escapeHtml(b.orientation)}</td>
                  <td class="font-mono">${new Date(b.updated_at).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-secondary btn-xs js-view-baseline" data-id="${escapeHtml(b.id)}" type="button">👁️ View</button>
                    <button class="btn btn-xs js-delete-baseline" data-id="${escapeHtml(b.id)}" type="button" style="color: var(--status-warning);">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      container.querySelectorAll('.js-view-baseline').forEach(btn => {
        btn.addEventListener('click', async () => {
          const bId = btn.getAttribute('data-id');
          const res = await fetch(`/api/baselines/${bId}`, { credentials: 'include' });
          const bData = await res.json();
          if (bData.success && bData.baseline.baseline_data_uri) {
            const win = window.open('', '_blank');
            if (win) {
              win.document.write(`<div style="background: #1e293b; min-height: 100vh; padding: 20px; display: flex; justify-content: center;"><img src="${bData.baseline.baseline_data_uri}" style="max-width: 100%; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5);"></div>`);
            }
          }
        });
      });

      container.querySelectorAll('.js-delete-baseline').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this visual baseline?')) {
            const bId = btn.getAttribute('data-id');
            await fetch(`/api/baselines/${bId}`, { method: 'DELETE', credentials: 'include' });
            loadProjectBaselines(projectId);
          }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state">Failed to load visual baselines.</div>`;
    }
  }

  function runQaForProject(project, targetUrl = null) {
    if (window.WebsiteQa) {
      window.WebsiteQa.setActiveProject(project);
      window.WebsiteQa.open(targetUrl || project.url);
    }
  }

  function runAutomatedQaForProject(project) {
    const navAutoQa = document.getElementById('navAutomatedQa');
    if (navAutoQa) navAutoQa.click();
    if (window.AutomatedQaToolInstance) {
      window.AutomatedQaToolInstance.loadUrl(project.url);
    }
  }

  function runResponsiveForProject(project) {
    const navResp = document.getElementById('navResponsiveTester');
    if (navResp) navResp.click();
    const urlInput = document.getElementById('targetUrl');
    if (urlInput) {
      urlInput.value = project.url;
      const loadBtn = document.getElementById('btnLoadUrl');
      if (loadBtn) loadBtn.click();
    }
  }

  // --- MODALS ---

  function openCreateModal() {
    const modal = document.getElementById('projectCreateModal');
    if (!modal) return;
    modal.classList.add('open');
    document.getElementById('modalCreateName').value = '';
    document.getElementById('modalCreateUrl').value = '';
    document.getElementById('modalCreateDesc').value = '';
    document.getElementById('modalCreateName').focus();
  }

  function setupCreateProjectModal() {
    const modal = document.getElementById('projectCreateModal');
    const form = document.getElementById('projectCreateForm');
    const closeBtn = document.getElementById('closeCreateProjectModal');
    const cancelBtn = document.getElementById('cancelCreateProjectModal');

    document.querySelectorAll('.js-create-project, .js-trigger-create-project').forEach(b => {
      b.addEventListener('click', openCreateModal);
    });

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('open'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('modalCreateName').value;
        const url = document.getElementById('modalCreateUrl').value;
        const desc = document.getElementById('modalCreateDesc').value;

        try {
          const newProj = await window.ProjectManager.createProject({ name, url, description: desc });
          modal.classList.remove('open');
          renderProjectsList();
          openProjectWorkspace(newProj.id);
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  function openEditModal(project) {
    const modal = document.getElementById('projectEditModal');
    if (!modal) return;
    modal.classList.add('open');
    document.getElementById('modalEditId').value = project.id;
    document.getElementById('modalEditName').value = project.name;
    document.getElementById('modalEditUrl').value = project.url;
    document.getElementById('modalEditDesc').value = project.description || '';
  }

  function setupEditProjectModal() {
    const modal = document.getElementById('projectEditModal');
    const form = document.getElementById('projectEditForm');
    const closeBtn = document.getElementById('closeEditProjectModal');
    const cancelBtn = document.getElementById('cancelEditProjectModal');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('open'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('modalEditId').value;
        const name = document.getElementById('modalEditName').value;
        const url = document.getElementById('modalEditUrl').value;
        const desc = document.getElementById('modalEditDesc').value;

        try {
          await window.ProjectManager.updateProject(id, { name, url, description: desc });
          modal.classList.remove('open');
        } catch (err) {
          alert(err.message);
        }
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

  window.ProjectsView = {
    open: openProjects,
    openWorkspace: openProjectWorkspace,
    openCreateModal,
    renderDashboardProjects
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
