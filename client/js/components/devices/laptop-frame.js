/**
 * client/js/components/devices/laptop-frame.js
 * Professional Windows Laptop Device Frame Component (Windows Laptop 1366×768, 1440×900).
 * Features:
 * - Neutral, professional dark slate/charcoal laptop frame
 * - Modern clean bezels with top centered webcam dot
 * - Minimal bottom chassis and hinge base
 * - Distinct, honest Windows PC presentation (not an Apple clone)
 */

(function () {
  'use strict';

  class LaptopFrame {
    static render({ device, orientation, childrenHtml }) {
      const width = device.viewportWidth || 1366;
      const height = device.viewportHeight || 768;

      return `
        <div class="device-frame-box frame-type-windows-laptop" 
             data-device-id="${device.id}"
             style="width: ${width}px;">
          
          <!-- Windows Laptop Meta Header -->
          <div class="mockup-meta-pill">
            <span class="mockup-dot windows-dot"></span>
            <span class="mockup-name">${escapeHtml(device.name)}</span>
            <span class="mockup-sub font-mono">${width} × ${height} · 100% DPI</span>
          </div>

          <!-- Laptop Screen Chassis -->
          <div class="windows-laptop-lid">
            <!-- Top Bezel with Webcam -->
            <div class="windows-laptop-top-bezel">
              <span class="windows-webcam-lens"></span>
              <span class="windows-mic-hole"></span>
            </div>

            <!-- Screen Viewport -->
            <div class="windows-laptop-screen" style="width: ${width}px; height: ${height}px;">
              <div class="screen-content-slot" style="width: 100%; height: 100%;">
                ${childrenHtml || ''}
              </div>
            </div>

            <!-- Bottom Bezel Chin -->
            <div class="windows-laptop-chin"></div>
          </div>

          <!-- Neutral Slim Keyboard Deck / Base -->
          <div class="windows-laptop-base">
            <div class="windows-laptop-opening-lip"></div>
          </div>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.LaptopFrame = LaptopFrame;
  window.WindowsLaptopFrame = LaptopFrame;
})();
