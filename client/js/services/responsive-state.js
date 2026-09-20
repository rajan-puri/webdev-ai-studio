/**
 * client/js/services/responsive-state.js
 * Central State Management & Canonical Utilities for Responsive Tester.
 * Single source of truth for runtime configurations, test results,
 * UI panel layouts, and canonical URL normalization.
 */

(function () {
  'use strict';

  /**
   * Canonical URL Normalizer.
   * Resolves, trims, validates, and normalizes target URLs across the application.
   * Eliminates competing normalization routines and "cleanUrl is not defined" errors.
   */
  function normalizeTargetUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return 'https://example.com/';
    }

    let trimmed = rawUrl.trim();
    if (!trimmed) {
      return 'https://example.com/';
    }

    // Default to https:// if no scheme is provided
    if (!/^https?:\/\//i.test(trimmed)) {
      if (trimmed.startsWith('//')) {
        trimmed = 'https:' + trimmed;
      } else if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
        trimmed = 'http://' + trimmed;
      } else {
        trimmed = 'https://' + trimmed;
      }
    }

    try {
      const parsed = new URL(trimmed);
      // Disallow javascript:, data:, file:, etc.
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'https://example.com/';
      }
      return parsed.href;
    } catch (e) {
      return trimmed;
    }
  }

  // Expose globally
  window.normalizeTargetUrl = normalizeTargetUrl;

  /**
   * Single Source of Truth for runtime test configuration
   * Unifies browser, device profile, orientation, DPR, and viewport across:
   * Playwright, Mockup, Screenshot, State, History, and Report.
   */
  function resolveTestConfig(browserType, device, orientation = 'portrait', customViewport = null) {
    const normBrowser = (browserType || 'chromium').toLowerCase();
    const resolvedBrowser = normBrowser === 'chrome' ? 'chromium' : (normBrowser === 'safari' ? 'webkit' : normBrowser);
    const browserMap = {
      chromium: 'Chrome / Chromium',
      firefox: 'Firefox',
      webkit: 'Safari / WebKit',
      edge: 'Microsoft Edge'
    };
    const browserLabel = browserMap[resolvedBrowser] || 'Chromium';

    if (customViewport && customViewport.width && customViewport.height) {
      const w = Math.min(3840, Math.max(320, parseInt(customViewport.width, 10) || 1280));
      const h = Math.min(3840, Math.max(320, parseInt(customViewport.height, 10) || 800));
      const dpr = Math.min(3, Math.max(1, parseFloat(customViewport.deviceScaleFactor) || 1));
      return {
        browser: resolvedBrowser,
        browserLabel,
        device: {
          id: `custom-${w}x${h}`,
          name: `Custom (${w}×${h})`,
          category: 'desktop',
          mockupType: 'desktop',
          viewportWidth: w,
          viewportHeight: h,
          deviceScaleFactor: dpr,
          isMobile: false,
          hasTouch: false,
          isCustom: true
        },
        deviceName: `Custom (${w}×${h})`,
        category: 'desktop',
        mockupType: 'desktop',
        viewport: { width: w, height: h },
        deviceScaleFactor: dpr,
        isMobile: false,
        hasTouch: false,
        orientation: w >= h ? 'landscape' : 'portrait',
        userAgent: ''
      };
    }

    const dev = device || {
      id: 'iphone-15-pro',
      name: 'iPhone 15 Pro',
      category: 'mobile',
      mockupType: 'iphone',
      viewportWidth: 393,
      viewportHeight: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    };

    const isLandscape = orientation === 'landscape';
    const baseW = dev.viewportWidth || dev.width || 390;
    const baseH = dev.viewportHeight || dev.height || 844;
    const vpW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
    const vpH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);

    let mockupType = dev.mockupType;
    if (!mockupType) {
      const cat = (dev.category || '').toLowerCase();
      if (cat.includes('tablet')) mockupType = 'ipad';
      else if (cat.includes('laptop')) mockupType = 'macbook';
      else if (cat.includes('desktop')) mockupType = 'desktop';
      else if (dev.subCategory === 'android') mockupType = 'android';
      else mockupType = 'iphone';
    }

    return {
      browser: resolvedBrowser,
      browserLabel,
      device: dev,
      deviceName: dev.name || 'Device',
      category: dev.category || 'mobile',
      mockupType,
      viewport: { width: vpW, height: vpH },
      deviceScaleFactor: dev.deviceScaleFactor || dev.pixelRatio || 1,
      isMobile: Boolean(dev.isMobile),
      hasTouch: Boolean(dev.hasTouch),
      orientation: isLandscape ? 'landscape' : 'portrait',
      userAgent: dev.userAgent || ''
    };
  }

  window.resolveTestConfig = resolveTestConfig;

  /**
   * Central Responsive Tester State
   */
  const initialState = {
    // URL
    url: 'https://example.com/',
    normalizedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',

    // Mode: 'interactive' | 'playwright' | 'simulation'
    mode: 'interactive',

    // Browser Engine: 'chromium' | 'firefox' | 'webkit' | 'edge'
    browser: 'chromium',
    browserEngine: 'Chromium',
    browserVersion: '',

    // Active Device Profile
    device: {
      id: 'iphone-15-pro',
      name: 'iPhone 15 Pro',
      category: 'mobile',
      subCategory: 'apple',
      mockupType: 'iphone',
      viewportWidth: 393,
      viewportHeight: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: 'webkit'
    },

    // Orientation: 'portrait' | 'landscape'
    orientation: 'portrait',
    viewportWidth: 393,
    viewportHeight: 852,
    dpr: 3,

    // Security & Embedding
    embeddingStatus: 'checking', // 'allowed' | 'blocked' | 'checking'
    embeddingHeaders: null,
    embeddingBlockedReason: null,

    // Active Playwright Session
    activeSessionId: 'default-session',
    activeSessions: [],

    // Test Results
    latestTest: null,
    latestCompletedTest: null,

    // Navigation Capability
    navigation: {
      canGoBack: false,
      canGoForward: false
    },

    // Telemetry
    timing: null,
    consoleLogs: [],
    networkErrors: [],
    responsiveIssues: [],
    overflow: null,

    // Screenshots
    screenshots: [],

    // Test Suites
    breakpointResults: null,
    browserMatrixResults: null,
    deviceMatrixResults: null,

    // UI Layout
    ui: {
      deviceLibraryOpen: true,
      detailsPanelOpen: true,
      bottomPanelOpen: false,
      activeBottomTab: 'console',
      fullscreen: false,
      maximized: false,
      previewScale: 1.0,
      fitMode: true
    }
  };

  class ResponsiveStateManager {
    constructor() {
      this.state = { ...initialState };
      this.listeners = new Set();
    }

    getState() {
      return this.state;
    }

    setState(partial) {
      const prev = { ...this.state };
      this.state = {
        ...this.state,
        ...partial,
        ui: partial.ui ? { ...this.state.ui, ...partial.ui } : this.state.ui,
        navigation: partial.navigation ? { ...this.state.navigation, ...partial.navigation } : this.state.navigation
      };

      // Notify subscribers
      for (const fn of this.listeners) {
        try {
          fn(this.state, prev);
        } catch (e) {
          console.error('[ResponsiveState] Subscriber error:', e);
        }
      }
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    setUrl(url) {
      const normalized = normalizeTargetUrl(url);
      this.setState({
        url: normalized,
        normalizedUrl: normalized,
        finalUrl: normalized
      });
    }

    setDevice(device) {
      if (!device) return;
      const isLandscape = this.state.orientation === 'landscape';
      const w = isLandscape ? (device.viewportHeight || device.height) : (device.viewportWidth || device.width);
      const h = isLandscape ? (device.viewportWidth || device.width) : (device.viewportHeight || device.height);

      this.setState({
        device,
        viewportWidth: w,
        viewportHeight: h,
        dpr: device.deviceScaleFactor || 1,
        browser: device.defaultBrowserType || this.state.browser
      });
    }

    setOrientation(orientation) {
      const isLandscape = orientation === 'landscape';
      const dev = this.state.device;
      const w = isLandscape ? (dev.viewportHeight || dev.height) : (dev.viewportWidth || dev.width);
      const h = isLandscape ? (dev.viewportWidth || dev.width) : (dev.viewportHeight || dev.height);

      this.setState({
        orientation,
        viewportWidth: w,
        viewportHeight: h
      });
    }

    setMode(mode) {
      this.setState({ mode });
    }

    setBrowser(browser) {
      this.setState({ browser });
    }

    toggleDeviceLibrary() {
      this.setState({
        ui: { ...this.state.ui, deviceLibraryOpen: !this.state.ui.deviceLibraryOpen }
      });
    }

    toggleDetailsPanel() {
      this.setState({
        ui: { ...this.state.ui, detailsPanelOpen: !this.state.ui.detailsPanelOpen }
      });
    }

    toggleBottomPanel(tab) {
      const currentTab = this.state.ui.activeBottomTab;
      const isOpen = this.state.ui.bottomPanelOpen;

      if (tab) {
        if (isOpen && currentTab === tab) {
          // Clicking active tab collapses drawer
          this.setState({ ui: { ...this.state.ui, bottomPanelOpen: false } });
        } else {
          // Open or switch tab
          this.setState({ ui: { ...this.state.ui, bottomPanelOpen: true, activeBottomTab: tab } });
        }
      } else {
        this.setState({ ui: { ...this.state.ui, bottomPanelOpen: !isOpen } });
      }
    }

    toggleMaximizePreview() {
      const nextMax = !this.state.ui.maximized;
      this.setState({
        ui: {
          ...this.state.ui,
          maximized: nextMax,
          deviceLibraryOpen: nextMax ? false : true,
          detailsPanelOpen: nextMax ? false : true,
          bottomPanelOpen: nextMax ? false : this.state.ui.bottomPanelOpen
        }
      });
    }
  }

  // Global Singleton
  window.responsiveTesterState = new ResponsiveStateManager();
  window.ResponsiveState = window.responsiveTesterState;
})();
