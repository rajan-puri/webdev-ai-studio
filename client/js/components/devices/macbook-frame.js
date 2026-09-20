/**
 * client/js/components/devices/macbook-frame.js
 * Professional MacBook Device Frame Component (MacBook Air 13", MacBook Pro 16").
 * Features:
 * - Sleek anodized aluminum/space-gray screen lid with slim uniform bezels
 * - Subtle FaceTime camera notch treatment at top
 * - Minimalist bottom hinge and slim laptop base with central thumb opening groove
 * - Compact, non-oversized developer presentation
 */

(function () {
  'use strict';

  class MacBookFrame {
    static render({ device, orientation, childrenHtml }) {
      const width = device.viewportWidth || 1280;
      const height = device.viewportHeight || 800;

      return `
        <div class="device-frame-box frame-type-macbook" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- MacBook Meta Header -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot macbook-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · Retina @${device.deviceScaleFactor || 2}x</span>
          </div>

          <!-- MacBook Lid Structure -->
          <div class="macbook-lid">
            <!-- Top Camera Notch -->
            <div class="macbook-notch-bar">
              <span class="macbook-webcam-lens"></span>
              <span class="macbook-green-indicator"></span>
            </div>

            <!-- Screen Viewport -->
            <div class="macbook-screen" style="width: ${width}px; height: ${height}px;">
              <div class="screen-content-slot" style="width: 100%; height: 100%;">
                ${childrenHtml || ''}
              </div>
            </div>
          </div>

          <!-- Slim Minimalist MacBook Base with Thumb Notch -->
          <div class="macbook-base">
            <div class="macbook-thumb-groove"></div>
          </div>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.MacBookFrame = MacBookFrame;
})();
