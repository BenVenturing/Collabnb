/* ============================================================
   Collabnb — How it works page: live marketplace stats line +
   "Browse opportunities" listing preview strip.
   ============================================================ */

import { getMarketplaceStats, getPublishedListingsPreview } from './convex.js';

const STATS_LINE_MIN_LISTINGS = 10;
const BROWSE_SECTION_MIN_LISTINGS = 3;

const TIER_LABELS = { ugc_beginner: 'UGC Beginner', ugc_pro: 'UGC Pro', micro: 'Micro Influencer', mid: 'Influencer' };
const LOAD_LABELS = { light: 'Light', moderate: 'Moderate', heavy: 'Heavy', custom: 'Custom' };

function formatTier(tier) {
  if (!tier) return '';
  return TIER_LABELS[tier] || tier;
}
function formatLoad(load) {
  if (!load) return '';
  return LOAD_LABELS[String(load).toLowerCase()] || load;
}
function formatCompensation(l) {
  if (typeof l.cash_amount === 'number' && l.cash_amount > 0) {
    const cur = l.currency && l.currency !== 'USD' ? `${l.currency} ` : '$';
    return `${cur}${l.cash_amount.toLocaleString()}`;
  }
  return l.compensation || '';
}
function formatCollabBadge(l) {
  return l.compensation_type === 'hybrid' ? 'Hybrid' : 'Paid';
}

function renderCard(l) {
  const location = [l.location_city, l.location_country].filter(Boolean).join(', ');
  return `
    <div class="browse-card">
      <div class="browse-card-img">
        <img src="${l.image || ''}" alt="" loading="lazy" />
        <span class="browse-card-badge">${formatCollabBadge(l)}</span>
      </div>
      <div class="browse-card-body">
        <p class="browse-card-location">${location}</p>
        <p class="browse-card-title">${l.title || ''}</p>
        <p class="browse-card-comp">${formatCompensation(l)}</p>
        <p class="browse-card-meta">${formatTier(l.creator_tier)}${l.creator_tier && l.deliverable_load ? ' · ' : ''}${formatLoad(l.deliverable_load)}</p>
      </div>
    </div>
  `;
}

async function init() {
  const stats = await getMarketplaceStats();
  if (stats) {
    const wrap = document.getElementById('marketplace-stats-wrap');
    const line = document.getElementById('marketplace-stats-line');
    if (wrap && line && stats.totalPublishedListings >= STATS_LINE_MIN_LISTINGS) {
      line.textContent = `${stats.totalPublishedListings} active listings · ${stats.totalVerifiedHosts} verified hosts · ${stats.totalCountries} countries`;
      wrap.style.display = '';
    }
  }

  const listings = await getPublishedListingsPreview(undefined, 6);
  const section = document.getElementById('browse-opportunities-section');
  const track = document.getElementById('browse-scroll-track');
  if (section && track && listings.length >= BROWSE_SECTION_MIN_LISTINGS) {
    track.innerHTML = listings.map(renderCard).join('');
    section.style.display = '';
  }
}

function animateStatCount(el, duration = 1600) {
  const target = parseFloat(el.dataset.count);
  if (Number.isNaN(target)) return;
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const render = (v) => `${prefix}${v.toFixed(decimals)}${suffix}`;

  if (window.innerWidth <= 768) { el.textContent = render(target); return; }

  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = render(eased * target);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = render(target);
  };
  requestAnimationFrame(step);
}

function initStatsToggle() {
  const wrap = document.getElementById('stats-toggle-wrap');
  const btn = document.getElementById('stats-toggle');
  if (!wrap || !btn) return;

  let animated = false;
  btn.addEventListener('click', () => {
    const isOpen = wrap.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && !animated) {
      animated = true;
      wrap.querySelectorAll('.stat-number [data-count]').forEach((el) => animateStatCount(el));
    }
  });
}

function initSideStats() {
  const els = document.querySelectorAll('.side-stat');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      const numEl = entry.target.querySelector('[data-count]');
      if (numEl) animateStatCount(numEl);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  els.forEach((el) => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', initStatsToggle);
document.addEventListener('DOMContentLoaded', initSideStats);
