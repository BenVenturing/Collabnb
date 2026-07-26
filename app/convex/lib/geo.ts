// Location privacy for the Explore map. A host's true lat/lng must never reach
// the browser — every coordinate leaving Convex is passed through approxCoords
// first. The offset is deterministic (seeded by the listing id) so a pin stays
// put across reloads instead of jumping around each fetch.

// FNV-1a 32-bit string hash — small, dependency-free, stable.
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Close-but-not-exact coordinates.
//  • normal:  deterministic 0.3–0.5 mi offset (Airbnb-style "general area").
//  • coarse:  snap to a ~0.1° grid (~7 mi) for gated/redacted viewers — city
//             level only, no useful precision.
// Returns {lat: undefined, lng: undefined} when the source has no coordinates.
export function approxCoords(
  lat?: number,
  lng?: number,
  seed = "",
  coarse = false
): { lat: number | undefined; lng: number | undefined } {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { lat: undefined, lng: undefined };
  }
  if (coarse) {
    return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 };
  }
  const angle = (hashStr(seed + ":a") % 3600) / 3600 * 2 * Math.PI;
  const radiusMi = 0.3 + (hashStr(seed + ":r") % 1000) / 1000 * 0.2; // 0.3–0.5 mi
  const milesToDeg = 1 / 69;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + Math.sin(angle) * radiusMi * milesToDeg,
    lng: lng + (Math.cos(angle) * radiusMi * milesToDeg) / cosLat,
  };
}
