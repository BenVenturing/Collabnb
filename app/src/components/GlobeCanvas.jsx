import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ── City → Country lookup (for stats) ───────────────────────────────────── */
const CITY_COUNTRY = {
  // United States
  'new york':       'United States', 'los angeles':    'United States',
  'chicago':        'United States', 'houston':        'United States',
  'miami':          'United States', 'san francisco':  'United States',
  'seattle':        'United States', 'austin':         'United States',
  'denver':         'United States', 'boston':         'United States',
  'atlanta':        'United States', 'las vegas':      'United States',
  'nashville':      'United States', 'portland':       'United States',
  'phoenix':        'United States', 'san diego':      'United States',
  'dallas':         'United States', 'washington':     'United States',
  'charlotte':      'United States', 'indianapolis':   'United States',
  'columbus':       'United States', 'orlando':        'United States',
  'jacksonville':   'United States', 'fort worth':     'United States',
  'honolulu':       'United States', 'asheville':      'United States',
  'charleston':     'United States', 'santa fe':       'United States',
  'sedona':         'United States', 'jackson':        'United States',
  'napa':           'United States', 'san antonio':    'United States',
  'san jose':       'United States', 'philadelphia':   'United States',
  // Canada
  'toronto': 'Canada', 'vancouver': 'Canada', 'montreal': 'Canada',
  // Mexico
  'mexico city': 'Mexico', 'tulum': 'Mexico', 'cancun': 'Mexico',
  // Europe
  'london': 'United Kingdom', 'manchester': 'United Kingdom', 'edinburgh': 'United Kingdom',
  'paris': 'France', 'lyon': 'France', 'nice': 'France',
  'berlin': 'Germany', 'munich': 'Germany', 'hamburg': 'Germany',
  'madrid': 'Spain', 'barcelona': 'Spain', 'ibiza': 'Spain', 'seville': 'Spain',
  'rome': 'Italy', 'milan': 'Italy', 'florence': 'Italy', 'venice': 'Italy',
  'amsterdam': 'Netherlands', 'lisbon': 'Portugal', 'dublin': 'Ireland',
  'vienna': 'Austria', 'prague': 'Czech Republic', 'budapest': 'Hungary',
  'stockholm': 'Sweden', 'copenhagen': 'Denmark', 'oslo': 'Norway', 'helsinki': 'Finland',
  'athens': 'Greece', 'santorini': 'Greece', 'istanbul': 'Turkey',
  'zurich': 'Switzerland', 'geneva': 'Switzerland',
  'dubrovnik': 'Croatia', 'brussels': 'Belgium',
  // Middle East
  'dubai': 'UAE', 'abu dhabi': 'UAE',
  // Asia
  'tokyo': 'Japan', 'osaka': 'Japan', 'kyoto': 'Japan',
  'seoul': 'South Korea', 'busan': 'South Korea',
  'beijing': 'China', 'shanghai': 'China', 'hong kong': 'China',
  'taipei': 'Taiwan', 'singapore': 'Singapore',
  'kuala lumpur': 'Malaysia', 'penang': 'Malaysia',
  'bangkok': 'Thailand', 'chiang mai': 'Thailand', 'phuket': 'Thailand',
  'bali': 'Indonesia', 'jakarta': 'Indonesia',
  'manila': 'Philippines',
  'ho chi minh city': 'Vietnam', 'hanoi': 'Vietnam',
  'mumbai': 'India', 'delhi': 'India', 'bangalore': 'India', 'goa': 'India',
  // Pacific
  'sydney': 'Australia', 'melbourne': 'Australia', 'brisbane': 'Australia',
  'auckland': 'New Zealand',
  // Latin America
  'sao paulo': 'Brazil', 'rio de janeiro': 'Brazil',
  'buenos aires': 'Argentina',
  'bogota': 'Colombia', 'medellin': 'Colombia', 'cartagena': 'Colombia',
  'lima': 'Peru', 'santiago': 'Chile',
  // Africa
  'cape town': 'South Africa', 'johannesburg': 'South Africa',
  'nairobi': 'Kenya', 'lagos': 'Nigeria',
  'cairo': 'Egypt', 'marrakech': 'Morocco',
};

