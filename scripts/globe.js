/* ============================================================
   Collabnb — Interactive 3D Waitlist Globe
   ============================================================ */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.min.js';
import { supabase } from './supabase.js';

/* ── Safety: uncaught errors ─────────────────────────────────── */
window.addEventListener('unhandledrejection', e => console.warn('Globe rejection:', e.reason));

/* ── City Dictionary (Lat/Lng) ───────────────────────────────── */
const CITY_DICT = {
  // North America
  'new york': {lat: 40.71, lng: -74.01}, 'los angeles': {lat: 34.05, lng: -118.24},
  'chicago': {lat: 41.87, lng: -87.62}, 'houston': {lat: 29.76, lng: -95.36},
  'phoenix': {lat: 33.44, lng: -112.07}, 'philadelphia': {lat: 39.95, lng: -75.16},
  'san antonio': {lat: 29.42, lng: -98.49}, 'san diego': {lat: 32.71, lng: -117.16},
  'dallas': {lat: 32.77, lng: -96.79}, 'san jose': {lat: 37.33, lng: -121.88},
  'austin': {lat: 30.26, lng: -97.74}, 'jacksonville': {lat: 30.33, lng: -81.65},
  'fort worth': {lat: 32.75, lng: -97.33}, 'columbus': {lat: 39.96, lng: -82.99},
  'san francisco': {lat: 37.77, lng: -122.41}, 'charlotte': {lat: 35.22, lng: -80.84},
  'indianapolis': {lat: 39.76, lng: -86.15}, 'seattle': {lat: 47.60, lng: -122.33},
  'denver': {lat: 39.73, lng: -104.99}, 'washington': {lat: 38.90, lng: -77.03},
  'boston': {lat: 42.36, lng: -71.05}, 'miami': {lat: 25.76, lng: -80.19},
  'atlanta': {lat: 33.74, lng: -84.38}, 'toronto': {lat: 43.65, lng: -79.38},
  'vancouver': {lat: 49.28, lng: -123.12}, 'montreal': {lat: 45.50, lng: -73.56},
  'mexico city': {lat: 19.43, lng: -99.13}, 'tulum': {lat: 20.21, lng: -87.43},
  'cancun': {lat: 21.16, lng: -86.85}, 'las vegas': {lat: 36.16, lng: -115.13},
  'orlando': {lat: 28.53, lng: -81.37}, 'nashville': {lat: 36.16, lng: -86.78},
  'portland': {lat: 45.52, lng: -122.68},

  // Europe
  'london': {lat: 51.50, lng: -0.12}, 'paris': {lat: 48.85, lng: 2.35},
  'berlin': {lat: 52.52, lng: 13.40}, 'madrid': {lat: 40.41, lng: -3.70},
  'rome': {lat: 41.90, lng: 12.49}, 'amsterdam': {lat: 52.36, lng: 4.90},
  'barcelona': {lat: 41.38, lng: 2.16}, 'lisbon': {lat: 38.72, lng: -9.14},
  'dublin': {lat: 53.34, lng: -6.26}, 'vienna': {lat: 48.20, lng: 16.37},
  'prague': {lat: 50.07, lng: 14.43}, 'budapest': {lat: 47.49, lng: 19.04},
  'stockholm': {lat: 59.32, lng: 18.06}, 'copenhagen': {lat: 55.67, lng: 12.56},
  'oslo': {lat: 59.91, lng: 10.75}, 'helsinki': {lat: 60.16, lng: 24.93},
  'athens': {lat: 37.98, lng: 23.72}, 'istanbul': {lat: 41.00, lng: 28.97},
  'milan': {lat: 45.46, lng: 9.19}, 'munich': {lat: 48.13, lng: 11.58},
  'zurich': {lat: 47.37, lng: 8.54}, 'geneva': {lat: 46.20, lng: 6.14},
  'santorini': {lat: 36.39, lng: 25.46}, 'ibiza': {lat: 38.90, lng: 1.43},
  'dubrovnik': {lat: 42.65, lng: 18.09},

  // Asia / Pacific
  'tokyo': {lat: 35.67, lng: 139.65}, 'seoul': {lat: 37.56, lng: 126.97},
  'beijing': {lat: 39.90, lng: 116.40}, 'shanghai': {lat: 31.23, lng: 121.47},
  'hong kong': {lat: 22.31, lng: 114.16}, 'taipei': {lat: 25.03, lng: 121.56},
  'singapore': {lat: 1.35, lng: 103.81}, 'kuala lumpur': {lat: 3.13, lng: 101.68},
  'bangkok': {lat: 13.75, lng: 100.50}, 'chiang mai': {lat: 18.78, lng: 98.98},
  'phuket': {lat: 7.88, lng: 98.39}, 'bali': {lat: -8.40, lng: 115.18},
  'jakarta': {lat: -6.20, lng: 106.81}, 'manila': {lat: 14.59, lng: 120.98},
  'ho chi minh city': {lat: 10.82, lng: 106.62}, 'hanoi': {lat: 21.02, lng: 105.83},
  'mumbai': {lat: 19.07, lng: 72.87}, 'delhi': {lat: 28.70, lng: 77.10},
  'dubai': {lat: 25.20, lng: 55.27}, 'abu dhabi': {lat: 24.45, lng: 54.37},
  'sydney': {lat: -33.86, lng: 151.20}, 'melbourne': {lat: -37.81, lng: 144.96},
  'auckland': {lat: -36.84, lng: 174.76}, 'honolulu': {lat: 21.30, lng: -157.85},

  // Latam / Africa
  'sao paulo': {lat: -23.55, lng: -46.63}, 'rio de janeiro': {lat: -22.90, lng: -43.17},
  'buenos aires': {lat: -34.60, lng: -58.38}, 'bogota': {lat: 4.71, lng: -74.07},
  'lima': {lat: -12.04, lng: -77.02}, 'santiago': {lat: -33.44, lng: -70.65},
  'medellin': {lat: 6.24, lng: -75.58}, 'cape town': {lat: -33.92, lng: 18.42},
  'johannesburg': {lat: -26.20, lng: 28.04}, 'nairobi': {lat: -1.29, lng: 36.82},
  'lagos': {lat: 6.52, lng: 3.37}, 'cairo': {lat: 30.04, lng: 31.23},
  'marrakech': {lat: 31.62, lng: -7.98}
};

