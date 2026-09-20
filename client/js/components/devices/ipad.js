/**
 * client/js/components/devices/ipad.js
 * Generates realistic iPad and Tablet device frames.
 */

(function () {
  'use strict';

  function renderIPadFrame(device, orientation = 'portrait') {
    const isLandscape = orientation === 'landscape';
    const vpWidth = isLandscape ? device.viewportHeight : device.viewportWidth;
    const vpHeight = isLandscape ? device.viewportWidth : device.viewportHeight;

    return `
      <div class="device-mockup-wrapper device-ipad ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
           data-device-id="${device.id}" 
           style="--vp-w: ${vpWidth}px; --vp-h: ${vpHeight}px; --display-radius: ${device.displayRadius || 20}px; --bezel-radius: ${device.bezelRadius || 32}px;">
        
        <!-- Hardware Power Button Top / Volume Side -->
        <div class="hardware-button hw-ipad-top"></div>
        <div class="hardware-button hw-ipad-volume-up"></div>
        <div class="hardware-button hw-ipad-volume-down"></div>

        <!-- Tablet Chassis -->
        <div class="device-chassis">
          <!-- Screen Glass / Bezel -->
          <div class="device-screen-container">
            
            <!-- Tablet Camera in Bezel -->
            <div class="ipad-camera-dot"></div>

            <!-- Tablet Status Bar -->
            <div class="device-status-bar tablet-status-bar">
              <span class="status-time">9:41 AM</span>
              <div class="status-icons">
                <svg width="14" height="10" viewBox="0 0 16 12" fill="currentColor"><path d="M0 10h3V2H0v8zm5 0h3V0H5v10zm5 0h3V4h-3v6zm5 0h3V7h-3v3z"/></svg>
                <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2c-3.3 0-6 1.8-7.5 4.5C2 9.2 4.7 11 8 11s6-1.8 7.5-4.5C14 3.8 11.3 2 8 2zm0 7.5c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>
                <span class="font-mono text-xs" style="font-size: 10px; margin-right: 4px;">100%</span>
                <svg width="18" height="10" viewBox="0 0 24 12" fill="currentColor"><rect x="1" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M22 4v4" stroke="currentColor" stroke-width="1.5"/></svg>
              </div>
            </div>

            <!-- Webview Iframe Slot -->
            <div class="device-viewport-viewport" id="deviceIframeWrapper"></div>

            <!-- Home Indicator Bar -->
            <div class="home-indicator"></div>
          </div>
        </div>
      </div>
    `;
  }

  window.DeviceFrames = window.DeviceFrames || {};
  window.DeviceFrames.ipad = renderIPadFrame;
})();
