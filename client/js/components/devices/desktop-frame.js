/**
 * client/js/components/devices/desktop-frame.js
 * Professional Desktop Monitor Frame Component (1080p FHD, 1440p QHD, 4K UHD).
 * Features:
 * - Clean desktop monitor frame with sleek slim borders
 * - Subtle desktop browser window title bar with traffic dots and secure URL badge
 * - Minimal bottom chin and slim monitor stand neck/base
 * - Developer-grade presentation
 */

(function () {
  'use strict';

  class DesktopFrame {
    static render({ device, orientation, childrenHtml, currentUrl }) {
      const width = device.viewportWidth || 1920;
      const height = device.viewportHeight || 1080;
      const displayUrl = currentUrl || 'https://example.com/';

      return `
        <div class="device-frame-box frame-type-desktop" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- Desktop Meta Header -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot desktop-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · Desktop Viewport Preset</span>
          </div>

          <!-- Monitor Display Body -->
          <div class="monitor-body">
            <!-- Desktop Browser Window Header Bar -->
            <div class="desktop-window-header">
              <div class="traffic-lights">
                <span class="dot-red"></span>
                <span class="dot-yellow"></span>
                <span class="dot-green"></span>
              </div>
              <div class="desktop-window-address font-mono">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>${escapeHtml(displayUrl)}</span>
              </div>
              <div class="desktop-window-meta font-mono text-xs">
                ${width} × ${height}
              </div>
            </div>

            <!-- Screen Viewport -->
            <div class="monitor-screen" style="width: ${width}px; height: ${height}px;">
              <div class="screen-content-slot" style="width: 100%; height: 100%;">
                ${childrenHtml || ''}
              </div>
            </div>

            <!-- Monitor Bottom Chin -->
            <div class="monitor-chin">
              <span class="monitor-power-led"></span>
            </div>
          </div>

          <!-- Monitor Stand Hint -->
          <div class="monitor-stand-assembly">
            <div class="monitor-stand-neck"></div>
            <div class="monitor-stand-foot"></div>
          </div>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.DesktopFrame = DesktopFrame;
  window.DesktopMonitorFrame = DesktopFrame;
})();
