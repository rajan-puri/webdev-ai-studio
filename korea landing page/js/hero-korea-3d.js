/**
 * DYNASTY KOREA — 3D Stylized South Korea Map (Hero Section)
 * Light Visual Treatment: Ivory/White Terrain, Red Destination Markers,
 * Blue Route Lines & Geographic Elevation Mesh.
 */

(function() {
  'use strict';

  const canvas = document.getElementById('korea-3d-canvas');
  const container = document.getElementById('hero-3d-container');

  if (!canvas || !container) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene, camera, renderer;
  let terrainMesh, routeLines = [], nodeMeshes = [];
  let animId;

  // Geographic Local Coordinates
  const LOCATIONS = {
    seoul: { name: 'SEOUL', x: -0.35, y: 1.15, z: 0.22, color: 0xE7475E },
    busan: { name: 'BUSAN', x: 0.85, y: -0.35, z: 0.14, color: 0xE7475E },
    jeju: { name: 'JEJU', x: -0.45, y: -1.55, z: 0.1, color: 0xE7475E }
  };

  function initThree() {
    try {
      scene = new THREE.Scene();

      const width = container.clientWidth || 400;
      const height = container.clientHeight || 320;
      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, -1.9, 4.3);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      createLightTerrain();
      createCityNodes();
      createBlueRouteLines();

      window.addEventListener('resize', onResize);
      animate();
    } catch (e) {
      console.warn('[Dynasty Korea] WebGL initialization fallback:', e);
    }
  }

  // Light Ivory / White Geographic Peninsula Mesh
  function createLightTerrain() {
    const geometry = new THREE.PlaneGeometry(3.4, 4.4, 32, 40);
    const pos = geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      let elevation = 0;
      // Ridge along eastern spine
      const ridge = Math.exp(-Math.pow(x - 0.2, 2) * 4) * Math.exp(-Math.pow(y - 0.4, 2) * 1.6);
      elevation += ridge * 0.32;

      // Jeju volcanic peak
      const distJeju = Math.exp(-(Math.pow(x + 0.45, 2) + Math.pow(y + 1.55, 2)) * 12);
      elevation += distJeju * 0.22;

      // Gentle wave contour
      elevation += Math.sin(x * 5 + y * 3) * 0.035;
      pos.setZ(i, elevation);
    }
    geometry.computeVertexNormals();

    // Light editorial terrain wireframe
    const material = new THREE.MeshBasicMaterial({
      color: 0x9B9FA5,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });

    terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI * 0.22;
    terrainMesh.rotation.z = -Math.PI * 0.04;
    scene.add(terrainMesh);
  }

  // Red Destination Markers
  function createCityNodes() {
    const group = new THREE.Group();

    Object.keys(LOCATIONS).forEach(key => {
      const loc = LOCATIONS[key];

      // Red Core Sphere
      const coreGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: loc.color });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(loc.x, loc.y, loc.z + 0.04);

      // Pulsing Outer Ring
      const ringGeo = new THREE.RingGeometry(0.07, 0.09, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: loc.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(loc.x, loc.y, loc.z + 0.04);

      nodeMeshes.push({ core, ring, key });
      group.add(core);
      group.add(ring);
    });

    if (terrainMesh) {
      terrainMesh.add(group);
    } else {
      scene.add(group);
    }
  }

  // Blue Transit Route Lines (Seoul -> Busan, Busan -> Jeju, Seoul -> Jeju)
  function createBlueRouteLines() {
    const seoul = new THREE.Vector3(LOCATIONS.seoul.x, LOCATIONS.seoul.y, LOCATIONS.seoul.z + 0.05);
    const busan = new THREE.Vector3(LOCATIONS.busan.x, LOCATIONS.busan.y, LOCATIONS.busan.z + 0.05);
    const jeju = new THREE.Vector3(LOCATIONS.jeju.x, LOCATIONS.jeju.y, LOCATIONS.jeju.z + 0.05);

    // KTX Route curve (Seoul to Busan)
    const curve1 = new THREE.QuadraticBezierCurve3(
      seoul,
      new THREE.Vector3(0.35, 0.45, 0.32),
      busan
    );

    // Flight route (Busan to Jeju)
    const curve2 = new THREE.QuadraticBezierCurve3(
      busan,
      new THREE.Vector3(0.2, -0.95, 0.28),
      jeju
    );

    // Flight route (Seoul to Jeju)
    const curve3 = new THREE.QuadraticBezierCurve3(
      seoul,
      new THREE.Vector3(-0.85, -0.2, 0.4),
      jeju
    );

    [curve1, curve2, curve3].forEach((curve, idx) => {
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const material = new THREE.LineBasicMaterial({
        color: idx === 0 ? 0xE7475E : 0x315FA8,
        transparent: true,
        opacity: 0.8,
        linewidth: 1.5
      });

      const line = new THREE.Line(geometry, material);
      routeLines.push(line);

      if (terrainMesh) {
        terrainMesh.add(line);
      } else {
        scene.add(line);
      }
    });
  }

  function onResize() {
    if (!renderer || !camera || !container) return;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let clock = new THREE.Clock();

  function animate() {
    animId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    if (!prefersReducedMotion && terrainMesh) {
      // Gentle atmospheric tilt
      terrainMesh.rotation.z = -Math.PI * 0.04 + Math.sin(elapsed * 0.35) * 0.015;
      terrainMesh.rotation.x = -Math.PI * 0.22 + Math.cos(elapsed * 0.25) * 0.012;

      // Pulse city markers
      nodeMeshes.forEach((item, idx) => {
        const pulse = 1 + Math.sin(elapsed * 3 + idx * 1.5) * 0.35;
        item.ring.scale.set(pulse, pulse, 1);
        item.ring.material.opacity = Math.max(0.2, 0.85 - (pulse - 1));
      });
    }

    renderer.render(scene, camera);
  }

  // Expose Hook for GSAP Scroll
  window.HeroKorea3D = {
    updateCameraOnScroll: function(progress) {
      if (!camera || !terrainMesh) return;
      camera.position.z = 4.3 - progress * 0.6;
      camera.position.y = -1.9 + progress * 0.35;
      terrainMesh.rotation.x = -Math.PI * 0.22 - progress * 0.12;
    }
  };

  // City Toggle Click Handlers
  const toggles = document.querySelectorAll('.city-toggle-item');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      toggles.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThree);
  } else {
    initThree();
  }
})();
