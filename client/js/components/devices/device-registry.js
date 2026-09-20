/**
 * client/js/components/devices/device-registry.js
 * Device registry powered by Playwright device profiles.
 * Provides exact viewport dimensions, deviceScaleFactor, mobile/touch capabilities,
 * and categories (Popular, Apple, Android, Google, Tablets, Laptops, Desktop, Custom).
 */

(function () {
  'use strict';

  const FAVORITES_KEY = 'webdev_ai_studio_favorite_devices';
  const RECENTS_KEY = 'webdev_ai_studio_recent_devices';

  // Fallback Playwright profiles (matches Playwright's exact device registry)
  // Fallback Playwright profiles (matches Playwright's exact device registry)
  const FALLBACK_CATEGORIES = {
    popular: [
      { id: 'iphone-16-pro', name: 'iPhone 16 Pro', playwrightName: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, viewportWidth: 402, viewportHeight: 874, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-15-pro', name: 'iPhone 15 Pro', playwrightName: 'iPhone 15 Pro', viewport: { width: 393, height: 852 }, viewportWidth: 393, viewportHeight: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-14-pro', name: 'iPhone 14 Pro', playwrightName: 'iPhone 14 Pro', viewport: { width: 393, height: 852 }, viewportWidth: 393, viewportHeight: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-13', name: 'iPhone 13', playwrightName: 'iPhone 13', viewport: { width: 390, height: 844 }, viewportWidth: 390, viewportHeight: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'pixel-8', name: 'Pixel 8', playwrightName: 'Pixel 8', viewport: { width: 412, height: 915 }, viewportWidth: 412, viewportHeight: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'google' },
      { id: 'pixel-7', name: 'Pixel 7', playwrightName: 'Pixel 7', viewport: { width: 412, height: 915 }, viewportWidth: 412, viewportHeight: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'google' },
      { id: 'galaxy-s24', name: 'Galaxy S24', playwrightName: 'Galaxy S24', viewport: { width: 360, height: 780 }, viewportWidth: 360, viewportHeight: 780, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'android' },
      { id: 'ipad-pro-11', name: 'iPad Pro 11', playwrightName: 'iPad Pro 11', viewport: { width: 834, height: 1194 }, viewportWidth: 834, viewportHeight: 1194, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'tablet', subCategory: 'tablets' },
      { id: 'laptop-1440', name: 'Laptop (1440 × 900)', playwrightName: 'Laptop 1440×900', viewport: { width: 1440, height: 900 }, viewportWidth: 1440, viewportHeight: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'desktop-1080p', name: 'Desktop FHD (1920 × 1080)', playwrightName: 'Desktop 1920×1080', viewport: { width: 1920, height: 1080 }, viewportWidth: 1920, viewportHeight: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' }
    ],
    apple: [
      { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', playwrightName: 'iPhone 16 Pro Max', viewport: { width: 440, height: 956 }, viewportWidth: 440, viewportHeight: 956, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-16-pro', name: 'iPhone 16 Pro', playwrightName: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, viewportWidth: 402, viewportHeight: 874, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', playwrightName: 'iPhone 15 Pro Max', viewport: { width: 430, height: 932 }, viewportWidth: 430, viewportHeight: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-15-pro', name: 'iPhone 15 Pro', playwrightName: 'iPhone 15 Pro', viewport: { width: 393, height: 852 }, viewportWidth: 393, viewportHeight: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-15', name: 'iPhone 15', playwrightName: 'iPhone 15', viewport: { width: 393, height: 852 }, viewportWidth: 393, viewportHeight: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-14-pro', name: 'iPhone 14 Pro', playwrightName: 'iPhone 14 Pro', viewport: { width: 393, height: 852 }, viewportWidth: 393, viewportHeight: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-14', name: 'iPhone 14', playwrightName: 'iPhone 14', viewport: { width: 390, height: 844 }, viewportWidth: 390, viewportHeight: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-13-pro', name: 'iPhone 13 Pro', playwrightName: 'iPhone 13 Pro', viewport: { width: 390, height: 844 }, viewportWidth: 390, viewportHeight: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-13', name: 'iPhone 13', playwrightName: 'iPhone 13', viewport: { width: 390, height: 844 }, viewportWidth: 390, viewportHeight: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-12', name: 'iPhone 12', playwrightName: 'iPhone 12', viewport: { width: 390, height: 844 }, viewportWidth: 390, viewportHeight: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-11', name: 'iPhone 11', playwrightName: 'iPhone 11', viewport: { width: 414, height: 896 }, viewportWidth: 414, viewportHeight: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' },
      { id: 'iphone-se', name: 'iPhone SE', playwrightName: 'iPhone SE', viewport: { width: 375, height: 667 }, viewportWidth: 375, viewportHeight: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'mobile', subCategory: 'apple' }
    ],
    android: [
      { id: 'galaxy-s24', name: 'Galaxy S24', playwrightName: 'Galaxy S24', viewport: { width: 360, height: 780 }, viewportWidth: 360, viewportHeight: 780, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'android' },
      { id: 'galaxy-s20', name: 'Galaxy S20', playwrightName: 'Galaxy S20', viewport: { width: 360, height: 800 }, viewportWidth: 360, viewportHeight: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'android' },
      { id: 'galaxy-s9-plus', name: 'Galaxy S9+', playwrightName: 'Galaxy S9+', viewport: { width: 320, height: 658 }, viewportWidth: 320, viewportHeight: 658, deviceScaleFactor: 3, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'android' },
      { id: 'pixel-8', name: 'Pixel 8', playwrightName: 'Pixel 8', viewport: { width: 412, height: 915 }, viewportWidth: 412, viewportHeight: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'google' },
      { id: 'pixel-7', name: 'Pixel 7', playwrightName: 'Pixel 7', viewport: { width: 412, height: 915 }, viewportWidth: 412, viewportHeight: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'google' },
      { id: 'pixel-5', name: 'Pixel 5', playwrightName: 'Pixel 5', viewport: { width: 393, height: 851 }, viewportWidth: 393, viewportHeight: 851, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'mobile', subCategory: 'google' }
    ],
    tablets: [
      { id: 'ipad-pro-11', name: 'iPad Pro 11', playwrightName: 'iPad Pro 11', viewport: { width: 834, height: 1194 }, viewportWidth: 834, viewportHeight: 1194, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'tablet', subCategory: 'tablets' },
      { id: 'ipad-mini', name: 'iPad Mini', playwrightName: 'iPad Mini', viewport: { width: 768, height: 1024 }, viewportWidth: 768, viewportHeight: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'tablet', subCategory: 'tablets' },
      { id: 'ipad-gen-7', name: 'iPad (gen 7)', playwrightName: 'iPad (gen 7)', viewport: { width: 810, height: 1080 }, viewportWidth: 810, viewportHeight: 1080, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'tablet', subCategory: 'tablets' },
      { id: 'galaxy-tab-s9', name: 'Galaxy Tab S9', playwrightName: 'Galaxy Tab S9', viewport: { width: 800, height: 1280 }, viewportWidth: 800, viewportHeight: 1280, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'tablet', subCategory: 'tablets' },
      { id: 'galaxy-tab-s4', name: 'Galaxy Tab S4', playwrightName: 'Galaxy Tab S4', viewport: { width: 712, height: 1138 }, viewportWidth: 712, viewportHeight: 1138, deviceScaleFactor: 2, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'tablet', subCategory: 'tablets' }
    ],
    laptops: [
      { id: 'laptop-1366', name: 'Laptop (1366 × 768)', playwrightName: 'Laptop 1366×768', viewport: { width: 1366, height: 768 }, viewportWidth: 1366, viewportHeight: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'laptop-1440', name: 'Laptop (1440 × 900)', playwrightName: 'Laptop 1440×900', viewport: { width: 1440, height: 900 }, viewportWidth: 1440, viewportHeight: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'laptop-1536', name: 'Laptop (1536 × 864)', playwrightName: 'Laptop 1536×864', viewport: { width: 1536, height: 864 }, viewportWidth: 1536, viewportHeight: 864, deviceScaleFactor: 1.25, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'laptop-1600', name: 'Laptop (1600 × 900)', playwrightName: 'Laptop 1600×900', viewport: { width: 1600, height: 900 }, viewportWidth: 1600, viewportHeight: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'laptop-1080p', name: 'Laptop FHD (1920 × 1080)', playwrightName: 'Laptop 1920×1080', viewport: { width: 1920, height: 1080 }, viewportWidth: 1920, viewportHeight: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'laptop', subCategory: 'laptops' },
      { id: 'macbook-air-13', name: 'MacBook Air 13" (1280 × 800)', playwrightName: 'MacBook Air 13"', viewport: { width: 1280, height: 800 }, viewportWidth: 1280, viewportHeight: 800, deviceScaleFactor: 2, isMobile: false, hasTouch: false, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'laptop', subCategory: 'laptops' },
      { id: 'macbook-pro-16', name: 'MacBook Pro 16" (1440 × 900)', playwrightName: 'MacBook Pro 16"', viewport: { width: 1440, height: 900 }, viewportWidth: 1440, viewportHeight: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false, defaultBrowserType: 'webkit', defaultBrowserEngine: 'webkit', category: 'laptop', subCategory: 'laptops' }
    ],
    desktop: [
      { id: 'desktop-720p', name: 'Desktop HD (1280 × 720)', playwrightName: 'Desktop 1280×720', viewport: { width: 1280, height: 720 }, viewportWidth: 1280, viewportHeight: 720, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' },
      { id: 'desktop-900p', name: 'Desktop (1440 × 900)', playwrightName: 'Desktop 1440×900', viewport: { width: 1440, height: 900 }, viewportWidth: 1440, viewportHeight: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' },
      { id: 'desktop-1080p', name: 'Desktop FHD (1920 × 1080)', playwrightName: 'Desktop 1920×1080', viewport: { width: 1920, height: 1080 }, viewportWidth: 1920, viewportHeight: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' },
      { id: 'desktop-1440p', name: 'Desktop 2K QHD (2560 × 1440)', playwrightName: 'Desktop 2560×1440', viewport: { width: 2560, height: 1440 }, viewportWidth: 2560, viewportHeight: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' },
      { id: 'desktop-4k', name: 'Desktop 4K UHD (3840 × 2160)', playwrightName: 'Desktop 3840×2160', viewport: { width: 3840, height: 2160 }, viewportWidth: 3840, viewportHeight: 2160, deviceScaleFactor: 2, isMobile: false, hasTouch: false, defaultBrowserType: 'chromium', defaultBrowserEngine: 'chromium', category: 'desktop', subCategory: 'desktop' }
    ]
  };

  let loadedCategories = FALLBACK_CATEGORIES;

  class DeviceRegistryClass {
    constructor() {
      this.initAsync();
    }

    async initAsync() {
      try {
        const res = await fetch('/api/responsive/devices');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.categories) {
            loadedCategories = data.categories;
          }
        }
      } catch (e) {
        // Fallback is already present
      }
    }

    getCategories() {
      return loadedCategories;
    }

    getAllDevices() {
      const all = [];
      const seen = new Set();
      for (const cat of Object.keys(loadedCategories)) {
        for (const dev of loadedCategories[cat]) {
          if (!seen.has(dev.id)) {
            seen.add(dev.id);
            all.push(dev);
          }
        }
      }
      return all;
    }

    getDevicesByCategory(cat) {
      if (cat === 'all') return this.getAllDevices();
      return loadedCategories[cat] || [];
    }

    getDevice(id) {
      if (!id) return this.getAllDevices()[0];
      const norm = String(id).toLowerCase().trim();
      const all = this.getAllDevices();
      return all.find(d => d.id === norm || d.name.toLowerCase() === norm || d.playwrightName.toLowerCase() === norm) || all[0];
    }

    getDeviceById(id) {
      return this.getDevice(id);
    }

    searchDevices(query) {
      if (!query) return this.getAllDevices();
      const q = query.toLowerCase().trim();
      return this.getAllDevices().filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.playwrightName.toLowerCase().includes(q) ||
        `${d.viewportWidth}x${d.viewportHeight}`.includes(q) ||
        (d.subCategory && d.subCategory.toLowerCase().includes(q))
      );
    }

    createCustomDevice(width, height, dpr = 1, orientation = 'portrait') {
      let w = Math.min(3840, Math.max(240, parseInt(width, 10) || 390));
      let h = Math.min(3840, Math.max(240, parseInt(height, 10) || 844));
      const scale = Math.min(3, Math.max(1, parseFloat(dpr) || 1));

      if (orientation === 'landscape' && h > w) {
        const t = w; w = h; h = t;
      } else if (orientation === 'portrait' && w > h && Math.min(w, h) < 768) {
        const t = w; w = h; h = t;
      }

      return {
        id: `custom-${w}x${h}`,
        name: `Custom (${w} × ${h})`,
        playwrightName: `Custom (${w} × ${h})`,
        viewport: { width: w, height: h },
        viewportWidth: w,
        viewportHeight: h,
        screenWidth: w,
        screenHeight: h,
        deviceScaleFactor: scale,
        orientation: orientation || 'portrait',
        isMobile: Math.min(w, h) < 768,
        hasTouch: Math.min(w, h) < 768,
        defaultBrowserType: 'chromium',
        defaultBrowserEngine: 'chromium',
        category: 'custom',
        subCategory: 'custom',
        isCustom: true
      };
    }
  }

  window.DeviceRegistry = new DeviceRegistryClass();
})();