export function countGlobeStats(profiles) {
  if (!profiles?.length) return { creators: 0, hosts: 0, countries: 0 };
  let creators = 0, hosts = 0;
  const countrySet = new Set();
  profiles.forEach((p) => {
    if (p.role === 'creator') creators++;
    if (p.role === 'host') hosts++;
    const key = p.city?.toLowerCase().trim() || '';
    let country = CITY_COUNTRY[key];
    if (!country) {
      for (const c in CITY_COUNTRY) {
        if (key.includes(c) || c.includes(key)) { country = CITY_COUNTRY[c]; break; }
      }
    }
    if (country) countrySet.add(country);
  });
  return { creators, hosts, countries: countrySet.size };
}

/* ── Improved continent polygons ─────────────────────────────────────────── */
const CONTINENT_POLYS = [
  // North America
  [[71,-157],[65,-168],[63,-162],[58,-152],[57,-137],[55,-131],
   [50,-127],[48,-124],[38,-122],[34,-120],[32,-117],[23,-110],
   [20,-105],[16,-95],[10,-83],[8,-77],[10,-76],[16,-88],
   [21,-87],[25,-80],[31,-81],[35,-76],[39,-74],[42,-70],
   [44,-66],[47,-53],[52,-55],[56,-59],[60,-64],[63,-64],
   [68,-62],[72,-68],[74,-80],[70,-85],[63,-90],[68,-100],
   [69,-108],[68,-135],[71,-141],[71,-157]],

  // Greenland
  [[83,-45],[82,-20],[76,-18],[72,-22],[70,-28],[68,-52],
   [70,-62],[75,-68],[80,-66],[83,-45]],

  // South America (single polygon)
  [[12,-72],[10,-62],[7,-58],[5,-52],[2,-50],[0,-49],
   [-5,-35],[-10,-37],[-15,-39],[-23,-43],[-28,-49],
   [-33,-52],[-38,-57],[-42,-64],[-48,-66],[-52,-69],
   [-55,-67],[-52,-70],[-42,-74],[-30,-72],[-18,-70],
   [-10,-77],[-5,-81],[-2,-80],[0,-80],[4,-77],[8,-77],[12,-72]],

  // Europe (including Scandinavia)
  [[36,-9],[39,-9],[43,-8],[44,-1],[43,5],[48,-5],
   [51,-3],[51,1],[53,5],[55,8],[56,13],[58,12],
   [60,11],[63,10],[65,14],[68,16],[70,20],[71,26],
   [70,28],[65,25],[62,22],[60,24],[60,28],[65,28],
   [68,33],[70,40],[68,44],[64,38],[60,30],[57,28],
   [55,21],[54,18],[46,16],[46,19],[44,22],[41,26],
   [38,24],[37,22],[36,28],[40,26],[42,28],[44,28],
   [46,22],[56,13],[36,-9]],

  // Italy
  [[44,8],[44,12],[41,16],[38,16],[37,15],[38,9],[44,8]],

  // UK
  [[51,-5],[51,-3],[53,0],[55,-2],[58,-5],[58,-3],
   [56,-6],[54,-4],[52,-4],[51,-5]],

  // Africa
  [[36,-5],[28,-12],[22,-16],[15,-17],[11,-15],[8,-13],
   [4,-8],[5,0],[6,3],[4,9],[0,10],[-5,12],[-8,13],
   [-15,12],[-22,14],[-29,17],[-34,18],[-34,26],
   [-28,33],[-15,37],[-10,40],[-5,40],[0,41],[4,42],
   [11,51],[15,42],[22,37],[27,34],[30,33],[31,32],
   [31,25],[31,10],[37,8],[36,-5]],

  // Asia main body (Turkey → Siberia → China/SE Asia coast → S baseline)
  [[42,28],[38,36],[38,50],[40,60],[50,80],[55,82],
   [62,70],[68,55],[70,70],[72,80],[73,105],[72,130],
   [68,162],[62,168],[56,135],[50,128],[45,132],[42,130],
   [38,122],[32,122],[25,120],[22,114],[18,108],[15,100],
   [10,98],[15,98],[20,93],[22,88],[28,88],[28,68],
   [22,62],[25,57],[12,44],[30,33],[38,36],[42,28]],

  // Arabian Peninsula
  [[30,32],[22,37],[12,43],[12,57],[22,60],[26,57],
   [28,50],[36,50],[38,43],[38,36],[30,32]],

  // Indian Subcontinent
  [[28,68],[22,68],[8,77],[8,80],[15,80],[22,88],
   [28,88],[28,80],[28,68]],

  // SE Asia mainland
  [[28,97],[22,100],[18,98],[10,98],[5,100],[5,104],
   [10,105],[15,100],[22,105],[28,102],[28,97]],

  // Malay Peninsula
  [[10,100],[5,100],[2,103],[1,104],[5,104],[10,102],[10,100]],

  // Borneo
  [[7,108],[1,108],[-4,116],[-4,118],[2,118],[7,118],[7,108]],

  // Sumatra
  [[5,95],[0,104],[-5,106],[-5,104],[0,98],[5,95]],

  // Japan (Honshu + Kyushu)
  [[43,144],[42,141],[40,141],[34,136],[34,131],
   [36,131],[38,140],[40,140],[43,142],[43,144]],

  // Korea
  [[38,124],[35,126],[34,129],[38,129],[40,127],[38,124]],

  // Australia
  [[-12,130],[-15,137],[-17,140],[-22,150],[-24,152],
   [-33,152],[-38,146],[-38,140],[-35,137],[-33,134],
   [-32,127],[-25,114],[-22,114],[-18,122],[-14,130],[-12,130]],

  // New Zealand South Island
  [[-42,171],[-46,168],[-46,170],[-44,172],[-42,174],[-42,171]],

  // New Zealand North Island
  [[-37,174],[-38,176],[-41,175],[-40,174],[-37,175],[-37,174]],
];

