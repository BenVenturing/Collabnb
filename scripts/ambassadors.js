/* ============================================================
   Collabnb — Ambassadors page: ambient dot-matrix world map + apply form
   Country Ambassador program: one exclusive partner per country, applying
   for a specific country and (once approved) earning a share of the
   platform fee on every completed collab from a host or creator who signed
   up through their unique link.
   ============================================================ */

import { listAmbassadorCountries, applyAmbassador } from './convex.js';

/* ── Hero heading fill: scroll-scrubbed against real layout — fully filled
   exactly when the fixed nav's bottom edge reaches the bottom of the
   heading text, so it tracks correctly regardless of viewport size. Skipped
   on mobile / reduced-motion, where the CSS just shows solid text. ── */
const fillHeading = document.getElementById('amb-h1');
const fillNav = document.querySelector('.nav-pill');
if (fillHeading && fillNav && window.innerWidth > 768 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  let targetScroll = 400;

  // The nav is fixed, so its viewport-relative bottom is constant across
  // scroll; the heading's document-relative bottom is rect.bottom + current
  // scrollY (also constant, since scrolling doesn't reflow the page). The
  // scroll distance that makes them meet is just the difference.
  const computeTarget = () => {
    const currentScroll = window.scrollY || window.pageYOffset || 0;
    // headingDocBottom is a document-absolute coordinate (scroll-invariant),
    // so the difference below is already the absolute scrollY at which the
    // heading's bottom edge meets the nav's — not a delta from here.
    const headingDocBottom = fillHeading.getBoundingClientRect().bottom + currentScroll;
    const navBottom = fillNav.getBoundingClientRect().bottom;
    targetScroll = Math.max(40, headingDocBottom - navBottom);
  };

  const updateHeadingFill = () => {
    const progress = clamp((window.scrollY || window.pageYOffset || 0) / targetScroll, 0, 1.1);
    fillHeading.style.setProperty('--fill', progress);
  };

  computeTarget();
  updateHeadingFill();
  window.addEventListener('scroll', updateHeadingFill, { passive: true });
  window.addEventListener('resize', () => { computeTarget(); updateHeadingFill(); });
  document.fonts?.ready?.then(() => { computeTarget(); updateHeadingFill(); });
}

/* ── Continent polygons (lat/lng), same shapes as the waitlist globe —
      purely decorative backdrop, no per-country/region tagging ── */
const CONTINENT_POLYS = [
  [[71,-157],[65,-168],[63,-162],[58,-152],[57,-137],[55,-131],
   [50,-127],[48,-124],[38,-122],[34,-120],[32,-117],[23,-110],
   [20,-105],[16,-95],[10,-83],[8,-77],[10,-76],[16,-88],
   [21,-87],[25,-80],[31,-81],[35,-76],[39,-74],[42,-70],
   [44,-66],[47,-53],[52,-55],[56,-59],[60,-64],[63,-64],
   [68,-62],[72,-68],[74,-80],[70,-85],[63,-90],[68,-100],
   [69,-108],[68,-135],[71,-141],[71,-157]],
  [[83,-45],[82,-20],[76,-18],[72,-22],[70,-28],[68,-52],
   [70,-62],[75,-68],[80,-66],[83,-45]],
  [[12,-72],[10,-62],[7,-58],[5,-52],[2,-50],[0,-49],
   [-5,-35],[-10,-37],[-15,-39],[-23,-43],[-28,-49],
   [-33,-52],[-38,-57],[-42,-64],[-48,-66],[-52,-69],
   [-55,-67],[-52,-70],[-42,-74],[-30,-72],[-18,-70],
   [-10,-77],[-5,-81],[-2,-80],[0,-80],[4,-77],[8,-77],[12,-72]],
  [[36,-9],[39,-9],[43,-8],[44,-1],[43,5],[48,-5],
   [51,-3],[51,1],[53,5],[55,8],[56,13],[58,12],
   [60,11],[63,10],[65,14],[68,16],[70,20],[71,26],
   [70,28],[65,25],[62,22],[60,24],[60,28],[65,28],
   [68,33],[70,40],[68,44],[64,38],[60,30],[57,28],
   [55,21],[54,18],[46,16],[46,19],[44,22],[41,26],
   [38,24],[37,22],[36,28],[40,26],[42,28],[44,28],
   [46,22],[56,13],[36,-9]],
  [[44,8],[44,12],[41,16],[38,16],[37,15],[38,9],[44,8]],
  [[51,-5],[51,-3],[53,0],[55,-2],[58,-5],[58,-3],
   [56,-6],[54,-4],[52,-4],[51,-5]],
  [[36,-5],[28,-12],[22,-16],[15,-17],[11,-15],[8,-13],
   [4,-8],[5,0],[6,3],[4,9],[0,10],[-5,12],[-8,13],
   [-15,12],[-22,14],[-29,17],[-34,18],[-34,26],
   [-28,33],[-15,37],[-10,40],[-5,40],[0,41],[4,42],
   [11,51],[15,42],[22,37],[27,34],[30,33],[31,32],
   [31,25],[31,10],[37,8],[36,-5]],
  [[42,28],[38,36],[38,50],[40,60],[50,80],[55,82],
   [62,70],[68,55],[70,70],[72,80],[73,105],[72,130],
   [68,162],[62,168],[56,135],[50,128],[45,132],[42,130],
   [38,122],[32,122],[25,120],[22,114],[18,108],[15,100],
   [10,98],[15,98],[20,93],[22,88],[28,88],[28,68],
   [22,62],[25,57],[12,44],[30,33],[38,36],[42,28]],
  [[30,32],[22,37],[12,43],[12,57],[22,60],[26,57],
   [28,50],[36,50],[38,43],[38,36],[30,32]],
  [[28,68],[22,68],[8,77],[8,80],[15,80],[22,88],
   [28,88],[28,80],[28,68]],
  [[28,97],[22,100],[18,98],[10,98],[5,100],[5,104],
   [10,105],[15,100],[22,105],[28,102],[28,97]],
  [[10,100],[5,100],[2,103],[1,104],[5,104],[10,102],[10,100]],
  [[7,108],[1,108],[-4,116],[-4,118],[2,118],[7,118],[7,108]],
  [[5,95],[0,104],[-5,106],[-5,104],[0,98],[5,95]],
  [[-6,105],[-7,109],[-8,113],[-9,115],[-8,115],[-7,111],[-6,107],[-6,105]],
  [[18,121],[16,120],[13,121],[10,122],[7,125],[6,126],
   [9,126],[12,124],[15,122],[18,122],[18,121]],
  [[43,144],[42,141],[40,141],[34,136],[34,131],
   [36,131],[38,140],[40,140],[43,142],[43,144]],
  [[38,124],[35,126],[34,129],[38,129],[40,127],[38,124]],
  [[-12,130],[-15,137],[-17,140],[-22,150],[-24,152],
   [-33,152],[-38,146],[-38,140],[-35,137],[-33,134],
   [-32,127],[-25,114],[-22,114],[-18,122],[-14,130],[-12,130]],
  [[-42,171],[-46,168],[-46,170],[-44,172],[-42,174],[-42,171]],
  [[-37,174],[-38,176],[-41,175],[-40,174],[-37,175],[-37,174]],
];

