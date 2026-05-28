import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── Continent polygons (lat/lng pairs) — matches marketing globe ─ */
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
  // Italy
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
  // Middle east / Arabia
  [[38,36],[30,32],[25,37],[22,39],[12,45],[12,51],[25,57],[30,48],[38,48],[38,36]],
  // India
  [[22,68],[8,78],[8,80],[22,88],[28,88],[28,78],[22,68]],
  // SE Asia mainland
  [[22,100],[18,98],[10,98],[5,100],[5,104],[10,105],[15,100],[22,105],[22,100]],
  // Borneo
  [[7,108],[1,108],[-4,116],[-4,118],[2,118],[7,118],[7,108]],
  // Sumatra
  [[5,95],[1,104],[-5,106],[-5,104],[1,98],[5,95]],
  // China/Korea/Japan
  [[50,105],[55,110],[52,115],[48,120],[45,125],[42,130],[38,122],[32,122],[25,120],
   [22,114],[18,108],[15,108],[22,100],[22,105],[28,102],[35,105],[40,115],[45,122],
   [50,105]],
  // Japan
  [[43,142],[40,141],[34,136],[34,131],[40,132],[42,142],[43,142]],
  // Russia east
  [[55,140],[58,140],[62,140],[65,142],[68,170],[62,170],[55,140]],
  // Australia
  [[-12,130],[-15,137],[-17,140],[-24,152],[-33,152],[-38,145],[-38,140],[-35,137],
   [-33,134],[-32,127],[-25,114],[-18,122],[-12,130]],
  // New Zealand
  [[-37,174],[-38,176],[-41,175],[-37,174]],
];

function buildGlobeTexture() {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // Ocean — pale seafoam (matches marketing globe)
  ctx.fillStyle = '#DCE4E0';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
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

  // Land fill — muted sage (matches marketing globe)
  ctx.fillStyle = 'rgba(130, 150, 135, 0.72)';
  ctx.strokeStyle = 'rgba(100, 125, 110, 0.6)';
  ctx.lineWidth = 1.5;

  CONTINENT_POLYS.forEach((coords) => {
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
  });

  return new THREE.CanvasTexture(cv);
}

function latLngToVec3(lat, lng, r = 1.306) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// Static city pins — creator locations
const CITIES = [
  [40.71, -74.01], [34.05, -118.24], [37.77, -122.42], [25.76, -80.19],
  [41.88, -87.63], [29.76, -95.37], [51.51, -0.13],    [48.86,   2.35],
  [52.52,  13.41], [41.90,  12.50], [40.42,  -3.70],   [59.33,  18.07],
  [35.68, 139.65], [31.23, 121.47], [22.54, 114.06],   [ 1.35, 103.82],
  [-33.87, 151.21],[-36.86, 174.77],[19.43, -99.13],   [-23.55, -46.63],
  [-34.60, -58.38],[ 4.71, -74.07], [30.04,  31.24],   [-26.20,  28.05],
  [28.61,  77.21], [19.08,  72.88], [13.75, 100.52],   [47.61, -122.33],
  [43.65, -79.38], [45.51, -73.55], [36.16, -115.14],  [45.52, -122.68],
];

