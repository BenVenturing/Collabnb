import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Vendor isolation ──────────────────────────────────────────────────────────
// Everything Mapbox-specific lives in this file. Swapping to MapLibre/Google
// later means reimplementing <CollabMap>/<MapPopup> with the same props; nothing
// upstream imports mapbox-gl directly.
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

// Style is overridable so a custom (e.g. liquid-glass) style built via the
// Mapbox DevKit MCP can be swapped in with no code change — set
// VITE_MAPBOX_STYLE=mapbox://styles/<user>/<styleId> in app/.env.local.
const STYLE_URL = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/outdoors-v12';

const DEFAULT_CENTER = [-98.5, 39.5]; // continental US
const DEFAULT_ZOOM = 3.4;

// Grid clustering in lng/lat space — no extra deps. Cell size shrinks with zoom;
// past zoom 12 every point is its own pin (matches Airbnb's split-on-zoom feel).
function clusterPoints(points, zoom) {
  if (zoom >= 12) return points.map((p) => ({ type: 'point', ...p }));
  const cell = (360 / Math.pow(2, zoom)) * 0.6;
  const grid = new Map();
  for (const p of points) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    const key = `${Math.floor(p.lng / cell)}:${Math.floor(p.lat / cell)}`;
    (grid.get(key) || grid.set(key, []).get(key)).push(p);
  }
  const out = [];
  for (const group of grid.values()) {
    if (group.length === 1) { out.push({ type: 'point', ...group[0] }); continue; }
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    out.push({ type: 'cluster', lat, lng, count: group.length, ids: group.map((p) => p.id), pts: group.map((p) => [p.lng, p.lat]) });
  }
  return out;
}

function pillEl({ label, active, saved, redacted }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = redacted ? '•••' : (label || '·');
  Object.assign(el.style, {
    font: '700 0.72rem var(--font-body, system-ui)',
    padding: redacted ? '0.3rem 0.55rem' : '0.32rem 0.6rem',
    borderRadius: '9999px',
    border: active ? '1px solid rgba(25,37,36,0.9)' : '1px solid rgba(25,37,36,0.12)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    letterSpacing: '0.01em',
    transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1), background 160ms ease',
    color: active ? '#fff' : '#192524',
    background: active ? '#192524' : '#ffffff',
    boxShadow: active
      ? '0 4px 14px rgba(25,37,36,0.45)'
      : '0 2px 10px rgba(25,37,36,0.30)',
    transform: active ? 'scale(1.08)' : 'scale(1)',
  });
  if (saved && !active) el.style.background = '#c6e6d2';
  el.onmouseenter = () => { if (!active) el.style.transform = 'scale(1.08)'; };
  el.onmouseleave = () => { if (!active) el.style.transform = 'scale(1)'; };
  return el;
}

function clusterEl(count) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = String(count);
  Object.assign(el.style, {
    font: '700 0.8rem var(--font-body, system-ui)',
    width: '2.35rem', height: '2.35rem', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid rgba(25,37,36,0.15)', cursor: 'pointer',
    color: '#192524', background: '#ffffff',
    boxShadow: '0 3px 12px rgba(25,37,36,0.3)',
    transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1)',
  });
  el.onmouseenter = () => { el.style.transform = 'scale(1.1)'; };
  el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
  return el;
}

