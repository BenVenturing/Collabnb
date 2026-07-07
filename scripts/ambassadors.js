/* ============================================================
   Collabnb — Ambassadors page: dot-matrix region map + apply form
   ============================================================ */

import { listAmbassadorRegions, applyAmbassador } from './convex.js';

/* ── Continent polygons (lat/lng), same shapes as the waitlist globe,
      plus Philippines + Java so Southeast Asia reads correctly ── */
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
  // South America
  [[12,-72],[10,-62],[7,-58],[5,-52],[2,-50],[0,-49],
   [-5,-35],[-10,-37],[-15,-39],[-23,-43],[-28,-49],
   [-33,-52],[-38,-57],[-42,-64],[-48,-66],[-52,-69],
   [-55,-67],[-52,-70],[-42,-74],[-30,-72],[-18,-70],
   [-10,-77],[-5,-81],[-2,-80],[0,-80],[4,-77],[8,-77],[12,-72]],
  // Europe (incl. Scandinavia) — index 3
  [[36,-9],[39,-9],[43,-8],[44,-1],[43,5],[48,-5],
   [51,-3],[51,1],[53,5],[55,8],[56,13],[58,12],
   [60,11],[63,10],[65,14],[68,16],[70,20],[71,26],
   [70,28],[65,25],[62,22],[60,24],[60,28],[65,28],
   [68,33],[70,40],[68,44],[64,38],[60,30],[57,28],
   [55,21],[54,18],[46,16],[46,19],[44,22],[41,26],
   [38,24],[37,22],[36,28],[40,26],[42,28],[44,28],
   [46,22],[56,13],[36,-9]],
  // Italy — index 4
  [[44,8],[44,12],[41,16],[38,16],[37,15],[38,9],[44,8]],
  // UK — index 5
  [[51,-5],[51,-3],[53,0],[55,-2],[58,-5],[58,-3],
   [56,-6],[54,-4],[52,-4],[51,-5]],
  // Africa
  [[36,-5],[28,-12],[22,-16],[15,-17],[11,-15],[8,-13],
   [4,-8],[5,0],[6,3],[4,9],[0,10],[-5,12],[-8,13],
   [-15,12],[-22,14],[-29,17],[-34,18],[-34,26],
   [-28,33],[-15,37],[-10,40],[-5,40],[0,41],[4,42],
   [11,51],[15,42],[22,37],[27,34],[30,33],[31,32],
   [31,25],[31,10],[37,8],[36,-5]],
  // Asia main body — index 7
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
  // SE Asia mainland — index 10
  [[28,97],[22,100],[18,98],[10,98],[5,100],[5,104],
   [10,105],[15,100],[22,105],[28,102],[28,97]],
  // Malay Peninsula — index 11
  [[10,100],[5,100],[2,103],[1,104],[5,104],[10,102],[10,100]],
  // Borneo — index 12
  [[7,108],[1,108],[-4,116],[-4,118],[2,118],[7,118],[7,108]],
  // Sumatra — index 13
  [[5,95],[0,104],[-5,106],[-5,104],[0,98],[5,95]],
  // Java — index 14
  [[-6,105],[-7,109],[-8,113],[-9,115],[-8,115],[-7,111],[-6,107],[-6,105]],
  // Philippines — index 15
  [[18,121],[16,120],[13,121],[10,122],[7,125],[6,126],
   [9,126],[12,124],[15,122],[18,122],[18,121]],
  // Japan
  [[43,144],[42,141],[40,141],[34,136],[34,131],
   [36,131],[38,140],[40,140],[43,142],[43,144]],
  // Korea
  [[38,124],[35,126],[34,129],[38,129],[40,127],[38,124]],
  // Australia
  [[-12,130],[-15,137],[-17,140],[-22,150],[-24,152],
   [-33,152],[-38,146],[-38,140],[-35,137],[-33,134],
   [-32,127],[-25,114],[-22,114],[-18,122],[-14,130],[-12,130]],
  // New Zealand
  [[-42,171],[-46,168],[-46,170],[-44,172],[-42,174],[-42,171]],
  [[-37,174],[-38,176],[-41,175],[-40,174],[-37,175],[-37,174]],
];

/* ── Region definitions: which polygons + lat/lng box light up ── */
const REGION_GEO = {
  'southeast-asia': { polys: [7, 10, 11, 12, 13, 14, 15], box: { latMin: -11, latMax: 22.5, lngMin: 92, lngMax: 127 }, anchor: { lat: 12, lng: 110 } },
  'southern-europe': { polys: [3, 4], box: { latMin: 34, latMax: 44, lngMin: -10, lngMax: 28.5 }, anchor: { lat: 39.5, lng: 3 } },
  'western-europe': { polys: [3, 5], box: { latMin: 44, latMax: 58.5, lngMin: -11, lngMax: 17 }, anchor: { lat: 50, lng: 3 } },
};

