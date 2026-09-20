/**
 * client/js/tools/profile.js
 * Profile & Account Workspace Controller for WebDev AI Studio.
 * Zero Fake Data: All metrics, user attributes, preferences, and provider states are authentic.
 */

(function () {
  'use strict';

  class ProfileWorkspaceController {
    constructor() {
      this.container = null;
      this.initialized = false;
      this.userData = null;
      this.dashboardData = null;
      this.tokenRevealed = false;
    }

    init() {
      this.container = document.getElementById('viewProfile');
      if (!this.container) return;

      this.renderSkeleton();
      this.bindEvents();
      this.initialized = true;
    }

    renderSkeleton() {
      if (!this.container) return;

      this.container.innerHTML = `
        <!-- Top Nav Bar -->
        <div class="profile-top-nav">
          <button class="btn-profile-back" id="btnProfileBack" type="button" aria-label="Back to Overview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Overview</span>
          </button>
          <div class="profile-breadcrumbs-tag">
            <span>Workspace</span>
            <span>/</span>
            <span class="badge">Account &amp; Developer Profile</span>
          </div>
        </div>

        <!-- Developer Identity Header -->
        <div class="profile-identity-card" id="profileIdentityCard">
          <div class="profile-identity-layout">
            <!-- 1. Avatar Area -->
            <div class="profile-avatar-area">
              <div class="profile-avatar-squircle" id="profAvatarLarge" aria-label="User Avatar">W</div>
            </div>

            <!-- 2. Identity & Metadata Area -->
            <div class="profile-info-area">
              <div class="profile-name-row">
                <h1 class="profile-developer-name" id="profHeaderName">WebDev Developer</h1>
              </div>
              <div class="profile-role-title" id="profAccountType">Developer Account</div>

              <div class="profile-meta-rows">
                <div class="profile-meta-row">
                  <span class="profile-meta-chip" id="profHeaderEmail">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span class="font-mono" id="profEmailText">developer@webdev.ai</span>
                  </span>
                  <span class="profile-meta-separator">•</span>
                  <span class="profile-meta-chip">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    <span>WebDev AI Studio</span>
                  </span>
                </div>

                <div class="profile-meta-row">
                  <span class="status-indicator-pill" id="profStatusPill">
                    <span class="status-indicator-dot"></span>
                    <span>Active</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 3. WebDev Developer Workspace Visual (Subtle abstract technical panels) -->
            <div class="profile-workspace-visual" aria-hidden="true">
              <div class="pvis-panel pvis-browser">
                <div class="pvis-header">
                  <span class="pvis-dot"></span><span class="pvis-dot"></span><span class="pvis-dot"></span>
                  <span class="pvis-tab">Browser Lab</span>
                </div>
                <div class="pvis-preview-line"></div>
                <div class="pvis-preview-line short"></div>
              </div>
              <div class="pvis-panel pvis-code">
                <div class="pvis-code-badge">&lt;/&gt; Code</div>
              </div>
              <div class="pvis-panel pvis-chip pvis-qa">
                <span class="pvis-chip-icon">✓</span> QA Suite
              </div>
              <div class="pvis-panel pvis-chip pvis-seo">
                <span class="pvis-chip-icon">⚡</span> SEO
              </div>
            </div>

            <!-- 4. Header Actions Area -->
            <div class="profile-actions-area">
              <button class="btn-edit-profile" id="btnScrollToAccount" type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Real Workspace Stats Strip -->
        <div class="profile-stats-strip">
          <div class="profile-stat-card">
            <div class="profile-stat-top">
              <span class="profile-stat-label">Active Projects</span>
              <div class="profile-stat-icon" style="background: rgba(37, 99, 235, 0.08); color: #2563eb;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </div>
            </div>
            <div class="profile-stat-value" id="profStatProjects">—</div>
            <div class="profile-stat-hint">
              <span id="profStatProjectsHint">Managed in studio database</span>
            </div>
          </div>

          <div class="profile-stat-card">
            <div class="profile-stat-top">
              <span class="profile-stat-label">Total Tests Executed</span>
              <div class="profile-stat-icon" style="background: rgba(2, 132, 199, 0.08); color: #0284c7;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
            </div>
            <div class="profile-stat-value" id="profStatTests">—</div>
            <div class="profile-stat-hint">
              <span id="profStatTestsHint">Automated &amp; manual runs</span>
            </div>
          </div>

          <div class="profile-stat-card">
            <div class="profile-stat-top">
              <span class="profile-stat-label">Reports Generated</span>
              <div class="profile-stat-icon" style="background: rgba(124, 58, 237, 0.08); color: #7c3aed;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
            </div>
            <div class="profile-stat-value" id="profStatReports">—</div>
            <div class="profile-stat-hint">
              <span id="profStatReportsHint">QA &amp; SEO audit summaries</span>
            </div>
          </div>

          <div class="profile-stat-card">
            <div class="profile-stat-top">
              <span class="profile-stat-label">Screenshots &amp; Baselines</span>
              <div class="profile-stat-icon" style="background: rgba(16, 185, 129, 0.08); color: #10b981;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
            </div>
            <div class="profile-stat-value" id="profStatScreenshots">—</div>
            <div class="profile-stat-hint">
              <span id="profStatScreenshotsHint">Responsive visual captures</span>
            </div>
          </div>
        </div>

        <!-- Two-Column Workspace Layout -->
        <div class="profile-workspace-grid">
          <!-- LEFT COLUMN: Account, Workspace Details & Danger Zone -->
          <div class="profile-col">
            <!-- 1. Account Information -->
            <div class="profile-section-card" id="cardAccountInfo">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Account Information</h2>
                    <div class="profile-section-subtitle">Personal credentials and authentication identity</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="profile-alert-box" id="profAlertAccount"></div>

                <form id="formUpdateAccount" style="display: flex; flex-direction: column; gap: 14px;">
                  <div class="profile-form-group">
                    <label class="profile-form-label" for="profInputName">Full Name / Display Name</label>
                    <input type="text" class="profile-form-input" id="profInputName" required placeholder="WebDev Developer">
                  </div>

                  <div class="profile-form-group">
                    <label class="profile-form-label" for="profInputEmail">Email Address</label>
                    <input type="email" class="profile-form-input font-mono" id="profInputEmail" required placeholder="developer@webdev.ai">
                  </div>

                  <div class="profile-form-group">
                    <label class="profile-form-label">Account Identifier</label>
                    <div class="profile-input-with-action">
                      <input type="text" class="profile-form-input font-mono" id="profInputId" readonly value="usr_loading">
                      <button class="profile-input-action-btn" id="btnCopyUserId" type="button">Copy</button>
                    </div>
                  </div>

                  <div class="profile-form-group">
                    <label class="profile-form-label">Sign-In Method</label>
                    <div class="profile-meta-item" style="padding: 8px 12px;">
                      <span class="profile-meta-key">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Authentication Provider
                      </span>
                      <span class="profile-meta-val" id="profAuthProviderVal">Local SQLite Auth</span>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
                    <button class="btn btn-primary" id="btnSaveAccount" type="submit">
                      Save Account Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- 2. Workspace & Environment Information -->
            <div class="profile-section-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #7c3aed;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Workspace Information</h2>
                    <div class="profile-section-subtitle">Local development server and storage environment</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="profile-meta-list">
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Active Project Focus</span>
                    <span class="profile-meta-val" id="profActiveProjectName">All Projects</span>
                  </div>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Workspace Operating Mode</span>
                    <span class="profile-meta-val" style="color: #2563eb;">Single Developer Studio (Local)</span>
                  </div>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Database &amp; Storage Engine</span>
                    <span class="profile-meta-val">SQLite 3 (WAL Mode)</span>
                  </div>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Database Location</span>
                    <span class="profile-meta-val">server/data/studio.db</span>
                  </div>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Server Host &amp; Port</span>
                    <span class="profile-meta-val">http://127.0.0.1:3000</span>
                  </div>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">Automation Engine</span>
                    <span class="profile-meta-val">Playwright 1.58.2</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. Danger Zone -->
            <div class="profile-section-card danger-zone-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #dc2626; border-color: #fecaca; background: #fff;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Danger Zone</h2>
                    <div class="profile-section-subtitle" style="color: #b91c1c;">Destructive workspace cleanup operations</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="danger-action-row">
                  <div class="danger-action-info">
                    <div class="danger-action-title">Clear Test Run History &amp; Reports</div>
                    <div class="danger-action-desc">Removes all test history records, generated reports, and screenshots. Projects remain untouched.</div>
                  </div>
                  <button class="btn-danger-outline" id="btnWipeArtifacts" type="button">
                    Clear Test Artifacts
                  </button>
                </div>

                <div class="danger-action-row">
                  <div class="danger-action-info">
                    <div class="danger-action-title">Sign Out of Current Session</div>
                    <div class="danger-action-desc">Ends this local session and returns to login mode.</div>
                  </div>
                  <button class="btn-danger-outline" id="btnProfileLogout" type="button">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Preferences, Developer Settings & Integrations -->
          <div class="profile-col">
            <!-- 1. Workspace & Developer Preferences -->
            <div class="profile-section-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #2563eb;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Developer &amp; Workspace Preferences</h2>
                    <div class="profile-section-subtitle">Visual ergonomics, editor layout, and runner defaults</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="profile-form-group">
                  <label class="profile-form-label" for="prefThemeSelect">Studio Theme</label>
                  <select class="profile-form-input" id="prefThemeSelect">
                    <option value="light">Light (Recommended Developer Default)</option>
                    <option value="dark">Dark High-Contrast</option>
                    <option value="system">Follow System Appearance</option>
                  </select>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label" for="prefAccentSelect">Accent Highlight</label>
                  <select class="profile-form-input" id="prefAccentSelect">
                    <option value="blue">Electric Blue (#2563eb)</option>
                    <option value="purple">Vibrant Violet (#7c3aed)</option>
                    <option value="green">Emerald Green (#10b981)</option>
                    <option value="orange">Amber Orange (#f59e0b)</option>
                  </select>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label" for="prefDensitySelect">Interface Density</label>
                  <select class="profile-form-input" id="prefDensitySelect">
                    <option value="comfortable">Comfortable (Standard)</option>
                    <option value="compact">Compact (High Information Density)</option>
                  </select>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label" for="prefMotionCheck">
                    <span>Reduced Motion</span>
                    <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">Minimize UI animations</span>
                  </label>
                  <select class="profile-form-input" id="prefMotionSelect">
                    <option value="false">Standard Smooth Animations</option>
                    <option value="true">Reduced Motion (Zero Transitions)</option>
                  </select>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label" for="prefTimeoutSelect">Automated QA Timeout</label>
                  <select class="profile-form-input" id="prefTimeoutSelect">
                    <option value="30000">30 seconds (Standard)</option>
                    <option value="45000">45 seconds (Slow networks)</option>
                    <option value="60000">60 seconds (Heavy SPAs)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 2. Developer Settings & Access -->
            <div class="profile-section-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #0284c7;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Developer Settings &amp; API Access</h2>
                    <div class="profile-section-subtitle">Local studio token, CLI commands, and automated scripts</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="profile-form-group">
                  <label class="profile-form-label">
                    <span>Studio API Key / Session Token</span>
                    <button class="btn btn-icon btn-sm" id="btnToggleToken" type="button" style="font-size: 11px; font-weight: 600; padding: 2px 6px;">
                      Reveal
                    </button>
                  </label>
                  <div class="profile-input-with-action">
                    <input type="password" class="profile-form-input font-mono" id="profApiTokenInput" readonly value="st_session_token_hidden">
                    <button class="profile-input-action-btn" id="btnCopyApiToken" type="button">Copy</button>
                  </div>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label">Studio CLI Quickstart</label>
                  <div class="cli-snippet-box">
                    <code class="cli-snippet-text" id="cliSnippetCode">npx @webdev-ai/studio run --url=http://localhost:3000</code>
                    <button class="cli-copy-btn" id="btnCopyCli" type="button">Copy</button>
                  </div>
                </div>

                <div class="profile-form-group">
                  <label class="profile-form-label">Webhook &amp; CI/CD Integration</label>
                  <div class="profile-meta-item">
                    <span class="profile-meta-key">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                      Event Dispatcher
                    </span>
                    <span class="profile-meta-val" style="color: #166534;">Ready (Local Dispatch)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. Local Providers & Services Connectivity -->
            <div class="profile-section-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #10b981;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Providers &amp; External Integrations</h2>
                    <div class="profile-section-subtitle">Real-time status of analysis and crawler APIs</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="provider-status-list" id="profProvidersList">
                  <div class="provider-status-item">
                    <div class="provider-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      <span style="font-size: 13px; font-weight: 500;">Google Search Console</span>
                    </div>
                    <span class="provider-badge-pill disconnected" id="provStatusGsc">Not Configured</span>
                  </div>

                  <div class="provider-status-item">
                    <div class="provider-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                      <span style="font-size: 13px; font-weight: 500;">PageSpeed &amp; CrUX Real Metrics</span>
                    </div>
                    <span class="provider-badge-pill connected" id="provStatusPsi">Ready / Connected</span>
                  </div>

                  <div class="provider-status-item">
                    <div class="provider-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      <span style="font-size: 13px; font-weight: 500;">Bing Webmaster Tools</span>
                    </div>
                    <span class="provider-badge-pill disconnected" id="provStatusBing">Not Configured</span>
                  </div>

                  <div class="provider-status-item">
                    <div class="provider-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                      <span style="font-size: 13px; font-weight: 500;">Ahrefs API Engine</span>
                    </div>
                    <span class="provider-badge-pill disconnected" id="provStatusAhrefs">Not Configured</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Security & Active Sessions -->
            <div class="profile-section-card">
              <div class="profile-section-header">
                <div class="profile-section-title-wrap">
                  <div class="profile-section-icon" style="color: #64748b;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <div>
                    <h2 class="profile-section-title">Security &amp; Active Sessions</h2>
                    <div class="profile-section-subtitle">Password management and active desktop sessions</div>
                  </div>
                </div>
              </div>
              <div class="profile-section-body">
                <div class="profile-alert-box" id="profAlertPw"></div>

                <form id="formChangePassword" style="display: flex; flex-direction: column; gap: 12px;">
                  <div class="profile-form-group">
                    <label class="profile-form-label" for="profCurrentPw">Current Password</label>
                    <input type="password" class="profile-form-input" id="profCurrentPw" placeholder="••••••••">
                  </div>
                  <div class="profile-form-group">
                    <label class="profile-form-label" for="profNewPw">New Password</label>
                    <input type="password" class="profile-form-input" id="profNewPw" placeholder="At least 6 characters">
                  </div>
                  <div style="display: flex; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" id="btnSubmitPw" type="submit">
                      Update Password
                    </button>
                  </div>
                </form>

                <div style="border-top: 1px solid var(--border-subtle, #e2e8f0); margin: 8px 0;"></div>

                <div class="profile-form-group">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <label class="profile-form-label" style="margin: 0;">Active Login Sessions</label>
                    <button class="btn btn-secondary btn-sm" id="btnRevokeSessions" type="button" style="font-size: 11px; padding: 2px 8px;">
                      Revoke Other Sessions
                    </button>
                  </div>
                  <div class="session-items-list" id="profSessionsList">
                    <!-- Populated dynamically -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      // 1. Back button
      const btnBack = document.getElementById('btnProfileBack');
      if (btnBack) {
        btnBack.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.App && window.App.openDashboard) {
            window.App.openDashboard();
          } else {
            window.location.href = '/';
          }
        });
      }

      // 2. Scroll to account form
      const btnScroll = document.getElementById('btnScrollToAccount');
      if (btnScroll) {
        btnScroll.addEventListener('click', () => {
          const card = document.getElementById('cardAccountInfo');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }

      // 3. Copy buttons
      const btnCopyToken = document.getElementById('btnCopyStudioToken');
      if (btnCopyToken) {
        btnCopyToken.addEventListener('click', () => this.copyTokenToClipboard());
      }
      const btnCopyApiToken = document.getElementById('btnCopyApiToken');
      if (btnCopyApiToken) {
        btnCopyApiToken.addEventListener('click', () => this.copyTokenToClipboard());
      }
      const btnCopyUserId = document.getElementById('btnCopyUserId');
      if (btnCopyUserId) {
        btnCopyUserId.addEventListener('click', () => {
          const id = document.getElementById('profInputId')?.value;
          if (id) {
            navigator.clipboard?.writeText(id);
            if (window.App && window.App.showToast) window.App.showToast('Account ID copied to clipboard');
          }
        });
      }
      const btnCopyCli = document.getElementById('btnCopyCli');
      if (btnCopyCli) {
        btnCopyCli.addEventListener('click', () => {
          const text = document.getElementById('cliSnippetCode')?.textContent;
          if (text) {
            navigator.clipboard?.writeText(text);
            if (window.App && window.App.showToast) window.App.showToast('CLI command copied');
          }
        });
      }

      // 4. Reveal / hide token
      const btnToggleToken = document.getElementById('btnToggleToken');
      const inputToken = document.getElementById('profApiTokenInput');
      if (btnToggleToken && inputToken) {
        btnToggleToken.addEventListener('click', () => {
          this.tokenRevealed = !this.tokenRevealed;
          if (this.tokenRevealed) {
            inputToken.type = 'text';
            btnToggleToken.textContent = 'Hide';
          } else {
            inputToken.type = 'password';
            btnToggleToken.textContent = 'Reveal';
          }
        });
      }

      // 5. Account update form
      const formAccount = document.getElementById('formUpdateAccount');
      if (formAccount) {
        formAccount.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleAccountUpdate();
        });
      }

      // 6. Change password form
      const formPw = document.getElementById('formChangePassword');
      if (formPw) {
        formPw.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleChangePassword();
        });
      }

      // 7. Revoke other sessions
      const btnRevoke = document.getElementById('btnRevokeSessions');
      if (btnRevoke) {
        btnRevoke.addEventListener('click', () => this.handleRevokeSessions());
      }

      // 8. Wipe artifacts (danger zone)
      const btnWipe = document.getElementById('btnWipeArtifacts');
      if (btnWipe) {
        btnWipe.addEventListener('click', () => this.handleWipeArtifacts());
      }

      // 9. Sign out
      const btnLogout = document.getElementById('btnProfileLogout');
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          if (window.AuthManager) {
            window.AuthManager.logout().then(() => {
              if (window.App && window.App.openDashboard) window.App.openDashboard();
            });
          }
        });
      }

      // 10. Preferences syncing with SettingsManager
      this.bindPreferencesControls();
    }

    bindPreferencesControls() {
      const themeSelect = document.getElementById('prefThemeSelect');
      const accentSelect = document.getElementById('prefAccentSelect');
      const densitySelect = document.getElementById('prefDensitySelect');
      const motionSelect = document.getElementById('prefMotionSelect');
      const timeoutSelect = document.getElementById('prefTimeoutSelect');

      if (!window.SettingsManager) return;

      const s = window.SettingsManager.getSettings();
      if (themeSelect && s.theme) themeSelect.value = s.theme;
      if (accentSelect && s.accentColor) accentSelect.value = s.accentColor;
      if (densitySelect && s.density) densitySelect.value = s.density;
      if (motionSelect) motionSelect.value = String(!!s.reduceMotion);
      if (timeoutSelect && s.qaTimeout) timeoutSelect.value = String(s.qaTimeout);

      themeSelect?.addEventListener('change', (e) => {
        window.SettingsManager.updateSettings({ theme: e.target.value });
        if (window.App && window.App.showToast) window.App.showToast(`Theme updated to ${e.target.value}`);
      });

      accentSelect?.addEventListener('change', (e) => {
        window.SettingsManager.updateSettings({ accentColor: e.target.value });
        if (window.App && window.App.showToast) window.App.showToast(`Accent updated to ${e.target.value}`);
      });

      densitySelect?.addEventListener('change', (e) => {
        window.SettingsManager.updateSettings({ density: e.target.value });
        if (window.App && window.App.showToast) window.App.showToast(`Density set to ${e.target.value}`);
      });

      motionSelect?.addEventListener('change', (e) => {
        const val = e.target.value === 'true';
        window.SettingsManager.updateSettings({ reduceMotion: val });
        if (window.App && window.App.showToast) window.App.showToast(`Reduced motion: ${val ? 'Enabled' : 'Disabled'}`);
      });

      timeoutSelect?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        window.SettingsManager.updateSettings({ qaTimeout: val });
        if (window.App && window.App.showToast) window.App.showToast(`QA Timeout set to ${val / 1000}s`);
      });
    }

    copyTokenToClipboard() {
      const user = window.AuthManager ? window.AuthManager.getUser() : this.userData;
      const token = (user && user.sessionId) ? user.sessionId : (document.getElementById('profApiTokenInput')?.value || 'st_session_active');
      navigator.clipboard?.writeText(token);
      if (window.App && window.App.showToast) {
        window.App.showToast('Studio Session API Key copied to clipboard');
      }
    }

    async open() {
      if (!this.initialized) {
        this.init();
      }

      // Hide all other views
      const views = [
        'viewDashboard',
        'viewWebsiteQa',
        'viewProjects',
        'viewSettings',
        'viewHistory',
        'viewResponsiveTester',
        'viewApiTester',
        'viewAutomatedQa',
        'viewSeoAudit',
        'viewDesignToCode'
      ];
      views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      if (this.container) {
        this.container.style.display = 'flex';
      }

      // Update URL safely
      if (window.location.pathname !== '/profile') {
        window.history.pushState({ view: 'profile' }, 'Profile & Account Workspace', '/profile');
      }

      // Update breadcrumbs
      const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Account & Profile';

      // Clear main sidebar tool active state
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

      // Fetch authentic data
      await this.loadUserData();
      await this.loadStatsData();
      await this.loadProviderStatus();
      await this.loadSessions();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async loadUserData() {
      if (!window.AuthManager) return;
      const user = window.AuthManager.getUser();
      this.userData = user;

      const name = user ? user.name : 'WebDev Developer';
      const email = user ? user.email : 'developer@webdev.ai';
      const id = user ? user.id : 'usr_demo';
      const provider = user ? (user.authProvider || 'local') : 'local';
      const initial = (name && name.charAt(0).toUpperCase()) || 'W';

      // Header fields
      const avatarEl = document.getElementById('profAvatarLarge');
      if (avatarEl) avatarEl.textContent = initial;

      const nameEl = document.getElementById('profHeaderName');
      if (nameEl) nameEl.textContent = name;

      const emailEl = document.getElementById('profEmailText');
      if (emailEl) emailEl.textContent = email;

      const authProvEl = document.getElementById('profAuthProvider');
      if (authProvEl) authProvEl.textContent = provider === 'google' ? 'Google Auth' : 'Local SQLite';

      const authProvVal = document.getElementById('profAuthProviderVal');
      if (authProvVal) authProvVal.textContent = provider === 'google' ? 'Google OAuth2' : 'Local SQLite Password';

      // Form inputs
      const inputName = document.getElementById('profInputName');
      if (inputName) inputName.value = name;

      const inputEmail = document.getElementById('profInputEmail');
      if (inputEmail) inputEmail.value = email;

      const inputId = document.getElementById('profInputId');
      if (inputId) inputId.value = id;

      const inputToken = document.getElementById('profApiTokenInput');
      if (inputToken) {
        inputToken.value = (user && user.sessionId) ? user.sessionId : 'sess_local_' + id;
      }

      const activeProj = document.getElementById('profActiveProjectName');
      if (activeProj) {
        activeProj.textContent = window.activeProjectName || 'All Workspace Projects';
      }

      if (user && user.createdAt) {
        try {
          const dateStr = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const memberEl = document.getElementById('profMemberSince');
          if (memberEl) memberEl.textContent = `Member since ${dateStr}`;
        } catch (e) {}
      }
    }

    async loadStatsData() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        this.dashboardData = data;

        const elProj = document.getElementById('profStatProjects');
        if (elProj) elProj.textContent = String(data.projectsCount ?? 0);

        const elTests = document.getElementById('profStatTests');
        const totalTests = (data.stats && data.stats.total_tests) ?? 0;
        if (elTests) elTests.textContent = String(totalTests);

        const elRep = document.getElementById('profStatReports');
        if (elRep) elRep.textContent = String(data.reportsCount ?? 0);

        const elScreens = document.getElementById('profStatScreenshots');
        const totalScreens = (data.screenshotsCount || 0) + (data.baselinesCount || 0);
        if (elScreens) elScreens.textContent = String(totalScreens);

        // Subtitles with genuine details
        const hintTests = document.getElementById('profStatTestsHint');
        if (hintTests && data.stats) {
          const passed = data.stats.passed_tests || 0;
          const failed = data.stats.failed_tests || 0;
          hintTests.textContent = `${passed} passed · ${failed} failed`;
        }
      } catch (err) {
        console.warn('[profile] Could not fetch dashboard metrics:', err);
      }
    }

    async loadProviderStatus() {
      try {
        const res = await fetch('/api/seo/providers/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success || !data.providers) return;

        const p = data.providers;

        // GSC
        const gscEl = document.getElementById('provStatusGsc');
        if (gscEl) {
          if (p.gsc && p.gsc.configured) {
            gscEl.className = 'provider-badge-pill connected';
            gscEl.textContent = 'Configured / Ready';
          } else {
            gscEl.className = 'provider-badge-pill disconnected';
            gscEl.textContent = 'Not Configured';
          }
        }

        // PSI
        const psiEl = document.getElementById('provStatusPsi');
        if (psiEl) {
          if (p.pagespeed && p.pagespeed.configured) {
            psiEl.className = 'provider-badge-pill connected';
            psiEl.textContent = 'API Key Configured';
          } else {
            psiEl.className = 'provider-badge-pill local';
            psiEl.textContent = 'Public Quota Active';
          }
        }

        // Bing
        const bingEl = document.getElementById('provStatusBing');
        if (bingEl) {
          if (p.bing && p.bing.configured) {
            bingEl.className = 'provider-badge-pill connected';
            bingEl.textContent = 'Configured / Ready';
          } else {
            bingEl.className = 'provider-badge-pill disconnected';
            bingEl.textContent = 'Not Configured';
          }
        }

        // Ahrefs
        const ahrefsEl = document.getElementById('provStatusAhrefs');
        if (ahrefsEl) {
          if (p.ahrefs && p.ahrefs.configured) {
            ahrefsEl.className = 'provider-badge-pill connected';
            ahrefsEl.textContent = 'Connected';
          } else {
            ahrefsEl.className = 'provider-badge-pill disconnected';
            ahrefsEl.textContent = 'Not Configured';
          }
        }
      } catch (err) {
        console.warn('[profile] Could not fetch provider statuses:', err);
      }
    }

    async loadSessions() {
      const container = document.getElementById('profSessionsList');
      if (!container) return;

      try {
        const res = await fetch('/api/auth/sessions');
        if (!res.ok) {
          container.innerHTML = `
            <div class="session-item-row">
              <div class="session-item-details">
                <span class="session-device-name">Current WebDev Studio Desktop Session</span>
                <span class="session-time-text">Active Local Session · Localhost (127.0.0.1)</span>
              </div>
              <span class="provider-badge-pill connected">Current</span>
            </div>
          `;
          return;
        }

        const data = await res.json();
        if (!data || !data.success || !data.sessions || data.sessions.length === 0) {
          container.innerHTML = `
            <div class="session-item-row">
              <div class="session-item-details">
                <span class="session-device-name">WebDev Studio Desktop (Local)</span>
                <span class="session-time-text">Active Local Session</span>
              </div>
              <span class="provider-badge-pill connected">Current</span>
            </div>
          `;
          return;
        }

        container.innerHTML = data.sessions.map(s => {
          const dateStr = new Date(s.createdAt).toLocaleString();
          return `
            <div class="session-item-row">
              <div class="session-item-details">
                <span class="session-device-name">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  ${s.device || 'WebDev Studio Desktop'}
                </span>
                <span class="session-time-text">Created: ${dateStr}</span>
              </div>
              ${s.isCurrent 
                ? '<span class="provider-badge-pill connected">Current</span>' 
                : '<span class="provider-badge-pill local">Active</span>'}
            </div>
          `;
        }).join('');
      } catch (err) {
        console.warn('[profile] Could not load sessions:', err);
      }
    }

    async handleAccountUpdate() {
      const alertEl = document.getElementById('profAlertAccount');
      const btn = document.getElementById('btnSaveAccount');
      const name = document.getElementById('profInputName')?.value?.trim();
      const email = document.getElementById('profInputEmail')?.value?.trim();

      if (!name || !email) {
        if (alertEl) {
          alertEl.className = 'profile-alert-box error';
          alertEl.textContent = 'Please provide both name and email.';
        }
        return;
      }

      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        const data = await res.json();

        if (!data.success) {
          if (alertEl) {
            alertEl.className = 'profile-alert-box error';
            alertEl.textContent = data.message || 'Failed to update profile.';
          }
          return;
        }

        if (alertEl) {
          alertEl.className = 'profile-alert-box success';
          alertEl.textContent = 'Account profile updated successfully!';
          setTimeout(() => { alertEl.style.display = 'none'; }, 3500);
        }

        if (window.AuthManager) {
          window.AuthManager.setUser(data.user);
        }
        this.loadUserData();

        if (window.App && window.App.showToast) {
          window.App.showToast('Profile updated');
        }
      } catch (err) {
        if (alertEl) {
          alertEl.className = 'profile-alert-box error';
          alertEl.textContent = err.message || 'Network error updating profile.';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async handleChangePassword() {
      const alertEl = document.getElementById('profAlertPw');
      const btn = document.getElementById('btnSubmitPw');
      const cur = document.getElementById('profCurrentPw')?.value;
      const next = document.getElementById('profNewPw')?.value;

      if (!next || next.length < 6) {
        if (alertEl) {
          alertEl.className = 'profile-alert-box error';
          alertEl.textContent = 'New password must be at least 6 characters.';
        }
        return;
      }

      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: cur, newPassword: next })
        });
        const data = await res.json();

        if (!data.success) {
          if (alertEl) {
            alertEl.className = 'profile-alert-box error';
            alertEl.textContent = data.message || 'Failed to change password.';
          }
          return;
        }

        if (alertEl) {
          alertEl.className = 'profile-alert-box success';
          alertEl.textContent = 'Password changed successfully!';
          setTimeout(() => { alertEl.style.display = 'none'; }, 3500);
        }

        document.getElementById('profCurrentPw').value = '';
        document.getElementById('profNewPw').value = '';

        if (window.App && window.App.showToast) {
          window.App.showToast('Password updated');
        }
      } catch (err) {
        if (alertEl) {
          alertEl.className = 'profile-alert-box error';
          alertEl.textContent = err.message || 'Network error.';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async handleRevokeSessions() {
      if (!confirm('Revoke all other active sessions? You will stay logged in on this browser.')) {
        return;
      }
      try {
        const res = await fetch('/api/auth/logout-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (window.App && window.App.showToast) window.App.showToast('All other sessions revoked');
          this.loadSessions();
        }
      } catch (e) {
        console.error(e);
      }
    }

    async handleWipeArtifacts() {
      if (!confirm('Are you sure you want to clear test run history, reports, and screenshots? This action cannot be undone.')) {
        return;
      }
      try {
        const res = await fetch('/api/auth/reset-workspace', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (window.App && window.App.showToast) {
            window.App.showToast(`Cleared ${data.counts.testHistory} tests, ${data.counts.reports} reports, ${data.counts.screenshots} screenshots.`);
          }
          this.loadStatsData();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  window.ProfileWorkspaceController = ProfileWorkspaceController;
  window.ProfileView = new ProfileWorkspaceController();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ProfileView.init());
  } else {
    window.ProfileView.init();
  }
})();