export default function CollabMap({
  points = [],
  activeId = null,
  savedIds,
  onPinClick,
  onPinHover,
  onClusterClick,
  onMoveEnd,
  onReady,
  onToggleExpand,  // show the expand/collapse control when provided
  expanded = false,
  fitKey,          // change this to trigger a fit-to-points
  fitPoints,       // optional subset to frame on fit (e.g. trending); falls back to points
  children,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const sigRef = useRef('');
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const emitMove = useCallback(() => {
    const m = mapRef.current;
    if (!m || !onMoveEnd) return;
    const b = m.getBounds();
    const c = m.getCenter();
    onMoveEnd({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth(), zoom: m.getZoom(), centerLng: c.lng, centerLat: c.lat });
  }, [onMoveEnd]);

  // Init once
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    m.on('load', () => {
      // Starfield space background instead of solid black when zoomed out.
      try {
        m.setFog({
          color: 'rgb(220, 228, 235)',
          'high-color': 'rgb(115, 145, 200)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 16, 38)',
          'star-intensity': 0.5,
        });
      } catch { /* style may not support fog */ }
      setMap(m); onReady?.(m); emitMove();
    });
    m.on('moveend', () => { setZoom(m.getZoom()); emitMove(); });
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the GL canvas sized to its container — when the list column hides
  // (full-screen) or the window resizes, Mapbox must be told to re-measure,
  // otherwise it renders at the old width and leaves an empty gap.
  useEffect(() => {
    const m = mapRef.current;
    const el = containerRef.current;
    if (!m || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

  // Rebuild markers on data / zoom / selection change. `points` is a fresh array
  // every parent render, so we guard on a content signature — hovering a list
  // card (which re-renders the parent) never rebuilds the map.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const withCoords = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    const clusters = clusterPoints(withCoords, zoom);
    const savedSig = withCoords.filter((p) => savedIds?.has?.(p.id)).map((p) => p.id).join(',');
    const sig = clusters
      .map((c) => c.type === 'cluster'
        ? `C${c.count}@${c.lat.toFixed(3)},${c.lng.toFixed(3)}`
        : `${c.id}:${c.lat.toFixed(4)},${c.lng.toFixed(4)}:${c.label}:${c.redacted ? 1 : 0}`)
      .join('|') + `#a${activeId}#s${savedSig}`;
    if (sig === sigRef.current) return;
    sigRef.current = sig;

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];
    for (const c of clusters) {
      let el;
      if (c.type === 'cluster') {
        el = clusterEl(c.count);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Zoom to frame this cluster's actual members (fixes the pin jumping
          // to a corner). Fall back to a centered zoom if members coincide.
          const b = new mapboxgl.LngLatBounds();
          (c.pts || []).forEach((p) => b.extend(p));
          if (!b.isEmpty() && b.getNorthEast().distanceTo(b.getSouthWest()) > 1) {
            m.fitBounds(b, { padding: 96, maxZoom: 14, duration: 600 });
          } else {
            m.easeTo({ center: [c.lng, c.lat], zoom: Math.min(m.getZoom() + 3, 14), duration: 500 });
          }
          onClusterClick?.(c);
        });
      } else {
        el = pillEl({
          label: c.label,
          active: c.id === activeId,
          saved: savedIds?.has?.(c.id),
          redacted: c.redacted,
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Zoom into the pin and centre it, so the popup lands over the middle.
          m.flyTo({ center: [c.lng, c.lat], zoom: Math.min(Math.max(m.getZoom() + 2, 10), 13), duration: 700, essential: true });
          onPinClick?.(c.id);
        });
        el.addEventListener('mouseenter', () => onPinHover?.(c.id));
        el.addEventListener('mouseleave', () => onPinHover?.(null));
      }
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(m);
      markersRef.current.push(marker);
    }
  }, [points, zoom, activeId, savedIds, onPinClick, onPinHover, onClusterClick]);

  // Fit to points when asked. Prefer `fitPoints` (e.g. trending) so the initial
  // view opens zoomed into those rather than the whole globe.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || fitKey == null) return;
    const src = (fitPoints && fitPoints.length) ? fitPoints : points;
    const coords = src.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (!coords.length) return;
    const b = new mapboxgl.LngLatBounds();
    coords.forEach((p) => b.extend([p.lng, p.lat]));
    m.fitBounds(b, { padding: 90, maxZoom: 9, duration: 600 });
  }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!TOKEN) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper, #efece9)', color: 'var(--sage, #6b7a70)', textAlign: 'center', padding: '2rem',
      }}>
        <div>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Map unavailable</p>
          <p style={{ fontSize: '0.8rem' }}>Set <code>VITE_MAPBOX_TOKEN</code> in <code>app/.env.local</code> to enable the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Gentle desaturation mutes the outdoors preset toward the HAZY palette.
          Pins/popup/controls render outside this node, so they stay full-clarity. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, filter: 'saturate(0.82) brightness(1.02)' }} />
      {map && <MapControls map={map} onToggleExpand={onToggleExpand} expanded={expanded} />}
      {map && children}
    </div>
  );
}

const ctrlBtnStyle = {
  width: 36, height: 36,
  border: '1px solid rgba(255,255,255,0.6)',
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#192524', padding: 0,
};

// Custom liquid-glass map controls (expand + zoom), replacing Mapbox's default.
function MapControls({ map, onToggleExpand, expanded }) {
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {onToggleExpand && (
        <button
          title={expanded ? 'Exit full screen' : 'Expand to full screen'}
          onClick={() => onToggleExpand()}
          style={{ ...ctrlBtnStyle, borderRadius: 10, boxShadow: '0 2px 10px rgba(25,37,36,0.18)' }}
        >
          {expanded ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          )}
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(25,37,36,0.18)' }}>
        <button title="Zoom in" onClick={() => map.zoomIn({ duration: 200 })} style={{ ...ctrlBtnStyle, borderBottom: '1px solid rgba(25,37,36,0.08)', fontSize: 20, lineHeight: 1 }}>+</button>
        <button title="Zoom out" onClick={() => map.zoomOut({ duration: 200 })} style={{ ...ctrlBtnStyle, fontSize: 22, lineHeight: 1 }}>−</button>
      </div>
    </div>
  );
}

// Fixed, always-visible popup slot. The pin is flown to the map centre on click,
// so the card sits at horizontal centre, just above the middle — no projection
// math, so it can never land in a corner or need a second click. Falls back to a
// safe top offset on short maps.
export function MapPopup({ map, children, cardHeight = 400 }) {
  if (!map) return null;
  const H = map.getContainer().clientHeight;
  const top = Math.max(16, H / 2 - cardHeight - 18); // card bottom ~18px above the centred pin
  return (
    <div style={{
      position: 'absolute', left: '50%', top,
      transform: 'translateX(-50%)', zIndex: 6, pointerEvents: 'auto',
    }}>
      {children}
    </div>
  );
}
