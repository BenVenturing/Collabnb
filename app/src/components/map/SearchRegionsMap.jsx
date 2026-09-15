import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Vendor isolation ──────────────────────────────────────────────────────────
// Separate from CollabMap/LocationPicker (different use case: countries in a
// search rotation, not listings) — same convention as the rest of this app's
// Mapbox usage: one isolated file per purpose.
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

const STYLE_URL = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/outdoors-v12';

// Resolves a typed country name to a center point via Mapbox's own geocoder,
// so admins can just type "Vietnam" instead of hunting for coordinates.
export async function geocodeCountry(name) {
  if (!TOKEN || !name.trim()) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json?access_token=${TOKEN}&types=country&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    return { name: f.text, lat: f.center[1], lng: f.center[0] };
  } catch {
    return null;
  }
}

// Plots the host-search country rotation on a low-zoom world map — today's
// target large and highlighted, the rest small and muted, sized slightly by
// how many hosts have already been sourced from each (from `counts`, keyed
// by country name) so the map doubles as a coverage tracker.
export default function SearchRegionsMap({ countries, todayIndex, counts }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [10, 15],
      zoom: 1.1,
      attributionControl: false,
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !countries) return;
    function place() {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      countries.forEach((c, i) => {
        if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
        const isToday = i === todayIndex;
        const count = counts?.[c.name] || 0;
        const size = Math.max(22, Math.min(34, 22 + String(count).length * 4));
        const el = document.createElement('div');
        Object.assign(el.style, {
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '9999px',
          background: isToday ? '#166534' : 'rgba(25,37,36,0.65)',
          border: isToday ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.85)',
          boxShadow: isToday ? '0 0 0 5px rgba(22,101,52,0.22)' : '0 1px 3px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '11px', fontWeight: 700, fontFamily: 'system-ui',
        });
        el.textContent = String(count);
        const popup = new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
          `<div style="font:600 12px system-ui;color:#192524">${c.name}${isToday ? " — today’s target" : ''}</div><div style="font:400 11px system-ui;color:#646B62">${count} sourced so far</div>`
        );
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([c.lng, c.lat])
          .setPopup(popup)
          .addTo(m);
        markersRef.current.push(marker);
      });
    }
    if (m.isStyleLoaded()) place(); else m.once('load', place);
  }, [countries, todayIndex, counts]);

  if (!TOKEN) {
    return (
      <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(25,37,36,0.05)', fontSize: '0.76rem', color: '#646B62' }}>
        Set VITE_MAPBOX_TOKEN to show the search regions map.
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', maxWidth: 480, aspectRatio: '1 / 1', margin: '0 auto', borderRadius: '0.9rem', overflow: 'hidden' }} />;
}
