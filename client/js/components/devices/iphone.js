/**
 * client/js/components/devices/iphone.js
 * Generates realistic Apple iPhone device frames (Dynamic Island, Notch, Classic Home Indicator).
 */

(function () {
  'use strict';

  function renderIPhoneFrame(device, orientation = 'portrait') {
    const isLandscape = orientation === 'landscape';
    const vpWidth = isLandscape ? device.viewportHeight : device.viewportWidth;
    const vpHeight = isLandscape ? device.viewportWidth : device.viewportHeight;

    const hasIsland = device.hasDynamicIsland;
    const hasNotch = device.hasNotch;
    const isClassic = device.frameType === 'iphone-classic';

    return `
      <div class="device-mockup-wrapper device-iphone ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'}" 
           data-device-id="${device.id}" 
           style="--vp-w: ${vpWidth}px; --vp-h: ${vpHeight}px; --display-radius: ${device.displayRadius || 44}px; --bezel-radius: ${device.bezelRadius || 52}px;">
        
        <!-- Hardware Side Buttons -->
        <div class="hardware-button hw-mute"></div>
        <div class="hardware-button hw-volume-up"></div>
        <div class="hardware-button hw-volume-down"></div>
        <div class="hardware-button hw-power"></div>

        <!-- Phone Chassis -->
        <div class="device-chassis">
          <!-- Ear Speaker Slit -->
          <div class="device-speaker-slit"></div>

          <!-- Screen Glass / Bezel -->
          <div class="device-screen-container">
            
            <!-- Status Bar Overlay -->
            <div class="device-status-bar">
              <span class="status-time">9:41</span>
              
              ${hasIsland ? `
                <div class="dynamic-island">
                  <div class="island-camera"></div>
                  <div class="island-sensor"></div>
                </div>
              ` : (hasNotch ? `
                <div class="iphone-notch">
                  <div class="notch-speaker"></div>
                  <div class="notch-camera"></div>
                </div>
              ` : '')}

              <div class="status-icons">
                <svg width="14" height="10" viewBox="0 0 16 12" fill="currentColor"><path d="M0 10h3V2H0v8zm5 0h3V0H5v10zm5 0h3V4h-3v6zm5 0h3V7h-3v3z"/></svg>
                <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2c-3.3 0-6 1.8-7.5 4.5C2 9.2 4.7 11 8 11s6-1.8 7.5-4.5C14 3.8 11.3 2 8 2zm0 7.5c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>
                <svg width="18" height="10" viewBox="0 0 24 12" fill="currentColor"><rect x="1" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="3" width="13" height="6" rx="1.5"/><path d="M22 4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </div>
            </div>

            <!-- Webview Iframe Slot -->
            <div class="device-viewport-viewport" id="deviceIframeWrapper">
              <!-- Live iframe mounted here -->
            </div>

            <!-- Home Indicator Bar -->
            ${!isClassic ? `<div class="home-indicator"></div>` : `<div class="classic-home-button"></div>`}
          </div>
        </div>
      </div>
    `;
  }

  window.DeviceFrames = window.DeviceFrames || {};
  window.DeviceFrames.iphone = renderIPhoneFrame;
})();