/* ── City dictionary (for pin placement) ─────────────────────────────────── */
const CITY_DICT = {
  'new york': {lat:40.71,lng:-74.01}, 'los angeles': {lat:34.05,lng:-118.24},
  'chicago': {lat:41.87,lng:-87.62}, 'houston': {lat:29.76,lng:-95.36},
  'san francisco': {lat:37.77,lng:-122.41}, 'miami': {lat:25.76,lng:-80.19},
  'seattle': {lat:47.60,lng:-122.33}, 'austin': {lat:30.26,lng:-97.74},
  'denver': {lat:39.73,lng:-104.99}, 'boston': {lat:42.36,lng:-71.05},
  'atlanta': {lat:33.74,lng:-84.38}, 'las vegas': {lat:36.16,lng:-115.13},
  'nashville': {lat:36.16,lng:-86.78}, 'portland': {lat:45.52,lng:-122.68},
  'toronto': {lat:43.65,lng:-79.38}, 'vancouver': {lat:49.28,lng:-123.12},
  'montreal': {lat:45.50,lng:-73.56}, 'mexico city': {lat:19.43,lng:-99.13},
  'tulum': {lat:20.21,lng:-87.43}, 'cancun': {lat:21.16,lng:-86.85},
  'london': {lat:51.50,lng:-0.12}, 'paris': {lat:48.85,lng:2.35},
  'berlin': {lat:52.52,lng:13.40}, 'madrid': {lat:40.41,lng:-3.70},
  'rome': {lat:41.90,lng:12.49}, 'amsterdam': {lat:52.36,lng:4.90},
  'barcelona': {lat:41.38,lng:2.16}, 'lisbon': {lat:38.72,lng:-9.14},
  'dubai': {lat:25.20,lng:55.27}, 'tokyo': {lat:35.67,lng:139.65},
  'singapore': {lat:1.35,lng:103.81}, 'hong kong': {lat:22.31,lng:114.16},
  'bali': {lat:-8.40,lng:115.18}, 'sydney': {lat:-33.86,lng:151.20},
  'melbourne': {lat:-37.81,lng:144.96}, 'bangkok': {lat:13.75,lng:100.50},
  'sao paulo': {lat:-23.55,lng:-46.63}, 'buenos aires': {lat:-34.60,lng:-58.38},
  'bogota': {lat:4.71,lng:-74.07}, 'cape town': {lat:-33.92,lng:18.42},
  'cairo': {lat:30.04,lng:31.23}, 'nairobi': {lat:-1.29,lng:36.82},
  'mumbai': {lat:19.07,lng:72.87}, 'delhi': {lat:28.70,lng:77.10},
  'asheville': {lat:35.57,lng:-82.55}, 'charleston': {lat:32.77,lng:-79.93},
  'santa fe': {lat:35.68,lng:-105.94}, 'sedona': {lat:34.86,lng:-111.78},
  'jackson': {lat:43.47,lng:-110.76}, 'napa': {lat:38.29,lng:-122.28},
  'seoul': {lat:37.56,lng:126.97}, 'istanbul': {lat:41.00,lng:28.97},
  'marrakech': {lat:31.62,lng:-7.98}, 'rio de janeiro': {lat:-22.90,lng:-43.17},
  'medellin': {lat:6.24,lng:-75.58}, 'santiago': {lat:-33.44,lng:-70.65},
};

