/* ============================================================
   Collabnb — Full-screen redacted listings map
   Opened from the globe on how-it-works.html. Price visible;
   image/title/location blurred — same treatment Explore.jsx
   gives a trial-expired creator's locked listing card.
   Data via listings:getPublicMapPreview (no auth).
   ============================================================ */

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

function pinLabel(l) {
  const cash = l.cash_amount;
  if (typeof cash === 'number' && cash > 0) {
    return cash >= 1000 ? `$${(cash / 1000).toFixed(cash % 1000 ? 1 : 0)}k` : `$${cash}`;
  }
  const m = String(l.compensation || '').match(/\$([\d,]+)/);
  if (m) return `$${m[1]}`;
  return l.collab_type || '·';
}

function pillEl(label) {
  const el = document.createElement('div');
  el.className = 'globe-map-pin';
  el.textContent = label;
  return el;
}

// Same locked-card treatment as Explore.jsx's _redacted ListingCard: blurred
// photo + lock caption, blurred title placeholder, blurred location, price
// shown clearly.
function buildLockedCard(l) {
  const card = document.createElement('div');
  card.className = 'globe-map-card';

  const photo = document.createElement('div');
  photo.className = 'globe-map-card-photo';
  if (l.image) {
    const img = document.createElement('img');
    img.src = l.image;
    img.alt = '';
    photo.appendChild(img);
  }
  const lock = document.createElement('div');
  lock.className = 'globe-map-card-lock';
  lock.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><p>Sign up to see more</p>';
  photo.appendChild(lock);
  card.appendChild(photo);

  const info = document.createElement('div');
  info.className = 'globe-map-card-info';

  const titleBar = document.createElement('div');
  titleBar.className = 'globe-map-card-title-blur';
  info.appendChild(titleBar);

  const location = [l.location_city, l.location_country].filter(Boolean).join(', ');
  if (location) {
    const locEl = document.createElement('p');
    locEl.className = 'globe-map-card-location';
    locEl.textContent = location;
    info.appendChild(locEl);
  }

  const price = document.createElement('p');
  price.className = 'globe-map-card-price';
  price.textContent = l.compensation || pinLabel(l);
  info.appendChild(price);

  card.appendChild(info);
  return card;
}

export function openFullScreenMap(points, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'globe-map-overlay';

  const mapEl = document.createElement('div');
  mapEl.className = 'globe-map-canvas';
  overlay.appendChild(mapEl);

  const back = document.createElement('button');
  back.className = 'globe-map-back';
  back.type = 'button';
  back.setAttribute('aria-label', 'Back');
  back.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#192524" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
  overlay.appendChild(back);

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Pause + hide the background-music widget (public/collabnb-analytics.js)
  // while the full-screen map is open — it floats at z-index 99997, above
  // everything, so it would otherwise sit on top of the map.
  const musicWrap = document.querySelector('.cnb-mp-wrap');
  const musicAudio = musicWrap?.querySelector('audio');
  if (musicAudio && !musicAudio.paused) musicAudio.pause();
  if (musicWrap) musicWrap.style.display = 'none';

  // Start zoomed all the way out on the same globe projection as the Three.js
  // globe, then fitBounds animates in below — a continuous "zoom into the
  // globe, then the globe becomes the map" motion instead of a hard cut.
  const map = new mapboxgl.Map({
    container: mapEl,
    style: 'mapbox://styles/mapbox/outdoors-v12',
    projection: 'globe',
    center: [-98.5, 39.5],
    zoom: 0.4,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    overlay.classList.add('is-ready');
    const withCoords = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    withCoords.forEach((p) => {
      const el = pillEl(pinLabel(p));
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        new mapboxgl.Popup({ offset: 18, maxWidth: '280px' })
          .setLngLat([p.lng, p.lat])
          .setDOMContent(buildLockedCard(p))
          .addTo(map);
      });
      new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    if (withCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      withCoords.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 90, maxZoom: 9, duration: 1400, essential: true });
    } else if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng, withCoords[0].lat], zoom: 8, duration: 1400, essential: true });
    }
  });

  function close() {
    map.remove();
    overlay.remove();
    document.body.style.overflow = '';
    if (musicWrap) musicWrap.style.display = '';
    onClose?.();
  }
  back.addEventListener('click', close);

  return { close };
}
