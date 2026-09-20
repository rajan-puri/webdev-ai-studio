/**
 * client/js/components/responsive/device-selector.js
 * Renders the Left Device Library panel based on genuine Playwright device profiles.
 * Shows: Device Name, Viewport, DPR, Mobile/Desktop, Browser Compatibility.
 * Categories: Popular, Apple, Android, Google, Tablets, Laptops, Desktop, Custom.
 */

(function () {
  'use strict';

  class DeviceSelector {
    constructor({ containerId, initialDeviceId, onSelectDevice }) {
      this.containerId = containerId || 'deviceSelectorContainer';
      this.container = document.getElementById(this.containerId);
      this.onSelectDevice = onSelectDevice || null;
      this.currentCategory = 'popular';
      this.searchQuery = '';
      this.selectedDeviceId = initialDeviceId || 'iphone-15-pro';

      if (this.container) {
        this.init();
      }
    }

    init() {
      if (!this.container) {
        this.container = document.getElementById(this.containerId);
      }
      if (!this.container) return;
      this.render();
    }

    setCategory(category) {
      this.currentCategory = category;
      const pills = this.container.querySelectorAll('.device-cat-pill');
      pills.forEach(p => p.classList.toggle('active', p.dataset.category === category));

      const typeBtns = this.container.querySelectorAll('.device-type-shortcut');
      typeBtns.forEach(b => b.classList.toggle('active', b.dataset.category === category));

      this.renderDeviceList();
    }

    setSearch(query) {
      this.searchQuery = (query || '').trim();
      const clearBtn = this.container.querySelector('#deviceSearchClear');
      if (clearBtn) {
        clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
      }
      this.renderDeviceList();
    }

    setSelected(deviceId) {
      this.selectedDeviceId = deviceId;
      if (!this.container) return;
      this.container.querySelectorAll('.device-item').forEach(el => {
        const isMatch = el.dataset.deviceId === deviceId;
        el.classList.toggle('active', isMatch);
        const checkIcon = el.querySelector('.device-check-icon');
        if (checkIcon) {
          checkIcon.style.display = isMatch ? 'inline-flex' : 'none';
        }
      });
    }

    render() {
      if (!this.container) return;

      const allDevices = window.DeviceRegistry ? window.DeviceRegistry.getAllDevices() : [];
      const totalCount = allDevices.length || 24;

      this.container.innerHTML = `
        <div class="device-selector-panel">
          <!-- Panel Header -->
          <div class="device-panel-header">
            <div class="device-panel-title-row">
              <div class="device-panel-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                <span>Playwright Profiles</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="device-count-badge font-mono" id="deviceCountBadge">${totalCount} profiles</span>
                <button class="btn btn-ghost btn-icon btn-xs" id="btnHideDeviceLibrary" type="button" title="Collapse Device Library" style="padding: 2px 6px; font-size: 11px;">‹</button>
              </div>
            </div>

            <!-- Categories: Popular, Apple, Android, Google, Tablets, Laptops, Desktop, Custom -->
            <div class="device-type-shortcuts">
              <button class="device-type-shortcut ${this.currentCategory === 'popular' ? 'active' : ''}" data-category="popular" type="button" title="Popular Profiles">
                <span>🔥</span> Popular
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'apple' ? 'active' : ''}" data-category="apple" type="button" title="Apple Profiles">
                <span></span> Apple
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'android' ? 'active' : ''}" data-category="android" type="button" title="Android Profiles">
                <span>🤖</span> Android
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'google' ? 'active' : ''}" data-category="google" type="button" title="Google Pixel Profiles">
                <span>G</span> Google
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'tablets' ? 'active' : ''}" data-category="tablets" type="button" title="Tablet Profiles">
                <span>📱</span> Tablets
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'laptops' ? 'active' : ''}" data-category="laptops" type="button" title="Laptop Displays">
                <span>💻</span> Laptops
              </button>
              <button class="device-type-shortcut ${this.currentCategory === 'desktop' ? 'active' : ''}" data-category="desktop" type="button" title="Desktop Displays">
                <span>🖥️</span> Desktop
              </button>
            </div>

            <!-- Search Input Box -->
            <div class="device-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" class="device-search-input" id="deviceSearchInput" placeholder="Search devices..." autocomplete="off">
              <button class="device-search-clear" id="deviceSearchClear" type="button" title="Clear search" style="display: none;">✕</button>
            </div>
          </div>

          <!-- Secondary Category Filter Pills -->
          <div class="device-categories-bar" id="deviceCategoriesBar">
            <button class="device-cat-pill ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all" type="button">All</button>
            <button class="device-cat-pill ${this.currentCategory === 'popular' ? 'active' : ''}" data-category="popular" type="button">Popular</button>
            <button class="device-cat-pill ${this.currentCategory === 'apple' ? 'active' : ''}" data-category="apple" type="button">Apple</button>
            <button class="device-cat-pill ${this.currentCategory === 'android' ? 'active' : ''}" data-category="android" type="button">Android</button>
            <button class="device-cat-pill ${this.currentCategory === 'google' ? 'active' : ''}" data-category="google" type="button">Google</button>
            <button class="device-cat-pill ${this.currentCategory === 'tablets' ? 'active' : ''}" data-category="tablets" type="button">Tablets</button>
            <button class="device-cat-pill ${this.currentCategory === 'laptops' ? 'active' : ''}" data-category="laptops" type="button">Laptops</button>
            <button class="device-cat-pill ${this.currentCategory === 'desktop' ? 'active' : ''}" data-category="desktop" type="button">Desktop</button>
          </div>

          <!-- Scrollable Device List -->
          <div class="device-list-container" id="deviceListContainer"></div>

          <!-- Custom Viewport Footer -->
          <div class="device-custom-footer">
            <div class="custom-vp-title">
              <span>Custom Viewport</span>
              <span class="custom-vp-hint font-mono">W × H</span>
            </div>
            <div class="custom-vp-inputs">
              <input type="number" id="customVpWidth" class="custom-vp-num font-mono" placeholder="Width" value="390" min="240" max="3840">
              <span class="custom-vp-x">×</span>
              <input type="number" id="customVpHeight" class="custom-vp-num font-mono" placeholder="Height" value="844" min="240" max="3840">
              <button class="btn btn-secondary btn-sm" id="btnApplyCustomVp" type="button">Apply</button>
            </div>
          </div>
        </div>
      `;

      this.bindEvents();
      this.renderDeviceList();
    }

    bindEvents() {
      const searchInput = this.container.querySelector('#deviceSearchInput');
      const searchClear = this.container.querySelector('#deviceSearchClear');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => this.setSearch(e.target.value));
      }
      if (searchClear && searchInput) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          this.setSearch('');
          searchInput.focus();
        });
      }

      // Category filter pills
      const pills = this.container.querySelectorAll('.device-cat-pill, .device-type-shortcut');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.setCategory(pill.dataset.category);
        });
      });

      // Custom viewport apply
      const btnCustom = this.container.querySelector('#btnApplyCustomVp');
      const widthInput = this.container.querySelector('#customVpWidth');
      const heightInput = this.container.querySelector('#customVpHeight');
      if (btnCustom && widthInput && heightInput) {
        btnCustom.addEventListener('click', () => {
          const w = parseInt(widthInput.value, 10) || 390;
          const h = parseInt(heightInput.value, 10) || 844;
          if (window.DeviceRegistry && this.onSelectDevice) {
            const customDev = window.DeviceRegistry.createCustomDevice(w, h);
            this.selectedDeviceId = customDev.id;
            this.onSelectDevice(customDev);
            this.renderDeviceList();
          }
        });
      }
    }

    renderDeviceList() {
      const listContainer = this.container.querySelector('#deviceListContainer');
      if (!listContainer || !window.DeviceRegistry) return;

      let devices = [];
      if (this.searchQuery) {
        devices = window.DeviceRegistry.searchDevices(this.searchQuery);
      } else {
        devices = window.DeviceRegistry.getDevicesByCategory(this.currentCategory);
      }

      const countBadge = this.container.querySelector('#deviceCountBadge');
      if (countBadge) {
        countBadge.textContent = `${devices.length} ${devices.length === 1 ? 'profile' : 'profiles'}`;
      }

      if (devices.length === 0) {
        listContainer.innerHTML = `
          <div class="device-empty-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 8px;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div class="device-empty-title">No Profiles Found</div>
            <div class="device-empty-desc">Try different search keywords or category filters.</div>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = devices.map(d => {
        const isActive = d.id === this.selectedDeviceId || d.name === this.selectedDeviceId || d.playwrightName === this.selectedDeviceId;
        const dpr = d.deviceScaleFactor || d.pixelRatio || 1;
        const isMobile = Boolean(d.isMobile);
        const formFactor = d.category === 'tablet' ? 'Tablet' : (d.category === 'laptop' ? 'Laptop' : (d.category === 'desktop' ? 'Desktop' : 'Mobile'));
        const engine = (d.defaultBrowserType === 'webkit' ? 'WebKit' : (d.defaultBrowserType === 'firefox' ? 'Firefox' : 'Chromium'));

        return `
          <div class="device-item ${isActive ? 'active' : ''}" data-device-id="${d.id}" role="button" tabindex="0" title="Select ${escapeHtml(d.name)}">
            <div class="device-item-left">
              <div class="device-item-info">
                <div class="device-item-name-row">
                  <span class="device-item-name">${escapeHtml(d.name)}</span>
                </div>
                <div class="device-item-sub">
                  <span class="device-item-vp font-mono">${d.viewportWidth} × ${d.viewportHeight}</span>
                  <span class="device-item-dpr font-mono">${dpr}x</span>
                  <span class="device-badge-form">${formFactor}</span>
                  <span class="device-badge-engine">${engine}</span>
                </div>
              </div>
            </div>
            <div class="device-item-actions">
              <span class="device-check-icon" style="display: ${isActive ? 'inline-flex' : 'none'};">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </div>
          </div>
        `;
      }).join('');

      // Bind selection click
      listContainer.querySelectorAll('.device-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.deviceId;
          const dev = window.DeviceRegistry.getDevice(id);
          if (dev) {
            this.setSelected(id);
            if (this.onSelectDevice) {
              this.onSelectDevice(dev);
            }
          }
        });
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.DeviceSelector = DeviceSelector;
})();
