/**
 * client/js/components/devices/tablet-frame.js
 * Professional Tablet Device Frame Component (Apple iPad Pro, iPad Air, Galaxy Tab).
 * Features:
 * - Slim symmetrical tablet bezel
 * - Minimal front camera sensor
 * - Full orientation switching (portrait / landscape)
 */

(function () {
  'use strict';

  class TabletFrame {
    static render({ device, orientation, childrenHtml }) {
      const isLandscape = orientation === 'landscape';
      const width = isLandscape ? (device.viewportHeight || 1194) : (device.viewportWidth || 834);
      const height = isLandscape ? (device.viewportWidth || 834) : (device.viewportHeight || 1194);

      return `
        <div class="device-frame-box frame-type-tablet ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- Tablet Header Meta -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot tablet-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · DPR ${device.deviceScaleFactor || 2}x</span>
          </div>

          <!-- Tablet Body Chassis -->
          <div class="tablet-chassis">
            <!-- Screen Display -->
            <div class="tablet-screen" style="width: ${width}px; height: ${height}px;">
              <!-- Front Camera Sensor Dot -->
              <div class="tablet-camera-dot" title="Front Camera"></div>

              <!-- The Actual Website / Webpage Content -->
              <div class="screen-content-slot" style="width: 100%; height: 100%;">
                ${childrenHtml || ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.TabletFrame = TabletFrame;
})();
