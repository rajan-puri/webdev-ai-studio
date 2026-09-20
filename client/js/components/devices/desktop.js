/**
 * client/js/components/devices/desktop.js
 * Generates realistic Desktop Monitor and Custom Viewport frames.
 */

(function () {
  'use strict';

  function renderDesktopFrame(device, orientation = 'landscape') {
    const isLandscape = orientation === 'landscape';
    const vpWidth = isLandscape ? device.viewportWidth : device.viewportHeight;
    const vpHeight = isLandscape ? device.viewportHeight : device.viewportWidth;

    return `
      <div class="device-mockup-wrapper device-desktop ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
           data-device-id="${device.id}" 
           style="--vp-w: ${vpWidth}px; --vp-h: ${vpHeight}px;">
        
        <!-- Monitor Display Chassis -->
        <div class="monitor-chassis">
          <!-- Screen Glass / Bezel -->
          <div class="device-screen-container">
            <!-- Webview Iframe Slot -->
            <div class="device-viewport-viewport" id="deviceIframeWrapper"></div>
          </div>
          <!-- Monitor Chin with Power LED -->
          <div class="monitor-chin">
            <div class="monitor-led"></div>
          </div>
        </div>

        <!-- Monitor Stand Neck & Base -->
        <div class="monitor-stand">
          <div class="stand-neck"></div>
          <div class="stand-base"></div>
        </div>
      </div>
    `;
  }

  function renderCustomFrame(device, orientation = 'landscape') {
    const isLandscape = orientation === 'landscape';
    const vpWidth = isLandscape ? device.viewportWidth : device.viewportHeight;
    const vpHeight = isLandscape ? device.viewportWidth : device.viewportHeight;

    return `
      <div class="device-mockup-wrapper device-custom ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
           data-device-id="custom" 
           style="--vp-w: ${vpWidth}px; --vp-h: ${vpHeight}px;">
        
        <!-- Custom Viewport Ruler / Header Bar -->
        <div class="custom-viewport-header">
          <div class="custom-dimension-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>${vpWidth} × ${vpHeight} px</span>
            <span class="custom-dpr-badge">${device.pixelRatio || 1}x DPR</span>
          </div>
        </div>

        <!-- Viewport Box -->
        <div class="custom-screen-container">
          <!-- Webview Iframe Slot -->
          <div class="device-viewport-viewport" id="deviceIframeWrapper"></div>
        </div>
      </div>
    `;
  }

  window.DeviceFrames = window.DeviceFrames || {};
  window.DeviceFrames.desktop = renderDesktopFrame;
  window.DeviceFrames.custom = renderCustomFrame;
})();