/* Fallback locations if city isn't found (scattered in North America/Europe for realism) */
const FALLBACKS = [
  {lat: 39.10, lng: -84.51}, {lat: 38.62, lng: -90.19}, {lat: 39.29, lng: -76.61}, 
  {lat: 43.03, lng: -87.90}, {lat: 32.22, lng: -110.92}, {lat: 36.85, lng: -75.97},
  {lat: 53.48, lng: -2.24}, {lat: 43.76, lng: 11.25}, {lat: 48.57, lng: 7.75}
];

function getCityCoords(cityName) {
  if (!cityName) return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  const key = cityName.toLowerCase().trim();
  if (CITY_DICT[key]) return CITY_DICT[key];
  for (let c in CITY_DICT) {
    if (key.includes(c) || c.includes(key)) return CITY_DICT[c];
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

/* ── Continent polygons for canvas texture (lat/lng pairs) ───── */
// Equirectangular: u=(lng+180)/360, v=1-(lat+90)/180
const CONTINENT_POLYS = [
  // North America
  [[71,-141],[70,-95],[74,-80],[60,-64],[47,-53],[45,-62],[44,-68],[35,-75],[25,-80],
   [20,-87],[15,-92],[8,-77],[9,-79],[15,-88],[22,-105],[30,-117],[34,-120],[38,-122],
   [48,-124],[55,-130],[58,-137],[60,-147],[63,-158],[58,-152],[61,-146],[58,-137],
   [55,-131],[50,-127],[49,-124]],
  // Greenland
  [[83,-45],[82,-20],[76,-18],[72,-22],[70,-28],[68,-52],[70,-62],[75,-68],[80,-66],[83,-45]],
  // South America
  [[12,-71],[10,-75],[8,-77],[4,-77],[1,-80],[-2,-80],[-5,-81],[-6,-77],[-4,-73],[-2,-67],
   [2,-60],[7,-60],[10,-62],[12,-70]],
  [[-6,-77],[-10,-75],[-15,-75],[-18,-70],[-22,-60],[-23,-43],[-20,-40],[-12,-38],[-5,-35],
   [-2,-50],[-2,-67],[-4,-73],[-6,-77]],
  [[-23,-43],[-28,-49],[-33,-52],[-38,-57],[-42,-64],[-48,-66],[-52,-69],[-55,-66],
   [-47,-65],[-38,-57],[-35,-57]],
  // Europe
  [[36,-6],[39,-9],[42,-9],[44,-1],[43,5],[47,2],[48,-5],[51,-3],[51,1],[53,5],[55,8],
   [56,13],[55,21],[54,18],[46,16],[46,19],[44,22],[41,26],[38,24],[37,22],[36,28],
   [40,26],[42,28],[44,28],[46,22],[46,19],[56,13],[58,12],[60,11],[63,10],[65,14],
   [68,16],[70,20],[71,26],[70,28],[65,25],[62,22],[60,24],[60,28],[65,28],[68,33],
   [70,40],[68,44],[64,38],[60,30],[57,28],[56,13]],
  // Italy peninsula
  [[44,8],[44,12],[41,16],[38,16],[37,15],[39,9],[44,8]],
  // Africa
  [[36,0],[32,13],[25,10],[20,10],[15,0],[10,-5],[5,-5],[5,0],[0,10],[-5,12],[-10,14],
   [-15,12],[-22,14],[-28,16],[-34,18],[-34,26],[-33,28],[-30,31],[-20,35],[-10,42],
   [0,42],[5,44],[10,45],[12,44],[10,50],[15,50],[18,40],[22,36],[25,33],[30,32],
   [32,32],[34,36],[36,10],[36,0]],
  // Asia main
  [[42,28],[40,40],[38,48],[30,48],[25,55],[20,58],[15,52],[10,45],[5,44],[0,42],
   [5,80],[8,80],[10,77],[15,75],[22,70],[25,65],[30,60],[35,60],[38,58],[40,53],
   [42,50],[44,38],[42,28]],
  // Middle east/Arabia
  [[38,36],[30,32],[25,37],[22,39],[12,45],[12,51],[25,57],[30,48],[38,48],[38,36]],
  // India
  [[22,68],[8,78],[8,80],[22,88],[28,88],[28,78],[22,68]],
  // SE Asia mainland
  [[22,100],[18,98],[10,98],[5,100],[5,104],[10,105],[15,100],[22,105],[22,100]],
  // SE Asia islands (Borneo approx)
  [[7,108],[1,108],[-4,116],[-4,118],[2,118],[7,118],[7,108]],
  // SE Asia islands (Sumatra approx)
  [[5,95],[1,104],[-5,106],[-5,104],[1,98],[5,95]],
  // Asia east (China/Korea/Japan area)
  [[50,105],[55,110],[52,115],[48,120],[45,125],[42,130],[38,122],[32,122],[25,120],
   [22,114],[18,108],[15,108],[22,100],[22,105],[28,102],[35,105],[40,115],[45,122],
   [50,105]],
  // Japan (simplified)
  [[43,142],[40,141],[34,136],[34,131],[40,132],[42,142],[43,142]],
  // Russia east
  [[55,140],[58,140],[62,140],[65,142],[68,170],[62,170],[55,140]],
  // Australia
  [[-12,130],[-15,137],[-17,140],[-24,152],[-33,152],[-38,145],[-38,140],[-35,137],
   [-33,134],[-32,127],[-25,114],[-18,122],[-12,130]],
  // New Zealand (North Island approx)
  [[-37,174],[-38,176],[-41,175],[-37,174]],
];

/* ── Canvas texture with filled continents ───────────────────── */
function buildGlobeTexture() {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // Ocean base — solid bone colour (alpha must be 1 for WebGL texture)
  ctx.fillStyle = '#DCE4E0';
  ctx.fillRect(0, 0, W, H);

  // Grid lines (very subtle)
  ctx.strokeStyle = 'rgba(149,157,144,0.18)';
  ctx.lineWidth = 0.8;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (1 - (lat + 90) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 20) {
    const x = (lng + 180) / 360 * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Continent fills — sage-mint tinted
  function drawPoly(coords) {
    if (!coords.length) return;
    ctx.beginPath();
    coords.forEach(([lat, lng], i) => {
      const x = (lng + 180) / 360 * W;
      const y = (1 - (lat + 90) / 180) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Land fill colour — muted sage
  ctx.fillStyle = 'rgba(130, 150, 135, 0.72)';
  ctx.strokeStyle = 'rgba(100, 125, 110, 0.6)';
  ctx.lineWidth = 1.5;
  CONTINENT_POLYS.forEach(drawPoly);

  return new THREE.CanvasTexture(cv);
}

/* ── lat/lng → 3D point ──────────────────────────────────────── */
function latLngToVec3(lat, lng, r) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Main globe init ─────────────────────────────────────────── */
function initGlobe() {
  const container = document.getElementById('globe-container');
  const canvas    = document.getElementById('globe-canvas');
  if (!container || !canvas) return;

  const glCtx = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!glCtx) {
    container.innerHTML = '<p style="color:var(--sage);padding:4rem 2rem;text-align:center;">WebGL not supported in this browser.</p>';
    return;
  }

  /* scene */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 3.6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  /* lighting — multiple sources for glass highlights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(4, 3, 5);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xd1ebdb, 0.4);
  rim.position.set(-4, -1, -3);
  scene.add(rim);

  const R = 1.3;

  /* ── Globe sphere with canvas texture + glass material ── */
  const texture  = buildGlobeTexture();
  const globeGeo = new THREE.SphereGeometry(R, 72, 54);
  const globeMat = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    opacity: 0.82,
    shininess: 110,
    specular: new THREE.Color(0xffffff),
    color: new THREE.Color(0xffffff),
  });
  const globeMesh = new THREE.Mesh(globeGeo, globeMat);

  /* ── Inner glass tint — backside white layer ── */
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  });
  const innerMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 0.998, 48, 36), innerMat);

  /* ── Fresnel rim — glass edge highlight ── */
  const rimGeo = new THREE.SphereGeometry(R * 1.004, 64, 48);
  const rimMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal  = normalize(normalMatrix * normal);
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float f = 1.0 - max(dot(vNormal, vViewDir), 0.0);
        f = pow(f, 3.2);
        gl_FragColor = vec4(1.0, 1.0, 1.0, f * 0.55);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);

  /* ── Glass inner shine arc (top-left specular spot) ── */
  const shineGeo = new THREE.SphereGeometry(R * 1.002, 64, 48);
  const shineMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        vec3 light = normalize(vec3(0.6, 0.8, 0.5));
        float d = max(dot(vNormal, light), 0.0);
        float spec = pow(d, 18.0) * 0.35;
        gl_FragColor = vec4(1.0, 1.0, 1.0, spec);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shineMesh = new THREE.Mesh(shineGeo, shineMat);

  /* ── Atmosphere ── */
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float i = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(0.82, 0.93, 0.87, i * 0.52);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 48, 36), atmosMat));

  /* ── Pins Group ── */
  const pinsGroup = new THREE.Group();
  const pinGeo    = new THREE.SphereGeometry(0.011, 8, 6);
  const glowGeo   = new THREE.SphereGeometry(0.021, 8, 6);
  const pinGlows  = [];

  function addPin(lat, lng, colorHex) {
    const pos = latLngToVec3(lat, lng, R * 1.006);
    const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: colorHex }));
    pin.position.copy(pos);
    pinsGroup.add(pin);
    const glow = new THREE.Mesh(glowGeo,
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.35, depthWrite: false }));
    glow.position.copy(pos);
    glow.userData.phase = Math.random() * Math.PI * 2;
    pinsGroup.add(glow);
    pinGlows.push(glow);
  }

  /* ── Fetch Live Data and Add Pins ── */
  async function loadPins() {
    try {
      const { data, error } = await supabase.from('profiles').select('city, region, role');
      if (error) throw error;

      let creators = 0, hosts = 0;
      const uniqueCities = new Set();

      data.forEach(profile => {
        if (profile.role === 'creator') creators++;
        if (profile.role === 'host') hosts++;
        if (profile.city) uniqueCities.add(profile.city.toLowerCase().trim());
        
        const coords = getCityCoords(profile.city);
        // Mint Green for Creators, Red for Hosts
        const colorHex = profile.role === 'creator' ? 0x4ecdc4 : 0xE74C3C; 
        
        // Add some random scatter so pins in the same city don't completely overlap
        const jitterLat = coords.lat + (Math.random() - 0.5) * 0.8;
        const jitterLng = coords.lng + (Math.random() - 0.5) * 0.8;
        
        addPin(jitterLat, jitterLng, colorHex);
      });

      // Update UI counts dynamically
      const cEl = document.getElementById('globe-creator-count');
      const hEl = document.getElementById('globe-host-count');
      const cityEl = document.getElementById('globe-city-count');
      if (cEl) cEl.textContent = creators;
      if (hEl) hEl.textContent = hosts;
      if (cityEl) cityEl.textContent = uniqueCities.size + (uniqueCities.size === 1 ? ' City' : ' Cities');

    } catch (err) {
      console.warn("Failed to load globe pins:", err);
    }
  }

  loadPins();

  // Listen for realtime inserts
  if (supabase.channel) {
    supabase.channel('public:profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, payload => {
        const profile = payload.new;
        const coords = getCityCoords(profile.city);
        const colorHex = profile.role === 'creator' ? 0x4ecdc4 : 0xE74C3C;
        addPin(coords.lat + (Math.random() - 0.5) * 0.8, coords.lng + (Math.random() - 0.5) * 0.8, colorHex);
        
        // Update counts
        const cityEl = document.getElementById('globe-city-count');
        const cEl = document.getElementById('globe-creator-count');
        const hEl = document.getElementById('globe-host-count');
        if (profile.role === 'creator' && cEl) cEl.textContent = parseInt(cEl.textContent || 0) + 1;
        if (profile.role === 'host' && hEl) hEl.textContent = parseInt(hEl.textContent || 0) + 1;
      })
      .subscribe();
  }

  /* ── Wrapper (everything that rotates) ── */
  const wrapper = new THREE.Group();
  wrapper.add(globeMesh, innerMesh, rimMesh, shineMesh, pinsGroup);
  wrapper.rotation.x = 0.15;
  scene.add(wrapper);

  /* ── Interaction ── */
  let dragging = false, prevMouse = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 }, hovering = false;

  const getPos = e => e.touches?.length
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY };

  canvas.addEventListener('mousedown',  e => { dragging = true;  prevMouse = getPos(e); vel = { x:0, y:0 }; canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('mousemove',  e => {
    if (!dragging) return;
    const p = getPos(e);
    const dx = p.x - prevMouse.x, dy = p.y - prevMouse.y;
    wrapper.rotation.y += dx * 0.005;
    wrapper.rotation.x  = Math.max(-1, Math.min(1, wrapper.rotation.x + dy * 0.003));
    vel = { x: dy * 0.003, y: dx * 0.005 };
    prevMouse = p;
  });
  canvas.addEventListener('mouseup',    () => { dragging = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseenter', () => { hovering = true;  canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseleave', () => { hovering = false; dragging = false; });
  canvas.addEventListener('touchstart', e => { dragging = true;  prevMouse = getPos(e); vel = { x:0, y:0 }; }, { passive: true });
  canvas.addEventListener('touchmove',  e => {
    if (!dragging) return;
    const p = getPos(e);
    const dx = p.x - prevMouse.x, dy = p.y - prevMouse.y;
    wrapper.rotation.y += dx * 0.005;
    wrapper.rotation.x  = Math.max(-1, Math.min(1, wrapper.rotation.x + dy * 0.003));
    vel = { x: dy * 0.003, y: dx * 0.005 };
    prevMouse = p;
  }, { passive: true });
  canvas.addEventListener('touchend',   () => { dragging = false; });

  /* ── Resize ── */
  const handleResize = () => {
    const size = Math.max(Math.min(container.getBoundingClientRect().width, 600), 100);
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    renderer.setSize(size, size, false);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(handleResize).observe(container);
  handleResize();

  /* ── Animate ── */
  let rafId, running = false, t = 0;

  const animate = () => {
    rafId = requestAnimationFrame(animate);
    t += 0.016;
    if (!dragging) {
      vel.x *= 0.95; vel.y *= 0.95;
      wrapper.rotation.y += vel.y;
      wrapper.rotation.x  = Math.max(-1, Math.min(1, wrapper.rotation.x + vel.x));
      if (!hovering) wrapper.rotation.y += 0.0008;
    }
    pinGlows.forEach(g => {
      const p = 0.18 + 0.18 * Math.sin(t * 1.5 + g.userData.phase);
      g.material.opacity = p;
      g.scale.setScalar(1 + 0.18 * Math.sin(t * 1.5 + g.userData.phase));
    });
    renderer.render(scene, camera);
  };

  const start = () => { if (running) return; running = true;  animate(); };
  const stop  = () => { if (!running) return; running = false; cancelAnimationFrame(rafId); };

  new IntersectionObserver(entries => {
    entries[0].isIntersecting ? start() : stop();
  }, { threshold: 0.0 }).observe(container);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : (container.getBoundingClientRect().top < window.innerHeight && start());
  });

  // Fallback: always start after a short delay in case IntersectionObserver misses
  setTimeout(start, 300);
}

/* ── Boot ── */
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', initGlobe)
  : initGlobe();
