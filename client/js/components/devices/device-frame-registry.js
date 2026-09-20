/**
 * client/js/components/devices/device-frame-registry.js
 * Central Registry resolving device definitions to professional frame components.
 * Guarantees that every device profile renders in its appropriate frame container.
 */

(function () {
  'use strict';

  class DeviceFrameRegistry {
    /**
     * Resolves the proper frame component for a device
     * @param {Object} device 
     * @returns {Object} Frame renderer class with static render method
     */
    static getFrameComponent(device) {
      if (!device) {
        return window.PhoneFrame;
      }

      const id = (device.id || '').toLowerCase();
      const cat = (device.category || '').toLowerCase();
      const subCat = (device.subCategory || '').toLowerCase();
      const mockupType = (device.mockupType || '').toLowerCase();

      // 1. Explicit mockupType
      if (mockupType === 'iphone' || mockupType === 'apple') return window.PhoneFrame;
      if (mockupType === 'android' || mockupType === 'samsung' || mockupType === 'pixel') return window.AndroidFrame;
      if (mockupType === 'tablet' || mockupType === 'ipad') return window.TabletFrame;
      if (mockupType === 'macbook') return window.MacBookFrame;
      if (mockupType === 'windows' || mockupType === 'laptop') return window.LaptopFrame;
      if (mockupType === 'desktop') return window.DesktopFrame;

      // 2. ID / Name heuristics
      if (id.includes('iphone')) return window.PhoneFrame;
      if (id.includes('pixel') || id.includes('galaxy-s') || id.includes('android')) return window.AndroidFrame;
      if (id.includes('ipad') || id.includes('tab') || cat === 'tablet' || cat === 'tablets') return window.TabletFrame;
      if (id.includes('macbook')) return window.MacBookFrame;
      if (id.includes('windows') || cat === 'laptop' || cat === 'laptops') return window.LaptopFrame;
      if (id.includes('desktop') || cat === 'desktop') return window.DesktopFrame;

      // 3. Fallback by category
      if (cat === 'mobile') {
        return subCat === 'apple' ? window.PhoneFrame : window.AndroidFrame;
      }

      return window.DesktopFrame;
    }

    /**
     * Renders a device mockup frame with content inside
     */
    static renderFrame({ device, orientation, childrenHtml, currentUrl }) {
      const FrameClass = this.getFrameComponent(device);
      if (FrameClass && typeof FrameClass.render === 'function') {
        return FrameClass.render({ device, orientation, childrenHtml, currentUrl });
      }

      // Fallback
      if (window.PhoneFrame && typeof window.PhoneFrame.render === 'function') {
        return window.PhoneFrame.render({ device, orientation, childrenHtml });
      }

      const width = device.viewportWidth || 393;
      const height = device.viewportHeight || 852;
      return `<div style="width:${width}px;height:${height}px;background:#fff;">${childrenHtml || ''}</div>`;
    }
  }

  window.DeviceFrameRegistry = DeviceFrameRegistry;
})();