const REGION_FALLBACK = [
  { slug: 'southeast-asia', name: 'Southeast Asia', status: 'open', tier1_pct: 25, tier2_pct: 50, tier2_threshold: 5,
    countries: ['Thailand', 'Vietnam', 'Indonesia', 'Philippines', 'Malaysia', 'Singapore', 'Cambodia'] },
  { slug: 'southern-europe', name: 'Southern Europe', status: 'open', tier1_pct: 25, tier2_pct: 50, tier2_threshold: 5,
    countries: ['Portugal', 'Spain', 'Italy', 'Greece'] },
  { slug: 'western-europe', name: 'Western Europe', status: 'open', tier1_pct: 25, tier2_pct: 50, tier2_threshold: 5,
    countries: ['France', 'Germany', 'Netherlands', 'Austria', 'Switzerland', 'United Kingdom'] },
];

const STATUS_COLORS = { open: '#3C5759', taken: '#959D90', coming_soon: '#D0D5CE' };
const STATUS_LABELS = { open: 'Open — accepting applications', taken: 'Represented', coming_soon: 'Coming soon' };
const BASE_DOT = 'rgba(60,87,89,0.18)';

/* ── Geometry ── */
const LAT_TOP = 82, LAT_BOTTOM = -58;

function pointInPoly(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [latI, lngI] = poly[i], [latJ, lngJ] = poly[j];
    if ((lngI > lng) !== (lngJ > lng) &&
        lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI) {
      inside = !inside;
    }
  }
  return inside;
}

// Precompute land dots on a 2.2° grid, tagged with the region they belong to.
const DOT_STEP = 2.2;
const dots = [];
for (let lat = LAT_BOTTOM + DOT_STEP / 2; lat < LAT_TOP; lat += DOT_STEP) {
  for (let lng = -180 + DOT_STEP / 2; lng < 180; lng += DOT_STEP) {
    let polyIdx = -1;
    for (let p = 0; p < CONTINENT_POLYS.length; p++) {
      if (pointInPoly(lat, lng, CONTINENT_POLYS[p])) { polyIdx = p; break; }
    }
    if (polyIdx === -1) continue;
    let regionSlug = null;
    for (const [slug, geo] of Object.entries(REGION_GEO)) {
      const { box } = geo;
      if (geo.polys.includes(polyIdx) &&
          lat >= box.latMin && lat <= box.latMax &&
          lng >= box.lngMin && lng <= box.lngMax) {
        regionSlug = slug;
        break;
      }
    }
    dots.push({ lat, lng, region: regionSlug });
  }
}

/* ── Map rendering ── */
const canvas = document.getElementById('amb-map');
const tooltip = document.getElementById('amb-tooltip');
let regions = REGION_FALLBACK;
let hovered = null;

function project(lat, lng, w, h) {
  return {
    x: ((lng + 180) / 360) * w,
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * h,
  };
}

function unproject(x, y, w, h) {
  return {
    lng: (x / w) * 360 - 180,
    lat: LAT_TOP - (y / h) * (LAT_TOP - LAT_BOTTOM),
  };
}

function regionBySlug(slug) {
  return regions.find((r) => r.slug === slug);
}

