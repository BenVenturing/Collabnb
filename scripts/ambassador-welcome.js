/* ============================================================
   join.html — personalized "X invited you to join in Y" banner.
   Shown only when the visitor arrived via a live Country Ambassador link
   (?amb=<slug> in the URL, or the slug already stashed in localStorage by
   main.js's sitewide capture). Silent no-op otherwise.
   ============================================================ */

import { getAmbassadorLink } from './convex.js';

(async () => {
  const params = new URLSearchParams(window.location.search);
  let slug = params.get('amb');
  if (!slug) {
    try { slug = localStorage.getItem('collabnb_ambassador_ref'); } catch { slug = null; }
  }
  if (!slug) return;

  const link = await getAmbassadorLink(slug);
  if (!link) return;

  const section = document.getElementById('ambassador-welcome');
  const nameEl = document.getElementById('amb-welcome-name');
  const countryEl = document.getElementById('amb-welcome-country');
  if (!section || !nameEl || !countryEl) return;

  nameEl.textContent = link.ambassador_first_name || 'An ambassador';
  countryEl.textContent = link.country;
  section.style.display = 'block';

  // The banner now provides the top clearance below the fixed nav (it's
  // the first thing in <main>) — shrink the hero's own clearance so the
  // two don't stack into a huge gap.
  const hero = document.querySelector('.join-hero');
  if (hero) hero.style.paddingTop = '2.5rem';

  const card = section.querySelector('.reveal');
  if (card) requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
})();
