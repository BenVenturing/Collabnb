import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// City coordinates [lat, lng] plotted as dots on the globe
const CITIES = [
  [40.71, -74.01],   // New York
  [34.05, -118.24],  // Los Angeles
  [37.77, -122.42],  // San Francisco
  [25.76, -80.19],   // Miami
  [41.88, -87.63],   // Chicago
  [29.76, -95.37],   // Houston
  [51.51, -0.13],    // London
  [48.86, 2.35],     // Paris
  [52.52, 13.41],    // Berlin
  [41.90, 12.50],    // Rome
  [40.42, -3.70],    // Madrid
  [59.33, 18.07],    // Stockholm
  [55.76, 37.62],    // Moscow
  [35.68, 139.65],   // Tokyo
  [31.23, 121.47],   // Shanghai
  [22.54, 114.06],   // Hong Kong
  [1.35, 103.82],    // Singapore
  [-33.87, 151.21],  // Sydney
  [-36.86, 174.77],  // Auckland
  [19.43, -99.13],   // Mexico City
  [-23.55, -46.63],  // São Paulo
  [-34.60, -58.38],  // Buenos Aires
  [4.71, -74.07],    // Bogotá
  [30.04, 31.24],    // Cairo
  [-26.20, 28.05],   // Johannesburg
  [6.52, 3.38],      // Lagos
  [-4.44, 15.27],    // Kinshasa
  [28.61, 77.21],    // New Delhi
  [19.08, 72.88],    // Mumbai
  [13.75, 100.52],   // Bangkok
  [36.17, -115.14],  // Las Vegas
  [45.52, -122.68],  // Portland
  [47.61, -122.33],  // Seattle
  [43.65, -79.38],   // Toronto
  [45.51, -73.55],   // Montreal
];

function latLngToVec3(lat, lng, radius = 1.02) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function GlobeCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;

    // ── Renderer ────────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, w);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '50%';
    renderer.domElement.style.cursor = 'grab';

    // ── Scene / Camera ───────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 2.75;

    // ── Globe group (everything rotates together) ────────────────────────────────
    const globe = new THREE.Group();
    scene.add(globe);

    // Main sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 56, 56),
      new THREE.MeshPhongMaterial({
        color:     new THREE.Color('#192524'),
        emissive:  new THREE.Color('#0c1a19'),
        shininess: 8,
      })
    );
    globe.add(sphere);

    // Grid lines overlay
    const gridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.002, 20, 20),
      new THREE.MeshBasicMaterial({
        color:       new THREE.Color('#3C5759'),
        wireframe:   true,
        transparent: true,
        opacity:     0.10,
      })
    );
    globe.add(gridMesh);

    // City dots — creator locations (mint)
    const creatorPositions = [];
    CITIES.forEach(([lat, lng]) => {
      const v = latLngToVec3(lat, lng);
      creatorPositions.push(v.x, v.y, v.z);
    });
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(creatorPositions, 3));
    const dots = new THREE.Points(
      dotGeo,
      new THREE.PointsMaterial({
        color: new THREE.Color('#D1EBDB'),
        size:  0.048,
        transparent: true,
        opacity: 0.9,
      })
    );
    globe.add(dots);

    // Atmosphere glow
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(1.14, 48, 48),
      new THREE.MeshPhongMaterial({
        color:       new THREE.Color('#D1EBDB'),
        transparent: true,
        opacity:     0.045,
        side:        THREE.BackSide,
      })
    );
    scene.add(atm); // atm doesn't rotate with globe

    // ── Lights ───────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    const keyLight = new THREE.DirectionalLight(new THREE.Color('#D1EBDB'), 1.6);
    keyLight.position.set(5, 3, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.28);
    fillLight.position.set(-4, -2, -3);
    scene.add(fillLight);

    // ── Drag interaction ─────────────────────────────────────────────────────────
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let targetY = 0, targetX = 0;
    let currentY = 0, currentX = 0;

    const onDown = (e) => {
      isDragging = true;
      prevX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      prevY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      targetY += (x - prevX) * 0.007;
      targetX += (y - prevY) * 0.004;
      targetX  = Math.max(-0.55, Math.min(0.55, targetX));
      prevX = x; prevY = y;
    };
    const onUp = () => {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.addEventListener('mousedown',  onDown);
    renderer.domElement.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('touchmove',  onMove, { passive: true });
    window.addEventListener('mouseup',    onUp);
    window.addEventListener('touchend',   onUp);

    // ── Resize ───────────────────────────────────────────────────────────────────
    const onResize = () => {
      const nw = mount.clientWidth;
      renderer.setSize(nw, nw);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ───────────────────────────────────────────────────────────
    let rafId;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (!isDragging) targetY += 0.0025;
      currentY += (targetY - currentY) * 0.06;
      currentX += (targetX - currentX) * 0.06;
      globe.rotation.y = currentY;
      globe.rotation.x = currentX;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('mousedown',  onDown);
      renderer.domElement.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      window.removeEventListener('touchend',   onUp);
      window.removeEventListener('resize',     onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full aspect-square max-w-[440px] mx-auto"
      style={{
        filter:
          'drop-shadow(0 0 48px rgba(209,235,219,0.28)) drop-shadow(0 24px 64px rgba(25,37,36,0.10))',
      }}
    />
  );
}
