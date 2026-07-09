/* ============================================================
   Collabnb — Signup page social proof panel (join.html)
   Two states gated on live marketplace stats:
     A) Founding phase  — urgency counter + passive photo carousel
     B) Growth phase    — scale proof + country filter
   ============================================================ */

import { getMarketplaceStats, getPublishedListingsPreview } from './convex.js';

// Threshold constants — adjust as the marketplace grows.
const GROWTH_HOST_THRESHOLD = 30;
const GROWTH_COUNTRY_THRESHOLD = 5;
const FOUNDING_CAP = 100;
const AUTO_SCROLL_MS = 4000;

// PLACEHOLDER — remove once there are consistently 3+ published listings.
// Used only when live inventory is too thin to carry the carousel.
const PLACEHOLDER_LISTINGS = [
  {
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80',
    location_city: 'Bariloche',
    location_country: 'Argentina',
    _placeholder: true,
  },
  {
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80',
    location_city: 'Chiang Mai',
    location_country: 'Thailand',
    _placeholder: true,
  },
  {
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80',
    location_city: 'Stellenbosch',
    location_country: 'South Africa',
    _placeholder: true,
  },
  {
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=900&q=80',
    location_city: 'Lake Tahoe',
    location_country: 'United States',
    _placeholder: true,
  },
];

function getSelectedRole() {
  const hostBtn = document.getElementById('page-role-host');
  return hostBtn && hostBtn.classList.contains('active') ? 'host' : 'creator';
}

function renderCarousel(listings) {
  const slides = listings.length ? listings : PLACEHOLDER_LISTINGS;
  return `
    <div class="signup-carousel">
      <div class="signup-carousel-track" id="signup-carousel-track">
        ${slides.map(l => `
          <div class="signup-carousel-slide">
            <img src="${l.image || ''}" alt="" loading="lazy" />
            <div class="signup-carousel-slide-label">
              <span>${[l.location_city, l.location_country].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function initCarouselAutoScroll(root) {
  const track = root.querySelector('#signup-carousel-track');
  if (!track) return;
  const slideCount = track.children.length;
  if (slideCount < 2) return;

  let index = 0;
  let paused = false;
  track.addEventListener('pointerenter', () => { paused = true; });
  track.addEventListener('pointerleave', () => { paused = false; });

  const timer = setInterval(() => {
    if (paused || !document.body.contains(track)) {
      if (!document.body.contains(track)) clearInterval(timer);
      return;
    }
    index = (index + 1) % slideCount;
    track.scrollTo({ top: track.clientHeight * index, behavior: 'smooth' });
  }, AUTO_SCROLL_MS);
}

function renderStateA(stats, role, listings) {
  const cap = role === 'host' ? stats.foundingHostSpotsRemaining : stats.foundingCreatorSpotsRemaining;
  const roleLabel = role === 'host' ? 'hosts' : 'creators';
  const filled = FOUNDING_CAP - cap;
  const pct = Math.min(100, Math.max(0, (filled / FOUNDING_CAP) * 100));

  return `
    <h3 class="signup-panel-headline">Join the first 100 founding ${roleLabel}</h3>
    <div class="signup-panel-spots">
      <span>${cap} of 100 spots left</span>
    </div>
    <div class="signup-panel-bar">
      <div class="signup-panel-bar-fill" style="width:${pct}%;"></div>
    </div>
    ${renderCarousel(listings)}
  `;
}

// `listingsForCountry` must already be scoped to `activeCountry` (or be the
// full set when activeCountry is '') — filtering happens at the call site so
// the country select can re-fetch from Convex on each change.
function renderStateB(stats, listingsForCountry, countries, activeCountry) {
  const options = countries
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map(c => `<option value="${c}" ${c === activeCountry ? 'selected' : ''}>${c}</option>`)
    .join('');

  const body = listingsForCountry.length
    ? renderCarousel(listingsForCountry)
    : `<p class="signup-panel-empty">More listings coming soon in ${activeCountry}.</p>`;

  return `
    <h3 class="signup-panel-headline">${stats.totalVerifiedHosts} verified hosts in ${stats.totalCountries} countries</h3>
    ${body}
    <label class="signup-panel-select-label" for="signup-country-filter">Explore by country</label>
    <select class="signup-panel-select" id="signup-country-filter">
      <option value="">All countries</option>
      ${options}
    </select>
  `;
}

async function render() {
  const root = document.getElementById('signup-panel');
  if (!root) return;

  const stats = await getMarketplaceStats();
  if (!stats) return;

  const role = getSelectedRole();
  const isGrowthPhase = stats.totalVerifiedHosts >= GROWTH_HOST_THRESHOLD && stats.totalCountries >= GROWTH_COUNTRY_THRESHOLD;

  const listings = await getPublishedListingsPreview(undefined, isGrowthPhase ? 12 : 6);

  if (isGrowthPhase) {
    const countries = [...new Set(listings.map(l => l.location_country).filter(Boolean))];

    const paintStateB = (activeCountry, scopedListings) => {
      root.innerHTML = renderStateB(stats, scopedListings, countries, activeCountry);
      const select = root.querySelector('#signup-country-filter');
      if (select) {
        select.addEventListener('change', async () => {
          const country = select.value;
          const filtered = country ? await getPublishedListingsPreview(country, 12) : listings;
          paintStateB(country, filtered);
        });
      }
      if (scopedListings.length) initCarouselAutoScroll(root);
    };

    paintStateB('', listings);
  } else {
    root.innerHTML = renderStateA(stats, role, listings);
    initCarouselAutoScroll(root);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  document.querySelectorAll('#page-role-creator, #page-role-host').forEach(btn => {
    btn.addEventListener('click', () => render());
  });
});
