import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Search, MapPin } from "lucide-react";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

const STYLE_URL = import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/outdoors-v12";
const DEFAULT_CENTER = [-98.5, 39.5]; // continental US
const DEFAULT_ZOOM = 3.2;

async function mapboxSearch(query) {
  if (!TOKEN || !query.trim()) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&limit=5&types=place,region,locality,district,address`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features || [];
  } catch {
    return [];
  }
}

async function mapboxReverse(lng, lat) {
  if (!TOKEN) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&types=place,region,locality,district`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0] || null;
  } catch {
    return null;
  }
}

function parsePlace(feature) {
  if (!feature) return {};
  if (feature.place_type?.includes("country")) {
    return { country: feature.text };
  }
  const country = feature.context?.find((c) => c.id.startsWith("country"))?.text || "";
  return { city: feature.text || "", country };
}

// Search-to-pin (Mapbox geocoding) + click/drag-to-pin, for the host listing
// wizard's location step. Reports back { city, country, lat, lng } — the host's
// existing city/country text inputs stay editable independently of the pin.
export default function LocationPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    const hasCoords = typeof lat === "number" && typeof lng === "number";
    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: hasCoords ? [lng, lat] : DEFAULT_CENTER,
      zoom: hasCoords ? 10 : DEFAULT_ZOOM,
      attributionControl: false,
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new mapboxgl.Marker({ draggable: true, color: "#192524" })
      .setLngLat(hasCoords ? [lng, lat] : DEFAULT_CENTER)
      .addTo(m);
    marker.on("dragend", async () => {
      const pos = marker.getLngLat();
      const feature = await mapboxReverse(pos.lng, pos.lat);
      onChangeRef.current({ lat: pos.lat, lng: pos.lng, ...parsePlace(feature) });
    });
    markerRef.current = marker;

    m.on("click", async (e) => {
      marker.setLngLat(e.lngLat);
      const feature = await mapboxReverse(e.lngLat.lng, e.lngLat.lat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng, ...parsePlace(feature) });
    });

    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reposition the pin when coords change from outside (e.g. a search result was picked).
  useEffect(() => {
    const m = mapRef.current;
    const marker = markerRef.current;
    if (!m || !marker || typeof lat !== "number" || typeof lng !== "number") return;
    marker.setLngLat([lng, lat]);
    m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 10), duration: 800 });
  }, [lat, lng]);

  function handleQueryChange(v) {
    setQuery(v);
    clearTimeout(debounceRef.current);
    if (!v.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setResults(await mapboxSearch(v));
    }, 300);
  }

  function selectResult(feature) {
    const [flng, flat] = feature.center;
    onChange({ lat: flat, lng: flng, ...parsePlace(feature) });
    setQuery(feature.place_name);
    setResults([]);
  }

  if (!TOKEN) {
    return (
      <div style={{ padding: 14, borderRadius: "0.875rem", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(25,37,36,0.1)", fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "var(--sage)" }}>
        Map pin picker isn't available in this environment — the city/state fields above are still used.
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={16} color="var(--sage)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search an address or city to drop a pin"
          style={{ width: "100%", padding: "11px 14px 11px 40px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
        />
        {focused && results.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "0.75rem", boxShadow: "0 10px 28px rgba(25,37,36,0.14)", zIndex: 5, overflow: "hidden" }}>
            {results.map((f) => (
              <button key={f.id} onMouseDown={() => selectResult(f)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)" }}>
                {f.place_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11.5, color: "var(--sage)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        <MapPin size={12} /> Or click the map, or drag the pin, to place it exactly.
      </div>
      <div style={{ position: "relative", height: 260, borderRadius: "0.875rem", overflow: "hidden", border: "1.5px solid rgba(25,37,36,0.12)" }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      </div>
    </div>
  );
}
