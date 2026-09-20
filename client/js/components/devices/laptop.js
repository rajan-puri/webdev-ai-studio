/**
 * client/js/components/devices/laptop.js
 * Generates realistic MacBook and Laptop device frames with lid, notch/webcam, and base hinge.
 */

(function () {
  'use strict';

  function renderLaptopFrame(device, orientation = 'landscape') {
    const isLandscape = orientation === 'landscape';
    const vpWidth = isLandscape ? device.viewportWidth : device.viewportHeight;
    const vpHeight = isLandscape ? device.viewportHeight : device.viewportWidth;

    return `
      <div class="device-mockup-wrapper device-laptop ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
           data-device-id="${device.id}" 
           style="--vp-w: ${vpWidth}px; --vp-h: ${vpHeight}px; --display-radius: ${device.displayRadius || 12}px; --bezel-radius: ${device.bezelRadius || 18}px;">
        
        <!-- Laptop Display Lid -->
        <div class="laptop-lid">
          <!-- Screen Glass / Bezel -->
          <div class="device-screen-container">
            
            <!-- MacBook Notch / Webcam -->
            <div class="macbook-camera-notch">
              <div class="notch-camera-dot"></div>
              <div class="notch-indicator-green"></div>
            </div>

            <!-- Webview Iframe Slot -->
            <div class="device-viewport-viewport" id="deviceIframeWrapper"></div>
          </div>
        </div>

        <!-- Laptop Bottom Aluminum Base & Hinge -->
        <div class="laptop-base">
          <div class="laptop-hinge"></div>
          <div class="laptop-thumb-notch"></div>
        </div>
      </div>
    `;
  }

  window.DeviceFrames = window.DeviceFrames || {};
  window.DeviceFrames.laptop = renderLaptopFrame;
  window.DeviceFrames.macbook = renderLaptopFrame;
})();