const FALLBACKS = [
  {lat:39.10,lng:-84.51},{lat:38.62,lng:-90.19},{lat:43.03,lng:-87.90},
  {lat:32.22,lng:-110.92},{lat:53.48,lng:-2.24},{lat:43.76,lng:11.25},
];

function getCityCoords(city) {
  if (!city) return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  const key = city.toLowerCase().trim();
  if (CITY_DICT[key]) return CITY_DICT[key];
  for (const c in CITY_DICT) {
    if (key.includes(c) || c.includes(key)) return CITY_DICT[c];
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

/* ── Static fallback pins ────────────────────────────────────────────────── */
const FALLBACK_CREATORS = [
  [40.71,-74.01],[34.05,-118.24],[37.77,-122.42],[51.51,-0.13],[48.86,2.35],
  [52.52,13.41],[35.68,139.65],[1.35,103.82],[19.08,72.88],[13.75,100.52],
  [43.65,-79.38],[45.52,-122.68],[47.61,-122.33],[36.16,-115.14],[29.76,-95.37],
];
const FALLBACK_HOSTS = [
  [25.76,-80.19],[41.88,-87.63],[-33.87,151.21],[22.54,114.06],[-8.40,115.18],
  [20.21,-87.43],[38.29,-122.28],[35.57,-82.55],[34.86,-111.78],[30.04,31.24],
];

const CREATOR_COLOR = 0x22c55e;
const HOST_COLOR    = 0xef4444;

/* ── Canvas texture ───────────────────────────────────────────────────────── */
function buildGlobeTexture() {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#DCE4E0';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(149,157,144,0.15)';
  ctx.lineWidth = 0.8;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (1 - (lat + 90) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 20) {
    const x = (lng + 180) / 360 * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(130,150,135,0.72)';
  ctx.strokeStyle = 'rgba(100,125,110,0.55)';
  ctx.lineWidth = 1.2;
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

export default function GlobeCanvas({ profiles }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  /* ── Main scene setup ───────────────────────────────────────────────────── */
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

    const texture = buildGlobeTexture();

    // Main globe — reduced shininess so specular spot is smaller
    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 72, 54),
      new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.82,
        shininess: 38,
        specular: new THREE.Color(0x666666),
      })
    );

    const innerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.998, 48, 36),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.BackSide })
    );

    // Fresnel rim glow
    const rimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.004, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal,vViewDir;void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vViewDir=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `varying vec3 vNormal,vViewDir;void main(){float f=pow(1.0-max(dot(vNormal,vViewDir),0.0),3.2);gl_FragColor=vec4(1.0,1.0,1.0,f*0.45);}`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );

    // Specular highlight — much tighter & dimmer (pow 60, multiplier 0.10)
    const shineMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.002, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal;void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vNormal;void main(){vec3 l=normalize(vec3(0.6,0.8,0.5));float s=pow(max(dot(vNormal,l),0.0),60.0)*0.10;gl_FragColor=vec4(1.0,1.0,1.0,s);}`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );

    // Atmosphere halo
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.13, 48, 36),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal;void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vNormal;void main(){float i=pow(0.65-dot(vNormal,vec3(0.0,0.0,1.0)),2.2);gl_FragColor=vec4(0.82,0.93,0.87,i*0.52);}`,
        transparent: true, side: THREE.BackSide, depthWrite: false,
      })
    ));

    scene.add(new THREE.AmbientLight(0xffffff, 0.58));
    const sun = new THREE.DirectionalLight(0xffffff, 0.72); sun.position.set(4, 3, 5); scene.add(sun);
    const rim = new THREE.DirectionalLight(0xd1ebdb, 0.35); rim.position.set(-4, -1, -3); scene.add(rim);

    const pinsGroup = new THREE.Group();
    const pinGeo    = new THREE.SphereGeometry(0.011, 8, 6);
    const glowGeo   = new THREE.SphereGeometry(0.021, 8, 6);
    const pinGlows  = [];

    sceneRef.current = { pinsGroup, pinGlows, pinGeo, glowGeo, R };

    const wrapper = new THREE.Group();
    wrapper.add(globeMesh, innerMesh, rimMesh, shineMesh, pinsGroup);
    wrapper.rotation.x = 0.15;
    scene.add(wrapper);

    let dragging = false, prevX = 0, prevY = 0, velX = 0, velY = 0, hovering = false;
    const getPos = (e) => e.touches?.length ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : {x:e.clientX,y:e.clientY};
    const onDown = (e) => { dragging=true; const p=getPos(e); prevX=p.x; prevY=p.y; velX=velY=0; renderer.domElement.style.cursor='grabbing'; };
    const onMove = (e) => { if(!dragging)return; const p=getPos(e); velY=(p.x-prevX)*0.005; velX=(p.y-prevY)*0.003; wrapper.rotation.y+=velY; wrapper.rotation.x=Math.max(-1,Math.min(1,wrapper.rotation.x+velX)); prevX=p.x; prevY=p.y; };
    const onUp   = () => { dragging=false; renderer.domElement.style.cursor='grab'; };
    renderer.domElement.addEventListener('mousedown',  onDown);
    renderer.domElement.addEventListener('touchstart', onDown, {passive:true});
    renderer.domElement.addEventListener('mouseenter', ()=>{ hovering=true; });
    renderer.domElement.addEventListener('mouseleave', ()=>{ hovering=false; dragging=false; });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchend',  onUp);

    const ro = new ResizeObserver(() => { const nw=mount.clientWidth; renderer.setSize(nw,nw); });
    ro.observe(mount);

    let rafId, t = 0;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      t += 0.016;
      if (!dragging) {
        velX*=0.95; velY*=0.95;
        wrapper.rotation.y += velY;
        wrapper.rotation.x = Math.max(-1, Math.min(1, wrapper.rotation.x + velX));
        if (!hovering) wrapper.rotation.y += 0.0008;
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
      sceneRef.current = null;
      renderer.domElement.removeEventListener('mousedown',  onDown);
      renderer.domElement.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchend',  onUp);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      texture.dispose();
    };
  }, []);

  /* ── Pins update ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    const { pinsGroup, pinGlows, pinGeo, glowGeo, R } = sc;

    while (pinsGroup.children.length > 0) pinsGroup.remove(pinsGroup.children[0]);
    pinGlows.length = 0;

    function addPin(lat, lng, color) {
      const pos = latLngToVec3(lat, lng, R * 1.006);
      const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color }));
      pin.position.copy(pos);
      pinsGroup.add(pin);
      const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
      glow.position.copy(pos);
      glow.userData.phase = Math.random() * Math.PI * 2;
      pinsGroup.add(glow);
      pinGlows.push(glow);
    }

    if (profiles && profiles.length > 0) {
      profiles.forEach((p) => {
        const coords = getCityCoords(p.city);
        const jLat = coords.lat + (Math.random() - 0.5) * 0.8;
        const jLng = coords.lng + (Math.random() - 0.5) * 0.8;
        addPin(jLat, jLng, p.role === 'creator' ? CREATOR_COLOR : HOST_COLOR);
      });
    } else {
      FALLBACK_CREATORS.forEach(([lat, lng]) => addPin(lat, lng, CREATOR_COLOR));
      FALLBACK_HOSTS.forEach(([lat, lng]) => addPin(lat, lng, HOST_COLOR));
    }
  }, [profiles]);

  return (
    <div
      ref={mountRef}
      className="w-full aspect-square max-w-[440px] mx-auto"
      style={{ filter: 'drop-shadow(0 0 48px rgba(209,235,219,0.28)) drop-shadow(0 24px 64px rgba(25,37,36,0.10))' }}
    />
  );
}
