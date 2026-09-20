/**
 * DYNASTY KOREA — Why Dynasty Editorial List Controller (Section 03)
 * Manages scroll-driven & hover-driven interactive visual stage transitions.
 */

(function() {
  'use strict';

  function initWhyDynasty() {
    const rows = document.querySelectorAll('.trade-editorial-row');
    const stageImg = document.getElementById('why-stage-img');
    const stageBadge = document.getElementById('why-stage-badge');
    const stageContract = document.getElementById('why-stage-contract');
    const stageMargin = document.getElementById('why-stage-margin');

    if (!rows.length || !stageImg) return;

    function activateRow(row) {
      rows.forEach(r => r.classList.remove('active'));
      row.classList.add('active');

      const img = row.getAttribute('data-img');
      const badge = row.getAttribute('data-badge');
      const contract = row.getAttribute('data-contract');
      const margin = row.getAttribute('data-margin');

      if (img && stageImg) {
        stageImg.style.opacity = '0.35';
        setTimeout(() => {
          stageImg.src = img;
          stageImg.style.opacity = '1';
        }, 120);
      }

      if (badge && stageBadge) stageBadge.textContent = badge;
      if (contract && stageContract) stageContract.textContent = contract;
      if (margin && stageMargin) stageMargin.textContent = margin;
    }

    rows.forEach(row => {
      row.addEventListener('mouseenter', () => activateRow(row));
      row.addEventListener('click', () => activateRow(row));
    });

    // ScrollTrigger integration for activating rows on scroll
    if (typeof ScrollTrigger !== 'undefined') {
      rows.forEach(row => {
        ScrollTrigger.create({
          trigger: row,
          start: 'top center+=50',
          end: 'bottom center+=50',
          onEnter: () => activateRow(row),
          onEnterBack: () => activateRow(row)
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhyDynasty);
  } else {
    initWhyDynasty();
  }
})();
