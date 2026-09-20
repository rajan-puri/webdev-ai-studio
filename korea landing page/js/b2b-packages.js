/**
 * DYNASTY KOREA — Horizontal Package Browser & Drawer Controller (Section 02)
 * Handles category filtering, day-by-day outline population, and B2B quote pre-fill.
 */

(function() {
  'use strict';

  const PACKAGES_DB = {
    'pkg-01': {
      title: 'SEOUL ESSENTIALS',
      duration: '5 NIGHTS / 6 DAYS',
      category: 'B2B CAPITAL & CULTURE SPECIFICATION',
      stops: 'Incheon Airport → Seoul (5N) → Nami Island Excursion → Departure',
      img: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=1200&auto=format&fit=crop',
      days: [
        { day: 'Day 01', title: 'Arrival at Incheon (ICN) & Seoul Check-In', desc: 'VIP meet & greet by licensed bilingual guide. Private transfer to 4*/5* hotel in central Seoul. Evening walking orientation of Myeongdong followed by welcome Indian dinner at pre-contracted restaurant.' },
        { day: 'Day 02', title: 'Royal Joseon Heritage & Modern K-Design', desc: 'Morning visit to Gyeongbokgung Palace with Hanbok dress-up experience. Stroll through Bukchon Hanok traditional alleys. Afternoon visit to Dongdaemun Design Plaza (DDP). Indian dinner and return transfer.' },
        { day: 'Day 03', title: 'Nami Island & Petite France Full-Day Excursion', desc: 'Scenic private coach transfer to Gapyeong. Ferry ride to Nami Island (iconic K-Drama pine avenues). Afternoon visit to French cultural village or Garden of Morning Calm. Return to Seoul for dinner.' },
        { day: 'Day 04', title: 'Gangnam Lifestyle, K-Star Road & COEX Skydeck', desc: 'Explore hypermodern Gangnam, Bongeunsa Temple, Starfield Library, and Lotte World Tower Seoul Sky observation deck. Time for duty-free luxury cosmetic shopping.' },
        { day: 'Day 05', title: 'DMZ Peace Tour or Leisure K-Culture Day', desc: 'Optional morning half-day DMZ excursion (3rd Infiltration Tunnel & Dora Observatory) or free day for beauty treatments in Hongdae / shopping in Insadong. Farewell Indian banquet.' },
        { day: 'Day 06', title: 'Seoul Hotel Check-Out & Airport Departure', desc: 'Breakfast at hotel. Private coach transfer to Incheon International Airport with VAT tax refund assistance for your clients.' }
      ]
    },
    'pkg-02': {
      title: 'SEOUL + BUSAN DUAL-CITY',
      duration: '6 NIGHTS / 7 DAYS',
      category: 'B2B KTX BULLET TRAIN CORRIDOR',
      stops: 'Seoul (3N) → KTX Bullet Train → Busan (3N) → Departure',
      img: 'https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=1200&auto=format&fit=crop',
      days: [
        { day: 'Day 01', title: 'Incheon Touchdown & Seoul Evening', desc: 'Airport greeting, private transfer to Seoul hotel, check-in, orientation, and dinner at certified Indian dining room.' },
        { day: 'Day 02', title: 'Seoul Highlights & Palaces', desc: 'Gyeongbokgung Palace, Bukchon Hanok Village, Insadong antique street, and N Seoul Tower cable car panoramic ride.' },
        { day: 'Day 03', title: 'Gangnam & Modern Seoul Exploration', desc: 'COEX Mall, K-Star Road, Hangang River cruise, and evening leisure in Hongdae nightlife district.' },
        { day: 'Day 04', title: 'KTX High-Speed Bullet Train to Busan', desc: 'Morning hotel transfer to Seoul Station. Board 300 km/h KTX train to Busan (2h 15m). Check-in to Haeundae beachfront hotel. Sunset private yacht tour around Gwangan Bridge.' },
        { day: 'Day 05', title: 'Busan Maritime & Heritage Wonders', desc: 'Haedong Yonggungsa Temple (cliffside ocean temple), Haeundae Blueline Park Sky Capsule train ride, and fresh Jagalchi fish market walk.' },
        { day: 'Day 06', title: 'Gamcheon Culture Village & Songdo Skywalk', desc: 'Explore the colorful hillside alleyways of Gamcheon Culture Village. Songdo Marine Cable Car with glass bottom over the ocean. Indian dinner in Haeundae.' },
        { day: 'Day 07', title: 'Busan Departure / KTX Return Transfer', desc: 'Check-out. Transfer to Gimhae International Airport (PUS) or KTX back to Incheon Airport for flight back to India.' }
      ]
    },
    'pkg-03': {
      title: 'SEOUL + JEJU WONDER',
      duration: '6 NIGHTS / 7 DAYS',
      category: 'B2B UNESCO NATURE & ISLAND LEISURE',
      stops: 'Seoul (3N) → Domestic Flight → Jeju Island (3N) → Departure',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      days: [
        { day: 'Day 01', title: 'Arrival in Seoul & Evening Rest', desc: 'VIP meet and transfer to central Seoul. Rest and authentic Indian meal.' },
        { day: 'Day 02', title: 'Grand Seoul Culture & City Tour', desc: 'Gyeongbokgung, National Folk Museum, N Seoul Tower, and shopping in Myeongdong.' },
        { day: 'Day 03', title: 'Nami Island Excursion & Gangnam', desc: 'Full day to Nami Island and evening Gangnam shopping at Starfield COEX Mall.' },
        { day: 'Day 04', title: 'Fly to Jeju Island & Southern Coast', desc: 'Transfer to Gimpo Airport (GMP), 1-hour flight to Jeju (CJU). Private coach pickup. Visit Jusangjeolli hexagonal basalt cliff formations and Cheonjiyeon Waterfall.' },
        { day: 'Day 05', title: 'UNESCO Eastern Jeju Wonders', desc: 'Seongsan Ilchulbong Sunrise Peak volcanic crater, Seopjikoji coastal path, and Manjanggul lava tube cave system.' },
        { day: 'Day 06', title: 'Jeju West Coast & Green Tea Plantations', desc: 'Osulloc Green Tea Museum, Camellia Hill botanical garden, and leisurely sunset beach stroll along Hyeopjae Beach. Private dinner coordination.' },
        { day: 'Day 07', title: 'Jeju Departure', desc: 'Morning tangerine souvenir picking. Transfer to Jeju Airport for domestic connection to Incheon international flight to India.' }
      ]
    },
    'pkg-04': {
      title: 'COMPLETE KOREA TRILOGY',
      duration: '8 NIGHTS / 9 DAYS',
      category: 'B2B COMPREHENSIVE SOUTH KOREA CIRCUIT',
      stops: 'Seoul (3N) → KTX → Busan (2N) → Flight → Jeju (3N) → Departure',
      img: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=1200&auto=format&fit=crop',
      days: [
        { day: 'Day 01', title: 'Arrival at Incheon & Welcome in Seoul', desc: 'Airport greeting, luggage handling, private transfer to 4*/5* hotel, and welcome Indian dinner.' },
        { day: 'Day 02', title: 'Royal Heritage, Bukchon & N Seoul Tower', desc: 'Full-day classical Seoul exploration with Hanbok dress experience.' },
        { day: 'Day 03', title: 'Nami Island & Gangnam Shopping', desc: 'Excursion to Nami Island followed by evening Gangnam shopping and dining.' },
        { day: 'Day 04', title: 'KTX Bullet Train to Busan & Gwangan Night', desc: 'First-class KTX to Busan. Check-in at Haeundae. Sunset yacht cruise under Gwangan Bridge.' },
        { day: 'Day 05', title: 'Busan Coastal Highlights & Gamcheon', desc: 'Haedong Yonggungsa ocean temple, Blueline Sky Capsule, and vibrant Gamcheon Culture Village.' },
        { day: 'Day 06', title: 'Fly from Busan to Jeju Island', desc: 'Morning domestic flight from Gimhae (PUS) to Jeju (CJU). Southern waterfall tour & basalt cliffs.' },
        { day: 'Day 07', title: 'Jeju UNESCO Heritage Tour', desc: 'Seongsan Sunrise Peak, Manjanggul Lava Tube, and Jeju Folk Village.' },
        { day: 'Day 08', title: 'Leisure, Tangerine Farms & Ocean Drive', desc: 'Osulloc tea plantation, luxury coastal café hopping, and sunset beachfront farewell banquet.' },
        { day: 'Day 09', title: 'Jeju to Incheon International Flight Home', desc: 'Fly CJU to GMP/ICN and connect to evening flight back to India.' }
      ]
    }
  };

  function initPackages() {
    const filterBtns = document.querySelectorAll('.cat-pill');
    const items = document.querySelectorAll('.catalogue-item');
    const drawer = document.getElementById('package-drawer');
    const closeBtn = document.getElementById('close-pkg-drawer');
    const drawerQuoteBtn = document.getElementById('drawer-quote-btn');

    // Drawer elements
    const dCat = document.getElementById('drawer-pkg-cat');
    const dTitle = document.getElementById('drawer-title');
    const dDur = document.getElementById('drawer-pkg-dur');
    const dImg = document.getElementById('drawer-pkg-img');
    const dStops = document.getElementById('drawer-pkg-stops');
    const dDays = document.getElementById('drawer-days-container');

    // 1. Filtering
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filter = this.getAttribute('data-filter');
        items.forEach(item => {
          const cat = item.getAttribute('data-cat');
          if (filter === 'all' || cat === filter) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });

    // 2. Open Drawer
    function openPackageDrawer(pkgId) {
      const data = PACKAGES_DB[pkgId];
      if (!data || !drawer) return;

      if (dCat) dCat.textContent = data.category;
      if (dTitle) dTitle.textContent = data.title;
      if (dDur) dDur.textContent = data.duration;
      if (dImg) dImg.src = data.img;
      if (dStops) dStops.textContent = data.stops;

      if (dDays) {
        dDays.innerHTML = '';
        data.days.forEach(d => {
          const node = document.createElement('div');
          node.className = 'day-node-light';
          node.innerHTML = `
            <div class="day-h">${d.day}: ${d.title}</div>
            <div class="day-p">${d.desc}</div>
          `;
          dDays.appendChild(node);
        });
      }

      if (drawerQuoteBtn) {
        drawerQuoteBtn.setAttribute('data-prefill', data.title);
      }

      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    // Attach click triggers
    document.querySelectorAll('.open-pkg-drawer').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const pkgId = this.getAttribute('data-pkg');
        openPackageDrawer(pkgId);
      });
    });

    items.forEach(item => {
      item.addEventListener('click', function() {
        const pkgId = this.getAttribute('data-pkg-id');
        openPackageDrawer(pkgId);
      });
    });

    // Close Drawer
    function closeDrawer() {
      if (drawer) {
        drawer.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (drawer) {
      drawer.addEventListener('click', function(e) {
        if (e.target === drawer) closeDrawer();
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('active')) {
        closeDrawer();
      }
    });

    // Drawer quote button handoff
    if (drawerQuoteBtn) {
      drawerQuoteBtn.addEventListener('click', function() {
        const title = this.getAttribute('data-prefill') || '';
        closeDrawer();

        const quoteModal = document.getElementById('b2b-quote-modal');
        const reqField = document.getElementById('m-requirements');
        if (reqField && title) {
          reqField.value = `Inquiring for wholesale B2B net tariff on: ${title}.\nPlease include white-label client presentation deck and Indian meal options.`;
        }
        if (quoteModal) {
          quoteModal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPackages);
  } else {
    initPackages();
  }
})();
