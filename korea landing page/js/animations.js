/**
 * DYNASTY KOREA — Master GSAP Motion & ScrollTrigger Architecture
 * Lenis Smooth Scrolling, Hero Text Masking Reveals,
 * Asymmetric Parallax, and Horizontal Cinematic Scroll.
 */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Lenis Smooth Scroll
  let lenis = null;
  function initLenis() {
    if (typeof Lenis !== 'undefined' && !prefersReducedMotion && window.innerWidth > 1024) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.95
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
    }
  }

  // 2. Custom Subtle Desktop Cursor
  function initCursor() {
    const cursor = document.getElementById('editorial-cursor');
    if (!cursor || window.innerWidth <= 1024) return;

    let mouseX = -100, mouseY = -100;
    let currX = -100, currY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function render() {
      currX += (mouseX - currX) * 0.18;
      currY += (mouseY - currY) * 0.18;
      cursor.style.transform = `translate3d(${currX}px, ${currY}px, 0)`;
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    const interactiveTargets = document.querySelectorAll('button, a, .catalogue-item, .interactive-node, .cfg-pill, .trade-editorial-row');
    const ring = cursor.querySelector('.cursor-ring');

    interactiveTargets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (ring) {
          ring.style.transform = 'scale(1.6)';
          ring.style.borderColor = 'var(--korean-red)';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (ring) {
          ring.style.transform = 'scale(1)';
          ring.style.borderColor = 'rgba(21, 23, 26, 0.3)';
        }
      });
    });
  }

  // 3. Master GSAP Animations
  function initGsap() {
    if (typeof gsap === 'undefined') return;

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (prefersReducedMotion) {
      gsap.set('.title-mask span, .anim-hero-fade', { opacity: 1, y: 0 });
      return;
    }

    // Hero Opening Sequence
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });

    // Step 1: Meta badge
    heroTl.from('.hero-meta-badge', { opacity: 0, y: -15, duration: 0.6 }, 0.2);

    // Step 2: Headline Lines Reveal via Text Masking
    heroTl.from('.hero-giant-title .title-mask span', {
      yPercent: 110,
      stagger: 0.12,
      duration: 1.1,
      ease: 'expo.out'
    }, 0.35);

    // Step 3: Supporting copy, buttons, and 3D card
    heroTl.from('.hero-korean-subtitle', { opacity: 0, y: 15, duration: 0.7 }, 0.8)
          .from('.hero-support-text', { opacity: 0, y: 20, duration: 0.7 }, 0.9)
          .from('.hero-actions-row', { opacity: 0, y: 20, duration: 0.7 }, 1.0)
          .from('.hero-trade-metrics', { opacity: 0, y: 20, duration: 0.7 }, 1.1)
          .from('.hero-3d-card', { opacity: 0, scale: 0.96, duration: 0.9 }, 0.7);

    // Hero 3D Map scroll link
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          if (window.HeroKorea3D && window.HeroKorea3D.updateCameraOnScroll) {
            window.HeroKorea3D.updateCameraOnScroll(self.progress);
          }
        }
      });

      // Asymmetric Parallax in Section 01 (Three Cities)
      const spreads = document.querySelectorAll('.destination-spread');
      spreads.forEach(spread => {
        const img = spread.querySelector('.parallax-target');
        if (img) {
          gsap.to(img, {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: {
              trigger: spread,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          });
        }
      });

      // Section 08: Horizontal Panorama Scroll
      const expWrapper = document.getElementById('expHorizontalWrapper');
      const expTrack = document.getElementById('expPanoramaTrack');

      if (expWrapper && expTrack && window.innerWidth > 1024) {
        const getScrollDistance = () => {
          return -(expTrack.scrollWidth - window.innerWidth + 200);
        };

        gsap.to(expTrack, {
          x: getScrollDistance,
          ease: 'none',
          scrollTrigger: {
            trigger: expWrapper,
            start: 'top top+=80',
            end: () => `+=${expTrack.scrollWidth}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true
          }
        });
      }
    }
  }

  function init() {
    initLenis();
    initCursor();
    initGsap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
