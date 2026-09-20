/**
 * DYNASTY KOREA — Signature Interactive Light Korea Map & Route Builder (Section 06)
 * Destination exploration, node zooming, and dynamic Client Route Accumulator.
 */

(function() {
  'use strict';

  const DESTINATION_DATA = {
    seoul: {
      name: 'SEOUL',
      korean: '서울특별시',
      badge: 'PRIMARY OPERATIONS HQ',
      vibe: 'Capital / Culture / Shopping / K-Culture & MICE',
      img: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=900&auto=format&fit=crop',
      caption: 'N Seoul Tower, Gangnam & Myeongdong Operations',
      suited: 'FITs, First-time Indian travelers, MICE groups, Luxury Shoppers',
      stay: '3 to 5 Nights',
      dining: '22+ Certified Indian & Pure Veg/Jain kitchens'
    },
    busan: {
      name: 'BUSAN',
      korean: '부산광역시',
      badge: 'COASTAL MARITIME HUB',
      vibe: 'Coast / Food / City Skyline / Luxury Yachting',
      img: 'https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=900&auto=format&fit=crop',
      caption: 'Haeundae LCT Beach, Gwangan Bridge & Coastal Railway',
      suited: 'Couples, Millennials, Coastal Leisure, Incentive Groups',
      stay: '2 to 3 Nights',
      dining: '4 Authentic Indian restaurants + hotel kitchen banqueting'
    },
    jeju: {
      name: 'JEJU ISLAND',
      korean: '제주특별자치도',
      badge: 'UNESCO VOLCANIC SANCTUARY',
      vibe: 'Nature / Resorts / Luxury Honeymoon / Leisure',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900&auto=format&fit=crop',
      caption: 'Seongsan Sunrise Peak & Emerald Basalt Shoreline',
      suited: 'Honeymooners, High-end Families, Relaxation & Wellness',
      stay: '2 to 4 Nights',
      dining: 'Indian kitchen in Jeju City & private resort catering'
    },
    gyeongju: {
      name: 'GYEONGJU',
      korean: '경주시',
      badge: 'HISTORIC HERITAGE HUB',
      vibe: 'Ancient Silla Kingdom / UNESCO Tombs / Hanok Villages',
      img: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=900&auto=format&fit=crop',
      caption: 'Bulguksa Temple & Daereungwon Royal Tomb Park',
      suited: 'Culture enthusiasts, Heritage seekers, KTX stopover',
      stay: '1 to 2 Nights (or KTX stopover en route to Busan)',
      dining: 'Vegetarian temple cuisine & traditional Korean spreads'
    },
    nami: {
      name: 'NAMI ISLAND',
      korean: '남이섬',
      badge: 'SCENIC EXCURSION CORRIDOR',
      vibe: 'K-Drama Pine Groves / Riverside / Alpine Nature',
      img: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=900&auto=format&fit=crop',
      caption: 'Metasequoia tree lane & Winter Ski Slopes',
      suited: 'K-Drama fans, Family excursions, Winter snow seekers',
      stay: 'Day Excursion from Seoul',
      dining: 'Halal-friendly Asian dining & packed Indian lunch boxes'
    },
    incheon: {
      name: 'INCHEON (ICN)',
      korean: '인천광역시',
      badge: 'INTERNATIONAL GATEWAY',
      vibe: 'Terminal 1 & 2 VIP Meet & Greet / Songdo Smart City',
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=900&auto=format&fit=crop',
      caption: 'Incheon International Airport Direct Dispatch',
      suited: 'All international arrivals & departures from India',
      stay: 'Arrival / Departure Day',
      dining: 'Terminal transit lounges & Songdo international dining'
    },
    gangwon: {
      name: 'GANGWON-DO',
      korean: '강원도',
      badge: 'ALPINE & SKI RESORTS',
      vibe: 'Winter Wonderland / High-mountain Peaks / East Coast',
      img: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=900&auto=format&fit=crop',
      caption: 'Pyeongchang Olympic Resorts & Seoraksan National Park',
      suited: 'Winter snow seekers, Ski incentive groups, Summer hiking',
      stay: '2 to 3 Nights',
      dining: 'Resort private catering & vegetarian Indian meals on order'
    }
  };

  function initInteractiveMap() {
    const nodes = document.querySelectorAll('.interactive-node');
    const badgeEl = document.getElementById('map-inspect-badge');
    const koEl = document.getElementById('map-inspect-ko');
    const titleEl = document.getElementById('map-inspect-title');
    const vibeEl = document.getElementById('map-inspect-vibe');
    const imgEl = document.getElementById('map-inspect-img');
    const captionEl = document.getElementById('map-inspect-caption');
    const suitedEl = document.getElementById('map-inspect-suited');
    const stayEl = document.getElementById('map-inspect-stay');
    const diningEl = document.getElementById('map-inspect-dining');

    // Route Accumulator elements
    const accChain = document.getElementById('accRouteChain');
    const btnAddCurrent = document.getElementById('btnAddCurrentDest');
    const btnClearRoute = document.getElementById('btnClearRoute');
    const btnRequestRoute = document.getElementById('btnRequestMapRoute');

    let currentSelectedDest = 'SEOUL';
    let routeAccumulator = ['SEOUL', 'BUSAN', 'JEJU'];

    function selectDestination(key) {
      const data = DESTINATION_DATA[key];
      if (!data) return;

      currentSelectedDest = data.name;

      nodes.forEach(n => {
        if (n.getAttribute('data-node') === key) {
          n.classList.add('active');
        } else {
          n.classList.remove('active');
        }
      });

      if (badgeEl) badgeEl.textContent = data.badge;
      if (koEl) koEl.textContent = data.korean;
      if (titleEl) titleEl.textContent = data.name;
      if (vibeEl) vibeEl.textContent = data.vibe;
      if (captionEl) captionEl.textContent = data.caption;
      if (suitedEl) suitedEl.textContent = data.suited;
      if (stayEl) stayEl.textContent = data.stay;
      if (diningEl) diningEl.textContent = data.dining;

      if (imgEl && data.img) {
        imgEl.style.opacity = '0.35';
        setTimeout(() => {
          imgEl.src = data.img;
          imgEl.style.opacity = '1';
        }, 120);
      }

      if (btnAddCurrent) {
        btnAddCurrent.textContent = `+ ADD ${data.name.split(' ')[0]} TO ITINERARY`;
      }
    }

    nodes.forEach(node => {
      const key = node.getAttribute('data-node');
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        selectDestination(key);
      });
      node.addEventListener('mouseenter', () => selectDestination(key));
    });

    // Render Accumulator Chain
    function renderRouteChain() {
      if (!accChain) return;
      accChain.innerHTML = '';
      routeAccumulator.forEach((city, idx) => {
        const nodeSpan = document.createElement('span');
        nodeSpan.className = 'chain-node';
        nodeSpan.textContent = city;
        accChain.appendChild(nodeSpan);

        if (idx < routeAccumulator.length - 1) {
          const arrSpan = document.createElement('span');
          arrSpan.className = 'chain-arr';
          arrSpan.textContent = '↓';
          accChain.appendChild(arrSpan);
        }
      });
    }

    // Add Destination to Route
    if (btnAddCurrent) {
      btnAddCurrent.addEventListener('click', () => {
        if (!routeAccumulator.includes(currentSelectedDest)) {
          routeAccumulator.push(currentSelectedDest);
          renderRouteChain();
        }
      });
    }

    // Reset Route
    if (btnClearRoute) {
      btnClearRoute.addEventListener('click', () => {
        routeAccumulator = ['SEOUL'];
        renderRouteChain();
      });
    }

    // Request Tariff for this Route
    if (btnRequestRoute) {
      btnRequestRoute.addEventListener('click', () => {
        const routeString = routeAccumulator.join(' → ');
        const quoteModal = document.getElementById('b2b-quote-modal');
        const reqField = document.getElementById('m-requirements');
        if (reqField) {
          reqField.value = `Inquiring for specialized B2B quote for custom route: ${routeString}.\nPlease include wholesale net rates and Indian meal options.`;
        }
        if (quoteModal) {
          quoteModal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    }

    renderRouteChain();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveMap);
  } else {
    initInteractiveMap();
  }
})();
