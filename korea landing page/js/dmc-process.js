/**
 * DYNASTY KOREA — DMC Route Process Controller (Section 05)
 * Progressive red route line tracking through 7 operational stages.
 */

(function() {
  'use strict';

  function initDmcProcess() {
    const nodes = document.querySelectorAll('.route-node-item');
    const fillLine = document.getElementById('routeProgressFill');

    if (!nodes.length || !fillLine) return;

    function setStep(stepIndex) {
      nodes.forEach((node, idx) => {
        if (idx <= stepIndex) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });

      const percent = (stepIndex / (nodes.length - 1)) * 100;
      fillLine.style.width = `${Math.max(5, percent)}%`;
    }

    nodes.forEach((node, idx) => {
      node.addEventListener('mouseenter', () => setStep(idx));
      node.addEventListener('click', () => setStep(idx));
    });

    // Auto-advance subtly if in viewport
    let current = 0;
    let timer = null;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!timer) {
            timer = setInterval(() => {
              current = (current + 1) % nodes.length;
              setStep(current);
            }, 3200);
          }
        } else {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      });
    }, { threshold: 0.3 });

    const track = document.getElementById('processRouteTrack');
    if (track) observer.observe(track);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDmcProcess);
  } else {
    initDmcProcess();
  }
})();
