/**
 * client/js/services/settings-manager.js
 * Central Settings Manager for WebDev AI Studio.
 * Handles Appearance, Editor, Scanner, and Data Management settings with localStorage.
 */

(function () {
  'use strict';

  const SETTINGS_KEY = 'webdev_ai_studio_settings';

  const DEFAULT_SETTINGS = {
    theme: 'light',          // 'light' | 'dark' | 'system'
    accentColor: 'blue',     // 'blue' | 'purple' | 'green' | 'orange'
    density: 'comfortable',  // 'comfortable' | 'compact'
    reduceMotion: false,     // boolean
    fontSize: 14,            // 12 | 13 | 14 | 15 | 16
    tabSize: 2,              // 2 | 4
    wordWrap: true,          // boolean
    lineNumbers: true,       // boolean
    requestTimeout: 12,      // 5 | 10 | 12 | 20
    checkExternalLinks: true,// boolean
    storeScanHistory: true   // boolean
  };

  let listeners = [];

  class SettingsManager {
    constructor() {
      this.settings = this.loadSettings();
      this.initMediaListeners();
      this.applySettings();
    }

    loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // If legacy session had dark theme set by default, migrate to light theme & blue accent
          if (!localStorage.getItem('webdev_ai_theme_migrated_v2')) {
            localStorage.setItem('webdev_ai_theme_migrated_v2', 'true');
            parsed.theme = 'light';
            parsed.accentColor = 'blue';
          }
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch (e) {
        console.warn('[SettingsManager] Failed to read settings from localStorage, using defaults.', e);
      }
      return { ...DEFAULT_SETTINGS };
    }

    saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.error('[SettingsManager] Failed to persist settings to localStorage.', e);
      }
    }

    getSettings() {
      return { ...this.settings };
    }

    getSetting(key) {
      return this.settings[key] !== undefined ? this.settings[key] : DEFAULT_SETTINGS[key];
    }

    updateSettings(partial) {
      this.settings = { ...this.settings, ...partial };
      this.saveSettings();
      this.applySettings();
      this.notifyListeners();
      return { ...this.settings };
    }

    resetSettings() {
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveSettings();
      this.applySettings();
      this.notifyListeners();
      return { ...this.settings };
    }

    initMediaListeners() {
      if (window.matchMedia) {
        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        colorSchemeQuery.addEventListener('change', () => {
          if (this.settings.theme === 'system') {
            this.applyTheme();
          }
        });

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', (e) => {
          if (this.settings.reduceMotion === false && e.matches) {
            document.documentElement.setAttribute('data-reduce-motion', 'true');
          }
        });
      }
    }

    applySettings() {
      this.applyTheme();
      this.applyAccent();
      this.applyDensity();
      this.applyMotion();
      this.applyEditorPrefs();
    }

    applyTheme() {
      let resolvedTheme = this.settings.theme;
      if (resolvedTheme === 'system') {
        const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = isSystemDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }

    applyAccent() {
      document.documentElement.setAttribute('data-accent', this.settings.accentColor);
    }

    applyDensity() {
      document.documentElement.setAttribute('data-density', this.settings.density);
    }

    applyMotion() {
      const isMotionReduced = this.settings.reduceMotion ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      document.documentElement.setAttribute('data-reduce-motion', isMotionReduced ? 'true' : 'false');
    }

    applyEditorPrefs() {
      document.documentElement.style.setProperty('--code-font-size', `${this.settings.fontSize}px`);
      document.documentElement.style.setProperty('--code-tab-size', `${this.settings.tabSize}`);
    }

    subscribe(callback) {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    }

    notifyListeners() {
      listeners.forEach(fn => {
        try {
          fn(this.getSettings());
        } catch (e) {
          console.error('[SettingsManager] Error in listener callback', e);
        }
      });
    }

    // Confirmation-guarded data actions
    clearHistory(confirmCallback) {
      if (confirmCallback()) {
        localStorage.removeItem('webdev_ai_studio_history');
        if (window.HistoryManager) {
          window.HistoryManager.reload();
        }
        return true;
      }
      return false;
    }

    clearProjects(confirmCallback) {
      if (confirmCallback()) {
        localStorage.removeItem('webdev_ai_studio_projects');
        if (window.ProjectManager) {
          window.ProjectManager.reload();
        }
        return true;
      }
      return false;
    }

    resetAllData(confirmCallback) {
      if (confirmCallback()) {
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem('webdev_ai_studio_projects');
        localStorage.removeItem('webdev_ai_studio_history');
        this.resetSettings();
        if (window.ProjectManager) window.ProjectManager.reload();
        if (window.HistoryManager) window.HistoryManager.reload();
        return true;
      }
      return false;
    }
  }

  window.SettingsManager = new SettingsManager();
})();