const BASE_DOT = 'rgba(60,87,89,0.22)';

/* ── Countries — full list for the application form ── */
export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada",
  "Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia",
  "Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland",
  "India","Indonesia","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
  "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali",
  "Malta","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Macedonia","Norway","Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines",
  "Poland","Portugal","Qatar","Romania","Rwanda","Saint Lucia","Samoa","San Marino","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","South Africa","South Korea","Spain",
  "Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste",
  "Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Zambia","Zimbabwe",
];

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

const DOT_STEP = 2.2;
const dots = [];
for (let lat = LAT_BOTTOM + DOT_STEP / 2; lat < LAT_TOP; lat += DOT_STEP) {
  for (let lng = -180 + DOT_STEP / 2; lng < 180; lng += DOT_STEP) {
    for (const poly of CONTINENT_POLYS) {
      if (pointInPoly(lat, lng, poly)) { dots.push({ lat, lng }); break; }
    }
  }
}

/* ── Map rendering (ambient only — no hover/click state) ── */
const canvas = document.getElementById('amb-map');

function project(lat, lng, w, h) {
  return {
    x: ((lng + 180) / 360) * w,
    y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * h,
  };
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
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = BASE_DOT;
    ctx.fill();
  }
}
window.addEventListener('resize', draw);

/* ── Country directory: search + filter over every country's status ── */
let takenByCountry = new Map(); // country name -> ambassador_first_name (or null)
let directoryFilter = 'all';
let directoryQuery = '';

function renderDirectory() {
  const wrap = document.getElementById('country-directory');
  const countEl = document.getElementById('country-directory-count');
  if (!wrap) return;

  const q = directoryQuery.trim().toLowerCase();
  const rows = COUNTRIES
    .map((country) => {
      const taken = takenByCountry.has(country);
      return { country, status: taken ? 'taken' : 'available', ambassadorFirstName: takenByCountry.get(country) || null };
    })
    .filter((r) => (directoryFilter === 'all' || r.status === directoryFilter))
    .filter((r) => !q || r.country.toLowerCase().includes(q));

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="country-directory-empty">No countries match your search.</div>`;
    if (countEl) countEl.textContent = '';
    return;
  }

  wrap.innerHTML = rows.map((r) => {
    const pill = r.status === 'available'
      ? `<span class="status-pill status-available">Available</span>`
      : `<span class="status-pill status-taken">${r.ambassadorFirstName ? `Represented by ${r.ambassadorFirstName}` : 'Represented'}</span>`;
    const cta = r.status === 'available' ? `<button type="button" class="row-apply-btn" data-apply="${r.country}">Apply</button>` : '';
    return `
      <div class="country-row" data-status="${r.status}">
        <span class="country-name">${r.country}</span>
        <span class="country-row-right">${pill}${cta}</span>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-apply]').forEach((btn) => {
    btn.addEventListener('click', () => selectCountry(btn.dataset.apply));
  });

  const totalTaken = COUNTRIES.filter((c) => takenByCountry.has(c)).length;
  if (countEl) countEl.textContent = `${totalTaken} of ${COUNTRIES.length} countries represented`;
}

function selectCountry(country) {
  const select = document.getElementById('f-country');
  if (select) select.value = country;
  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
}

const searchInput = document.getElementById('country-search');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    directoryQuery = searchInput.value;
    renderDirectory();
  });
}

document.querySelectorAll('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    directoryFilter = tab.dataset.filter;
    renderDirectory();
  });
});

/* ── Application form ── */
function syncSelect() {
  const select = document.getElementById('f-country');
  if (!select) return;
  select.innerHTML = `<option value="" disabled selected>Select a country…</option>` +
    COUNTRIES.map((c) => `<option value="${c}">${c}</option>`).join('');
}

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
    if (!val('f-country')) {
      msg.textContent = 'Please select a country.';
      msg.classList.add('err');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      await applyAmbassador({
        country: val('f-country'),
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
  syncSelect();
  draw();
  renderDirectory(); // show the full list as "available" immediately, then refine once live data lands
  const live = await listAmbassadorCountries();
  if (Array.isArray(live)) {
    takenByCountry = new Map(live.map((c) => [c.country, c.ambassador_first_name]));
    renderDirectory();
  }
})();