export default function GlobeCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(w, w);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '50%';
    renderer.domElement.style.cursor = 'grab';

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 3.6;

    const R = 1.3;

    // ── Globe sphere with canvas texture + glass material ────────────────
    const texture = buildGlobeTexture();
    const globeGeo = new THREE.SphereGeometry(R, 72, 54);
    const globeMat = new THREE.MeshPhongMaterial({
      map:         texture,
      transparent: true,
      opacity:     0.82,
      shininess:   110,
      specular:    new THREE.Color(0xffffff),
      color:       new THREE.Color(0xffffff),
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);

    // ── Inner glass tint ─────────────────────────────────────────────────
    const innerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.998, 48, 36),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.BackSide })
    );

    // ── Fresnel rim — glass edge highlight ───────────────────────────────
    const rimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.004, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal; varying vec3 vViewDir;
          void main() {
            vNormal  = normalize(normalMatrix * normal);
            vec4 mv  = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal; varying vec3 vViewDir;
          void main() {
            float f = 1.0 - max(dot(vNormal, vViewDir), 0.0);
            f = pow(f, 3.2);
            gl_FragColor = vec4(1.0, 1.0, 1.0, f * 0.55);
          }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );

    // ── Glass shine arc ──────────────────────────────────────────────────
    const shineMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.002, 64, 48),
      new THREE.ShaderMaterial({
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
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );

    // ── Atmosphere ───────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.13, 48, 36),
      new THREE.ShaderMaterial({
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
        transparent: true, side: THREE.BackSide, depthWrite: false,
      })
    ));

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(4, 3, 5);
    scene.add(sun);
    const rimLight = new THREE.DirectionalLight(0xd1ebdb, 0.4);
    rimLight.position.set(-4, -1, -3);
    scene.add(rimLight);

    // ── City pins with glow ──────────────────────────────────────────────
    const pinsGroup = new THREE.Group();
    const pinGeo  = new THREE.SphereGeometry(0.011, 8, 6);
    const glowGeo = new THREE.SphereGeometry(0.021, 8, 6);
    const pinGlows = [];
    const PIN_COLOR = 0x4ecdc4; // teal mint — matches marketing globe creator pins

    CITIES.forEach(([lat, lng]) => {
      const pos = latLngToVec3(lat, lng, R * 1.006);
      const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: PIN_COLOR }));
      pin.position.copy(pos);
      pinsGroup.add(pin);
      const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
        color: PIN_COLOR, transparent: true, opacity: 0.35, depthWrite: false,
      }));
      glow.position.copy(pos);
      glow.userData.phase = Math.random() * Math.PI * 2;
      pinsGroup.add(glow);
      pinGlows.push(glow);
    });

    // ── Wrapper (rotates with globe) ─────────────────────────────────────
    const wrapper = new THREE.Group();
    wrapper.add(globeMesh, innerMesh, rimMesh, shineMesh, pinsGroup);
    wrapper.rotation.x = 0.15;
    scene.add(wrapper);

    // ── Drag interaction ─────────────────────────────────────────────────
    let dragging = false, prevX = 0, prevY = 0;
    let velX = 0, velY = 0, hovering = false;

    const getPos = (e) => e.touches?.length
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    const onDown = (e) => { dragging = true; const p = getPos(e); prevX = p.x; prevY = p.y; velX = velY = 0; renderer.domElement.style.cursor = 'grabbing'; };
    const onMove = (e) => {
      if (!dragging) return;
      const p = getPos(e);
      velY = (p.x - prevX) * 0.005;
      velX = (p.y - prevY) * 0.003;
      wrapper.rotation.y += velY;
      wrapper.rotation.x  = Math.max(-1, Math.min(1, wrapper.rotation.x + velX));
      prevX = p.x; prevY = p.y;
    };
    const onUp = () => { dragging = false; renderer.domElement.style.cursor = 'grab'; };

    renderer.domElement.addEventListener('mousedown',  onDown);
    renderer.domElement.addEventListener('touchstart', onDown, { passive: true });
    renderer.domElement.addEventListener('mouseenter', () => { hovering = true; });
    renderer.domElement.addEventListener('mouseleave', () => { hovering = false; dragging = false; });
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('touchmove',  onMove, { passive: true });
    window.addEventListener('mouseup',    onUp);
    window.addEventListener('touchend',   onUp);

    // ── Resize ───────────────────────────────────────────────────────────
    const onResize = () => {
      const nw = mount.clientWidth;
      renderer.setSize(nw, nw);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Animation loop ───────────────────────────────────────────────────
    let rafId, t = 0;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      t += 0.016;
      if (!dragging) {
        velX *= 0.95; velY *= 0.95;
        wrapper.rotation.y += velY;
        wrapper.rotation.x  = Math.max(-1, Math.min(1, wrapper.rotation.x + velX));
        if (!hovering) wrapper.rotation.y += 0.0008; // matches marketing globe idle speed
      }
      pinGlows.forEach((g) => {
        const p = 0.18 + 0.18 * Math.sin(t * 1.5 + g.userData.phase);
        g.material.opacity = p;
        g.scale.setScalar(1 + 0.18 * Math.sin(t * 1.5 + g.userData.phase));
      });
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousedown',  onDown);
      renderer.domElement.removeEventListener('touchstart', onDown);
      renderer.domElement.removeEventListener('mouseenter', () => {});
      renderer.domElement.removeEventListener('mouseleave', () => {});
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      window.removeEventListener('touchend',   onUp);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      texture.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full aspect-square max-w-[440px] mx-auto"
      style={{
        filter: 'drop-shadow(0 0 48px rgba(209,235,219,0.28)) drop-shadow(0 24px 64px rgba(25,37,36,0.10))',
      }}
    />
  );
}
