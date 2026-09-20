/**
 * client/js/tools/api-tester.js
 * WebDev AI Studio - Professional API Tester Tool Controller
 */

(function () {
  'use strict';

  class ApiTesterTool {
    constructor() {
      this.container = document.getElementById('viewApiTester');
      this.method = 'GET';
      this.url = 'https://httpbin.org/json';
      this.activeReqTab = 'params'; // 'params' | 'headers' | 'auth' | 'body' | 'assertions'
      this.activeResTab = 'body';   // 'body' | 'headers' | 'trace' | 'tests'
      this.responseViewMode = 'pretty'; // 'pretty' | 'raw' | 'preview'
      this.isLoading = false;

      // Params & Headers
      this.queryParams = [
        { id: 'qp_1', enabled: true, key: '', value: '', description: '' }
      ];
      this.headers = [
        { id: 'hd_1', enabled: true, key: 'Accept', value: 'application/json', description: '', masked: false },
        { id: 'hd_2', enabled: true, key: 'User-Agent', value: 'WebDev AI Studio API Tester', description: '', masked: false }
      ];

      // Auth
      this.auth = {
        type: 'none', // 'none' | 'bearer' | 'basic' | 'apiKey'
        token: '',
        username: '',
        password: '',
        key: 'X-API-Key',
        value: '',
        addTo: 'header' // 'header' | 'query'
      };

      // Body
      this.bodyType = 'json'; // 'none' | 'json' | 'form' | 'raw'
      this.jsonBody = JSON.stringify({ name: 'WebDev AI Studio', active: true }, null, 2);
      this.formData = [
        { id: 'fd_1', enabled: true, key: '', value: '' }
      ];
      this.rawBody = '';

      // Assertions
      this.assertions = [
        { id: 'as_1', type: 'status_equals', expected: '200', name: 'Status is 200' },
        { id: 'as_2', type: 'response_time_lt', expected: '2000', name: 'Response time < 2000ms' }
      ];

      // Environments
      this.environments = {
        'Global': {},
        'Development': { baseUrl: 'https://httpbin.org', apiKey: 'dev_secret_token_123' },
        'Production': { baseUrl: 'https://api.example.com', apiKey: 'prod_live_token_789' }
      };
      this.currentEnv = 'Development';

      // Collections & History
      this.collections = [];
      this.history = [];
      this.activeResponse = null;

      this.init();
    }

    init() {
      if (!this.container) return;
      this.loadStoredState();
      this.render();
      this.fetchCollections();
    }

    loadStoredState() {
      try {
        const savedHist = localStorage.getItem('webdev_api_tester_history');
        if (savedHist) this.history = JSON.parse(savedHist);
      } catch (e) {}
    }

    saveHistory() {
      try {
        localStorage.setItem('webdev_api_tester_history', JSON.stringify(this.history.slice(0, 30)));
      } catch (e) {}
    }

    async fetchCollections() {
      try {
        const res = await fetch('/api/tester/collections');
        if (res.ok) {
          const data = await res.json();
          if (data.collections) {
            this.collections = data.collections;
            this.renderCollectionsList();
          }
        }
      } catch (e) {}
    }

    // Resolves {{var}} tags against active environment
    resolveVariables(text) {
      if (!text || typeof text !== 'string') return text;
      const envVars = Object.assign({}, this.environments['Global'] || {}, this.environments[this.currentEnv] || {});
      return text.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, varName) => {
        return envVars[varName] !== undefined ? envVars[varName] : match;
      });
    }

    render() {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="api-tester-layout">
          <!-- Left Sidebar: Collections & History -->
          <div class="api-tester-sidebar" id="apiTesterSidebar">
            <div class="api-sidebar-header">
              <div class="api-sidebar-tabs">
                <button class="api-side-tab active" id="tabNavCollections" type="button">Collections</button>
                <button class="api-side-tab" id="tabNavHistory" type="button">History</button>
              </div>
            </div>
            
            <!-- Collections Panel -->
            <div class="api-sidebar-pane active" id="paneCollections">
              <div class="api-sidebar-actions">
                <button class="btn btn-secondary btn-xs" id="btnSaveCurrentReq" type="button">+ Save Request</button>
                <div class="env-picker-wrap">
                  <select class="form-select form-select-xs" id="selectEnvironment" title="Active Environment">
                    ${Object.keys(this.environments).map(env => `<option value="${env}" ${env === this.currentEnv ? 'selected' : ''}>${env}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="api-collections-tree" id="apiCollectionsList">
                <div class="empty-state-xs">Loading collections...</div>
              </div>
            </div>

            <!-- History Panel -->
            <div class="api-sidebar-pane" id="paneHistory" style="display: none;">
              <div class="api-sidebar-actions" style="justify-content: space-between;">
                <span style="font-size: 11px; color: var(--text-muted);">${this.history.length} logged</span>
                <button class="btn btn-ghost btn-xs text-danger" id="btnClearHistory" type="button">Clear</button>
              </div>
              <div class="api-history-list" id="apiHistoryList"></div>
            </div>
          </div>

          <!-- Center Workspace: Request Builder & Response Inspector -->
          <div class="api-tester-main">
            <!-- URL & Method Bar -->
            <div class="api-request-bar">
              <div class="api-method-select-wrap">
                <select class="api-method-select method-${this.method.toLowerCase()}" id="apiMethodSelect">
                  <option value="GET" ${this.method === 'GET' ? 'selected' : ''}>GET</option>
                  <option value="POST" ${this.method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="PUT" ${this.method === 'PUT' ? 'selected' : ''}>PUT</option>
                  <option value="PATCH" ${this.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                  <option value="DELETE" ${this.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                  <option value="HEAD" ${this.method === 'HEAD' ? 'selected' : ''}>HEAD</option>
                  <option value="OPTIONS" ${this.method === 'OPTIONS' ? 'selected' : ''}>OPTIONS</option>
                </select>
              </div>

              <div class="api-url-input-wrap">
                <input type="text" class="api-url-input" id="apiUrlInput" value="${this.escapeHtml(this.url)}" placeholder="https://api.example.com/v1/resource or {{baseUrl}}/users" spellcheck="false">
              </div>

              <button class="btn btn-primary api-btn-send" id="btnSendApiRequest" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                <span>Send</span>
              </button>
            </div>

            <!-- Two-Column Panes: Request Config (Left) and Response View (Right) -->
            <div class="api-tester-panes">
              <!-- Request Config Card -->
              <div class="api-pane-card api-request-card">
                <div class="api-card-header">
                  <div class="api-nav-tabs" id="apiReqTabs">
                    <button class="api-tab-btn ${this.activeReqTab === 'params' ? 'active' : ''}" data-tab="params" type="button">
                      Params <span class="tab-count-badge">${this.queryParams.filter(p => p.key).length}</span>
                    </button>
                    <button class="api-tab-btn ${this.activeReqTab === 'headers' ? 'active' : ''}" data-tab="headers" type="button">
                      Headers <span class="tab-count-badge">${this.headers.filter(h => h.key).length}</span>
                    </button>
                    <button class="api-tab-btn ${this.activeReqTab === 'auth' ? 'active' : ''}" data-tab="auth" type="button">
                      Auth ${this.auth.type !== 'none' ? '<span class="dot-active"></span>' : ''}
                    </button>
                    <button class="api-tab-btn ${this.activeReqTab === 'body' ? 'active' : ''}" data-tab="body" type="button">
                      Body ${this.bodyType !== 'none' ? '<span class="dot-active"></span>' : ''}
                    </button>
                    <button class="api-tab-btn ${this.activeReqTab === 'assertions' ? 'active' : ''}" data-tab="assertions" type="button">
                      Tests <span class="tab-count-badge">${this.assertions.length}</span>
                    </button>
                  </div>
                </div>

                <div class="api-card-content" id="apiReqTabContent">
                  <!-- Rendered dynamically -->
                </div>
              </div>

              <!-- Response Inspector Card -->
              <div class="api-pane-card api-response-card">
                <div class="api-card-header api-res-header">
                  <div class="api-nav-tabs" id="apiResTabs">
                    <button class="api-tab-btn ${this.activeResTab === 'body' ? 'active' : ''}" data-tab="body" type="button">Response Body</button>
                    <button class="api-tab-btn ${this.activeResTab === 'headers' ? 'active' : ''}" data-tab="headers" type="button">Headers</button>
                    <button class="api-tab-btn ${this.activeResTab === 'trace' ? 'active' : ''}" data-tab="trace" type="button">Redirect Trace</button>
                    <button class="api-tab-btn ${this.activeResTab === 'tests' ? 'active' : ''}" data-tab="tests" type="button">Test Results</button>
                  </div>

                  <div class="api-res-meta" id="apiResMeta">
                    <!-- Status, Time, Size -->
                    <span class="api-meta-idle">No request sent</span>
                  </div>
                </div>

                <div class="api-card-content" id="apiResTabContent">
                  <div class="api-res-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polyline points="16 18 22 12 16 6"/>
                      <polyline points="8 6 2 12 8 18"/>
                    </svg>
                    <div style="font-weight: 500; margin-top: 8px;">Ready to send request</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Click "Send" to inspect genuine headers, body, timings, and assertion results.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents();
      this.renderCurrentReqTab();
      this.renderHistoryList();
      this.renderCollectionsList();
    }

    bindEvents() {
      // Method change
      const methodSelect = this.container.querySelector('#apiMethodSelect');
      if (methodSelect) {
        methodSelect.addEventListener('change', (e) => {
          this.method = e.target.value;
          methodSelect.className = `api-method-select method-${this.method.toLowerCase()}`;
        });
      }

      // URL input change
      const urlInput = this.container.querySelector('#apiUrlInput');
      if (urlInput) {
        urlInput.addEventListener('input', (e) => {
          this.url = e.target.value;
          this.syncUrlToParams();
        });
      }

      // Send Button
      const sendBtn = this.container.querySelector('#btnSendApiRequest');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendRequest());
      }

      // Request Tabs
      const reqTabs = this.container.querySelectorAll('#apiReqTabs .api-tab-btn');
      reqTabs.forEach(btn => {
        btn.addEventListener('click', () => {
          reqTabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeReqTab = btn.getAttribute('data-tab');
          this.renderCurrentReqTab();
        });
      });

      // Response Tabs
      const resTabs = this.container.querySelectorAll('#apiResTabs .api-tab-btn');
      resTabs.forEach(btn => {
        btn.addEventListener('click', () => {
          resTabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeResTab = btn.getAttribute('data-tab');
          this.renderCurrentResTab();
        });
      });

      // Sidebar Tab Switching
      const colTab = this.container.querySelector('#tabNavCollections');
      const histTab = this.container.querySelector('#tabNavHistory');
      const paneCol = this.container.querySelector('#paneCollections');
      const paneHist = this.container.querySelector('#paneHistory');

      if (colTab && histTab) {
        colTab.addEventListener('click', () => {
          colTab.classList.add('active');
          histTab.classList.remove('active');
          if (paneCol) paneCol.style.display = 'flex';
          if (paneHist) paneHist.style.display = 'none';
        });
        histTab.addEventListener('click', () => {
          histTab.classList.add('active');
          colTab.classList.remove('active');
          if (paneHist) paneHist.style.display = 'flex';
          if (paneCol) paneCol.style.display = 'none';
        });
      }

      // Environment Switcher
      const envSelect = this.container.querySelector('#selectEnvironment');
      if (envSelect) {
        envSelect.addEventListener('change', (e) => {
          this.currentEnv = e.target.value;
          if (window.showToast) window.showToast(`Environment switched to: ${this.currentEnv}`);
        });
      }

      // Save Request
      const saveReqBtn = this.container.querySelector('#btnSaveCurrentReq');
      if (saveReqBtn) {
        saveReqBtn.addEventListener('click', () => this.promptSaveRequest());
      }

      // Clear History
      const clearHistBtn = this.container.querySelector('#btnClearHistory');
      if (clearHistBtn) {
        clearHistBtn.addEventListener('click', () => {
          this.history = [];
          this.saveHistory();
          this.renderHistoryList();
        });
      }
    }

    // ----------------------------------------------------------------
    // REQUEST TABS RENDERING
    // ----------------------------------------------------------------
    renderCurrentReqTab() {
      const content = this.container.querySelector('#apiReqTabContent');
      if (!content) return;

      if (this.activeReqTab === 'params') {
        this.renderParamsTab(content);
      } else if (this.activeReqTab === 'headers') {
        this.renderHeadersTab(content);
      } else if (this.activeReqTab === 'auth') {
        this.renderAuthTab(content);
      } else if (this.activeReqTab === 'body') {
        this.renderBodyTab(content);
      } else if (this.activeReqTab === 'assertions') {
        this.renderAssertionsTab(content);
      }
    }

    renderParamsTab(el) {
      el.innerHTML = `
        <div class="api-table-wrap">
          <div class="api-table-header">
            <span style="width: 30px;"></span>
            <span style="flex: 2;">Key</span>
            <span style="flex: 3;">Value</span>
            <span style="flex: 3;">Description</span>
            <span style="width: 32px;"></span>
          </div>
          <div class="api-table-rows" id="paramRowsList">
            ${this.queryParams.map((p, idx) => `
              <div class="api-table-row" data-id="${p.id}">
                <div style="width: 30px; display: flex; align-items: center; justify-content: center;">
                  <input type="checkbox" class="param-check" ${p.enabled ? 'checked' : ''}>
                </div>
                <div style="flex: 2;">
                  <input type="text" class="api-grid-input param-key" value="${this.escapeHtml(p.key)}" placeholder="Key">
                </div>
                <div style="flex: 3;">
                  <input type="text" class="api-grid-input param-val" value="${this.escapeHtml(p.value)}" placeholder="Value">
                </div>
                <div style="flex: 3;">
                  <input type="text" class="api-grid-input param-desc" value="${this.escapeHtml(p.description || '')}" placeholder="Description">
                </div>
                <div style="width: 32px; display: flex; align-items: center; justify-content: center;">
                  <button type="button" class="btn-grid-del param-del" title="Delete Row">&times;</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="padding: 8px 12px;">
            <button class="btn btn-secondary btn-xs" id="btnAddParamRow" type="button">+ Add Parameter</button>
          </div>
        </div>
      `;

      el.querySelector('#btnAddParamRow')?.addEventListener('click', () => {
        this.queryParams.push({ id: 'qp_' + Date.now(), enabled: true, key: '', value: '', description: '' });
        this.renderParamsTab(el);
      });

      el.querySelectorAll('.api-table-row').forEach(row => {
        const id = row.getAttribute('data-id');
        const item = this.queryParams.find(p => p.id === id);
        if (!item) return;

        row.querySelector('.param-check')?.addEventListener('change', (e) => {
          item.enabled = e.target.checked;
          this.syncParamsToUrl();
        });
        row.querySelector('.param-key')?.addEventListener('input', (e) => {
          item.key = e.target.value;
          this.syncParamsToUrl();
        });
        row.querySelector('.param-val')?.addEventListener('input', (e) => {
          item.value = e.target.value;
          this.syncParamsToUrl();
        });
        row.querySelector('.param-desc')?.addEventListener('input', (e) => {
          item.description = e.target.value;
        });
        row.querySelector('.param-del')?.addEventListener('click', () => {
          this.queryParams = this.queryParams.filter(p => p.id !== id);
          if (this.queryParams.length === 0) {
            this.queryParams.push({ id: 'qp_' + Date.now(), enabled: true, key: '', value: '', description: '' });
          }
          this.syncParamsToUrl();
          this.renderParamsTab(el);
        });
      });
    }

    renderHeadersTab(el) {
      el.innerHTML = `
        <div class="api-table-wrap">
          <div class="api-table-header">
            <span style="width: 30px;"></span>
            <span style="flex: 2;">Key</span>
            <span style="flex: 3;">Value</span>
            <span style="flex: 2;">Description</span>
            <span style="width: 54px; text-align: center;">Mask</span>
            <span style="width: 32px;"></span>
          </div>
          <div class="api-table-rows" id="headerRowsList">
            ${this.headers.map((h, idx) => `
              <div class="api-table-row" data-id="${h.id}">
                <div style="width: 30px; display: flex; align-items: center; justify-content: center;">
                  <input type="checkbox" class="hdr-check" ${h.enabled ? 'checked' : ''}>
                </div>
                <div style="flex: 2;">
                  <input type="text" class="api-grid-input hdr-key" value="${this.escapeHtml(h.key)}" placeholder="Header">
                </div>
                <div style="flex: 3; position: relative;">
                  <input type="${h.masked ? 'password' : 'text'}" class="api-grid-input hdr-val font-mono" value="${this.escapeHtml(h.value)}" placeholder="Value">
                </div>
                <div style="flex: 2;">
                  <input type="text" class="api-grid-input hdr-desc" value="${this.escapeHtml(h.description || '')}" placeholder="Description">
                </div>
                <div style="width: 54px; display: flex; align-items: center; justify-content: center;">
                  <button type="button" class="btn btn-ghost btn-xs hdr-toggle-mask" title="${h.masked ? 'Reveal Value' : 'Mask Secret'}">
                    ${h.masked ? '👁️' : '🔒'}
                  </button>
                </div>
                <div style="width: 32px; display: flex; align-items: center; justify-content: center;">
                  <button type="button" class="btn-grid-del hdr-del" title="Delete Row">&times;</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="padding: 8px 12px; display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-xs" id="btnAddHeaderRow" type="button">+ Add Header</button>
            <button class="btn btn-ghost btn-xs" id="btnAddJsonHeader" type="button">Content-Type: JSON</button>
            <button class="btn btn-ghost btn-xs" id="btnAddBearerPreset" type="button">Authorization: Bearer</button>
          </div>
        </div>
      `;

      el.querySelector('#btnAddHeaderRow')?.addEventListener('click', () => {
        this.headers.push({ id: 'hd_' + Date.now(), enabled: true, key: '', value: '', description: '', masked: false });
        this.renderHeadersTab(el);
      });

      el.querySelector('#btnAddJsonHeader')?.addEventListener('click', () => {
        this.headers.push({ id: 'hd_' + Date.now(), enabled: true, key: 'Content-Type', value: 'application/json', description: '', masked: false });
        this.renderHeadersTab(el);
      });

      el.querySelector('#btnAddBearerPreset')?.addEventListener('click', () => {
        this.headers.push({ id: 'hd_' + Date.now(), enabled: true, key: 'Authorization', value: 'Bearer {{apiKey}}', description: '', masked: true });
        this.renderHeadersTab(el);
      });

      el.querySelectorAll('.api-table-row').forEach(row => {
        const id = row.getAttribute('data-id');
        const item = this.headers.find(h => h.id === id);
        if (!item) return;

        row.querySelector('.hdr-check')?.addEventListener('change', (e) => { item.enabled = e.target.checked; });
        row.querySelector('.hdr-key')?.addEventListener('input', (e) => { item.key = e.target.value; });
        row.querySelector('.hdr-val')?.addEventListener('input', (e) => { item.value = e.target.value; });
        row.querySelector('.hdr-desc')?.addEventListener('input', (e) => { item.description = e.target.value; });
        row.querySelector('.hdr-toggle-mask')?.addEventListener('click', () => {
          item.masked = !item.masked;
          this.renderHeadersTab(el);
        });
        row.querySelector('.hdr-del')?.addEventListener('click', () => {
          this.headers = this.headers.filter(h => h.id !== id);
          this.renderHeadersTab(el);
        });
      });
    }

    renderAuthTab(el) {
      el.innerHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group" style="max-width: 320px;">
            <label class="form-label" style="font-weight: 500; font-size: 12px; margin-bottom: 4px;">Authentication Type</label>
            <select class="form-select form-select-sm" id="selectAuthType">
              <option value="none" ${this.auth.type === 'none' ? 'selected' : ''}>No Auth</option>
              <option value="bearer" ${this.auth.type === 'bearer' ? 'selected' : ''}>Bearer Token</option>
              <option value="basic" ${this.auth.type === 'basic' ? 'selected' : ''}>Basic Auth (Username / Password)</option>
              <option value="apiKey" ${this.auth.type === 'apiKey' ? 'selected' : ''}>API Key</option>
            </select>
          </div>

          <div id="authConfigFields">
            ${this.auth.type === 'bearer' ? `
              <div class="form-group">
                <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Token (Supports {{variables}})</label>
                <input type="password" class="form-input form-input-sm font-mono" id="authBearerToken" value="${this.escapeHtml(this.auth.token)}" placeholder="ey... or {{apiKey}}">
              </div>
            ` : ''}

            ${this.auth.type === 'basic' ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Username</label>
                  <input type="text" class="form-input form-input-sm" id="authBasicUser" value="${this.escapeHtml(this.auth.username)}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Password</label>
                  <input type="password" class="form-input form-input-sm" id="authBasicPass" value="${this.escapeHtml(this.auth.password)}">
                </div>
              </div>
            ` : ''}

            ${this.auth.type === 'apiKey' ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr 120px; gap: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Header / Param Name</label>
                  <input type="text" class="form-input form-input-sm font-mono" id="authApiKeyKey" value="${this.escapeHtml(this.auth.key)}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Key Value</label>
                  <input type="password" class="form-input form-input-sm font-mono" id="authApiKeyValue" value="${this.escapeHtml(this.auth.value)}">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px; color: var(--text-muted);">Add To</label>
                  <select class="form-select form-select-sm" id="authApiKeyAddTo">
                    <option value="header" ${this.auth.addTo === 'header' ? 'selected' : ''}>Header</option>
                    <option value="query" ${this.auth.addTo === 'query' ? 'selected' : ''}>Query Param</option>
                  </select>
                </div>
              </div>
            ` : ''}

            ${this.auth.type === 'none' ? `
              <div style="font-size: 12px; color: var(--text-muted); padding: 12px; background: var(--bg-surface-subtle); border-radius: 6px;">
                This request will be sent without additional credentials.
              </div>
            ` : ''}
          </div>
        </div>
      `;

      el.querySelector('#selectAuthType')?.addEventListener('change', (e) => {
        this.auth.type = e.target.value;
        this.renderAuthTab(el);
      });

      el.querySelector('#authBearerToken')?.addEventListener('input', (e) => { this.auth.token = e.target.value; });
      el.querySelector('#authBasicUser')?.addEventListener('input', (e) => { this.auth.username = e.target.value; });
      el.querySelector('#authBasicPass')?.addEventListener('input', (e) => { this.auth.password = e.target.value; });
      el.querySelector('#authApiKeyKey')?.addEventListener('input', (e) => { this.auth.key = e.target.value; });
      el.querySelector('#authApiKeyValue')?.addEventListener('input', (e) => { this.auth.value = e.target.value; });
      el.querySelector('#authApiKeyAddTo')?.addEventListener('change', (e) => { this.auth.addTo = e.target.value; });
    }

    renderBodyTab(el) {
      el.innerHTML = `
        <div style="padding: 12px 16px; display: flex; flex-direction: column; height: 100%; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="api-body-radio-group">
              <label class="api-radio-lbl"><input type="radio" name="bodyType" value="none" ${this.bodyType === 'none' ? 'checked' : ''}> None</label>
              <label class="api-radio-lbl"><input type="radio" name="bodyType" value="json" ${this.bodyType === 'json' ? 'checked' : ''}> JSON</label>
              <label class="api-radio-lbl"><input type="radio" name="bodyType" value="form" ${this.bodyType === 'form' ? 'checked' : ''}> x-www-form-urlencoded</label>
              <label class="api-radio-lbl"><input type="radio" name="bodyType" value="raw" ${this.bodyType === 'raw' ? 'checked' : ''}> Raw Text</label>
            </div>

            ${this.bodyType === 'json' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-xs" id="btnFormatJson" type="button">Format JSON</button>
                <button class="btn btn-ghost btn-xs" id="btnClearBody" type="button">Clear</button>
              </div>
            ` : ''}
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; min-height: 200px;">
            ${this.bodyType === 'none' ? `
              <div class="api-res-empty" style="padding: 40px 0;">
                <div style="color: var(--text-muted); font-size: 12px;">This request does not have a body.</div>
              </div>
            ` : ''}

            ${this.bodyType === 'json' ? `
              <textarea class="form-textarea font-mono api-body-editor" id="jsonBodyTextarea" spellcheck="false" placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}">${this.escapeHtml(this.jsonBody)}</textarea>
              <div class="api-json-validation-bar" id="jsonValidationMsg" style="font-size: 11px; color: var(--status-success); margin-top: 4px;">Valid JSON</div>
            ` : ''}

            ${this.bodyType === 'raw' ? `
              <textarea class="form-textarea font-mono api-body-editor" id="rawBodyTextarea" spellcheck="false" placeholder="Raw request payload...">${this.escapeHtml(this.rawBody)}</textarea>
            ` : ''}

            ${this.bodyType === 'form' ? `
              <div class="api-table-wrap" style="flex: 1; border: 1px solid var(--border-subtle); border-radius: 6px;">
                <div class="api-table-rows" id="formDataRows">
                  ${this.formData.map(fd => `
                    <div class="api-table-row" data-id="${fd.id}">
                      <div style="flex: 1;"><input type="text" class="api-grid-input fd-key" value="${this.escapeHtml(fd.key)}" placeholder="Key"></div>
                      <div style="flex: 1;"><input type="text" class="api-grid-input fd-val" value="${this.escapeHtml(fd.value)}" placeholder="Value"></div>
                      <div style="width: 32px; display: flex; align-items: center; justify-content: center;">
                        <button type="button" class="btn-grid-del fd-del">&times;</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div style="padding: 6px 10px;">
                  <button class="btn btn-secondary btn-xs" id="btnAddFormDataRow" type="button">+ Add Field</button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      el.querySelectorAll('input[name="bodyType"]').forEach(r => {
        r.addEventListener('change', (e) => {
          this.bodyType = e.target.value;
          this.renderBodyTab(el);
        });
      });

      const jsonArea = el.querySelector('#jsonBodyTextarea');
      const valMsg = el.querySelector('#jsonValidationMsg');
      if (jsonArea) {
        jsonArea.addEventListener('input', (e) => {
          this.jsonBody = e.target.value;
          try {
            JSON.parse(this.jsonBody);
            if (valMsg) {
              valMsg.textContent = 'Valid JSON';
              valMsg.style.color = 'var(--status-success)';
            }
          } catch (err) {
            if (valMsg) {
              valMsg.textContent = 'Invalid JSON: ' + err.message;
              valMsg.style.color = 'var(--status-danger)';
            }
          }
        });
      }

      el.querySelector('#btnFormatJson')?.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(this.jsonBody);
          this.jsonBody = JSON.stringify(parsed, null, 2);
          if (jsonArea) jsonArea.value = this.jsonBody;
        } catch (e) {
          alert('Cannot format invalid JSON: ' + e.message);
        }
      });

      el.querySelector('#btnClearBody')?.addEventListener('click', () => {
        this.jsonBody = '';
        if (jsonArea) jsonArea.value = '';
      });

      const rawArea = el.querySelector('#rawBodyTextarea');
      if (rawArea) {
        rawArea.addEventListener('input', (e) => { this.rawBody = e.target.value; });
      }

      el.querySelector('#btnAddFormDataRow')?.addEventListener('click', () => {
        this.formData.push({ id: 'fd_' + Date.now(), enabled: true, key: '', value: '' });
        this.renderBodyTab(el);
      });

      el.querySelectorAll('#formDataRows .api-table-row').forEach(row => {
        const id = row.getAttribute('data-id');
        const item = this.formData.find(f => f.id === id);
        if (!item) return;

        row.querySelector('.fd-key')?.addEventListener('input', (e) => { item.key = e.target.value; });
        row.querySelector('.fd-val')?.addEventListener('input', (e) => { item.value = e.target.value; });
        row.querySelector('.fd-del')?.addEventListener('click', () => {
          this.formData = this.formData.filter(f => f.id !== id);
          if (this.formData.length === 0) {
            this.formData.push({ id: 'fd_' + Date.now(), enabled: true, key: '', value: '' });
          }
          this.renderBodyTab(el);
        });
      });
    }

    renderAssertionsTab(el) {
      el.innerHTML = `
        <div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-secondary);">Automated Response Assertions & Quality Checks</span>
            <button class="btn btn-secondary btn-xs" id="btnAddAssertion" type="button">+ Add Test</button>
          </div>

          <div class="api-table-wrap">
            <div class="api-table-header">
              <span style="flex: 2;">Assertion Type</span>
              <span style="flex: 2;">Expected Value</span>
              <span style="flex: 3;">Description / Rule</span>
              <span style="width: 32px;"></span>
            </div>
            <div class="api-table-rows">
              ${this.assertions.map(as => `
                <div class="api-table-row" data-id="${as.id}">
                  <div style="flex: 2;">
                    <select class="form-select form-select-xs as-type">
                      <option value="status_equals" ${as.type === 'status_equals' ? 'selected' : ''}>Status code is</option>
                      <option value="response_time_lt" ${as.type === 'response_time_lt' ? 'selected' : ''}>Response time &lt; (ms)</option>
                      <option value="content_type_contains" ${as.type === 'content_type_contains' ? 'selected' : ''}>Content-Type contains</option>
                      <option value="body_contains" ${as.type === 'body_contains' ? 'selected' : ''}>Body contains text</option>
                      <option value="json_field_exists" ${as.type === 'json_field_exists' ? 'selected' : ''}>JSON field exists</option>
                    </select>
                  </div>
                  <div style="flex: 2;">
                    <input type="text" class="api-grid-input as-expected font-mono" value="${this.escapeHtml(as.expected)}" placeholder="e.g. 200">
                  </div>
                  <div style="flex: 3;">
                    <input type="text" class="api-grid-input as-name" value="${this.escapeHtml(as.name || '')}" placeholder="Rule Name">
                  </div>
                  <div style="width: 32px; display: flex; align-items: center; justify-content: center;">
                    <button type="button" class="btn-grid-del as-del">&times;</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      el.querySelector('#btnAddAssertion')?.addEventListener('click', () => {
        this.assertions.push({
          id: 'as_' + Date.now(),
          type: 'status_equals',
          expected: '200',
          name: 'Status is 200'
        });
        this.renderAssertionsTab(el);
      });

      el.querySelectorAll('.api-table-row').forEach(row => {
        const id = row.getAttribute('data-id');
        const item = this.assertions.find(a => a.id === id);
        if (!item) return;

        row.querySelector('.as-type')?.addEventListener('change', (e) => { item.type = e.target.value; });
        row.querySelector('.as-expected')?.addEventListener('input', (e) => { item.expected = e.target.value; });
        row.querySelector('.as-name')?.addEventListener('input', (e) => { item.name = e.target.value; });
        row.querySelector('.as-del')?.addEventListener('click', () => {
          this.assertions = this.assertions.filter(a => a.id !== id);
          this.renderAssertionsTab(el);
        });
      });
    }

    // ----------------------------------------------------------------
    // URL / PARAMS SYNC
    // ----------------------------------------------------------------
    syncUrlToParams() {
      try {
        const resolved = this.resolveVariables(this.url);
        const u = new URL(resolved.startsWith('http') ? resolved : `https://${resolved}`);
        const newParams = [];
        u.searchParams.forEach((val, key) => {
          newParams.push({ id: 'qp_' + Math.random(), enabled: true, key, value: val, description: '' });
        });
        if (newParams.length > 0) {
          this.queryParams = newParams;
          if (this.activeReqTab === 'params') {
            const content = this.container.querySelector('#apiReqTabContent');
            if (content) this.renderParamsTab(content);
          }
        }
      } catch (e) {}
    }

    syncParamsToUrl() {
      try {
        const base = this.url.split('?')[0];
        const activeParams = this.queryParams.filter(p => p.enabled && p.key);
        if (activeParams.length === 0) {
          this.url = base;
        } else {
          const qs = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
          this.url = `${base}?${qs}`;
        }
        const urlInput = this.container.querySelector('#apiUrlInput');
        if (urlInput) urlInput.value = this.url;
      } catch (e) {}
    }

    // ----------------------------------------------------------------
    // SEND REQUEST & RESPONSE INSPECTOR
    // ----------------------------------------------------------------
    async sendRequest() {
      if (this.isLoading) return;
      const sendBtn = this.container.querySelector('#btnSendApiRequest');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner-inline"></span> Sending...';
      }
      this.isLoading = true;

      const resMeta = this.container.querySelector('#apiResMeta');
      if (resMeta) {
        resMeta.innerHTML = '<span class="api-meta-busy">Executing HTTP request...</span>';
      }

      try {
        const resolvedUrl = this.resolveVariables(this.url);

        // Build headers map
        const headersMap = {};
        this.headers.filter(h => h.enabled && h.key).forEach(h => {
          headersMap[h.key] = this.resolveVariables(h.value);
        });

        // Query params
        const qpMap = {};
        this.queryParams.filter(p => p.enabled && p.key).forEach(p => {
          qpMap[p.key] = this.resolveVariables(p.value);
        });

        // Body
        let bodyPayload = null;
        if (this.bodyType === 'json') {
          bodyPayload = this.resolveVariables(this.jsonBody);
        } else if (this.bodyType === 'form') {
          const fdObj = {};
          this.formData.filter(f => f.key).forEach(f => {
            fdObj[f.key] = this.resolveVariables(f.value);
          });
          bodyPayload = fdObj;
        } else if (this.bodyType === 'raw') {
          bodyPayload = this.resolveVariables(this.rawBody);
        }

        const payload = {
          url: resolvedUrl,
          method: this.method,
          headers: headersMap,
          queryParams: qpMap,
          auth: this.auth,
          bodyType: this.bodyType,
          body: bodyPayload,
          assertions: this.assertions
        };

        const res = await fetch('/api/tester/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        this.activeResponse = data;

        // Add to history
        this.history.unshift({
          id: 'hist_' + Date.now(),
          timestamp: Date.now(),
          method: this.method,
          url: this.url,
          statusCode: data.statusCode || 0,
          statusText: data.statusText || '',
          timeMs: data.timing ? data.timing.totalMs : 0
        });
        this.saveHistory();
        this.renderHistoryList();

        // Update Metadata badge
        this.renderResponseMeta(data);
        this.renderCurrentResTab();
      } catch (err) {
        console.error('Request execution error:', err);
        if (resMeta) {
          resMeta.innerHTML = `<span class="badge badge-danger">Error: ${err.message}</span>`;
        }
      } finally {
        this.isLoading = false;
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span>Send</span>
          `;
        }
      }
    }

    renderResponseMeta(res) {
      const meta = this.container.querySelector('#apiResMeta');
      if (!meta) return;

      const code = res.statusCode || 0;
      let badgeClass = 'badge-secondary';
      if (code >= 200 && code < 300) badgeClass = 'badge-success';
      else if (code >= 300 && code < 400) badgeClass = 'badge-accent';
      else if (code >= 400) badgeClass = 'badge-danger';

      const sizeStr = res.sizeBytes > 1024 ? `${(res.sizeBytes / 1024).toFixed(1)} KB` : `${res.sizeBytes || 0} B`;
      const timeMs = res.timing ? res.timing.totalMs : 0;

      meta.innerHTML = `
        <span class="badge ${badgeClass} font-mono">${code} ${this.escapeHtml(res.statusMessage || '')}</span>
        <span class="api-meta-stat" title="Total response time">⏱️ ${timeMs} ms</span>
        <span class="api-meta-stat" title="Total payload size">📦 ${sizeStr}</span>
      `;
    }

    renderCurrentResTab() {
      const content = this.container.querySelector('#apiResTabContent');
      if (!content || !this.activeResponse) return;

      if (this.activeResTab === 'body') {
        this.renderResponseBodyTab(content);
      } else if (this.activeResTab === 'headers') {
        this.renderResponseHeadersTab(content);
      } else if (this.activeResTab === 'trace') {
        this.renderResponseTraceTab(content);
      } else if (this.activeResTab === 'tests') {
        this.renderResponseTestsTab(content);
      }
    }

    renderResponseBodyTab(el) {
      const res = this.activeResponse;
      const isJson = res.isJson;

      el.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div class="api-res-body-toolbar">
            <div class="api-view-mode-pills">
              <button class="view-pill ${this.responseViewMode === 'pretty' ? 'active' : ''}" data-mode="pretty" type="button">Pretty JSON</button>
              <button class="view-pill ${this.responseViewMode === 'raw' ? 'active' : ''}" data-mode="raw" type="button">Raw</button>
              <button class="view-pill ${this.responseViewMode === 'preview' ? 'active' : ''}" data-mode="preview" type="button">Preview HTML</button>
            </div>

            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-xs" id="btnCopyResponse" type="button">Copy</button>
              <button class="btn btn-primary btn-xs" id="btnDownloadResponse" type="button">Download</button>
            </div>
          </div>

          <div class="api-res-body-scroll" style="flex: 1; overflow: auto; padding: 12px;">
            ${this.responseViewMode === 'pretty' ? `
              <pre class="api-code-block font-mono">${isJson ? this.syntaxHighlightJson(res.jsonData) : this.escapeHtml(res.rawBody)}</pre>
            ` : ''}

            ${this.responseViewMode === 'raw' ? `
              <pre class="api-code-block font-mono">${this.escapeHtml(res.rawBody)}</pre>
            ` : ''}

            ${this.responseViewMode === 'preview' ? `
              <iframe class="api-preview-frame" sandbox="allow-same-origin" srcdoc="${this.escapeHtml(res.rawBody)}" style="width: 100%; height: 100%; min-height: 360px; border: 1px solid var(--border-subtle); border-radius: 6px; background: #fff;"></iframe>
            ` : ''}
          </div>
        </div>
      `;

      el.querySelectorAll('.view-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.responseViewMode = pill.getAttribute('data-mode');
          this.renderResponseBodyTab(el);
        });
      });

      el.querySelector('#btnCopyResponse')?.addEventListener('click', () => {
        navigator.clipboard.writeText(res.rawBody);
        if (window.showToast) window.showToast('Response body copied to clipboard');
      });

      el.querySelector('#btnDownloadResponse')?.addEventListener('click', () => {
        const isJson = res.isJson;
        const blob = new Blob([res.rawBody], { type: isJson ? 'application/json' : 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `response_${Date.now()}.${isJson ? 'json' : 'txt'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    renderResponseHeadersTab(el) {
      const headers = this.activeResponse.headers || {};
      const entries = Object.entries(headers);

      el.innerHTML = `
        <div class="api-table-wrap" style="height: 100%; overflow: auto;">
          <div class="api-table-header">
            <span style="flex: 2;">Header</span>
            <span style="flex: 4;">Value</span>
          </div>
          <div class="api-table-rows">
            ${entries.map(([k, v]) => `
              <div class="api-table-row">
                <div style="flex: 2; font-weight: 500; color: var(--text-primary);">${this.escapeHtml(k)}</div>
                <div style="flex: 4; font-family: var(--font-mono); font-size: 11px; word-break: break-all;">${this.escapeHtml(Array.isArray(v) ? v.join(', ') : String(v))}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    renderResponseTraceTab(el) {
      const trace = this.activeResponse.redirectTrace || [];

      el.innerHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 12px; font-weight: 500; color: var(--text-secondary);">Redirect Chain (${trace.length} hop${trace.length === 1 ? '' : 's'})</div>
          ${trace.length === 0 ? `
            <div class="api-res-empty" style="padding: 24px 0;">
              <div>Direct request. No redirects occurred.</div>
            </div>
          ` : `
            <div class="api-trace-timeline">
              ${trace.map((hop, idx) => `
                <div class="api-trace-step">
                  <div class="trace-step-number">${idx + 1}</div>
                  <div class="trace-step-details">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="badge ${hop.statusCode >= 300 && hop.statusCode < 400 ? 'badge-accent' : 'badge-success'} font-mono">${hop.statusCode}</span>
                      <span class="font-mono" style="font-size: 11px; word-break: break-all;">${this.escapeHtml(hop.url)}</span>
                    </div>
                    ${hop.location ? `
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        ↳ Redirected to: <span class="font-mono" style="color: var(--accent-primary);">${this.escapeHtml(hop.location)}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    renderResponseTestsTab(el) {
      const assertions = this.activeResponse.assertions || [];
      const passedCount = assertions.filter(a => a.passed).length;

      el.innerHTML = `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; font-weight: 500;">
              Tests Passed: <span style="color: ${passedCount === assertions.length ? 'var(--status-success)' : 'var(--status-danger)'};">${passedCount} / ${assertions.length}</span>
            </div>
          </div>

          ${assertions.length === 0 ? `
            <div class="api-res-empty" style="padding: 24px 0;">
              <div>No assertions configured for this request.</div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${assertions.map(a => `
                <div class="api-assertion-card ${a.passed ? 'pass' : 'fail'}">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${a.passed ? '✅' : '❌'}</span>
                    <strong style="font-size: 12px;">${this.escapeHtml(a.name || a.type)}</strong>
                  </div>
                  <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; margin-left: 24px;">
                    ${this.escapeHtml(a.message)}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    // ----------------------------------------------------------------
    // SIDEBAR: HISTORY & COLLECTIONS
    // ----------------------------------------------------------------
    renderHistoryList() {
      const el = this.container.querySelector('#apiHistoryList');
      if (!el) return;

      if (this.history.length === 0) {
        el.innerHTML = '<div class="empty-state-xs">No recent requests</div>';
        return;
      }

      el.innerHTML = this.history.map(item => `
        <div class="api-hist-item" data-id="${item.id}">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span class="method-badge method-${item.method.toLowerCase()}">${item.method}</span>
            <span class="badge ${item.statusCode >= 200 && item.statusCode < 300 ? 'badge-success' : 'badge-danger'} font-mono" style="font-size: 9px;">${item.statusCode}</span>
          </div>
          <div class="api-hist-url font-mono">${this.escapeHtml(item.url)}</div>
          <div class="api-hist-time">${new Date(item.timestamp).toLocaleTimeString()} &middot; ${item.timeMs}ms</div>
        </div>
      `).join('');

      el.querySelectorAll('.api-hist-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
          const id = itemEl.getAttribute('data-id');
          const rec = this.history.find(h => h.id === id);
          if (rec) {
            this.method = rec.method;
            this.url = rec.url;
            const methodSelect = this.container.querySelector('#apiMethodSelect');
            const urlInput = this.container.querySelector('#apiUrlInput');
            if (methodSelect) {
              methodSelect.value = this.method;
              methodSelect.className = `api-method-select method-${this.method.toLowerCase()}`;
            }
            if (urlInput) urlInput.value = this.url;
            this.syncUrlToParams();
          }
        });
      });
    }

    renderCollectionsList() {
      const el = this.container.querySelector('#apiCollectionsList');
      if (!el) return;

      if (this.collections.length === 0) {
        el.innerHTML = '<div class="empty-state-xs">No saved collections</div>';
        return;
      }

      el.innerHTML = this.collections.map(col => `
        <div class="api-col-group">
          <div class="api-col-header">
            📁 <span class="font-semibold">${this.escapeHtml(col.name)}</span>
          </div>
          <div class="api-col-items">
            ${(col.requests || []).map(r => `
              <div class="api-col-req-item" data-col-id="${col.id}" data-req-id="${r.id}">
                <span class="method-badge method-${(r.method || 'get').toLowerCase()}">${r.method || 'GET'}</span>
                <span class="api-col-req-name">${this.escapeHtml(r.name || r.url)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      el.querySelectorAll('.api-col-req-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
          const colId = itemEl.getAttribute('data-col-id');
          const reqId = itemEl.getAttribute('data-req-id');
          const col = this.collections.find(c => c.id === colId);
          if (!col) return;
          const req = (col.requests || []).find(r => r.id === reqId);
          if (!req) return;

          this.loadRequestIntoStudio(req);
        });
      });
    }

    loadRequestIntoStudio(req) {
      this.method = req.method || 'GET';
      this.url = req.url || '';
      this.auth = req.auth || { type: 'none' };
      this.bodyType = req.bodyType || 'none';
      if (req.body) {
        this.jsonBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      }
      if (req.assertions) {
        this.assertions = req.assertions;
      }

      const methodSelect = this.container.querySelector('#apiMethodSelect');
      const urlInput = this.container.querySelector('#apiUrlInput');
      if (methodSelect) {
        methodSelect.value = this.method;
        methodSelect.className = `api-method-select method-${this.method.toLowerCase()}`;
      }
      if (urlInput) urlInput.value = this.url;

      this.syncUrlToParams();
      this.renderCurrentReqTab();
      if (window.showToast) window.showToast(`Loaded "${req.name || 'Request'}"`);
    }

    promptSaveRequest() {
      const name = prompt('Enter a name for this request:', 'My Endpoint');
      if (!name) return;

      let targetCol = this.collections[0];
      if (!targetCol) {
        targetCol = { id: 'col_' + Date.now(), name: 'My Requests', requests: [] };
        this.collections.push(targetCol);
      }

      targetCol.requests = targetCol.requests || [];
      targetCol.requests.push({
        id: 'req_' + Date.now(),
        name,
        method: this.method,
        url: this.url,
        auth: this.auth,
        bodyType: this.bodyType,
        body: this.bodyType === 'json' ? this.jsonBody : null,
        assertions: this.assertions
      });

      this.renderCollectionsList();
      fetch('/api/tester/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: this.collections })
      });

      if (window.showToast) window.showToast(`Saved to collection: ${targetCol.name}`);
    }

    // ----------------------------------------------------------------
    // HELPERS
    // ----------------------------------------------------------------
    escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    syntaxHighlightJson(jsonObj) {
      if (typeof jsonObj !== 'string') {
        jsonObj = JSON.stringify(jsonObj, undefined, 2);
      }
      jsonObj = jsonObj.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return jsonObj.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
    }
  }

  window.ApiTesterTool = ApiTesterTool;
})();
