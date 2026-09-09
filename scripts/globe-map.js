/* ============================================================
   Collabnb — Full-screen redacted listings map
   Opened from the globe on how-it-works.html. Price + coarse
   location only, via listings:getPublicMapPreview (no auth).
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

  const map = new mapboxgl.Map({
    container: mapEl,
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-98.5, 39.5],
    zoom: 3.4,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    const withCoords = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    withCoords.forEach((p) => {
      new mapboxgl.Marker({ element: pillEl(pinLabel(p)) }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    if (withCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      withCoords.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 90, maxZoom: 9, duration: 0 });
    } else if (withCoords.length === 1) {
      map.setCenter([withCoords[0].lng, withCoords[0].lat]);
      map.setZoom(8);
    }
  });

  function close() {
    map.remove();
    overlay.remove();
    document.body.style.overflow = '';
    onClose?.();
  }
  back.addEventListener('click', close);

  return { close };
}
