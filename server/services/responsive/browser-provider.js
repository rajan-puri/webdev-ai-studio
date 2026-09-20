/**
 * server/services/responsive/browser-provider.js
 * Provider-ready browser abstraction interface.
 * Implements PlaywrightProvider for Chromium, Firefox, WebKit, and detected Edge.
 */

const { chromium, firefox, webkit, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

class BrowserProvider {
  async getBrowser(browserType) {
    throw new Error('getBrowser() must be implemented by provider.');
  }

  isEngineAvailable(browserType) {
    throw new Error('isEngineAvailable() must be implemented by provider.');
  }

  getDiagnostics() {
    throw new Error('getDiagnostics() must be implemented by provider.');
  }
}

class PlaywrightProvider extends BrowserProvider {
  constructor() {
    super();
    this.launchedBrowsers = new Map();
    this.edgeDetected = this.detectEdge();
  }

  detectEdge() {
    // Check common locations for Microsoft Edge executable
    const edgePaths = [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable'
    ];

    for (const p of edgePaths) {
      if (fs.existsSync(p)) {
        return { installed: true, path: p };
      }
    }
    return { installed: false, path: null };
  }

  isEngineAvailable(browserType) {
    const type = (browserType || 'chromium').toLowerCase();
    if (type === 'edge' || type === 'msedge') {
      return this.edgeDetected.installed;
    }
    return ['chromium', 'chrome', 'firefox', 'webkit', 'safari'].includes(type);
  }

  normalizeBrowserType(type) {
    const t = (type || 'chromium').toLowerCase();
    if (t === 'chrome' || t === 'chromium') return 'chromium';
    if (t === 'firefox') return 'firefox';
    if (t === 'safari' || t === 'webkit') return 'webkit';
    if (t === 'edge' || t === 'msedge') return 'edge';
    return 'chromium';
  }

  async getBrowser(browserType) {
    const norm = this.normalizeBrowserType(browserType);

    if (this.launchedBrowsers.has(norm)) {
      const existing = this.launchedBrowsers.get(norm);
      if (existing.isConnected()) {
        return existing;
      }
    }

    let instance;
    if (norm === 'chromium') {
      instance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--mute-audio'
        ]
      });
    } else if (norm === 'firefox') {
      instance = await firefox.launch({
        headless: true,
        firefoxUserPrefs: {
          'media.volume_scale': '0.0'
        }
      });
    } else if (norm === 'webkit') {
      instance = await webkit.launch({
        headless: true
      });
    } else if (norm === 'edge') {
      if (!this.edgeDetected.installed) {
        throw new Error('Microsoft Edge is not installed in this environment.');
      }
      instance = await chromium.launch({
        channel: 'msedge',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } else {
      throw new Error(`Unsupported browser engine: ${browserType}`);
    }

    this.launchedBrowsers.set(norm, instance);
    return instance;
  }

  async getDiagnostics() {
    let pwVersion = 'Unknown';
    try {
      pwVersion = require('playwright/package.json').version;
    } catch (e) {}

    const edgeStatus = this.detectEdge();

    return {
      nodeVersion: process.version,
      playwrightVersion: pwVersion,
      platform: process.platform,
      arch: process.arch,
      browsers: {
        chromium: {
          installed: true,
          label: 'Chromium / Chrome',
          engine: 'Chromium',
          channel: 'builtin'
        },
        firefox: {
          installed: true,
          label: 'Firefox',
          engine: 'Firefox / Gecko',
          channel: 'builtin'
        },
        webkit: {
          installed: true,
          label: 'Safari / WebKit',
          engine: 'WebKit',
          channel: 'builtin'
        },
        edge: {
          installed: edgeStatus.installed,
          label: 'Microsoft Edge',
          engine: 'Chromium Edge',
          channel: edgeStatus.installed ? edgeStatus.path : 'Not installed'
        }
      }
    };
  }

  /**
   * Returns organized device profiles based on Playwright's genuine devices registry.
   */
  getDeviceProfiles() {
    const rawDevices = devices;
    const deviceNames = Object.keys(rawDevices);

    const categories = {
      popular: [],
      apple: [],
      android: [],
      google: [],
      tablets: [],
      laptops: [],
      desktop: []
    };

    // Filter out landscape duplicate profile names (we handle orientation dynamically)
    const portraitNames = deviceNames.filter(name => !name.toLowerCase().endsWith(' landscape'));

    for (const name of portraitNames) {
      const dev = rawDevices[name];
      const lower = name.toLowerCase();

      // Determine viewport & screen dimensions
      const viewportWidth = dev.viewport ? dev.viewport.width : (dev.screen ? dev.screen.width : 390);
      const viewportHeight = dev.viewport ? dev.viewport.height : (dev.screen ? dev.screen.height : 844);
      const screenWidth = dev.screen ? dev.screen.width : viewportWidth;
      const screenHeight = dev.screen ? dev.screen.height : viewportHeight;

      const profile = {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: name,
        playwrightName: name,
        viewport: { width: viewportWidth, height: screenHeight || viewportHeight },
        viewportWidth,
        viewportHeight: screenHeight || viewportHeight,
        screenWidth,
        screenHeight,
        deviceScaleFactor: dev.deviceScaleFactor || 1,
        isMobile: Boolean(dev.isMobile),
        hasTouch: Boolean(dev.hasTouch),
        defaultBrowserType: dev.defaultBrowserType || 'chromium',
        defaultBrowserEngine: dev.defaultBrowserType || (lower.includes('iphone') || lower.includes('ipad') ? 'webkit' : 'chromium'),
        userAgent: dev.userAgent || '',
        category: 'mobile'
      };

      // Categorize
      if (lower.includes('iphone') || lower.includes('ipad')) {
        profile.subCategory = 'apple';
        profile.defaultBrowserEngine = 'webkit';
        profile.defaultBrowserType = 'webkit';
        if (lower.includes('ipad')) {
          profile.category = 'tablet';
          categories.tablets.push(profile);
        } else {
          profile.category = 'mobile';
          categories.apple.push(profile);
        }
      } else if (lower.includes('pixel')) {
        profile.category = 'mobile';
        profile.subCategory = 'google';
        profile.defaultBrowserEngine = 'chromium';
        profile.defaultBrowserType = 'chromium';
        categories.google.push(profile);
        categories.android.push(profile);
      } else if (lower.includes('galaxy') || lower.includes('nexus') || lower.includes('xperia') || lower.includes('moto') || lower.includes('android')) {
        profile.defaultBrowserEngine = 'chromium';
        profile.defaultBrowserType = 'chromium';
        if (lower.includes('tab')) {
          profile.category = 'tablet';
          profile.subCategory = 'android';
          categories.tablets.push(profile);
        } else {
          profile.category = 'mobile';
          profile.subCategory = 'android';
          categories.android.push(profile);
        }
      } else if (lower.includes('kindle') || lower.includes('tablet') || lower.includes('playbook')) {
        profile.category = 'tablet';
        profile.subCategory = 'tablets';
        categories.tablets.push(profile);
      }

      // Add popular picks
      const popularList = [
        'iPhone 16 Pro',
        'iPhone 15 Pro',
        'iPhone 15',
        'iPhone 14 Pro',
        'iPhone 13',
        'Pixel 8',
        'Pixel 7',
        'Pixel 5',
        'Galaxy S24',
        'Galaxy S20',
        'iPad Pro 11',
        'iPad Mini'
      ];
      if (popularList.some(p => lower.includes(p.toLowerCase()))) {
        categories.popular.push(profile);
      }
    }

    // Sort Apple and Android by name descending so newer versions appear first
    categories.apple.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    categories.android.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    categories.tablets.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

    // Standard Desktop & Laptop Presets requested
    const standardLaptops = [
      {
        id: 'laptop-1366',
        name: 'Laptop (1366 × 768)',
        playwrightName: 'Laptop 1366×768',
        viewport: { width: 1366, height: 768 },
        viewportWidth: 1366,
        viewportHeight: 768,
        screenWidth: 1366,
        screenHeight: 768,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'laptop-1440',
        name: 'Laptop (1440 × 900)',
        playwrightName: 'Laptop 1440×900',
        viewport: { width: 1440, height: 900 },
        viewportWidth: 1440,
        viewportHeight: 900,
        screenWidth: 1440,
        screenHeight: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'laptop-1536',
        name: 'Laptop (1536 × 864)',
        playwrightName: 'Laptop 1536×864',
        viewport: { width: 1536, height: 864 },
        viewportWidth: 1536,
        viewportHeight: 864,
        screenWidth: 1536,
        screenHeight: 864,
        deviceScaleFactor: 1.25,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'laptop-1600',
        name: 'Laptop (1600 × 900)',
        playwrightName: 'Laptop 1600×900',
        viewport: { width: 1600, height: 900 },
        viewportWidth: 1600,
        viewportHeight: 900,
        screenWidth: 1600,
        screenHeight: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'laptop-1080p',
        name: 'Laptop FHD (1920 × 1080)',
        playwrightName: 'Laptop 1920×1080',
        viewport: { width: 1920, height: 1080 },
        viewportWidth: 1920,
        viewportHeight: 1080,
        screenWidth: 1920,
        screenHeight: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'macbook-air-13',
        name: 'MacBook Air 13" (1280 × 800)',
        playwrightName: 'MacBook Air 13"',
        viewport: { width: 1280, height: 800 },
        viewportWidth: 1280,
        viewportHeight: 800,
        screenWidth: 1280,
        screenHeight: 800,
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'webkit',
        defaultBrowserEngine: 'webkit',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        category: 'laptop',
        subCategory: 'laptops'
      },
      {
        id: 'macbook-pro-16',
        name: 'MacBook Pro 16" (1440 × 900)',
        playwrightName: 'MacBook Pro 16"',
        viewport: { width: 1440, height: 900 },
        viewportWidth: 1440,
        viewportHeight: 900,
        screenWidth: 1440,
        screenHeight: 900,
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'webkit',
        defaultBrowserEngine: 'webkit',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        category: 'laptop',
        subCategory: 'laptops'
      }
    ];

    const standardDesktops = [
      {
        id: 'desktop-720p',
        name: 'Desktop HD (1280 × 720)',
        playwrightName: 'Desktop 1280×720',
        viewport: { width: 1280, height: 720 },
        viewportWidth: 1280,
        viewportHeight: 720,
        screenWidth: 1280,
        screenHeight: 720,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'desktop',
        subCategory: 'desktop'
      },
      {
        id: 'desktop-900p',
        name: 'Desktop (1440 × 900)',
        playwrightName: 'Desktop 1440×900',
        viewport: { width: 1440, height: 900 },
        viewportWidth: 1440,
        viewportHeight: 900,
        screenWidth: 1440,
        screenHeight: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'desktop',
        subCategory: 'desktop'
      },
      {
        id: 'desktop-1080p',
        name: 'Desktop FHD (1920 × 1080)',
        playwrightName: 'Desktop 1920×1080',
        viewport: { width: 1920, height: 1080 },
        viewportWidth: 1920,
        viewportHeight: 1080,
        screenWidth: 1920,
        screenHeight: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'desktop',
        subCategory: 'desktop'
      },
      {
        id: 'desktop-1440p',
        name: 'Desktop 2K QHD (2560 × 1440)',
        playwrightName: 'Desktop 2560×1440',
        viewport: { width: 2560, height: 1440 },
        viewportWidth: 2560,
        viewportHeight: 1440,
        screenWidth: 2560,
        screenHeight: 1440,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'desktop',
        subCategory: 'desktop'
      },
      {
        id: 'desktop-4k',
        name: 'Desktop 4K UHD (3840 × 2160)',
        playwrightName: 'Desktop 3840×2160',
        viewport: { width: 3840, height: 2160 },
        viewportWidth: 3840,
        viewportHeight: 2160,
        screenWidth: 3840,
        screenHeight: 2160,
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        category: 'desktop',
        subCategory: 'desktop'
      }
    ];

    categories.laptops = standardLaptops;
    categories.desktop = standardDesktops;

    // Prepend popular desktop/laptop to popular
    categories.popular.unshift(standardDesktops[2]); // 1920x1080
    categories.popular.unshift(standardLaptops[1]); // 1440x900

    return categories;
  }

  async closeAll() {
    for (const [name, browser] of this.launchedBrowsers.entries()) {
      try {
        await browser.close();
      } catch (e) {}
    }
    this.launchedBrowsers.clear();
  }
}

// Global Singleton
const provider = new PlaywrightProvider();

module.exports = {
  BrowserProvider,
  PlaywrightProvider,
  provider
};
