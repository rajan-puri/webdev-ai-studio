/**
 * client/js/components/devices/android-frame.js
 * Professional Android Device Frame Component (Samsung Galaxy, Google Pixel, etc.).
 * Features:
 * - Sleek modern Android chassis with refined bezels
 * - Subtle punch-hole front camera
 * - Exact CSS pixel dimensions
 * - Orientation support
 */

(function () {
  'use strict';

  class AndroidFrame {
    static render({ device, orientation, childrenHtml }) {
      const isLandscape = orientation === 'landscape';
      const width = isLandscape ? (device.viewportHeight || 780) : (device.viewportWidth || 360);
      const height = isLandscape ? (device.viewportWidth || 360) : (device.viewportHeight || 780);

      return `
        <div class="device-frame-box frame-type-android ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- Subtle Device Header Meta -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot android-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · DPR ${device.deviceScaleFactor || 3}x</span>
          </div>

          <!-- Android Body Chassis -->
          <div class="android-chassis">
            <!-- Screen Display -->
            <div class="android-screen" style="width: ${width}px; height: ${height}px;">
              <!-- Centered Punch Hole Camera -->
              <div class="android-punch-hole" title="Punch Hole Camera">
                <span class="punch-lens"></span>
              </div>

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

  window.AndroidFrame = AndroidFrame;
})();
