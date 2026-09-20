/**
 * client/js/tools/settings.js
 * Settings UI Controller for WebDev AI Studio.
 */

(function () {
  'use strict';

  function init() {
    setupSettingsNavigation();
    bindSettingsControls();
    bindSeoProviderControls();
    setupDataManagementModals();
  }

  function setupSettingsNavigation() {
    // Nav to settings from sidebar, top header, or command palette
    document.querySelectorAll('[data-view="settings"], .js-open-settings').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openSettings();
      });
    });
  }

  function openSettings() {
    // Hide other views
    ['viewDashboard', 'viewWebsiteQa', 'viewProjects', 'viewHistory', 'viewResponsiveTester', 'viewApiTester', 'viewAutomatedQa', 'viewSeoAudit', 'viewDesignToCode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const settingsView = document.getElementById('viewSettings');
    if (settingsView) settingsView.style.display = 'block';

    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = 'Settings';

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navSettings = document.getElementById('navSettings');
    if (navSettings) navSettings.classList.add('active');

    syncFormWithSettings();
    fetchDiagnostics();
    fetchSeoProviderStatuses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function fetchDiagnostics() {
    const nodeEl = document.getElementById('diagNodeVersion');
    const pwEl = document.getElementById('diagPwVersion');
    const crEl = document.getElementById('diagChromiumStatus');
    const ffEl = document.getElementById('diagFirefoxStatus');
    const wkEl = document.getElementById('diagWebkitStatus');
    const edEl = document.getElementById('diagEdgeStatus');

    try {
      const res = await fetch('/api/responsive/diagnostics');
      const data = await res.json();
      if (!data || !data.success) return;

      if (nodeEl) nodeEl.textContent = data.nodeVersion || 'v26.4.0';
      if (pwEl) pwEl.textContent = data.playwrightVersion || '1.63.0';

      if (crEl && data.browsers?.chromium) {
        const b = data.browsers.chromium;
        crEl.className = `meta-value font-mono ${b.installed ? 'text-success' : 'text-muted'}`;
        crEl.textContent = b.installed ? `✓ Installed (${b.label})` : '○ Not Installed';
      }

      if (ffEl && data.browsers?.firefox) {
        const b = data.browsers.firefox;
        ffEl.className = `meta-value font-mono ${b.installed ? 'text-success' : 'text-muted'}`;
        ffEl.textContent = b.installed ? `✓ Installed (${b.label})` : '○ Not Installed';
      }

      if (wkEl && data.browsers?.webkit) {
        const b = data.browsers.webkit;
        wkEl.className = `meta-value font-mono ${b.installed ? 'text-success' : 'text-muted'}`;
        wkEl.textContent = b.installed ? `✓ Installed (${b.label})` : '○ Not Installed';
      }

      if (edEl && data.browsers?.edge) {
        const b = data.browsers.edge;
        edEl.className = `meta-value font-mono ${b.installed ? 'text-success' : 'text-muted'}`;
        edEl.textContent = b.installed ? `✓ Installed (${b.label})` : '○ Not Installed';
      }
    } catch (err) {
      console.warn('Failed to load responsive diagnostics:', err);
    }
  }

  function syncFormWithSettings() {
    if (!window.SettingsManager) return;
    const settings = window.SettingsManager.getSettings();

    // Theme Radios/Select
    const themeSelect = document.getElementById('settingTheme');
    if (themeSelect) themeSelect.value = settings.theme;

    // Accent
    const accentSelect = document.getElementById('settingAccent');
    if (accentSelect) accentSelect.value = settings.accentColor;

    // Density
    const densitySelect = document.getElementById('settingDensity');
    if (densitySelect) densitySelect.value = settings.density;

    // Reduce Motion
    const motionCheckbox = document.getElementById('settingReduceMotion');
    if (motionCheckbox) motionCheckbox.checked = settings.reduceMotion;

    // Font Size
    const fontSizeSelect = document.getElementById('settingFontSize');
    if (fontSizeSelect) fontSizeSelect.value = settings.fontSize;

    // Tab Size
    const tabSizeSelect = document.getElementById('settingTabSize');
    if (tabSizeSelect) tabSizeSelect.value = settings.tabSize;

    // Word Wrap
    const wordWrapCheckbox = document.getElementById('settingWordWrap');
    if (wordWrapCheckbox) wordWrapCheckbox.checked = settings.wordWrap;

    // Line Numbers
    const lineNumbersCheckbox = document.getElementById('settingLineNumbers');
    if (lineNumbersCheckbox) lineNumbersCheckbox.checked = settings.lineNumbers;

    // Request Timeout
    const timeoutSelect = document.getElementById('settingTimeout');
    if (timeoutSelect) timeoutSelect.value = settings.requestTimeout;

    // Check External Links
    const checkExtCheckbox = document.getElementById('settingCheckExternalLinks');
    if (checkExtCheckbox) checkExtCheckbox.checked = settings.checkExternalLinks;

    // Store Scan History
    const storeHistoryCheckbox = document.getElementById('settingStoreScanHistory');
    if (storeHistoryCheckbox) storeHistoryCheckbox.checked = settings.storeScanHistory;
  }

  function bindSettingsControls() {
    if (!window.SettingsManager) return;

    function bindChange(id, key, parser = v => v) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          const val = el.type === 'checkbox' ? el.checked : parser(e.target.value);
          window.SettingsManager.updateSettings({ [key]: val });
          showSettingsToast(`Updated ${key}`);
        });
      }
    }

    bindChange('settingTheme', 'theme');
    bindChange('settingAccent', 'accentColor');
    bindChange('settingDensity', 'density');
    bindChange('settingReduceMotion', 'reduceMotion');
    bindChange('settingFontSize', 'fontSize', parseInt);
    bindChange('settingTabSize', 'tabSize', parseInt);
    bindChange('settingWordWrap', 'wordWrap');
    bindChange('settingLineNumbers', 'lineNumbers');
    bindChange('settingTimeout', 'requestTimeout', parseInt);
    bindChange('settingCheckExternalLinks', 'checkExternalLinks');
    bindChange('settingStoreScanHistory', 'storeScanHistory');

    const refreshDiagBtn = document.getElementById('btnRefreshDiagnostics');
    if (refreshDiagBtn) {
      refreshDiagBtn.addEventListener('click', async () => {
        refreshDiagBtn.disabled = true;
        refreshDiagBtn.textContent = 'Checking...';
        await fetchDiagnostics();
        refreshDiagBtn.disabled = false;
        refreshDiagBtn.textContent = 'Refresh Diagnostics';
        showSettingsToast('Browser diagnostics refreshed');
      });
    }
  }

  function setupDataManagementModals() {
    // Clear History Button
    const btnClearHistory = document.getElementById('btnClearHistory');
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history records? This action cannot be undone.')) {
          window.SettingsManager.clearHistory(() => true);
          showSettingsToast('History cleared');
        }
      });
    }

    // Clear Projects Button
    const btnClearProjects = document.getElementById('btnClearProjects');
    if (btnClearProjects) {
      btnClearProjects.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all projects? This action cannot be undone.')) {
          window.SettingsManager.clearProjects(() => true);
          showSettingsToast('Projects cleared');
        }
      });
    }

    // Reset Application Data Button
    const btnResetAll = document.getElementById('btnResetAllData');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all application settings, projects, and history?')) {
          window.SettingsManager.resetAllData(() => true);
          syncFormWithSettings();
          showSettingsToast('Application data reset to defaults');
        }
      });
    }
  }

  async function fetchSeoProviderStatuses() {
    try {
      const res = await fetch('/api/seo/providers/status');
      const data = await res.json();
      if (!data || !data.success) return;

      const p = data.providers;

      // GSC
      const gscBadge = document.getElementById('gscStatusBadge');
      const btnConnectGsc = document.getElementById('btnConnectGsc');
      const btnSyncGsc = document.getElementById('btnSyncGsc');
      const btnDisconnectGsc = document.getElementById('btnDisconnectGsc');
      const gscWrap = document.getElementById('gscPropertiesWrap');
      const gscCount = document.getElementById('gscPropertiesCount');

      if (gscBadge && p['google-search-console']) {
        const gsc = p['google-search-console'];
        if (gsc.connected) {
          gscBadge.textContent = 'Connected (Verified)';
          gscBadge.style.background = '#ecfdf5';
          gscBadge.style.color = '#059669';
          if (btnConnectGsc) btnConnectGsc.style.display = 'none';
          if (btnSyncGsc) btnSyncGsc.style.display = 'inline-flex';
          if (btnDisconnectGsc) btnDisconnectGsc.style.display = 'inline-flex';
          if (gscWrap) gscWrap.style.display = 'block';
          if (gscCount) gscCount.textContent = `${gsc.propertiesCount || 0} properties`;
        } else {
          gscBadge.textContent = 'Disconnected';
          gscBadge.style.background = '#f1f5f9';
          gscBadge.style.color = '#64748b';
          if (btnConnectGsc) btnConnectGsc.style.display = 'inline-flex';
          if (btnSyncGsc) btnSyncGsc.style.display = 'none';
          if (btnDisconnectGsc) btnDisconnectGsc.style.display = 'none';
          if (gscWrap) gscWrap.style.display = 'none';
        }
      }

      // Bing
      const bingBadge = document.getElementById('bingStatusBadge');
      const btnDisconnectBing = document.getElementById('btnDisconnectBing');
      if (bingBadge && p['bing-webmaster']) {
        const b = p['bing-webmaster'];
        if (b.connected) {
          bingBadge.textContent = 'Connected';
          bingBadge.style.background = '#ecfdf5';
          bingBadge.style.color = '#059669';
          if (btnDisconnectBing) btnDisconnectBing.style.display = 'inline-flex';
        } else {
          bingBadge.textContent = 'Not Configured';
          bingBadge.style.background = '#f1f5f9';
          bingBadge.style.color = '#64748b';
          if (btnDisconnectBing) btnDisconnectBing.style.display = 'none';
        }
      }

      // Ahrefs
      const ahrefsBadge = document.getElementById('ahrefsStatusBadge');
      const btnDisconnectAhrefs = document.getElementById('btnDisconnectAhrefs');
      if (ahrefsBadge && p['ahrefs']) {
        const a = p['ahrefs'];
        if (a.connected || a.hasEnvKey) {
          ahrefsBadge.textContent = 'Connected (DR Active)';
          ahrefsBadge.style.background = '#ecfdf5';
          ahrefsBadge.style.color = '#059669';
          if (btnDisconnectAhrefs) btnDisconnectAhrefs.style.display = 'inline-flex';
        } else {
          ahrefsBadge.textContent = 'Not Configured';
          ahrefsBadge.style.background = '#f1f5f9';
          ahrefsBadge.style.color = '#64748b';
          if (btnDisconnectAhrefs) btnDisconnectAhrefs.style.display = 'none';
        }
      }

      // PageSpeed
      const psBadge = document.getElementById('pagespeedStatusBadge');
      const btnDisconnectPs = document.getElementById('btnDisconnectPageSpeed');
      if (psBadge && p['pagespeed']) {
        const ps = p['pagespeed'];
        if (ps.connected) {
          psBadge.textContent = '● Connected';
          psBadge.style.background = '#ecfdf5';
          psBadge.style.color = '#059669';
          if (btnDisconnectPs) btnDisconnectPs.style.display = 'inline-block';
        } else {
          psBadge.textContent = '○ Not configured';
          psBadge.style.background = '#f1f5f9';
          psBadge.style.color = '#64748b';
          if (btnDisconnectPs) btnDisconnectPs.style.display = 'none';
        }
      }
    } catch (err) {
      console.warn('Failed to fetch SEO provider statuses:', err);
    }
  }

  function bindSeoProviderControls() {
    // GSC Connect
    const btnConnectGsc = document.getElementById('btnConnectGsc');
    if (btnConnectGsc) {
      btnConnectGsc.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/seo/gsc/auth-url');
          const data = await res.json();
          if (data.success && data.authUrl) {
            window.location.href = data.authUrl;
          } else {
            alert(data.error || 'Failed to initiate Google Search Console authorization.');
          }
        } catch (e) {
          alert('Error connecting to Search Console: ' + e.message);
        }
      });
    }

    // GSC Sync
    const btnSyncGsc = document.getElementById('btnSyncGsc');
    if (btnSyncGsc) {
      btnSyncGsc.addEventListener('click', async () => {
        btnSyncGsc.disabled = true;
        btnSyncGsc.textContent = 'Syncing...';
        try {
          const res = await fetch('/api/seo/gsc/sync', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showSettingsToast(`GSC synced: ${data.properties?.length || 0} properties updated.`);
            fetchSeoProviderStatuses();
          } else {
            alert(data.error || 'Sync failed.');
          }
        } catch (e) {
          alert('Sync error: ' + e.message);
        } finally {
          btnSyncGsc.disabled = false;
          btnSyncGsc.textContent = 'Sync Data';
        }
      });
    }

    // GSC Disconnect
    const btnDisconnectGsc = document.getElementById('btnDisconnectGsc');
    if (btnDisconnectGsc) {
      btnDisconnectGsc.addEventListener('click', async () => {
        if (!confirm('Disconnect Google Search Console?')) return;
        try {
          await fetch('/api/seo/gsc/disconnect', { method: 'POST' });
          showSettingsToast('Google Search Console disconnected.');
          fetchSeoProviderStatuses();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    // Bing Save & Test
    const btnSaveBing = document.getElementById('btnSaveBingKey');
    const inputBing = document.getElementById('inputBingApiKey');
    if (btnSaveBing && inputBing) {
      btnSaveBing.addEventListener('click', async () => {
        const apiKey = inputBing.value.trim();
        if (!apiKey) return alert('Please enter your Bing Webmaster API key.');
        btnSaveBing.disabled = true;
        btnSaveBing.textContent = 'Validating...';
        try {
          const res = await fetch('/api/seo/bing/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey })
          });
          const data = await res.json();
          if (data.success) {
            showSettingsToast('Bing Webmaster API key connected successfully.');
            inputBing.value = '';
            fetchSeoProviderStatuses();
          } else {
            alert(data.error || 'Validation failed.');
          }
        } catch (e) {
          alert('Error: ' + e.message);
        } finally {
          btnSaveBing.disabled = false;
          btnSaveBing.textContent = 'Save & Test';
        }
      });
    }

    // Bing Disconnect
    const btnDisconnectBing = document.getElementById('btnDisconnectBing');
    if (btnDisconnectBing) {
      btnDisconnectBing.addEventListener('click', async () => {
        if (!confirm('Disconnect Bing Webmaster Tools?')) return;
        try {
          await fetch('/api/seo/bing/disconnect', { method: 'POST' });
          showSettingsToast('Bing Webmaster Tools disconnected.');
          fetchSeoProviderStatuses();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    // Ahrefs Save & Test
    const btnSaveAhrefs = document.getElementById('btnSaveAhrefsKey');
    const inputAhrefs = document.getElementById('inputAhrefsApiKey');
    if (btnSaveAhrefs && inputAhrefs) {
      btnSaveAhrefs.addEventListener('click', async () => {
        const apiKey = inputAhrefs.value.trim();
        if (!apiKey) return alert('Please enter your Ahrefs API key.');
        btnSaveAhrefs.disabled = true;
        btnSaveAhrefs.textContent = 'Validating...';
        try {
          const res = await fetch('/api/seo/ahrefs/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey })
          });
          const data = await res.json();
          if (data.success) {
            showSettingsToast('Ahrefs API key connected successfully.');
            inputAhrefs.value = '';
            fetchSeoProviderStatuses();
          } else {
            alert(data.error || 'Validation failed.');
          }
        } catch (e) {
          alert('Error: ' + e.message);
        } finally {
          btnSaveAhrefs.disabled = false;
          btnSaveAhrefs.textContent = 'Save & Test';
        }
      });
    }

    // Ahrefs Disconnect
    const btnDisconnectAhrefs = document.getElementById('btnDisconnectAhrefs');
    if (btnDisconnectAhrefs) {
      btnDisconnectAhrefs.addEventListener('click', async () => {
        if (!confirm('Disconnect Ahrefs API key?')) return;
        try {
          await fetch('/api/seo/ahrefs/disconnect', { method: 'POST' });
          showSettingsToast('Ahrefs API key removed.');
          fetchSeoProviderStatuses();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    // PageSpeed Save & Test
    const btnSavePageSpeed = document.getElementById('btnSavePageSpeedKey');
    const inputPageSpeed = document.getElementById('inputPageSpeedApiKey');
    const btnDisconnectPageSpeed = document.getElementById('btnDisconnectPageSpeed');

    if (btnSavePageSpeed && inputPageSpeed) {
      btnSavePageSpeed.addEventListener('click', async () => {
        const apiKey = inputPageSpeed.value.trim();
        if (!apiKey) {
          alert('Please enter a Google PageSpeed API Key to test and connect.');
          return;
        }
        btnSavePageSpeed.disabled = true;
        btnSavePageSpeed.textContent = 'Testing...';
        try {
          const res = await fetch('/api/seo/pagespeed/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey })
          });
          const data = await res.json();
          if (data.success) {
            showSettingsToast('Google PageSpeed Insights API key verified and connected!');
            inputPageSpeed.value = '';
            fetchSeoProviderStatuses();
          } else {
            alert('PageSpeed validation failed: ' + (data.error || 'Invalid API key or quota exceeded.'));
          }
        } catch (e) {
          alert('Error validating PageSpeed key: ' + e.message);
        } finally {
          btnSavePageSpeed.disabled = false;
          btnSavePageSpeed.textContent = 'Save & Test';
        }
      });
    }

    if (btnDisconnectPageSpeed) {
      btnDisconnectPageSpeed.addEventListener('click', async () => {
        if (!confirm('Remove saved Google PageSpeed API key?')) return;
        btnDisconnectPageSpeed.disabled = true;
        try {
          const res = await fetch('/api/seo/pagespeed/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: '' })
          });
          const data = await res.json();
          if (data.success) {
            showSettingsToast('Google PageSpeed API key removed.');
            fetchSeoProviderStatuses();
          }
        } catch (e) {
          alert('Error: ' + e.message);
        } finally {
          btnDisconnectPageSpeed.disabled = false;
        }
      });
    }
  }

  function showSettingsToast(msg) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${msg}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 180ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }

  window.SettingsView = {
    open: openSettings
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
