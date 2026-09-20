/**
 * DYNASTY KOREA — B2B Client Itinerary Configurator & Blueprint (Section 07)
 * Interactive pills, real-time client blueprint, WhatsApp brief export & submission.
 */

(function() {
  'use strict';

  function initTradeBuilder() {
    const form = document.getElementById('tradeConfiguratorForm');
    if (!form) return;

    // Blueprint references
    const bpType = document.getElementById('bp-val-type');
    const bpDest = document.getElementById('bp-val-destinations');
    const bpDur = document.getElementById('bp-val-duration');
    const bpExp = document.getElementById('bp-val-experience');
    const btnWhatsApp = document.getElementById('btnExportBlueprintWhatsApp');

    const state = {
      clientType: 'FIT (Independent Custom)',
      destinations: ['Seoul', 'Busan', 'Nami Island'],
      duration: '7 Days (Two Hubs)',
      experience: ['K-Culture', 'Food', 'Shopping']
    };

    // Pill Toggles
    const pillGroups = document.querySelectorAll('.config-pills-row');

    pillGroups.forEach(group => {
      const isMulti = group.classList.contains('multi-select');
      const groupName = group.getAttribute('data-group');
      const pills = group.querySelectorAll('.cfg-pill');

      pills.forEach(pill => {
        pill.addEventListener('click', function() {
          const val = this.getAttribute('data-val');

          if (isMulti) {
            this.classList.toggle('active');
            const activePills = group.querySelectorAll('.cfg-pill.active');
            const selected = Array.from(activePills).map(p => p.getAttribute('data-val'));

            if (groupName === 'destinations') {
              state.destinations = selected.length ? selected : ['Seoul'];
            } else if (groupName === 'experience') {
              state.experience = selected.length ? selected : ['Highlights'];
            }
          } else {
            pills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');

            if (groupName === 'clientType') state.clientType = val;
            if (groupName === 'duration') state.duration = val;
          }

          updateBlueprint();
        });
      });
    });

    function updateBlueprint() {
      if (bpType) bpType.textContent = state.clientType;
      if (bpDest) bpDest.textContent = state.destinations.join(', ');
      if (bpDur) bpDur.textContent = state.duration;
      if (bpExp) bpExp.textContent = state.experience.join(', ');
    }

    // Export Draft to WhatsApp
    if (btnWhatsApp) {
      btnWhatsApp.addEventListener('click', () => {
        const text = encodeURIComponent(
          `*DYNASTY KOREA — B2B CLIENT ITINERARY SPECIFICATION*\n\n` +
          `• Client Type: ${state.clientType}\n` +
          `• Core Destinations: ${state.destinations.join(', ')}\n` +
          `• Duration: ${state.duration}\n` +
          `• Focus Themes: ${state.experience.join(', ')}\n` +
          `• Culinary Protocol: Indian / Jain Meals Required\n\n` +
          `Hello Trade Desk, please provide a wholesale B2B quote and unbranded presentation deck for this brief.`
        );
        window.open(`https://wa.me/821012345678?text=${text}`, '_blank');
      });
    }

    // Form Submit Handler
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const btnSubmit = document.getElementById('btnSubmitConfig');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span>DISPATCHING SPECIFICATION...</span>`;
      }

      setTimeout(() => {
        const modal = document.getElementById('b2b-quote-modal');
        const mForm = document.getElementById('trade-quote-form');
        const mSuccess = document.getElementById('modal-success-screen');

        if (modal && mForm && mSuccess) {
          mForm.classList.add('hidden');
          mSuccess.classList.remove('hidden');
          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>REQUEST B2B ITINERARY →</span>`;
        }
      }, 700);
    });

    updateBlueprint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTradeBuilder);
  } else {
    initTradeBuilder();
  }
})();
