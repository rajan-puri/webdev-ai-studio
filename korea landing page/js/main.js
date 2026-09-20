/**
 * DYNASTY KOREA — Core Application & Event Coordinator
 * Live Seoul KST Clock, Navigation Scrolled State,
 * Quotation Modal Controls & Mobile Navigation Curtain.
 */

(function() {
  'use strict';

  function initApp() {
    // 1. Live KST Clock
    const kstClock = document.getElementById('live-kst-clock');
    function updateKst() {
      if (!kstClock) return;
      try {
        const now = new Date();
        const options = {
          timeZone: 'Asia/Seoul',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        kstClock.textContent = `${new Intl.DateTimeFormat('en-GB', options).format(now)} KST`;
      } catch (e) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kst = new Date(utc + (3600000 * 9));
        kstClock.textContent = `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}:${String(kst.getSeconds()).padStart(2, '0')} KST`;
      }
    }
    updateKst();
    setInterval(updateKst, 1000);

    // 2. Dynamic Year
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 3. Header Scrolled State
    const siteHeader = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        siteHeader?.classList.add('scrolled');
      } else {
        siteHeader?.classList.remove('scrolled');
      }
    }, { passive: true });

    // 4. Mobile Curtain Navigation
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const curtain = document.getElementById('mobileNavCurtain');
    const curtainLinks = document.querySelectorAll('.curtain-link');

    function toggleMobileMenu() {
      const isOpen = curtain?.classList.contains('active');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }

    function openMobileMenu() {
      curtain?.classList.add('active');
      mobileBtn?.classList.add('active');
      mobileBtn?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
      curtain?.classList.remove('active');
      mobileBtn?.classList.remove('active');
      mobileBtn?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    mobileBtn?.addEventListener('click', toggleMobileMenu);
    curtainLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // 5. B2B Quotation Modal Handling
    const modal = document.getElementById('b2b-quote-modal');
    const closeBtn = document.getElementById('close-quote-modal');
    const triggers = document.querySelectorAll('.open-quote-modal');
    const form = document.getElementById('trade-quote-form');
    const successView = document.getElementById('modal-success-screen');
    const closeSuccessBtn = document.getElementById('btnCloseSuccess');

    function openQuoteModal(prefill) {
      if (!modal) return;
      closeMobileMenu();

      if (prefill && typeof prefill === 'string') {
        const reqField = document.getElementById('m-requirements');
        if (reqField && !reqField.value) {
          reqField.value = `Inquiring for specialized B2B itinerary for: ${prefill}.\nPlease include wholesale rates and Indian meal options.`;
        }
      }

      form?.classList.remove('hidden');
      successView?.classList.add('hidden');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeQuoteModal() {
      if (!modal) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    triggers.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const prefill = this.getAttribute('data-prefill');
        openQuoteModal(prefill);
      });
    });

    closeBtn?.addEventListener('click', closeQuoteModal);
    closeSuccessBtn?.addEventListener('click', closeQuoteModal);

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeQuoteModal();
    });

    // Form Submit
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btnModalSubmit');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span>DISPATCHING TO SEOUL & DELHI...</span>`;
      }

      setTimeout(() => {
        form.classList.add('hidden');
        successView?.classList.remove('hidden');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>SUBMIT TO B2B TRADE DESK →</span>`;
        }
      }, 700);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal?.classList.contains('active')) {
        closeQuoteModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
