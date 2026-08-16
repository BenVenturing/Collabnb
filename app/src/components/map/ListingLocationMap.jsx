import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTranslation } from 'react-i18next';

// Single-pin, read-only map for a listing's location — the ListingDetail
// "Location" section counterpart to CollabMap (Explore) and LocationPicker
// (host wizard), so every map in the app shares one look instead of mixing
// in a plain OpenStreetMap iframe embed.
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

const STYLE_URL = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/outdoors-v12';

export default function ListingLocationMap({ lat, lng, zoom = 10 }) {
  const { t } = useTranslation('listingLocationMap');
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [lng, lat],
      zoom,
      attributionControl: false,
      interactive: true,
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    new mapboxgl.Marker({ color: '#192524' }).setLngLat([lng, lat]).addTo(m);
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, [lat, lng, zoom]);

  if (!TOKEN || typeof lat !== 'number' || typeof lng !== 'number') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bone, #efece9)', color: 'var(--sage, #6b7a70)', fontSize: '0.8rem' }}>
        {t('mapUnavailable')}
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', filter: 'saturate(0.82) brightness(1.02)' }} />;
}
