/**
 * WebDev AI Studio - Responsive Tester: Device Comparison Component
 * Side-by-side multi-device testing (Mobile, Tablet, Desktop)
 * with synced scrolling, synchronized reloads, and preset configurations.
 */

class DeviceComparison {
  constructor(options = {}) {
    this.options = options;
    this.modalEl = document.getElementById('comparisonModal');
    this.currentUrl = options.currentUrl || '';
    this.syncScroll = true;
    this.devices = [];
    this.slots = [
      { deviceId: 'iphone-16-pro', orientation: 'portrait' },
      { deviceId: 'ipad-pro-11', orientation: 'portrait' },
      { deviceId: 'macbook-pro-14', orientation: 'landscape' }
    ];

    this.init();
  }

  init() {
    if (!this.modalEl) return;
    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.modalEl.querySelector('[data-action="close-comparison-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    const backdrop = this.modalEl.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.hide());
    }

    // Sync scroll toggle
    const syncScrollToggle = this.modalEl.querySelector('#toggleSyncScroll');
    if (syncScrollToggle) {
      syncScrollToggle.addEventListener('change', (e) => {
        this.syncScroll = e.target.checked;
      });
    }

    // Sync reload
    const syncReloadBtn = this.modalEl.querySelector('#btnSyncReload');
    if (syncReloadBtn) {
      syncReloadBtn.addEventListener('click', () => this.reloadAll());
    }

    // Presets
    const presetButtons = this.modalEl.querySelectorAll('[data-comparison-preset]');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.comparisonPreset;
        this.applyPreset(preset);
      });
    });

    // Keyboard Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
        this.hide();
      }
    });
  }

  show(url) {
    this.currentUrl = url || this.currentUrl;
    if (!this.modalEl) return;

    this.modalEl.classList.add('active');
    const urlInput = this.modalEl.querySelector('#comparisonUrlDisplay');
    if (urlInput) {
      urlInput.textContent = this.currentUrl || 'No URL specified';
    }

    this.renderSlots();
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('active');
  }

  applyPreset(presetKey) {
    if (presetKey === 'responsive-triple') {
      this.slots = [
        { deviceId: 'iphone-16-pro', orientation: 'portrait' },
        { deviceId: 'ipad-pro-11', orientation: 'portrait' },
        { deviceId: 'macbook-pro-14', orientation: 'landscape' }
      ];
    } else if (presetKey === 'flagship-phones') {
      this.slots = [
        { deviceId: 'iphone-16-pro', orientation: 'portrait' },
        { deviceId: 'samsung-s25-ultra', orientation: 'portrait' },
        { deviceId: 'pixel-9-pro', orientation: 'portrait' }
      ];
    } else if (presetKey === 'desktop-pair') {
      this.slots = [
        { deviceId: 'laptop-1366', orientation: 'landscape' },
        { deviceId: 'macbook-pro-14', orientation: 'landscape' },
        { deviceId: 'desktop-1080p', orientation: 'landscape' }
      ];
    }
    this.renderSlots();
  }

  renderSlots() {
    const gridEl = this.modalEl.querySelector('#comparisonGrid');
    if (!gridEl) return;

    gridEl.innerHTML = this.slots.map((slot, index) => {
      const dev = DeviceRegistry.getDevice(slot.deviceId) || DeviceRegistry.getDevice('iphone-16-pro');
      const isLandscape = slot.orientation === 'landscape';
      const width = isLandscape ? dev.height : dev.width;
      const height = isLandscape ? dev.width : dev.height;

      // Calculate scale to fit inside 300-380px column width
      const targetColumnWidth = 340;
      const scale = Math.min(1, Math.max(0.28, (targetColumnWidth - 20) / width));

      return `
        <div class="comparison-column" data-slot-index="${index}">
          <div class="comparison-col-header">
            <div class="col-dev-info">
              <select class="form-select form-select-xs dev-picker-select font-mono" data-slot="${index}">
                ${DeviceRegistry.getAllDevices().map(d => `
                  <option value="${d.id}" ${d.id === dev.id ? 'selected' : ''}>
                    ${d.name} (${d.width}×${d.height})
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="col-actions">
              <button class="btn btn-icon btn-xs btn-toggle-orientation" data-slot="${index}" title="Toggle Orientation">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
              </button>
              <button class="btn btn-icon btn-xs btn-reload-slot" data-slot="${index}" title="Reload Frame">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="comparison-viewport-stage">
            <div class="comparison-scaler" style="width: ${width}px; height: ${height}px; transform: scale(${scale}); transform-origin: top center;">
              <iframe 
                class="comparison-iframe" 
                id="comparisonIframe_${index}"
                src="${this.currentUrl ? this.escapeHtml(this.currentUrl) : 'about:blank'}"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style="width: ${width}px; height: ${height}px; border: none; background: #fff;"
              ></iframe>
            </div>
          </div>

          <div class="comparison-col-footer font-mono text-muted">
            <span>${width} × ${height}px</span>
            <span>@${dev.dpr || 1}x</span>
          </div>
        </div>
      `;
    }).join('');

    this.bindSlotControls();
    this.setupSyncScroll();
  }

  bindSlotControls() {
    const gridEl = this.modalEl.querySelector('#comparisonGrid');
    if (!gridEl) return;

    // Device selector dropdown
    gridEl.querySelectorAll('.dev-picker-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const slotIdx = parseInt(select.dataset.slot, 10);
        this.slots[slotIdx].deviceId = e.target.value;
        this.renderSlots();
      });
    });

    // Orientation toggle
    gridEl.querySelectorAll('.btn-toggle-orientation').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIdx = parseInt(btn.dataset.slot, 10);
        this.slots[slotIdx].orientation = this.slots[slotIdx].orientation === 'portrait' ? 'landscape' : 'portrait';
        this.renderSlots();
      });
    });

    // Single reload
    gridEl.querySelectorAll('.btn-reload-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIdx = parseInt(btn.dataset.slot, 10);
        const iframe = this.modalEl.querySelector(`#comparisonIframe_${slotIdx}`);
        if (iframe && this.currentUrl) {
          iframe.src = this.currentUrl;
        }
      });
    });
  }

  setupSyncScroll() {
    // Attempt scroll sync across same-origin frames if allowed
    const iframes = this.modalEl.querySelectorAll('.comparison-iframe');
    iframes.forEach((iframe, idx) => {
      try {
        iframe.onload = () => {
          try {
            const win = iframe.contentWindow;
            if (!win) return;

            win.addEventListener('scroll', () => {
              if (!this.syncScroll || this._isSyncing) return;
              this._isSyncing = true;

              const doc = win.document;
              const scrollPercent = win.scrollY / (doc.documentElement.scrollHeight - win.innerHeight || 1);

              iframes.forEach((otherIframe, otherIdx) => {
                if (otherIdx !== idx) {
                  try {
                    const otherWin = otherIframe.contentWindow;
                    if (otherWin) {
                      const otherDoc = otherWin.document;
                      const targetY = scrollPercent * (otherDoc.documentElement.scrollHeight - otherWin.innerHeight);
                      otherWin.scrollTo(0, targetY);
                    }
                  } catch (e) {
                    // Cross-origin restriction ignored
                  }
                }
              });

              setTimeout(() => { this._isSyncing = false; }, 30);
            }, { passive: true });
          } catch (e) {
            // Cross-origin restriction
          }
        };
      } catch (e) {}
    });
  }

  reloadAll() {
    const iframes = this.modalEl.querySelectorAll('.comparison-iframe');
    iframes.forEach(iframe => {
      if (this.currentUrl) {
        iframe.src = this.currentUrl;
      }
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (typeof window !== 'undefined') {
  window.DeviceComparison = DeviceComparison;
}
