/**
 * client/js/components/devices/phone-frame.js
 * Professional iPhone Device Frame Component.
 * Features:
 * - Subtle realistic chassis with rounded corners and thin bezel
 * - Dynamic Island / subtle notch treatment
 * - Exact CSS viewport dimensions inside screen container
 * - Orientation support (portrait & landscape)
 */

(function () {
  'use strict';

  class PhoneFrame {
    static render({ device, orientation, childrenHtml }) {
      const isLandscape = orientation === 'landscape';
      const width = isLandscape ? (device.viewportHeight || 852) : (device.viewportWidth || 393);
      const height = isLandscape ? (device.viewportWidth || 393) : (device.viewportHeight || 852);

      const hasIsland = !device.id?.includes('se') && !device.id?.includes('11') && !device.id?.includes('12') && !device.id?.includes('13') && (device.id?.includes('14-pro') || device.id?.includes('15') || device.id?.includes('16') || !device.hasNotch);
      const hasNotch = device.hasNotch || device.id?.includes('13') || device.id?.includes('12') || device.id?.includes('11');

      return `
        <div class="device-frame-box frame-type-iphone ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- Subtle Phone Header Meta -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · DPR ${device.deviceScaleFactor || 3}x</span>
          </div>

          <!-- Phone Body Chassis -->
          <div class="phone-chassis">
            <!-- Screen Display -->
            <div class="phone-screen" style="width: ${width}px; height: ${height}px;">
              <!-- Dynamic Island or Notch Overlay -->
              ${hasIsland ? `
                <div class="dynamic-island-cutout" title="Dynamic Island">
                  <span class="island-camera-lens"></span>
                  <span class="island-sensor-dot"></span>
                </div>
              ` : (hasNotch ? `
                <div class="iphone-notch-cutout" title="Notch">
                  <span class="notch-speaker-slit"></span>
                  <span class="notch-camera-dot"></span>
                </div>
              ` : '')}

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

  window.PhoneFrame = PhoneFrame;
})();