function draw() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 1200;
  const cssH = cssW * 0.52;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const r = Math.max(1.4, cssW / 560);
  for (const d of dots) {
    const { x, y } = project(d.lat, d.lng, cssW, cssH);
    let color = BASE_DOT;
    let radius = r;
    if (d.region) {
      const reg = regionBySlug(d.region);
      color = STATUS_COLORS[reg?.status] || STATUS_COLORS.open;
      if (hovered === d.region) radius = r * 1.5;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Region anchor labels — bone halo behind the text so it stays readable over dots
  ctx.font = `700 ${Math.max(12, cssW / 85)}px Satoshi, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const [slug, geo] of Object.entries(REGION_GEO)) {
    const reg = regionBySlug(slug);
    if (!reg) continue;
    const { x, y } = project(geo.anchor.lat, geo.anchor.lng, cssW, cssH);
    ctx.strokeStyle = 'rgba(239,236,233,0.92)';
    ctx.lineWidth = 5;
    ctx.strokeText(reg.name, x, y - 10);
    ctx.fillStyle = hovered === slug ? '#192524' : '#3C5759';
    ctx.fillText(reg.name, x, y - 10);
  }
}

function hitRegion(x, y, w, h) {
  const { lat, lng } = unproject(x, y, w, h);
  for (const [slug, geo] of Object.entries(REGION_GEO)) {
    const { box } = geo;
    if (lat >= box.latMin - 2 && lat <= box.latMax + 2 &&
        lng >= box.lngMin - 2 && lng <= box.lngMax + 2) {
      return slug;
    }
  }
  return null;
}

if (canvas) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const slug = hitRegion(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (slug !== hovered) {
      hovered = slug;
      draw();
    }
    if (slug && tooltip) {
      const reg = regionBySlug(slug);
      const statusLine = reg.status === 'taken' && reg.ambassador_first_name
        ? `Represented by ${reg.ambassador_first_name}`
        : STATUS_LABELS[reg.status] || '';
      tooltip.innerHTML = `<strong>${reg.name}</strong><span class="tt-status">${statusLine}</span>`;
      tooltip.style.left = `${e.clientX - rect.left + canvas.offsetLeft}px`;
      tooltip.style.top = `${e.clientY - rect.top + canvas.offsetTop}px`;
      tooltip.style.opacity = '1';
      canvas.style.cursor = reg.status === 'open' ? 'pointer' : 'default';
    } else if (tooltip) {
      tooltip.style.opacity = '0';
    }
  });
  canvas.addEventListener('mouseleave', () => {
    hovered = null;
    if (tooltip) tooltip.style.opacity = '0';
    draw();
  });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const slug = hitRegion(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (slug) selectRegion(slug);
  });
  window.addEventListener('resize', draw);
}

/* ── Region cards ── */
function renderCards() {
  const wrap = document.getElementById('region-cards');
  if (!wrap) return;
  wrap.innerHTML = regions.map((r) => {
    const chip = `<span class="status-chip status-${r.status}">${
      r.status === 'open' ? 'Open' : r.status === 'taken' ? 'Represented' : 'Coming soon'}</span>`;
    const cta = r.status === 'open'
      ? `<button class="btn-primary" data-apply="${r.slug}" style="width:100%;">Apply for this region</button>`
      : r.status === 'taken'
        ? `<button class="btn-glass" disabled style="width:100%;opacity:.6;cursor:default;">${r.ambassador_first_name ? `Represented by ${r.ambassador_first_name}` : 'Region represented'}</button>`
        : `<button class="btn-glass" disabled style="width:100%;opacity:.6;cursor:default;">Coming soon</button>`;
    return `
      <div class="region-card glass reveal in">
        ${chip}
        <h3>${r.name}</h3>
        <div class="countries">${r.countries.join(' · ')}</div>
        ${cta}
      </div>`;
  }).join('');
  wrap.querySelectorAll('[data-apply]').forEach((btn) => {
    btn.addEventListener('click', () => selectRegion(btn.dataset.apply));
  });
}

function selectRegion(slug) {
  const reg = regionBySlug(slug);
  if (!reg || reg.status !== 'open') return;
  const select = document.getElementById('f-region');
  if (select) select.value = slug;
  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
}

function syncSelect() {
  const select = document.getElementById('f-region');
  if (!select) return;
  select.innerHTML = regions
    .map((r) => `<option value="${r.slug}" ${r.status !== 'open' ? 'disabled' : ''}>${r.name}${r.status !== 'open' ? ' — unavailable' : ''}</option>`)
    .join('');
  const firstOpen = regions.find((r) => r.status === 'open');
  if (firstOpen) select.value = firstOpen.slug;
}

/* ── Application form ── */
const form = document.getElementById('amb-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('f-msg');
    const submitBtn = document.getElementById('f-submit');
    const val = (id) => document.getElementById(id)?.value.trim() || '';

    msg.className = 'form-msg';
    if (!document.getElementById('f-terms')?.checked) {
      msg.textContent = 'Please read and agree to the Ambassador Terms first.';
      msg.classList.add('err');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      await applyAmbassador({
        region_slug: val('f-region'),
        full_name: val('f-name'),
        email: val('f-email'),
        based_in: val('f-based') || undefined,
        instagram_handle: val('f-ig') || undefined,
        tiktok_handle: val('f-tt') || undefined,
        youtube_handle: val('f-yt') || undefined,
        audience_size: val('f-audience') || undefined,
        content_plan: val('f-plan'),
        connections: val('f-connections'),
        extra: val('f-extra') || undefined,
        agreed_terms: true,
      });
      msg.textContent = "Application received! We review every application personally — you'll hear from us by email within a few days.";
      msg.classList.add('ok');
      form.reset();
      syncSelect();
    } catch (err) {
      const raw = String(err?.message || err);
      const clean = raw.includes('Error:') ? raw.split('Error:').pop().trim().replace(/ at .*$/, '') : raw;
      msg.textContent = clean || 'Something went wrong — please try again.';
      msg.classList.add('err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit application';
    }
  });
}

/* ── Init ── */
(async () => {
  const live = await listAmbassadorRegions();
  if (Array.isArray(live) && live.length) regions = live;
  renderCards();
  syncSelect();
  draw();
})();
